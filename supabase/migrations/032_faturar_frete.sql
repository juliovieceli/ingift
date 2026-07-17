-- Frete no faturamento: ehFrete no item, planos cliente/empresa, despesa no faturar

-- 1. Flag no item do orçamento
ALTER TABLE public."OrcamentoItem"
  ADD COLUMN IF NOT EXISTS "ehFrete" BOOLEAN NOT NULL DEFAULT false;

-- 2. Planos de contas para frete
INSERT INTO public."FinanceiroPlanoConta" ("codigo","nome","tipo","ordem") VALUES
  ('despesa_frete_cliente', 'Frete por conta do cliente', 'despesa', 5),
  ('despesa_frete_empresa', 'Frete por conta da empresa', 'despesa', 6)
ON CONFLICT ("codigo") DO NOTHING;

-- 3. Permitir orcamentoId em receita e despesa
ALTER TABLE public."FinanceiroTitulo"
  DROP CONSTRAINT IF EXISTS "chk_tipo_orcamento";

ALTER TABLE public."FinanceiroTitulo"
  ADD CONSTRAINT "chk_tipo_orcamento"
  CHECK ("orcamentoId" IS NULL OR "tipo" IN ('receita', 'despesa'));

-- 4. Unicidade: no máximo 1 receita por orçamento (despesas de frete podem coexistir)
DROP INDEX IF EXISTS public."uq_titulo_orcamento";

CREATE UNIQUE INDEX IF NOT EXISTS "uq_titulo_orcamento_receita"
  ON public."FinanceiroTitulo"("orcamentoId")
  WHERE "orcamentoId" IS NOT NULL AND "tipo" = 'receita';

-- 5. faturarOrcamento: receita integral + despesa de frete opcional
DROP FUNCTION IF EXISTS public."faturarOrcamento"(UUID, UUID, DATE, TEXT);

CREATE OR REPLACE FUNCTION public."faturarOrcamento"(
  p_orcamentoId       UUID,
  p_planoContaId      UUID,
  p_vencimento        DATE,
  p_descricao         TEXT DEFAULT NULL,
  p_freteResponsavel  TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_orc          RECORD;
  v_clienteNome  TEXT;
  v_obs          TEXT;
  v_id           UUID;
  v_valorFrete   NUMERIC(12,2);
  v_planoFreteId UUID;
  v_codigoFrete  TEXT;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT * INTO v_orc FROM public."Orcamento" WHERE "id" = p_orcamentoId FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF v_orc."faturado" THEN RAISE EXCEPTION 'Orçamento já faturado'; END IF;
  IF v_orc."precoTotal" <= 0 THEN RAISE EXCEPTION 'Orçamento sem valor definido'; END IF;

  SELECT COALESCE(SUM("precoFinal"), 0) INTO v_valorFrete
  FROM public."OrcamentoItem"
  WHERE "orcamentoId" = p_orcamentoId AND "ehFrete" = true;

  IF v_valorFrete > 0 THEN
    IF p_freteResponsavel IS NULL OR p_freteResponsavel NOT IN ('cliente', 'empresa') THEN
      RAISE EXCEPTION 'Informe se o frete é por conta do cliente ou da empresa';
    END IF;

    v_codigoFrete := CASE p_freteResponsavel
      WHEN 'cliente' THEN 'despesa_frete_cliente'
      ELSE 'despesa_frete_empresa'
    END;

    SELECT "id" INTO v_planoFreteId
    FROM public."FinanceiroPlanoConta"
    WHERE "codigo" = v_codigoFrete AND "ativo" = true;

    IF v_planoFreteId IS NULL THEN
      RAISE EXCEPTION 'Plano de contas de frete não encontrado (%)', v_codigoFrete;
    END IF;
  END IF;

  SELECT c."nome" INTO v_clienteNome
  FROM public."Cliente" c
  WHERE c."id" = v_orc."clienteId";

  v_obs := CASE
    WHEN v_clienteNome IS NOT NULL AND length(trim(v_clienteNome)) > 0
      THEN trim(v_clienteNome) || ' · Orçamento #' || v_orc."numeroSequencial"
    ELSE 'Orçamento #' || v_orc."numeroSequencial"
  END;

  INSERT INTO public."FinanceiroTitulo"
    ("tipo","planoContaId","valor","dataVencimento","descricao","clienteId","orcamentoId","observacoes","criadoPor")
  VALUES (
    'receita',
    p_planoContaId,
    v_orc."precoTotal",
    p_vencimento,
    COALESCE(p_descricao, 'Orçamento #' || v_orc."numeroSequencial"),
    v_orc."clienteId",
    p_orcamentoId,
    v_obs,
    auth.uid()
  )
  RETURNING "id" INTO v_id;

  IF v_valorFrete > 0 THEN
    INSERT INTO public."FinanceiroTitulo"
      ("tipo","planoContaId","valor","dataVencimento","descricao","orcamentoId","observacoes","criadoPor")
    VALUES (
      'despesa',
      v_planoFreteId,
      v_valorFrete,
      p_vencimento,
      'Frete · Orçamento #' || v_orc."numeroSequencial",
      p_orcamentoId,
      CASE p_freteResponsavel
        WHEN 'cliente' THEN 'Frete por conta do cliente · Orçamento #' || v_orc."numeroSequencial"
        ELSE 'Frete por conta da empresa · Orçamento #' || v_orc."numeroSequencial"
      END,
      auth.uid()
    );
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public."faturarOrcamento"(UUID, UUID, DATE, TEXT, TEXT) TO authenticated;

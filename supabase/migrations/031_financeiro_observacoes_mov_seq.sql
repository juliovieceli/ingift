-- Número sequencial em movimentações + observações ao faturar / criar despesa

-- 1. numeroSequencial em EstoqueMovimentacao (ordem histórica)
ALTER TABLE public."EstoqueMovimentacao"
  ADD COLUMN IF NOT EXISTS "numeroSequencial" INT;

DO $$
DECLARE
  r RECORD;
  n INT := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'EstoqueMovimentacao'
      AND column_name = 'numeroSequencial'
  ) AND NOT EXISTS (
    SELECT 1 FROM public."EstoqueMovimentacao" WHERE "numeroSequencial" IS NOT NULL LIMIT 1
  ) THEN
    FOR r IN
      SELECT "id" FROM public."EstoqueMovimentacao" ORDER BY "criadoEm" ASC, "id" ASC
    LOOP
      n := n + 1;
      UPDATE public."EstoqueMovimentacao" SET "numeroSequencial" = n WHERE "id" = r."id";
    END LOOP;
  ELSIF EXISTS (
    SELECT 1 FROM public."EstoqueMovimentacao" WHERE "numeroSequencial" IS NULL LIMIT 1
  ) THEN
    SELECT COALESCE(MAX("numeroSequencial"), 0) INTO n FROM public."EstoqueMovimentacao";
    FOR r IN
      SELECT "id" FROM public."EstoqueMovimentacao"
      WHERE "numeroSequencial" IS NULL
      ORDER BY "criadoEm" ASC, "id" ASC
    LOOP
      n := n + 1;
      UPDATE public."EstoqueMovimentacao" SET "numeroSequencial" = n WHERE "id" = r."id";
    END LOOP;
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS public."EstoqueMovimentacao_numeroSequencial_seq";

SELECT setval(
  'public."EstoqueMovimentacao_numeroSequencial_seq"',
  COALESCE((SELECT MAX("numeroSequencial") FROM public."EstoqueMovimentacao"), 1),
  (SELECT EXISTS (SELECT 1 FROM public."EstoqueMovimentacao"))
);

ALTER TABLE public."EstoqueMovimentacao"
  ALTER COLUMN "numeroSequencial" SET DEFAULT nextval('public."EstoqueMovimentacao_numeroSequencial_seq"'),
  ALTER COLUMN "numeroSequencial" SET NOT NULL;

ALTER SEQUENCE public."EstoqueMovimentacao_numeroSequencial_seq"
  OWNED BY public."EstoqueMovimentacao"."numeroSequencial";

CREATE UNIQUE INDEX IF NOT EXISTS "uq_estoque_movimentacao_numero"
  ON public."EstoqueMovimentacao"("numeroSequencial");

-- 2. faturarOrcamento: preenche observacoes com cliente + nº orçamento
CREATE OR REPLACE FUNCTION public."faturarOrcamento"(
  p_orcamentoId  UUID,
  p_planoContaId UUID,
  p_vencimento   DATE,
  p_descricao    TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_orc         RECORD;
  v_clienteNome TEXT;
  v_obs         TEXT;
  v_id          UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT * INTO v_orc FROM public."Orcamento" WHERE "id" = p_orcamentoId FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF v_orc."faturado" THEN RAISE EXCEPTION 'Orçamento já faturado'; END IF;
  IF v_orc."precoTotal" <= 0 THEN RAISE EXCEPTION 'Orçamento sem valor definido'; END IF;

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

  RETURN v_id;
END;
$$;

-- 3. criarDespesaCompra: preenche observacoes com nº movimentação + material
CREATE OR REPLACE FUNCTION public."criarDespesaCompra"(
  p_movimentacaoId UUID,
  p_planoContaId   UUID,
  p_vencimento     DATE,
  p_descricao      TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mov          RECORD;
  v_materialNome TEXT;
  v_obs          TEXT;
  v_id           UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT m.*, t."codigo" AS "tipoCodigo"
  INTO v_mov
  FROM public."EstoqueMovimentacao" m
  JOIN public."EstoqueTipoMovimentacao" t ON t."id" = m."tipoMovimentacaoId"
  WHERE m."id" = p_movimentacaoId;

  IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação não encontrada'; END IF;

  IF v_mov."tipoCodigo" NOT IN ('entrada_compra', 'entrada_manual') THEN
    RAISE EXCEPTION 'Apenas entradas geram despesa financeira';
  END IF;

  IF COALESCE(v_mov."valorTotal", 0) <= 0 THEN
    RAISE EXCEPTION 'Movimentação sem valor — não é possível criar despesa';
  END IF;

  -- idempotente: retorna existente se já foi gerado
  SELECT "id" INTO v_id
  FROM public."FinanceiroTitulo"
  WHERE "movimentacaoEstoqueId" = p_movimentacaoId;

  IF FOUND THEN RETURN v_id; END IF;

  SELECT mat."nome" INTO v_materialNome
  FROM public."Material" mat
  WHERE mat."id" = v_mov."materialId";

  v_obs := 'Movimentação #' || v_mov."numeroSequencial"
    || ' · Entrada de ' || COALESCE(NULLIF(trim(v_materialNome), ''), 'material');

  INSERT INTO public."FinanceiroTitulo"
    ("tipo","planoContaId","valor","dataVencimento","descricao","fornecedor","movimentacaoEstoqueId","observacoes","criadoPor")
  VALUES (
    'despesa',
    p_planoContaId,
    v_mov."valorTotal",
    p_vencimento,
    COALESCE(p_descricao, 'Compra de material'),
    v_mov."fornecedor",
    p_movimentacaoId,
    v_obs,
    auth.uid()
  )
  RETURNING "id" INTO v_id;

  RETURN v_id;
END;
$$;

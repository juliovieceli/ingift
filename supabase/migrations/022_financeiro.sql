-- Módulo Financeiro: plano de contas, contas caixa, títulos a receber/pagar, baixas e log de auditoria

-- =============================================================
-- 1. COLUNA faturado em Orcamento
-- =============================================================
ALTER TABLE public."Orcamento"
  ADD COLUMN IF NOT EXISTS "faturado" BOOLEAN NOT NULL DEFAULT false;

-- =============================================================
-- 2. TABELAS
-- =============================================================

CREATE TABLE IF NOT EXISTS public."FinanceiroPlanoConta" (
  "id"       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "codigo"   TEXT NOT NULL UNIQUE,
  "nome"     TEXT NOT NULL,
  "tipo"     TEXT NOT NULL CHECK ("tipo" IN ('receita', 'despesa')),
  "paiId"    UUID REFERENCES public."FinanceiroPlanoConta"("id"),
  "ordem"    INT NOT NULL DEFAULT 0,
  "ativo"    BOOLEAN NOT NULL DEFAULT true,
  "criadoEm" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor" UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE IF NOT EXISTS public."FinanceiroContaCaixa" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome"        TEXT NOT NULL,
  "tipo"        TEXT NOT NULL DEFAULT 'caixa' CHECK ("tipo" IN ('caixa', 'banco', 'pix', 'outro')),
  "saldoAtual"  NUMERIC(12,2) NOT NULL DEFAULT 0,
  "ativo"       BOOLEAN NOT NULL DEFAULT true,
  "criadoEm"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"   UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE IF NOT EXISTS public."FinanceiroTitulo" (
  "id"                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tipo"                    TEXT NOT NULL CHECK ("tipo" IN ('receita', 'despesa')),
  "planoContaId"            UUID NOT NULL REFERENCES public."FinanceiroPlanoConta"("id"),
  "valor"                   NUMERIC(12,2) NOT NULL CHECK ("valor" > 0),
  "valorBaixado"            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK ("valorBaixado" >= 0),
  "status"                  TEXT NOT NULL DEFAULT 'pendente'
                              CHECK ("status" IN ('pendente', 'parcial', 'quitado')),
  "dataEmissao"             DATE NOT NULL DEFAULT CURRENT_DATE,
  "dataVencimento"          DATE NOT NULL,
  "descricao"               TEXT NOT NULL,
  "clienteId"               UUID REFERENCES public."Cliente"("id"),
  "orcamentoId"             UUID REFERENCES public."Orcamento"("id"),
  "movimentacaoEstoqueId"   UUID REFERENCES public."EstoqueMovimentacao"("id"),
  "fornecedor"              TEXT,
  "observacoes"             TEXT,
  "criadoEm"                TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"               UUID REFERENCES public."Perfil"("id"),
  CONSTRAINT "chk_valorBaixado_limite" CHECK ("valorBaixado" <= "valor"),
  CONSTRAINT "chk_tipo_orcamento"
    CHECK ("orcamentoId" IS NULL OR "tipo" = 'receita'),
  CONSTRAINT "chk_tipo_movimentacao"
    CHECK ("movimentacaoEstoqueId" IS NULL OR "tipo" = 'despesa')
);

-- No máximo 1 título por orçamento
CREATE UNIQUE INDEX IF NOT EXISTS "uq_titulo_orcamento"
  ON public."FinanceiroTitulo"("orcamentoId")
  WHERE "orcamentoId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS public."FinanceiroBaixa" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tituloId"     UUID NOT NULL REFERENCES public."FinanceiroTitulo"("id"),
  "contaCaixaId" UUID NOT NULL REFERENCES public."FinanceiroContaCaixa"("id"),
  "valor"        NUMERIC(12,2) NOT NULL CHECK ("valor" > 0),
  "dataBaixa"    DATE NOT NULL DEFAULT CURRENT_DATE,
  "observacoes"  TEXT,
  "criadoEm"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"    UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE IF NOT EXISTS public."FinanceiroLogOperacao" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "operacao"    TEXT NOT NULL CHECK ("operacao" IN ('estorno_baixa', 'exclusao_titulo')),
  "tituloId"    UUID,
  "orcamentoId" UUID,
  "snapshots"   JSONB NOT NULL DEFAULT '{}',
  "motivo"      TEXT,
  "executadoPor" UUID REFERENCES public."Perfil"("id"),
  "executadoEm" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 3. ÍNDICES
-- =============================================================
CREATE INDEX IF NOT EXISTS "idxTituloTipo"       ON public."FinanceiroTitulo"("tipo");
CREATE INDEX IF NOT EXISTS "idxTituloStatus"     ON public."FinanceiroTitulo"("status");
CREATE INDEX IF NOT EXISTS "idxTituloVencimento" ON public."FinanceiroTitulo"("dataVencimento");
CREATE INDEX IF NOT EXISTS "idxTituloOrcamento"  ON public."FinanceiroTitulo"("orcamentoId");
CREATE INDEX IF NOT EXISTS "idxBaixaTitulo"      ON public."FinanceiroBaixa"("tituloId");
CREATE INDEX IF NOT EXISTS "idxLogTituloId"      ON public."FinanceiroLogOperacao"("tituloId");

-- =============================================================
-- 4. TRIGGER: atualizar status e valorBaixado do título após baixa
-- =============================================================
CREATE OR REPLACE FUNCTION public."atualizarStatusTitulo"()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tituloId UUID;
  v_total    NUMERIC;
  v_valor    NUMERIC;
  v_novo_status TEXT;
  v_delta    NUMERIC;
  v_conta    UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_tituloId := OLD."tituloId";
    v_delta    := -OLD."valor";
    v_conta    := OLD."contaCaixaId";
  ELSIF TG_OP = 'INSERT' THEN
    v_tituloId := NEW."tituloId";
    v_delta    := NEW."valor";
    v_conta    := NEW."contaCaixaId";
  ELSE
    v_tituloId := NEW."tituloId";
    v_delta    := NEW."valor" - OLD."valor";
    v_conta    := NEW."contaCaixaId";
  END IF;

  -- recalcular valorBaixado
  SELECT COALESCE(SUM("valor"), 0) INTO v_total
  FROM public."FinanceiroBaixa" WHERE "tituloId" = v_tituloId;

  SELECT "valor" INTO v_valor
  FROM public."FinanceiroTitulo" WHERE "id" = v_tituloId;

  IF v_total <= 0 THEN
    v_novo_status := 'pendente';
  ELSIF v_total >= v_valor THEN
    v_novo_status := 'quitado';
  ELSE
    v_novo_status := 'parcial';
  END IF;

  UPDATE public."FinanceiroTitulo"
  SET "valorBaixado" = v_total, "status" = v_novo_status
  WHERE "id" = v_tituloId;

  -- atualizar saldo da conta caixa
  SELECT "tipo" INTO v_novo_status FROM public."FinanceiroTitulo" WHERE "id" = v_tituloId;
  IF v_novo_status = 'receita' THEN
    UPDATE public."FinanceiroContaCaixa"
    SET "saldoAtual" = "saldoAtual" + v_delta WHERE "id" = v_conta;
  ELSE
    UPDATE public."FinanceiroContaCaixa"
    SET "saldoAtual" = "saldoAtual" - v_delta WHERE "id" = v_conta;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "trgAtualizarStatusTitulo"
AFTER INSERT OR UPDATE OR DELETE ON public."FinanceiroBaixa"
FOR EACH ROW EXECUTE FUNCTION public."atualizarStatusTitulo"();

-- =============================================================
-- 5. TRIGGER: sincronizar faturado no Orcamento
-- =============================================================
CREATE OR REPLACE FUNCTION public."sincronizarFaturamentoOrcamento"()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_orcamentoId UUID;
BEGIN
  IF TG_OP = 'INSERT' AND NEW."orcamentoId" IS NOT NULL AND NEW."tipo" = 'receita' THEN
    UPDATE public."Orcamento" SET "faturado" = true WHERE "id" = NEW."orcamentoId";
  ELSIF TG_OP = 'DELETE' AND OLD."orcamentoId" IS NOT NULL AND OLD."tipo" = 'receita' THEN
    UPDATE public."Orcamento" SET "faturado" = false WHERE "id" = OLD."orcamentoId";
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "trgSincronizarFaturamento"
AFTER INSERT OR DELETE ON public."FinanceiroTitulo"
FOR EACH ROW EXECUTE FUNCTION public."sincronizarFaturamentoOrcamento"();

-- =============================================================
-- 6. TRIGGER: bloquear edição de orçamento faturado
-- =============================================================
CREATE OR REPLACE FUNCTION public."bloquearEdicaoOrcamentoFaturado"()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_faturado BOOLEAN;
BEGIN
  -- bloqueio em OrcamentoItem
  IF TG_TABLE_NAME = 'OrcamentoItem' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT "faturado" INTO v_faturado FROM public."Orcamento" WHERE "id" = OLD."orcamentoId";
    ELSE
      SELECT "faturado" INTO v_faturado FROM public."Orcamento" WHERE "id" = NEW."orcamentoId";
    END IF;
    IF v_faturado THEN
      RAISE EXCEPTION 'Orçamento faturado — remova o título financeiro para editar itens';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  -- bloqueio em Orcamento
  IF TG_OP = 'DELETE' THEN
    IF OLD."faturado" THEN
      RAISE EXCEPTION 'Orçamento faturado — remova o título financeiro antes de excluir';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: permite apenas mudança de status
  IF TG_OP = 'UPDATE' AND OLD."faturado" = true THEN
    IF (
      OLD."clienteId"               IS DISTINCT FROM NEW."clienteId"               OR
      OLD."configuracaoImpressoraId" IS DISTINCT FROM NEW."configuracaoImpressoraId" OR
      OLD."validoAte"               IS DISTINCT FROM NEW."validoAte"               OR
      OLD."prazoEntrega"            IS DISTINCT FROM NEW."prazoEntrega"            OR
      OLD."observacoes"             IS DISTINCT FROM NEW."observacoes"             OR
      OLD."custoSubtotal"           IS DISTINCT FROM NEW."custoSubtotal"           OR
      OLD."precoTotal"              IS DISTINCT FROM NEW."precoTotal"
    ) THEN
      RAISE EXCEPTION 'Orçamento faturado — remova o título financeiro para editar';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "trgBloquearOrcamentoFaturado"
BEFORE UPDATE OR DELETE ON public."Orcamento"
FOR EACH ROW EXECUTE FUNCTION public."bloquearEdicaoOrcamentoFaturado"();

CREATE TRIGGER "trgBloquearItemOrcamentoFaturado"
BEFORE INSERT OR UPDATE OR DELETE ON public."OrcamentoItem"
FOR EACH ROW EXECUTE FUNCTION public."bloquearEdicaoOrcamentoFaturado"();

-- =============================================================
-- 7. RPCs
-- =============================================================

-- Registrar baixa (parcial ou total)
CREATE OR REPLACE FUNCTION public."registrarBaixaTitulo"(
  p_tituloId    UUID,
  p_contaId     UUID,
  p_valor       NUMERIC,
  p_dataBaixa   DATE DEFAULT CURRENT_DATE,
  p_obs         TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_saldo NUMERIC;
  v_status TEXT;
  v_id UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT ("valor" - "valorBaixado"), "status"
  INTO v_saldo, v_status
  FROM public."FinanceiroTitulo" WHERE "id" = p_tituloId FOR UPDATE;

  IF v_status = 'quitado' THEN
    RAISE EXCEPTION 'Título já está quitado';
  END IF;
  IF p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor da baixa deve ser positivo';
  END IF;
  IF p_valor > v_saldo THEN
    RAISE EXCEPTION 'Valor da baixa (%) supera o saldo pendente (%)', p_valor, v_saldo;
  END IF;

  INSERT INTO public."FinanceiroBaixa"
    ("tituloId","contaCaixaId","valor","dataBaixa","observacoes","criadoPor")
  VALUES (p_tituloId, p_contaId, p_valor, p_dataBaixa, p_obs, auth.uid())
  RETURNING "id" INTO v_id;

  RETURN v_id;
END;
$$;

-- Estornar baixa (requer motivo para log)
CREATE OR REPLACE FUNCTION public."estornarBaixaTitulo"(
  p_baixaId UUID,
  p_motivo  TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_baixa  RECORD;
  v_titulo RECORD;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT b.*, t."orcamentoId", t."tipo" AS "tipoTitulo"
  INTO v_baixa
  FROM public."FinanceiroBaixa" b
  JOIN public."FinanceiroTitulo" t ON t."id" = b."tituloId"
  WHERE b."id" = p_baixaId;

  IF NOT FOUND THEN RAISE EXCEPTION 'Baixa não encontrada'; END IF;

  -- gravar log antes de excluir
  INSERT INTO public."FinanceiroLogOperacao"
    ("operacao","tituloId","orcamentoId","snapshots","motivo","executadoPor")
  VALUES (
    'estorno_baixa',
    v_baixa."tituloId",
    v_baixa."orcamentoId",
    jsonb_build_object('FinanceiroBaixa', to_jsonb(v_baixa)),
    p_motivo,
    auth.uid()
  );

  DELETE FROM public."FinanceiroBaixa" WHERE "id" = p_baixaId;
END;
$$;

-- Excluir título (exige zero baixas; registra log com snapshot)
CREATE OR REPLACE FUNCTION public."excluirTituloFinanceiro"(
  p_tituloId UUID,
  p_motivo   TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_titulo   RECORD;
  v_qtdBaixas INT;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT * INTO v_titulo FROM public."FinanceiroTitulo" WHERE "id" = p_tituloId FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Título não encontrado'; END IF;

  SELECT COUNT(*) INTO v_qtdBaixas
  FROM public."FinanceiroBaixa" WHERE "tituloId" = p_tituloId;

  IF v_qtdBaixas > 0 THEN
    RAISE EXCEPTION 'Estorne todas as baixas antes de excluir o título';
  END IF;

  INSERT INTO public."FinanceiroLogOperacao"
    ("operacao","tituloId","orcamentoId","snapshots","motivo","executadoPor")
  VALUES (
    'exclusao_titulo',
    p_tituloId,
    v_titulo."orcamentoId",
    jsonb_build_object('FinanceiroTitulo', to_jsonb(v_titulo)),
    p_motivo,
    auth.uid()
  );

  DELETE FROM public."FinanceiroTitulo" WHERE "id" = p_tituloId;
END;
$$;

-- Faturar orçamento (cria título receita com valor fixo = precoTotal)
CREATE OR REPLACE FUNCTION public."faturarOrcamento"(
  p_orcamentoId  UUID,
  p_planoContaId UUID,
  p_vencimento   DATE,
  p_descricao    TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_orc   RECORD;
  v_id    UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT * INTO v_orc FROM public."Orcamento" WHERE "id" = p_orcamentoId FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF v_orc."faturado" THEN RAISE EXCEPTION 'Orçamento já faturado'; END IF;
  IF v_orc."precoTotal" <= 0 THEN RAISE EXCEPTION 'Orçamento sem valor definido'; END IF;

  INSERT INTO public."FinanceiroTitulo"
    ("tipo","planoContaId","valor","dataVencimento","descricao","clienteId","orcamentoId","criadoPor")
  VALUES (
    'receita',
    p_planoContaId,
    v_orc."precoTotal",
    p_vencimento,
    COALESCE(p_descricao, 'Orçamento #' || v_orc."numeroSequencial"),
    v_orc."clienteId",
    p_orcamentoId,
    auth.uid()
  )
  RETURNING "id" INTO v_id;

  RETURN v_id;
END;
$$;

-- Criar despesa vinculada a compra de estoque (idempotente)
CREATE OR REPLACE FUNCTION public."criarDespesaCompra"(
  p_movimentacaoId UUID,
  p_planoContaId   UUID,
  p_vencimento     DATE,
  p_descricao      TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mov   RECORD;
  v_id    UUID;
  v_tipo  TEXT;
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

  INSERT INTO public."FinanceiroTitulo"
    ("tipo","planoContaId","valor","dataVencimento","descricao","fornecedor","movimentacaoEstoqueId","criadoPor")
  VALUES (
    'despesa',
    p_planoContaId,
    v_mov."valorTotal",
    p_vencimento,
    COALESCE(p_descricao, 'Compra de material'),
    v_mov."fornecedor",
    p_movimentacaoId,
    auth.uid()
  )
  RETURNING "id" INTO v_id;

  RETURN v_id;
END;
$$;

-- Query de fluxo de caixa mensal (receitas e despesas pendentes/parciais agrupadas por mês)
CREATE OR REPLACE FUNCTION public."fluxoCaixaMensal"(
  p_dataInicio DATE DEFAULT CURRENT_DATE,
  p_dataFim    DATE DEFAULT (CURRENT_DATE + INTERVAL '6 months')::DATE
)
RETURNS TABLE(
  "mes"          TEXT,
  "receitas"     NUMERIC,
  "despesas"     NUMERIC,
  "saldoPeriodo" NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    TO_CHAR("dataVencimento", 'YYYY-MM') AS mes,
    SUM(CASE WHEN "tipo" = 'receita' THEN ("valor" - "valorBaixado") ELSE 0 END) AS receitas,
    SUM(CASE WHEN "tipo" = 'despesa' THEN ("valor" - "valorBaixado") ELSE 0 END) AS despesas,
    SUM(CASE
      WHEN "tipo" = 'receita' THEN ("valor" - "valorBaixado")
      ELSE -("valor" - "valorBaixado")
    END) AS "saldoPeriodo"
  FROM public."FinanceiroTitulo"
  WHERE "status" IN ('pendente', 'parcial')
    AND "dataVencimento" BETWEEN p_dataInicio AND p_dataFim
  GROUP BY TO_CHAR("dataVencimento", 'YYYY-MM')
  ORDER BY 1;
$$;

-- =============================================================
-- 8. GRANTS
-- =============================================================
GRANT EXECUTE ON FUNCTION public."registrarBaixaTitulo"(UUID,UUID,NUMERIC,DATE,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public."estornarBaixaTitulo"(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public."excluirTituloFinanceiro"(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public."faturarOrcamento"(UUID,UUID,DATE,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public."criarDespesaCompra"(UUID,UUID,DATE,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public."fluxoCaixaMensal"(DATE,DATE) TO authenticated;

-- =============================================================
-- 9. RLS
-- =============================================================
ALTER TABLE public."FinanceiroPlanoConta"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FinanceiroContaCaixa"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FinanceiroTitulo"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FinanceiroBaixa"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FinanceiroLogOperacao"  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FinanceiroPlanoConta_admin"   ON public."FinanceiroPlanoConta"   FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());
CREATE POLICY "FinanceiroContaCaixa_admin"   ON public."FinanceiroContaCaixa"   FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());
CREATE POLICY "FinanceiroTitulo_admin"       ON public."FinanceiroTitulo"       FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());
CREATE POLICY "FinanceiroBaixa_admin"        ON public."FinanceiroBaixa"        FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());
CREATE POLICY "FinanceiroLogOperacao_admin"  ON public."FinanceiroLogOperacao"  FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."FinanceiroPlanoConta"  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."FinanceiroContaCaixa"  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."FinanceiroTitulo"      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."FinanceiroBaixa"       TO authenticated;
GRANT SELECT ON public."FinanceiroLogOperacao" TO authenticated;

-- =============================================================
-- 10. SEED INICIAL
-- =============================================================

-- Plano de contas
INSERT INTO public."FinanceiroPlanoConta" ("codigo","nome","tipo","ordem") VALUES
  ('receita_vendas',         'Vendas de produtos',        'receita', 1),
  ('receita_servicos',       'Serviços de impressão 3D',  'receita', 2),
  ('despesa_materia_prima',  'Matéria-prima',             'despesa', 1),
  ('despesa_embalagem',      'Embalagem e frete',         'despesa', 2),
  ('despesa_energia',        'Energia e operacional',     'despesa', 3),
  ('despesa_outros',         'Outras despesas',           'despesa', 4)
ON CONFLICT ("codigo") DO NOTHING;

-- Conta caixa padrão
INSERT INTO public."FinanceiroContaCaixa" ("nome","tipo") VALUES
  ('Caixa principal', 'caixa')
ON CONFLICT DO NOTHING;

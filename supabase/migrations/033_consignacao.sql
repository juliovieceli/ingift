-- Consignação (crediário por cliente): peças saem via OS (ação "Consignar"),
-- viram dívida na consignação, e o faturamento sempre baixa (dinheiro entra).
-- Uma consignação aberta por cliente, várias OS por consignação, 1 item de
-- consignação por item de orçamento.

-- =============================================================
-- 1. COLUNAS em tabelas existentes
-- =============================================================
ALTER TABLE public."Orcamento"
  ADD COLUMN IF NOT EXISTS "consignado"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "consignacaoId" UUID;

ALTER TABLE public."FinanceiroTitulo"
  ADD COLUMN IF NOT EXISTS "consignacaoId" UUID;

ALTER TABLE public."FinanceiroTitulo"
  DROP CONSTRAINT IF EXISTS "chk_tipo_consignacao";
ALTER TABLE public."FinanceiroTitulo"
  ADD CONSTRAINT "chk_tipo_consignacao"
  CHECK ("consignacaoId" IS NULL OR "tipo" = 'receita');

-- =============================================================
-- 2. TABELAS
-- =============================================================
CREATE TABLE IF NOT EXISTS public."Consignacao" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "numeroSequencial" SERIAL,
  "clienteId"        UUID NOT NULL REFERENCES public."Cliente"("id"),
  "status"           TEXT NOT NULL DEFAULT 'aberta' CHECK ("status" IN ('aberta', 'encerrada')),
  "observacoes"      TEXT,
  "abertaEm"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "encerradaEm"      TIMESTAMPTZ,
  "criadoEm"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoEm"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"        UUID REFERENCES public."Perfil"("id"),
  "atualizadoPor"    UUID REFERENCES public."Perfil"("id")
);

-- No máximo 1 consignação aberta por cliente
CREATE UNIQUE INDEX IF NOT EXISTS "uq_consignacao_aberta_cliente"
  ON public."Consignacao"("clienteId")
  WHERE "status" = 'aberta';

CREATE TABLE IF NOT EXISTS public."ConsignacaoItem" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "consignacaoId"   UUID NOT NULL REFERENCES public."Consignacao"("id") ON DELETE CASCADE,
  "orcamentoId"     UUID REFERENCES public."Orcamento"("id"),
  "orcamentoItemId" UUID REFERENCES public."OrcamentoItem"("id"),
  "descricao"       TEXT NOT NULL,
  "quantidade"      NUMERIC(12,2) NOT NULL DEFAULT 1,
  "precoUnitario"   NUMERIC(12,2) NOT NULL DEFAULT 0,
  "valorTotal"      NUMERIC(12,2) NOT NULL DEFAULT 0,
  "vendido"         BOOLEAN NOT NULL DEFAULT false,
  "consignadoEm"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoEm"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"       UUID REFERENCES public."Perfil"("id")
);

-- Um item de consignação para um item de orçamento (quando vier de OS)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_consignacaoitem_orcamentoitem"
  ON public."ConsignacaoItem"("orcamentoItemId")
  WHERE "orcamentoItemId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idxConsignacaoItemConsignacao" ON public."ConsignacaoItem"("consignacaoId");
CREATE INDEX IF NOT EXISTS "idxConsignacaoItemOrcamento"   ON public."ConsignacaoItem"("orcamentoId");

CREATE TABLE IF NOT EXISTS public."ConsignacaoRecebimento" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "consignacaoId"      UUID NOT NULL REFERENCES public."Consignacao"("id") ON DELETE CASCADE,
  "valor"              NUMERIC(12,2) NOT NULL CHECK ("valor" > 0),
  "dataRecebimento"    DATE NOT NULL DEFAULT CURRENT_DATE,
  "contaCaixaId"       UUID NOT NULL REFERENCES public."FinanceiroContaCaixa"("id"),
  "financeiroTituloId" UUID REFERENCES public."FinanceiroTitulo"("id"),
  "observacoes"        TEXT,
  "criadoEm"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"          UUID REFERENCES public."Perfil"("id")
);

CREATE INDEX IF NOT EXISTS "idxConsignacaoRecebimentoConsignacao" ON public."ConsignacaoRecebimento"("consignacaoId");

-- FKs de vínculo (agora que Consignacao existe)
ALTER TABLE public."Orcamento"
  DROP CONSTRAINT IF EXISTS "fk_orcamento_consignacao";
ALTER TABLE public."Orcamento"
  ADD CONSTRAINT "fk_orcamento_consignacao"
  FOREIGN KEY ("consignacaoId") REFERENCES public."Consignacao"("id");

ALTER TABLE public."FinanceiroTitulo"
  DROP CONSTRAINT IF EXISTS "fk_titulo_consignacao";
ALTER TABLE public."FinanceiroTitulo"
  ADD CONSTRAINT "fk_titulo_consignacao"
  FOREIGN KEY ("consignacaoId") REFERENCES public."Consignacao"("id");

CREATE INDEX IF NOT EXISTS "idxOrcamentoConsignacao"        ON public."Orcamento"("consignacaoId");
CREATE INDEX IF NOT EXISTS "idxTituloConsignacao"           ON public."FinanceiroTitulo"("consignacaoId");

-- Timestamp automático
DROP TRIGGER IF EXISTS "trgConsignacaoAtualizado" ON public."Consignacao";
CREATE TRIGGER "trgConsignacaoAtualizado" BEFORE UPDATE ON public."Consignacao"
  FOR EACH ROW EXECUTE FUNCTION public."atualizarTimestamp"();

-- =============================================================
-- 3. TRIGGER: bloqueio de edição também para orçamento consignado
-- =============================================================
CREATE OR REPLACE FUNCTION public."bloquearEdicaoOrcamentoFaturado"()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_faturado   BOOLEAN;
  v_consignado BOOLEAN;
BEGIN
  -- bloqueio em OrcamentoItem
  IF TG_TABLE_NAME = 'OrcamentoItem' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT "faturado", "consignado" INTO v_faturado, v_consignado
      FROM public."Orcamento" WHERE "id" = OLD."orcamentoId";
    ELSE
      SELECT "faturado", "consignado" INTO v_faturado, v_consignado
      FROM public."Orcamento" WHERE "id" = NEW."orcamentoId";
    END IF;
    IF v_faturado THEN
      RAISE EXCEPTION 'Orçamento faturado — remova o título financeiro para editar itens';
    END IF;
    IF v_consignado THEN
      RAISE EXCEPTION 'Orçamento consignado — reverta a consignação para editar itens';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  -- bloqueio em Orcamento
  IF TG_OP = 'DELETE' THEN
    IF OLD."faturado" THEN
      RAISE EXCEPTION 'Orçamento faturado — remova o título financeiro antes de excluir';
    END IF;
    IF OLD."consignado" THEN
      RAISE EXCEPTION 'Orçamento consignado — reverta a consignação antes de excluir';
    END IF;
    RETURN OLD;
  END IF;

  -- OS consignada não pode ser reaberta / ter o status alterado (reverta antes)
  IF TG_OP = 'UPDATE' AND OLD."consignado" = true
     AND OLD."statusOrcamentoId" IS DISTINCT FROM NEW."statusOrcamentoId" THEN
    RAISE EXCEPTION 'Orçamento consignado — reverta a consignação para alterar o status';
  END IF;

  -- UPDATE: permite apenas mudança de status/flags de controle
  IF TG_OP = 'UPDATE' AND (OLD."faturado" = true OR OLD."consignado" = true) THEN
    IF (
      OLD."clienteId"                IS DISTINCT FROM NEW."clienteId"                OR
      OLD."configuracaoImpressoraId" IS DISTINCT FROM NEW."configuracaoImpressoraId" OR
      OLD."validoAte"                IS DISTINCT FROM NEW."validoAte"                OR
      OLD."prazoEntrega"             IS DISTINCT FROM NEW."prazoEntrega"             OR
      OLD."observacoes"              IS DISTINCT FROM NEW."observacoes"              OR
      OLD."custoSubtotal"            IS DISTINCT FROM NEW."custoSubtotal"            OR
      OLD."precoTotal"               IS DISTINCT FROM NEW."precoTotal"
    ) THEN
      RAISE EXCEPTION 'Orçamento faturado/consignado — reverta antes de editar';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================
-- 4. RPCs
-- =============================================================

-- Consignar um orçamento: copia itens (não-frete) para a consignação aberta do
-- cliente, amarra os IDs, baixa o estoque (idempotente) e trava a OS.
CREATE OR REPLACE FUNCTION public."consignarOrcamento"(
  p_orcamentoId   UUID,
  p_consignacaoId UUID DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_orc          RECORD;
  v_statusCodigo TEXT;
  v_consignacaoId UUID;
  v_clienteId    UUID;
  v_item         RECORD;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT * INTO v_orc FROM public."Orcamento" WHERE "id" = p_orcamentoId FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF v_orc."faturado" THEN RAISE EXCEPTION 'Orçamento faturado — não pode ser consignado'; END IF;
  IF v_orc."consignado" THEN RAISE EXCEPTION 'Orçamento já consignado'; END IF;

  SELECT "codigo" INTO v_statusCodigo
  FROM public."OrcamentoStatus" WHERE "id" = v_orc."statusOrcamentoId";
  IF v_statusCodigo NOT IN ('em_producao', 'finalizado', 'entregue') THEN
    RAISE EXCEPTION 'Só é possível consignar orçamentos em produção, finalizados ou entregues';
  END IF;

  -- consignação: usa a informada, ou a aberta do cliente, ou cria uma nova
  IF p_consignacaoId IS NOT NULL THEN
    SELECT "id", "clienteId" INTO v_consignacaoId, v_clienteId
    FROM public."Consignacao"
    WHERE "id" = p_consignacaoId AND "status" = 'aberta' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Consignação não encontrada ou não está aberta'; END IF;
    IF v_clienteId <> v_orc."clienteId" THEN
      RAISE EXCEPTION 'A consignação pertence a outro cliente';
    END IF;
  ELSE
    SELECT "id" INTO v_consignacaoId
    FROM public."Consignacao"
    WHERE "clienteId" = v_orc."clienteId" AND "status" = 'aberta' FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public."Consignacao" ("clienteId", "criadoPor")
      VALUES (v_orc."clienteId", auth.uid())
      RETURNING "id" INTO v_consignacaoId;
    END IF;
  END IF;

  -- copia itens não-frete, amarrando orcamentoId/orcamentoItemId
  FOR v_item IN
    SELECT * FROM public."OrcamentoItem"
    WHERE "orcamentoId" = p_orcamentoId AND COALESCE("ehFrete", false) = false
  LOOP
    INSERT INTO public."ConsignacaoItem"
      ("consignacaoId", "orcamentoId", "orcamentoItemId", "descricao",
       "quantidade", "precoUnitario", "valorTotal", "criadoPor")
    VALUES (
      v_consignacaoId,
      p_orcamentoId,
      v_item."id",
      v_item."nomePeca",
      v_item."quantidade",
      CASE WHEN COALESCE(v_item."quantidade", 0) > 0
        THEN v_item."precoFinal" / v_item."quantidade"
        ELSE v_item."precoFinal" END,
      v_item."precoFinal",
      auth.uid()
    );
  END LOOP;

  -- baixa de estoque (idempotente: converte reserva remanescente em saída)
  PERFORM public."baixarMaterialOrcamento"(p_orcamentoId);

  UPDATE public."Orcamento"
  SET "consignado" = true, "consignacaoId" = v_consignacaoId, "travado" = true
  WHERE "id" = p_orcamentoId;

  RETURN v_consignacaoId;
END;
$$;

-- Faturar a consignação: cria título de receita e baixa na hora (dinheiro entra).
-- Valor default = saldo a receber; ou valor manual (<= saldo).
CREATE OR REPLACE FUNCTION public."faturarConsignacao"(
  p_consignacaoId   UUID,
  p_planoContaId    UUID,
  p_contaCaixaId    UUID,
  p_dataRecebimento DATE DEFAULT CURRENT_DATE,
  p_valor           NUMERIC DEFAULT NULL,
  p_descricao       TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cons        RECORD;
  v_clienteNome TEXT;
  v_consignado  NUMERIC;
  v_recebido    NUMERIC;
  v_saldo       NUMERIC;
  v_valor       NUMERIC;
  v_tituloId    UUID;
  v_obs         TEXT;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT * INTO v_cons FROM public."Consignacao" WHERE "id" = p_consignacaoId FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consignação não encontrada'; END IF;
  IF v_cons."status" <> 'aberta' THEN RAISE EXCEPTION 'Consignação encerrada'; END IF;

  SELECT COALESCE(SUM("valorTotal"), 0) INTO v_consignado
  FROM public."ConsignacaoItem" WHERE "consignacaoId" = p_consignacaoId;
  SELECT COALESCE(SUM("valor"), 0) INTO v_recebido
  FROM public."ConsignacaoRecebimento" WHERE "consignacaoId" = p_consignacaoId;
  v_saldo := v_consignado - v_recebido;

  v_valor := COALESCE(p_valor, v_saldo);
  IF v_valor <= 0 THEN RAISE EXCEPTION 'Não há saldo a receber nesta consignação'; END IF;
  IF v_valor > v_saldo THEN
    RAISE EXCEPTION 'Valor (%) supera o saldo a receber (%)', v_valor, v_saldo;
  END IF;

  SELECT "nome" INTO v_clienteNome FROM public."Cliente" WHERE "id" = v_cons."clienteId";
  v_obs := COALESCE(NULLIF(trim(v_clienteNome), ''), 'Consignação')
    || ' · Consignação #' || v_cons."numeroSequencial";

  INSERT INTO public."FinanceiroTitulo"
    ("tipo", "planoContaId", "valor", "dataVencimento", "descricao",
     "clienteId", "consignacaoId", "observacoes", "criadoPor")
  VALUES (
    'receita', p_planoContaId, v_valor, p_dataRecebimento,
    COALESCE(p_descricao, 'Consignação #' || v_cons."numeroSequencial"),
    v_cons."clienteId", p_consignacaoId, v_obs, auth.uid()
  )
  RETURNING "id" INTO v_tituloId;

  -- baixa imediata (dinheiro entrou na conta caixa informada)
  PERFORM public."registrarBaixaTitulo"(v_tituloId, p_contaCaixaId, v_valor, p_dataRecebimento, NULL);

  INSERT INTO public."ConsignacaoRecebimento"
    ("consignacaoId", "valor", "dataRecebimento", "contaCaixaId",
     "financeiroTituloId", "observacoes", "criadoPor")
  VALUES (p_consignacaoId, v_valor, p_dataRecebimento, p_contaCaixaId, v_tituloId, p_descricao, auth.uid());

  RETURN v_tituloId;
END;
$$;

-- Reverter a consignação de um orçamento (checa financeiro antes).
CREATE OR REPLACE FUNCTION public."reverterConsignacaoOrcamento"(
  p_orcamentoId UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_orc           RECORD;
  v_temFinanceiro BOOLEAN;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT * INTO v_orc FROM public."Orcamento" WHERE "id" = p_orcamentoId FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF NOT v_orc."consignado" THEN RAISE EXCEPTION 'Orçamento não está consignado'; END IF;

  -- checa faturamentos/recebimentos na consignação
  SELECT (
    EXISTS (SELECT 1 FROM public."ConsignacaoRecebimento" WHERE "consignacaoId" = v_orc."consignacaoId")
    OR EXISTS (SELECT 1 FROM public."FinanceiroTitulo" WHERE "consignacaoId" = v_orc."consignacaoId")
  ) INTO v_temFinanceiro;

  IF v_temFinanceiro THEN
    RAISE EXCEPTION 'Consignação possui faturamentos/recebimentos — estorne o financeiro antes de reverter';
  END IF;

  DELETE FROM public."ConsignacaoItem" WHERE "orcamentoId" = p_orcamentoId;
  PERFORM public."reverterEstoqueOrcamento"(p_orcamentoId);

  UPDATE public."Orcamento"
  SET "consignado" = false, "consignacaoId" = NULL
  WHERE "id" = p_orcamentoId;
END;
$$;

-- Sinalizar peça como vendida/não vendida (informativo).
CREATE OR REPLACE FUNCTION public."marcarItemVendido"(
  p_itemId  UUID,
  p_vendido BOOLEAN DEFAULT true
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  UPDATE public."ConsignacaoItem" SET "vendido" = p_vendido WHERE "id" = p_itemId;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item de consignação não encontrado'; END IF;
END;
$$;

-- Ajustar o valor/quantidade/descrição de uma peça na consignação
-- (o preço da OS nem sempre é o que será repassado ao lojista).
CREATE OR REPLACE FUNCTION public."atualizarItemConsignacao"(
  p_itemId        UUID,
  p_precoUnitario NUMERIC,
  p_quantidade    NUMERIC DEFAULT NULL,
  p_descricao     TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item RECORD;
  v_qtd  NUMERIC;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT ci.*, c."status" AS "consignacaoStatus"
  INTO v_item
  FROM public."ConsignacaoItem" ci
  JOIN public."Consignacao" c ON c."id" = ci."consignacaoId"
  WHERE ci."id" = p_itemId
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item de consignação não encontrado'; END IF;
  IF v_item."consignacaoStatus" <> 'aberta' THEN RAISE EXCEPTION 'Consignação encerrada'; END IF;

  IF p_precoUnitario < 0 THEN RAISE EXCEPTION 'Preço não pode ser negativo'; END IF;

  v_qtd := COALESCE(p_quantidade, v_item."quantidade");
  IF v_qtd <= 0 THEN RAISE EXCEPTION 'Quantidade deve ser positiva'; END IF;

  UPDATE public."ConsignacaoItem"
  SET "precoUnitario" = p_precoUnitario,
      "quantidade"    = v_qtd,
      "valorTotal"    = p_precoUnitario * v_qtd,
      "descricao"     = COALESCE(NULLIF(trim(p_descricao), ''), "descricao")
  WHERE "id" = p_itemId;
END;
$$;

-- Encerrar a consignação (só com saldo quitado).
CREATE OR REPLACE FUNCTION public."encerrarConsignacao"(
  p_consignacaoId UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cons       RECORD;
  v_consignado NUMERIC;
  v_recebido   NUMERIC;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT * INTO v_cons FROM public."Consignacao" WHERE "id" = p_consignacaoId FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consignação não encontrada'; END IF;
  IF v_cons."status" = 'encerrada' THEN RAISE EXCEPTION 'Consignação já encerrada'; END IF;

  SELECT COALESCE(SUM("valorTotal"), 0) INTO v_consignado
  FROM public."ConsignacaoItem" WHERE "consignacaoId" = p_consignacaoId;
  SELECT COALESCE(SUM("valor"), 0) INTO v_recebido
  FROM public."ConsignacaoRecebimento" WHERE "consignacaoId" = p_consignacaoId;

  IF (v_consignado - v_recebido) <> 0 THEN
    RAISE EXCEPTION 'Só é possível encerrar com saldo quitado (saldo atual: %)', (v_consignado - v_recebido);
  END IF;

  UPDATE public."Consignacao"
  SET "status" = 'encerrada', "encerradaEm" = now()
  WHERE "id" = p_consignacaoId;
END;
$$;

-- =============================================================
-- 5. GRANTS
-- =============================================================
GRANT EXECUTE ON FUNCTION public."consignarOrcamento"(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public."faturarConsignacao"(UUID, UUID, UUID, DATE, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public."reverterConsignacaoOrcamento"(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public."marcarItemVendido"(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public."atualizarItemConsignacao"(UUID, NUMERIC, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public."encerrarConsignacao"(UUID) TO authenticated;

-- =============================================================
-- 6. RLS
-- =============================================================
ALTER TABLE public."Consignacao"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ConsignacaoItem"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ConsignacaoRecebimento" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consignacao_admin"            ON public."Consignacao"            FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());
CREATE POLICY "ConsignacaoItem_admin"        ON public."ConsignacaoItem"        FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());
CREATE POLICY "ConsignacaoRecebimento_admin" ON public."ConsignacaoRecebimento" FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."Consignacao"            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ConsignacaoItem"        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ConsignacaoRecebimento" TO authenticated;

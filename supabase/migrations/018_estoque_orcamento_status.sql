-- Estoque vinculado ao status do orçamento (Material + composição)

-- Baixa de estoque em produção, finalizado e entregue (idempotente na função)
UPDATE public."OrcamentoStatus"
SET "baixaEstoque" = true
WHERE "codigo" IN ('em_producao', 'finalizado', 'entregue');

-- Saída por orçamento também reduz reserva pendente
CREATE OR REPLACE FUNCTION public."processarMovimentacaoEstoque"()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_codigo TEXT;
  v_qtd NUMERIC;
BEGIN
  SELECT tm."codigo" INTO v_codigo
  FROM public."EstoqueTipoMovimentacao" tm WHERE tm."id" = NEW."tipoMovimentacaoId";

  IF NEW."materialId" IS NULL THEN
    RETURN NEW;
  END IF;

  v_qtd := COALESCE(NEW."quantidade", NEW."quantidadeG");
  IF v_qtd IS NULL OR v_qtd <= 0 THEN
    RETURN NEW;
  END IF;

  PERFORM 1 FROM public."Material" WHERE "id" = NEW."materialId" FOR UPDATE;

  IF v_codigo IN ('entrada_compra', 'entrada_manual') THEN
    IF NEW."valorTotal" IS NOT NULL AND NEW."valorTotal" >= 0 THEN
      UPDATE public."Material" SET
        "estoqueAtual" = "estoqueAtual" + v_qtd,
        "custoMedioUnitario" = CASE
          WHEN "estoqueAtual" = 0 THEN NEW."valorTotal" / NULLIF(v_qtd, 0)
          ELSE (("custoMedioUnitario" * "estoqueAtual") + NEW."valorTotal") / ("estoqueAtual" + v_qtd)
        END
      WHERE "id" = NEW."materialId";
    ELSE
      UPDATE public."Material" SET "estoqueAtual" = "estoqueAtual" + v_qtd
      WHERE "id" = NEW."materialId";
    END IF;
  ELSIF v_codigo IN ('perda', 'ajuste_manual') THEN
    UPDATE public."Material" SET "estoqueAtual" = GREATEST(0, "estoqueAtual" - v_qtd)
    WHERE "id" = NEW."materialId";
  ELSIF v_codigo = 'saida_orcamento' THEN
    UPDATE public."Material" SET
      "estoqueAtual" = GREATEST(0, "estoqueAtual" - v_qtd),
      "estoqueReservado" = GREATEST(0, "estoqueReservado" - v_qtd)
    WHERE "id" = NEW."materialId";
  ELSIF v_codigo = 'reserva_orcamento' THEN
    UPDATE public."Material" SET "estoqueReservado" = "estoqueReservado" + v_qtd
    WHERE "id" = NEW."materialId";
  ELSIF v_codigo = 'liberacao_reserva' THEN
    UPDATE public."Material" SET "estoqueReservado" = GREATEST(0, "estoqueReservado" - v_qtd)
    WHERE "id" = NEW."materialId";
  END IF;

  RETURN NEW;
END;
$$;

-- Quantidade necessária por material no orçamento
CREATE OR REPLACE FUNCTION public."materiaisNecessariosOrcamento"(p_orcamentoId UUID)
RETURNS TABLE("materialId" UUID, "quantidade" NUMERIC) LANGUAGE sql STABLE AS $$
  SELECT mid, SUM(total_q) AS quantidade
  FROM (
    SELECT c."materialId" AS mid, SUM(c."quantidade" * io."quantidade") AS total_q
    FROM public."OrcamentoItemComposicao" c
    JOIN public."OrcamentoItem" io ON io."id" = c."itemOrcamentoId"
    WHERE io."orcamentoId" = p_orcamentoId
    GROUP BY c."materialId"
    UNION ALL
    SELECT io."materialId" AS mid, SUM(io."quantidade") AS total_q
    FROM public."OrcamentoItem" io
    WHERE io."orcamentoId" = p_orcamentoId
      AND io."tipoItem" = 'avulso'
      AND io."materialId" IS NOT NULL
    GROUP BY io."materialId"
  ) x
  WHERE mid IS NOT NULL
  GROUP BY mid;
$$;

-- Saldo líquido de reserva do orçamento por material (reserva − liberação − saída)
CREATE OR REPLACE FUNCTION public."saldoReservaOrcamentoMaterial"(
  p_orcamentoId UUID,
  p_materialId UUID
)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(
    CASE t."codigo"
      WHEN 'reserva_orcamento' THEN COALESCE(m."quantidade", m."quantidadeG", 0)
      WHEN 'liberacao_reserva' THEN -COALESCE(m."quantidade", m."quantidadeG", 0)
      WHEN 'saida_orcamento' THEN -COALESCE(m."quantidade", m."quantidadeG", 0)
      ELSE 0
    END
  ), 0)
  FROM public."EstoqueMovimentacao" m
  JOIN public."EstoqueTipoMovimentacao" t ON t."id" = m."tipoMovimentacaoId"
  WHERE m."orcamentoId" = p_orcamentoId
    AND m."materialId" = p_materialId;
$$;

CREATE OR REPLACE FUNCTION public."reservarMaterialOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_disponivel NUMERIC;
  v_tipo UUID;
  v_saldo NUMERIC;
  v_delta NUMERIC;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  v_tipo := public."obterTipoMovimentacao"('reserva_orcamento');

  FOR r IN SELECT * FROM public."materiaisNecessariosOrcamento"(p_orcamentoId)
  LOOP
    v_saldo := public."saldoReservaOrcamentoMaterial"(p_orcamentoId, r."materialId");
    v_delta := r.quantidade - v_saldo;
    IF v_delta <= 0 THEN
      CONTINUE;
    END IF;

    SELECT ("estoqueAtual" - "estoqueReservado") INTO v_disponivel
    FROM public."Material" WHERE "id" = r."materialId" FOR UPDATE;

    IF v_disponivel < v_delta THEN
      RAISE EXCEPTION 'Estoque disponível insuficiente para reserva';
    END IF;

    INSERT INTO public."EstoqueMovimentacao"
      ("materialId", "tipoMovimentacaoId", "quantidade", "quantidadeG", "orcamentoId", "criadoPor")
    VALUES (r."materialId", v_tipo, v_delta, v_delta, p_orcamentoId, auth.uid());
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public."liberarReservaMaterial"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_tipo UUID;
  v_saldo NUMERIC;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  v_tipo := public."obterTipoMovimentacao"('liberacao_reserva');

  FOR r IN SELECT * FROM public."materiaisNecessariosOrcamento"(p_orcamentoId)
  LOOP
    v_saldo := public."saldoReservaOrcamentoMaterial"(p_orcamentoId, r."materialId");
    IF v_saldo <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public."EstoqueMovimentacao"
      ("materialId", "tipoMovimentacaoId", "quantidade", "quantidadeG", "orcamentoId", "criadoPor")
    VALUES (r."materialId", v_tipo, v_saldo, v_saldo, p_orcamentoId, auth.uid());
  END LOOP;

  -- Libera materiais que tinham reserva mas saíram do orçamento
  FOR r IN
    SELECT DISTINCT m."materialId" AS mid
    FROM public."EstoqueMovimentacao" m
    JOIN public."EstoqueTipoMovimentacao" t ON t."id" = m."tipoMovimentacaoId"
    WHERE m."orcamentoId" = p_orcamentoId
      AND m."materialId" IS NOT NULL
      AND t."codigo" = 'reserva_orcamento'
      AND NOT EXISTS (
        SELECT 1 FROM public."materiaisNecessariosOrcamento"(p_orcamentoId) n
        WHERE n."materialId" = m."materialId"
      )
  LOOP
    v_saldo := public."saldoReservaOrcamentoMaterial"(p_orcamentoId, r.mid);
    IF v_saldo > 0 THEN
      INSERT INTO public."EstoqueMovimentacao"
        ("materialId", "tipoMovimentacaoId", "quantidade", "quantidadeG", "orcamentoId", "criadoPor")
      VALUES (r.mid, v_tipo, v_saldo, v_saldo, p_orcamentoId, auth.uid());
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public."baixarMaterialOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_tipo UUID;
  v_saldo NUMERIC;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  v_tipo := public."obterTipoMovimentacao"('saida_orcamento');

  FOR r IN
    SELECT DISTINCT m."materialId" AS mid
    FROM public."EstoqueMovimentacao" m
    JOIN public."EstoqueTipoMovimentacao" t ON t."id" = m."tipoMovimentacaoId"
    WHERE m."orcamentoId" = p_orcamentoId
      AND m."materialId" IS NOT NULL
      AND t."codigo" IN ('reserva_orcamento', 'liberacao_reserva', 'saida_orcamento')
  LOOP
    v_saldo := public."saldoReservaOrcamentoMaterial"(p_orcamentoId, r.mid);
    IF v_saldo <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public."EstoqueMovimentacao"
      ("materialId", "tipoMovimentacaoId", "quantidade", "quantidadeG", "orcamentoId", "criadoPor")
    VALUES (r.mid, v_tipo, v_saldo, v_saldo, p_orcamentoId, auth.uid());
  END LOOP;
END;
$$;

-- Remove movimentações do orçamento e desfaz efeito no Material
CREATE OR REPLACE FUNCTION public."reverterEstoqueOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_reserva UUID;
  v_liberacao UUID;
  v_saida UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  v_reserva := public."obterTipoMovimentacao"('reserva_orcamento');
  v_liberacao := public."obterTipoMovimentacao"('liberacao_reserva');
  v_saida := public."obterTipoMovimentacao"('saida_orcamento');

  FOR r IN
    SELECT
      m."materialId" AS mid,
      COALESCE(SUM(CASE WHEN m."tipoMovimentacaoId" = v_reserva
        THEN COALESCE(m."quantidade", m."quantidadeG", 0) ELSE 0 END), 0) AS q_reserva,
      COALESCE(SUM(CASE WHEN m."tipoMovimentacaoId" = v_liberacao
        THEN COALESCE(m."quantidade", m."quantidadeG", 0) ELSE 0 END), 0) AS q_liberacao,
      COALESCE(SUM(CASE WHEN m."tipoMovimentacaoId" = v_saida
        THEN COALESCE(m."quantidade", m."quantidadeG", 0) ELSE 0 END), 0) AS q_saida
    FROM public."EstoqueMovimentacao" m
    WHERE m."orcamentoId" = p_orcamentoId
      AND m."materialId" IS NOT NULL
      AND m."tipoMovimentacaoId" IN (v_reserva, v_liberacao, v_saida)
    GROUP BY m."materialId"
  LOOP
    PERFORM 1 FROM public."Material" WHERE "id" = r.mid FOR UPDATE;
    UPDATE public."Material" SET
      "estoqueAtual" = "estoqueAtual" + r.q_saida,
      "estoqueReservado" = GREATEST(0, "estoqueReservado" - r.q_reserva + r.q_liberacao + r.q_saida)
    WHERE "id" = r.mid;
  END LOOP;

  DELETE FROM public."EstoqueMovimentacao"
  WHERE "orcamentoId" = p_orcamentoId
    AND "tipoMovimentacaoId" IN (v_reserva, v_liberacao, v_saida);
END;
$$;

CREATE OR REPLACE FUNCTION public."orcamentoTemMovimentacaoEstoque"(p_orcamentoId UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."EstoqueMovimentacao" m
    JOIN public."EstoqueTipoMovimentacao" t ON t."id" = m."tipoMovimentacaoId"
    WHERE m."orcamentoId" = p_orcamentoId
      AND t."codigo" IN ('reserva_orcamento', 'liberacao_reserva', 'saida_orcamento')
  );
$$;

-- Wrappers legados → Material
CREATE OR REPLACE FUNCTION public."reservarFilamentoOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public."reservarMaterialOrcamento"(p_orcamentoId);
END;
$$;

CREATE OR REPLACE FUNCTION public."liberarReservaFilamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public."liberarReservaMaterial"(p_orcamentoId);
END;
$$;

CREATE OR REPLACE FUNCTION public."baixarFilamentoOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public."baixarMaterialOrcamento"(p_orcamentoId);
END;
$$;

CREATE OR REPLACE FUNCTION public."aplicarEfeitosStatusOrcamento"()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_novo RECORD;
  v_antigo RECORD;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."statusOrcamentoId" IS DISTINCT FROM NEW."statusOrcamentoId" THEN
    SELECT * INTO v_novo FROM public."OrcamentoStatus" WHERE "id" = NEW."statusOrcamentoId";
    SELECT * INTO v_antigo FROM public."OrcamentoStatus" WHERE "id" = OLD."statusOrcamentoId";

    IF v_novo."reservaEstoque" THEN
      PERFORM public."reservarMaterialOrcamento"(NEW."id");
    END IF;
    IF v_novo."baixaEstoque" THEN
      PERFORM public."baixarMaterialOrcamento"(NEW."id");
    END IF;
    IF v_novo."liberaReserva" THEN
      PERFORM public."liberarReservaMaterial"(NEW."id");
    END IF;

    IF v_novo."travaEdicao" THEN
      NEW."travado" := true;
    END IF;
    IF v_antigo."travaEdicao" AND NOT v_novo."travaEdicao" THEN
      NEW."travado" := false;
    END IF;

    IF v_novo."codigo" = 'em_digitacao' AND v_antigo."reservaEstoque" THEN
      PERFORM public."liberarReservaMaterial"(NEW."id");
      NEW."travado" := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public."reverterEstoqueOrcamento"(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public."orcamentoTemMovimentacaoEstoque"(UUID) TO authenticated;

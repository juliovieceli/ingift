-- Padrão de nomenclatura: Entidade + Detalhe (ex.: SecaoLanding, OrcamentoItem)

-- Orçamento
ALTER TABLE IF EXISTS public."StatusOrcamento" RENAME TO "OrcamentoStatus";
ALTER TABLE IF EXISTS public."ItemOrcamento" RENAME TO "OrcamentoItem";
ALTER TABLE IF EXISTS public."ItemOrcamentoFilamento" RENAME TO "OrcamentoItemFilamento";
ALTER TABLE IF EXISTS public."ItemOrcamentoMaterial" RENAME TO "OrcamentoItemMaterial";
ALTER TABLE IF EXISTS public."DadosCalculoOrcamento" RENAME TO "OrcamentoDadosCalculo";
ALTER TABLE IF EXISTS public."HistoricoStatusOrcamento" RENAME TO "OrcamentoHistoricoStatus";

-- CMS / portfólio
ALTER TABLE IF EXISTS public."ItemPortfolio" RENAME TO "PortfolioItem";

-- Estoque
ALTER TABLE IF EXISTS public."MovimentacaoEstoque" RENAME TO "EstoqueMovimentacao";
ALTER TABLE IF EXISTS public."TipoMovimentacaoEstoque" RENAME TO "EstoqueTipoMovimentacao";

-- Filamento / configurações
ALTER TABLE IF EXISTS public."CompraFilamento" RENAME TO "FilamentoCompra";
ALTER TABLE IF EXISTS public."ConfiguracaoImpressora" RENAME TO "ImpressoraConfiguracao";
ALTER TABLE IF EXISTS public."ConfiguracaoSistema" RENAME TO "SistemaConfiguracao";

-- Views públicas
DROP VIEW IF EXISTS public."ItemPortfolioPublico";
CREATE OR REPLACE VIEW public."PortfolioItemPublico" AS
  SELECT "id", "titulo", "descricao", "urlImagem", "ordem"
  FROM public."PortfolioItem"
  WHERE "publicado" = true;

-- Funções que referenciam tabelas renomeadas
CREATE OR REPLACE FUNCTION public."obterTipoMovimentacao"(p_codigo TEXT)
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT "id" FROM public."EstoqueTipoMovimentacao" WHERE "codigo" = p_codigo LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public."registrarHistoricoStatusOrcamento"()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."statusOrcamentoId" IS DISTINCT FROM NEW."statusOrcamentoId" THEN
    INSERT INTO public."OrcamentoHistoricoStatus"
      ("orcamentoId", "statusAnteriorId", "statusNovoId", "alteradoPor")
    VALUES (NEW."id", OLD."statusOrcamentoId", NEW."statusOrcamentoId", auth.uid());
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public."OrcamentoHistoricoStatus"
      ("orcamentoId", "statusAnteriorId", "statusNovoId", "alteradoPor")
    VALUES (NEW."id", NULL, NEW."statusOrcamentoId", auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public."reservarFilamentoOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_disponivel NUMERIC; v_tipo UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  v_tipo := public."obterTipoMovimentacao"('reserva_orcamento');
  FOR r IN
    SELECT iof."filamentoId", SUM(iof."pesoG" * io."quantidade") AS total_g
    FROM public."OrcamentoItemFilamento" iof
    JOIN public."OrcamentoItem" io ON io."id" = iof."itemOrcamentoId"
    WHERE io."orcamentoId" = p_orcamentoId AND iof."filamentoId" IS NOT NULL
    GROUP BY iof."filamentoId"
  LOOP
    SELECT ("estoqueGramas" - "estoqueReservadoGramas") INTO v_disponivel
    FROM public."Filamento" WHERE "id" = r."filamentoId" FOR UPDATE;
    IF v_disponivel < r.total_g THEN
      RAISE EXCEPTION 'Estoque disponível insuficiente para reserva';
    END IF;
    UPDATE public."Filamento"
    SET "estoqueReservadoGramas" = "estoqueReservadoGramas" + r.total_g
    WHERE "id" = r."filamentoId";
    INSERT INTO public."EstoqueMovimentacao"
      ("filamentoId", "tipoMovimentacaoId", "quantidadeG", "orcamentoId", "criadoPor")
    VALUES (r."filamentoId", v_tipo, r.total_g, p_orcamentoId, auth.uid());
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public."liberarReservaFilamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_tipo UUID; v_reserva UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  v_reserva := public."obterTipoMovimentacao"('reserva_orcamento');
  v_tipo := public."obterTipoMovimentacao"('liberacao_reserva');
  FOR r IN
    SELECT "filamentoId", SUM("quantidadeG") AS total_g
    FROM public."EstoqueMovimentacao"
    WHERE "orcamentoId" = p_orcamentoId AND "tipoMovimentacaoId" = v_reserva
    GROUP BY "filamentoId"
  LOOP
    UPDATE public."Filamento"
    SET "estoqueReservadoGramas" = GREATEST(0, "estoqueReservadoGramas" - r.total_g)
    WHERE "id" = r."filamentoId";
    INSERT INTO public."EstoqueMovimentacao"
      ("filamentoId", "tipoMovimentacaoId", "quantidadeG", "orcamentoId", "criadoPor")
    VALUES (r."filamentoId", v_tipo, r.total_g, p_orcamentoId, auth.uid());
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public."baixarFilamentoOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_tipo UUID; v_reserva UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  v_reserva := public."obterTipoMovimentacao"('reserva_orcamento');
  v_tipo := public."obterTipoMovimentacao"('saida_orcamento');
  FOR r IN
    SELECT "filamentoId", SUM("quantidadeG") AS total_g
    FROM public."EstoqueMovimentacao"
    WHERE "orcamentoId" = p_orcamentoId AND "tipoMovimentacaoId" = v_reserva
    GROUP BY "filamentoId"
  LOOP
    UPDATE public."Filamento" SET
      "estoqueGramas" = "estoqueGramas" - r.total_g,
      "estoqueReservadoGramas" = GREATEST(0, "estoqueReservadoGramas" - r.total_g)
    WHERE "id" = r."filamentoId";
    INSERT INTO public."EstoqueMovimentacao"
      ("filamentoId", "tipoMovimentacaoId", "quantidadeG", "orcamentoId", "criadoPor")
    VALUES (r."filamentoId", v_tipo, r.total_g, p_orcamentoId, auth.uid());
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public."aplicarEfeitosStatusOrcamento"()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_novo RECORD; v_antigo RECORD;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."statusOrcamentoId" IS DISTINCT FROM NEW."statusOrcamentoId" THEN
    SELECT * INTO v_novo FROM public."OrcamentoStatus" WHERE "id" = NEW."statusOrcamentoId";
    SELECT * INTO v_antigo FROM public."OrcamentoStatus" WHERE "id" = OLD."statusOrcamentoId";
    IF v_novo."reservaEstoque" THEN PERFORM public."reservarFilamentoOrcamento"(NEW."id"); END IF;
    IF v_novo."baixaEstoque" THEN PERFORM public."baixarFilamentoOrcamento"(NEW."id"); END IF;
    IF v_novo."liberaReserva" THEN PERFORM public."liberarReservaFilamento"(NEW."id"); END IF;
    IF v_novo."travaEdicao" THEN NEW."travado" := true; END IF;
    IF v_antigo."travaEdicao" AND NOT v_novo."travaEdicao" THEN NEW."travado" := false; END IF;
    IF v_novo."codigo" = 'em_digitacao' AND v_antigo."reservaEstoque" THEN
      PERFORM public."liberarReservaFilamento"(NEW."id");
      NEW."travado" := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public."processarCompraFilamento"()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_custo_kg NUMERIC; v_tipo UUID;
BEGIN
  v_custo_kg := (NEW."custoTotal" / NEW."quantidadeG") * 1000;
  UPDATE public."Filamento" SET
    "estoqueGramas" = "estoqueGramas" + NEW."quantidadeG",
    "custoMedioPorKg" = CASE
      WHEN "estoqueGramas" = 0 THEN v_custo_kg
      ELSE (("custoMedioPorKg" * "estoqueGramas") + NEW."custoTotal") / ("estoqueGramas" + NEW."quantidadeG") * 1000
    END
  WHERE "id" = NEW."filamentoId";
  v_tipo := public."obterTipoMovimentacao"('entrada_compra');
  INSERT INTO public."EstoqueMovimentacao"
    ("filamentoId", "tipoMovimentacaoId", "quantidadeG", "compraFilamentoId", "criadoPor")
  VALUES (NEW."filamentoId", v_tipo, NEW."quantidadeG", NEW."id", NEW."criadoPor");
  RETURN NEW;
END;
$$;

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
  ELSIF v_codigo IN ('perda', 'ajuste_manual', 'saida_orcamento') THEN
    UPDATE public."Material" SET "estoqueAtual" = GREATEST(0, "estoqueAtual" - v_qtd)
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

CREATE OR REPLACE FUNCTION public."reservarMaterialOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_disponivel NUMERIC; v_tipo UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  v_tipo := public."obterTipoMovimentacao"('reserva_orcamento');
  FOR r IN
    SELECT iom."materialId", SUM(iom."quantidade" * io."quantidade") AS total_q
    FROM public."OrcamentoItemMaterial" iom
    JOIN public."OrcamentoItem" io ON io."id" = iom."itemOrcamentoId"
    WHERE io."orcamentoId" = p_orcamentoId AND iom."materialId" IS NOT NULL
    GROUP BY iom."materialId"
  LOOP
    SELECT ("estoqueAtual" - "estoqueReservado") INTO v_disponivel
    FROM public."Material" WHERE "id" = r."materialId" FOR UPDATE;
    IF v_disponivel < r.total_q THEN
      RAISE EXCEPTION 'Estoque disponível insuficiente para reserva';
    END IF;
    INSERT INTO public."EstoqueMovimentacao"
      ("materialId", "tipoMovimentacaoId", "quantidadeG", "quantidade", "orcamentoId", "criadoPor")
    VALUES (r."materialId", v_tipo, r.total_q, r.total_q, p_orcamentoId, auth.uid());
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public."liberarReservaMaterial"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_tipo UUID; v_reserva UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  v_reserva := public."obterTipoMovimentacao"('reserva_orcamento');
  v_tipo := public."obterTipoMovimentacao"('liberacao_reserva');
  FOR r IN
    SELECT COALESCE("materialId", "filamentoId") AS mid, SUM(COALESCE("quantidade", "quantidadeG")) AS total_q
    FROM public."EstoqueMovimentacao"
    WHERE "orcamentoId" = p_orcamentoId AND "tipoMovimentacaoId" = v_reserva
    GROUP BY COALESCE("materialId", "filamentoId")
  LOOP
    INSERT INTO public."EstoqueMovimentacao"
      ("materialId", "tipoMovimentacaoId", "quantidadeG", "quantidade", "orcamentoId", "criadoPor")
    VALUES (r.mid, v_tipo, r.total_q, r.total_q, p_orcamentoId, auth.uid());
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public."baixarMaterialOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_tipo UUID; v_reserva UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  v_reserva := public."obterTipoMovimentacao"('reserva_orcamento');
  v_tipo := public."obterTipoMovimentacao"('saida_orcamento');
  FOR r IN
    SELECT COALESCE("materialId", "filamentoId") AS mid, SUM(COALESCE("quantidade", "quantidadeG")) AS total_q
    FROM public."EstoqueMovimentacao"
    WHERE "orcamentoId" = p_orcamentoId AND "tipoMovimentacaoId" = v_reserva
    GROUP BY COALESCE("materialId", "filamentoId")
  LOOP
    INSERT INTO public."EstoqueMovimentacao"
      ("materialId", "tipoMovimentacaoId", "quantidadeG", "quantidade", "orcamentoId", "criadoPor")
    VALUES (r.mid, v_tipo, r.total_q, r.total_q, p_orcamentoId, auth.uid());
  END LOOP;
END;
$$;

-- Grants (nomes novos)
GRANT SELECT, INSERT, UPDATE, DELETE ON public."OrcamentoStatus" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."OrcamentoItem" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."OrcamentoItemFilamento" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."OrcamentoItemMaterial" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."OrcamentoDadosCalculo" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."OrcamentoHistoricoStatus" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."PortfolioItem" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."EstoqueMovimentacao" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."EstoqueTipoMovimentacao" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."FilamentoCompra" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ImpressoraConfiguracao" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."SistemaConfiguracao" TO authenticated;
GRANT SELECT ON public."PortfolioItem" TO anon, authenticated;

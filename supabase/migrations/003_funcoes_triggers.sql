CREATE OR REPLACE FUNCTION public."ehAdmin"()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Perfil"
    WHERE "id" = auth.uid() AND "papel" = 'admin' AND "ativo" = true
  );
$$;

CREATE OR REPLACE FUNCTION public."atualizarTimestamp"()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW."atualizadoEm" = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public."criarPerfilNovoUsuario"()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public."Perfil" ("id", "nomeCompleto", "papel", "ativo")
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'admin', false);
  RETURN NEW;
END;
$$;

CREATE TRIGGER "onAuthUsuarioCriado"
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public."criarPerfilNovoUsuario"();

CREATE TRIGGER "trgPerfilAtualizado" BEFORE UPDATE ON public."Perfil"
  FOR EACH ROW EXECUTE FUNCTION public."atualizarTimestamp"();
CREATE TRIGGER "trgConfigImpressoraAtualizado" BEFORE UPDATE ON public."ConfiguracaoImpressora"
  FOR EACH ROW EXECUTE FUNCTION public."atualizarTimestamp"();
CREATE TRIGGER "trgClienteAtualizado" BEFORE UPDATE ON public."Cliente"
  FOR EACH ROW EXECUTE FUNCTION public."atualizarTimestamp"();
CREATE TRIGGER "trgFilamentoAtualizado" BEFORE UPDATE ON public."Filamento"
  FOR EACH ROW EXECUTE FUNCTION public."atualizarTimestamp"();
CREATE TRIGGER "trgProdutoAtualizado" BEFORE UPDATE ON public."Produto"
  FOR EACH ROW EXECUTE FUNCTION public."atualizarTimestamp"();
CREATE TRIGGER "trgOrcamentoAtualizado" BEFORE UPDATE ON public."Orcamento"
  FOR EACH ROW EXECUTE FUNCTION public."atualizarTimestamp"();

CREATE OR REPLACE FUNCTION public."obterTipoMovimentacao"(p_codigo TEXT)
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT "id" FROM public."TipoMovimentacaoEstoque" WHERE "codigo" = p_codigo LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public."registrarHistoricoStatusOrcamento"()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."statusOrcamentoId" IS DISTINCT FROM NEW."statusOrcamentoId" THEN
    INSERT INTO public."HistoricoStatusOrcamento"
      ("orcamentoId", "statusAnteriorId", "statusNovoId", "alteradoPor")
    VALUES (NEW."id", OLD."statusOrcamentoId", NEW."statusOrcamentoId", auth.uid());
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public."HistoricoStatusOrcamento"
      ("orcamentoId", "statusAnteriorId", "statusNovoId", "alteradoPor")
    VALUES (NEW."id", NULL, NEW."statusOrcamentoId", auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "trgHistoricoStatusOrcamento"
  AFTER INSERT OR UPDATE OF "statusOrcamentoId" ON public."Orcamento"
  FOR EACH ROW EXECUTE FUNCTION public."registrarHistoricoStatusOrcamento"();

CREATE OR REPLACE FUNCTION public."reservarFilamentoOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_disponivel NUMERIC; v_tipo UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  v_tipo := public."obterTipoMovimentacao"('reserva_orcamento');
  FOR r IN
    SELECT iof."filamentoId", SUM(iof."pesoG" * io."quantidade") AS total_g
    FROM public."ItemOrcamentoFilamento" iof
    JOIN public."ItemOrcamento" io ON io."id" = iof."itemOrcamentoId"
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
    INSERT INTO public."MovimentacaoEstoque"
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
    FROM public."MovimentacaoEstoque"
    WHERE "orcamentoId" = p_orcamentoId AND "tipoMovimentacaoId" = v_reserva
    GROUP BY "filamentoId"
  LOOP
    UPDATE public."Filamento"
    SET "estoqueReservadoGramas" = GREATEST(0, "estoqueReservadoGramas" - r.total_g)
    WHERE "id" = r."filamentoId";
    INSERT INTO public."MovimentacaoEstoque"
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
    FROM public."MovimentacaoEstoque"
    WHERE "orcamentoId" = p_orcamentoId AND "tipoMovimentacaoId" = v_reserva
    GROUP BY "filamentoId"
  LOOP
    UPDATE public."Filamento" SET
      "estoqueGramas" = "estoqueGramas" - r.total_g,
      "estoqueReservadoGramas" = GREATEST(0, "estoqueReservadoGramas" - r.total_g)
    WHERE "id" = r."filamentoId";
    INSERT INTO public."MovimentacaoEstoque"
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
    SELECT * INTO v_novo FROM public."StatusOrcamento" WHERE "id" = NEW."statusOrcamentoId";
    SELECT * INTO v_antigo FROM public."StatusOrcamento" WHERE "id" = OLD."statusOrcamentoId";
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

CREATE TRIGGER "trgEfeitosStatusOrcamento"
  BEFORE UPDATE OF "statusOrcamentoId" ON public."Orcamento"
  FOR EACH ROW EXECUTE FUNCTION public."aplicarEfeitosStatusOrcamento"();

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
  INSERT INTO public."MovimentacaoEstoque"
    ("filamentoId", "tipoMovimentacaoId", "quantidadeG", "compraFilamentoId", "criadoPor")
  VALUES (NEW."filamentoId", v_tipo, NEW."quantidadeG", NEW."id", NEW."criadoPor");
  RETURN NEW;
END;
$$;

CREATE TRIGGER "trgCompraFilamento" AFTER INSERT ON public."CompraFilamento"
  FOR EACH ROW EXECUTE FUNCTION public."processarCompraFilamento"();

CREATE OR REPLACE FUNCTION public."impedirAlteracaoHistorico"()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Histórico de status é imutável'; END;
$$;

CREATE TRIGGER "trgHistoricoImutavelUpdate" BEFORE UPDATE ON public."HistoricoStatusOrcamento"
  FOR EACH ROW EXECUTE FUNCTION public."impedirAlteracaoHistorico"();
CREATE TRIGGER "trgHistoricoImutavelDelete" BEFORE DELETE ON public."HistoricoStatusOrcamento"
  FOR EACH ROW EXECUTE FUNCTION public."impedirAlteracaoHistorico"();

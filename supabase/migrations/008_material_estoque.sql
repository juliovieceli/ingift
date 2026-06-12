-- Material unificado (insumos de produção) — idempotente (safe to re-run)

CREATE TABLE IF NOT EXISTS public."Material" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome"                TEXT NOT NULL,
  "descricao"           TEXT,
  "categoria"           TEXT NOT NULL DEFAULT 'outro',
  "unidadeMedida"       TEXT NOT NULL DEFAULT 'un',
  "estoqueAtual"        NUMERIC(12,2) NOT NULL DEFAULT 0,
  "estoqueReservado"    NUMERIC(12,2) NOT NULL DEFAULT 0,
  "estoqueMinimo"       NUMERIC(12,2) NOT NULL DEFAULT 0,
  "custoMedioUnitario"  NUMERIC(12,4) NOT NULL DEFAULT 0,
  "tipoMaterial"        TEXT,
  "cor"                 TEXT,
  "marca"               TEXT,
  "ativo"               BOOLEAN NOT NULL DEFAULT true,
  "criadoEm"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoEm"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"           UUID REFERENCES public."Perfil"("id"),
  "atualizadoPor"       UUID REFERENCES public."Perfil"("id")
);

-- Migrar filamentos existentes (skip se já migrado)
INSERT INTO public."Material" (
  "id", "nome", "categoria", "unidadeMedida",
  "estoqueAtual", "estoqueReservado", "estoqueMinimo", "custoMedioUnitario",
  "tipoMaterial", "cor", "marca", "ativo", "criadoEm", "atualizadoEm", "criadoPor", "atualizadoPor"
)
SELECT
  "id", "nome", 'filamento', 'g',
  "estoqueGramas", "estoqueReservadoGramas", "estoqueMinimoG",
  CASE WHEN "custoMedioPorKg" > 0 THEN "custoMedioPorKg" / 1000 ELSE 0 END,
  "tipoMaterial", "cor", "marca", "ativo", "criadoEm", "atualizadoEm", "criadoPor", "atualizadoPor"
FROM public."Filamento"
ON CONFLICT ("id") DO NOTHING;

-- Novos campos em MovimentacaoEstoque
ALTER TABLE public."MovimentacaoEstoque"
  ADD COLUMN IF NOT EXISTS "materialId" UUID REFERENCES public."Material"("id"),
  ADD COLUMN IF NOT EXISTS "quantidade" NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS "valorTotal" NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS "fornecedor" TEXT,
  ADD COLUMN IF NOT EXISTS "dataMovimentacao" DATE DEFAULT CURRENT_DATE;

UPDATE public."MovimentacaoEstoque" SET "materialId" = "filamentoId" WHERE "materialId" IS NULL AND "filamentoId" IS NOT NULL;
UPDATE public."MovimentacaoEstoque" SET "quantidade" = "quantidadeG" WHERE "quantidade" IS NULL;

-- ItemOrcamentoMaterial
CREATE TABLE IF NOT EXISTS public."ItemOrcamentoMaterial" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "itemOrcamentoId" UUID NOT NULL REFERENCES public."ItemOrcamento"("id") ON DELETE CASCADE,
  "materialId"      UUID REFERENCES public."Material"("id"),
  "tipo"            TEXT,
  "cor"             TEXT,
  "quantidade"      NUMERIC(12,2) NOT NULL DEFAULT 0,
  "precoUnitario"   NUMERIC(12,4) NOT NULL DEFAULT 0,
  "custoUnitario"   NUMERIC(12,2) NOT NULL DEFAULT 0,
  "ordem"           INT NOT NULL DEFAULT 0
);

INSERT INTO public."ItemOrcamentoMaterial" (
  "id", "itemOrcamentoId", "materialId", "tipo", "cor", "quantidade", "precoUnitario", "custoUnitario", "ordem"
)
SELECT
  "id", "itemOrcamentoId", "filamentoId", "tipo", "cor", "pesoG", "precoPorKg", "custoUnitario", "ordem"
FROM public."ItemOrcamentoFilamento"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO public."TipoMovimentacaoEstoque" ("codigo","nome") VALUES
  ('entrada_manual', 'Entrada manual')
ON CONFLICT ("codigo") DO NOTHING;

DROP TRIGGER IF EXISTS "trgMaterialAtualizado" ON public."Material";
CREATE TRIGGER "trgMaterialAtualizado" BEFORE UPDATE ON public."Material"
  FOR EACH ROW EXECUTE FUNCTION public."atualizarTimestamp"();

-- Processar movimentação genérica
CREATE OR REPLACE FUNCTION public."processarMovimentacaoEstoque"()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_codigo TEXT;
  v_qtd NUMERIC;
BEGIN
  SELECT tm."codigo" INTO v_codigo
  FROM public."TipoMovimentacaoEstoque" tm WHERE tm."id" = NEW."tipoMovimentacaoId";

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

DROP TRIGGER IF EXISTS "trgMovimentacaoEstoque" ON public."MovimentacaoEstoque";
CREATE TRIGGER "trgMovimentacaoEstoque"
  AFTER INSERT ON public."MovimentacaoEstoque"
  FOR EACH ROW EXECUTE FUNCTION public."processarMovimentacaoEstoque"();

-- Reserva/baixa genérica por material
CREATE OR REPLACE FUNCTION public."reservarMaterialOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_disponivel NUMERIC; v_tipo UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  v_tipo := public."obterTipoMovimentacao"('reserva_orcamento');
  FOR r IN
    SELECT iom."materialId", SUM(iom."quantidade" * io."quantidade") AS total_q
    FROM public."ItemOrcamentoMaterial" iom
    JOIN public."ItemOrcamento" io ON io."id" = iom."itemOrcamentoId"
    WHERE io."orcamentoId" = p_orcamentoId AND iom."materialId" IS NOT NULL
    GROUP BY iom."materialId"
  LOOP
    SELECT ("estoqueAtual" - "estoqueReservado") INTO v_disponivel
    FROM public."Material" WHERE "id" = r."materialId" FOR UPDATE;
    IF v_disponivel < r.total_q THEN
      RAISE EXCEPTION 'Estoque disponível insuficiente para reserva';
    END IF;
    INSERT INTO public."MovimentacaoEstoque"
      ("materialId", "tipoMovimentacaoId", "quantidadeG", "quantidade", "orcamentoId", "criadoPor")
    VALUES (r."materialId", v_tipo, r.total_q, r.total_q, p_orcamentoId, auth.uid());
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public."reservarFilamentoOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public."reservarMaterialOrcamento"(p_orcamentoId);
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
    FROM public."MovimentacaoEstoque"
    WHERE "orcamentoId" = p_orcamentoId AND "tipoMovimentacaoId" = v_reserva
    GROUP BY COALESCE("materialId", "filamentoId")
  LOOP
    INSERT INTO public."MovimentacaoEstoque"
      ("materialId", "tipoMovimentacaoId", "quantidadeG", "quantidade", "orcamentoId", "criadoPor")
    VALUES (r.mid, v_tipo, r.total_q, r.total_q, p_orcamentoId, auth.uid());
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public."liberarReservaFilamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public."liberarReservaMaterial"(p_orcamentoId);
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
    FROM public."MovimentacaoEstoque"
    WHERE "orcamentoId" = p_orcamentoId AND "tipoMovimentacaoId" = v_reserva
    GROUP BY COALESCE("materialId", "filamentoId")
  LOOP
    INSERT INTO public."MovimentacaoEstoque"
      ("materialId", "tipoMovimentacaoId", "quantidadeG", "quantidade", "orcamentoId", "criadoPor")
    VALUES (r.mid, v_tipo, r.total_q, r.total_q, p_orcamentoId, auth.uid());
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public."baixarFilamentoOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public."baixarMaterialOrcamento"(p_orcamentoId);
END;
$$;

CREATE INDEX IF NOT EXISTS "idxMaterialNome" ON public."Material"("nome");
CREATE INDEX IF NOT EXISTS "idxMaterialCategoria" ON public."Material"("categoria");
CREATE INDEX IF NOT EXISTS "idxMovimentacaoMaterial" ON public."MovimentacaoEstoque"("materialId");

ALTER TABLE public."Material" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ItemOrcamentoMaterial" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Material_admin_all" ON public."Material";
CREATE POLICY "Material_admin_all" ON public."Material"
  FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());

DROP POLICY IF EXISTS "ItemOrcamentoMaterial_admin_all" ON public."ItemOrcamentoMaterial";
CREATE POLICY "ItemOrcamentoMaterial_admin_all" ON public."ItemOrcamentoMaterial"
  FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());

-- Reorganização: composição unificada, cálculo por item relacional, drop JSONB legado

-- ---------------------------------------------------------------------------
-- Orcamento: prazos e hooks marketplace
-- ---------------------------------------------------------------------------
ALTER TABLE public."Orcamento"
  ADD COLUMN IF NOT EXISTS "prazoEntrega" DATE,
  ADD COLUMN IF NOT EXISTS "origem" TEXT NOT NULL DEFAULT 'manual'
    CHECK ("origem" IN ('manual', 'shopee')),
  ADD COLUMN IF NOT EXISTS "idExterno" TEXT;

-- ---------------------------------------------------------------------------
-- OrcamentoItem: snapshot impressora, margens e resultados
-- ---------------------------------------------------------------------------
ALTER TABLE public."OrcamentoItem"
  ADD COLUMN IF NOT EXISTS "materialId" UUID REFERENCES public."Material"("id"),
  ADD COLUMN IF NOT EXISTS "custoUnitario" NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "consumoKwh" NUMERIC(10,4) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS "precoKwh" NUMERIC(10,4) NOT NULL DEFAULT 0.85,
  ADD COLUMN IF NOT EXISTS "valorMaquina" NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vidaUtilHoras" NUMERIC(12,2) NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS "taxaFalha" NUMERIC(8,4) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS "margemMultiplicador" NUMERIC(8,4) NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS "taxaMarketplace" NUMERIC(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "adicional" NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "desconto" NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "custoProducaoTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "custoAposFalha" NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "precoVenda" NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "precoFinal" NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lucroEfetivo" NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "margemEfetiva" NUMERIC(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "idExterno" TEXT;

-- Preencher custoProducaoTotal a partir dos campos existentes
UPDATE public."OrcamentoItem" io
SET "custoProducaoTotal" = CASE
  WHEN io."tipoItem" = 'avulso' THEN io."custoMaterial"
  ELSE (io."custoMaterial" + io."custoEnergia" + io."custoDepreciacao") * io."quantidade"
END
WHERE "custoProducaoTotal" = 0;

UPDATE public."OrcamentoItem"
SET "precoFinal" = "precoTotal",
    "precoVenda" = "precoTotal",
    "lucroEfetivo" = GREATEST(0, "precoTotal" - "custoProducaoTotal")
WHERE "precoFinal" = 0 AND "precoTotal" > 0;

UPDATE public."OrcamentoItem"
SET "margemEfetiva" = CASE
  WHEN "custoProducaoTotal" > 0 THEN ("lucroEfetivo" / "custoProducaoTotal")
  ELSE 0
END;

-- Snapshot impressora/margens a partir de OrcamentoDadosCalculo ou impressora do orçamento
DO $$
BEGIN
  IF to_regclass('public."OrcamentoDadosCalculo"') IS NOT NULL THEN
    UPDATE public."OrcamentoItem" io
    SET
      "consumoKwh" = COALESCE(
        (dc."dadosImpressora"->>'consumoKwh')::NUMERIC,
        imp."consumoKwh",
        io."consumoKwh"
      ),
      "precoKwh" = COALESCE(
        (dc."dadosImpressora"->>'precoKwh')::NUMERIC,
        imp."precoKwh",
        io."precoKwh"
      ),
      "valorMaquina" = COALESCE(
        (dc."dadosImpressora"->>'valorMaquina')::NUMERIC,
        imp."valorMaquina",
        io."valorMaquina"
      ),
      "vidaUtilHoras" = COALESCE(
        (dc."dadosImpressora"->>'vidaUtilHoras')::NUMERIC,
        imp."vidaUtilHoras",
        io."vidaUtilHoras"
      ),
      "margemMultiplicador" = COALESCE(
        (dc."dadosMargensTaxas"->>'margemMultiplicador')::NUMERIC,
        imp."margemMultiplicador",
        io."margemMultiplicador"
      ),
      "taxaFalha" = COALESCE(
        (dc."dadosMargensTaxas"->>'taxaFalha')::NUMERIC,
        imp."taxaFalha",
        io."taxaFalha"
      ),
      "taxaMarketplace" = COALESCE(
        (dc."dadosMargensTaxas"->>'taxaMarketplace')::NUMERIC,
        imp."taxaMarketplace",
        io."taxaMarketplace"
      )
    FROM public."Orcamento" o
    LEFT JOIN public."OrcamentoDadosCalculo" dc ON dc."orcamentoId" = o."id"
    LEFT JOIN public."ImpressoraConfiguracao" imp ON imp."id" = o."configuracaoImpressoraId"
    WHERE io."orcamentoId" = o."id";
  ELSIF to_regclass('public."DadosCalculoOrcamento"') IS NOT NULL THEN
    UPDATE public."OrcamentoItem" io
    SET
      "consumoKwh" = COALESCE(
        (dc."dadosImpressora"->>'consumoKwh')::NUMERIC,
        imp."consumoKwh",
        io."consumoKwh"
      ),
      "precoKwh" = COALESCE(
        (dc."dadosImpressora"->>'precoKwh')::NUMERIC,
        imp."precoKwh",
        io."precoKwh"
      ),
      "valorMaquina" = COALESCE(
        (dc."dadosImpressora"->>'valorMaquina')::NUMERIC,
        imp."valorMaquina",
        io."valorMaquina"
      ),
      "vidaUtilHoras" = COALESCE(
        (dc."dadosImpressora"->>'vidaUtilHoras')::NUMERIC,
        imp."vidaUtilHoras",
        io."vidaUtilHoras"
      ),
      "margemMultiplicador" = COALESCE(
        (dc."dadosMargensTaxas"->>'margemMultiplicador')::NUMERIC,
        imp."margemMultiplicador",
        io."margemMultiplicador"
      ),
      "taxaFalha" = COALESCE(
        (dc."dadosMargensTaxas"->>'taxaFalha')::NUMERIC,
        imp."taxaFalha",
        io."taxaFalha"
      ),
      "taxaMarketplace" = COALESCE(
        (dc."dadosMargensTaxas"->>'taxaMarketplace')::NUMERIC,
        imp."taxaMarketplace",
        io."taxaMarketplace"
      )
    FROM public."Orcamento" o
    LEFT JOIN public."DadosCalculoOrcamento" dc ON dc."orcamentoId" = o."id"
    LEFT JOIN public."ImpressoraConfiguracao" imp ON imp."id" = o."configuracaoImpressoraId"
    WHERE io."orcamentoId" = o."id";
  ELSE
    UPDATE public."OrcamentoItem" io
    SET
      "consumoKwh" = COALESCE(imp."consumoKwh", io."consumoKwh"),
      "precoKwh" = COALESCE(imp."precoKwh", io."precoKwh"),
      "valorMaquina" = COALESCE(imp."valorMaquina", io."valorMaquina"),
      "vidaUtilHoras" = COALESCE(imp."vidaUtilHoras", io."vidaUtilHoras"),
      "margemMultiplicador" = COALESCE(imp."margemMultiplicador", io."margemMultiplicador"),
      "taxaFalha" = COALESCE(imp."taxaFalha", io."taxaFalha"),
      "taxaMarketplace" = COALESCE(imp."taxaMarketplace", io."taxaMarketplace")
    FROM public."Orcamento" o
    LEFT JOIN public."ImpressoraConfiguracao" imp ON imp."id" = o."configuracaoImpressoraId"
    WHERE io."orcamentoId" = o."id";
  END IF;
END $$;

UPDATE public."OrcamentoItem" io
SET
  "custoAposFalha" = CASE
    WHEN io."tipoItem" = 'peca' THEN io."custoProducaoTotal" * (1 + io."taxaFalha")
    ELSE io."custoProducaoTotal"
  END
WHERE io."custoAposFalha" = 0;

-- Avulsos: materialId e custoUnitario da linha de material (se tabela legada existir)
DO $$
BEGIN
  IF to_regclass('public."OrcamentoItemMaterial"') IS NOT NULL THEN
    UPDATE public."OrcamentoItem" io
    SET
      "materialId" = iom."materialId",
      "custoUnitario" = iom."precoUnitario"
    FROM public."OrcamentoItemMaterial" iom
    WHERE io."id" = iom."itemOrcamentoId"
      AND io."tipoItem" = 'avulso'
      AND iom."ordem" = 0
      AND io."materialId" IS NULL;
  ELSIF to_regclass('public."ItemOrcamentoMaterial"') IS NOT NULL THEN
    UPDATE public."OrcamentoItem" io
    SET
      "materialId" = iom."materialId",
      "custoUnitario" = iom."precoUnitario"
    FROM public."ItemOrcamentoMaterial" iom
    WHERE io."id" = iom."itemOrcamentoId"
      AND io."tipoItem" = 'avulso'
      AND iom."ordem" = 0
      AND io."materialId" IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- OrcamentoItemComposicao (unifica Filamento + Material)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."OrcamentoItemComposicao" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "itemOrcamentoId" UUID NOT NULL REFERENCES public."OrcamentoItem"("id") ON DELETE CASCADE,
  "materialId"      UUID NOT NULL REFERENCES public."Material"("id"),
  "categoria"       TEXT NOT NULL DEFAULT 'insumo',
  "descricao"       TEXT,
  "tipo"            TEXT,
  "cor"             TEXT,
  "quantidade"      NUMERIC(12,4) NOT NULL DEFAULT 0,
  "unidadeMedida"   TEXT NOT NULL DEFAULT 'un',
  "custoUnitario"   NUMERIC(12,4) NOT NULL DEFAULT 0,
  "custoTotal"      NUMERIC(12,2) NOT NULL DEFAULT 0,
  "pesoG"           NUMERIC(10,2),
  "ordem"           INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "idxOrcamentoItemComposicaoItem"
  ON public."OrcamentoItemComposicao"("itemOrcamentoId");

-- Migrar dados legados para composição (ignora se tabelas antigas já foram removidas)
DO $$
DECLARE
  v_fil TEXT;
  v_mat TEXT;
  v_filtro_fil TEXT := '';
BEGIN
  v_fil := CASE
    WHEN to_regclass('public."OrcamentoItemFilamento"') IS NOT NULL THEN 'public."OrcamentoItemFilamento"'
    WHEN to_regclass('public."ItemOrcamentoFilamento"') IS NOT NULL THEN 'public."ItemOrcamentoFilamento"'
    ELSE NULL
  END;

  v_mat := CASE
    WHEN to_regclass('public."OrcamentoItemMaterial"') IS NOT NULL THEN 'public."OrcamentoItemMaterial"'
    WHEN to_regclass('public."ItemOrcamentoMaterial"') IS NOT NULL THEN 'public."ItemOrcamentoMaterial"'
    ELSE NULL
  END;

  IF v_fil IS NOT NULL AND v_mat IS NOT NULL THEN
    EXECUTE format($sql$
      INSERT INTO public."OrcamentoItemComposicao" (
        "id", "itemOrcamentoId", "materialId", "categoria", "descricao", "tipo", "cor",
        "quantidade", "unidadeMedida", "custoUnitario", "custoTotal", "pesoG", "ordem"
      )
      SELECT
        f."id",
        f."itemOrcamentoId",
        COALESCE(f."filamentoId", m."materialId"),
        'filamento',
        COALESCE(mat."nome", f."tipo"),
        f."tipo",
        f."cor",
        f."pesoG",
        'gr',
        CASE WHEN f."pesoG" > 0 THEN f."custoUnitario" / f."pesoG" ELSE f."precoPorKg" / 1000 END,
        f."custoUnitario",
        f."pesoG",
        f."ordem"
      FROM %s f
      LEFT JOIN %s m
        ON m."itemOrcamentoId" = f."itemOrcamentoId" AND m."ordem" = f."ordem"
      LEFT JOIN public."Material" mat ON mat."id" = COALESCE(f."filamentoId", m."materialId")
      WHERE COALESCE(f."filamentoId", m."materialId") IS NOT NULL
      ON CONFLICT ("id") DO NOTHING
    $sql$, v_fil, v_mat);
  ELSIF v_fil IS NOT NULL THEN
    EXECUTE format($sql$
      INSERT INTO public."OrcamentoItemComposicao" (
        "id", "itemOrcamentoId", "materialId", "categoria", "descricao", "tipo", "cor",
        "quantidade", "unidadeMedida", "custoUnitario", "custoTotal", "pesoG", "ordem"
      )
      SELECT
        f."id",
        f."itemOrcamentoId",
        f."filamentoId",
        'filamento',
        COALESCE(mat."nome", f."tipo"),
        f."tipo",
        f."cor",
        f."pesoG",
        'gr',
        CASE WHEN f."pesoG" > 0 THEN f."custoUnitario" / f."pesoG" ELSE f."precoPorKg" / 1000 END,
        f."custoUnitario",
        f."pesoG",
        f."ordem"
      FROM %s f
      LEFT JOIN public."Material" mat ON mat."id" = f."filamentoId"
      WHERE f."filamentoId" IS NOT NULL
      ON CONFLICT ("id") DO NOTHING
    $sql$, v_fil);
  END IF;

  IF v_mat IS NOT NULL THEN
    IF v_fil IS NOT NULL THEN
      v_filtro_fil := format(
        'AND NOT EXISTS (
          SELECT 1 FROM %s f
          WHERE f."itemOrcamentoId" = iom."itemOrcamentoId" AND f."ordem" = iom."ordem"
        )',
        v_fil
      );
    END IF;

    EXECUTE format($sql$
      INSERT INTO public."OrcamentoItemComposicao" (
        "id", "itemOrcamentoId", "materialId", "categoria", "descricao", "tipo", "cor",
        "quantidade", "unidadeMedida", "custoUnitario", "custoTotal", "ordem"
      )
      SELECT
        iom."id",
        iom."itemOrcamentoId",
        iom."materialId",
        COALESCE(mat."categoria", 'insumo'),
        COALESCE(mat."nome", iom."tipo"),
        iom."tipo",
        iom."cor",
        iom."quantidade",
        COALESCE(mat."unidadeMedida", 'un'),
        iom."precoUnitario",
        iom."custoUnitario",
        iom."ordem"
      FROM %s iom
      JOIN public."Material" mat ON mat."id" = iom."materialId"
      JOIN public."OrcamentoItem" io ON io."id" = iom."itemOrcamentoId"
      WHERE iom."materialId" IS NOT NULL
        AND io."tipoItem" = 'peca'
        %s
      ON CONFLICT ("id") DO NOTHING
    $sql$, v_mat, v_filtro_fil);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Remover legado
-- ---------------------------------------------------------------------------
ALTER TABLE public."OrcamentoItem" DROP COLUMN IF EXISTS "detalheCustos";

DROP TABLE IF EXISTS public."OrcamentoItemFilamento";
DROP TABLE IF EXISTS public."ItemOrcamentoFilamento";
DROP TABLE IF EXISTS public."OrcamentoItemMaterial";
DROP TABLE IF EXISTS public."ItemOrcamentoMaterial";
DROP TABLE IF EXISTS public."OrcamentoDadosCalculo";
DROP TABLE IF EXISTS public."DadosCalculoOrcamento";

-- Impressora: remover logística (virou itens/composição)
ALTER TABLE public."ImpressoraConfiguracao"
  DROP COLUMN IF EXISTS "custoEmbalagem",
  DROP COLUMN IF EXISTS "custoFrete",
  DROP COLUMN IF EXISTS "custoAcabamento",
  DROP COLUMN IF EXISTS "outrosFixos";

-- Filamento legado (Material é canônico)
DROP TABLE IF EXISTS public."Filamento" CASCADE;

-- ---------------------------------------------------------------------------
-- Estoque: usar OrcamentoItemComposicao
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public."reservarMaterialOrcamento"(p_orcamentoId UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_disponivel NUMERIC; v_tipo UUID;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  v_tipo := public."obterTipoMovimentacao"('reserva_orcamento');
  FOR r IN
    SELECT mid AS "materialId", SUM(total_q) AS total_q FROM (
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
    GROUP BY mid
  LOOP
    IF r."materialId" IS NULL THEN CONTINUE; END IF;
    SELECT ("estoqueAtual" - "estoqueReservado") INTO v_disponivel
    FROM public."Material" WHERE "id" = r."materialId" FOR UPDATE;
    IF v_disponivel < r.total_q THEN
      RAISE EXCEPTION 'Estoque disponível insuficiente para reserva';
    END IF;
    INSERT INTO public."EstoqueMovimentacao"
      ("materialId", "tipoMovimentacaoId", "quantidade", "orcamentoId", "criadoPor")
    VALUES (r."materialId", v_tipo, r.total_q, p_orcamentoId, auth.uid());
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
    SELECT "materialId" AS mid, SUM(COALESCE("quantidade", "quantidadeG")) AS total_q
    FROM public."EstoqueMovimentacao"
    WHERE "orcamentoId" = p_orcamentoId AND "tipoMovimentacaoId" = v_reserva AND "materialId" IS NOT NULL
    GROUP BY "materialId"
  LOOP
    INSERT INTO public."EstoqueMovimentacao"
      ("materialId", "tipoMovimentacaoId", "quantidade", "orcamentoId", "criadoPor")
    VALUES (r.mid, v_tipo, r.total_q, p_orcamentoId, auth.uid());
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
    SELECT "materialId" AS mid, SUM(COALESCE("quantidade", "quantidadeG")) AS total_q
    FROM public."EstoqueMovimentacao"
    WHERE "orcamentoId" = p_orcamentoId AND "tipoMovimentacaoId" = v_reserva AND "materialId" IS NOT NULL
    GROUP BY "materialId"
  LOOP
    INSERT INTO public."EstoqueMovimentacao"
      ("materialId", "tipoMovimentacaoId", "quantidade", "orcamentoId", "criadoPor")
    VALUES (r.mid, v_tipo, r.total_q, p_orcamentoId, auth.uid());
  END LOOP;
END;
$$;

-- RLS OrcamentoItemComposicao
ALTER TABLE public."OrcamentoItemComposicao" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_OrcamentoItemComposicao" ON public."OrcamentoItemComposicao";
CREATE POLICY "admin_OrcamentoItemComposicao" ON public."OrcamentoItemComposicao"
  FOR ALL TO authenticated
  USING (public."ehAdmin"())
  WITH CHECK (public."ehAdmin"());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."OrcamentoItemComposicao" TO authenticated;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public."OrcamentoItemFilamento"',
    'public."ItemOrcamentoFilamento"',
    'public."OrcamentoItemMaterial"',
    'public."ItemOrcamentoMaterial"',
    'public."OrcamentoDadosCalculo"',
    'public."DadosCalculoOrcamento"',
    'public."Filamento"'
  ] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON %s FROM authenticated', t);
    END IF;
  END LOOP;
END $$;

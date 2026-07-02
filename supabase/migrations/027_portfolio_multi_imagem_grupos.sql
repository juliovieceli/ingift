-- Múltiplas imagens (até 4) e relação N:N item ↔ grupo

-- 1. Adicionar urlsImagem e migrar dados
ALTER TABLE public."PortfolioItem"
  ADD COLUMN "urlsImagem" TEXT[];

UPDATE public."PortfolioItem"
SET "urlsImagem" = ARRAY["urlImagem"]
WHERE "urlImagem" IS NOT NULL;

ALTER TABLE public."PortfolioItem"
  ALTER COLUMN "urlsImagem" SET NOT NULL,
  ADD CONSTRAINT "PortfolioItem_urlsImagem_cardinalidade"
    CHECK (cardinality("urlsImagem") >= 1 AND cardinality("urlsImagem") <= 4);

ALTER TABLE public."PortfolioGrupo"
  ADD COLUMN "urlsImagem" TEXT[] NOT NULL DEFAULT '{}';

UPDATE public."PortfolioGrupo"
SET "urlsImagem" = ARRAY["urlImagem"]
WHERE "urlImagem" IS NOT NULL AND TRIM("urlImagem") <> '';

ALTER TABLE public."PortfolioGrupo"
  ADD CONSTRAINT "PortfolioGrupo_urlsImagem_cardinalidade"
    CHECK (cardinality("urlsImagem") <= 4);

-- 2. Tabela de junção item ↔ grupo
CREATE TABLE public."PortfolioItemGrupo" (
  "itemId"  UUID NOT NULL REFERENCES public."PortfolioItem"("id") ON DELETE CASCADE,
  "grupoId" UUID NOT NULL REFERENCES public."PortfolioGrupo"("id") ON DELETE CASCADE,
  PRIMARY KEY ("itemId", "grupoId")
);

INSERT INTO public."PortfolioItemGrupo" ("itemId", "grupoId")
SELECT "id", "grupoId"
FROM public."PortfolioItem"
WHERE "grupoId" IS NOT NULL;

ALTER TABLE public."PortfolioItemGrupo" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PortfolioItemGrupo_admin" ON public."PortfolioItemGrupo"
  FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."PortfolioItemGrupo" TO authenticated;

-- 3. Recriar views públicas (dependem de urlImagem / grupoId)
DROP VIEW IF EXISTS public."PortfolioItemPublico";
DROP VIEW IF EXISTS public."PortfolioGrupoPublico";

ALTER TABLE public."PortfolioItem" DROP COLUMN "grupoId";
ALTER TABLE public."PortfolioItem" DROP COLUMN "urlImagem";
ALTER TABLE public."PortfolioGrupo" DROP COLUMN "urlImagem";

CREATE VIEW public."PortfolioItemPublico" AS
  SELECT
    pi."id",
    pi."titulo",
    pi."descricao",
    pi."urlsImagem",
    pi."urlLoja",
    pi."ordem",
    COALESCE(
      (SELECT array_agg(pig."grupoId" ORDER BY pig."grupoId")
       FROM public."PortfolioItemGrupo" pig
       WHERE pig."itemId" = pi."id"),
      '{}'::UUID[]
    ) AS "grupoIds"
  FROM public."PortfolioItem" pi
  WHERE pi."publicado" = true;

CREATE VIEW public."PortfolioGrupoPublico" AS
  SELECT "id", "nome", "descricao", "urlsImagem", "ordem"
  FROM public."PortfolioGrupo"
  WHERE "publicado" = true;

GRANT SELECT ON public."PortfolioItemPublico" TO anon, authenticated;
GRANT SELECT ON public."PortfolioGrupoPublico" TO anon, authenticated;

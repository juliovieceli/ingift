-- Entidade PortfolioGrupo + FK grupoId em PortfolioItem

CREATE TABLE public."PortfolioGrupo" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome"          TEXT NOT NULL,
  "descricao"     TEXT,
  "urlImagem"     TEXT,
  "publicado"     BOOLEAN NOT NULL DEFAULT false,
  "ordem"         INT NOT NULL DEFAULT 0,
  "criadoEm"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoEm"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"     UUID REFERENCES public."Perfil"("id"),
  "atualizadoPor" UUID REFERENCES public."Perfil"("id")
);

-- Migrar grupos de texto existentes
INSERT INTO public."PortfolioGrupo" ("nome", "publicado", "ordem")
SELECT TRIM("grupo"), true, ROW_NUMBER() OVER (ORDER BY TRIM("grupo"))
FROM public."PortfolioItem"
WHERE "grupo" IS NOT NULL AND TRIM("grupo") <> ''
GROUP BY TRIM("grupo");

ALTER TABLE public."PortfolioItem"
  ADD COLUMN "grupoId" UUID REFERENCES public."PortfolioGrupo"("id") ON DELETE SET NULL;

UPDATE public."PortfolioItem" pi
SET "grupoId" = pg."id"
FROM public."PortfolioGrupo" pg
WHERE pi."grupo" IS NOT NULL
  AND TRIM(pi."grupo") <> ''
  AND TRIM(pi."grupo") = pg."nome";

-- View depende da coluna "grupo"; precisa ser removida antes do DROP COLUMN
DROP VIEW IF EXISTS public."PortfolioItemPublico";

ALTER TABLE public."PortfolioItem" DROP COLUMN "grupo";

CREATE VIEW public."PortfolioItemPublico" AS
  SELECT "id", "titulo", "descricao", "urlImagem", "urlLoja", "grupoId", "ordem"
  FROM public."PortfolioItem"
  WHERE "publicado" = true;

CREATE VIEW public."PortfolioGrupoPublico" AS
  SELECT "id", "nome", "descricao", "urlImagem", "ordem"
  FROM public."PortfolioGrupo"
  WHERE "publicado" = true;

ALTER TABLE public."PortfolioGrupo" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PortfolioGrupo_publico" ON public."PortfolioGrupo"
  FOR SELECT USING ("publicado" = true);

CREATE POLICY "PortfolioGrupo_admin" ON public."PortfolioGrupo"
  FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());

GRANT SELECT ON public."PortfolioGrupo" TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."PortfolioGrupo" TO authenticated;
GRANT SELECT ON public."PortfolioGrupoPublico" TO anon, authenticated;

CREATE TRIGGER "trgPortfolioGrupoAtualizado" BEFORE UPDATE ON public."PortfolioGrupo"
  FOR EACH ROW EXECUTE FUNCTION public."atualizarTimestamp"();

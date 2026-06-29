-- Grupo/categoria nos itens de portfólio

ALTER TABLE public."PortfolioItem"
  ADD COLUMN IF NOT EXISTS "grupo" TEXT;

DROP VIEW IF EXISTS public."PortfolioItemPublico";

CREATE VIEW public."PortfolioItemPublico" AS
  SELECT "id", "titulo", "descricao", "urlImagem", "urlLoja", "grupo", "ordem"
  FROM public."PortfolioItem"
  WHERE "publicado" = true;

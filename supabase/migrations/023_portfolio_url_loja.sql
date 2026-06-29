-- Link da loja nos itens de portfólio

ALTER TABLE public."PortfolioItem"
  ADD COLUMN IF NOT EXISTS "urlLoja" TEXT;

-- CREATE OR REPLACE não permite inserir coluna no meio da view; recriar.
DROP VIEW IF EXISTS public."PortfolioItemPublico";

CREATE VIEW public."PortfolioItemPublico" AS
  SELECT "id", "titulo", "descricao", "urlImagem", "urlLoja", "ordem"
  FROM public."PortfolioItem"
  WHERE "publicado" = true;

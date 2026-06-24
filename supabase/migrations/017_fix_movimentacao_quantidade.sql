-- quantidade é o campo canônico; quantidadeG é legado (filamento em gramas)

ALTER TABLE public."EstoqueMovimentacao"
  ALTER COLUMN "quantidadeG" DROP NOT NULL;

UPDATE public."EstoqueMovimentacao"
SET "quantidade" = "quantidadeG"
WHERE "quantidade" IS NULL AND "quantidadeG" IS NOT NULL;

UPDATE public."EstoqueMovimentacao"
SET "quantidadeG" = "quantidade"
WHERE "quantidadeG" IS NULL AND "quantidade" IS NOT NULL;

CREATE OR REPLACE FUNCTION public."normalizarMovimentacaoEstoque"()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."quantidade" IS NULL AND NEW."quantidadeG" IS NOT NULL THEN
    NEW."quantidade" := NEW."quantidadeG";
  ELSIF NEW."quantidadeG" IS NULL AND NEW."quantidade" IS NOT NULL THEN
    NEW."quantidadeG" := NEW."quantidade";
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trgNormalizarMovimentacaoEstoque" ON public."EstoqueMovimentacao";
CREATE TRIGGER "trgNormalizarMovimentacaoEstoque"
  BEFORE INSERT OR UPDATE ON public."EstoqueMovimentacao"
  FOR EACH ROW EXECUTE FUNCTION public."normalizarMovimentacaoEstoque"();

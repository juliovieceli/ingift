ALTER TABLE public."EstoqueMovimentacao"
  ALTER COLUMN "filamentoId" DROP NOT NULL;

ALTER TABLE public."EstoqueMovimentacao"
  DROP CONSTRAINT IF EXISTS "EstoqueMovimentacao_referencia_chk";

ALTER TABLE public."EstoqueMovimentacao"
  ADD CONSTRAINT "EstoqueMovimentacao_referencia_chk"
  CHECK ("materialId" IS NOT NULL OR "filamentoId" IS NOT NULL);

ALTER TABLE public."OrcamentoItem"
  ADD COLUMN IF NOT EXISTS "tipoItem" TEXT NOT NULL DEFAULT 'peca'
    CHECK ("tipoItem" IN ('peca', 'avulso')),
  ADD COLUMN IF NOT EXISTS "aplicarMargem" BOOLEAN NOT NULL DEFAULT true;

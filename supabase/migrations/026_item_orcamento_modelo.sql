-- Modelos reutilizáveis de peça para orçamentos (cadastro interno, não CMS)

CREATE TABLE public."ItemOrcamentoModelo" (
  "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome"                     TEXT NOT NULL,
  "nomePeca"                 TEXT NOT NULL,
  "tempoHoras"               INT NOT NULL DEFAULT 0,
  "tempoMinutos"             INT NOT NULL DEFAULT 0,
  "quantidade"               INT NOT NULL DEFAULT 1 CHECK ("quantidade" >= 1),
  "observacoes"              TEXT,
  "configuracaoImpressoraId" UUID REFERENCES public."ImpressoraConfiguracao"("id"),
  "consumoKwh"               NUMERIC(10,4) NOT NULL DEFAULT 0.15,
  "precoKwh"                 NUMERIC(10,4) NOT NULL DEFAULT 0.85,
  "valorMaquina"             NUMERIC(12,2) NOT NULL DEFAULT 0,
  "vidaUtilHoras"            NUMERIC(12,2) NOT NULL DEFAULT 5000,
  "taxaFalha"                NUMERIC(8,4) NOT NULL DEFAULT 0.15,
  "margemMultiplicador"      NUMERIC(8,4) NOT NULL DEFAULT 2.5,
  "taxaMarketplace"          NUMERIC(8,4) NOT NULL DEFAULT 0,
  "adicional"                NUMERIC(12,2) NOT NULL DEFAULT 0,
  "desconto"                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  "ativo"                    BOOLEAN NOT NULL DEFAULT true,
  "criadoEm"                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoEm"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"                UUID REFERENCES public."Perfil"("id"),
  "atualizadoPor"            UUID REFERENCES public."Perfil"("id")
);

CREATE INDEX IF NOT EXISTS "idxItemOrcamentoModeloAtivo"
  ON public."ItemOrcamentoModelo"("ativo") WHERE "ativo" = true;

CREATE TABLE public."ItemOrcamentoModeloComposicao" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "modeloItemId"  UUID NOT NULL REFERENCES public."ItemOrcamentoModelo"("id") ON DELETE CASCADE,
  "materialId"    UUID NOT NULL REFERENCES public."Material"("id"),
  "categoria"     TEXT NOT NULL DEFAULT 'insumo',
  "descricao"     TEXT,
  "tipo"          TEXT,
  "cor"           TEXT,
  "quantidade"    NUMERIC(12,4) NOT NULL DEFAULT 0,
  "unidadeMedida" TEXT NOT NULL DEFAULT 'un',
  "custoUnitario" NUMERIC(12,4) NOT NULL DEFAULT 0,
  "pesoG"         NUMERIC(10,2),
  "ordem"         INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "idxItemOrcamentoModeloComposicaoModelo"
  ON public."ItemOrcamentoModeloComposicao"("modeloItemId");

DROP TRIGGER IF EXISTS "trgItemOrcamentoModeloAtualizado" ON public."ItemOrcamentoModelo";
CREATE TRIGGER "trgItemOrcamentoModeloAtualizado" BEFORE UPDATE ON public."ItemOrcamentoModelo"
  FOR EACH ROW EXECUTE FUNCTION public."atualizarTimestamp"();

ALTER TABLE public."ItemOrcamentoModelo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ItemOrcamentoModeloComposicao" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_ItemOrcamentoModelo" ON public."ItemOrcamentoModelo";
CREATE POLICY "admin_ItemOrcamentoModelo" ON public."ItemOrcamentoModelo"
  FOR ALL TO authenticated
  USING (public."ehAdmin"())
  WITH CHECK (public."ehAdmin"());

DROP POLICY IF EXISTS "admin_ItemOrcamentoModeloComposicao" ON public."ItemOrcamentoModeloComposicao";
CREATE POLICY "admin_ItemOrcamentoModeloComposicao" ON public."ItemOrcamentoModeloComposicao"
  FOR ALL TO authenticated
  USING (public."ehAdmin"())
  WITH CHECK (public."ehAdmin"());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."ItemOrcamentoModelo" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ItemOrcamentoModeloComposicao" TO authenticated;

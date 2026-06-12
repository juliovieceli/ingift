CREATE TABLE public."Perfil" (
  "id"           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "nomeCompleto" TEXT NOT NULL,
  "papel"        TEXT NOT NULL DEFAULT 'admin',
  "ativo"        BOOLEAN NOT NULL DEFAULT false,
  "criadoEm"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoEm" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public."StatusOrcamento" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "codigo"         TEXT NOT NULL UNIQUE,
  "nome"           TEXT NOT NULL,
  "ordem"          INT NOT NULL DEFAULT 0,
  "cor"            TEXT,
  "ativo"          BOOLEAN NOT NULL DEFAULT true,
  "travaEdicao"    BOOLEAN NOT NULL DEFAULT false,
  "reservaEstoque" BOOLEAN NOT NULL DEFAULT false,
  "baixaEstoque"   BOOLEAN NOT NULL DEFAULT false,
  "liberaReserva"  BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public."TipoMovimentacaoEstoque" (
  "id"     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "codigo" TEXT NOT NULL UNIQUE,
  "nome"   TEXT NOT NULL,
  "ativo"  BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public."ConfiguracaoImpressora" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome"                TEXT NOT NULL,
  "modelo"              TEXT,
  "consumoKwh"          NUMERIC(10,4) NOT NULL DEFAULT 0.15,
  "precoKwh"            NUMERIC(10,4) NOT NULL DEFAULT 0.85,
  "valorMaquina"        NUMERIC(12,2) NOT NULL DEFAULT 3500,
  "vidaUtilHoras"       NUMERIC(10,2) NOT NULL DEFAULT 5000,
  "margemMultiplicador" NUMERIC(6,2) NOT NULL DEFAULT 2.5,
  "taxaFalha"           NUMERIC(6,4) NOT NULL DEFAULT 0.15,
  "taxaMarketplace"     NUMERIC(6,4) NOT NULL DEFAULT 0,
  "custoEmbalagem"      NUMERIC(10,2) NOT NULL DEFAULT 0,
  "custoFrete"          NUMERIC(10,2) NOT NULL DEFAULT 0,
  "custoAcabamento"     NUMERIC(10,2) NOT NULL DEFAULT 0,
  "outrosFixos"         NUMERIC(10,2) NOT NULL DEFAULT 0,
  "ativo"               BOOLEAN NOT NULL DEFAULT true,
  "criadoEm"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoEm"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"           UUID REFERENCES public."Perfil"("id"),
  "atualizadoPor"       UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE public."ConfiguracaoSistema" (
  "id"                          SMALLINT PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
  "validadeOrcamentoDias"       INT NOT NULL DEFAULT 15,
  "templateMargemMultiplicador" NUMERIC(6,2) NOT NULL DEFAULT 2.5,
  "templateTaxaFalha"           NUMERIC(6,4) NOT NULL DEFAULT 0.15,
  "templateTaxaMarketplace"     NUMERIC(6,4) NOT NULL DEFAULT 0,
  "templateCustoEmbalagem"      NUMERIC(10,2) NOT NULL DEFAULT 0,
  "templateCustoFrete"          NUMERIC(10,2) NOT NULL DEFAULT 0,
  "templateCustoAcabamento"     NUMERIC(10,2) NOT NULL DEFAULT 0,
  "templateOutrosFixos"         NUMERIC(10,2) NOT NULL DEFAULT 0,
  "atualizadoEm"                TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoPor"               UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE public."Cliente" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome"          TEXT NOT NULL,
  "telefone"      TEXT,
  "email"         TEXT,
  "documento"     TEXT,
  "endereco"      TEXT,
  "observacoes"   TEXT,
  "ativo"         BOOLEAN NOT NULL DEFAULT true,
  "criadoEm"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoEm"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"     UUID REFERENCES public."Perfil"("id"),
  "atualizadoPor" UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE public."Filamento" (
  "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome"                   TEXT NOT NULL,
  "tipoMaterial"           TEXT NOT NULL DEFAULT 'PLA',
  "cor"                    TEXT,
  "marca"                  TEXT,
  "pesoRoloG"              INT NOT NULL DEFAULT 1000,
  "estoqueGramas"          NUMERIC(12,2) NOT NULL DEFAULT 0,
  "estoqueReservadoGramas" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "estoqueMinimoG"         NUMERIC(12,2) NOT NULL DEFAULT 100,
  "custoMedioPorKg"        NUMERIC(10,2) NOT NULL DEFAULT 0,
  "ativo"                  BOOLEAN NOT NULL DEFAULT true,
  "criadoEm"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoEm"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"              UUID REFERENCES public."Perfil"("id"),
  "atualizadoPor"          UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE public."CompraFilamento" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "filamentoId" UUID NOT NULL REFERENCES public."Filamento"("id"),
  "quantidadeG" NUMERIC(12,2) NOT NULL CHECK ("quantidadeG" > 0),
  "custoTotal"  NUMERIC(12,2) NOT NULL CHECK ("custoTotal" >= 0),
  "fornecedor"  TEXT,
  "dataCompra"  DATE NOT NULL DEFAULT CURRENT_DATE,
  "observacoes" TEXT,
  "criadoEm"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"   UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE public."MovimentacaoEstoque" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "filamentoId"        UUID NOT NULL REFERENCES public."Filamento"("id"),
  "tipoMovimentacaoId" UUID NOT NULL REFERENCES public."TipoMovimentacaoEstoque"("id"),
  "quantidadeG"        NUMERIC(12,2) NOT NULL CHECK ("quantidadeG" > 0),
  "orcamentoId"        UUID,
  "compraFilamentoId"  UUID REFERENCES public."CompraFilamento"("id"),
  "observacoes"        TEXT,
  "criadoEm"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"          UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE public."Produto" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome"                TEXT NOT NULL,
  "descricao"           TEXT,
  "categoria"           TEXT,
  "urlImagem"           TEXT,
  "tempoMedioHoras"     NUMERIC(8,2),
  "pesoMedioFilamentoG" NUMERIC(10,2),
  "exibirNaLanding"     BOOLEAN NOT NULL DEFAULT false,
  "ativo"               BOOLEAN NOT NULL DEFAULT true,
  "criadoEm"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoEm"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"           UUID REFERENCES public."Perfil"("id"),
  "atualizadoPor"       UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE public."Orcamento" (
  "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "numeroSequencial"         SERIAL,
  "clienteId"                UUID NOT NULL REFERENCES public."Cliente"("id"),
  "statusOrcamentoId"        UUID NOT NULL REFERENCES public."StatusOrcamento"("id"),
  "configuracaoImpressoraId" UUID REFERENCES public."ConfiguracaoImpressora"("id"),
  "travado"                  BOOLEAN NOT NULL DEFAULT false,
  "validoAte"                DATE,
  "observacoes"              TEXT,
  "custoSubtotal"            NUMERIC(12,2) NOT NULL DEFAULT 0,
  "precoTotal"               NUMERIC(12,2) NOT NULL DEFAULT 0,
  "criadoEm"                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoEm"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"                UUID REFERENCES public."Perfil"("id"),
  "atualizadoPor"            UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE public."DadosCalculoOrcamento" (
  "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orcamentoId"              UUID NOT NULL UNIQUE REFERENCES public."Orcamento"("id") ON DELETE CASCADE,
  "configuracaoImpressoraId" UUID REFERENCES public."ConfiguracaoImpressora"("id"),
  "dadosImpressora"          JSONB NOT NULL DEFAULT '{}',
  "dadosMargensTaxas"        JSONB NOT NULL DEFAULT '{}',
  "dadosLogistica"           JSONB NOT NULL DEFAULT '{}',
  "pecasCalculadas"          JSONB NOT NULL DEFAULT '[]',
  "resumoTotais"             JSONB NOT NULL DEFAULT '{}',
  "alterouPadraoImpressora"  BOOLEAN NOT NULL DEFAULT false,
  "criadoEm"                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"                UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE public."ItemOrcamento" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orcamentoId"      UUID NOT NULL REFERENCES public."Orcamento"("id") ON DELETE CASCADE,
  "produtoId"        UUID REFERENCES public."Produto"("id"),
  "nomePeca"         TEXT NOT NULL,
  "tempoHoras"       INT NOT NULL DEFAULT 0,
  "tempoMinutos"     INT NOT NULL DEFAULT 0,
  "quantidade"       INT NOT NULL DEFAULT 1 CHECK ("quantidade" > 0),
  "pesoTotalG"       NUMERIC(10,2) NOT NULL DEFAULT 0,
  "observacoes"      TEXT,
  "custoMaterial"    NUMERIC(12,2) NOT NULL DEFAULT 0,
  "custoEnergia"     NUMERIC(12,2) NOT NULL DEFAULT 0,
  "custoDepreciacao" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "precoUnitario"    NUMERIC(12,2) NOT NULL DEFAULT 0,
  "precoTotal"       NUMERIC(12,2) NOT NULL DEFAULT 0,
  "detalheCustos"    JSONB NOT NULL DEFAULT '{}',
  "ordem"            INT NOT NULL DEFAULT 0,
  "criadoEm"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public."ItemOrcamentoFilamento" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "itemOrcamentoId" UUID NOT NULL REFERENCES public."ItemOrcamento"("id") ON DELETE CASCADE,
  "filamentoId"     UUID REFERENCES public."Filamento"("id"),
  "tipo"            TEXT NOT NULL,
  "cor"             TEXT,
  "precoPorKg"      NUMERIC(10,2) NOT NULL DEFAULT 0,
  "pesoG"           NUMERIC(10,2) NOT NULL DEFAULT 0,
  "custoUnitario"   NUMERIC(12,2) NOT NULL DEFAULT 0,
  "ordem"           INT NOT NULL DEFAULT 0
);

CREATE TABLE public."HistoricoStatusOrcamento" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orcamentoId"      UUID NOT NULL REFERENCES public."Orcamento"("id") ON DELETE CASCADE,
  "statusAnteriorId" UUID REFERENCES public."StatusOrcamento"("id"),
  "statusNovoId"     UUID NOT NULL REFERENCES public."StatusOrcamento"("id"),
  "observacoes"      TEXT,
  "alteradoEm"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "alteradoPor"      UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE public."SecaoLanding" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"          TEXT NOT NULL UNIQUE,
  "titulo"        TEXT NOT NULL,
  "conteudo"      JSONB NOT NULL DEFAULT '{}',
  "publicado"     BOOLEAN NOT NULL DEFAULT false,
  "ordem"         INT NOT NULL DEFAULT 0,
  "atualizadoEm"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoPor" UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE public."ItemPortfolio" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "titulo"        TEXT NOT NULL,
  "descricao"     TEXT,
  "urlImagem"     TEXT NOT NULL,
  "publicado"     BOOLEAN NOT NULL DEFAULT false,
  "ordem"         INT NOT NULL DEFAULT 0,
  "criadoEm"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoEm"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "criadoPor"     UUID REFERENCES public."Perfil"("id"),
  "atualizadoPor" UUID REFERENCES public."Perfil"("id")
);

CREATE TABLE public."LogAuditoria" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nomeTabela"   TEXT NOT NULL,
  "registroId"   UUID,
  "acao"         TEXT NOT NULL,
  "dadosAntigos" JSONB,
  "dadosNovos"   JSONB,
  "executadoPor" UUID REFERENCES public."Perfil"("id"),
  "executadoEm"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."MovimentacaoEstoque"
  ADD CONSTRAINT "MovimentacaoEstoque_orcamentoId_fkey"
  FOREIGN KEY ("orcamentoId") REFERENCES public."Orcamento"("id");

CREATE INDEX "idxClienteNome" ON public."Cliente"("nome");
CREATE INDEX "idxOrcamentoCliente" ON public."Orcamento"("clienteId");
CREATE INDEX "idxOrcamentoStatus" ON public."Orcamento"("statusOrcamentoId");
CREATE INDEX "idxItemOrcamentoOrcamento" ON public."ItemOrcamento"("orcamentoId");
CREATE INDEX "idxMovimentacaoFilamento" ON public."MovimentacaoEstoque"("filamentoId");

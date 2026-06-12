-- =============================================================================
-- Hardening de permissões (rodar após 001–006)
--
-- No Dashboard do Supabase, configure também:
--   Authentication → Providers → Email → desabilitar "Enable sign ups"
--   Authentication → Settings → habilitar MFA para admins (recomendado)
-- =============================================================================

-- Views públicas (somente colunas necessárias para a landing)
CREATE OR REPLACE VIEW public."SecaoLandingPublica" AS
  SELECT "slug", "titulo", "conteudo", "ordem"
  FROM public."SecaoLanding"
  WHERE "publicado" = true;

CREATE OR REPLACE VIEW public."ItemPortfolioPublico" AS
  SELECT "id", "titulo", "descricao", "urlImagem", "ordem"
  FROM public."ItemPortfolio"
  WHERE "publicado" = true;

-- Remover acesso direto do anon às tabelas base (landing usa Edge Function)
REVOKE ALL ON public."SecaoLanding" FROM anon;
REVOKE ALL ON public."ItemPortfolio" FROM anon;
REVOKE ALL ON public."Produto" FROM anon;

-- anon não acessa mais tabelas de negócio diretamente
REVOKE ALL ON public."Perfil" FROM anon;
REVOKE ALL ON public."Cliente" FROM anon;
REVOKE ALL ON public."Orcamento" FROM anon;
REVOKE ALL ON public."Filamento" FROM anon;
REVOKE ALL ON public."CompraFilamento" FROM anon;
REVOKE ALL ON public."MovimentacaoEstoque" FROM anon;
REVOKE ALL ON public."ConfiguracaoImpressora" FROM anon;
REVOKE ALL ON public."ConfiguracaoSistema" FROM anon;
REVOKE ALL ON public."StatusOrcamento" FROM anon;
REVOKE ALL ON public."TipoMovimentacaoEstoque" FROM anon;
REVOKE ALL ON public."DadosCalculoOrcamento" FROM anon;
REVOKE ALL ON public."ItemOrcamento" FROM anon;
REVOKE ALL ON public."ItemOrcamentoFilamento" FROM anon;
REVOKE ALL ON public."HistoricoStatusOrcamento" FROM anon;
REVOKE ALL ON public."LogAuditoria" FROM anon;

-- authenticated: permissões explícitas (RLS + ehAdmin() filtram o acesso real)
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Perfil','StatusOrcamento','TipoMovimentacaoEstoque','ConfiguracaoImpressora',
    'ConfiguracaoSistema','Cliente','Filamento','CompraFilamento','MovimentacaoEstoque',
    'Produto','Orcamento','DadosCalculoOrcamento','ItemOrcamento','ItemOrcamentoFilamento',
    'HistoricoStatusOrcamento','SecaoLanding','ItemPortfolio','LogAuditoria'
  ] LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',
      t
    );
  END LOOP;
END $$;

-- Sequences para inserts autenticados
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

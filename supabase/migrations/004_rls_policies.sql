DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Perfil','StatusOrcamento','TipoMovimentacaoEstoque','ConfiguracaoImpressora',
    'ConfiguracaoSistema','Cliente','Filamento','CompraFilamento','MovimentacaoEstoque',
    'Produto','Orcamento','DadosCalculoOrcamento','ItemOrcamento','ItemOrcamentoFilamento',
    'HistoricoStatusOrcamento','SecaoLanding','ItemPortfolio','LogAuditoria'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY[
    'Perfil','Cliente','Orcamento','Filamento','MovimentacaoEstoque','LogAuditoria'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

CREATE POLICY "Perfil_select" ON public."Perfil" FOR SELECT
  USING (auth.uid() = "id" OR public."ehAdmin"());
CREATE POLICY "Perfil_admin" ON public."Perfil" FOR ALL
  USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'StatusOrcamento','TipoMovimentacaoEstoque','ConfiguracaoImpressora',
    'ConfiguracaoSistema','Cliente','Filamento','CompraFilamento','MovimentacaoEstoque',
    'Produto','Orcamento','DadosCalculoOrcamento','ItemOrcamento','ItemOrcamentoFilamento',
    'HistoricoStatusOrcamento','LogAuditoria'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "admin_%s" ON public.%I FOR ALL USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"())',
      t, t
    );
  END LOOP;
END $$;

CREATE POLICY "SecaoLanding_publico" ON public."SecaoLanding" FOR SELECT USING ("publicado" = true);
CREATE POLICY "SecaoLanding_admin" ON public."SecaoLanding" FOR ALL
  USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());
CREATE POLICY "ItemPortfolio_publico" ON public."ItemPortfolio" FOR SELECT USING ("publicado" = true);
CREATE POLICY "ItemPortfolio_admin" ON public."ItemPortfolio" FOR ALL
  USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());
CREATE POLICY "Produto_publico" ON public."Produto" FOR SELECT
  USING ("exibirNaLanding" = true AND "ativo" = true);

GRANT SELECT ON public."SecaoLanding" TO anon, authenticated;
GRANT SELECT ON public."ItemPortfolio" TO anon, authenticated;
GRANT SELECT ON public."Produto" TO anon, authenticated;
GRANT SELECT ON public."Perfil" TO authenticated;

-- Garante permissões de escrita em SecaoLanding e ItemPortfolio para authenticated (admin via RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public."SecaoLanding" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ItemPortfolio" TO authenticated;

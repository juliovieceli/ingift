-- Seção Marca/Logo editável no CMS; remove badge redundante do hero

INSERT INTO public."SecaoLanding" ("slug", "titulo", "conteudo", "publicado", "ordem")
VALUES (
  'marca',
  'Marca / Logo',
  '{"urlLogo":"/marca/sublogo.png","nomeMarca":"InGift","exibirLogoHero":false}'::jsonb,
  true,
  0
)
ON CONFLICT ("slug") DO UPDATE SET
  "titulo" = EXCLUDED."titulo",
  "conteudo" = EXCLUDED."conteudo",
  "publicado" = EXCLUDED."publicado",
  "ordem" = EXCLUDED."ordem";

UPDATE public."SecaoLanding"
SET "conteudo" = "conteudo" - 'badge'
WHERE "slug" = 'hero';

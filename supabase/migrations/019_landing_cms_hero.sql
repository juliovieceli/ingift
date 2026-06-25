-- Atualiza hero com novos campos CMS e adiciona seção portfolio

UPDATE public."SecaoLanding"
SET "conteudo" = jsonb_build_object(
  'badge', 'InGift · Impressão 3D',
  'titulo', 'Transformamos ideias em objetos reais',
  'frasesRotativas', jsonb_build_array(
    'para sua empresa',
    'para presentes únicos',
    'para brindes corporativos',
    'para o seu projeto'
  ),
  'subtitulo', COALESCE("conteudo"->>'subtitulo', 'Transformamos suas ideias em objetos reais com qualidade e precisão'),
  'cta', COALESCE("conteudo"->>'cta', 'Solicitar orçamento'),
  'ctaSecundario', 'os'
)
WHERE "slug" = 'hero';

INSERT INTO public."SecaoLanding" ("slug", "titulo", "conteudo", "publicado", "ordem")
VALUES (
  'portfolio',
  'Portfólio',
  '{"subtitulo":"Alguns dos nossos trabalhos em impressão 3D"}'::jsonb,
  true,
  3
)
ON CONFLICT ("slug") DO UPDATE SET
  "titulo" = EXCLUDED."titulo",
  "conteudo" = EXCLUDED."conteudo",
  "publicado" = EXCLUDED."publicado",
  "ordem" = EXCLUDED."ordem";

UPDATE public."SecaoLanding" SET "ordem" = 4 WHERE "slug" = 'sobre';
UPDATE public."SecaoLanding" SET "ordem" = 5 WHERE "slug" = 'contato';

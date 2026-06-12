INSERT INTO public."ConfiguracaoSistema" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

INSERT INTO public."StatusOrcamento"
  ("codigo","nome","ordem","travaEdicao","reservaEstoque","baixaEstoque","liberaReserva") VALUES
  ('em_digitacao',               'Em digitação',                  1, false, false, false, false),
  ('aguardando_aprovacao',       'Aguardando aprovação',          2, false, false, false, false),
  ('aprovado_aguardando_inicio', 'Aprovado — aguardando início',  3, false, true,  false, false),
  ('em_producao',                'Em produção',                   4, true,  false, false, false),
  ('finalizado',                 'Finalizado',                    5, true,  false, true,  false),
  ('entregue',                   'Entregue',                      6, true,  false, false, false),
  ('cancelado',                  'Cancelado',                     7, true,  false, false, true)
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO public."TipoMovimentacaoEstoque" ("codigo","nome") VALUES
  ('entrada_compra',    'Entrada por compra'),
  ('reserva_orcamento', 'Reserva de orçamento'),
  ('liberacao_reserva','Liberação de reserva'),
  ('saida_orcamento',   'Saída por orçamento'),
  ('ajuste_manual',     'Ajuste manual'),
  ('perda',             'Perda')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO public."ConfiguracaoImpressora" (
  "nome","consumoKwh","precoKwh","valorMaquina","vidaUtilHoras",
  "margemMultiplicador","taxaFalha","taxaMarketplace",
  "custoEmbalagem","custoFrete","custoAcabamento","outrosFixos"
) VALUES (
  'Impressora principal', 0.15, 0.85, 3500, 5000,
  2.5, 0.15, 0, 0, 0, 0, 0
);

INSERT INTO public."SecaoLanding" ("slug","titulo","conteudo","publicado","ordem") VALUES
  ('hero',     'Hero',     '{"titulo":"Impressão 3D sob medida","subtitulo":"Transformamos suas ideias em objetos reais","cta":"Solicitar orçamento"}', true, 1),
  ('servicos', 'Serviços', '{"itens":["Prototipagem","Peças funcionais","Brindes personalizados","Peças sob medida"]}', true, 2),
  ('sobre',    'Sobre',    '{"texto":"A InGift transforma ideias em objetos com impressão 3D de qualidade."}', true, 3),
  ('contato',  'Contato',  '{"whatsapp":"5511999999999","email":"","endereco":""}', true, 4)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO public."ItemPortfolio" ("titulo","descricao","urlImagem","publicado","ordem") VALUES
  ('Porta-lata Monster', 'Peça personalizada em impressão 3D', '/imagens/portfolio-porta-lata.jpg', true, 1),
  ('Produto 01', 'Impressão 3D de alta qualidade', '/imagens/portfolio-01.jpg', true, 2),
  ('Produto 02', 'Prototipagem funcional', '/imagens/portfolio-02.jpg', true, 3),
  ('Produto 03', 'Peça decorativa', '/imagens/portfolio-03.png', true, 4);

-- Após criar usuário no Supabase Auth:
-- UPDATE public."Perfil" SET "ativo"=true, "nomeCompleto"='Admin InGift' WHERE "id"='SEU_UUID';

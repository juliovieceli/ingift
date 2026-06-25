-- Serviços com título + descrição (hover na landing)

UPDATE public."SecaoLanding"
SET "conteudo" = jsonb_build_object(
  'itens', jsonb_build_array(
    jsonb_build_object(
      'titulo', 'Prototipagem',
      'descricao', 'Valide conceitos rapidamente antes de ir para a produção final.'
    ),
    jsonb_build_object(
      'titulo', 'Peças funcionais',
      'descricao', 'Componentes resistentes pensados para uso real no dia a dia.'
    ),
    jsonb_build_object(
      'titulo', 'Brindes personalizados',
      'descricao', 'Presentes únicos com a identidade da sua marca ou ocasião.'
    ),
    jsonb_build_object(
      'titulo', 'Peças sob medida',
      'descricao', 'Soluções 3D desenhadas para medidas e necessidades específicas.'
    )
  )
)
WHERE "slug" = 'servicos';

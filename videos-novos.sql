-- =====================================================================
--  VÍDEOS NOVOS DO SITE (30 vídeos) E NICHOS NOVOS
--
--  ONDE COLAR:
--    1. Abra o seu projeto no Supabase (supabase.com/dashboard).
--    2. No menu da esquerda, clique em "SQL Editor".
--    3. Clique em "New query" (nova consulta).
--    4. Cole este arquivo INTEIRO na caixa e clique no botão verde "Run".
--    5. Deve aparecer "Success. No rows returned". Pronto.
--
--  Antes deste, o banco.sql e o videos-site.sql já devem ter sido rodados.
--
--  O que ele faz:
--    * cadastra os 30 vídeos novos, já com capa (1 nos Destaques e os
--      outros nos nichos Saúde & Fitness, Moda & Acessórios, Aplicativos,
--      Fábrica, Maquiagem e Cabelo). Eles entram no fim de cada linha;
--    * o nicho "Aplicativo" passa a se chamar "Aplicativos" (nos vídeos e
--      na lista de nichos, se você já tiver salvado uma no painel);
--    * vídeo que já existe (mesmo link) NÃO é repetido nem alterado, então
--      pode rodar de novo sem problema e o que você mudou no painel fica.
--
--  Depois, tudo se edita no painel, em "Conteúdo do site".
--  Nunca coloque chave secreta aqui.
-- =====================================================================

do $$
declare
  v_ordem integer;
  r record;
begin
  update public.videos set nicho = 'Aplicativos'
  where exemplo = false and nicho = 'Aplicativo';

  update public.site_conteudo
  set valor = (
        select coalesce(jsonb_agg(case when e->>'nome' = 'Aplicativo'
                                       then jsonb_set(e, '{nome}', '"Aplicativos"')
                                       else e end order by n), '[]'::jsonb)
        from jsonb_array_elements(valor) with ordinality as x(e, n)
      ),
      atualizado_em = now()
  where chave = 'nichos' and jsonb_typeof(valor) = 'array';

  select coalesce(max(ordem), 0) into v_ordem from public.videos where exemplo = false;

  for r in
    select * from (values
        (1,  'iFood',                    'iFood',                    'egbvOmnENko', '',                   'img/capas/ifood-2.webp',                  true),
        (2,  'Muscle Tech',              'Muscle Tech',              'GjKR3mKNHEI', 'Saúde & Fitness',    'img/capas/muscle-tech.webp',              false),
        (3,  'Fly Now',                  'Fly Now',                  '5L9pNHWZQ7U', 'Saúde & Fitness',    'img/capas/fly-now.webp',                  false),
        (4,  'Açaí Doce Caramela',       'Açaí Doce Caramela',       'FxJdz2xrRr8', 'Saúde & Fitness',    'img/capas/acai-doce-caramela.webp',       false),
        (5,  'Big Boom',                 'Big Boom',                 'dqx5E5MooxM', 'Saúde & Fitness',    'img/capas/big-boom.webp',                 false),
        (6,  'Omega 3',                  'Omega 3',                  'chtTe4bbygk', 'Saúde & Fitness',    'img/capas/omega-3.webp',                  false),
        (7,  'C&A',                      'C&A',                      'gat0eZtdayU', 'Moda & Acessórios',  'img/capas/c-a.webp',                      false),
        (8,  'Toda Up',                  'Toda Up',                  '2SHsdj4LjrQ', 'Moda & Acessórios',  'img/capas/toda-up.webp',                  false),
        (9,  'Ipanema',                  'Ipanema',                  'hJoaIJvkuYU', 'Moda & Acessórios',  'img/capas/ipanema.webp',                  false),
        (10, 'Camarim Florido',          'Camarim Florido',          '-4qhRUQP5-M', 'Moda & Acessórios',  'img/capas/camarim-florido.webp',          false),
        (11, 'Honey Be',                 'Honey Be',                 'oL6Fq4snVFA', 'Moda & Acessórios',  'img/capas/honey-be.webp',                 false),
        (12, 'Camarim Florido',          'Camarim Florido',          '_OsJ74ASWPg', 'Moda & Acessórios',  'img/capas/camarim-florido-2.webp',        false),
        (13, 'TotalPass',                'TotalPass',                '0Y5DPKwxa2E', 'Aplicativos',        'img/capas/totalpass.webp',                false),
        (14, '99 Food',                  '99 Food',                  'kOPF5U5v35c', 'Aplicativos',        'img/capas/99-food.webp',                  false),
        (15, 'OLX',                      'OLX',                      'AvUs1sp3OAU', 'Aplicativos',        'img/capas/olx.webp',                      false),
        (16, 'OLX',                      'OLX',                      '1Ad1h2m0SQY', 'Aplicativos',        'img/capas/olx-2.webp',                    false),
        (17, 'Fini',                     'Fini',                     'OWnEObqqwqg', 'Fábrica',            'img/capas/fini.webp',                     false),
        (18, 'Fini',                     'Fini',                     'd2lYYUoft5s', 'Fábrica',            'img/capas/fini-2.webp',                   false),
        (19, 'Sofá na caixa',            'Sofá na caixa',            'Qf0fa4FyJb0', 'Fábrica',            'img/capas/sofa-na-caixa.webp',            false),
        (20, 'Sofá na caixa',            'Sofá na caixa',            '3f2nVFy2EoI', 'Fábrica',            'img/capas/sofa-na-caixa-2.webp',          false),
        (21, 'Fenzza',                   'Fenzza',                   'uHHw9bHV9V0', 'Maquiagem',          'img/capas/fenzza.webp',                   false),
        (22, 'Ruby Kisses',              'Ruby Kisses',              'LzxbMoeU7Ag', 'Maquiagem',          'img/capas/ruby-kisses.webp',              false),
        (23, 'Box Magenta + Boca Rosa',  'Box Magenta + Boca Rosa',  'uug2rAw_6bg', 'Maquiagem',          'img/capas/box-magenta-boca-rosa.webp',    false),
        (24, 'Celina Locks Beauty',      'Celina Locks Beauty',      'Ud2TYJsaYkI', 'Maquiagem',          'img/capas/celina-locks-beauty.webp',      false),
        (25, 'Pudim Beauty',             'Pudim Beauty',             'ZQR3eMt5Z1E', 'Maquiagem',          'img/capas/pudim-beauty.webp',             false),
        (26, 'Vizcaya',                  'Vizcaya',                  '6uoFjhpqMuk', 'Cabelo',             'img/capas/vizcaya.webp',                  false),
        (27, 'Híven',                    'Híven',                    'CWHwqKlQcvE', 'Cabelo',             'img/capas/hiven.webp',                    false),
        (28, 'Pantene',                  'Pantene',                  'joqQGhQ4SdY', 'Cabelo',             'img/capas/pantene-2.webp',                false),
        (29, 'Amar Biquínis',            'Amar Biquínis',            'AylWWVBZ7go', 'Cabelo',             'img/capas/amar-biquinis.webp',            false),
        (30, 'Skala',                    'Skala',                    '-bcptTQtnkQ', 'Cabelo',             'img/capas/skala.webp',                    false)
    ) as t (ordem, marca, titulo, codigo, nicho, capa, em_destaques)
    order by ordem
  loop
    if not exists (select 1 from public.videos v where v.exemplo = false and v.link like '%' || r.codigo || '%') then
      insert into public.videos (titulo, link, nicho, formato, marca, destaque, capa, em_destaques, ordem, visivel, exemplo)
      values (r.titulo, 'https://youtube.com/shorts/' || r.codigo, r.nicho, 'Vídeo 9:16', r.marca,
              '', r.capa, r.em_destaques, v_ordem + r.ordem, true, false);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';

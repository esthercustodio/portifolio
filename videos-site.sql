-- =====================================================================
--  VÍDEOS DO SITE: TOCAR NA PRÓPRIA PÁGINA, NICHOS, DESTAQUES E CAPAS
--
--  ONDE COLAR:
--    1. Abra o seu projeto no Supabase (supabase.com/dashboard).
--    2. No menu da esquerda, clique em "SQL Editor".
--    3. Clique em "New query" (nova consulta).
--    4. Cole este arquivo INTEIRO na caixa e clique no botão verde "Run".
--    5. Deve aparecer "Success. No rows returned". Pronto.
--
--  Antes deste, o banco.sql já deve ter sido rodado.
--
--  O que ele faz:
--    * acrescenta 2 campos na tabela "videos": "capa" (o endereço da imagem
--      de capa; vazio usa um momento do próprio vídeo) e "em_destaques"
--      (a caixinha que põe o vídeo no carrossel de Destaques do site);
--    * atualiza a "vitrine" do site (função videos_do_site) para entregar
--      esses dois campos. A tabela continua trancada: o site só vê os
--      vídeos marcados para aparecer;
--    * na primeira vez que rodar, cadastra os seus 15 vídeos do YouTube
--      (3 nos Destaques e os outros por nicho: Cabelo, Skincare, Maquiagem e
--      Aplicativo), já com capa. Se algum já existir pelo link, ele só é
--      atualizado. Depois disso, tudo se edita no painel, em
--      "Conteúdo do site". Rodar de novo NÃO refaz o cadastro, então o que
--      você mudar no painel não volta ao que era.
--
--  Nunca coloque chave secreta aqui.
-- =====================================================================


-- =====================================================================
--  BLOCO 1: OS CAMPOS NOVOS E O CADASTRO DOS 15 VÍDEOS (roda uma vez só)
-- =====================================================================
do $$
declare
  v_primeira_vez boolean;
  v_id uuid;
  r record;
begin
  v_primeira_vez := not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'videos' and column_name = 'em_destaques'
  );

  alter table public.videos add column if not exists capa text;
  alter table public.videos add column if not exists em_destaques boolean not null default false;

  if v_primeira_vez then
    for r in
      select * from (values
        (1,  'Maxton',               'Maxton',               'GYgeB-XAij8', '',           '190 mil visualizações', 'img/capas/maxton.webp',             true),
        (2,  'Pantene',              'Pantene',              'LP1pZtUuFn8', '',           'Roteiro Criativo',      'img/capas/pantene.webp',            true),
        (3,  'L''Oréal Paris',       'Protetor solar',       '9OuYjMHHYOw', '',           '36 mil visualizações',  'img/capas/loreal-protetor.webp',    true),
        (4,  'Rildy',                'Rildy',                '4-styHGm9jk', 'Cabelo',     '',                      'img/capas/rildy.webp',              false),
        (5,  'Dabelle',              'Dabelle',              '4j38U8fWZCs', 'Cabelo',     '',                      'img/capas/dabelle.webp',            false),
        (6,  'Rohto',                'Rohto',                '5EIKLLxBqcQ', 'Skincare',   '',                      'img/capas/rohto.webp',              false),
        (7,  'Creamy',               'Olheira',              'B5byimjdoZc', 'Skincare',   '',                      'img/capas/creamy-olheira.webp',     false),
        (8,  'Creamy',               'Emulsão de limpeza',   'y84PadXZ1NQ', 'Skincare',   '',                      'img/capas/creamy-emulsao.webp',     false),
        (9,  'Celina Locks Beauty',  'Celina Locks Beauty',  'Gno9DLhuRVU', 'Skincare',   '',                      'img/capas/celina-locks.webp',       false),
        (10, 'Hidrabene',            'Protetor',             '_aBO9JXqb1M', 'Skincare',   '',                      'img/capas/hidrabene-protetor.webp', false),
        (11, 'Hidrabene',            'Rotina completa',      'Qy3aW0LeY3I', 'Skincare',   '',                      'img/capas/hidrabene-rotina.webp',   false),
        (12, 'Petrizi',              'Petrizi',              'JugPCSsmG_E', 'Maquiagem',  '',                      'img/capas/petrizi.webp',            false),
        (13, '99 Food',              '99 Food',              'eZYKw-aAPQg', 'Aplicativo', '',                      'img/capas/99food.webp',             false),
        (14, 'iFood',                'iFood',                'twn0qIEjCLw', 'Aplicativo', '',                      'img/capas/ifood.webp',              false),
        (15, 'Canva',                'Anúncio no Pinterest', 'SsdtQwTMg0M', 'Aplicativo', '',                      'img/capas/canva.webp',              false)
      ) as t (ordem, marca, titulo, codigo, nicho, destaque, capa, em_destaques)
      order by ordem
    loop
      select v.id into v_id from public.videos v
      where v.exemplo = false and v.link like '%' || r.codigo || '%'
      order by v.criado_em limit 1;

      if v_id is null then
        insert into public.videos (titulo, link, nicho, formato, marca, destaque, capa, em_destaques, ordem, visivel, exemplo)
        values (r.titulo, 'https://youtube.com/shorts/' || r.codigo, r.nicho, 'Vídeo 9:16', r.marca,
                r.destaque, r.capa, r.em_destaques, r.ordem, true, false);
      else
        update public.videos
        set titulo = r.titulo, link = 'https://youtube.com/shorts/' || r.codigo, nicho = r.nicho, formato = 'Vídeo 9:16',
            marca = r.marca, destaque = r.destaque, capa = r.capa, em_destaques = r.em_destaques,
            ordem = r.ordem, visivel = true
        where id = v_id;
      end if;
    end loop;
  end if;
end;
$$;


-- =====================================================================
--  BLOCO 2: A VITRINE DO SITE (agora com capa e destaques)
--  Igual à de antes: só entrega vídeos marcados para aparecer, nunca as
--  linhas de exemplo, e só as colunas públicas.
-- =====================================================================
drop function if exists public.videos_do_site();

create function public.videos_do_site()
returns table (
  id           uuid,
  titulo       text,
  link         text,
  nicho        text,
  formato      text,
  marca        text,
  destaque     text,
  ordem        integer,
  capa         text,
  em_destaques boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.titulo, v.link, v.nicho, v.formato, v.marca, v.destaque, v.ordem, v.capa, v.em_destaques
  from public.videos v
  where v.visivel = true and v.exemplo = false
  order by v.ordem, v.criado_em;
$$;

revoke all on function public.videos_do_site() from public;
grant execute on function public.videos_do_site() to anon, authenticated;

notify pgrst, 'reload schema';

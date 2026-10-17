-- =====================================================================
--  VÍDEOS ASSISTIDOS: qual vídeo foi aberto, por quanto tempo e de qual nicho
--
--  ONDE COLAR:
--    1. Abra o seu projeto no Supabase (supabase.com/dashboard).
--    2. No menu da esquerda, clique em "SQL Editor".
--    3. Clique em "New query" (nova consulta).
--    4. Cole este arquivo INTEIRO na caixa e clique no botão verde "Run".
--    5. Deve aparecer "Success. No rows returned". Pronto.
--
--  O que ele faz:
--    * acrescenta campos na tabela "visitas" para guardar, cada vez que
--      alguém abre um vídeo no site: qual vídeo, o nicho, quantos segundos
--      a pessoa assistiu e a duração do vídeo. As visitas normais continuam
--      iguais (tipo "visita"); os vídeos ficam com tipo "video";
--    * a tranca continua a mesma: o site só pode INSERIR em visitas (é a
--      mesma exceção de sempre) e nunca ler. Só você, logada, vê os dados;
--    * não guarda nome, e-mail nem nenhum dado pessoal de quem assistiu.
--
--  Pode rodar de novo sem problema. Nunca coloque chave secreta aqui.
-- =====================================================================

alter table public.visitas add column if not exists tipo text not null default 'visita';
alter table public.visitas add column if not exists video_id uuid;
alter table public.visitas add column if not exists video_codigo text;
alter table public.visitas add column if not exists video_nome text;
alter table public.visitas add column if not exists video_nicho text;
alter table public.visitas add column if not exists segundos integer;
alter table public.visitas add column if not exists duracao integer;

create index if not exists visitas_tipo_data_idx on public.visitas (tipo, data);

-- A exceção do site continua só de INSERIR, agora com limites para os campos novos
drop policy if exists "site_registra_visita" on public.visitas;
create policy "site_registra_visita" on public.visitas
  for insert to anon
  with check (
    length(coalesce(pagina, '')) <= 200
    and length(coalesce(origem, '')) <= 100
    and tipo in ('visita', 'video')
    and length(coalesce(video_codigo, '')) <= 20
    and length(coalesce(video_nome, '')) <= 160
    and length(coalesce(video_nicho, '')) <= 80
    and coalesce(segundos, 0) between 0 and 7200
    and coalesce(duracao, 0) between 0 and 7200
  );

notify pgrst, 'reload schema';

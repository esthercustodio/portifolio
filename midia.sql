-- =====================================================================
--  ENVIO DE FOTOS E ÁUDIOS PELO PAINEL
--
--  ONDE COLAR:
--    1. Abra o seu projeto no Supabase (supabase.com/dashboard).
--    2. No menu da esquerda, clique em "SQL Editor".
--    3. Clique em "New query" (nova consulta).
--    4. Cole este arquivo INTEIRO na caixa e clique no botão verde "Run".
--    5. Deve aparecer "Success. No rows returned". Pronto.
--
--  Antes deste, o banco.sql já deve ter sido rodado (ele cria a função
--  eh_esther, que diz quem é você).
--
--  O que ele faz:
--    * cria a pasta de arquivos "midia" no Supabase Storage, onde ficam as
--      fotos e os áudios que você envia pelo painel (capa, sobre, logos,
--      capas de vídeo, áudio de feedback);
--    * os arquivos dessa pasta são PÚBLICOS para ver (o site precisa mostrar
--      as fotos e tocar os áudios para qualquer visitante), como qualquer
--      foto do site;
--    * só você, logada no painel, pode enviar, trocar, listar ou apagar
--      arquivos. Visitante não envia nada e não vê a lista de arquivos;
--    * limite de 25 MB por arquivo, só imagens (JPG, PNG, WebP, GIF) e
--      áudios (MP3, M4A, AAC, WAV, OGG, WebM).
--
--  Pode rodar de novo sem problema. Nunca coloque chave secreta aqui.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'midia', 'midia', true, 26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
        'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "midia_esther_ve" on storage.objects;
create policy "midia_esther_ve" on storage.objects
  for select to authenticated
  using (bucket_id = 'midia' and public.eh_esther());

drop policy if exists "midia_esther_envia" on storage.objects;
create policy "midia_esther_envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'midia' and public.eh_esther());

drop policy if exists "midia_esther_troca" on storage.objects;
create policy "midia_esther_troca" on storage.objects
  for update to authenticated
  using (bucket_id = 'midia' and public.eh_esther())
  with check (bucket_id = 'midia' and public.eh_esther());

drop policy if exists "midia_esther_apaga" on storage.objects;
create policy "midia_esther_apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'midia' and public.eh_esther());

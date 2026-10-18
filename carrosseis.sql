-- =====================================================================
--  CARROSSÉIS: onde ficam guardados os carrosséis criados no painel
--
--  ONDE COLAR:
--    1. Abra o seu projeto no Supabase (supabase.com/dashboard).
--    2. No menu da esquerda, clique em "SQL Editor".
--    3. Clique em "New query" (nova consulta).
--    4. Cole este arquivo INTEIRO na caixa e clique no botão verde "Run".
--    5. Deve aparecer "Success. No rows returned". Pronto.
--
--  O que ele faz:
--    * cria a tabela "carrosseis" (título, o pedido que você escreveu e os
--      slides com todos os ajustes de tamanho, cor e letra);
--    * tranca igual às outras: só você, logada no painel, lê e grava.
--      Ninguém de fora vê nada, e o site não tem acesso a ela.
--
--  Antes deste, o banco.sql já deve ter sido rodado (ele cria a função
--  eh_esther, que diz quem é você). Pode rodar de novo sem problema.
--  Nunca coloque chave secreta aqui.
-- =====================================================================

create table if not exists public.carrosseis (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null default 'Carrossel sem título',
  comando        text,
  dados          jsonb not null default '{}'::jsonb,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

alter table public.carrosseis enable row level security;

revoke all on public.carrosseis from anon;
grant select, insert, update, delete on public.carrosseis to authenticated;

drop policy if exists "so_esther" on public.carrosseis;
create policy "so_esther" on public.carrosseis
  for all to authenticated
  using (public.eh_esther()) with check (public.eh_esther());

notify pgrst, 'reload schema';

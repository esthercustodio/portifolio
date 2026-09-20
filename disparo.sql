-- =====================================================================
--  DISPARO: A ABA PROSPECÇÃO (E-MAILS PARA AS MARCAS)
--
--  ONDE COLAR:
--    1. Abra o seu projeto no Supabase (supabase.com/dashboard).
--    2. No menu da esquerda, clique em "SQL Editor".
--    3. Clique em "New query" (nova consulta).
--    4. Cole este arquivo INTEIRO na caixa e clique no botão verde "Run".
--    5. Deve aparecer "Success. No rows returned". Pronto.
--
--  Antes deste, o banco.sql e o banco-2.sql já devem ter sido rodados.
--  Este arquivo já inclui o que o banco-3.sql faz (nicho e favorita), então
--  se você ainda não rodou o banco-3.sql, não precisa: este basta.
--
--  O que ele faz:
--    * acrescenta 3 campos na tabela "marcas": nicho, favorita e selecionada
--      (não apaga nada e as marcas que você já tem ficam como estão);
--    * cria a tabela "email_envios": uma linha para cada e-mail enviado ou
--      que deu erro (é o seu registro de quem recebeu e quem não recebeu);
--    * cria a tabela "email_optout": quem pediu para não receber mais;
--    * tranca as duas tabelas novas: só você, logada, lê e escreve.
--
--  Pode rodar de novo sem medo: não apaga nem duplica nada.
--  Nunca coloque chave secreta aqui. A chave do Resend NÃO vem para este
--  arquivo: ela fica guardada como segredo da função, no painel do Supabase.
-- =====================================================================


-- =====================================================================
--  BLOCO 1: OS CAMPOS NOVOS NA TABELA DE MARCAS
--    nicho       o assunto da marca (exemplo: cabelo, skincare, app)
--    favorita    a estrela da aba Marcas
--    selecionada a caixinha da aba Marcas: as marcas que você escolheu a
--                dedo para receber o próximo e-mail. Fica salva aqui, então
--                você marca hoje e dispara amanhã sem perder a escolha.
--  As marcas que você já tem ficam sem nicho, sem estrela e sem seleção.
-- =====================================================================
alter table public.marcas add column if not exists nicho       text;
alter table public.marcas add column if not exists favorita    boolean not null default false;
alter table public.marcas add column if not exists selecionada boolean not null default false;


-- =====================================================================
--  BLOCO 2: O REGISTRO DE ENVIOS (email_envios)
--  Uma linha por destinatário. Sem isso, quando um disparo para no meio,
--  não há como saber quem recebeu e quem não recebeu.
--    status    "ok" (o Resend aceitou) ou "erro" (deu problema)
--    erro      o motivo, quando deu erro
--    resend_id o número que o Resend devolve para cada e-mail
--    canal     "resend" (pelo carteiro), "gmail" (modo rascunho, você mesma
--              clicou em enviar) ou "teste" (o teste para o seu e-mail)
--    marca_id  a marca da sua aba Marcas (se a marca for apagada, a linha
--              do registro continua, só perde a ligação)
-- =====================================================================
create table if not exists public.email_envios (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  assunto     text not null,
  status      text not null check (status in ('ok', 'erro')),
  erro        text,
  resend_id   text,
  canal       text not null default 'resend' check (canal in ('resend', 'gmail', 'teste')),
  marca_id    uuid references public.marcas (id) on delete set null,
  criado_em   timestamptz not null default now()
);

create index if not exists email_envios_email_idx  on public.email_envios (lower(email));
create index if not exists email_envios_criado_idx on public.email_envios (criado_em desc);


-- =====================================================================
--  BLOCO 3: OS DESCADASTRADOS (email_optout)
--  Quem respondeu SAIR entra aqui e nunca mais recebe, em disparo nenhum.
--  O e-mail é guardado sempre em letras minúsculas.
-- =====================================================================
create table if not exists public.email_optout (
  email      text primary key check (email = lower(email)),
  criado_em  timestamptz not null default now()
);


-- =====================================================================
--  BLOCO 4: A TRANCA DAS DUAS TABELAS NOVAS
--  Igual às outras tabelas: só a Esther logada lê, cria, muda e apaga.
--  Quem está deslogado não enxerga nada aqui.
-- =====================================================================
alter table public.email_envios enable row level security;
alter table public.email_optout enable row level security;

revoke all on public.email_envios, public.email_optout from anon;
grant select, insert, update, delete on public.email_envios, public.email_optout to authenticated;

drop policy if exists "so_esther" on public.email_envios;
create policy "so_esther" on public.email_envios
  for all to authenticated
  using (public.eh_esther()) with check (public.eh_esther());

drop policy if exists "so_esther" on public.email_optout;
create policy "so_esther" on public.email_optout
  for all to authenticated
  using (public.eh_esther()) with check (public.eh_esther());


-- =====================================================================
--  BLOCO 5: A TRANCA DO FORMULÁRIO DO SITE (reforçada)
--  Continua igual à do banco.sql: qualquer pessoa pode só ENVIAR um contato
--  como "lead". Agora ela também não consegue se colocar como favorita nem
--  como selecionada, nem mandar um nicho gigante pelo formulário.
--  Quem está deslogado continua sem conseguir LER nada.
-- =====================================================================
drop policy if exists "site_envia_contato" on public.marcas;
create policy "site_envia_contato" on public.marcas
  for insert to anon
  with check (
    situacao = 'lead'
    and exemplo = false
    and favorita = false
    and selecionada = false
    and length(coalesce(nome, ''))      between 1 and 200
    and length(coalesce(email, ''))     <= 200
    and length(coalesce(instagram, '')) <= 100
    and length(coalesce(telefone, ''))  <= 40
    and length(coalesce(obs, ''))       <= 3000
    and length(coalesce(nicho, ''))     <= 100
  );


-- Avisa o Supabase para reconhecer as tabelas e os campos novos na hora.
notify pgrst, 'reload schema';


-- =====================================================================
--  TESTE DA TRANCA (opcional)
--  NÃO rode este bloco junto com o resto. Depois de rodar tudo acima com
--  sucesso, apague o conteúdo da caixa, cole UM teste por vez e clique Run.
--  O "rollback" no final desfaz tudo: nada fica gravado.
--
--  TESTE 4A: uma pessoa deslogada tenta LER o registro de envios.
--            Resultado esperado: ERRO "permission denied for table email_envios".
--            (Erro aqui é BOM: quer dizer que a porta está trancada.)
--
--      begin;
--      set local role anon;
--      select count(*) from public.email_envios;
--      rollback;
--
--  TESTE 4B: uma pessoa deslogada tenta se tirar da lista de descadastro
--            ou escrever nela.
--            Resultado esperado: ERRO "permission denied for table email_optout".
--
--      begin;
--      set local role anon;
--      insert into public.email_optout (email) values ('invasor@exemplo.com');
--      rollback;
--
--  TESTE 4C: uma pessoa deslogada tenta entrar pelo formulário já como selecionada.
--            Resultado esperado: ERRO "new row violates row-level security policy".
--
--      begin;
--      set local role anon;
--      insert into public.marcas (nome, situacao, selecionada) values ('Golpe', 'lead', true);
--      rollback;
--
--  TESTE 4D: o formulário normal do site continua funcionando.
--            Resultado esperado: sem erro.
--
--      begin;
--      set local role anon;
--      insert into public.marcas (nome, situacao) values ('Teste do formulario', 'lead');
--      rollback;
-- =====================================================================

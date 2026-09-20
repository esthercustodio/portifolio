-- =====================================================================
--  BANCO DO PORTFÓLIO DA ESTHER CUSTÓDIO
--
--  ONDE COLAR:
--    1. Abra o seu projeto no Supabase (supabase.com/dashboard).
--    2. No menu da esquerda, clique em "SQL Editor".
--    3. Clique em "New query" (nova consulta).
--    4. Cole este arquivo INTEIRO na caixa e clique no botão verde "Run".
--    5. Deve aparecer "Success. No rows returned". Pronto.
--
--  Pode rodar de novo quantas vezes quiser: nada é apagado nem duplicado.
--  Nunca coloque chave secreta aqui. Este arquivo só tem o e-mail do login.
-- =====================================================================


-- =====================================================================
--  BLOCO 1: QUEM É VOCÊ
--  Uma pequena função que responde "quem está logado é a Esther?".
--  Todas as trancas abaixo usam ela. Se um dia você mudar de e-mail,
--  troque só o e-mail dentro dela.
-- =====================================================================
create or replace function public.eh_esther()
returns boolean
language sql
stable
as $$
  select coalesce(lower(auth.jwt() ->> 'email') = 'contatoesthercustodio@gmail.com', false);
$$;


-- =====================================================================
--  BLOCO 2: AS TABELAS (as "planilhas" onde ficam os seus dados)
--  A coluna "exemplo" marca a linha de exemplo, que você pode apagar.
-- =====================================================================

-- Vídeos do portfólio (é o que aparece no site)
create table if not exists public.videos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  link       text,
  nicho      text,
  formato    text,
  marca      text,
  destaque   text,                          -- ex: "2,4M views". Se preencher, vai para os destaques do site
  ordem      integer not null default 0,    -- posição na lista (o admin muda quando você arrasta)
  visivel    boolean not null default true, -- o olhinho: aparece ou não no site
  exemplo    boolean not null default false,
  criado_em  timestamptz not null default now()
);

-- Marcas (a sua base de contatos de empresas)
create table if not exists public.marcas (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  instagram       text,
  email           text,
  telefone        text,
  situacao        text not null default 'lead'
                  check (situacao in ('lead', 'conversando', 'cliente', 'parada')),
  obs             text,
  ultimo_contato  date,
  exemplo         boolean not null default false,
  criado_em       timestamptz not null default now()
);

-- Calendário (gravar, editar, postar)
create table if not exists public.calendario (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  marca      text,
  tipo       text not null default 'gravar'
             check (tipo in ('gravar', 'editar', 'postar')),
  data       date not null,
  status     text not null default 'a fazer'
             check (status in ('a fazer', 'feito')),
  exemplo    boolean not null default false,
  criado_em  timestamptz not null default now()
);

-- Campanhas (o seu controle de trabalhos e pagamentos)
create table if not exists public.campanhas (
  id          uuid primary key default gen_random_uuid(),
  campanha    text not null,
  cliente     text,
  tipo        text not null default 'Conteúdo'
              check (tipo in ('Conteúdo', 'Publicidade')),
  status      text not null default 'Briefing'
              check (status in ('Briefing', 'Roteiro', 'Aprovação Roteiro', 'Gravação', 'Edição', 'Aprovado', 'Entregue')),
  qtd         integer not null default 0 check (qtd >= 0),
  valor       numeric(12, 2) not null default 0 check (valor >= 0),
  prazo       date,
  pagamento   text not null default 'pendente'
              check (pagamento in ('pendente', 'pago')),
  ativa       boolean not null default true,
  favorita    boolean not null default false,
  exemplo     boolean not null default false,
  criado_em   timestamptz not null default now()
);

-- Marcados (o que você já marcou no checklist; a "chave" é um texto que identifica o item)
create table if not exists public.marcados (
  chave          text primary key,
  marcado        boolean not null default true,
  atualizado_em  timestamptz not null default now()
);

-- Visitas (uma linha para cada pessoa que abre o seu portfólio; não guarda nada pessoal)
create table if not exists public.visitas (
  id      bigint generated always as identity primary key,
  data    timestamptz not null default now(),
  pagina  text,
  origem  text                               -- de onde a pessoa veio (Instagram, Google, direto...)
);
create index if not exists visitas_data_idx on public.visitas (data);


-- =====================================================================
--  BLOCO 3: A TRANCA (RLS = Row Level Security)
--  Liga a tranca em TODAS as tabelas. Com a tranca ligada e sem nenhuma
--  regra, ninguém entra. Depois liberamos só o que precisa.
-- =====================================================================
alter table public.videos     enable row level security;
alter table public.marcas     enable row level security;
alter table public.calendario enable row level security;
alter table public.campanhas  enable row level security;
alter table public.marcados   enable row level security;
alter table public.visitas    enable row level security;


-- =====================================================================
--  BLOCO 4: PERMISSÕES BÁSICAS
--  Primeiro tira tudo de quem está deslogado ("anon"). Depois devolve
--  só o mínimo: enviar (INSERT) contatos em "marcas" e visitas em "visitas".
--  Quem está logado ("authenticated") recebe as permissões, mas a regra
--  do bloco 5 só deixa passar a Esther.
-- =====================================================================
revoke all on public.videos, public.marcas, public.calendario,
              public.campanhas, public.marcados, public.visitas from anon;

grant insert on public.marcas, public.visitas to anon;

grant select, insert, update, delete on public.videos, public.marcas, public.calendario,
              public.campanhas, public.marcados, public.visitas to authenticated;


-- =====================================================================
--  BLOCO 5: AS REGRAS DA TRANCA
-- =====================================================================

-- 5a) Só a Esther logada lê, cria, muda e apaga. Em todas as 6 tabelas.
drop policy if exists "so_esther" on public.videos;
create policy "so_esther" on public.videos
  for all to authenticated
  using (public.eh_esther()) with check (public.eh_esther());

drop policy if exists "so_esther" on public.marcas;
create policy "so_esther" on public.marcas
  for all to authenticated
  using (public.eh_esther()) with check (public.eh_esther());

drop policy if exists "so_esther" on public.calendario;
create policy "so_esther" on public.calendario
  for all to authenticated
  using (public.eh_esther()) with check (public.eh_esther());

drop policy if exists "so_esther" on public.campanhas;
create policy "so_esther" on public.campanhas
  for all to authenticated
  using (public.eh_esther()) with check (public.eh_esther());

drop policy if exists "so_esther" on public.marcados;
create policy "so_esther" on public.marcados
  for all to authenticated
  using (public.eh_esther()) with check (public.eh_esther());

drop policy if exists "so_esther" on public.visitas;
create policy "so_esther" on public.visitas
  for all to authenticated
  using (public.eh_esther()) with check (public.eh_esther());

-- 5b) EXCEÇÃO 1: qualquer pessoa pode ENVIAR um contato pelo formulário do site.
--     Só pode entrar como "lead", com tamanhos razoáveis (evita lixo e abuso).
--     Ela NÃO consegue ler nada: só deixar o recado.
drop policy if exists "site_envia_contato" on public.marcas;
create policy "site_envia_contato" on public.marcas
  for insert to anon
  with check (
    situacao = 'lead'
    and exemplo = false
    and length(coalesce(nome, ''))      between 1 and 200
    and length(coalesce(email, ''))     <= 200
    and length(coalesce(instagram, '')) <= 100
    and length(coalesce(telefone, ''))  <= 40
    and length(coalesce(obs, ''))       <= 3000
  );

-- 5c) EXCEÇÃO 2: o site pode REGISTRAR uma visita (só inserir, nunca ler).
drop policy if exists "site_registra_visita" on public.visitas;
create policy "site_registra_visita" on public.visitas
  for insert to anon
  with check (
    length(coalesce(pagina, '')) <= 200
    and length(coalesce(origem, '')) <= 100
  );


-- =====================================================================
--  BLOCO 6: A VITRINE DO SITE
--  O portfólio precisa MOSTRAR seus vídeos para qualquer visitante, mas
--  as tabelas ficam trancadas. Solução: esta função devolve SÓ os vídeos
--  marcados como visíveis (o mesmo que já aparece no site), só as colunas
--  públicas, e nunca as linhas de exemplo. A tabela em si continua trancada.
-- =====================================================================
create or replace function public.videos_do_site()
returns table (
  id       uuid,
  titulo   text,
  link     text,
  nicho    text,
  formato  text,
  marca    text,
  destaque text,
  ordem    integer
)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.titulo, v.link, v.nicho, v.formato, v.marca, v.destaque, v.ordem
  from public.videos v
  where v.visivel = true and v.exemplo = false
  order by v.ordem, v.criado_em;
$$;

revoke all on function public.videos_do_site() from public;
grant execute on function public.videos_do_site() to anon, authenticated;


-- =====================================================================
--  BLOCO 7: UMA LINHA DE EXEMPLO EM CADA LISTA
--  Só para você entender o formato. Aparecem com a etiqueta "EXEMPLO" no
--  admin, não contam nos números e não aparecem no site. Apague quando quiser.
-- =====================================================================
insert into public.videos (titulo, link, nicho, formato, marca, destaque, ordem, visivel, exemplo)
select 'Exemplo: vídeo de rotina de skincare', 'https://exemplo.com/video', 'Skincare',
       'Vídeo 9:16', 'Marca de exemplo', '2,4M views', 0, false, true
where not exists (select 1 from public.videos where exemplo);

insert into public.marcas (nome, instagram, email, telefone, situacao, obs, ultimo_contato, exemplo)
select 'Marca de exemplo', '@marcadeexemplo', 'contato@exemplo.com', '(11) 90000-0000',
       'lead', 'Linha de exemplo. Pode apagar.', current_date, true
where not exists (select 1 from public.marcas where exemplo);

insert into public.calendario (titulo, marca, tipo, data, status, exemplo)
select 'Exemplo: gravar unboxing', 'Marca de exemplo', 'gravar', current_date, 'a fazer', true
where not exists (select 1 from public.calendario where exemplo);

insert into public.campanhas (campanha, cliente, tipo, status, qtd, valor, prazo, pagamento, ativa, favorita, exemplo)
select 'Exemplo: campanha de lançamento', 'Marca de exemplo', 'Conteúdo', 'Briefing', 3, 1500,
       current_date + 7, 'pendente', true, false, true
where not exists (select 1 from public.campanhas where exemplo);

-- O vídeo de destaque que já estava no seu site (é seu, não é exemplo).
-- Troque o título, o nicho e a marca depois, direto no admin.
insert into public.videos (titulo, link, formato, destaque, ordem, visivel)
select 'Título do conteúdo 01', 'https://youtube.com/shorts/GYgeB-XAij8?is=fWOY9J7G4Q6OeR-u',
       'Vídeo 9:16', '+189 mil views no YouTube Shorts', 1, true
where not exists (select 1 from public.videos where link like '%GYgeB-XAij8%');


-- Avisa o Supabase para reconhecer as tabelas novas na hora.
notify pgrst, 'reload schema';


-- =====================================================================
--  TESTE DA TRANCA (opcional, mas recomendado)
--  NÃO rode este bloco junto com o resto. Depois de rodar tudo acima com
--  sucesso, apague o conteúdo da caixa, cole UM teste por vez e clique Run.
--  Cada teste só "finge" ser outra pessoa por um instante e desfaz tudo
--  (o "rollback" no final). Nada fica gravado.
--
--  TESTE A: uma pessoa deslogada tenta LER as marcas.
--           Resultado esperado: ERRO "permission denied for table marcas".
--           (Erro aqui é BOM: quer dizer que a porta está trancada.)
--           Se aparecer um número ou uma lista, a tranca FALHOU.
--
--      begin;
--      set local role anon;
--      select count(*) from public.marcas;
--      rollback;
--
--  TESTE B: uma pessoa deslogada DEIXA um contato (é o que o formulário do site faz).
--           Resultado esperado: funciona, sem erro (o rollback desfaz em seguida).
--
--      begin;
--      set local role anon;
--      insert into public.marcas (nome, situacao) values ('Teste do formulario', 'lead');
--      rollback;
--
--  TESTE C: uma pessoa deslogada tenta ESCREVER no seu calendário.
--           Resultado esperado: ERRO "permission denied for table calendario".
--
--      begin;
--      set local role anon;
--      insert into public.calendario (titulo, data) values ('Invasor', current_date);
--      rollback;
--
--  TESTE D: uma pessoa deslogada tenta entrar como se já fosse "cliente".
--           Resultado esperado: ERRO "new row violates row-level security policy".
--           (O formulário do site só pode criar "lead".)
--
--      begin;
--      set local role anon;
--      insert into public.marcas (nome, situacao) values ('Golpe', 'cliente');
--      rollback;
--
--  TESTE E: alguém LOGADO com OUTRO e-mail tenta ler as marcas.
--           Resultado esperado: 0 (a tranca só abre para o seu e-mail).
--
--      begin;
--      set local role authenticated;
--      select set_config('request.jwt.claims', '{"email":"outra@pessoa.com"}', true);
--      select count(*) as marcas_que_outro_usuario_enxerga from public.marcas;
--      rollback;
--
--  TESTE F: você (o seu e-mail) lendo as marcas.
--           Resultado esperado: 1 ou mais (a linha de exemplo já conta).
--
--      begin;
--      set local role authenticated;
--      select set_config('request.jwt.claims', '{"email":"contatoesthercustodio@gmail.com"}', true);
--      select count(*) as marcas_que_a_esther_enxerga from public.marcas;
--      rollback;
--
--  TESTE G (o mais fácil, sem SQL): abra este endereço numa janela do navegador:
--
--      https://dhqnfqpasuterxedplyb.supabase.co/rest/v1/marcas?select=*&apikey=sb_publishable_KdWy9cPW08pbW6BYwXiolA_eRQnbB_V
--
--           Resultado esperado: uma mensagem com "permission denied for table marcas".
--           Se aparecer uma lista com nomes de marcas, a tranca FALHOU: me chame.
--           (Essa é a mesma chave pública que qualquer visitante do site tem.)
-- =====================================================================

-- =====================================================================
--  CONTATO DO SITE: MENSAGENS NA ABA PORTFÓLIO + LEAD SEM REPETIR MARCA
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
--    * cria a tabela "mensagens_site": guarda cada mensagem do formulário do
--      site (nome, e-mail, marca, orçamento e o texto) para você ler na aba
--      Portfólio e responder. Só você, logada, consegue ler;
--    * cria a função "enviar_contato", que o formulário do site usa. Ela guarda
--      a mensagem e também cria a marca na aba Marcas como Lead, no mesmo
--      padrão de sempre. Se a marca já existir na aba Marcas (mesmo e-mail, ou
--      mesmo nome), ela NÃO cria de novo e NÃO mexe na marca que já está lá:
--      a mensagem aparece só na aba Portfólio.
--
--  Pode rodar de novo sem medo: não apaga nem duplica nada.
--  Nunca coloque chave secreta aqui.
-- =====================================================================


-- =====================================================================
--  BLOCO 1: A TABELA DAS MENSAGENS (mensagens_site)
--    tipo      "mensagem" (formulário de contato) ou "kit" (pediu o mídia kit)
--    marca_id  a marca da aba Marcas ligada a esta mensagem (se a marca for
--              apagada, a mensagem continua, só perde a ligação)
-- =====================================================================
create table if not exists public.mensagens_site (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null default 'mensagem' check (tipo in ('mensagem', 'kit')),
  nome       text not null,
  email      text,
  marca      text,
  orcamento  text,
  mensagem   text,
  marca_id   uuid references public.marcas (id) on delete set null,
  criado_em  timestamptz not null default now()
);

create index if not exists mensagens_site_criado_idx on public.mensagens_site (criado_em desc);


-- =====================================================================
--  BLOCO 2: A TRANCA
--  Igual às outras tabelas: só a Esther logada lê, cria, muda e apaga.
--  Quem está deslogado não enxerga nada aqui. O site só consegue "deixar o
--  recado" pela função do bloco 3, nunca ler.
-- =====================================================================
alter table public.mensagens_site enable row level security;

revoke all on public.mensagens_site from anon;
grant select, insert, update, delete on public.mensagens_site to authenticated;

drop policy if exists "so_esther" on public.mensagens_site;
create policy "so_esther" on public.mensagens_site
  for all to authenticated
  using (public.eh_esther()) with check (public.eh_esther());


-- =====================================================================
--  BLOCO 3: A FUNÇÃO QUE O FORMULÁRIO DO SITE USA
--  1. guarda a mensagem em "mensagens_site";
--  2. procura a marca na aba Marcas (mesmo e-mail, ou mesmo nome);
--  3. se NÃO achar, cria a marca como Lead (nome = marca/empresa, ou o nome
--     da pessoa se ela não escreveu a marca; observação no padrão de sempre);
--  4. se achar, não muda nada nela.
--  Os tamanhos são limitados para evitar lixo e abuso.
-- =====================================================================
create or replace function public.enviar_contato(
  p_nome      text,
  p_email     text,
  p_marca     text,
  p_orcamento text,
  p_mensagem  text,
  p_tipo      text default 'mensagem'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome  text := left(btrim(coalesce(p_nome, '')), 200);
  v_email text := left(btrim(coalesce(p_email, '')), 200);
  v_marca text := left(btrim(coalesce(p_marca, '')), 200);
  v_orc   text := left(btrim(coalesce(p_orcamento, '')), 100);
  v_msg   text := left(btrim(coalesce(p_mensagem, '')), 2500);
  v_tipo  text := case when p_tipo = 'kit' then 'kit' else 'mensagem' end;
  v_lead  text;
  v_obs   text;
  v_id    uuid;
begin
  if v_nome = '' then
    raise exception 'Falta o nome.';
  end if;
  if v_tipo = 'mensagem' and v_msg = '' then
    raise exception 'Falta a mensagem.';
  end if;
  if v_tipo = 'kit' then
    v_msg := 'Pediu o mídia kit pelo site.';
  end if;

  v_lead := case when v_marca <> '' then v_marca else v_nome end;

  -- A marca já está na aba Marcas? (mesmo e-mail, ou mesmo nome sem e-mail diferente)
  select m.id into v_id
  from public.marcas m
  where coalesce(m.exemplo, false) = false
    and (
      (v_email <> '' and lower(btrim(coalesce(m.email, ''))) = lower(v_email))
      or (
        lower(btrim(m.nome)) = lower(v_lead)
        and (v_email = '' or btrim(coalesce(m.email, '')) = '' or lower(btrim(m.email)) = lower(v_email))
      )
    )
  order by m.criado_em
  limit 1;

  -- Não achou: cria como Lead, no mesmo padrão dos outros leads do site.
  if v_id is null then
    v_obs := case when v_tipo = 'kit' then v_msg else 'Mensagem pelo site: ' || v_msg end;
    if v_marca <> '' and lower(v_marca) <> lower(v_nome) then
      v_obs := v_obs || E'\nContato: ' || v_nome;
    end if;
    if v_orc <> '' then
      v_obs := v_obs || E'\nOrçamento: ' || v_orc;
    end if;

    insert into public.marcas (nome, email, obs, situacao, ultimo_contato)
    values (v_lead, v_email, left(v_obs, 3000), 'lead', (now() at time zone 'America/Sao_Paulo')::date)
    returning id into v_id;
  end if;

  insert into public.mensagens_site (tipo, nome, email, marca, orcamento, mensagem, marca_id)
  values (v_tipo, v_nome, v_email, v_marca, v_orc, v_msg, v_id);
end;
$$;

revoke all on function public.enviar_contato(text, text, text, text, text, text) from public;
grant execute on function public.enviar_contato(text, text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

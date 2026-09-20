-- =====================================================================
--  CONTATO DO SITE: MENSAGENS NA ABA PORTFÓLIO + MARCA SEM REPETIR
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
--    * cria a tabela "mensagens_site": guarda TODAS as mensagens do
--      formulário do site (nome, e-mail, marca, orçamento e o texto), mesmo
--      quando a marca ou o e-mail se repetem. Você lê na aba Portfólio, pode
--      arquivar e apagar. Só você, logada, consegue ler;
--    * cria a função "enviar_contato", que o formulário do site usa. Ela guarda
--      a mensagem e cuida da aba Marcas:
--        - marca nova: cria como Lead, no padrão de sempre;
--        - marca que já existe (mesmo e-mail ou mesmo nome): NÃO cria outra.
--          Ela junta na marca que já está lá o que for diferente (outro
--          e-mail, outra pessoa de contato, orçamento, mensagem) e atualiza o
--          "último contato". Nada do que já estava escrito é apagado nem
--          trocado, e a situação (lead, cliente...) fica como está;
--    * na primeira vez que rodar, passa para a tabela as mensagens que já
--      tinham entrado como Lead na aba Marcas, para todas aparecerem no
--      Portfólio.
--
--  Pode rodar de novo sem medo: não apaga nem duplica nada.
--  Nunca coloque chave secreta aqui.
-- =====================================================================


-- =====================================================================
--  BLOCO 1: A TABELA DAS MENSAGENS (mensagens_site)
--    tipo       "mensagem" (formulário de contato) ou "kit" (pediu o mídia kit)
--    arquivada  true quando você arquivou (sai da lista principal, não some)
--    marca_id   a marca da aba Marcas ligada a esta mensagem (se a marca for
--               apagada, a mensagem continua, só perde a ligação)
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
--  BLOCO 2: O CAMPO "ARQUIVADA" E AS MENSAGENS ANTIGAS
--  Roda uma vez só (na primeira vez que o campo "arquivada" é criado).
--  As mensagens que já estavam na aba Marcas como Lead (observação começando
--  com "Mensagem pelo site:" ou "Pediu o mídia kit") são copiadas para a
--  tabela, sem repetir as que já estão lá.
-- =====================================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'mensagens_site' and column_name = 'arquivada'
  ) then
    alter table public.mensagens_site add column arquivada boolean not null default false;

    insert into public.mensagens_site (tipo, nome, email, marca, orcamento, mensagem, marca_id, criado_em)
    select
      case when m.obs like 'Pediu o mídia kit%' then 'kit' else 'mensagem' end,
      coalesce(nullif(btrim(substring(m.obs from E'\nContato: ([^\n]*)')), ''), m.nome),
      coalesce(m.email, ''),
      case when substring(m.obs from E'\nContato: ([^\n]*)') is not null then m.nome else '' end,
      coalesce(btrim(substring(m.obs from E'\nOrçamento: ([^\n]*)')), ''),
      case
        when m.obs like 'Pediu o mídia kit%' then 'Pediu o mídia kit pelo site.'
        else btrim(regexp_replace(substring(m.obs from char_length('Mensagem pelo site:') + 1), E'\n(Contato|Orçamento): .*$', '', 's'))
      end,
      m.id,
      m.criado_em
    from public.marcas m
    where (m.obs like 'Mensagem pelo site:%' or m.obs like 'Pediu o mídia kit%')
      and not exists (
        select 1 from public.mensagens_site s
        where s.marca_id = m.id and abs(extract(epoch from (s.criado_em - m.criado_em))) < 5
      );
  end if;
end;
$$;


-- =====================================================================
--  BLOCO 3: A TRANCA
--  Igual às outras tabelas: só a Esther logada lê, cria, muda e apaga.
--  Quem está deslogado não enxerga nada aqui. O site só consegue "deixar o
--  recado" pela função do bloco 4, nunca ler.
-- =====================================================================
alter table public.mensagens_site enable row level security;

revoke all on public.mensagens_site from anon;
grant select, insert, update, delete on public.mensagens_site to authenticated;

drop policy if exists "so_esther" on public.mensagens_site;
create policy "so_esther" on public.mensagens_site
  for all to authenticated
  using (public.eh_esther()) with check (public.eh_esther());


-- =====================================================================
--  BLOCO 4: A FUNÇÃO QUE O FORMULÁRIO DO SITE USA
--  1. guarda a mensagem em "mensagens_site" (sempre, mesmo se repetida);
--  2. procura a marca na aba Marcas (mesmo e-mail, ou mesmo nome);
--  3. se NÃO achar, cria a marca como Lead (nome = marca/empresa, ou o nome
--     da pessoa se ela não escreveu a marca);
--  4. se achar, junta na observação da marca só o que ainda não estava lá:
--     a mensagem, a pessoa de contato, o orçamento e um e-mail diferente
--     (se a marca estava sem e-mail, o e-mail entra no campo E-mail).
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
  v_nome   text := left(btrim(coalesce(p_nome, '')), 200);
  v_email  text := left(btrim(coalesce(p_email, '')), 200);
  v_marca  text := left(btrim(coalesce(p_marca, '')), 200);
  v_orc    text := left(btrim(coalesce(p_orcamento, '')), 100);
  v_msg    text := left(btrim(coalesce(p_mensagem, '')), 2500);
  v_tipo   text := case when p_tipo = 'kit' then 'kit' else 'mensagem' end;
  v_hoje   date := (now() at time zone 'America/Sao_Paulo')::date;
  v_data   text := to_char((now() at time zone 'America/Sao_Paulo')::date, 'DD/MM/YYYY');
  v_lead   text;
  v_obs    text;
  v_id     uuid;
  v_m_nome  text;
  v_m_email text;
  v_m_obs   text;
  v_extra   text := '';
  v_email_novo text;
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

  -- A marca já está na aba Marcas? (mesmo e-mail, também entre os "outros e-mails", ou mesmo nome)
  select m.id, m.nome, m.email, m.obs into v_id, v_m_nome, v_m_email, v_m_obs
  from public.marcas m
  where coalesce(m.exemplo, false) = false
    and (
      (v_email <> '' and (
        lower(btrim(coalesce(m.email, ''))) = lower(v_email)
        or position(lower(v_email) in lower(coalesce(m.obs, ''))) > 0
      ))
      or lower(btrim(m.nome)) = lower(v_lead)
    )
  order by m.criado_em
  limit 1;

  if v_id is null then
    -- Não achou: cria como Lead, no mesmo padrão dos outros leads do site.
    v_obs := case when v_tipo = 'kit' then v_msg else 'Mensagem pelo site: ' || v_msg end;
    if v_marca <> '' and lower(v_marca) <> lower(v_nome) then
      v_obs := v_obs || E'\nContato: ' || v_nome;
    end if;
    if v_orc <> '' then
      v_obs := v_obs || E'\nOrçamento: ' || v_orc;
    end if;

    insert into public.marcas (nome, email, obs, situacao, ultimo_contato)
    values (v_lead, v_email, left(v_obs, 3000), 'lead', v_hoje)
    returning id into v_id;
  else
    -- Achou: junta na marca só o que ainda não estava lá. Nada é apagado nem trocado.
    v_m_obs := coalesce(v_m_obs, '');
    v_email_novo := v_m_email;

    if v_tipo = 'kit' then
      if position('pediu o mídia kit' in lower(v_m_obs)) = 0 then
        v_extra := v_extra || E'\nPediu o mídia kit pelo site (' || v_data || ').';
      end if;
    elsif position(lower(v_msg) in lower(v_m_obs)) = 0 then
      v_extra := v_extra || E'\nMensagem pelo site (' || v_data || '): ' || v_msg;
    end if;

    if lower(v_nome) <> lower(btrim(v_m_nome))
       and position(lower('Contato: ' || v_nome) in lower(v_m_obs)) = 0 then
      v_extra := v_extra || E'\nContato: ' || v_nome;
    end if;

    if v_orc <> '' and position(lower('Orçamento: ' || v_orc) in lower(v_m_obs)) = 0 then
      v_extra := v_extra || E'\nOrçamento: ' || v_orc;
    end if;

    if v_email <> '' then
      if btrim(coalesce(v_m_email, '')) = '' then
        v_email_novo := v_email;
      elsif lower(btrim(v_m_email)) <> lower(v_email)
            and position(lower(v_email) in lower(v_m_obs)) = 0 then
        v_extra := v_extra || E'\nOutro e-mail: ' || v_email;
      end if;
    end if;

    update public.marcas
    set email = v_email_novo,
        obs = left(case when btrim(v_m_obs) = '' then ltrim(v_extra, E'\n') else v_m_obs || v_extra end, 3000),
        ultimo_contato = v_hoje
    where id = v_id;
  end if;

  insert into public.mensagens_site (tipo, nome, email, marca, orcamento, mensagem, marca_id)
  values (v_tipo, v_nome, v_email, v_marca, v_orc, v_msg, v_id);
end;
$$;

revoke all on function public.enviar_contato(text, text, text, text, text, text) from public;
grant execute on function public.enviar_contato(text, text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

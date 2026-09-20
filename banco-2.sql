-- =====================================================================
--  BANCO 2: O CONTEÚDO DO SITE EDITÁVEL PELO PAINEL
--  Depois de rodar o banco.sql, rode este também (mesmo lugar):
--    Supabase, SQL Editor, New query, cole este arquivo INTEIRO e clique Run.
--
--  Ele cria uma tabela onde ficam os textos e números do site que você
--  edita na aba "Conteúdo do site" do painel: capa, sobre, letreiro de
--  marcas, números, serviços, resultados e depoimentos.
--
--  Pode rodar de novo sem medo: não apaga o que você já editou.
--  Nunca coloque chave secreta aqui.
-- =====================================================================


-- =====================================================================
--  BLOCO 1: A TABELA
--  Cada linha é uma parte do site (a "chave") e o texto dela (o "valor").
-- =====================================================================
create table if not exists public.site_conteudo (
  chave          text primary key,
  valor          jsonb not null,
  atualizado_em  timestamptz not null default now()
);


-- =====================================================================
--  BLOCO 2: A TRANCA
--  Igual às outras tabelas: só a Esther logada lê e escreve.
--  Visitante deslogado não consegue ler nem escrever nada aqui.
-- =====================================================================
alter table public.site_conteudo enable row level security;

revoke all on public.site_conteudo from anon;
grant select, insert, update, delete on public.site_conteudo to authenticated;

drop policy if exists "so_esther" on public.site_conteudo;
create policy "so_esther" on public.site_conteudo
  for all to authenticated
  using (public.eh_esther()) with check (public.eh_esther());


-- =====================================================================
--  BLOCO 3: A VITRINE DO CONTEÚDO
--  O site precisa MOSTRAR esses textos para qualquer visitante, mas a
--  tabela fica trancada. Esta função entrega só o conteúdo público do
--  site (nada de contatos, campanhas ou visitas) e nada além disso.
-- =====================================================================
create or replace function public.conteudo_do_site()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(chave, valor), '{}'::jsonb) from public.site_conteudo;
$$;

revoke all on function public.conteudo_do_site() from public;
grant execute on function public.conteudo_do_site() to anon, authenticated;


-- =====================================================================
--  BLOCO 4: O TEXTO QUE O SITE TEM HOJE
--  Ponto de partida para você editar no painel. Se a linha já existir
--  (porque você já editou), ela NÃO é sobrescrita.
-- =====================================================================
-- Capa: texto do selo, frase e os dois números
insert into public.site_conteudo (chave, valor)
values ('capa', $json${
  "chip": "Creator & Modelo",
  "frase": "Conteúdo que transforma a rotina em desejo, conexão e identificação com a sua marca.",
  "numeros": [
    "+500 vídeos",
    "+200 marcas"
  ]
}$json$::jsonb)
on conflict (chave) do nothing;

-- Sobre mim: os dois parágrafos
insert into public.site_conteudo (chave, valor)
values ('sobre', $json${
  "abre": "Eu gosto de mostrar produtos do jeito que as pessoas realmente usam: na rotina, com luz natural e com opinião de verdade.",
  "texto": "Sou criadora de conteúdo UGC em Hortolândia e já entreguei 250 vídeos para marcas de beleza, skincare, moda, casa e decoração, fitness e viagem. Cada projeto começa com uma conversa para entender o que a sua marca quer dizer e termina com um conteúdo que você vai ter orgulho de postar."
}$json$::jsonb)
on conflict (chave) do nothing;

-- Letreiro de marcas que fecha a capa
insert into public.site_conteudo (chave, valor)
values ('marcas', $json$[
  "Creamy",
  "iFood",
  "Truss",
  "Marca 04",
  "Marca 05",
  "Marca 06",
  "Marca 07",
  "Marca 08",
  "Marca 09",
  "Marca 10",
  "Marca 11",
  "Marca 12"
]$json$::jsonb)
on conflict (chave) do nothing;

-- Números com contador animado
insert into public.site_conteudo (chave, valor)
values ('metricas', $json$[
  {
    "valor": 250,
    "prefixo": "",
    "sufixo": "",
    "rotulo": "vídeos entregues"
  },
  {
    "valor": 6,
    "prefixo": "",
    "sufixo": "",
    "rotulo": "nichos atendidos"
  },
  {
    "valor": null,
    "prefixo": "",
    "sufixo": "",
    "rotulo": "marcas atendidas"
  },
  {
    "valor": null,
    "prefixo": "",
    "sufixo": "",
    "rotulo": "views somadas"
  }
]$json$::jsonb)
on conflict (chave) do nothing;

-- Os seis serviços
insert into public.site_conteudo (chave, valor)
values ('servicos', $json$[
  {
    "numero": "01",
    "titulo": "Vídeo UGC",
    "texto": "Vídeo vertical gravado por mim, com roteiro aprovado por você, mostrando o produto na rotina, com a voz e a opinião de quem usa."
  },
  {
    "numero": "02",
    "titulo": "Corte para anúncio",
    "texto": "Versões curtas e dinâmicas do vídeo, com gancho nos primeiros segundos, prontas para rodar em anúncios de reels, TikTok e Shorts."
  },
  {
    "numero": "03",
    "titulo": "Fotos do produto",
    "texto": "Fotos com luz natural e cenário real, nos formatos certos para feed, stories e página de produto."
  },
  {
    "numero": "04",
    "titulo": "Unboxing",
    "texto": "Abertura do produto em vídeo, mostrando embalagem, primeiras impressões e os detalhes que fazem o cliente querer levar."
  },
  {
    "numero": "05",
    "titulo": "Publicação no meu perfil",
    "texto": "Eu divulgo o conteúdo no meu Instagram, com marcação da marca, para ampliar o alcance da campanha."
  },
  {
    "numero": "06",
    "titulo": "Pacote mensal",
    "texto": "Conteúdos entregues todo mês, com calendário combinado, para a sua marca manter presença constante e sempre nova."
  }
]$json$::jsonb)
on conflict (chave) do nothing;

-- Resultados de campanha
insert into public.site_conteudo (chave, valor)
values ('resultados', $json$[
  {
    "numero": "+00%",
    "titulo": "Resultado da campanha 01",
    "marca": "Marca 01",
    "texto": "Descreva aqui o que a campanha alcançou, por exemplo mais alcance, mais cliques ou mais vendas."
  },
  {
    "numero": "+00%",
    "titulo": "Resultado da campanha 02",
    "marca": "Marca 02",
    "texto": "Descreva aqui o que a campanha alcançou, por exemplo mais alcance, mais cliques ou mais vendas."
  },
  {
    "numero": "+00%",
    "titulo": "Resultado da campanha 03",
    "marca": "Marca 03",
    "texto": "Descreva aqui o que a campanha alcançou, por exemplo mais alcance, mais cliques ou mais vendas."
  }
]$json$::jsonb)
on conflict (chave) do nothing;

-- Depoimentos
insert into public.site_conteudo (chave, valor)
values ('depoimentos', $json$[
  {
    "nome": "Cliente 01",
    "empresa": "Marca 01",
    "texto": "Escreva aqui o depoimento do cliente. Conte em uma ou duas frases como foi trabalhar com a Esther."
  },
  {
    "nome": "Cliente 02",
    "empresa": "Marca 02",
    "texto": "Escreva aqui o depoimento do cliente. Conte em uma ou duas frases como foi trabalhar com a Esther."
  },
  {
    "nome": "Cliente 03",
    "empresa": "Marca 03",
    "texto": "Escreva aqui o depoimento do cliente. Conte em uma ou duas frases como foi trabalhar com a Esther."
  },
  {
    "nome": "Cliente 04",
    "empresa": "Marca 04",
    "texto": "Escreva aqui o depoimento do cliente. Conte em uma ou duas frases como foi trabalhar com a Esther."
  }
]$json$::jsonb)
on conflict (chave) do nothing;


-- Avisa o Supabase para reconhecer a tabela nova na hora.
notify pgrst, 'reload schema';

-- =====================================================================
--  BANCO 3: NICHO E FAVORITAS NAS MARCAS
--  Depois de rodar o banco.sql e o banco-2.sql, rode este também (mesmo lugar):
--    Supabase, SQL Editor, New query, cole este arquivo INTEIRO e clique Run.
--    Deve aparecer "Success. No rows returned".
--
--  Ele acrescenta dois campos na tabela "marcas":
--    nicho     o assunto da marca (exemplo: cabelo, skincare, app).
--              Pode ter mais de um, separados por vírgula.
--    favorita  a estrela para marcar as marcas que você quer priorizar agora.
--
--  Pode rodar de novo sem medo: não apaga nem duplica nada.
--  Nunca coloque chave secreta aqui.
-- =====================================================================


-- =====================================================================
--  BLOCO 1: OS DOIS CAMPOS NOVOS
--  As marcas que você já tem ficam sem nicho e sem estrela até você marcar.
-- =====================================================================
alter table public.marcas add column if not exists nicho    text;
alter table public.marcas add column if not exists favorita boolean not null default false;


-- =====================================================================
--  BLOCO 2: A TRANCA DO FORMULÁRIO DO SITE
--  Continua igual à do banco.sql: qualquer pessoa pode só ENVIAR um contato
--  como "lead". A diferença é que agora ela também não consegue se colocar
--  como favorita nem mandar um nicho gigante pelo formulário.
--  Quem está deslogado continua sem conseguir LER nada.
--  Só a Esther logada lê, cria, muda e apaga (a política "so_esther" já vale
--  para os campos novos, não precisa mexer nela).
-- =====================================================================
drop policy if exists "site_envia_contato" on public.marcas;
create policy "site_envia_contato" on public.marcas
  for insert to anon
  with check (
    situacao = 'lead'
    and exemplo = false
    and favorita = false
    and length(coalesce(nome, ''))      between 1 and 200
    and length(coalesce(email, ''))     <= 200
    and length(coalesce(instagram, '')) <= 100
    and length(coalesce(telefone, ''))  <= 40
    and length(coalesce(obs, ''))       <= 3000
    and length(coalesce(nicho, ''))     <= 100
  );


-- Avisa o Supabase para reconhecer os campos novos na hora.
notify pgrst, 'reload schema';


-- =====================================================================
--  TESTE DA TRANCA (opcional)
--  NÃO rode este bloco junto com o resto. Depois de rodar tudo acima com
--  sucesso, apague o conteúdo da caixa, cole UM teste por vez e clique Run.
--  O "rollback" no final desfaz tudo: nada fica gravado.
--
--  TESTE 3A: uma pessoa deslogada tenta entrar já como "favorita".
--           Resultado esperado: ERRO "new row violates row-level security policy".
--           (O formulário do site só pode criar um lead comum.)
--
--      begin;
--      set local role anon;
--      insert into public.marcas (nome, situacao, favorita) values ('Golpe', 'lead', true);
--      rollback;
--
--  TESTE 3B: o formulário normal do site continua funcionando.
--           Resultado esperado: sem erro.
--
--      begin;
--      set local role anon;
--      insert into public.marcas (nome, situacao) values ('Teste do formulario', 'lead');
--      rollback;
-- =====================================================================

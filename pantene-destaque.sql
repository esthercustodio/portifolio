-- =====================================================================
--  VOLTA O VÍDEO DA PANTENE PARA OS DESTAQUES
--
--  ONDE COLAR:
--    1. Abra o seu projeto no Supabase (supabase.com/dashboard).
--    2. No menu da esquerda, clique em "SQL Editor".
--    3. Clique em "New query" (nova consulta).
--    4. Cole este arquivo INTEIRO na caixa e clique no botão verde "Run".
--    5. Deve aparecer "Success. No rows returned". Pronto.
--
--  Recria o vídeo da Pantene que estava nos Destaques (link LP1pZtUuFn8),
--  do jeito que estava: marca e título Pantene, texto "Transformação",
--  capa img/capas/pantene.webp, só nos Destaques (sem nicho), logo depois
--  do Maxton. Se ele já existir (mesmo link), não cria outro: só coloca de
--  volta nos Destaques. O outro vídeo da Pantene, que fica na linha Cabelo
--  (link joqQGhQ4SdY), não muda.
--
--  Nunca coloque chave secreta aqui.
-- =====================================================================

do $$
begin
  if exists (select 1 from public.videos where exemplo = false and link like '%LP1pZtUuFn8%') then
    update public.videos
    set em_destaques = true, visivel = true, nicho = null, ordem = 2
    where exemplo = false and link like '%LP1pZtUuFn8%';
  else
    insert into public.videos (titulo, link, nicho, formato, marca, destaque, capa, em_destaques, ordem, visivel, exemplo)
    values ('Pantene', 'https://youtube.com/shorts/LP1pZtUuFn8', null, 'Vídeo 9:16', 'Pantene',
            'Transformação', 'img/capas/pantene.webp', true, 2, true, false);
  end if;
end;
$$;

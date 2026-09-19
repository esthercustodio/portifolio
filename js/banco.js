/* =========================================================
   LIGAÇÃO COM O SUPABASE (o "banco" do seu site)
   Este é o ÚNICO lugar onde o endereço e a chave ficam guardados.
   O portfólio, o login e o admin usam este arquivo.

   Atenção: a chave abaixo é a chave PÚBLICA (publishable). Ela pode
   aparecer no site sem problema, porque quem manda no acesso é a
   tranca do banco (RLS), criada pelo arquivo banco.sql.
   NUNCA cole aqui a chave secreta (secret / service_role).

   Este arquivo precisa vir DEPOIS da tag do Supabase:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ========================================================= */
(function () {
  var URL_DO_PROJETO = "https://dhqnfqpasuterxedplyb.supabase.co";
  var CHAVE_PUBLICA = "sb_publishable_KdWy9cPW08pbW6BYwXiolA_eRQnbB_V";

  /* O único e-mail que pode entrar no admin */
  var EMAIL_DA_DONA = "contatoesthercustodio@gmail.com";

  window.BANCO_CONFIG = {
    url: URL_DO_PROJETO,
    chave: CHAVE_PUBLICA,
    emailDaDona: EMAIL_DA_DONA
  };

  if (window.supabase && typeof window.supabase.createClient === "function") {
    window.banco = window.supabase.createClient(URL_DO_PROJETO, CHAVE_PUBLICA, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  } else {
    /* Se o Supabase não carregou (internet fora do ar, por exemplo), as páginas avisam com jeito */
    window.banco = null;
  }
})();

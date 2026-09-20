// =====================================================================
//  ENVIAR-EMAILS: O "CARTEIRO" DA ABA PROSPECÇÃO
//
//  O que é: uma função que fica no Supabase (Edge Function) e manda os
//  e-mails pelo Resend. O admin não sabe mandar e-mail sozinho, então ele
//  entrega a lista para esta função e ela faz o envio.
//
//  ONDE COLAR (passo a passo completo está no final da conversa):
//    1. Supabase, menu "Edge Functions", botão para criar uma função nova
//       "Via Editor". Dê o nome  enviar-emails  (exatamente assim).
//    2. Apague o código de exemplo, cole ESTE ARQUIVO INTEIRO e clique em Deploy.
//    3. Nas configurações da função, desligue "Verify JWT". Isso não deixa a
//       função aberta: quem confere o seu login é o código aqui embaixo.
//
//  A CHAVE DO RESEND É SECRETA e NÃO está neste arquivo. Ela fica guardada
//  no cofre do Supabase (Edge Functions, Secrets) com o nome RESEND_API_KEY.
//  Nunca escreva a chave aqui, nem em nenhum arquivo do site.
//
//  Segredo opcional: EMAIL_REMETENTE, por exemplo
//     Esther Custódio <contato@seudominio.com>
//  Só use quando o seu domínio estiver verificado no Resend. Sem ele, os
//  e-mails saem de onboarding@resend.dev e o Resend só entrega para o seu
//  próprio e-mail (serve para o teste).
//
//  O que a função faz, em ordem:
//    * recusa quem não está logado no painel e qualquer usuário que não
//      seja o e-mail da Esther;
//    * aceita no máximo 250 destinatários por chamada;
//    * troca {{nome}} pelo primeiro nome da marca e {{marca}} pelo nome inteiro;
//    * pula quem está na tabela de descadastro e e-mails repetidos;
//    * espera 200 milissegundos entre um envio e outro;
//    * manda com reply_to no seu e-mail e o cabeçalho List-Unsubscribe (SAIR);
//    * grava UMA LINHA POR DESTINATÁRIO na tabela email_envios;
//    * para na hora se a cota diária do Resend acabar (ou se o domínio não
//      estiver verificado, ou se a chave estiver errada);
//    * marca a data de hoje no "último contato" de cada marca que recebeu.
// =====================================================================

const EMAIL_DA_DONA = "contatoesthercustodio@gmail.com";
const REMETENTE_PADRAO = "Esther Custódio <onboarding@resend.dev>";
const MAX_DESTINATARIOS = 250;
const PAUSA_ENTRE_ENVIOS_MS = 200;
// A função do Supabase é cortada por volta de 150 segundos. Paramos antes, com folga,
// e devolvemos quantos faltaram para o painel continuar no lote seguinte.
const LIMITE_DE_TEMPO_MS = 110000;
const ORIGENS_PERMITIDAS = ["https://esthercustodio.github.io"];

// ---------------------------------------------------------------------
//  FUNÇÕES QUE SÓ MEXEM COM TEXTO (dá para testar fora do Supabase)
// ---------------------------------------------------------------------
const MAPA_HTML: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escaparHtml(texto: string): string {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => MAPA_HTML[c]);
}

export function emailValido(email: string): boolean {
  return email.length <= 254 && /^[^\s@;,<>()"']+@[^\s@;,<>()"']+\.[^\s@;,<>()"']+$/.test(email);
}

const ARTIGOS = ["o", "a", "os", "as", "um", "uma"];

// "Natura Cosméticos" vira "Natura". "O Boticário" vira "Boticário". "L'Oréal Paris" vira "L'Oréal".
export function primeiroNome(marca: string): string {
  const inteiro = String(marca ?? "").trim();
  const palavras = inteiro.split(/\s+/).filter(Boolean);
  while (palavras.length > 1 && ARTIGOS.includes(palavras[0].toLowerCase().replace(/[^\p{L}]/gu, ""))) palavras.shift();
  const primeira = (palavras[0] ?? "").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  return primeira || inteiro;
}

// Troca {{nome}} e {{marca}}. No HTML o valor é "escapado" (o & de "Ben & Jerry's" não quebra o e-mail).
export function trocarCampos(modelo: string, dados: { nome: string; marca: string }, comoHtml: boolean): string {
  return String(modelo ?? "").replace(/\{\{\s*(nome|marca)\s*\}\}/gi, (_m, campo: string) => {
    const valor = campo.toLowerCase() === "nome" ? dados.nome : dados.marca;
    return comoHtml ? escaparHtml(valor) : String(valor).replace(/[\r\n]+/g, " ");
  });
}

export function limparAssunto(assunto: string): string {
  return String(assunto ?? "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
}

// Versão só texto do e-mail (melhora a entrega e serve de reserva para quem lê sem HTML).
export function textoDoHtml(html: string): string {
  return String(html ?? "")
    .replace(/<(head|style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, interno: string) => {
      const texto = interno.replace(/<[^>]+>/g, "").trim();
      return texto && texto !== href ? `${texto} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Diz o que o Resend quis dizer com um erro, para a função saber se continua ou para.
export function classificarErro(status: number, corpo: any): string {
  const nome = String(corpo?.name ?? "").toLowerCase();
  const msg = String(corpo?.message ?? "").toLowerCase();
  if (nome === "daily_quota_exceeded" || nome === "monthly_quota_exceeded") return "cota";
  if (nome === "rate_limit_exceeded" || (status === 429 && !/quota/.test(nome + msg))) return "limite";
  if (status === 401 || ["missing_api_key", "invalid_api_key", "restricted_api_key"].includes(nome)) return "chave";
  if (/testing emails to your own|verify a domain|domain is not verified|not verified/.test(msg)) return "dominio";
  if (status >= 500) return "temporario";
  return "destinatario";
}

function pedacos<T>(lista: T[], tamanho: number): T[][] {
  const saida: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) saida.push(lista.slice(i, i + tamanho));
  return saida;
}

const dormir = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

// A data de hoje no Brasil, no formato 2026-09-20.
function dataDeHoje(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

// ---------------------------------------------------------------------
//  CONVERSA COM O NAVEGADOR (CORS) E RESPOSTAS
// ---------------------------------------------------------------------
function cabecalhosCors(req: Request): Record<string, string> {
  const origem = req.headers.get("origin") ?? "";
  const permitido = ORIGENS_PERMITIDAS.includes(origem) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origem);
  return {
    "Access-Control-Allow-Origin": permitido ? origem : ORIGENS_PERMITIDAS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function responder(req: Request, corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhosCors(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

// ---------------------------------------------------------------------
//  ENVIO DE UM E-MAIL PELO RESEND
// ---------------------------------------------------------------------
type ResultadoEnvio = { ok: boolean; id?: string; tipo?: string; erro?: string };

async function enviarPeloResend(chave: string, corpo: Record<string, unknown>, idempotencia: string): Promise<ResultadoEnvio> {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    let resp: Response;
    try {
      resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json", "Idempotency-Key": idempotencia },
        body: JSON.stringify(corpo),
      });
    } catch (_e) {
      if (tentativa < 2) { await dormir(1000 * (tentativa + 1)); continue; }
      return { ok: false, tipo: "temporario", erro: "Sem resposta do Resend (falha de rede)." };
    }
    let json: any = null;
    try { json = await resp.json(); } catch (_e) { json = null; }
    if (resp.ok && json?.id) return { ok: true, id: String(json.id) };
    const tipo = classificarErro(resp.status, json);
    const mensagem = String(json?.message ?? json?.error ?? `O Resend respondeu com o código ${resp.status}.`);
    if (tipo === "limite" && tentativa < 3) {
      const espera = Number(resp.headers.get("retry-after"));
      await dormir(espera > 0 ? Math.min(espera, 10) * 1000 : 1200);
      continue;
    }
    if (tipo === "temporario" && tentativa < 2) { await dormir(1000 * (tentativa + 1)); continue; }
    return { ok: false, tipo, erro: mensagem };
  }
  return { ok: false, tipo: "temporario", erro: "O Resend não respondeu depois de várias tentativas." };
}

// ---------------------------------------------------------------------
//  A FUNÇÃO PRINCIPAL
// ---------------------------------------------------------------------
export async function tratar(
  req: Request,
  injetado?: { createClient?: (url: string, chave: string, opcoes: unknown) => any },
): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cabecalhosCors(req) });
  if (req.method !== "POST") return responder(req, { ok: false, erro: "Use o método POST." }, 405);

  // 1) QUEM ESTÁ CHAMANDO? Só a Esther, logada.
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return responder(req, { ok: false, codigo: "sem_login", erro: "Entre no painel para enviar." }, 401);

  const urlSupabase = Deno.env.get("SUPABASE_URL") ?? "";
  const chaveSupabase = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!urlSupabase || !chaveSupabase) {
    return responder(req, { ok: false, codigo: "configuracao", erro: "A função está sem a configuração do Supabase." }, 500);
  }
  const criarCliente = injetado?.createClient ?? (await import("npm:@supabase/supabase-js@2")).createClient;
  // O cliente age como a própria Esther: as travas (RLS) do banco continuam valendo.
  const sb = criarCliente(urlSupabase, chaveSupabase, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: dadosUsuario, error: erroUsuario } = await sb.auth.getUser(token);
  const usuario = dadosUsuario?.user;
  if (erroUsuario || !usuario) {
    return responder(req, { ok: false, codigo: "sem_login", erro: "Sua sessão não vale mais. Entre de novo no painel." }, 401);
  }
  if (String(usuario.email ?? "").toLowerCase() !== EMAIL_DA_DONA) {
    return responder(req, { ok: false, codigo: "nao_autorizado", erro: "Só a Esther pode enviar e-mails por aqui." }, 403);
  }

  // 2) O PEDIDO
  let pedido: any;
  try { pedido = await req.json(); } catch (_e) {
    return responder(req, { ok: false, codigo: "pedido", erro: "O pedido chegou sem dados." }, 400);
  }
  const teste = pedido?.teste === true;
  const assuntoModelo = limparAssunto(String(pedido?.assunto ?? ""));
  const htmlModelo = String(pedido?.html ?? "");
  const brutos: any[] = Array.isArray(pedido?.destinatarios) ? pedido.destinatarios : [];
  if (!assuntoModelo) return responder(req, { ok: false, codigo: "pedido", erro: "Falta o assunto do e-mail." }, 400);
  if (!htmlModelo.trim()) return responder(req, { ok: false, codigo: "pedido", erro: "Falta o texto do e-mail." }, 400);
  if (htmlModelo.length > 500000) return responder(req, { ok: false, codigo: "pedido", erro: "O e-mail está grande demais." }, 400);
  if (!brutos.length) return responder(req, { ok: false, codigo: "pedido", erro: "Não há destinatários." }, 400);
  if (brutos.length > MAX_DESTINATARIOS) {
    return responder(req, { ok: false, codigo: "muitos", erro: `Cada envio aceita no máximo ${MAX_DESTINATARIOS} destinatários.` }, 400);
  }

  // 3) O CARTEIRO PRECISA DA CHAVE E DAS TABELAS ANTES DE COMEÇAR
  const chaveResend = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!chaveResend) {
    return responder(req, {
      ok: false, codigo: "sem_chave",
      erro: "A chave do Resend ainda não foi guardada no Supabase (segredo RESEND_API_KEY). Veja o passo a passo.",
    });
  }
  const [conferirEnvios, conferirOptout] = await Promise.all([
    sb.from("email_envios").select("id").limit(1),
    sb.from("email_optout").select("email").limit(1),
  ]);
  if (conferirEnvios.error || conferirOptout.error) {
    return responder(req, {
      ok: false, codigo: "tabelas",
      erro: "Faltam as tabelas do disparo no Supabase. Rode o arquivo disparo.sql no SQL Editor e tente de novo.",
    });
  }

  // 4) A LISTA: e-mails válidos, sem repetir, sem descadastrados
  const canal = teste ? "teste" : "resend";
  const vistos = new Set<string>();
  let repetidos = 0;
  const invalidos: { email: string; erro: string; marca_id: string | null }[] = [];
  const lista: { email: string; marca: string; marca_id: string | null }[] = [];
  for (const b of brutos) {
    const email = String(b?.email ?? "").trim().toLowerCase();
    const marca = String(b?.marca ?? "").trim().slice(0, 200) || "Marca";
    const marcaId = typeof b?.marca_id === "string" && /^[0-9a-f-]{36}$/i.test(b.marca_id) ? b.marca_id : null;
    if (!emailValido(email)) { invalidos.push({ email: email.slice(0, 254), erro: "E-mail inválido.", marca_id: marcaId }); continue; }
    if (vistos.has(email)) { repetidos++; continue; }
    vistos.add(email);
    lista.push({ email, marca, marca_id: marcaId });
  }
  if (teste && (lista.length !== 1 || lista[0].email !== EMAIL_DA_DONA)) {
    return responder(req, { ok: false, codigo: "teste", erro: "O teste só pode ir para o seu próprio e-mail." }, 400);
  }

  const descadastrados = new Set<string>();
  if (!teste) {
    for (const parte of pedacos(lista.map((d) => d.email), 80)) {
      const { data, error } = await sb.from("email_optout").select("email").in("email", parte);
      if (error) {
        return responder(req, { ok: false, codigo: "descadastro", erro: "Não consegui conferir a lista de descadastro. Por segurança, não enviei nada." });
      }
      for (const linha of data ?? []) descadastrados.add(String(linha.email).toLowerCase());
    }
  }
  const fila = lista.filter((d) => !descadastrados.has(d.email));

  // 5) O ENVIO, UM POR UM
  const remetente = Deno.env.get("EMAIL_REMETENTE") || REMETENTE_PADRAO;
  const cabecalhoSair = `<mailto:${EMAIL_DA_DONA}?subject=SAIR>`;
  const inicio = Date.now();
  let enviados = 0;
  let falhas = invalidos.length;
  let faltando = 0;
  let parouPor: string | null = null;
  let registroFalhou = 0;
  const idsEnviados: string[] = [];
  const listaDeFalhas: { email: string; erro: string }[] = invalidos.map((i) => ({ email: i.email, erro: i.erro }));

  const registrar = async (linha: Record<string, unknown>) => {
    const { error } = await sb.from("email_envios").insert(linha);
    if (error) registroFalhou++;
  };

  for (const i of invalidos) {
    await registrar({ email: i.email || "(vazio)", assunto: assuntoModelo, status: "erro", erro: i.erro, canal, marca_id: i.marca_id });
  }

  for (let posicao = 0; posicao < fila.length; posicao++) {
    if (Date.now() - inicio > LIMITE_DE_TEMPO_MS) { parouPor = "tempo"; faltando = fila.length - posicao; break; }
    const d = fila[posicao];
    const dados = { nome: primeiroNome(d.marca), marca: d.marca };
    const assunto = (teste ? "[TESTE] " : "") + limparAssunto(trocarCampos(assuntoModelo, dados, false));
    const html = trocarCampos(htmlModelo, dados, true);

    const r = await enviarPeloResend(chaveResend, {
      from: remetente,
      to: [d.email],
      subject: assunto,
      html,
      text: textoDoHtml(html),
      reply_to: EMAIL_DA_DONA,
      headers: { "List-Unsubscribe": cabecalhoSair },
    }, crypto.randomUUID());

    if (r.ok) {
      enviados++;
      if (!teste && d.marca_id) idsEnviados.push(d.marca_id);
      await registrar({ email: d.email, assunto, status: "ok", resend_id: r.id, canal, marca_id: d.marca_id });
    } else {
      const mensagem = String(r.erro ?? "Erro desconhecido.").slice(0, 500);
      const cota = r.tipo === "cota";
      await registrar({
        email: d.email, assunto, status: "erro",
        erro: cota ? "A cota diária do Resend acabou. Este e-mail NÃO foi enviado." : mensagem,
        canal, marca_id: d.marca_id,
      });
      if (cota || r.tipo === "dominio" || r.tipo === "chave") {
        // Para na hora. Não adianta continuar tentando: todos os próximos dariam o mesmo erro.
        parouPor = cota ? "cota" : (r.tipo as string);
        faltando = fila.length - posicao;
        listaDeFalhas.push({ email: d.email, erro: cota ? "Cota diária do Resend acabou." : mensagem });
        break;
      }
      falhas++;
      listaDeFalhas.push({ email: d.email, erro: mensagem });
    }
    if (posicao < fila.length - 1) await dormir(PAUSA_ENTRE_ENVIOS_MS);
  }

  // 6) MARCA A DATA DE HOJE NAS MARCAS QUE RECEBERAM (menos no teste)
  let marcasNaoAtualizadas = false;
  if (!teste && idsEnviados.length) {
    const hoje = dataDeHoje();
    for (const parte of pedacos(idsEnviados, 80)) {
      const { error } = await sb.from("marcas").update({ ultimo_contato: hoje }).in("id", parte);
      if (error) marcasNaoAtualizadas = true;
    }
  }

  return responder(req, {
    ok: true,
    teste,
    enviados,
    falhas,
    pulados: descadastrados.size + repetidos,
    pulados_detalhe: { descadastrados: descadastrados.size, repetidos },
    faltando,
    cota_acabou: parouPor === "cota",
    parou_por: parouPor,
    falhas_lista: listaDeFalhas.slice(0, 50),
    registro_falhou: registroFalhou,
    marcas_nao_atualizadas: marcasNaoAtualizadas,
  });
}

if (typeof Deno !== "undefined") {
  Deno.serve(async (req: Request) => {
    try {
      return await tratar(req);
    } catch (e) {
      console.error(e);
      return responder(req, { ok: false, codigo: "inesperado", erro: "A função teve um problema inesperado. Tente de novo." }, 500);
    }
  });
}

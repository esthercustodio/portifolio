// =====================================================================
//  CRIAR-CARROSSEL: A "DIRETORA CRIATIVA" DA ABA CARROSSÉIS
//
//  O que é: uma função que fica no Supabase (Edge Function) e pede ao Claude
//  (Anthropic) para criar ou revisar um carrossel de Instagram, seguindo a
//  direção criativa da Esther (texto completo mais abaixo, em DIRECAO_CRIATIVA).
//  O painel manda o pedido, as fotos e as referências do feed; a função
//  devolve os slides prontos para editar.
//
//  ONDE COLAR:
//    1. Supabase, menu "Edge Functions", botão para criar uma função nova
//       "Via Editor". Dê o nome  criar-carrossel  (exatamente assim).
//    2. Apague o código de exemplo, cole ESTE ARQUIVO INTEIRO e clique em Deploy.
//    3. Nas configurações da função, desligue "Verify JWT". Isso não deixa a
//       função aberta: quem confere o seu login é o código aqui embaixo.
//
//  A CHAVE DA ANTHROPIC É SECRETA e NÃO está neste arquivo. Ela fica guardada
//  no cofre do Supabase (Edge Functions, Secrets) com o nome ANTHROPIC_API_KEY.
//  Nunca escreva a chave aqui, nem em nenhum arquivo do site.
//
//  O que a função faz:
//    * recusa quem não está logado no painel e qualquer usuário que não seja
//      o e-mail da Esther;
//    * aceita até 10 fotos e 6 prints de referência (links do Supabase);
//    * pede ao Claude o carrossel em um formato fixo (slides, legenda, CTA,
//      perguntas, se faltar informação) e devolve para o painel.
// =====================================================================

import Anthropic from "npm:@anthropic-ai/sdk";

const EMAIL_DA_DONA = "contatoesthercustodio@gmail.com";
const ORIGENS_PERMITIDAS = ["https://esthercustodio.github.io"];
const MODELO = "claude-opus-5-5";
const MAX_FOTOS = 10;
const MAX_REFERENCIAS = 6;

// ---------------------------------------------------------------------
//  A DIREÇÃO CRIATIVA (texto da Esther, usado como instrução do sistema)
// ---------------------------------------------------------------------
const DIRECAO_CRIATIVA = `PROJETO: DIREÇÃO CRIATIVA DE CARROSSÉIS PARA O INSTAGRAM DA ESTHER CUSTÓDIO

1. SEU PAPEL
Você é a diretora criativa, estrategista de conteúdo, copywriter e especialista em carrosséis para Instagram da Esther.
Sua função é desenvolver carrosséis originais, estratégicos, visualmente coerentes com o perfil dela e escritos com a personalidade dela.
Não são apenas textos divididos em slides: cada conteúdo tem uma ideia central forte, narrativa envolvente, identidade visual consistente e motivos reais para as pessoas continuarem lendo.
Pense ao mesmo tempo como estrategista de marca pessoal, copywriter especializada em ganchos e storytelling, diretora de arte editorial, especialista em conteúdo orgânico para Instagram e creator que entende a relação entre comunidade, identificação e confiança.

2. A MARCA PESSOAL
Creator e modelo com atuação nos universos de beleza, cabelos, cuidados com a pele, bem-estar e lifestyle.
O conteúdo transmite uma mulher real, interessante, confiante, espontânea e visualmente marcante, que aproxima as pessoas e constrói uma comunidade que confia nas experiências e recomendações dela, para além de publicidade e parcerias.
A imagem profissional combina: beleza e autocuidado; cabelos cacheados e cuidados capilares; cuidados com a pele; rotina, hábitos e bem-estar; lifestyle, movimento e experiências reais; bastidores e processos pessoais; evolução e aprendizados compartilhados de forma autêntica.
O cabelo é parte importante do posicionamento, especialmente a experiência de uma mulher cacheada com cabelo quimicamente tratado e colorido. Não transforme todos os conteúdos em assuntos sobre cabelo: o perfil transmite uma personalidade completa.

3. IDENTIDADE DE COMUNICAÇÃO
Escreva como alguém que conversa naturalmente com a comunidade. Tom: natural e próximo; feminino sem ser infantilizado; confiante sem ser arrogante; informativo sem ser professoral; solar e leve quando o assunto permitir; pessoal e reflexivo quando a história pedir; inteligente, observador e específico; espontâneo sem parecer desleixado.
Prefira frases que uma pessoa realmente falaria, em português brasileiro contemporâneo. Evite linguagem publicitária, corporativa, formal, motivacional ou artificial, e expressões genéricas só porque são populares.
Evite repetir: "Você precisa saber disso", "Ninguém te conta isso", "Salva esse post", "Vem comigo", "Se permita", "A sua melhor versão", "Transforme sua rotina", "Não é sobre X, é sobre Y", "Três dicas que vão mudar sua vida". Só use quando forem genuinamente adequadas e não houver opção mais original.
Não use a palavra "estética" repetidamente. Não deixe todos os textos com o mesmo ritmo, estrutura ou personalidade.
Nunca use travessão (o traço longo) em nenhum texto: use vírgula, dois pontos ou ponto.

4. IDENTIDADE VISUAL
A identidade visual se baseia nas referências reais do Instagram dela, quando enviadas como imagens. Analise paleta, tipografia e hierarquia, fundos lisos, fotografias e texturas, respiro visual, alinhamento e posição dos títulos, quantidade de texto por slide, tratamento das fotos, elementos gráficos, contraste e legibilidade, alternância entre slides fotográficos e tipográficos, e o que torna o conteúdo reconhecível. Identifique padrões recorrentes, não detalhes isolados. Não invente uma identidade nova se já houver uma definida e não copie o design de outros criadores.
Sem referências suficientes, use uma direção provisória com a paleta do portfólio dela (creme #f3eee9, tinta #14110d, marrom #4d301b, cinza #808080) e diga, no campo de observações, o que ainda precisa ser validado.
Prioridades: coerência com o feed atual; legibilidade no celular; hierarquia clara; personalidade e originalidade; unidade entre os slides; facilidade de execução.

5. OBJETIVOS
Cada carrossel tem UM objetivo principal (atrair pessoas alinhadas ao perfil, gerar identificação e compartilhamentos, incentivar salvamentos, criar conversa nos comentários, fortalecer autoridade em beleza e cuidados, compartilhar experiências e aprendizados, aproximar a comunidade da rotina, fortalecer a imagem profissional para marcas, apoiar campanhas comerciais sem virar catálogo). Escolha uma prioridade e construa para ela.

6. PILARES EDITORIAIS
A. Cabelos (cachos, finalização, frizz, volume, coloração, química, ressecamento, produtos, rotina capilar, aprendizados reais).
B. Pele e beleza (cuidados com a pele, produtos, experiências de uso, autocuidado, descobertas).
C. Lifestyle e rotina (bastidores, rotina real, hábitos, treino, movimento, experiências, organização, personalidade).
D. Bem-estar e experiências pessoais (processos, desafios e aprendizados que ela realmente esteja vivendo).
E. Conteúdo profissional e criativo (bastidores de gravações, produção de conteúdo, experiências como modelo e creator, criar conteúdo para marcas).
F. Alimentação e acompanhamento pessoal (como narrativa pessoal, sem regras universais nem aconselhamento médico).

7. COMO CRIAR
Antes de escrever, defina: a ideia central; para quem é relevante; a situação, dúvida, desejo ou incômodo que gera identificação; a perspectiva original; o que a pessoa ganha ao continuar lendo; o objetivo principal; o tipo de capa.
Não comece com lista genérica de dicas se houver uma história, observação ou situação específica mais interessante. Combine experiência pessoal, utilidade e personalidade. Preserve a voz e os fatos que ela fornecer.
NUNCA invente histórias, resultados, opiniões, testes de produtos, depoimentos, acontecimentos ou experiências em nome dela. Se faltar uma informação essencial para escrever algo verdadeiro, deixe o trecho neutro e coloque a pergunta direta no campo "perguntas".

8. ESTRUTURA DOS SLIDES
Use a quantidade necessária, como padrão de 5 a 9 slides. Slide 1: capa com título que desperte curiosidade, identificação ou desejo de continuar. Intermediários: cada um cumpre uma função narrativa. Penúltimo: conclusão, mudança de perspectiva ou síntese. Último: fechamento coerente (pergunta, reflexão, convite à conversa ou conclusão memorável). É referência, não fórmula. Não crie slides para completar quantidade, não repita a mesma ideia com outras palavras, evite parágrafos longos sem reduzir tudo a frases curtas sem profundidade.

9. CAPAS E GANCHOS
Títulos concretos e naturais, enxutos, que representem fielmente o conteúdo. Explore identificação cotidiana, curiosidade específica, contraste entre expectativa e realidade, opinião pessoal, erro ou aprendizado, processo real, pergunta que desperte reconhecimento. Sem clickbait, exagero, falsa polêmica ou promessa milagrosa.

10. DIREÇÃO DE ARTE DE CADA SLIDE
Para cada slide: o texto exato da arte; a função na narrativa; a composição (foto de fundo com título sobreposto, fundo tipográfico minimalista, texto com foto menor, detalhe de produto ou objeto); qual das fotos enviadas usar (ou nenhuma); hierarquia e posição; observações de legibilidade. Alterne texto e imagem para criar ritmo.
Não recomende uma foto pessoal específica que não tenha sido enviada: quando faltar imagem, descreva o tipo de foto que ela deve produzir ou selecionar. Não dependa de imagens geradas por IA.

11. FORMATO TÉCNICO
Formato vertical 4:5 por padrão (salvo pedido diferente), área segura generosa, tipografia legível em tela pequena, sem excesso de elementos, sombras, fontes e cores. Não invente códigos de cor ou nomes de fontes do perfil dela sem referências.

12. LEGENDA E CTA
Crie uma legenda complementar, que não repita os slides: aprofunde uma experiência, dê contexto, uma reflexão ou inicie uma conversa. A CTA combina com o conteúdo; para comentários, use perguntas específicas e fáceis de responder; convide a salvar ou compartilhar só quando fizer sentido. Não transforme todo carrossel em tentativa explícita de viralização.

13. PRECISÃO E RESPONSABILIDADE
Diferencie experiência pessoal, opinião e informação comprovada. Em saúde, alimentação e bem-estar, sem diagnósticos, sem promessas de tratamento e sem generalizar a experiência dela. Não invente estatísticas, fontes ou evidências. Em conteúdo comercial, respeite o briefing, os benefícios comprovados e as regras de publicidade.

14. COMO RESPONDER
Com só um tema, desenvolva a proposta completa (ângulo, capa, slides, direção visual, legenda). Com ideia confusa, encontre o ponto central antes de escrever. Com pedido de revisão, preserve o que já funciona e altere só o necessário. Com informação suficiente, tome decisões criativas e entregue uma primeira versão completa.

15. CONTROLE DE QUALIDADE (antes de entregar)
A capa desperta interesse sem exagerar? Há uma ideia central clara? Os slides avançam a narrativa? A linguagem é natural e compatível com ela? Há algo específico que torna a proposta original? O texto é enxuto sem perder profundidade? A direção visual combina com as referências? Há equilíbrio entre foto, texto e espaço vazio? O conteúdo entrega o que a capa promete? A CTA é coerente? Todas as afirmações têm fundamento? O conteúdo fortalece a marca pessoal dela? Se estiver genérico, repetitivo, artificial ou desconectado do perfil, refine antes de entregar.

16. RESULTADO ESPERADO
Carrosséis com personalidade, estratégia e direção visual clara, que pareçam parte natural do Instagram dela e que as pessoas reconheçam como dela. A identidade visual atual e as referências reais têm prioridade sobre qualquer tendência ou fórmula genérica.

FORMATO DA RESPOSTA
Responda sempre no formato JSON pedido. Em cada slide: "titulo" é o texto principal da arte (curto) e "texto" o texto de apoio (pode ser vazio); "destaque" é UMA palavra ou expressão curta do título que deve ganhar a cor de destaque (ou vazio); "foto" é o número da foto enviada a usar (1 para a primeira) ou 0 para nenhuma. Nas cores do campo "visual", use apenas códigos hexadecimais de 6 dígitos (#rrggbb).`;

// ---------------------------------------------------------------------
//  O FORMATO FIXO DA RESPOSTA (o Claude devolve exatamente isto)
// ---------------------------------------------------------------------
const TEXTO = { type: "string" };
const FORMATO = {
  type: "object",
  additionalProperties: false,
  required: ["titulo_interno", "ideia_central", "objetivo", "pilar", "perguntas", "visual", "slides", "legenda", "cta", "observacoes"],
  properties: {
    titulo_interno: TEXTO,
    ideia_central: TEXTO,
    objetivo: TEXTO,
    pilar: TEXTO,
    perguntas: { type: "array", items: TEXTO },
    visual: {
      type: "object",
      additionalProperties: false,
      required: ["fundo", "texto", "destaque", "fonte_titulo", "direcao"],
      properties: {
        fundo: TEXTO,
        texto: TEXTO,
        destaque: TEXTO,
        fonte_titulo: { type: "string", enum: ["serif", "sans"] },
        direcao: TEXTO,
      },
    },
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["funcao", "titulo", "texto", "destaque", "composicao", "foto", "posicao", "alinhamento", "direcao_arte", "foto_sugerida"],
        properties: {
          funcao: TEXTO,
          titulo: TEXTO,
          texto: TEXTO,
          destaque: TEXTO,
          composicao: { type: "string", enum: ["foto_fundo", "tipografico", "foto_menor", "detalhe"] },
          foto: { type: "integer" },
          posicao: { type: "string", enum: ["topo", "meio", "base"] },
          alinhamento: { type: "string", enum: ["esquerda", "centro"] },
          direcao_arte: TEXTO,
          foto_sugerida: TEXTO,
        },
      },
    },
    legenda: TEXTO,
    cta: TEXTO,
    observacoes: TEXTO,
  },
};

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

// Só aceita imagens guardadas no Supabase do projeto (pasta "midia")
function linkDeImagem(u: unknown, urlSupabase: string): string {
  const t = String(u ?? "").trim();
  return t.startsWith(`${urlSupabase}/storage/v1/object/public/midia/`) ? t : "";
}

// ---------------------------------------------------------------------
//  O PEDIDO
// ---------------------------------------------------------------------
export async function tratar(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cabecalhosCors(req) });
  if (req.method !== "POST") return responder(req, { ok: false, erro: "Use o método POST." }, 405);

  // 1) QUEM ESTÁ CHAMANDO? Só a Esther, logada.
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return responder(req, { ok: false, codigo: "sem_login", erro: "Entre no painel para criar carrosséis." }, 401);
  const urlSupabase = Deno.env.get("SUPABASE_URL") ?? "";
  const chaveSupabase = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!urlSupabase || !chaveSupabase) {
    return responder(req, { ok: false, codigo: "configuracao", erro: "A função está sem a configuração do Supabase." }, 500);
  }
  const { createClient } = await import("npm:@supabase/supabase-js@2");
  const sb = createClient(urlSupabase, chaveSupabase, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: dadosUsuario, error: erroUsuario } = await sb.auth.getUser(token);
  const usuario = dadosUsuario?.user;
  if (erroUsuario || !usuario) {
    return responder(req, { ok: false, codigo: "sem_login", erro: "Sua sessão não vale mais. Entre de novo no painel." }, 401);
  }
  if (String(usuario.email ?? "").toLowerCase() !== EMAIL_DA_DONA) {
    return responder(req, { ok: false, codigo: "nao_autorizado", erro: "Só a Esther pode criar carrosséis por aqui." }, 403);
  }

  const chaveAnthropic = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!chaveAnthropic) {
    return responder(req, { ok: false, codigo: "sem_chave", erro: "Falta guardar a chave da Anthropic no cofre do Supabase (Edge Functions, Secrets, nome ANTHROPIC_API_KEY)." }, 500);
  }

  // 2) O QUE ELA PEDIU
  let pedido: any;
  try { pedido = await req.json(); } catch (_e) {
    return responder(req, { ok: false, codigo: "pedido", erro: "O pedido chegou sem dados." }, 400);
  }
  const comando = String(pedido?.comando ?? "").trim().slice(0, 4000);
  if (!comando) return responder(req, { ok: false, codigo: "pedido", erro: "Escreva o que você quer no carrossel." }, 400);
  const objetivo = String(pedido?.objetivo ?? "").trim().slice(0, 200);
  const pilar = String(pedido?.pilar ?? "").trim().slice(0, 200);
  const proporcao = ["4:5", "1:1", "9:16"].includes(pedido?.proporcao) ? pedido.proporcao : "4:5";
  const fotos = (Array.isArray(pedido?.fotos) ? pedido.fotos : []).map((u: unknown) => linkDeImagem(u, urlSupabase)).filter(Boolean).slice(0, MAX_FOTOS);
  const referencias = (Array.isArray(pedido?.referencias) ? pedido.referencias : []).map((u: unknown) => linkDeImagem(u, urlSupabase)).filter(Boolean).slice(0, MAX_REFERENCIAS);
  const atual = pedido?.atual && typeof pedido.atual === "object" ? pedido.atual : null;   // revisão de um carrossel que já existe

  // 3) MONTA A MENSAGEM: referências, fotos numeradas e o pedido
  const conteudo: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (referencias.length) {
    conteudo.push({ type: "text", text: `REFERÊNCIAS VISUAIS DO FEED DA ESTHER (${referencias.length} prints). Use para a identidade visual; não são fotos para os slides:` });
    referencias.forEach((url: string) => conteudo.push({ type: "image", source: { type: "url", url } }));
  } else {
    conteudo.push({ type: "text", text: "Nenhuma referência do feed foi enviada desta vez: use a direção provisória e diga o que precisa ser validado." });
  }
  if (fotos.length) {
    conteudo.push({ type: "text", text: `FOTOS DISPONÍVEIS PARA OS SLIDES (${fotos.length}). Na resposta, "foto" usa estes números:` });
    fotos.forEach((url: string, i: number) => {
      conteudo.push({ type: "text", text: `Foto ${i + 1}:` });
      conteudo.push({ type: "image", source: { type: "url", url } });
    });
  } else {
    conteudo.push({ type: "text", text: "Nenhuma foto foi enviada: use \"foto\": 0 em todos os slides e descreva em \"foto_sugerida\" o tipo de foto que ela deve produzir." });
  }
  const linhas = [
    atual ? "PEDIDO DE REVISÃO de um carrossel que já existe (preserve o que funciona e altere só o necessário):" : "PEDIDO DA ESTHER:",
    comando,
    objetivo ? `Objetivo escolhido por ela: ${objetivo}` : "Objetivo: escolha o mais adequado.",
    pilar ? `Pilar escolhido por ela: ${pilar}` : "Pilar: escolha o mais adequado.",
    `Proporção dos slides: ${proporcao}.`,
  ];
  if (atual) linhas.push("CARROSSEL ATUAL (JSON):", JSON.stringify(atual).slice(0, 20000));
  conteudo.push({ type: "text", text: linhas.join("\n") });

  // 4) PEDE AO CLAUDE
  const cliente = new Anthropic({ apiKey: chaveAnthropic });
  let resposta: Anthropic.Beta.BetaMessage;
  try {
    resposta = await cliente.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: FORMATO } },
      system: DIRECAO_CRIATIVA,
      messages: [{ role: "user", content: conteudo }],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return responder(req, { ok: false, codigo: "chave", erro: "A chave da Anthropic guardada no Supabase não funcionou. Confira se ela foi copiada inteira." }, 502);
    }
    if (e instanceof Anthropic.RateLimitError) {
      return responder(req, { ok: false, codigo: "limite", erro: "Muitos pedidos em pouco tempo, ou o crédito da conta da Anthropic acabou. Espere um pouco e tente de novo." }, 429);
    }
    if (e instanceof Anthropic.BadRequestError) {
      const msg = String(e.message ?? "");
      if (/credit|billing|balance/i.test(msg)) {
        return responder(req, { ok: false, codigo: "credito", erro: "A conta da Anthropic está sem crédito. Coloque crédito em console.anthropic.com e tente de novo." }, 402);
      }
      if (/image|url|download|fetch/i.test(msg)) {
        return responder(req, { ok: false, codigo: "imagem", erro: "Uma das fotos não pôde ser lida. Tente enviar a foto de novo (JPG ou PNG)." }, 400);
      }
      console.error(msg);
      return responder(req, { ok: false, codigo: "pedido_ia", erro: "O pedido não foi aceito pela IA. Tente escrever de outro jeito." }, 400);
    }
    if (e instanceof Anthropic.APIError) {
      console.error(e.status, e.message);
      return responder(req, { ok: false, codigo: "ia_fora", erro: "A IA está indisponível agora. Tente de novo em alguns minutos." }, 503);
    }
    throw e;
  }

  if (resposta.stop_reason === "refusal") {
    return responder(req, { ok: false, codigo: "recusa", erro: "A IA não quis criar este carrossel. Tente reescrever o pedido." }, 422);
  }
  if (resposta.stop_reason === "max_tokens") {
    return responder(req, { ok: false, codigo: "longo", erro: "O carrossel ficou longo demais para uma resposta. Peça menos slides ou um texto mais curto." }, 422);
  }
  const bloco = resposta.content.find((b) => b.type === "text");
  let carrossel: any = null;
  try { carrossel = JSON.parse(bloco && bloco.type === "text" ? bloco.text : ""); } catch (_e) { carrossel = null; }
  if (!carrossel || !Array.isArray(carrossel.slides) || !carrossel.slides.length) {
    return responder(req, { ok: false, codigo: "formato", erro: "A resposta da IA veio incompleta. Tente de novo." }, 502);
  }
  return responder(req, { ok: true, carrossel, fotos, modelo: resposta.model });
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

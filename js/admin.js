/* =========================================================
   PAINEL DA ESTHER (admin)
   Tudo em JavaScript puro. Este arquivo tem, nesta ordem:
   1. conferência da sessão (a primeira coisa que roda)
   2. ferramentas comuns (datas, dinheiro, textos seguros)
   3. conversa com o banco, com avisos amigáveis
   4. janelas, formulários e avisos rápidos
   5. menu lateral e troca de abas
   6. as 5 abas: Portfólio, Marcas, Calendário, Campanhas, Checklist
   ========================================================= */
(function () {
  'use strict';

  var banco = window.banco;
  var EMAIL_DA_DONA = String((window.BANCO_CONFIG && window.BANCO_CONFIG.emailDaDona) || '').toLowerCase();

  /* ---------------------------------------------------------
     1. CONFERIR A SESSÃO
     Sem login aberto, manda para a tela de entrar. A página
     só aparece (some a classe "aguarde") depois desta conferência.
     --------------------------------------------------------- */
  function irParaLogin() { location.replace('../login/'); }

  if (!banco) {
    document.documentElement.classList.remove('aguarde');
    document.body.innerHTML = '<p style="padding:2rem;font-family:system-ui,sans-serif">Não consegui carregar o sistema do painel. Confira a internet e recarregue a página.</p>';
    return;
  }

  banco.auth.getSession().then(function (r) {
    var sessao = r && r.data && r.data.session;
    if (!sessao) { irParaLogin(); return; }
    var email = String((sessao.user && sessao.user.email) || '').toLowerCase();
    if (EMAIL_DA_DONA && email !== EMAIL_DA_DONA) {
      return banco.auth.signOut().then(irParaLogin, irParaLogin);
    }
    document.documentElement.classList.remove('aguarde');
    iniciarPainel(sessao);
  }).catch(irParaLogin);

  banco.auth.onAuthStateChange(function (evento) {
    if (evento === 'SIGNED_OUT') irParaLogin();
  });

  /* ---------------------------------------------------------
     2. FERRAMENTAS COMUNS
     --------------------------------------------------------- */
  function $(seletor, raiz) { return (raiz || document).querySelector(seletor); }
  function $$(seletor, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(seletor)); }

  /* Escapa texto para colocar dentro de HTML (protege contra código malicioso vindo do formulário do site) */
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* Deixa passar só negrito e itálico simples nos textos da biblioteca */
  function htmlSeguro(t) {
    return esc(t).replace(/&lt;(\/?)(b|em|strong|i)&gt;/g, '<$1$2>');
  }
  /* Só aceita links que começam com http:// ou https:// */
  function linkSeguro(u) {
    var s = String(u || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function isoLocal(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function hojeISO() { return isoLocal(new Date()); }
  function dataDeISO(iso) { var p = String(iso).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function diasEntre(deISO, paraISO) { return Math.round((dataDeISO(paraISO) - dataDeISO(deISO)) / 86400000); }
  function somarDias(iso, n) { var d = dataDeISO(iso); d.setDate(d.getDate() + n); return isoLocal(d); }
  function fmtData(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
  }
  function fmtMoeda(n) { return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function fmtInt(n) { return (Number(n) || 0).toLocaleString('pt-BR'); }
  function comparaTexto(a, b) {
    return String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base' });
  }

  /* Ícones de traço (nada de emoji no menu e nos botões) */
  var ICONES = {
    lapis: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    lixo: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    olho: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    olhoRiscado: '<path d="M17.9 17.9A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A10.7 10.7 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22M14.1 14.1a3 3 0 1 1-4.2-4.2"/>',
    alca: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    busca: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    baixar: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    subir: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>',
    enviar: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    envelope: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    copiar: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    expandir: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    estrela: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    arquivo: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>',
    zap: '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.55L3 20.5l1.5-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
    insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".9" fill="currentColor" stroke="none"/>',
    setaCima: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    setaBaixo: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    ordenar: '<path d="M8 9l4-4 4 4M8 15l4 4 4-4"/>',
    esq: '<path d="m15 18-6-6 6-6"/>',
    dir: '<path d="m9 18 6-6-6-6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    externo: '<path d="M7 17 17 7M8 7h9v9"/>',
    fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
    alerta: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'
  };
  function ic(nome, extra) {
    return '<svg class="ic' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONES[nome] || '') + '</svg>';
  }

  /* ---------------------------------------------------------
     3. CONVERSA COM O BANCO (com avisos amigáveis)
     Se faltar uma tabela ou um campo, o painel NÃO abre em branco:
     ele avisa o que faltou e continua funcionando no resto.
     --------------------------------------------------------- */
  var cache = {};       /* últimas listas carregadas, por tabela */
  var problemas = {};   /* tabela -> aviso amigável */

  function descreverErro(tabela, erro) {
    var cod = String((erro && erro.code) || '');
    var msg = String((erro && erro.message) || '');
    var arquivoSql = tabela === 'site_conteudo' ? 'banco-2.sql' : (/^email_/.test(tabela) ? 'disparo.sql' : (tabela === 'mensagens_site' ? 'contato.sql' : 'banco.sql'));
    var col = /find the '([^']+)' column/i.exec(msg) || /column "?([\w]+)"? (?:of relation "?\w+"? )?does not exist/i.exec(msg);
    if (tabela === 'marcas' && col && /^(nicho|favorita|selecionada)$/.test(col[1])) arquivoSql = 'disparo.sql';
    if (tabela === 'videos' && col && /^(capa|em_destaques)$/.test(col[1])) arquivoSql = 'videos-site.sql';
    if (cod === 'PGRST205' || cod === '42P01' || /could not find the table|relation "[^"]*" does not exist/i.test(msg)) {
      return 'A tabela "' + tabela + '" ainda não existe no seu banco. Cole o arquivo ' + arquivoSql + ' no SQL Editor do Supabase e clique em Run.';
    }
    if (cod === 'PGRST204' || cod === '42703' || col) {
      return 'Falta o campo "' + (col ? col[1] : 'desconhecido') + '" na tabela "' + tabela + '". Rode o arquivo ' + arquivoSql + ' de novo no Supabase.';
    }
    if (cod === '42501' || /permission denied|row-level security/i.test(msg)) {
      return 'O banco não liberou o acesso à tabela "' + tabela + '". Confira se você entrou com o e-mail certo e se o banco.sql foi rodado inteiro.';
    }
    if (cod === '23502') return 'Falta preencher um campo obrigatório.';
    if (cod === '23514' || cod === '22P02' || cod === '22007') return 'Algum valor não foi aceito pelo banco. Confira os campos e tente de novo.';
    if (/jwt|token/i.test(msg) && /expired|invalid/i.test(msg)) return 'Sua sessão terminou. Entre de novo.';
    if (/failed to fetch|networkerror|network request/i.test(msg)) return 'Sem conexão com o banco agora. Confira a internet e tente de novo.';
    return 'Não consegui falar com a tabela "' + tabela + '" agora. Tente de novo em instantes.';
  }

  /* Lê uma tabela inteira. Nunca lança erro: se falhar, devolve lista vazia e guarda o aviso. */
  async function listar(tabela, forcar) {
    if (!forcar && cache[tabela]) return cache[tabela];
    try {
      var r = await banco.from(tabela).select('*').limit(1000);
      if (r.error) {
        problemas[tabela] = descreverErro(tabela, r.error);
        cache[tabela] = [];
      } else {
        delete problemas[tabela];
        cache[tabela] = r.data || [];
      }
    } catch (e) {
      problemas[tabela] = descreverErro(tabela, e);
      cache[tabela] = [];
    }
    return cache[tabela];
  }

  /* Cria ou atualiza uma linha. Devolve { ok, erro } */
  async function gravar(tabela, campos, id) {
    try {
      var r = id
        ? await banco.from(tabela).update(campos).eq('id', id)
        : await banco.from(tabela).insert(campos);
      if (r.error) return { ok: false, erro: descreverErro(tabela, r.error) };
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: descreverErro(tabela, e) };
    }
  }

  async function apagar(tabela, id) {
    try {
      var r = await banco.from(tabela).delete().eq('id', id);
      if (r.error) return { ok: false, erro: descreverErro(tabela, r.error) };
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: descreverErro(tabela, e) };
    }
  }

  /* Marca ou desmarca a caixinha "selecionada" de várias marcas de uma vez.
     ids = lista de ids, ou null para tirar a seleção de TODAS as que estão selecionadas. */
  async function gravarSelecaoMarcas(ids, valor) {
    try {
      if (ids === null) {
        var r0 = await banco.from('marcas').update({ selecionada: false }).eq('selecionada', true);
        return r0.error ? { ok: false, erro: descreverErro('marcas', r0.error) } : { ok: true };
      }
      for (var i = 0; i < ids.length; i += 100) {
        var r = await banco.from('marcas').update({ selecionada: valor }).in('id', ids.slice(i, i + 100));
        if (r.error) return { ok: false, erro: descreverErro('marcas', r.error) };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: descreverErro('marcas', e) };
    }
  }

  /* Mostra, no topo, o que faltou nas tabelas da aba aberta */
  function mostrarProblemas(tabelas) {
    var lista = (tabelas || []).filter(function (t) { return problemas[t]; }).map(function (t) { return problemas[t]; });
    var area = $('#avisos');
    if (!lista.length) { area.innerHTML = ''; return; }
    area.innerHTML = '<div class="aviso grave" role="alert"><strong>Atenção: falta alguma coisa no banco</strong>' +
      '<ul>' + lista.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      '<span>O resto do painel continua funcionando.</span></div>';
  }

  /* ---------------------------------------------------------
     4. JANELAS, FORMULÁRIOS E AVISOS RÁPIDOS
     --------------------------------------------------------- */
  function aviso(texto, tipo) {
    var caixa = $('#avisosRapidos');
    var el = document.createElement('div');
    el.className = 'rapido' + (tipo === 'erro' ? ' erro' : '');
    el.textContent = texto;
    caixa.appendChild(el);
    setTimeout(function () { el.remove(); }, tipo === 'erro' ? 7000 : 3500);
  }

  var modal, modalAoFechar = null;

  function abrirModal(opc) {
    $('#modalTitulo').textContent = opc.titulo || '';
    modal.classList.toggle('largo', !!opc.largo);
    var corpo = $('#modalCorpo');
    corpo.innerHTML = '';
    if (typeof opc.corpo === 'string') corpo.innerHTML = opc.corpo; else if (opc.corpo) corpo.appendChild(opc.corpo);
    var rod = $('#modalRodape');
    rod.innerHTML = '';
    (opc.botoes || []).forEach(function (b) {
      var bt = document.createElement('button');
      bt.type = 'button';
      bt.className = 'btn' + (b.classe ? ' ' + b.classe : '') + (b.esquerda ? ' esq' : '');
      bt.textContent = b.rotulo;
      bt.addEventListener('click', function () { b.aoClicar(bt); });
      rod.appendChild(bt);
    });
    rod.hidden = !(opc.botoes && opc.botoes.length);
    modalAoFechar = opc.aoFechar || null;
    if (!modal.open) modal.showModal();
    corpo.scrollTop = 0;
    return { corpo: corpo, rodape: rod };
  }
  function fecharModal() { if (modal.open) modal.close(); }

  /* Pergunta "tem certeza?" numa janelinha própria (devolve true ou false) */
  function confirmar(texto, rotulo) {
    return new Promise(function (resolve) {
      var d = document.createElement('dialog');
      d.className = 'modal';
      d.innerHTML = '<div class="modal-caixa"><div class="modal-corpo"><p>' + esc(texto) + '</p></div>' +
        '<div class="modal-rodape"><button type="button" class="btn" data-r="0">Cancelar</button>' +
        '<button type="button" class="btn perigo" data-r="1">' + esc(rotulo || 'Apagar') + '</button></div></div>';
      document.body.appendChild(d);
      var fim = function (v) { if (d.open) d.close(); d.remove(); resolve(v); };
      d.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-r]');
        if (b) fim(b.getAttribute('data-r') === '1'); else if (e.target === d) fim(false);
      });
      d.addEventListener('cancel', function (e) { e.preventDefault(); fim(false); });
      d.showModal();
      $('[data-r="0"]', d).focus();
    });
  }

  function campoHTML(c, valor) {
    var id = 'f_' + c.nome;
    var largo = c.largo ? ' largo' : '';
    var v = valor == null ? '' : valor;
    if (c.tipo === 'checkbox') {
      return '<div class="campo marcar' + largo + '"><input type="checkbox" id="' + id + '" name="' + c.nome + '"' + (valor ? ' checked' : '') + '><label for="' + id + '">' + esc(c.rotulo) + '</label></div>';
    }
    var rotulo = '<label for="' + id + '">' + esc(c.rotulo) + (c.obrigatorio ? ' *' : '') + '</label>';
    var ajuda = c.ajuda ? '<span class="ajuda">' + esc(c.ajuda) + '</span>' : '';
    var entrada;
    if (c.tipo === 'select') {
      entrada = '<select id="' + id + '" name="' + c.nome + '">' + (c.opcoes || []).map(function (o) {
        var val = typeof o === 'object' ? o.v : o, txt = typeof o === 'object' ? o.t : o;
        return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(txt) + '</option>';
      }).join('') + '</select>';
    } else if (c.tipo === 'textarea') {
      entrada = '<textarea id="' + id + '" name="' + c.nome + '" placeholder="' + esc(c.placeholder || '') + '">' + esc(v) + '</textarea>';
    } else {
      var lista = c.lista ? ' list="dl_' + c.nome + '"' : '';
      var extra = (c.passo ? ' step="' + c.passo + '"' : '') + (c.minimo != null ? ' min="' + c.minimo + '"' : '');
      entrada = '<input type="' + (c.tipo || 'text') + '" id="' + id + '" name="' + c.nome + '" value="' + esc(v) + '" placeholder="' + esc(c.placeholder || '') + '"' + lista + extra + ' autocomplete="off">';
      if (c.lista) entrada += '<datalist id="dl_' + c.nome + '">' + c.lista.map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist>';
    }
    return '<div class="campo' + largo + '">' + rotulo + entrada + ajuda + '</div>';
  }

  /* Abre um formulário na janela. opc: titulo, campos, valores, aoSalvar(valores), aoApagar() */
  function formulario(opc) {
    var v = opc.valores || {};
    var html = '<form id="formularioModal" novalidate><div class="grade-campos">' +
      opc.campos.map(function (c) { return campoHTML(c, v[c.nome]); }).join('') + '</div></form>';
    var botoes = [];
    if (opc.aoApagar) {
      botoes.push({
        rotulo: 'Apagar', classe: 'perigo', esquerda: true,
        aoClicar: async function () {
          var certo = await confirmar(opc.textoApagar || 'Apagar este item? Não dá para desfazer.');
          if (!certo) return;
          var r = await opc.aoApagar();
          if (r && r.ok === false) { aviso(r.erro || 'Não consegui apagar.', 'erro'); return; }
          fecharModal();
        }
      });
    }
    botoes.push({ rotulo: 'Cancelar', aoClicar: fecharModal });
    botoes.push({
      rotulo: opc.rotuloSalvar || 'Salvar', classe: 'principal-btn',
      aoClicar: function (bt) { enviar(bt); }
    });
    var partes = abrirModal({ titulo: opc.titulo, corpo: html, botoes: botoes });
    var form = $('#formularioModal', partes.corpo);
    var primeiro = $('input:not([type=checkbox]),select,textarea', form);
    if (primeiro && !opc.semFoco) primeiro.focus();
    form.addEventListener('submit', function (e) { e.preventDefault(); enviar($('.principal-btn', partes.rodape)); });

    function ler() {
      var out = {};
      opc.campos.forEach(function (c) {
        var el = form.elements[c.nome];
        if (c.tipo === 'checkbox') out[c.nome] = !!el.checked;
        else if (c.tipo === 'number') out[c.nome] = el.value === '' ? null : Number(String(el.value).replace(',', '.'));
        else { var t = String(el.value).trim(); out[c.nome] = t === '' ? null : t; }
      });
      return out;
    }
    async function enviar(bt) {
      var valores = ler();
      for (var i = 0; i < opc.campos.length; i++) {
        var c = opc.campos[i];
        if (c.obrigatorio && (valores[c.nome] == null || valores[c.nome] === '')) {
          aviso('Preencha o campo "' + c.rotulo + '".', 'erro');
          form.elements[c.nome].focus();
          return;
        }
      }
      bt.disabled = true;
      var r;
      try { r = await opc.aoSalvar(valores); } catch (e) { r = { ok: false, erro: 'Não consegui salvar agora.' }; }
      bt.disabled = false;
      if (r && r.ok === false) { aviso(r.erro || 'Não consegui salvar.', 'erro'); return; }
      fecharModal();
    }
  }

  /* Arrastar linhas de uma tabela pela alça (funciona com mouse e com o dedo).
     Também dá para usar o teclado: setas para cima e para baixo na alça. */
  function ativarArrastar(tbody, aoSoltar) {
    function ids() { return $$('tr[data-id]', tbody).map(function (tr) { return tr.getAttribute('data-id'); }); }
    tbody.addEventListener('pointerdown', function (e) {
      var alca = e.target.closest('.alca');
      if (!alca || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var tr = alca.closest('tr');
      e.preventDefault();
      try { alca.setPointerCapture(e.pointerId); } catch (x) { /* segue sem captura */ }
      tr.classList.add('arrastando');
      var mover = function (ev) {
        var alvo = document.elementFromPoint(ev.clientX, ev.clientY);
        var outra = alvo && alvo.closest ? alvo.closest('tr[data-id]') : null;
        if (outra && outra !== tr && outra.parentNode === tbody) {
          var r = outra.getBoundingClientRect();
          tbody.insertBefore(tr, ev.clientY > r.top + r.height / 2 ? outra.nextSibling : outra);
        }
      };
      var soltar = function () {
        tr.classList.remove('arrastando');
        alca.removeEventListener('pointermove', mover);
        alca.removeEventListener('pointerup', soltar);
        alca.removeEventListener('pointercancel', soltar);
        aoSoltar(ids());
      };
      alca.addEventListener('pointermove', mover);
      alca.addEventListener('pointerup', soltar);
      alca.addEventListener('pointercancel', soltar);
    });
    tbody.addEventListener('keydown', function (e) {
      var alca = e.target.closest('.alca');
      if (!alca || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      var tr = alca.closest('tr');
      var vizinha = e.key === 'ArrowUp' ? tr.previousElementSibling : tr.nextElementSibling;
      if (!vizinha) return;
      tbody.insertBefore(tr, e.key === 'ArrowUp' ? vizinha : vizinha.nextSibling);
      $('.alca', tr).focus();
      aoSoltar(ids());
    });
  }

  /* Baixa um texto como arquivo. O "﻿" no começo faz o Excel abrir com acento certinho. */
  function baixarCSV(nomeArquivo, linhas) {
    var conteudo = '﻿' + linhas.map(function (l) { return l.join(';'); }).join('\r\n');
    var blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  /* Uma célula de CSV: aspas certas e proteção contra "fórmulas" vindas do formulário do site */
  function celulaCSV(valor, ehTelefone) {
    var s = valor == null ? '' : String(valor);
    var pareceTelefone = ehTelefone && /^[+\-]?[\d\s().\-]+$/.test(s);
    if (!pareceTelefone && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  /* ---------------------------------------------------------
     5. MENU LATERAL E TROCA DE ABAS
     --------------------------------------------------------- */
  var Abas = {};   /* cada aba se registra aqui: Abas.nome = { titulo, tabelas, abrir(secao) } */
  var abaAberta = '';

  function fecharGaveta() {
    $('#lateral').classList.remove('aberta');
    $('#fundoGaveta').hidden = true;
    $('#botaoMenu').setAttribute('aria-expanded', 'false');
    $('#botaoMenu').setAttribute('aria-label', 'Abrir menu');
  }
  function abrirGaveta() {
    $('#lateral').classList.add('aberta');
    $('#fundoGaveta').hidden = false;
    $('#botaoMenu').setAttribute('aria-expanded', 'true');
    $('#botaoMenu').setAttribute('aria-label', 'Fechar menu');
  }

  async function mostrarAba(nome) {
    if (!Abas[nome]) nome = 'resumo';
    var aba = Abas[nome];
    abaAberta = nome;
    $$('.nav-item').forEach(function (a) {
      if (a.getAttribute('data-aba') === nome) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    Object.keys(Abas).forEach(function (n) { var s = $('#aba-' + n); if (s) s.hidden = n !== nome; });
    $('#tituloAba').textContent = aba.titulo;
    document.title = aba.titulo + ' | Painel Esther Custódio';
    $('#avisos').innerHTML = '';
    fecharGaveta();
    var secao = $('#aba-' + nome);
    try {
      await aba.abrir(secao);
    } catch (erro) {
      if (window.console) console.error(erro);
      secao.innerHTML = '<div class="aviso grave" role="alert"><strong>Esta aba teve um problema para abrir.</strong>Recarregue a página. Se continuar, me chame para dar uma olhada. O resto do painel segue funcionando.</div>';
    }
    if (abaAberta === nome) mostrarProblemas(aba.tabelas);
  }

  function iniciarPainel(sessao) {
    modal = $('#modal');
    $('#emailUsuario').textContent = (sessao.user && sessao.user.email) || '';

    modal.addEventListener('click', function (e) { if (e.target === modal) fecharModal(); });
    modal.addEventListener('close', function () { if (modalAoFechar) { var f = modalAoFechar; modalAoFechar = null; f(); } });
    $('#modalFechar').addEventListener('click', fecharModal);

    $('#botaoSair').addEventListener('click', function () {
      banco.auth.signOut().then(irParaLogin, irParaLogin);
    });
    $('#botaoMenu').addEventListener('click', function () {
      if ($('#lateral').classList.contains('aberta')) fecharGaveta(); else abrirGaveta();
    });
    $('#fundoGaveta').addEventListener('click', fecharGaveta);
    $$('.nav-item').forEach(function (a) { a.addEventListener('click', fecharGaveta); });   /* tocar numa aba fecha a gaveta, mesmo se ela já estiver aberta */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('#lateral').classList.contains('aberta')) { fecharGaveta(); $('#botaoMenu').focus(); }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (e) { if (e.matches) fecharGaveta(); });

    window.addEventListener('hashchange', function () { mostrarAba(location.hash.replace('#', '')); });
    mostrarAba(location.hash.replace('#', '') || 'resumo');
  }

  /* A partir daqui vêm as abas. Todas usam as ferramentas acima. */

  /* ---------------------------------------------------------
     VÍDEOS DO SITE: campos e formulário
     Usados na aba Portfólio e no cartão "Vídeos do site" (Conteúdo do site).
     --------------------------------------------------------- */
  var NICHOS_DO_SITE = [   /* os mesmos nichos que o site usa quando você ainda não editou a lista */
    { nome: 'Cabelo', subtitulo: 'Cor, cuidado e rotina para os fios' },
    { nome: 'Skincare', subtitulo: 'Cuidados com a pele que entram na rotina' },
    { nome: 'Maquiagem', subtitulo: 'Maquiagem no dia a dia' },
    { nome: 'Saúde & Fitness', subtitulo: 'Treino, suplementos e bem-estar na rotina' },
    { nome: 'Moda & Acessórios', subtitulo: 'Looks, calçados e acessórios em uso real' },
    { nome: 'Aplicativos', subtitulo: 'Apps e serviços mostrados na prática' },
    { nome: 'Fábrica', subtitulo: 'Os bastidores de como os produtos são feitos' }
  ];

  /* Os campos "capa" e "em_destaques" vêm do videos-site.sql. Sem ele, o formulário some com esses dois campos. */
  function videosTemCamposNovos() {
    var v = cache.videos || [];
    return v.length > 0 && 'em_destaques' in v[0];
  }

  function camposVideo(videos, novos) {
    var nichos = [];
    videos.forEach(function (v) { if (v.nicho && nichos.indexOf(v.nicho) < 0) nichos.push(v.nicho); });
    var salvos = (cache.site_conteudo || []).filter(function (l) { return l.chave === 'nichos' && Array.isArray(l.valor); })[0];
    (salvos ? salvos.valor : NICHOS_DO_SITE).forEach(function (n) { if (n && n.nome && nichos.indexOf(n.nome) < 0) nichos.push(n.nome); });
    var campos = [
      { nome: 'marca', rotulo: 'Marca', ajuda: 'O nome que aparece no card e acima do vídeo.' },
      { nome: 'titulo', rotulo: 'O que é o vídeo', obrigatorio: true, ajuda: 'Exemplo: Olheira. Se for igual à marca, o card mostra só a marca.' },
      { nome: 'link', rotulo: 'Link do vídeo', tipo: 'url', largo: true, placeholder: 'https://youtube.com/shorts/...', ajuda: 'Link do YouTube: o vídeo toca dentro do seu site, sem abrir o YouTube.' },
      { nome: 'nicho', rotulo: 'Nicho', lista: nichos, ajuda: 'A linha do site onde ele aparece. Vazio: só nos Destaques.' },
      { nome: 'destaque', rotulo: 'Texto do resultado', placeholder: '190 mil visualizações', ajuda: 'Aparece abaixo do card nos Destaques.' }
    ];
    if (novos) {
      campos.push({ nome: 'capa', rotulo: 'Capa (opcional)', largo: true, placeholder: 'img/capas/nome.webp', ajuda: 'Vazio: usa um momento do próprio vídeo. Para trocar, coloque o caminho de uma imagem vertical 9:16 da pasta img do site, ou um endereço que comece com https.' });
      campos.push({ nome: 'em_destaques', rotulo: 'Aparece nos Destaques (carrossel)', tipo: 'checkbox', largo: true });
    }
    campos.push({ nome: 'formato', rotulo: 'Formato', lista: ['Vídeo 9:16', 'Foto 4:5', 'Vídeo 16:9'] });
    campos.push({ nome: 'visivel', rotulo: 'Aparece no site', tipo: 'checkbox', largo: true });
    return campos;
  }

  /* Abre o formulário de um vídeo (video = null para um novo). aposMudar() roda depois de salvar ou apagar. */
  function formularioVideo(video, aposMudar) {
    var videos = cache.videos || [];
    var editando = !!video;
    formulario({
      titulo: editando ? 'Editar vídeo' : 'Adicionar vídeo',
      campos: camposVideo(videos, videosTemCamposNovos()),
      valores: video || { visivel: true },
      textoApagar: 'Apagar este vídeo? Ele some do site e não dá para desfazer.',
      aoSalvar: async function (v) {
        if (v.link && !linkSeguro(v.link)) return { ok: false, erro: 'O link precisa começar com http:// ou https://' };
        if (v.capa && !/^(https:\/\/|img\/)/i.test(v.capa)) return { ok: false, erro: 'A capa precisa começar com img/ (imagem da pasta do site) ou https://' };
        if (!editando) v.ordem = videos.reduce(function (m, x) { return Math.max(m, x.ordem || 0); }, 0) + 1;
        var r = await gravar('videos', v, editando ? video.id : null);
        if (r.ok) { aviso(editando ? 'Vídeo atualizado.' : 'Vídeo adicionado.'); await aposMudar(); }
        return r;
      },
      aoApagar: editando ? async function () {
        var r = await apagar('videos', video.id);
        if (r.ok) { aviso('Vídeo apagado.'); await aposMudar(); }
        return r;
      } : null
    });
  }

  /* =========================================================
     ABA 1: PORTFÓLIO
     Números de visita, gráfico, origens e a tabela dos vídeos.
     ========================================================= */
  (function () {
    var TABELAS = ['videos', 'visitas'];
    var secaoAtual = null;

    /* Busca as visitas dos últimos 14 dias (em páginas de 1000, para não perder nenhuma) */
    async function carregarVisitas() {
      var inicio = new Date();
      inicio.setDate(inicio.getDate() - 13);
      inicio.setHours(0, 0, 0, 0);
      var todas = [];
      try {
        for (var pagina = 0; pagina < 30; pagina++) {
          var r = await banco.from('visitas').select('data,origem,pagina')
            .gte('data', inicio.toISOString()).range(pagina * 1000, pagina * 1000 + 999);
          if (r.error) { problemas.visitas = descreverErro('visitas', r.error); return []; }
          todas = todas.concat(r.data || []);
          if (!r.data || r.data.length < 1000) break;
        }
        delete problemas.visitas;
      } catch (e) {
        problemas.visitas = descreverErro('visitas', e);
        return [];
      }
      return todas;
    }

    /* Mensagens do formulário do site: ficam na tabela "mensagens_site" (contato.sql), uma linha para cada mensagem,
       mesmo quando a marca ou o e-mail se repetem. Aqui dá para ler, responder, arquivar e apagar.
       Apagar ou arquivar aqui não mexe na marca da aba Marcas. */
    var verArquivadas = false;
    var mensagensAtuais = { erro: '', lista: [] };

    async function carregarMensagens() {
      try {
        var r = await banco.from('mensagens_site').select('*').order('criado_em', { ascending: false }).limit(500);
        if (r.error) return { erro: descreverErro('mensagens_site', r.error), lista: [] };
        var dados = r.data || [];
        return {
          erro: '',
          semColuna: dados.length > 0 && dados[0].arquivada === undefined,
          lista: dados.map(function (m) {
            return { id: m.id, tipo: m.tipo === 'kit' ? 'kit' : 'mensagem', nome: m.nome, marca: m.marca, email: m.email,
              orcamento: m.orcamento, quando: m.criado_em, texto: m.mensagem || '', arquivada: !!m.arquivada, marcaId: m.marca_id };
          })
        };
      } catch (e) {
        return { erro: descreverErro('mensagens_site', e), lista: [] };
      }
    }

    function htmlMensagem(m) {
      var email = String(m.email || '').trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      var previa = m.texto.length > 90 ? m.texto.slice(0, 90).trim() + '...' : m.texto;
      var detalhes = '';
      if (m.marca) detalhes += '<span><b>Marca:</b> ' + esc(m.marca) + '</span>';
      if (m.orcamento) detalhes += '<span><b>Orçamento:</b> ' + esc(m.orcamento) + '</span>';
      detalhes += '<span><b>E-mail:</b> ' + (emailOk ? esc(email) : 'não informado') + '</span>';
      return '<details class="msg" data-id="' + esc(m.id) + '"><summary>' +
        '<span class="msg-nome">' + esc(m.nome || 'Sem nome') + (m.marca ? ' <span class="msg-marca">· ' + esc(m.marca) + '</span>' : '') + '</span>' +
        '<span class="pilula ' + (m.tipo === 'kit' ? 'p-briefing' : 'p-lead') + '">' + (m.tipo === 'kit' ? 'Mídia kit' : 'Mensagem') + '</span>' +
        '<span class="msg-data">' + esc(fmtDataHora(m.quando)) + '</span>' +
        '<span class="msg-previa">' + esc(previa || '(sem texto)') + '</span></summary>' +
        '<div class="msg-corpo"><div class="msg-detalhes">' + detalhes + '</div>' +
        '<p class="msg-texto">' + esc(m.texto || '(sem texto)') + '</p>' +
        '<div class="acoes-msg">' +
          (emailOk ? '<a class="btn pequeno principal-btn" href="mailto:' + esc(email) + '?subject=' + encodeURIComponent('Sobre a sua mensagem no meu portfólio') + '">' + ic('envelope') + 'Responder por e-mail</a>' : '') +
          (m.marcaId ? '<a class="btn pequeno" href="#marcas">Abrir na aba Marcas</a>' : '') +
          '<button type="button" class="btn pequeno" data-msg-acao="arquivar" data-id="' + esc(m.id) + '">' + ic('arquivo') + (m.arquivada ? 'Tirar do arquivo' : 'Arquivar') + '</button>' +
          '<button type="button" class="btn pequeno perigo" data-msg-acao="apagar" data-id="' + esc(m.id) + '">' + ic('lixo') + 'Apagar</button>' +
        '</div></div></details>';
    }

    function htmlMensagens(res) {
      var novas = res.lista.filter(function (m) { return !m.arquivada; });
      var arquivadas = res.lista.filter(function (m) { return m.arquivada; });
      var mostrar = verArquivadas ? arquivadas : novas;
      var corpo;
      if (res.erro) corpo = '<p class="vazio">' + esc(res.erro) + '</p>';
      else if (!mostrar.length) corpo = '<p class="vazio">' + (verArquivadas
        ? 'Você não tem mensagens arquivadas.'
        : (arquivadas.length ? 'Nenhuma mensagem na caixa de entrada. As que você arquivou estão em "Arquivadas".' : 'Quando alguém enviar uma mensagem pelo formulário de contato do seu site, ela aparece aqui.')) + '</p>';
      else corpo = '<div class="msg-lista">' + mostrar.map(htmlMensagem).join('') + '</div>';
      var nota = res.semColuna
        ? '<p class="cartao-corpo" style="border-top:1px solid var(--line);color:var(--muted);font-size:.8rem">Para poder arquivar mensagens, rode o arquivo contato.sql de novo no SQL Editor do Supabase.</p>'
        : '';
      return '<div class="cartao" style="margin-bottom:1rem"><div class="cartao-cab"><h2>Mensagens do site</h2>' +
        '<div class="segmentos" role="group" aria-label="Mostrar mensagens">' +
          '<button type="button" data-msg-aba="novas" aria-pressed="' + (verArquivadas ? 'false' : 'true') + '">Recebidas (' + fmtInt(novas.length) + ')</button>' +
          '<button type="button" data-msg-aba="arquivadas" aria-pressed="' + (verArquivadas ? 'true' : 'false') + '">Arquivadas (' + fmtInt(arquivadas.length) + ')</button></div>' +
        '<a class="btn pequeno" href="#marcas">Ver a aba Marcas</a></div>' + corpo + nota + '</div>';
    }

    function desenharMensagens() {
      var alvo = $('#mensagensSite', secaoAtual);
      if (!alvo) return;
      alvo.innerHTML = htmlMensagens(mensagensAtuais);
    }

    async function recarregarMensagens() {
      mensagensAtuais = await carregarMensagens();
      desenharMensagens();
    }

    async function cliqueMensagens(e) {
      var aba = e.target.closest('button[data-msg-aba]');
      if (aba) { verArquivadas = aba.getAttribute('data-msg-aba') === 'arquivadas'; desenharMensagens(); return; }
      var bt = e.target.closest('button[data-msg-acao]');
      if (!bt) return;
      var id = bt.getAttribute('data-id');
      var m = mensagensAtuais.lista.filter(function (x) { return x.id === id; })[0];
      if (!m) return;
      var acao = bt.getAttribute('data-msg-acao');
      if (acao === 'arquivar') {
        bt.disabled = true;
        var r = await gravar('mensagens_site', { arquivada: !m.arquivada }, id);
        if (r.ok) { aviso(m.arquivada ? 'Mensagem de volta para as recebidas.' : 'Mensagem arquivada.'); await recarregarMensagens(); }
        else { bt.disabled = false; aviso(r.erro, 'erro'); }
      }
      if (acao === 'apagar') {
        if (!(await confirmar('Apagar a mensagem de "' + (m.nome || 'sem nome') + '"? Ela some daqui e não dá para desfazer. A marca na aba Marcas continua como está.'))) return;
        var r2 = await apagar('mensagens_site', id);
        if (r2.ok) { aviso('Mensagem apagada.'); await recarregarMensagens(); }
        else aviso(r2.erro, 'erro');
      }
    }

    function calcular(videos, visitas) {
      var hoje = hojeISO();
      var dias = [];
      var porDia = {};
      for (var i = 13; i >= 0; i--) { var iso = somarDias(hoje, -i); dias.push(iso); porDia[iso] = 0; }
      var origens = {};
      var total = 0;
      visitas.forEach(function (v) {
        var d = new Date(v.data);
        if (isNaN(d.getTime())) return;
        var chave = isoLocal(d);
        if (porDia[chave] === undefined) return;
        porDia[chave]++;
        total++;
        var o = String(v.origem || '').trim() || 'Direto';
        origens[o] = (origens[o] || 0) + 1;
      });
      var noAr = videos.filter(function (v) { return v.visivel && !v.exemplo; });
      var nichos = {};
      noAr.forEach(function (v) { var n = String(v.nicho || '').trim(); if (n) nichos[n] = (nichos[n] || 0) + 1; });
      var melhorNicho = Object.keys(nichos).sort(function (a, b) { return nichos[b] - nichos[a] || comparaTexto(a, b); })[0] || '';
      var listaOrigens = Object.keys(origens).map(function (o) { return { nome: o, qtd: origens[o] }; })
        .sort(function (a, b) { return b.qtd - a.qtd || comparaTexto(a.nome, b.nome); });
      return { dias: dias, porDia: porDia, total: total, hoje: porDia[hoje] || 0, noAr: noAr.length, melhorNicho: melhorNicho, origens: listaOrigens };
    }

    function htmlNumeros(c) {
      var origemTop = c.origens[0] ? c.origens[0].nome : '';
      return '<div class="cartao faixa-numeros" role="group" aria-label="Resumo do portfólio">' +
        '<div class="numero"><div class="numero-rotulo">Visitas em 14 dias</div><div class="numero-valor">' + fmtInt(c.total) + '</div></div>' +
        '<div class="numero"><div class="numero-rotulo">Visitas hoje</div><div class="numero-valor">' + fmtInt(c.hoje) + '</div></div>' +
        '<div class="numero"><div class="numero-rotulo">Vídeos no ar</div><div class="numero-valor">' + fmtInt(c.noAr) + '</div></div>' +
        '<div class="numero"><div class="numero-rotulo">Nicho mais forte</div><div class="numero-valor texto">' + (c.melhorNicho ? esc(c.melhorNicho) : 'Ainda nenhum') + '</div></div>' +
        '<div class="numero"><div class="numero-rotulo">De onde mais vêm</div><div class="numero-valor texto">' + (origemTop ? esc(origemTop) : 'Ainda nenhuma') + '</div></div>' +
        '</div>';
    }

    function htmlGrafico(c) {
      var corpo;
      if (c.total === 0) {
        corpo = '<p class="vazio">Quando as pessoas começarem a visitar o seu portfólio, aqui vai aparecer um gráfico com o número de visitas de cada dia, nos últimos 14 dias.</p>';
      } else {
        var maximo = Math.max.apply(null, c.dias.map(function (d) { return c.porDia[d]; }));
        var hoje = hojeISO();
        corpo = '<div class="grafico" role="img" aria-label="Visitas por dia nos últimos 14 dias">' + c.dias.map(function (d) {
          var n = c.porDia[d];
          var fracao = maximo > 0 ? Math.max(n / maximo, n > 0 ? 0.03 : 0) : 0;
          return '<div class="barra-coluna" title="' + esc(fmtData(d)) + ': ' + n + (n === 1 ? ' visita' : ' visitas') + '">' +
            '<span class="barra-num">' + (n > 0 ? n : '') + '</span>' +
            '<div class="barra' + (d === hoje ? ' hoje' : '') + '" style="height:calc((100% - 1.2rem) * ' + fracao.toFixed(3) + ')"></div></div>';
        }).join('') + '</div>' +
          '<div class="rotulos" aria-hidden="true">' + c.dias.map(function (d) { return '<span>' + esc(fmtData(d).slice(0, 5)) + '</span>'; }).join('') + '</div>';
      }
      return '<div class="cartao"><div class="cartao-cab"><h2>Visitas nos últimos 14 dias</h2></div><div class="cartao-corpo">' + corpo + '</div></div>';
    }

    function htmlOrigens(c) {
      var corpo;
      if (!c.origens.length) {
        corpo = '<p class="vazio">Aqui vai aparecer por onde as pessoas chegaram (Instagram, Google, link direto e outros) assim que as visitas começarem.</p>';
      } else {
        corpo = '<ul class="origens">' + c.origens.slice(0, 7).map(function (o) {
          var pct = Math.round((o.qtd / c.total) * 100);
          return '<li><span>' + esc(o.nome) + '</span><strong>' + fmtInt(o.qtd) + ' <small>(' + pct + '%)</small></strong>' +
            '<span class="trilho"><i style="width:' + pct + '%"></i></span></li>';
        }).join('') + '</ul>';
      }
      return '<div class="cartao"><div class="cartao-cab"><h2>Por onde chegaram</h2></div><div class="cartao-corpo">' + corpo + '</div></div>';
    }

    function ordenados(videos) {
      return videos.slice().sort(function (a, b) {
        return (a.ordem || 0) - (b.ordem || 0) || String(a.criado_em || '').localeCompare(String(b.criado_em || ''));
      });
    }

    function htmlLinhaVideo(v) {
      var link = linkSeguro(v.link);
      var host = '';
      if (link) { try { host = new URL(link).hostname.replace(/^www\./, ''); } catch (e) { host = 'link'; } }
      return '<tr data-id="' + esc(v.id) + '" class="' + (v.visivel ? '' : 'escondido') + '">' +
        '<td><span class="alca" tabindex="0" role="button" title="Arraste para mudar a ordem (ou use as setas do teclado)" aria-label="Mudar a ordem de ' + esc(v.titulo) + '">' + ic('alca') + '</span></td>' +
        '<td><strong>' + esc(v.titulo) + '</strong>' + (v.exemplo ? '<span class="exemplo-tag">EXEMPLO</span>' : '') +
        '<span class="sub">' + esc(v.marca || 'Sem marca') + (link ? ' · <a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + esc(host) + '</a>' : '') + '</span></td>' +
        '<td>' + esc(v.nicho || '') + '</td>' +
        '<td>' + esc(v.formato || '') + '</td>' +
        '<td>' + esc(v.destaque || '') + '</td>' +
        '<td><button type="button" class="btn-icone" data-acao="visivel" aria-pressed="' + (v.visivel ? 'true' : 'false') + '" title="' +
          (v.visivel ? 'Aparece no site. Clique para esconder.' : 'Escondido do site. Clique para mostrar.') + '" aria-label="' +
          (v.visivel ? 'Esconder do site' : 'Mostrar no site') + ': ' + esc(v.titulo) + '">' + ic(v.visivel ? 'olho' : 'olhoRiscado') + '</button></td>' +
        '<td><div class="acoes">' +
          '<button type="button" class="btn-icone" data-acao="editar" title="Editar" aria-label="Editar ' + esc(v.titulo) + '">' + ic('lapis') + '</button>' +
          '<button type="button" class="btn-icone perigo" data-acao="apagar" title="Apagar" aria-label="Apagar ' + esc(v.titulo) + '">' + ic('lixo') + '</button>' +
        '</div></td></tr>';
    }

    function htmlTabela(videos) {
      var lista = ordenados(videos);
      var corpo = lista.length
        ? '<div class="rolagem"><table class="tabela"><thead><tr><th style="width:44px"><span class="sr-only">Ordem</span></th><th>Vídeo</th><th>Nicho</th><th>Formato</th><th>Destaque</th><th>No site</th><th><span class="sr-only">Ações</span></th></tr></thead>' +
          '<tbody id="videosCorpo">' + lista.map(htmlLinhaVideo).join('') + '</tbody></table></div>'
        : '<p class="vazio">Você ainda não tem vídeos aqui. Clique em "Adicionar vídeo" para começar.</p>';
      return '<div class="cartao"><div class="cartao-cab"><h2>Meus vídeos</h2>' +
        '<button type="button" class="btn principal-btn" id="novoVideo">' + ic('mais') + 'Adicionar vídeo</button></div>' +
        (lista.length ? '<p class="cartao-corpo" style="padding-bottom:0;color:var(--muted);font-size:.8rem">Arraste pela alça para mudar a ordem. O olhinho mostra ou esconde o vídeo no site. Os destaques do site são os vídeos marcados com "Aparece nos Destaques". Para editar por nicho, capa e ordem, use Conteúdo do site.</p>' : '') +
        corpo + '</div>';
    }

    async function recarregar() {
      var videos = await listar('videos', true);
      desenharTabela(videos);
      mostrarProblemas(TABELAS);
    }

    function abrirFormularioVideo(video) { formularioVideo(video, recarregar); }

    function desenharTabela(videos) {
      var alvo = $('#tabelaVideos', secaoAtual);
      if (!alvo) return;
      alvo.innerHTML = htmlTabela(videos);
      var novo = $('#novoVideo', alvo);
      if (novo) novo.addEventListener('click', function () { abrirFormularioVideo(null); });
      var tbody = $('#videosCorpo', alvo);
      if (!tbody) return;

      tbody.addEventListener('click', async function (e) {
        var bt = e.target.closest('button[data-acao]');
        if (!bt) return;
        var tr = bt.closest('tr');
        var v = (cache.videos || []).filter(function (x) { return x.id === tr.getAttribute('data-id'); })[0];
        if (!v) return;
        var acao = bt.getAttribute('data-acao');
        if (acao === 'editar') abrirFormularioVideo(v);
        if (acao === 'apagar') {
          if (!(await confirmar('Apagar "' + v.titulo + '"? Ele some do site e não dá para desfazer.'))) return;
          var r = await apagar('videos', v.id);
          if (r.ok) { aviso('Vídeo apagado.'); recarregar(); } else aviso(r.erro, 'erro');
        }
        if (acao === 'visivel') {
          bt.disabled = true;
          var r2 = await gravar('videos', { visivel: !v.visivel }, v.id);
          if (r2.ok) { aviso(v.visivel ? 'Vídeo escondido do site.' : 'Vídeo aparecendo no site.'); await recarregar(); }
          else { bt.disabled = false; aviso(r2.erro, 'erro'); }
        }
      });

      ativarArrastar(tbody, async function (idsNaOrdem) {
        var mudou = [];
        idsNaOrdem.forEach(function (id, i) {
          var v = (cache.videos || []).filter(function (x) { return x.id === id; })[0];
          if (v && (v.ordem || 0) !== i + 1) mudou.push({ v: v, ordem: i + 1 });
        });
        if (!mudou.length) return;
        var resultados = await Promise.all(mudou.map(function (m) { return gravar('videos', { ordem: m.ordem }, m.v.id); }));
        var falha = resultados.filter(function (r) { return !r.ok; })[0];
        if (falha) { aviso(falha.erro, 'erro'); await recarregar(); return; }
        mudou.forEach(function (m) { m.v.ordem = m.ordem; });
        aviso('Nova ordem salva.');
      });
    }

    Abas.portfolio = {
      titulo: 'Portfólio',
      tabelas: TABELAS,
      abrir: async function (secao) {
        secaoAtual = secao;
        if (!secao.innerHTML.trim()) secao.innerHTML = '<p class="carregando">Carregando...</p>';
        var resultado = await Promise.all([listar('videos', true), carregarVisitas(), carregarMensagens()]);
        var videos = resultado[0], visitas = resultado[1];
        mensagensAtuais = resultado[2];
        var c = calcular(videos, visitas);
        secao.innerHTML = htmlNumeros(c) + '<div id="mensagensSite"></div>' +
          '<div class="duas-colunas">' + htmlGrafico(c) + htmlOrigens(c) + '</div>' +
          '<div id="tabelaVideos"></div>';
        desenharMensagens();
        $('#mensagensSite', secao).addEventListener('click', cliqueMensagens);
        desenharTabela(videos);
      }
    };
  })();

  /* =========================================================
     ABA 2: MARCAS
     A sua base de contatos de empresas, em formato de planilha.
     Os contatos que chegam pelo formulário do site entram aqui como "Lead".
     ========================================================= */
  (function () {
    var TABELAS = ['marcas'];
    var SITUACOES = [
      { v: 'lead', t: 'Lead', classe: 'p-lead' },
      { v: 'conversando', t: 'Conversando', classe: 'p-conversando' },
      { v: 'cliente', t: 'Cliente', classe: 'p-cliente' },
      { v: 'parada', t: 'Parada', classe: 'p-parada' }
    ];
    var estado = { busca: '', situacao: 'todas', nicho: 'todos', favoritas: false };
    var secaoAtual = null;
    var colunasNovas = true;     /* false enquanto o disparo.sql (ou banco-3.sql) não foi rodado: faltam nicho e favorita */
    var temSelecao = true;       /* false enquanto o disparo.sql não foi rodado: falta o campo selecionada */
    var pendentes = {};          /* marcas cuja estrela está sendo gravada agora */
    var pendentesSel = {};       /* marcas cuja caixinha está sendo gravada agora */

    /* Só marca com e-mail de verdade (e que não seja a linha de exemplo) pode ser selecionada */
    function emailUsavel(m) {
      return !m.exemplo && /^[^\s@;,<>()"']+@[^\s@;,<>()"']+\.[^\s@;,<>()"']+$/.test(String(m.email || '').trim());
    }
    function podeSelecionar(m) { return temSelecao && emailUsavel(m); }
    function totalSelecionadas() { return (cache.marcas || []).filter(function (m) { return m.selecionada; }).length; }

    function situacao(v) {
      return SITUACOES.filter(function (s) { return s.v === v; })[0] || SITUACOES[0];
    }
    /* "@Marca.Oficial", "instagram.com/marca/" ou "marca" viram "marca.oficial" */
    function limparInsta(v) {
      var s = String(v || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
      s = s.split('/').pop().replace(/^@/, '');
      return /^[A-Za-z0-9._]+$/.test(s) ? s : '';
    }
    function numeroWhats(tel) {
      var d = String(tel || '').replace(/\D/g, '');
      if (d.length < 10) return '';
      return d.indexOf('55') === 0 && d.length >= 12 ? d : '55' + d;
    }
    function textoBusca(m) {
      return (String(m.nome || '') + ' ' + String(m.instagram || '') + ' ' + String(m.email || '') + ' ' + String(m.nicho || '')).toLowerCase();
    }

    /* Os nichos que já aparecem nas suas marcas (sem repetir "Cabelo" e "cabelo"), para o filtro e para as sugestões */
    function nichosUsados() {
      var mapa = Object.create(null), lista = [];
      (cache.marcas || []).forEach(function (m) {
        impNichos(m.nicho).forEach(function (n) {
          var k = impNormalizar(n);
          if (!mapa[k]) { mapa[k] = n; lista.push({ v: k, t: n }); }
        });
      });
      return lista.sort(function (a, b) { return comparaTexto(a.t, b.t); });
    }
    function montarNichos() {
      var sel = $('#marcasNicho', secaoAtual);
      if (!sel) return;
      var lista = nichosUsados();
      if (estado.nicho !== 'todos' && !lista.some(function (n) { return n.v === estado.nicho; })) estado.nicho = 'todos';
      sel.innerHTML = '<option value="todos">Todos os nichos</option>' + lista.map(function (n) {
        return '<option value="' + esc(n.v) + '"' + (estado.nicho === n.v ? ' selected' : '') + '>' + esc(n.t) + '</option>';
      }).join('');
      sel.hidden = !lista.length;
    }

    function filtradas(lista) {
      var q = estado.busca.trim().toLowerCase().replace(/^@/, '');
      return lista.filter(function (m) {
        if (estado.situacao !== 'todas' && m.situacao !== estado.situacao) return false;
        if (estado.favoritas && !m.favorita) return false;
        if (estado.nicho !== 'todos' && !impNichos(m.nicho).some(function (n) { return impNormalizar(n) === estado.nicho; })) return false;
        return !q || textoBusca(m).indexOf(q) >= 0;
      }).sort(function (a, b) {
        var da = a.ultimo_contato || '', db = b.ultimo_contato || '';
        if (da !== db) return da < db ? 1 : -1;
        return comparaTexto(a.nome, b.nome);
      });
    }

    function htmlLinha(m) {
      var s = situacao(m.situacao);
      var insta = limparInsta(m.instagram);
      var whats = numeroWhats(m.telefone);
      /* dá para sempre DESmarcar uma marca selecionada, mesmo que ela tenha perdido o e-mail */
      var habilitada = podeSelecionar(m) || (temSelecao && !!m.selecionada);
      var dicaSel = !temSelecao ? 'Rode o arquivo disparo.sql no Supabase para usar a seleção'
        : (m.exemplo ? 'Linha de exemplo: não recebe e-mail' : (emailUsavel(m) ? 'Selecionar para a prospecção' : 'Sem e-mail, não dá para selecionar'));
      return '<tr class="clicavel' + (m.favorita ? ' favorita' : '') + (m.selecionada ? ' selecionada' : '') + '" data-id="' + esc(m.id) + '" tabindex="0">' +
        '<td class="sel"><label class="sel-rotulo"><input type="checkbox" class="sel-check" data-acao="selecionar"' + (m.selecionada ? ' checked' : '') + (habilitada ? '' : ' disabled') + ' title="' + esc(dicaSel) + '" aria-label="Selecionar ' + esc(m.nome) + ' para a prospecção"></label></td>' +
        '<td><button type="button" class="estrela' + (m.favorita ? ' ligada' : '') + '" data-acao="estrela" aria-pressed="' + (m.favorita ? 'true' : 'false') + '" title="' + (m.favorita ? 'Tirar dos favoritos' : 'Favoritar') + '" aria-label="' + (m.favorita ? 'Tirar dos favoritos: ' : 'Favoritar ') + esc(m.nome) + '">' + ic('estrela') + '</button></td>' +
        '<td><strong>' + esc(m.nome) + '</strong>' + (m.exemplo ? '<span class="exemplo-tag">EXEMPLO</span>' : '') + '</td>' +
        '<td>' + impNichos(m.nicho).map(function (n) { return '<span class="pilula p-nicho">' + esc(n) + '</span>'; }).join(' ') + '</td>' +
        '<td>' + (insta ? '<a href="https://instagram.com/' + esc(insta) + '" target="_blank" rel="noopener noreferrer" title="Abrir o Instagram">@' + esc(insta) + '</a>' : '') + '</td>' +
        '<td>' + (m.email ? '<a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a>' : '') + '</td>' +
        '<td>' + (m.telefone ? esc(m.telefone) : '') +
          (whats ? ' <a class="btn-icone" href="https://wa.me/' + whats + '" target="_blank" rel="noopener noreferrer" title="Abrir o WhatsApp" aria-label="Abrir o WhatsApp de ' + esc(m.nome) + '">' + ic('zap') + '</a>' : '') + '</td>' +
        '<td><span class="pilula ' + s.classe + '">' + s.t + '</span></td>' +
        '<td class="curto" title="' + esc(m.obs || '') + '">' + esc(m.obs || '') + '</td>' +
        '<td>' + esc(fmtData(m.ultimo_contato)) + '</td></tr>';
    }

    function desenhar() {
      var todas = cache.marcas || [];
      montarNichos();
      var lista = filtradas(todas);
      var corpo;
      if (!todas.length) {
        corpo = '<p class="vazio">Você ainda não tem marcas cadastradas. Clique em "Adicionar marca" ou "Importar planilha", ou espere chegar um contato pelo formulário do site.</p>';
      } else if (!lista.length) {
        corpo = '<p class="vazio">Nenhuma marca encontrada com essa busca ou esse filtro.</p>';
      } else {
        corpo = '<div class="rolagem"><table class="tabela"><thead><tr><th style="width:34px"><span class="sr-only">Selecionar</span></th><th style="width:44px"><span class="sr-only">Favorita</span></th><th>Marca</th><th>Nicho</th><th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Observação</th><th>Último contato</th></tr></thead><tbody id="marcasCorpo">' +
          lista.map(htmlLinha).join('') + '</tbody></table></div>';
      }
      $('#marcasTabela', secaoAtual).innerHTML = corpo;
      $('#marcasContagem', secaoAtual).textContent = todas.length
        ? (lista.length === todas.length ? todas.length + (todas.length === 1 ? ' marca' : ' marcas') : lista.length + ' de ' + todas.length)
        : '';
      atualizarBarraSelecao(lista);
    }

    /* Resumo da seleção, no topo da tabela: quantas marcas estão escolhidas e os dois atalhos */
    function atualizarBarraSelecao(lista) {
      var barra = $('#marcasSelecao', secaoAtual);
      if (!barra) return;
      if (!temSelecao) { barra.hidden = true; return; }
      var n = totalSelecionadas();
      var elegiveis = (lista || filtradas(cache.marcas || [])).filter(podeSelecionar);
      var faltam = elegiveis.filter(function (m) { return !m.selecionada; }).length;
      barra.hidden = false;
      barra.innerHTML = '<span class="selecao-texto"><strong>' + n + (n === 1 ? ' marca selecionada' : ' marcas selecionadas') + '</strong>' +
        (n ? ' para a prospecção.' : '. Marque as caixinhas para escolher para quem vai o e-mail.') + '</span>' +
        '<span class="selecao-acoes">' +
          '<button type="button" class="btn pequeno" data-sel="visiveis"' + (faltam ? '' : ' disabled') + '>Selecionar as ' + elegiveis.length + ' que aparecem</button>' +
          '<button type="button" class="btn pequeno" data-sel="limpar"' + (n ? '' : ' disabled') + '>Limpar seleção</button>' +
          '<a class="btn pequeno principal-btn" href="#prospeccao">' + ic('enviar') + 'Ir para Prospecção</a>' +
        '</span>';
    }

    async function selecionarVisiveis() {
      var alvo = filtradas(cache.marcas || []).filter(function (m) { return podeSelecionar(m) && !m.selecionada; });
      if (!alvo.length) return;
      alvo.forEach(function (m) { m.selecionada = true; });
      desenhar();
      var r = await gravarSelecaoMarcas(alvo.map(function (m) { return m.id; }), true);
      if (!r.ok) { alvo.forEach(function (m) { m.selecionada = false; }); desenhar(); aviso(r.erro, 'erro'); return; }
      aviso(alvo.length + (alvo.length === 1 ? ' marca selecionada.' : ' marcas selecionadas.'));
    }

    async function limparSelecao() {
      var n = totalSelecionadas();
      if (!n) return;
      if (!(await confirmar('Tirar a seleção de ' + n + (n === 1 ? ' marca?' : ' marcas?'), 'Limpar seleção'))) return;
      var antes = (cache.marcas || []).filter(function (m) { return m.selecionada; });
      antes.forEach(function (m) { m.selecionada = false; });
      desenhar();
      var r = await gravarSelecaoMarcas(null, false);
      if (!r.ok) { antes.forEach(function (m) { m.selecionada = true; }); desenhar(); aviso(r.erro, 'erro'); return; }
      aviso('Seleção limpa.');
    }

    function campos() {
      /* sugestões do nicho: os que você já usa, mais os três exemplos que você deu */
      var sugestoes = nichosUsados().map(function (n) { return n.t; });
      ['Cabelo', 'Skincare', 'App'].forEach(function (n) {
        if (!sugestoes.some(function (s) { return impNormalizar(s) === impNormalizar(n); })) sugestoes.push(n);
      });
      return [
        { nome: 'nome', rotulo: 'Marca', obrigatorio: true, largo: true },
        { nome: 'nicho', rotulo: 'Nicho', placeholder: 'cabelo, skincare, app', lista: sugestoes, ajuda: 'Pode colocar mais de um, separados por vírgula.' },
        { nome: 'instagram', rotulo: 'Instagram', placeholder: '@nomedamarca' },
        { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
        { nome: 'telefone', rotulo: 'Telefone (com DDD)', tipo: 'tel', placeholder: '(00) 00000-0000' },
        { nome: 'situacao', rotulo: 'Situação', tipo: 'select', opcoes: SITUACOES.map(function (s) { return { v: s.v, t: s.t }; }) },
        { nome: 'ultimo_contato', rotulo: 'Último contato', tipo: 'date' },
        { nome: 'obs', rotulo: 'Observação', tipo: 'textarea', largo: true },
        { nome: 'favorita', rotulo: 'Favorita (estrela)', tipo: 'checkbox', largo: true }
      ].filter(function (c) { return colunasNovas || (c.nome !== 'nicho' && c.nome !== 'favorita'); });
    }

    /* Lê as marcas e confere se o disparo.sql já foi rodado (se os campos nicho, favorita e selecionada existem) */
    async function carregarMarcas() {
      await listar('marcas', true);
      var m = (cache.marcas || [])[0];
      colunasNovas = !m || ('nicho' in m && 'favorita' in m);
      temSelecao = !m || 'selecionada' in m;
      var faltam = [];
      if (m && !('nicho' in m)) faltam.push('Nicho');
      if (m && !('favorita' in m)) faltam.push('Favorita');
      if (m && !('selecionada' in m)) faltam.push('Selecionada');
      if (faltam.length) problemas.marcas = 'Faltam campos na tabela "marcas": ' + faltam.join(', ') + '. Cole o arquivo disparo.sql no SQL Editor do Supabase e clique em Run. Até lá, o painel funciona sem eles.';
    }

    async function recarregar() {
      await carregarMarcas();
      desenhar();
      mostrarProblemas(TABELAS);
    }

    function abrirFormulario(marca) {
      var editando = !!marca;
      formulario({
        titulo: editando ? 'Editar marca' : 'Adicionar marca',
        campos: campos(),
        valores: marca || { situacao: 'lead', ultimo_contato: hojeISO() },
        textoApagar: 'Apagar esta marca da sua base? Não dá para desfazer.',
        aoSalvar: async function (v) {
          if (v.instagram) {
            var h = limparInsta(v.instagram);
            if (!h) return { ok: false, erro: 'O Instagram parece estranho. Use só o @ da marca.' };
            v.instagram = '@' + h;
          }
          if ('nicho' in v) v.nicho = impLimparNicho(v.nicho) || null;
          var r = await gravar('marcas', v, editando ? marca.id : null);
          if (r.ok) { aviso(editando ? 'Marca atualizada.' : 'Marca adicionada.'); await recarregar(); }
          return r;
        },
        aoApagar: editando ? async function () {
          var r = await apagar('marcas', marca.id);
          if (r.ok) { aviso('Marca apagada.'); await recarregar(); }
          return r;
        } : null
      });
    }

    function baixar() {
      var lista = (cache.marcas || []).filter(function (m) { return !m.exemplo; });
      if (!lista.length) { aviso('Ainda não há marcas para baixar.', 'erro'); return; }
      var cab = ['Marca', 'Nicho', 'Instagram', 'E-mail', 'Telefone', 'Situação', 'Observação', 'Último contato', 'Favorita'].map(function (t) { return celulaCSV(t); });
      var linhas = [cab].concat(lista.sort(function (a, b) { return comparaTexto(a.nome, b.nome); }).map(function (m) {
        return [celulaCSV(m.nome), celulaCSV(m.nicho), celulaCSV(m.instagram), celulaCSV(m.email), celulaCSV(m.telefone, true),
          celulaCSV(situacao(m.situacao).t), celulaCSV(m.obs), celulaCSV(fmtData(m.ultimo_contato)), celulaCSV(m.favorita ? 'Sim' : 'Não')];
      }));
      baixarCSV('marcas-' + hojeISO() + '.csv', linhas);
      aviso('Arquivo baixado. Ele abre direto no Excel.');
    }

    /* ---------------------------------------------------------
       IMPORTAR PLANILHA (CSV)
       Lê o arquivo, descobre sozinho o que é cada coluna, mostra uma prévia
       e só grava quando você confirmar. Marcas que já estão no painel são puladas.
       As funções entre IMP-LEITURA-INICIO e IMP-LEITURA-FIM só leem e organizam
       os dados: não mexem na tela nem no banco.
       --------------------------------------------------------- */
    /* IMP-LEITURA-INICIO */
    var IMP_LIMITE_ARQUIVO = 2 * 1024 * 1024;   /* 2 MB */
    var IMP_LIMITE_LINHAS = 1000;               /* o painel lê até 1000 marcas */
    var IMP_CAMPOS = [
      { v: 'nome', t: 'Marca' },
      { v: 'nicho', t: 'Nicho' },
      { v: 'instagram', t: 'Instagram' },
      { v: 'email', t: 'E-mail' },
      { v: 'telefone', t: 'Telefone' },
      { v: 'situacao', t: 'Situação' },
      { v: 'ultimo_contato', t: 'Último contato' },
      { v: 'favorita', t: 'Favorita (sim ou não)' },
      { v: 'obs', t: 'Observação' },
      { v: '', t: 'Não importar' }
    ];

    /* Minúsculas, sem acento e sem símbolos: "E-mail" vira "e mail", "L'Oréal" vira "l oreal" */
    function impNormalizar(s) {
      return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9@]+/g, ' ').trim();
    }
    function impCortar(s, max) {
      s = String(s == null ? '' : s);
      return s.length > max ? s.slice(0, max) : s;
    }

    /* Nichos: "cabelo; skincare / app" vira "Cabelo, Skincare, App". A marca pode ter vários, separados por vírgula.
       Só coloca maiúscula na primeira letra quando a palavra está toda em minúscula ("iFood" e "APP" ficam como estão). */
    function impLimparNicho(v) {
      var vistos = Object.create(null), itens = String(v == null ? '' : v).split(/[,;\/|]+/).map(function (n) { return n.trim(); }).filter(function (n) {
        var k = impNormalizar(n);
        if (!k || vistos[k]) return false;
        vistos[k] = true;
        return true;
      }).map(function (n) { return n === n.toLowerCase() ? n.charAt(0).toUpperCase() + n.slice(1) : n; });
      return impCortar(itens.join(', '), 100);
    }
    function impNichos(v) {
      return String(v == null ? '' : v).split(',').map(function (n) { return n.trim(); }).filter(Boolean);
    }
    /* "Sim", "s", "x", "1" ou uma estrela contam como favorita. "Não", vazio ou qualquer outra coisa, não. */
    function impEhSim(v) {
      var s = String(v);
      return /^(sim|s|x|1|true|verdadeiro|yes|y|favorit[oa]|estrela)$/.test(impNormalizar(v)) ||
        s.indexOf(String.fromCodePoint(0x2605)) >= 0 || s.indexOf(String.fromCodePoint(0x2B50)) >= 0;   /* estrela preta ou estrela de emoji */
    }

    /* Descobre que tipo de arquivo é. Excel novo (.xlsx) é um ZIP; Excel antigo (.xls) ou com senha começa com D0 CF 11 E0.
       Se for texto, tenta UTF-8 e, se não der, Windows-1252 (o CSV antigo do Excel). */
    function impDecodificar(buf) {
      var b = new Uint8Array(buf), texto;
      if (b.length > 3 && b[0] === 0x50 && b[1] === 0x4B && b[2] === 0x03 && b[3] === 0x04) return { xlsx: true };
      if (b.length > 7 && b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0) return { antigo: true };
      if (b.length > 1 && b[0] === 0xFF && b[1] === 0xFE) texto = new TextDecoder('utf-16le').decode(b);
      else if (b.length > 1 && b[0] === 0xFE && b[1] === 0xFF) texto = new TextDecoder('utf-16be').decode(b);
      else {
        try { texto = new TextDecoder('utf-8', { fatal: true }).decode(b); }
        catch (e) { texto = new TextDecoder('windows-1252').decode(b); }
      }
      return { texto: texto.charCodeAt(0) === 0xFEFF ? texto.slice(1) : texto };
    }

    /* ---- Excel (.xlsx) ----
       O .xlsx é um ZIP com arquivos XML dentro. O painel lê aqui mesmo, sem biblioteca nenhuma:
       abre o ZIP, acha as abas, os textos guardados (sharedStrings) e as células de cada aba. */
    var IMP_MAX_XML = 40 * 1024 * 1024;         /* protege contra arquivo "bomba": pequeno zipado, gigante aberto */
    var IMP_MAX_COLUNAS = 200;
    var IMP_MAX_LINHAS_LIDAS = 5000;
    var IMP_FORMATOS_DATA = [14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58];

    function impErro(codigo) { var e = new Error(codigo); e.codigo = codigo; return e; }

    /* A frase certa para cada problema ao abrir o Excel */
    function impMensagemXlsx(e) {
      var c = e && e.codigo;
      if (c === 'navegador') return 'Este navegador é antigo demais para abrir o Excel direto. Atualize o navegador ou salve a planilha como CSV UTF-8 e suba de novo.';
      if (c === 'naoexcel') return 'Esse arquivo não parece uma planilha do Excel (.xlsx). Confira se é o arquivo certo.';
      if (c === 'grande') return 'Essa planilha é grande demais para abrir aqui. Tente uma com menos linhas.';
      if (c === 'vazio') return 'A planilha está vazia.';
      return 'Não consegui ler esse arquivo do Excel. Ele pode estar danificado. Tente salvar de novo como .xlsx, ou como CSV UTF-8.';
    }

    /* Abre o ZIP: lê o índice (diretório central) e devolve a lista de arquivos de dentro */
    function impLerZip(buf) {
      var b = new Uint8Array(buf), v = new DataView(buf), fim = -1, i;
      for (i = b.length - 22; i >= 0 && i >= b.length - 22 - 65535; i--) {
        if (v.getUint32(i, true) === 0x06054b50) { fim = i; break; }
      }
      if (fim < 0) throw impErro('naoexcel');
      var total = v.getUint16(fim + 10, true), p = v.getUint32(fim + 16, true), entradas = [], n;
      for (n = 0; n < total; n++) {
        if (v.getUint32(p, true) !== 0x02014b50) throw impErro('corrompido');
        var tamC = v.getUint32(p + 20, true), tamU = v.getUint32(p + 24, true);
        var nomeLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), comLen = v.getUint16(p + 32, true);
        if (tamC === 0xFFFFFFFF || tamU === 0xFFFFFFFF) throw impErro('grande');
        entradas.push({
          nome: new TextDecoder('utf-8').decode(b.subarray(p + 46, p + 46 + nomeLen)),
          metodo: v.getUint16(p + 10, true), tamC: tamC, tamU: tamU, local: v.getUint32(p + 42, true)
        });
        p += 46 + nomeLen + extraLen + comLen;
      }
      return { bytes: b, view: v, entradas: entradas };
    }
    /* Tira um arquivo de dentro do ZIP (guardado puro ou compactado com deflate) */
    async function impLerEntradaZip(zip, en) {
      var v = zip.view, l = en.local;
      if (v.getUint32(l, true) !== 0x04034b50) throw impErro('corrompido');
      var ini = l + 30 + v.getUint16(l + 26, true) + v.getUint16(l + 28, true);
      var dados = zip.bytes.subarray(ini, ini + en.tamC);
      if (en.metodo === 0) return dados;
      if (en.metodo !== 8) throw impErro('corrompido');
      if (typeof DecompressionStream === 'undefined') throw impErro('navegador');
      var fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(fluxo).arrayBuffer());
    }

    /* Um leitor de XML pequeno, só para o que o Excel escreve. Devolve uma árvore de {tag, attrs, filhos}. */
    function impDecodificarEntidades(t) {
      return String(t).replace(/&(#x[0-9A-Fa-f]+|#[0-9]+|amp|lt|gt|quot|apos);/g, function (_m, e) {
        if (e === 'amp') return '&';
        if (e === 'lt') return '<';
        if (e === 'gt') return '>';
        if (e === 'quot') return '"';
        if (e === 'apos') return "'";
        var cod = (e.charAt(1) === 'x' || e.charAt(1) === 'X') ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        try { return String.fromCodePoint(cod); } catch (x) { return ''; }
      }).replace(/_x([0-9A-Fa-f]{4})_/g, function (_m, h) { return String.fromCharCode(parseInt(h, 16)); });
    }
    function impFimDaTag(texto, i) {            /* acha o ">" que fecha a tag, sem se enganar com ">" dentro de aspas */
      var aspas = '', c;
      for (; i < texto.length; i++) {
        c = texto.charAt(i);
        if (aspas) { if (c === aspas) aspas = ''; }
        else if (c === '"' || c === "'") aspas = c;
        else if (c === '>') return i;
      }
      return texto.length;
    }
    function impXml(texto) {
      var raiz = { tag: '#raiz', attrs: {}, filhos: [] }, atual = raiz, i = 0, n = texto.length, j, f, corpo, auto, nome, attrs, re, ma, valor, local, no;
      while (i < n) {
        if (texto.charCodeAt(i) !== 60) {
          j = texto.indexOf('<', i);
          if (j < 0) j = n;
          if (atual !== raiz) atual.filhos.push({ tag: '#texto', texto: impDecodificarEntidades(texto.slice(i, j)) });
          i = j;
          continue;
        }
        if (texto.substr(i, 4) === '<!--') { j = texto.indexOf('-->', i + 4); i = j < 0 ? n : j + 3; continue; }
        if (texto.substr(i, 9) === '<![CDATA[') {
          j = texto.indexOf(']]>', i + 9);
          if (j < 0) j = n;
          if (atual !== raiz) atual.filhos.push({ tag: '#texto', texto: texto.slice(i + 9, j) });
          i = j + 3;
          continue;
        }
        if (texto.substr(i, 2) === '<?') { j = texto.indexOf('?>', i + 2); i = j < 0 ? n : j + 2; continue; }
        if (texto.substr(i, 2) === '<!') { j = texto.indexOf('>', i + 2); i = j < 0 ? n : j + 1; continue; }
        if (texto.charAt(i + 1) === '/') { j = texto.indexOf('>', i + 2); atual = atual.pai || raiz; i = j < 0 ? n : j + 1; continue; }
        f = impFimDaTag(texto, i + 1);
        corpo = texto.slice(i + 1, f);
        auto = false;
        if (corpo.charAt(corpo.length - 1) === '/') { auto = true; corpo = corpo.slice(0, -1); }
        nome = (/^[^\s]+/.exec(corpo) || [''])[0];
        attrs = {};
        re = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
        var resto = corpo.slice(nome.length);
        while ((ma = re.exec(resto))) {
          valor = impDecodificarEntidades(ma[2] !== undefined ? ma[2] : ma[3]);
          attrs[ma[1]] = valor;
          local = ma[1].replace(/^.*:/, '');
          if (!Object.prototype.hasOwnProperty.call(attrs, local)) attrs[local] = valor;
        }
        no = { tag: nome.replace(/^.*:/, ''), attrs: attrs, filhos: [], pai: atual };
        atual.filhos.push(no);
        if (!auto) atual = no;
        i = f + 1;
      }
      return raiz;
    }
    function impFilhos(no, tag) { return ((no && no.filhos) || []).filter(function (f) { return f.tag === tag; }); }
    function impFilho(no, tag) { return impFilhos(no, tag)[0] || null; }
    function impTextoSimples(no) { return ((no && no.filhos) || []).map(function (f) { return f.tag === '#texto' ? f.texto : ''; }).join(''); }
    /* O texto de uma frase guardada: junta os pedaços (negrito, cor...) e ignora a pronúncia (rPh) */
    function impTextoDoSi(no) {
      if (no.tag === 't') return impTextoSimples(no);
      if (no.tag === 'rPh') return '';
      return (no.filhos || []).filter(function (f) { return f.tag !== '#texto'; }).map(impTextoDoSi).join('');
    }
    /* "A" vira 0, "B" vira 1, "AA" vira 26 */
    function impColuna(ref) {
      var m = /^([A-Za-z]+)/.exec(String(ref || '')), n = 0, i, s;
      if (!m) return -1;
      s = m[1].toUpperCase();
      for (i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
      return n - 1;
    }
    /* O Excel guarda data como número de dias. Vira "2024-03-15". */
    function impSerialParaISO(serial, sistema1904) {
      var dias = Math.floor(serial);
      if (!isFinite(dias) || dias < 1) return '';
      var d = new Date((dias - (sistema1904 ? 24107 : 25569)) * 86400000);
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }

    /* Lê o .xlsx e devolve as abas: [{ nome, linhas }], cada linha uma lista de textos (igual ao CSV) */
    async function impLerXlsx(buf) {
      var zip;
      try { zip = impLerZip(buf); } catch (e) { throw (e && e.codigo) ? e : impErro('corrompido'); }
      var porNome = Object.create(null);
      zip.entradas.forEach(function (en) { porNome[en.nome] = en; });
      async function lerTexto(nome, obrigatorio) {
        var en = porNome[nome];
        if (!en) { if (obrigatorio) throw impErro('naoexcel'); return ''; }
        if (en.tamU > IMP_MAX_XML) throw impErro('grande');
        try { return new TextDecoder('utf-8').decode(await impLerEntradaZip(zip, en)); }
        catch (e) { throw (e && e.codigo) ? e : impErro('corrompido'); }
      }

      var livro = impFilho(impXml(await lerTexto('xl/workbook.xml', true)), 'workbook');
      if (!livro) throw impErro('naoexcel');
      var pr = impFilho(livro, 'workbookPr'), d1904 = !!pr && /^(1|true)$/i.test(pr.attrs.date1904 || '');
      var listaAbas = impFilhos(impFilho(livro, 'sheets'), 'sheet')
        .filter(function (s) { return !/hidden/i.test(s.attrs.state || ''); })
        .map(function (s) { return { nome: s.attrs.name || 'Aba', rid: s.attrs.id }; });
      if (!listaAbas.length) throw impErro('naoexcel');

      var alvos = Object.create(null);
      impFilhos(impFilho(impXml(await lerTexto('xl/_rels/workbook.xml.rels', false)), 'Relationships'), 'Relationship')
        .forEach(function (r) { alvos[r.attrs.Id] = r.attrs.Target; });
      function caminho(alvo) {
        if (!alvo) return '';
        if (alvo.charAt(0) === '/') return alvo.slice(1);
        var saida = [];
        ('xl/' + alvo).split('/').forEach(function (p) { if (p === '..') saida.pop(); else if (p !== '.') saida.push(p); });
        return saida.join('/');
      }

      var frases = [], sstTexto = await lerTexto('xl/sharedStrings.xml', false);
      if (sstTexto) impFilhos(impFilho(impXml(sstTexto), 'sst'), 'si').forEach(function (si) { frases.push(impTextoDoSi(si)); });

      var formatos = Object.create(null), estilos = [], estTexto = await lerTexto('xl/styles.xml', false);
      if (estTexto) {
        var ss = impFilho(impXml(estTexto), 'styleSheet');
        impFilhos(impFilho(ss, 'numFmts'), 'numFmt').forEach(function (f) { formatos[f.attrs.numFmtId] = f.attrs.formatCode || ''; });
        impFilhos(impFilho(ss, 'cellXfs'), 'xf').forEach(function (xf) { estilos.push(+xf.attrs.numFmtId || 0); });
      }
      function ehData(idxEstilo) {
        if (idxEstilo === undefined) return false;
        var id = estilos[+idxEstilo];
        if (id === undefined) return false;
        if (IMP_FORMATOS_DATA.indexOf(id) >= 0) return true;
        var cod = formatos[id];
        if (!cod) return false;
        return /[dmyhs]/i.test(cod.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '').replace(/_./g, '').replace(/\*./g, ''));
      }
      function valorDaCelula(c) {
        var t = c.attrs.t || 'n', v, bruto, n, is;
        if (t === 'inlineStr') { is = impFilho(c, 'is'); return is ? impTextoDoSi(is) : ''; }
        v = impFilho(c, 'v');
        bruto = v ? impTextoSimples(v) : '';
        if (bruto === '') return '';
        if (t === 's') return frases[+bruto] === undefined ? '' : frases[+bruto];
        if (t === 'b') return bruto === '1' ? 'Sim' : 'Não';
        if (t === 'e') return '';
        if (t === 'str' || t === 'd') return bruto;
        n = Number(bruto);
        if (!isFinite(n)) return bruto;
        if (ehData(c.attrs.s)) return impSerialParaISO(n, d1904);
        return String(+n.toPrecision(15));
      }
      function lerFolha(xml) {
        var dados = impFilho(impFilho(impXml(xml), 'worksheet'), 'sheetData'), linhas = [], r, row;
        if (!dados) return linhas;
        function lerLinha(row) {
          var esparsa = [], ultimo = -1, vazia = true, k, densa = [];
          impFilhos(row, 'c').forEach(function (c) {
            var col = c.attrs.r ? impColuna(c.attrs.r) : ultimo + 1, v;
            ultimo = col;
            if (col < 0 || col >= IMP_MAX_COLUNAS) return;
            v = valorDaCelula(c);
            if (String(v).trim() !== '') vazia = false;
            esparsa[col] = v;
          });
          if (vazia) return null;
          for (k = 0; k < esparsa.length; k++) densa.push(esparsa[k] === undefined ? '' : esparsa[k]);
          return densa;
        }
        for (r = 0; r < dados.filhos.length && linhas.length < IMP_MAX_LINHAS_LIDAS; r++) {
          row = dados.filhos[r];
          if (row.tag !== 'row') continue;
          var linha = lerLinha(row);
          if (linha) linhas.push(linha);
        }
        return linhas;
      }

      var abas = [], i, linhasDaAba, xml;
      for (i = 0; i < listaAbas.length; i++) {
        xml = await lerTexto(caminho(alvos[listaAbas[i].rid]) || ('xl/worksheets/sheet' + (i + 1) + '.xml'), false);
        if (!xml) continue;
        linhasDaAba = lerFolha(xml);
        if (linhasDaAba.length) abas.push({ nome: listaAbas[i].nome, linhas: linhasDaAba });
      }
      if (!abas.length) throw impErro('vazio');
      return abas;
    }
    /* Qual aba ler primeiro: a que tem títulos que o painel reconhece (e, no empate, a com mais linhas) */
    function impEscolherAba(abas) {
      var melhor = 0, pontos = -1;
      abas.forEach(function (a, i) {
        var reconhecidos = 0, k, r, p;
        for (k = 0; k < Math.min(a.linhas.length, 10); k++) {
          r = a.linhas[k].filter(function (c) { return impCampoDoCabecalho(c); }).length;
          if (r > reconhecidos) reconhecidos = r;
        }
        p = reconhecidos * 10000 + Math.min(a.linhas.length, 9999);
        if (p > pontos) { pontos = p; melhor = i; }
      });
      return melhor;
    }

    /* Excel em português usa ";" e o Google Planilhas usa ",". Olha a primeira linha e escolhe. */
    function impSeparador(texto) {
      var dica = /^sep=(.)\r?\n/i.exec(texto);
      if (dica) return dica[1];
      var cont = { ';': 0, ',': 0, '\t': 0 }, aspas = false, i = 0, c;
      while (texto.charAt(i) === '\n' || texto.charAt(i) === '\r') i++;   /* pula linhas em branco no começo */
      for (; i < texto.length; i++) {
        c = texto.charAt(i);
        if (c === '"') aspas = !aspas;
        else if (!aspas && (c === '\n' || c === '\r')) break;
        else if (!aspas && cont[c] !== undefined) cont[c]++;
      }
      if (cont[';'] > 0 && cont[';'] >= cont[','] && cont[';'] >= cont['\t']) return ';';
      if (cont[','] > 0 && cont[','] >= cont['\t']) return ',';
      return cont['\t'] > 0 ? '\t' : ',';
    }

    /* Texto do CSV vira lista de linhas (cada linha, uma lista de células). Aceita aspas, "" e quebra de linha dentro da célula. */
    function impLerCSV(texto) {
      var dicaSep = /^sep=.\r?\n/i;
      var sep = impSeparador(texto);
      if (dicaSep.test(texto)) texto = texto.replace(dicaSep, '');
      var linhas = [], linha = [], campo = '', aspas = false, i = 0, c;
      while (i < texto.length) {
        c = texto.charAt(i);
        if (aspas) {
          if (c === '"') {
            if (texto.charAt(i + 1) === '"') { campo += '"'; i++; } else aspas = false;
          } else campo += c;
        } else if (c === '"' && campo === '') {
          aspas = true;
        } else if (c === sep) {
          linha.push(campo); campo = '';
        } else if (c === '\n' || c === '\r') {
          if (c === '\r' && texto.charAt(i + 1) === '\n') i++;
          linha.push(campo); campo = '';
          linhas.push(linha); linha = [];
        } else campo += c;
        i++;
      }
      if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
      return linhas.filter(function (l) { return l.some(function (x) { return String(x).trim() !== ''; }); });
    }

    function impEmails(v) {
      var vistos = {};
      return (String(v).match(/[^\s;,<>()"'\[\]]+@[^\s;,<>()"'\[\]]+\.[^\s;,<>()"'\[\]]+/g) || [])
        .map(function (e) { return e.replace(/[.\-]+$/, ''); })
        .filter(function (e) { var k = e.toLowerCase(); if (vistos[k]) return false; vistos[k] = true; return true; });
    }
    function impPareceEmail(v) { return /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/.test(String(v).trim()); }
    function impPareceTelefone(v) {
      v = String(v).trim();
      var d = v.replace(/\D/g, '');
      return /^[\d\s()+.\-]+$/.test(v) && d.length >= 10 && d.length <= 13;
    }
    function impPareceInsta(v) { v = String(v).trim(); return /^@[A-Za-z0-9._]+$/.test(v) || /instagram\.com\//i.test(v); }

    /* "15/03/2024", "15-3-24", "2024-03-15" (com ou sem hora) viram "2024-03-15". Se não der, devolve "". */
    function impLerData(v) {
      var s = String(v || '').trim(), m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})(?:\D.*)?$/.exec(s), d, mes, a;
      if (m) {
        d = +m[1]; mes = +m[2]; a = +m[3];
        if (m[3].length === 2) a += 2000;
      } else {
        m = /^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})(?:\D.*)?$/.exec(s);
        if (!m) return '';
        a = +m[1]; mes = +m[2]; d = +m[3];
      }
      if (a < 1990 || a > 2100 || mes < 1 || mes > 12 || d < 1) return '';
      var dt = new Date(a, mes - 1, d);
      if (dt.getFullYear() !== a || dt.getMonth() !== mes - 1 || dt.getDate() !== d) return '';
      return a + '-' + pad(mes) + '-' + pad(d);
    }

    /* "Proposta enviada", "Fechado", "Sem resposta" e parecidos viram uma das quatro situações. "" se não reconhecer. */
    function impLerSituacao(v) {
      var h = impNormalizar(v);
      if (!h) return '';
      if (/\b(parad[oa]|pausad[oa]|inativ[oa]|perdid[oa]|recusou|recusad[oa]|arquivad[oa]|sem resposta|sem retorno|nao respondeu|declinou|cancelad[oa]|descartad[oa]|desistiu)\b/.test(h)) return 'parada';
      if (/\b(cliente|clientes|fechad[oa]|fechou|ativ[oa]|parceria|parceir[oa]|contratad[oa]|aprovad[oa]|ganh[oa]|convertid[oa])\b/.test(h)) return 'cliente';
      if (/\b(conversando|conversa|negociando|negociacao|em andamento|andamento|respondeu|em contato|retorno|interessad[oa]|quente|follow ?up|aguardando)\b/.test(h)) return 'conversando';
      if (/\b(lead|leads|novo|nova|prospect|prospeccao|primeiro contato|proposta|enviad[oa])\b/.test(h)) return 'lead';
      return '';
    }

    /* Pelo título da coluna, descobre para onde ela vai. Devolve "" se não reconhecer. */
    function impCampoDoCabecalho(titulo) {
      var h = impNormalizar(titulo);
      if (!h) return '';
      if (/\be ?mails?\b|\bcorreio\b/.test(h)) return 'email';
      if (/\b(telefone|tel|fone|celular|whats|whatsapp|zap|wpp)\b/.test(h)) return 'telefone';
      if ((/\b(instagram|insta|ig|arroba)\b/.test(h) && !/\b(seguidores|seguidor|followers|curtidas|likes|posts|publicacoes)\b/.test(h)) || h === '@') return 'instagram';
      if (/\bultim[oa] (contato|interacao|resposta|mensagem|retorno)\b|\bdata\b|\benviad[oa] em\b/.test(h)) return 'ultimo_contato';
      if (/\b(situacao|status|etapa|fase|estagio|andamento)\b/.test(h)) return 'situacao';
      if (/\b(obs|observacao|observacoes|nota|notas|comentario|comentarios|anotacao|anotacoes|detalhe|detalhes|descricao|historico)\b/.test(h)) return 'obs';
      if (/\b(nicho|nichos|segmento|segmentos|categoria|categorias|setor|ramo)\b/.test(h)) return 'nicho';
      if (/\b(favorit[oa]s?|estrela)\b/.test(h)) return 'favorita';
      if (/^(nome( d[aeo])?( marca| empresa| cliente| lead)?|marcas?|empresas?|cliente|brand|razao social|anunciante|lead)$/.test(h)) return 'nome';
      /* "Empresa (Marca)", "Marca / Empresa", "Nome da marca ou empresa": só palavras de nome e pelo menos uma que diga "marca" */
      var palavras = h.split(' ');
      if (palavras.every(function (p) { return /^(nome|da|do|de|e|ou|marcas?|empresas?|cliente|brand|lead)$/.test(p); }) &&
          palavras.some(function (p) { return /^(marcas?|empresas?|cliente|brand)$/.test(p); })) return 'nome';
      return '';
    }

    function impAmostra(corpo, indice, max) {
      var out = [], i, v;
      for (i = 0; i < corpo.length && out.length < max; i++) {
        v = String(corpo[i][indice] == null ? '' : corpo[i][indice]).trim();
        if (v) out.push(v);
      }
      return out;
    }
    function impProporcao(amostra, teste) {
      return amostra.length ? amostra.filter(teste).length / amostra.length : 0;
    }

    /* Decide o destino de cada coluna: primeiro pelo título, depois pelo conteúdo.
       O que sobrar com conteúdo vai para a Observação (com o título na frente), para não perder nada. */
    function impDetectarColunas(titulos, corpo) {
      var n = titulos.length, cols = [], usados = {}, i;
      corpo.forEach(function (l) { if (l.length > n) n = l.length; });
      for (i = 0; i < n; i++) {
        var titulo = String(titulos[i] == null ? '' : titulos[i]).trim();
        var campo = impCampoDoCabecalho(titulo);
        if (campo && campo !== 'obs' && usados[campo]) campo = 'obs';
        if (campo && campo !== 'obs') usados[campo] = true;
        cols.push({ indice: i, titulo: titulo || 'Coluna ' + (i + 1), semTitulo: !titulo, campo: campo, comRotulo: !!titulo && impCampoDoCabecalho(titulo) !== 'obs' });
      }
      var testes = {
        email: impPareceEmail,
        telefone: impPareceTelefone,
        instagram: impPareceInsta,
        ultimo_contato: function (v) { return !!impLerData(v); },
        situacao: function (v) { return !!impLerSituacao(v); }
      };
      cols.forEach(function (c) {
        if (c.campo) return;
        var amostra = impAmostra(corpo, c.indice, 40);
        if (!amostra.length) { c.vazia = true; return; }
        /* coluna de numeração ("#", "Nº", "Item" com 1, 2, 3...) não é dado da marca */
        var tn = impNormalizar(c.semTitulo ? '' : c.titulo);
        if ((tn === '' || /^(n|no|num|numero|item|id|ordem|seq|indice)$/.test(tn)) && impProporcao(amostra, function (v) { return /^\d{1,4}$/.test(v); }) >= 0.9) { c.numeracao = true; return; }
        Object.keys(testes).some(function (f) {
          if (usados[f] || impProporcao(amostra, testes[f]) < 0.6) return false;
          c.campo = f; c.comRotulo = false; usados[f] = true;
          return true;
        });
      });
      if (!usados.nome) {
        var primeira = cols.filter(function (c) { return !c.campo && !c.vazia && !c.numeracao; })[0];
        if (primeira) { primeira.campo = 'nome'; primeira.comRotulo = false; usados.nome = true; }
      }
      cols.forEach(function (c) { if (!c.campo) c.campo = (c.vazia || c.numeracao) ? '' : 'obs'; });
      /* coluna sem título e sem nenhum valor (sobra de formatação da planilha) nem aparece na lista */
      return cols.filter(function (c) { return !(c.semTitulo && c.vazia); });
    }

    /* "Sim", "Parcial" e parecidos contam como "a marca respondeu" */
    function impRespondeu(v) {
      return /^(sim|s|yes|y|true|verdadeiro|parcial|parcialmente|em parte)$/.test(impNormalizar(v));
    }
    /* Acha uma coluna do tipo "Teve resposta?" cheia de Sim e Não. Devolve o número dela, ou null.
       O painel só oferece usar essa coluna para definir a situação: nada muda sem você escolher. */
    function impAcharColunaResposta(cols, corpo) {
      var achada = null;
      cols.forEach(function (c) {
        if (achada !== null || c.campo !== 'obs') return;
        if (!/\b(teve resposta|respondeu|resposta|retorno)\b/.test(impNormalizar(c.titulo))) return;
        var amostra = impAmostra(corpo, c.indice, 60);
        if (!amostra.length) return;
        var simNao = amostra.filter(function (v) { return impRespondeu(v) || /^(nao|n|no|false|falso)$/.test(impNormalizar(v)); }).length;
        if (simNao / amostra.length >= 0.8 && amostra.some(impRespondeu)) achada = c.indice;
      });
      return achada;
    }

    /* Nas primeiras linhas, acha a que tem os títulos das colunas (duas ou mais que o painel reconhece).
       Serve para planilhas que começam com uma linha de título, como "Leads 2026". */
    function impAcharCabecalho(linhas) {
      var i;
      for (i = 0; i < Math.min(linhas.length, 10); i++) {
        if (linhas[i].filter(function (c) { return impCampoDoCabecalho(c); }).length >= 2) return i;
      }
      return 0;
    }

    /* Um texto comprido de explicação, e não o nome de uma marca */
    function impPareceFrase(t) {
      t = String(t == null ? '' : t).trim();
      return t.length >= 45 || t.split(/\s+/).length >= 7;
    }
    /* Tira do FIM da tabela as linhas de observação da planilha ("COMO USAR ESTA LISTA", "Fontes: ...").
       Elas têm uma célula só, enquanto as linhas de marca têm várias. Só corta se algum desses textos parecer
       mesmo uma frase, para não perder uma marca que veio só com o nome. */
    function impCortarNotas(corpo) {
      var vazio = { corpo: corpo, cortadas: 0, primeira: '' };
      function cheias(l) { return l.filter(function (x) { return String(x == null ? '' : x).trim() !== ''; }); }
      var qtde = corpo.map(function (l) { return cheias(l).length; });
      var fim = corpo.length, k, texto, frase = false, primeira = '';
      while (fim > 0 && qtde[fim - 1] === 1) fim--;                    /* o bloco final de linhas com uma célula só */
      if (fim === corpo.length || fim === 0) return vazio;              /* sem bloco, ou planilha inteira de uma coluna só: não dá para distinguir */
      var acima = qtde.slice(0, fim).sort(function (a, b) { return a - b; });
      if (acima[Math.floor(acima.length / 2)] < 2) return vazio;        /* as linhas de cima também são de uma célula só */
      for (k = corpo.length - 1; k >= fim; k--) {
        texto = String(cheias(corpo[k])[0]).trim();
        if (impPareceFrase(texto)) frase = true;
        primeira = texto;                                               /* vai ficando o texto mais de cima do bloco */
      }
      if (!frase) return vazio;
      return { corpo: corpo.slice(0, fim), cortadas: corpo.length - fim, primeira: primeira };
    }

    /* Separa o cabeçalho do resto. Se a primeira linha já é um contato (tem e-mail, telefone ou @), não há cabeçalho. */
    function impPreparar(linhas) {
      var topo = impAcharCabecalho(linhas);
      if (topo > 0) linhas = linhas.slice(topo);
      var cab = linhas[0] || [];
      var semCab = !cab.some(function (c) { return impCampoDoCabecalho(c); }) &&
        cab.some(function (c) { return impPareceEmail(c) || impPareceTelefone(c) || impPareceInsta(c); });
      var corpo = semCab ? linhas : linhas.slice(1);
      var corte = impCortarNotas(corpo);
      corpo = corte.corpo;
      var cols = impDetectarColunas(semCab ? [] : cab, corpo);
      return {
        cols: cols,
        corpo: corpo.slice(0, IMP_LIMITE_LINHAS),
        cortou: corpo.length > IMP_LIMITE_LINHAS,
        semCabecalho: semCab,
        notasIgnoradas: corte.cortadas,
        primeiraNota: corte.primeira,
        puladas: topo,
        situacaoPadrao: 'lead',
        respostaIndice: impAcharColunaResposta(cols, corpo),
        usarResposta: false
      };
    }

    /* "-", "n/a", "não encontrado", "sem e-mail", "(e-mail não capturado)" querem dizer "não tem": não viram dado nenhum */
    function impPlaceholder(v) {
      var h = impNormalizar(v);
      return /^-+$/.test(String(v).trim()) ||
        /^(n a|n d|nd|nulo|null|nenhum|nenhuma|sem|indisponivel|nao se aplica)$/.test(h) ||
        /^nao (tem|possui|encontrad[oa]s?|consta|informad[oa]s?|localizad[oa]s?|capturad[oa]s?|disponivel|publica)$/.test(h) ||
        /^sem (e ?mail|telefone|contato|instagram|whatsapp|site|link|informacao|dados)$/.test(h) ||
        /^(e ?mail|telefone|contato|instagram|whatsapp|site|link) (nao|sem) (tem|encontrad[oa]s?|capturad[oa]s?|informad[oa]s?|localizad[oa]s?|disponivel|publicad[oa]s?)$/.test(h);
    }

    /* Uma linha da planilha vira uma marca. O que não cabe em nenhum campo vai para a lista "obs". */
    function impMontarLinha(cols, linha) {
      var r = { nome: '', nicho: '', instagram: '', email: '', telefone: '', situacao: '', ultimo_contato: '', favorita: false, obs: [], cientifico: false };
      cols.forEach(function (c) {
        if (!c.campo) return;
        var v = String(linha[c.indice] == null ? '' : linha[c.indice]).replace(/\r\n?/g, '\n').trim().replace(/^'(?=[=+\-@])/, '');
        if (!v || (c.campo === 'nome' ? /^-+$/.test(v) : impPlaceholder(v))) return;
        if (c.campo === 'nome') r.nome = v;
        else if (c.campo === 'nicho') r.nicho = impLimparNicho(v);
        else if (c.campo === 'favorita') r.favorita = impEhSim(v);
        else if (c.campo === 'instagram') {
          var h = limparInsta(v);
          if (h) r.instagram = '@' + h; else r.obs.push('Instagram: ' + v);
        } else if (c.campo === 'email') {
          var achados = impEmails(v);
          if (achados.length) {
            r.email = achados[0];
            if (achados.length > 1) r.obs.push('Outros e-mails: ' + achados.slice(1).join(', '));
          } else r.obs.push('E-mail: ' + v);
        } else if (c.campo === 'telefone') {
          if (/^\d+(?:[.,]\d+)?e\+?\d+$/i.test(v.replace(/\s/g, ''))) r.cientifico = true;
          else {
            var tel = v.replace(/^(whats(app)?|zap|wpp|tel(efone)?|cel(ular)?|fone|contato)\.?\s*:?\s*/i, '').trim();   /* "WhatsApp (51) 99283-1964" vira "(51) 99283-1964" */
            if (tel) r.telefone = tel;
          }
        } else if (c.campo === 'situacao') {
          r.situacao = impLerSituacao(v);
          if (!r.situacao) r.obs.push('Situação: ' + v);
        } else if (c.campo === 'ultimo_contato') {
          r.ultimo_contato = impLerData(v);
          if (!r.ultimo_contato) r.obs.push('Último contato: ' + v);
        } else r.obs.push((c.comRotulo ? c.titulo + ': ' : '') + v);
      });
      return r;
    }

    /* Marca repetida = mesmo e-mail, ou mesmo nome sem e-mail diferente (a mesma marca com dois contatos entra as duas vezes). */
    function impNovoIndice() { return { porEmail: Object.create(null), porNome: Object.create(null) }; }
    function impChaveNome(nome) { return impNormalizar(nome).replace(/ /g, ''); }
    function impRegistrar(idx, nome, email) {
      var e = String(email || '').trim().toLowerCase(), k = impChaveNome(nome);
      if (e) idx.porEmail[e] = true;
      if (k) (idx.porNome[k] = idx.porNome[k] || []).push(e);
    }
    function impJaExiste(idx, nome, email) {
      var e = String(email || '').trim().toLowerCase();
      if (e && idx.porEmail[e]) return true;
      var lista = idx.porNome[impChaveNome(nome)];
      return !!lista && lista.some(function (x) { return !x || !e || x === e; });
    }

    /* Faz a conta toda: quantas entram, quantas já existem, quantas ficam de fora. */
    function impCalcular(imp, existentes) {
      var painel = impNovoIndice(), arquivo = impNovoIndice();
      var res = { lidas: imp.corpo.length, prontas: [], jaExistem: [], repetidas: 0, semNome: 0, notas: 0, cientificos: 0 };
      (existentes || []).forEach(function (m) { if (!m.exemplo) impRegistrar(painel, m.nome, m.email); });
      imp.corpo.forEach(function (linha) {
        var r = impMontarLinha(imp.cols, linha);
        /* opção da tela: quem respondeu ("Teve resposta?" = Sim ou Parcial) entra como Conversando, se a planilha não disse outra situação */
        if (imp.usarResposta && imp.respostaIndice != null && !r.situacao && impRespondeu(linha[imp.respostaIndice])) r.situacao = 'conversando';
        if (r.cientifico) res.cientificos++;
        if (!r.nome) { res.semNome++; return; }
        /* texto solto: uma explicação que ficou na coluna da marca, sem e-mail, telefone, Instagram nem outro dado */
        if (impPareceFrase(r.nome) && !r.email && !r.telefone && !r.instagram && !r.nicho && !r.ultimo_contato && !r.situacao && !r.obs.length) { res.notas++; return; }
        if (impJaExiste(painel, r.nome, r.email)) { res.jaExistem.push(r.nome); return; }
        if (impJaExiste(arquivo, r.nome, r.email)) { res.repetidas++; return; }
        impRegistrar(arquivo, r.nome, r.email);
        res.prontas.push({
          nome: impCortar(r.nome, 200),
          nicho: r.nicho || null,
          favorita: !!r.favorita,
          instagram: impCortar(r.instagram, 100) || null,
          email: impCortar(r.email, 200) || null,
          telefone: impCortar(r.telefone, 40) || null,
          situacao: r.situacao || imp.situacaoPadrao,
          obs: impCortar(r.obs.join('\n'), 3000) || null,
          ultimo_contato: r.ultimo_contato || null,
          exemplo: false
        });
      });
      return res;
    }
    /* IMP-LEITURA-FIM */

    /* Baixa só a linha de títulos, no mesmo formato do "Baixar CSV" (dá para subir de volta). */
    function impBaixarModelo() {
      baixarCSV('modelo-importar-marcas.csv', [['Marca', 'Nicho', 'Instagram', 'E-mail', 'Telefone', 'Situação', 'Observação', 'Último contato', 'Favorita'].map(function (t) { return celulaCSV(t); })]);
    }

    /* Tela 1: escolher o arquivo (clicando ou arrastando) */
    function impEscolher() {
      var partes = abrirModal({
        titulo: 'Importar planilha de marcas',
        largo: true,
        corpo: '<div id="impRaiz"><div id="impAviso"></div>' +
          '<p class="imp-texto">Suba a sua planilha em <strong>Excel (.xlsx)</strong> ou <strong>CSV</strong>. O painel descobre sozinho qual coluna é a marca, o e-mail, o Instagram, o telefone e assim por diante. Você confere tudo antes de importar.</p>' +
          '<label class="imp-zona" id="impZona" for="impArquivo">' + ic('subir') + '<strong>Escolher a planilha</strong><span>ou arraste o arquivo .xlsx ou .csv para cá</span></label>' +
          '<input type="file" id="impArquivo" class="sr-only" accept=".xlsx,.xlsm,.csv,.txt,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">' +
          '<p class="imp-dica">Pode subir o arquivo do Excel do jeito que está. Se preferir CSV: Arquivo, Salvar como, CSV UTF-8 (no Google Planilhas, Fazer download). Nada é salvo antes de você confirmar. ' +
          '<button type="button" class="imp-link" id="impModelo">Baixar modelo em branco</button></p></div>',
        botoes: [{ rotulo: 'Cancelar', aoClicar: fecharModal }]
      });
      var raiz = $('#impRaiz', partes.corpo), entrada = $('#impArquivo', raiz), zona = $('#impZona', raiz);
      if (!colunasNovas) $('#impAviso', raiz).innerHTML = '<div class="aviso grave" role="alert"><strong>Antes de importar</strong>Rode o arquivo disparo.sql no SQL Editor do Supabase (cria os campos Nicho, Favorita e Selecionada). Sem isso, o nicho da sua planilha se perderia.</div>';
      function erro(texto) {
        $('#impAviso', raiz).innerHTML = '<div class="aviso grave" role="alert">' + esc(texto) + '</div>';
        entrada.value = '';
      }
      async function receber(arquivo) {
        if (!arquivo) return;
        $('#impAviso', raiz).innerHTML = '';
        if (arquivo.size > IMP_LIMITE_ARQUIVO) { erro('Esse arquivo é grande demais. O limite é 2 MB.'); return; }
        var buf, lido, linhas, abas = null, aba = 0;
        try { buf = await arquivo.arrayBuffer(); lido = impDecodificar(buf); }
        catch (e) { erro('Não consegui abrir esse arquivo.'); return; }
        if (lido.antigo) { erro('Esse arquivo é do formato antigo do Excel (.xls) ou está protegido com senha. Abra no Excel, use Arquivo, Salvar como, Pasta de Trabalho do Excel (.xlsx) ou CSV UTF-8, e suba de novo.'); return; }
        if (lido.xlsx) {
          try { abas = await impLerXlsx(buf); }
          catch (e) { erro(impMensagemXlsx(e)); return; }
          aba = impEscolherAba(abas);
          linhas = abas[aba].linhas;
        } else {
          linhas = impLerCSV(lido.texto);
        }
        if (!linhas.length) { erro('A planilha está vazia.'); return; }
        var imp = impPreparar(linhas);
        imp.abas = abas;
        imp.aba = aba;
        if (!imp.corpo.length) { erro('Só achei a linha de títulos. Não há marcas para importar.'); return; }
        await carregarMarcas();
        impConferir(imp);
      }
      entrada.addEventListener('change', function () { receber(entrada.files && entrada.files[0]); });
      ['dragover', 'drop'].forEach(function (nome) {      /* soltar o arquivo fora da caixa não faz o navegador sair do painel */
        raiz.addEventListener(nome, function (e) { e.preventDefault(); });
      });
      ['dragenter', 'dragover'].forEach(function (nome) {
        zona.addEventListener(nome, function (e) { e.preventDefault(); zona.classList.add('sobre'); });
      });
      ['dragleave', 'drop'].forEach(function (nome) {
        zona.addEventListener(nome, function (e) { e.preventDefault(); zona.classList.remove('sobre'); });
      });
      zona.addEventListener('drop', function (e) { receber(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
      $('#impModelo', raiz).addEventListener('click', impBaixarModelo);
    }

    /* Tela 2: conferir as colunas e a prévia, e confirmar */
    function impConferir(imp) {
      var opcoesSituacao = SITUACOES.map(function (s) { return '<option value="' + s.v + '"' + (imp.situacaoPadrao === s.v ? ' selected' : '') + '>' + s.t + '</option>'; }).join('');
      var seletorAba = (imp.abas && imp.abas.length > 1)
        ? '<div class="campo imp-aba"><label for="impAba">Aba da planilha</label><select id="impAba">' + imp.abas.map(function (a, i) {
            return '<option value="' + i + '"' + (i === imp.aba ? ' selected' : '') + '>' + esc(a.nome) + ' (' + a.linhas.length + (a.linhas.length === 1 ? ' linha' : ' linhas') + ')</option>';
          }).join('') + '</select><span class="ajuda">A planilha tem mais de uma aba. Escolha a que tem as suas marcas.</span></div>'
        : '';
      var colResposta = imp.respostaIndice != null ? imp.cols.filter(function (c) { return c.indice === imp.respostaIndice; })[0] : null;
      var blocoResposta = colResposta
        ? '<div class="campo imp-situacao"><label for="impResposta">O que fazer com a coluna "' + esc(colResposta.titulo) + '"</label>' +
            '<select id="impResposta"><option value="0"' + (imp.usarResposta ? '' : ' selected') + '>Só guardar na observação (todas entram com a situação acima)</option>' +
            '<option value="1"' + (imp.usarResposta ? ' selected' : '') + '>Quem respondeu (Sim ou Parcial) entra como Conversando</option></select></div>'
        : '';
      var linhasMapa = imp.cols.map(function (c, i) {
        var primeiro = (impAmostra(imp.corpo, c.indice, 1)[0] || '').replace(/^'(?=[=+\-@])/, '');
        return '<tr><td><strong>' + esc(c.titulo) + '</strong></td>' +
          '<td class="imp-amostra" title="' + esc(primeiro) + '">' + esc(primeiro) + '</td>' +
          '<td><select class="entrada" data-col="' + i + '" aria-label="Para onde vai a coluna ' + esc(c.titulo) + '">' +
            IMP_CAMPOS.map(function (o) { return '<option value="' + o.v + '"' + (c.campo === o.v ? ' selected' : '') + '>' + o.t + '</option>'; }).join('') +
          '</select></td></tr>';
      }).join('');
      var partes = abrirModal({
        titulo: 'Conferir a planilha',
        largo: true,
        corpo: '<div id="impRaiz"><div id="impAviso"></div>' + seletorAba + '<div class="imp-resumo" id="impResumo"></div>' +
          '<h3 class="imp-titulo">Colunas da planilha</h3>' +
          '<div class="rolagem"><table class="tabela imp-mapa"><thead><tr><th>Coluna</th><th>Primeiro valor</th><th>Vai para</th></tr></thead><tbody>' + linhasMapa + '</tbody></table></div>' +
          '<div class="campo imp-situacao"><label for="impSituacao">Situação das marcas que não tiverem uma situação na planilha</label>' +
            '<select id="impSituacao">' + opcoesSituacao + '</select></div>' + blocoResposta +
          '<h3 class="imp-titulo">Prévia do que vai entrar</h3><div id="impPrevia"></div><div id="impNotas"></div></div>',
        botoes: [
          { rotulo: 'Trocar arquivo', esquerda: true, aoClicar: impEscolher },
          { rotulo: 'Cancelar', aoClicar: fecharModal },
          { rotulo: 'Importar', classe: 'principal-btn', aoClicar: function () { importar(); } }
        ]
      });
      var raiz = $('#impRaiz', partes.corpo);
      var botaoImportar = $$('button', partes.rodape).pop();

      function tabelaPrevia(lista) {
        if (!lista.length) return '<p class="vazio">Nada novo para importar.</p>';
        return '<div class="rolagem"><table class="tabela imp-previa"><thead><tr><th>Marca</th><th>Nicho</th><th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Último contato</th><th>Observação</th></tr></thead><tbody>' +
          lista.slice(0, 8).map(function (m) {
            var s = situacao(m.situacao);
            return '<tr><td><strong>' + esc(m.nome) + '</strong>' + (m.favorita ? '<span class="fav-marca" title="Favorita">' + ic('estrela') + '</span>' : '') + '</td>' +
              '<td>' + impNichos(m.nicho).map(function (n) { return '<span class="pilula p-nicho">' + esc(n) + '</span>'; }).join(' ') + '</td>' +
              '<td>' + esc(m.instagram || '') + '</td><td>' + esc(m.email || '') + '</td><td>' + esc(m.telefone || '') + '</td>' +
              '<td><span class="pilula ' + s.classe + '">' + s.t + '</span></td><td>' + esc(fmtData(m.ultimo_contato)) + '</td>' +
              '<td title="' + esc(m.obs || '') + '">' + esc((m.obs || '').replace(/\n/g, ' | ')) + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
          (lista.length > 8 ? '<p class="imp-nota">E mais ' + (lista.length - 8) + (lista.length - 8 === 1 ? ' marca.' : ' marcas.') + '</p>' : '');
      }

      function atualizar() {
        var r = imp.resultado = impCalcular(imp, cache.marcas);
        var chips = ['<span class="imp-chip"><b>' + r.lidas + '</b> ' + (r.lidas === 1 ? 'linha lida' : 'linhas lidas') + '</span>',
          '<span class="imp-chip ok"><b>' + r.prontas.length + '</b> ' + (r.prontas.length === 1 ? 'marca para importar' : 'marcas para importar') + '</span>'];
        if (r.jaExistem.length) chips.push('<span class="imp-chip aviso"><b>' + r.jaExistem.length + '</b> já ' + (r.jaExistem.length === 1 ? 'está' : 'estão') + ' no painel</span>');
        if (r.repetidas) chips.push('<span class="imp-chip aviso"><b>' + r.repetidas + '</b> ' + (r.repetidas === 1 ? 'repetida' : 'repetidas') + ' na planilha</span>');
        if (r.semNome) chips.push('<span class="imp-chip aviso"><b>' + r.semNome + '</b> sem nome de marca</span>');
        $('#impResumo', raiz).innerHTML = chips.join('');
        $('#impPrevia', raiz).innerHTML = tabelaPrevia(r.prontas);

        var notas = [];
        if (!colunasNovas) notas.push('<strong>Falta rodar o arquivo disparo.sql no Supabase.</strong> Enquanto isso, o botão Importar fica desligado (sem os campos Nicho e Favorita, o nicho da planilha se perderia).');
        if (imp.semCabecalho) notas.push('A planilha não tem linha de títulos. Reconheci as colunas pelo conteúdo.');
        if (imp.puladas) notas.push('Pulei ' + imp.puladas + (imp.puladas === 1 ? ' linha' : ' linhas') + ' de título no começo da planilha e usei a linha seguinte como títulos das colunas.');
        if (imp.notasIgnoradas) {
          notas.push('Ignorei ' + imp.notasIgnoradas + (imp.notasIgnoradas === 1 ? ' linha' : ' linhas') + ' de observação no fim da planilha, que não ' + (imp.notasIgnoradas === 1 ? 'é marca' : 'são marcas') +
            ' (começando por "' + esc(imp.primeiraNota.length > 50 ? imp.primeiraNota.slice(0, 50) + '...' : imp.primeiraNota) + '").');
        }
        if (r.notas) notas.push(r.notas + (r.notas === 1 ? ' linha de texto solto foi ignorada' : ' linhas de texto solto foram ignoradas') + ' (frases sem e-mail, telefone ou outro dado da marca).');
        var extras = imp.cols.filter(function (c) { return c.campo === 'obs' && c.comRotulo; });
        if (extras.length) {
          notas.push((extras.length === 1 ? 'A coluna ' : 'As colunas ') + extras.map(function (c) { return '"' + esc(c.titulo) + '"'; }).join(', ') +
            ' vão para a Observação, para você não perder nada. Se preferir, escolha "Não importar" na lista acima.');
        }
        if (r.jaExistem.length) {
          notas.push('Puladas porque já estão no painel: ' + r.jaExistem.slice(0, 6).map(esc).join(', ') + (r.jaExistem.length > 6 ? ' e mais ' + (r.jaExistem.length - 6) : '') + '.');
        }
        if (r.cientificos) notas.push(r.cientificos + (r.cientificos === 1 ? ' telefone veio' : ' telefones vieram') + ' em notação científica (o Excel estraga números longos) e ficou de fora. Formate a coluna como texto e salve de novo.');
        if (imp.cortou) notas.push('A planilha tem mais de ' + IMP_LIMITE_LINHAS + ' linhas. Só as primeiras ' + IMP_LIMITE_LINHAS + ' serão lidas.');
        $('#impNotas', raiz).innerHTML = notas.map(function (t) { return '<p class="imp-nota">' + t + '</p>'; }).join('');

        botaoImportar.textContent = r.prontas.length ? 'Importar ' + r.prontas.length + (r.prontas.length === 1 ? ' marca' : ' marcas') : 'Importar';
        botaoImportar.disabled = !r.prontas.length || !colunasNovas;
      }

      raiz.addEventListener('change', function (e) {
        var sel = e.target;
        if (sel.matches('select[data-col]')) {
          var i = +sel.getAttribute('data-col'), campo = sel.value;
          if (campo && campo !== 'obs') imp.cols.forEach(function (c, j) { if (j !== i && c.campo === campo) c.campo = ''; });
          imp.cols[i].campo = campo;
          $$('select[data-col]', raiz).forEach(function (s) { s.value = imp.cols[+s.getAttribute('data-col')].campo; });
        } else if (sel.id === 'impSituacao') {
          imp.situacaoPadrao = sel.value;
        } else if (sel.id === 'impResposta') {
          imp.usarResposta = sel.value === '1';
        } else if (sel.id === 'impAba') {
          var novo = impPreparar(imp.abas[+sel.value].linhas);      /* outra aba: lê de novo os títulos e as colunas */
          novo.abas = imp.abas; novo.aba = +sel.value; novo.situacaoPadrao = imp.situacaoPadrao;
          impConferir(novo);
          return;
        } else return;
        atualizar();
      });

      async function importar() {
        var lista = imp.resultado.prontas, botoes = $$('button', partes.rodape), feitas = 0, falhou = '', i, lote, r;
        if (!lista.length || !colunasNovas) return;
        botoes.forEach(function (b) { b.disabled = true; });
        for (i = 0; i < lista.length && !falhou; i += 50) {
          lote = lista.slice(i, i + 50);
          botaoImportar.textContent = 'Importando ' + (i + lote.length) + ' de ' + lista.length + '...';
          r = await gravar('marcas', lote);
          if (r.ok) feitas += lote.length; else falhou = r.erro;
        }
        await recarregar();
        if (falhou) {
          $('#impAviso', raiz).innerHTML = '<div class="aviso grave" role="alert"><strong>' + (feitas ? 'Importei ' + feitas + ' e parei.' : 'Não consegui importar.') + '</strong>' + esc(falhou) +
            (feitas ? ' As que entraram não serão repetidas se você tentar de novo.' : '') + '</div>';
          partes.corpo.scrollTop = 0;
          botoes.forEach(function (b) { b.disabled = false; });
          atualizar();
          return;
        }
        estado.busca = ''; estado.situacao = 'todas'; estado.nicho = 'todos'; estado.favoritas = false;
        var caixa = $('#marcasBusca', secaoAtual), filtro = $('#marcasFiltro', secaoAtual);
        if (caixa) caixa.value = '';
        if (filtro) filtro.value = 'todas';
        $$('#marcasFav button', secaoAtual).forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-fav') === '0')); });
        desenhar();
        fecharModal();
        aviso(feitas + (feitas === 1 ? ' marca importada.' : ' marcas importadas.'));
      }

      atualizar();
    }

    Abas.marcas = {
      titulo: 'Marcas',
      tabelas: TABELAS,
      abrir: async function (secao) {
        secaoAtual = secao;
        if (!secao.innerHTML.trim()) secao.innerHTML = '<p class="carregando">Carregando...</p>';
        await carregarMarcas();
        secao.innerHTML = '<div class="cartao">' +
          '<div class="ferramentas">' +
            '<div class="busca">' + ic('busca') + '<input type="search" id="marcasBusca" placeholder="Buscar por nome, nicho, @ ou e-mail" aria-label="Buscar marca" value="' + esc(estado.busca) + '"></div>' +
            '<select class="entrada" id="marcasFiltro" aria-label="Filtrar por situação"><option value="todas">Todas as situações</option>' +
              SITUACOES.map(function (s) { return '<option value="' + s.v + '"' + (estado.situacao === s.v ? ' selected' : '') + '>' + s.t + '</option>'; }).join('') + '</select>' +
            '<select class="entrada" id="marcasNicho" aria-label="Filtrar por nicho" hidden></select>' +
            '<div class="segmentos" id="marcasFav" role="group" aria-label="Mostrar marcas">' +
              '<button type="button" data-fav="0" aria-pressed="' + (!estado.favoritas) + '">Todas</button>' +
              '<button type="button" data-fav="1" aria-pressed="' + estado.favoritas + '">' + ic('estrela') + 'Favoritas</button></div>' +
            '<span id="marcasContagem" style="color:var(--muted);font-size:.8rem"></span>' +
            '<span class="espaco"></span>' +
            '<button type="button" class="btn" id="marcasBaixar">' + ic('baixar') + 'Baixar CSV</button>' +
            '<button type="button" class="btn" id="marcasImportar">' + ic('subir') + 'Importar planilha</button>' +
            '<button type="button" class="btn principal-btn" id="marcasNova">' + ic('mais') + 'Adicionar marca</button>' +
          '</div><div id="marcasSelecao" class="selecao-barra" hidden></div><div id="marcasTabela"></div></div>';

        $('#marcasSelecao', secao).addEventListener('click', function (e) {
          var b = e.target.closest('button[data-sel]');
          if (!b || b.disabled) return;
          if (b.getAttribute('data-sel') === 'visiveis') selecionarVisiveis(); else limparSelecao();
        });
        $('#marcasBusca', secao).addEventListener('input', function (e) { estado.busca = e.target.value; desenhar(); });
        $('#marcasFiltro', secao).addEventListener('change', function (e) { estado.situacao = e.target.value; desenhar(); });
        $('#marcasNicho', secao).addEventListener('change', function (e) { estado.nicho = e.target.value; desenhar(); });
        $('#marcasFav', secao).addEventListener('click', function (e) {
          var b = e.target.closest('button[data-fav]');
          if (!b) return;
          estado.favoritas = b.getAttribute('data-fav') === '1';
          $$('#marcasFav button', secao).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          desenhar();
        });
        $('#marcasBaixar', secao).addEventListener('click', baixar);
        $('#marcasImportar', secao).addEventListener('click', impEscolher);
        $('#marcasNova', secao).addEventListener('click', function () { abrirFormulario(null); });

        var alvo = $('#marcasTabela', secao);
        async function abrirLinha(e) {
          if (e.target.closest('a')) return;      /* link de Instagram, e-mail ou WhatsApp: deixa abrir */
          if (e.target.closest('label.sel-rotulo') && !e.target.closest('input')) return;   /* clique ao lado da caixinha: o clique de verdade vem em seguida */
          var tr = e.target.closest('tr[data-id]');
          if (!tr) return;
          var m = (cache.marcas || []).filter(function (x) { return x.id === tr.getAttribute('data-id'); })[0];
          if (!m) return;
          var caixa = e.target.closest('input[data-acao="selecionar"]');
          if (caixa) {
            if (pendentesSel[m.id]) { caixa.checked = !!m.selecionada; return; }
            var marcada = caixa.checked;
            pendentesSel[m.id] = true;
            m.selecionada = marcada;                                     /* a caixinha muda na hora, sem esperar o banco */
            tr.classList.toggle('selecionada', marcada);
            atualizarBarraSelecao();
            var rs = await gravar('marcas', { selecionada: marcada }, m.id);
            delete pendentesSel[m.id];
            if (!rs.ok) { m.selecionada = !marcada; desenhar(); aviso(rs.erro, 'erro'); }
            return;
          }
          if (e.target.closest('button[data-acao="estrela"]')) {
            if (!colunasNovas) { aviso('Para usar as favoritas, rode o arquivo disparo.sql no Supabase.', 'erro'); return; }
            if (pendentes[m.id]) return;
            pendentes[m.id] = true;
            var nova = !m.favorita;
            var foco = function () { var b = $('tr[data-id="' + m.id + '"] button[data-acao="estrela"]', secao); if (b) b.focus({ preventScroll: true }); };
            m.favorita = nova; desenhar(); foco();                       /* a estrela muda na hora, sem esperar o banco */
            var r = await gravar('marcas', { favorita: nova }, m.id);
            delete pendentes[m.id];
            if (!r.ok) { m.favorita = !nova; desenhar(); foco(); aviso(r.erro, 'erro'); }
            return;
          }
          abrirFormulario(m);
        }
        alvo.addEventListener('click', abrirLinha);
        alvo.addEventListener('keydown', function (e) {
          if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-id]')) { e.preventDefault(); abrirLinha(e); }
        });
        desenhar();
      }
    };
  })();

  /* =========================================================
     ABA 3: CALENDÁRIO
     Mês inteiro (segunda a domingo). Os prazos das campanhas
     aparecem sozinhos, puxados da aba Campanhas.
     ========================================================= */
  (function () {
    var TABELAS = ['calendario', 'campanhas'];
    var TIPOS = [
      { v: 'gravar', t: 'Gravar' },
      { v: 'editar', t: 'Editar' },
      { v: 'postar', t: 'Postar' }
    ];
    var DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    var agora = new Date();
    var estado = { ano: agora.getFullYear(), mes: agora.getMonth(), tipo: 'todos' };
    var secaoAtual = null;

    function nomeTipo(v) { return (TIPOS.filter(function (t) { return t.v === v; })[0] || { t: v }).t; }

    /* Junta os itens do calendário com os prazos das campanhas, por data */
    function todosOsItens(filtrarTipo) {
      var itens = [];
      (cache.calendario || []).forEach(function (c) {
        if (!c.data) return;
        if (filtrarTipo && estado.tipo !== 'todos' && c.tipo !== estado.tipo) return;
        itens.push({ especie: 'cal', id: c.id, data: String(c.data).slice(0, 10), titulo: c.titulo, marca: c.marca, tipo: c.tipo, feito: c.status === 'feito', bruto: c });
      });
      if (!filtrarTipo || estado.tipo === 'todos') {
        (cache.campanhas || []).forEach(function (c) {
          if (!c.prazo) return;
          itens.push({ especie: 'prazo', id: c.id, data: String(c.prazo).slice(0, 10), titulo: 'Prazo: ' + c.campanha, marca: c.cliente, tipo: 'prazo', feito: c.status === 'Entregue', bruto: c });
        });
      }
      return itens;
    }
    function porData(itens) {
      var mapa = {};
      itens.forEach(function (i) { (mapa[i.data] = mapa[i.data] || []).push(i); });
      Object.keys(mapa).forEach(function (d) {
        mapa[d].sort(function (a, b) { return (a.feito - b.feito) || comparaTexto(a.titulo, b.titulo); });
      });
      return mapa;
    }

    function chipItem(i, dia) {
      var classe = i.tipo === 'prazo' ? 't-prazo' : 't-' + i.tipo;
      return '<button type="button" class="cal-item ' + classe + (i.feito ? ' feito' : '') + '" data-acao="item" data-especie="' + i.especie + '" data-id="' + esc(i.id) + '"' +
        ' title="' + esc(i.titulo + (i.marca ? ' (' + i.marca + ')' : '') + (i.tipo === 'prazo' ? '' : ' - ' + nomeTipo(i.tipo))) + '">' +
        '<span>' + esc(i.titulo) + '</span></button>';
    }

    function desenharGrade() {
      var mapa = porData(todosOsItens(true));
      var hoje = hojeISO();
      var primeiro = new Date(estado.ano, estado.mes, 1);
      var deslocamento = (primeiro.getDay() + 6) % 7;                      /* segunda = 0 */
      var diasNoMes = new Date(estado.ano, estado.mes + 1, 0).getDate();
      var total = Math.ceil((deslocamento + diasNoMes) / 7) * 7;
      var html = DIAS.map(function (d) { return '<div class="cal-dow" role="columnheader">' + d + '</div>'; }).join('');
      for (var i = 0; i < total; i++) {
        var d = new Date(estado.ano, estado.mes, 1 - deslocamento + i);
        var iso = isoLocal(d);
        var fora = d.getMonth() !== estado.mes;
        var itens = mapa[iso] || [];
        var visiveis = itens.slice(0, 3);
        var resto = itens.length - visiveis.length;
        html += '<div class="cal-dia' + (fora ? ' fora' : '') + (iso === hoje ? ' hoje' : '') + '" data-data="' + iso + '" role="gridcell">' +
          '<span class="cal-num"' + (iso === hoje ? ' aria-label="Hoje, dia ' + d.getDate() + '"' : '') + '>' + d.getDate() + '</span>' +
          (fora ? '' : '<button type="button" class="cal-mais-add" data-acao="novo" title="Adicionar neste dia" aria-label="Adicionar neste dia, ' + esc(fmtData(iso)) + '">' + ic('mais') + '</button>') +
          visiveis.map(function (it) { return chipItem(it, iso); }).join('') +
          (resto > 0 ? '<button type="button" class="cal-mais" data-acao="mais">+' + resto + ' mais</button>' : '') +
          '</div>';
      }
      var nome = new Date(estado.ano, estado.mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      $('#calMes', secaoAtual).textContent = nome;
      $('#calGrade', secaoAtual).innerHTML = html;
      $$('#calTipos button', secaoAtual).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tipo') === estado.tipo)); });
    }

    function desenharAtrasados() {
      var hoje = hojeISO();
      var lista = todosOsItens(false).filter(function (i) { return !i.feito && i.data < hoje; })
        .sort(function (a, b) { return a.data < b.data ? -1 : 1; });
      var corpo;
      if (!lista.length) {
        corpo = '<p class="vazio">Nada atrasado. Tudo em dia.</p>';
      } else {
        corpo = '<ul class="atrasados">' + lista.map(function (i) {
          var dias = diasEntre(i.data, hoje);
          var rotuloDias = 'há ' + dias + (dias === 1 ? ' dia' : ' dias');
          var controle = i.especie === 'cal'
            ? '<input type="checkbox" class="marca-check" data-acao="feito" data-id="' + esc(i.id) + '" aria-label="Marcar como feito: ' + esc(i.titulo) + '">'
            : '<button type="button" class="btn pequeno" data-acao="ir-campanhas">Abrir campanhas</button>';
          return '<li>' + controle + '<div class="info"><strong>' + esc(i.titulo) + '</strong>' +
            '<small>' + (i.tipo === 'prazo' ? 'Prazo de campanha' : esc(nomeTipo(i.tipo))) + (i.marca ? ' · ' + esc(i.marca) : '') + ' · ' + esc(fmtData(i.data)) + '</small></div>' +
            '<span class="atraso-dias">' + rotuloDias + '</span></li>';
        }).join('') + '</ul>';
      }
      $('#calAtrasados', secaoAtual).innerHTML = '<div class="cartao"><div class="cartao-cab"><h2>Ficou pra trás</h2><span style="color:var(--muted);font-size:.8rem">O que passou do dia e ainda não foi feito</span></div>' +
        '<div class="cartao-corpo">' + corpo + '</div></div>';
    }

    function desenharTudo() {
      desenharGrade();
      desenharAtrasados();
      mostrarProblemas(TABELAS);
    }

    async function recarregar() {
      await Promise.all([listar('calendario', true), listar('campanhas', true)]);
      desenharTudo();
      if (diaAberto) abrirDia(diaAberto, true);
    }

    function camposItem() {
      return [
        { nome: 'titulo', rotulo: 'O que fazer', obrigatorio: true, largo: true },
        { nome: 'marca', rotulo: 'Marca' },
        { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: TIPOS.map(function (t) { return { v: t.v, t: t.t }; }) },
        { nome: 'data', rotulo: 'Data', tipo: 'date', obrigatorio: true },
        { nome: 'status', rotulo: 'Situação', tipo: 'select', opcoes: [{ v: 'a fazer', t: 'A fazer' }, { v: 'feito', t: 'Feito' }] }
      ];
    }

    function abrirFormulario(item, dataInicial) {
      var editando = !!item;
      formulario({
        titulo: editando ? 'Editar item' : 'Adicionar ao calendário',
        campos: camposItem(),
        valores: item || { tipo: 'gravar', status: 'a fazer', data: dataInicial || hojeISO() },
        textoApagar: 'Apagar este item do calendário?',
        aoSalvar: async function (v) {
          var r = await gravar('calendario', v, editando ? item.id : null);
          if (r.ok) {
            aviso(editando ? 'Item atualizado.' : 'Item adicionado.');
            /* Se o item foi para outro mês, leva o calendário para lá */
            var d = dataDeISO(v.data); estado.ano = d.getFullYear(); estado.mes = d.getMonth();
            await recarregar();
          }
          return r;
        },
        aoApagar: editando ? async function () {
          var r = await apagar('calendario', item.id);
          if (r.ok) { aviso('Item apagado.'); await recarregar(); }
          return r;
        } : null
      });
    }

    /* Janela com todos os itens de um dia */
    var diaAberto = null;
    function abrirDia(iso, atualizando) {
      diaAberto = iso;
      var itens = (porData(todosOsItens(true))[iso]) || [];
      var corpo = itens.length ? '<ul class="lista-dia">' + itens.map(function (i) {
        var controle = i.especie === 'cal'
          ? '<input type="checkbox" class="marca-check" data-acao="feito" data-id="' + esc(i.id) + '"' + (i.feito ? ' checked' : '') + ' aria-label="Marcar como feito: ' + esc(i.titulo) + '">'
          : '<span class="marca-check" aria-hidden="true"></span>';
        var acoes = i.especie === 'cal'
          ? '<button type="button" class="btn-icone" data-acao="editar" data-id="' + esc(i.id) + '" aria-label="Editar ' + esc(i.titulo) + '">' + ic('lapis') + '</button>' +
            '<button type="button" class="btn-icone perigo" data-acao="apagar" data-id="' + esc(i.id) + '" aria-label="Apagar ' + esc(i.titulo) + '">' + ic('lixo') + '</button>'
          : '<button type="button" class="btn pequeno" data-acao="ir-campanhas">Abrir campanhas</button>';
        return '<li>' + controle + '<div class="info"><strong' + (i.feito ? ' style="text-decoration:line-through;opacity:.7"' : '') + '>' + esc(i.titulo) + '</strong>' +
          '<small><span class="tipo-ponto t-' + esc(i.tipo) + '">' + (i.tipo === 'prazo' ? 'Prazo' : esc(nomeTipo(i.tipo))) + '</span>' + (i.marca ? esc(i.marca) : '') + '</small></div>' +
          '<div class="acoes">' + acoes + '</div></li>';
      }).join('') + '</ul>' : '<p class="vazio">Nada marcado para este dia.</p>';
      var partes = abrirModal({
        titulo: dataDeISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
        corpo: corpo,
        botoes: [
          { rotulo: 'Fechar', aoClicar: fecharModal },
          { rotulo: 'Adicionar neste dia', classe: 'principal-btn', aoClicar: function () { diaAberto = null; abrirFormulario(null, iso); } }
        ],
        aoFechar: function () { diaAberto = null; }
      });
      partes.corpo.onclick = async function (e) {
        var bt = e.target.closest('[data-acao]');
        if (!bt) return;
        var acao = bt.getAttribute('data-acao'), id = bt.getAttribute('data-id');
        var c = (cache.calendario || []).filter(function (x) { return x.id === id; })[0];
        if (acao === 'ir-campanhas') { fecharModal(); location.hash = '#campanhas'; }
        if (acao === 'editar' && c) { diaAberto = null; abrirFormulario(c); }
        if (acao === 'apagar' && c) {
          if (!(await confirmar('Apagar "' + c.titulo + '"?'))) return;
          var r = await apagar('calendario', c.id);
          if (r.ok) { aviso('Item apagado.'); await recarregar(); } else aviso(r.erro, 'erro');
        }
      };
      partes.corpo.onchange = async function (e) {
        var cx = e.target.closest('input[data-acao="feito"]');
        if (cx) await marcarFeito(cx.getAttribute('data-id'), cx.checked);
      };
      return atualizando;
    }

    async function marcarFeito(id, feito) {
      var r = await gravar('calendario', { status: feito ? 'feito' : 'a fazer' }, id);
      if (r.ok) { aviso(feito ? 'Marcado como feito.' : 'Voltou para "a fazer".'); await recarregar(); }
      else { aviso(r.erro, 'erro'); await recarregar(); }
    }

    Abas.calendario = {
      titulo: 'Calendário',
      tabelas: TABELAS,
      abrir: async function (secao) {
        secaoAtual = secao;
        if (!secao.innerHTML.trim()) secao.innerHTML = '<p class="carregando">Carregando...</p>';
        await Promise.all([listar('calendario', true), listar('campanhas', true)]);
        secao.innerHTML = '<div class="cal-cab">' +
          '<button type="button" class="btn-icone" id="calAnt" aria-label="Mês anterior">' + ic('esq') + '</button>' +
          '<h2 class="cal-mes" id="calMes" aria-live="polite"></h2>' +
          '<button type="button" class="btn-icone" id="calProx" aria-label="Próximo mês">' + ic('dir') + '</button>' +
          '<button type="button" class="btn pequeno" id="calHoje">Este mês</button>' +
          '<span style="flex:1"></span>' +
          '<div class="segmentos" id="calTipos" role="group" aria-label="Filtrar por tipo">' +
            '<button type="button" data-tipo="todos" aria-pressed="true">Todos</button>' +
            TIPOS.map(function (t) { return '<button type="button" data-tipo="' + t.v + '" aria-pressed="false">' + t.t + '</button>'; }).join('') + '</div>' +
          '<button type="button" class="btn principal-btn" id="calNovo">' + ic('mais') + 'Adicionar</button>' +
          '</div>' +
          '<div class="cal-grade" id="calGrade" role="grid" aria-label="Calendário do mês"></div>' +
          '<div id="calAtrasados" style="margin-top:1rem"></div>';

        $('#calAnt', secao).addEventListener('click', function () { var d = new Date(estado.ano, estado.mes - 1, 1); estado.ano = d.getFullYear(); estado.mes = d.getMonth(); desenharGrade(); });
        $('#calProx', secao).addEventListener('click', function () { var d = new Date(estado.ano, estado.mes + 1, 1); estado.ano = d.getFullYear(); estado.mes = d.getMonth(); desenharGrade(); });
        $('#calHoje', secao).addEventListener('click', function () { var d = new Date(); estado.ano = d.getFullYear(); estado.mes = d.getMonth(); desenharGrade(); });
        $('#calNovo', secao).addEventListener('click', function () { abrirFormulario(null, hojeISO()); });
        $('#calTipos', secao).addEventListener('click', function (e) {
          var b = e.target.closest('button[data-tipo]');
          if (b) { estado.tipo = b.getAttribute('data-tipo'); desenharGrade(); }
        });

        $('#calGrade', secao).addEventListener('click', function (e) {
          var bt = e.target.closest('[data-acao]');
          var celula = e.target.closest('.cal-dia');
          if (!celula) return;
          var iso = celula.getAttribute('data-data');
          if (bt && bt.getAttribute('data-acao') === 'mais') { abrirDia(iso); return; }
          if (bt && bt.getAttribute('data-acao') === 'item') {
            var id = bt.getAttribute('data-id');
            if (bt.getAttribute('data-especie') === 'prazo') { location.hash = '#campanhas'; return; }
            var c = (cache.calendario || []).filter(function (x) { return x.id === id; })[0];
            if (c) abrirFormulario(c);
            return;
          }
          if (celula.classList.contains('fora')) return;
          abrirFormulario(null, iso);           /* clique no dia (ou no "+"): já abre com a data preenchida */
        });

        $('#calAtrasados', secao).addEventListener('change', function (e) {
          var cx = e.target.closest('input[data-acao="feito"]');
          if (cx) marcarFeito(cx.getAttribute('data-id'), cx.checked);
        });
        $('#calAtrasados', secao).addEventListener('click', function (e) {
          if (e.target.closest('[data-acao="ir-campanhas"]')) location.hash = '#campanhas';
        });

        desenharTudo();
      }
    };
  })();

  /* =========================================================
     ABA 4: CAMPANHAS
     Controle de trabalhos, prazos e pagamentos.
     ========================================================= */
  (function () {
    var TABELAS = ['campanhas'];
    /* A ORDEM DO FUNIL. Ordenar por status segue esta ordem, nunca a ordem alfabética. */
    var STATUS = ['Briefing', 'Roteiro', 'Aprovação Roteiro', 'Gravação', 'Edição', 'Aprovado', 'Entregue'];
    var CLASSE_STATUS = {
      'Briefing': 'p-briefing', 'Roteiro': 'p-roteiro', 'Aprovação Roteiro': 'p-aprovacao', 'Gravação': 'p-gravacao',
      'Edição': 'p-edicao', 'Aprovado': 'p-aprovado', 'Entregue': 'p-entregue'
    };
    var TIPOS = ['Conteúdo', 'Publicidade'];
    var PAGAMENTOS = ['pendente', 'pago'];
    var COLUNAS = [
      { k: 'favorita', t: 'Destaque', curta: true },
      { k: 'campanha', t: 'Campanha' },
      { k: 'cliente', t: 'Cliente' },
      { k: 'tipo', t: 'Tipo' },
      { k: 'status', t: 'Status' },
      { k: 'qtd', t: 'Qtd', num: true },
      { k: 'valor', t: 'Valor', num: true },
      { k: 'prazo', t: 'Prazo' },
      { k: 'pagamento', t: 'Pagamento' }
    ];
    var estado = { filtro: 'todas', busca: '', col: 'prazo', dir: 'asc' };
    var secaoAtual = null;

    function nulo(v) { return v === null || v === undefined || v === ''; }

    /* Compara duas campanhas pela coluna escolhida. Vazios ficam sempre no fim. */
    function comparar(a, b) {
      var k = estado.col, sinal = estado.dir === 'asc' ? 1 : -1;
      var va = a[k], vb = b[k];
      if (k === 'favorita') { va = a.favorita ? 0 : 1; vb = b.favorita ? 0 : 1; }
      if (k === 'status') { va = STATUS.indexOf(a.status); vb = STATUS.indexOf(b.status); }
      if (k === 'pagamento') { va = PAGAMENTOS.indexOf(a.pagamento); vb = PAGAMENTOS.indexOf(b.pagamento); }
      if (nulo(va) && nulo(vb)) return 0;
      if (nulo(va)) return 1;
      if (nulo(vb)) return -1;
      var r;
      if (typeof va === 'number' && typeof vb === 'number') r = va - vb;
      else if (k === 'valor' || k === 'qtd') r = Number(va) - Number(vb);
      else if (k === 'prazo') r = String(va).localeCompare(String(vb));
      else r = comparaTexto(va, vb);
      return r * sinal || comparaTexto(a.campanha, b.campanha);
    }

    function linhasVisiveis() {
      var q = estado.busca.trim().toLowerCase();
      return (cache.campanhas || []).filter(function (c) {
        if (estado.filtro === 'ativas' && !c.ativa) return false;
        if (estado.filtro === 'finalizadas' && c.ativa) return false;
        return !q || (String(c.campanha || '') + ' ' + String(c.cliente || '')).toLowerCase().indexOf(q) >= 0;
      }).sort(comparar);
    }

    function etiquetaPrazo(c) {
      if (!c.prazo || c.status === 'Entregue') return '';         /* o que já foi entregue não recebe aviso */
      var dias = diasEntre(hojeISO(), String(c.prazo).slice(0, 10));
      if (dias < 0) { var n = -dias; return '<span class="etiqueta e-atraso">atrasado ' + n + (n === 1 ? ' dia' : ' dias') + '</span>'; }
      if (dias === 0) return '<span class="etiqueta e-aviso">vence hoje</span>';
      if (dias <= 3) return '<span class="etiqueta e-aviso">vence em ' + dias + (dias === 1 ? ' dia' : ' dias') + '</span>';
      return '';
    }

    function htmlNumeros() {
      var reais = (cache.campanhas || []).filter(function (c) { return !c.exemplo; });    /* linhas de exemplo não entram nas contas */
      var total = reais.length;
      var ativas = reais.filter(function (c) { return c.ativa; }).length;
      var valorTotal = reais.reduce(function (s, c) { return s + (Number(c.valor) || 0); }, 0);
      var videos = reais.reduce(function (s, c) { return s + (Number(c.qtd) || 0); }, 0);
      var ticket = videos > 0 ? valorTotal / videos : null;
      var aReceber = reais.filter(function (c) { return c.pagamento !== 'pago'; }).reduce(function (s, c) { return s + (Number(c.valor) || 0); }, 0);
      var recebido = reais.filter(function (c) { return c.pagamento === 'pago'; }).reduce(function (s, c) { return s + (Number(c.valor) || 0); }, 0);
      return '<div class="cartao faixa-numeros quatro" role="group" aria-label="Resumo das campanhas">' +
        '<div class="numero"><div class="numero-rotulo">Campanhas</div><div class="numero-valor">' + fmtInt(total) + '</div></div>' +
        '<div class="numero"><div class="numero-rotulo">Ativas</div><div class="numero-valor">' + fmtInt(ativas) + '</div></div>' +
        '<div class="numero"><div class="numero-rotulo">Valor total</div><div class="numero-valor">' + fmtMoeda(valorTotal) + '</div>' +
          '<div class="numero-sub">' + (ticket === null ? 'Ticket médio: ainda sem vídeos' : 'Ticket médio por vídeo: ' + fmtMoeda(ticket)) + '</div></div>' +
        '<div class="numero"><div class="numero-rotulo">A receber</div><div class="numero-valor">' + fmtMoeda(aReceber) + '</div>' +
          '<div class="numero-sub">Já recebido: ' + fmtMoeda(recebido) + '</div></div>' +
        '</div>';
    }

    function htmlCabecalho() {
      return '<tr>' + COLUNAS.map(function (c) {
        var ativa = estado.col === c.k;
        var seta = ativa ? (estado.dir === 'asc' ? 'setaCima' : 'setaBaixo') : 'ordenar';
        return '<th class="ordenavel' + (ativa ? ' ativa' : '') + (c.num ? ' num' : '') + '" scope="col" aria-sort="' + (ativa ? (estado.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '">' +
          '<button type="button" data-ordenar="' + c.k + '" title="Ordenar por ' + esc(c.t.toLowerCase()) + '">' + esc(c.t) + ic(seta, 'seta') + '</button></th>';
      }).join('') + '</tr>';
    }

    function htmlLinha(c) {
      var st = c.status;
      return '<tr class="clicavel' + (c.favorita ? ' favorita' : '') + '" data-id="' + esc(c.id) + '" tabindex="0">' +
        '<td><button type="button" class="estrela' + (c.favorita ? ' ligada' : '') + '" data-acao="estrela" aria-pressed="' + (c.favorita ? 'true' : 'false') + '" title="' + (c.favorita ? 'Tirar o destaque' : 'Destacar campanha') + '" aria-label="' + (c.favorita ? 'Tirar o destaque de ' : 'Destacar ') + esc(c.campanha) + '">' + ic('estrela') + '</button></td>' +
        '<td><strong>' + esc(c.campanha) + '</strong>' + (c.exemplo ? '<span class="exemplo-tag">EXEMPLO</span>' : '') + (c.ativa ? '' : '<span class="sub">Finalizada</span>') + '</td>' +
        '<td>' + esc(c.cliente || '') + '</td>' +
        '<td><span class="pilula ' + (c.tipo === 'Publicidade' ? 'p-publicidade' : 'p-conteudo') + '">' + esc(c.tipo || '') + '</span></td>' +
        '<td><span class="pilula ' + (CLASSE_STATUS[st] || 'p-briefing') + '">' + esc(st || '') + '</span></td>' +
        '<td class="num">' + fmtInt(c.qtd) + '</td>' +
        '<td class="num">' + fmtMoeda(c.valor) + '</td>' +
        '<td>' + esc(fmtData(c.prazo)) + etiquetaPrazo(c) + '</td>' +
        '<td><span class="pilula ' + (c.pagamento === 'pago' ? 'p-pago' : 'p-pendente') + '">' + (c.pagamento === 'pago' ? 'Pago' : 'Pendente') + '</span></td></tr>';
    }

    function desenhar() {
      var todas = cache.campanhas || [];
      var lista = linhasVisiveis();
      $('#campNumeros', secaoAtual).innerHTML = htmlNumeros();
      var corpo;
      if (!todas.length) corpo = '<p class="vazio">Você ainda não tem campanhas. Clique em "Adicionar campanha" para começar.</p>';
      else if (!lista.length) corpo = '<p class="vazio">Nenhuma campanha encontrada com essa busca ou esse filtro.</p>';
      else corpo = '<div class="rolagem"><table class="tabela"><thead>' + htmlCabecalho() + '</thead><tbody>' + lista.map(htmlLinha).join('') + '</tbody></table></div>';
      $('#campTabela', secaoAtual).innerHTML = corpo;
      $$('#campFiltro button', secaoAtual).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filtro') === estado.filtro)); });
    }

    function campos() {
      return [
        { nome: 'campanha', rotulo: 'Campanha', obrigatorio: true, largo: true },
        { nome: 'cliente', rotulo: 'Cliente' },
        { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: TIPOS },
        { nome: 'status', rotulo: 'Status', tipo: 'select', opcoes: STATUS },
        { nome: 'qtd', rotulo: 'Quantidade de vídeos', tipo: 'number', minimo: 0, passo: 1 },
        { nome: 'valor', rotulo: 'Valor (R$)', tipo: 'number', minimo: 0, passo: 0.01 },
        { nome: 'prazo', rotulo: 'Prazo', tipo: 'date' },
        { nome: 'pagamento', rotulo: 'Pagamento', tipo: 'select', opcoes: [{ v: 'pendente', t: 'Pendente' }, { v: 'pago', t: 'Pago' }] },
        { nome: 'ativa', rotulo: 'Campanha ativa', tipo: 'checkbox' },
        { nome: 'favorita', rotulo: 'Destacar (estrela)', tipo: 'checkbox' }
      ];
    }

    async function recarregar() {
      await listar('campanhas', true);
      desenhar();
      mostrarProblemas(TABELAS);
    }

    function abrirFormulario(camp) {
      var editando = !!camp;
      formulario({
        titulo: editando ? 'Editar campanha' : 'Adicionar campanha',
        campos: campos(),
        valores: camp || { tipo: 'Conteúdo', status: 'Briefing', qtd: 0, valor: 0, pagamento: 'pendente', ativa: true, favorita: false },
        textoApagar: 'Apagar esta campanha? Não dá para desfazer.',
        aoSalvar: async function (v) {
          if (v.qtd == null) v.qtd = 0;
          if (v.valor == null) v.valor = 0;
          if (v.qtd < 0 || v.valor < 0) return { ok: false, erro: 'Quantidade e valor não podem ser negativos.' };
          /* Quando marca "Entregue", a campanha vira finalizada sozinha */
          if (v.status === 'Entregue' && v.ativa && (!editando || camp.status !== 'Entregue')) {
            v.ativa = false;
            aviso('Campanha entregue: marquei como finalizada.');
          }
          var r = await gravar('campanhas', v, editando ? camp.id : null);
          if (r.ok) { aviso(editando ? 'Campanha atualizada.' : 'Campanha adicionada.'); await recarregar(); }
          return r;
        },
        aoApagar: editando ? async function () {
          var r = await apagar('campanhas', camp.id);
          if (r.ok) { aviso('Campanha apagada.'); await recarregar(); }
          return r;
        } : null
      });
    }

    function baixar() {
      var lista = (cache.campanhas || []).filter(function (c) { return !c.exemplo; });
      if (!lista.length) { aviso('Ainda não há campanhas para baixar.', 'erro'); return; }
      var cab = ['Campanha', 'Cliente', 'Tipo', 'Status', 'Qtd', 'Valor', 'Prazo', 'Pagamento', 'Ativa', 'Destaque'].map(function (t) { return celulaCSV(t); });
      var linhas = [cab].concat(lista.sort(comparar).map(function (c) {
        return [celulaCSV(c.campanha), celulaCSV(c.cliente), celulaCSV(c.tipo), celulaCSV(c.status), celulaCSV(c.qtd),
          celulaCSV(String(Number(c.valor) || 0).replace('.', ',')), celulaCSV(fmtData(c.prazo)),
          celulaCSV(c.pagamento === 'pago' ? 'Pago' : 'Pendente'), celulaCSV(c.ativa ? 'Sim' : 'Não'), celulaCSV(c.favorita ? 'Sim' : 'Não')];
      }));
      baixarCSV('campanhas-' + hojeISO() + '.csv', linhas);
      aviso('Arquivo baixado. Ele abre direto no Excel.');
    }

    Abas.campanhas = {
      titulo: 'Campanhas',
      tabelas: TABELAS,
      abrir: async function (secao) {
        secaoAtual = secao;
        if (!secao.innerHTML.trim()) secao.innerHTML = '<p class="carregando">Carregando...</p>';
        await listar('campanhas', true);
        secao.innerHTML = '<div id="campNumeros"></div><div class="cartao">' +
          '<div class="ferramentas">' +
            '<div class="segmentos" id="campFiltro" role="group" aria-label="Filtrar campanhas">' +
              '<button type="button" data-filtro="todas" aria-pressed="true">Todas</button>' +
              '<button type="button" data-filtro="ativas" aria-pressed="false">Ativas</button>' +
              '<button type="button" data-filtro="finalizadas" aria-pressed="false">Finalizadas</button></div>' +
            '<div class="busca">' + ic('busca') + '<input type="search" id="campBusca" placeholder="Buscar campanha ou cliente" aria-label="Buscar campanha" value="' + esc(estado.busca) + '"></div>' +
            '<span class="espaco"></span>' +
            '<button type="button" class="btn" id="campBaixar">' + ic('baixar') + 'Baixar CSV</button>' +
            '<button type="button" class="btn principal-btn" id="campNova">' + ic('mais') + 'Adicionar campanha</button>' +
          '</div><div id="campTabela"></div></div>';

        $('#campFiltro', secao).addEventListener('click', function (e) {
          var b = e.target.closest('button[data-filtro]');
          if (b) { estado.filtro = b.getAttribute('data-filtro'); desenhar(); }
        });
        $('#campBusca', secao).addEventListener('input', function (e) { estado.busca = e.target.value; desenhar(); });
        $('#campBaixar', secao).addEventListener('click', baixar);
        $('#campNova', secao).addEventListener('click', function () { abrirFormulario(null); });

        var alvo = $('#campTabela', secao);
        async function aoClicar(e) {
          var ord = e.target.closest('button[data-ordenar]');
          if (ord) {                                   /* clicar no cabeçalho ordena; clicar de novo inverte */
            var k = ord.getAttribute('data-ordenar');
            if (estado.col === k) estado.dir = estado.dir === 'asc' ? 'desc' : 'asc'; else { estado.col = k; estado.dir = 'asc'; }
            desenhar();
            var novo = $('button[data-ordenar="' + k + '"]', secao);
            if (novo) novo.focus();
            return;
          }
          var tr = e.target.closest('tr[data-id]');
          if (!tr) return;
          var c = (cache.campanhas || []).filter(function (x) { return x.id === tr.getAttribute('data-id'); })[0];
          if (!c) return;
          if (e.target.closest('button[data-acao="estrela"]')) {
            var r = await gravar('campanhas', { favorita: !c.favorita }, c.id);
            if (r.ok) await recarregar(); else aviso(r.erro, 'erro');
            return;
          }
          abrirFormulario(c);
        }
        alvo.addEventListener('click', aoClicar);
        alvo.addEventListener('keydown', function (e) {
          if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-id]')) { e.preventDefault(); aoClicar(e); }
        });
        desenhar();
      }
    };
  })();

  /* =========================================================
     ABA: PROSPECÇÃO
     Manda o seu e-mail de apresentação para várias marcas de uma vez, chamando cada uma pelo nome.
     Os e-mails vêm da aba Marcas (nenhum cadastro novo). O envio automático é feito pela função
     "enviar-emails" no Supabase, pelo Resend: a chave do Resend fica guardada lá, NUNCA aqui.
     Sem Resend, o modo "Rascunho no Gmail" monta o e-mail de cada marca para você enviar.
     As tabelas email_envios e email_optout vêm do arquivo disparo.sql.
     ========================================================= */
  (function () {
    var TABELAS = ['marcas', 'email_envios', 'email_optout'];
    var LOTE = 100;                                  /* a função aceita até 250 por vez; o painel manda de 100 em 100 */
    var CHAVE_LOCAL = 'prospeccaoRascunho';
    var MSG_SEM_FUNCAO = 'Não consegui falar com a função enviar-emails. Confira se ela foi criada no Supabase (Edge Functions) e se a internet está funcionando.';

    /* PRO-PURO-INICIO */
    /* Estas funções só mexem com texto e listas (não tocam na tela nem no banco). */
    var PRO_EMAIL_DONA = 'contatoesthercustodio@gmail.com';
    var PRO_NOME_DONA = 'Esther Custódio';
    var PRO_ARTIGOS = ['o', 'a', 'os', 'as', 'um', 'uma'];
    var PRO_ORDEM_SITUACAO = ['lead', 'conversando', 'cliente', 'parada'];
    var PRO_ROTULO_SITUACAO = { lead: 'Só os leads', conversando: 'Só quem está conversando', cliente: 'Só quem já é cliente', parada: 'Só as marcas paradas' };

    function proEsc(t) {
      return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    function proEmailValido(e) {
      e = String(e == null ? '' : e).trim();
      return e.length <= 254 && /^[^\s@;,<>()"']+@[^\s@;,<>()"']+\.[^\s@;,<>()"']+$/.test(e);
    }
    function proLimparAssunto(a) {
      return String(a == null ? '' : a).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
    }

    /* "Natura Cosméticos" vira "Natura". "O Boticário" vira "Boticário". "L'Oréal Paris" vira "L'Oréal". */
    function proPrimeiroNome(marca) {
      var inteiro = String(marca == null ? '' : marca).trim();
      var palavras = inteiro.split(/\s+/).filter(Boolean);
      while (palavras.length > 1 && PRO_ARTIGOS.indexOf(palavras[0].toLowerCase().replace(/[^\p{L}]/gu, '')) >= 0) palavras.shift();
      var primeira = (palavras[0] || '').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      return primeira || inteiro;
    }

    /* Troca {{nome}} e {{marca}}. No HTML o valor é "escapado" (o & de "Ben & Jerry's" não quebra o e-mail). */
    function proTrocarCampos(modelo, dados, comoHtml) {
      return String(modelo == null ? '' : modelo).replace(/\{\{\s*(nome|marca)\s*\}\}/gi, function (_m, campo) {
        var valor = campo.toLowerCase() === 'nome' ? dados.nome : dados.marca;
        return comoHtml ? proEsc(valor) : String(valor).replace(/[\r\n]+/g, ' ');
      });
    }

    /* Endereços que começam com http:// ou https:// viram links clicáveis */
    function proLinkificar(paragrafo) {
      var re = /https?:\/\/[^\s<>"']+/g, saida = '', ultimo = 0, m, url;
      while ((m = re.exec(paragrafo))) {
        url = m[0].replace(/[.,;:!?)\]]+$/, '');
        saida += proEsc(paragrafo.slice(ultimo, m.index)) +
          '<a href="' + proEsc(url) + '" style="color:#4d301b;text-decoration:underline;">' + proEsc(url) + '</a>';
        ultimo = m.index + url.length;
        re.lastIndex = ultimo;
      }
      return saida + proEsc(paragrafo.slice(ultimo));
    }
    /* O texto que você escreve vira parágrafos: linha em branco separa, quebra simples vira quebra de linha */
    function proTextoParaHtml(texto) {
      var limpo = String(texto == null ? '' : texto).replace(/\r\n?/g, '\n').trim();
      if (!limpo) return '';
      return limpo.split(/\n{2,}/).map(function (par) {
        return '<p style="margin:0 0 16px 0;">' + proLinkificar(par).replace(/\n/g, '<br>') + '</p>';
      }).join('');
    }

    /* O e-mail limpo do modo "Texto fácil": fundo branco, letra escura, até 560 px, botão opcional e o rodapé do SAIR.
       Os {{campos}} ficam como estão: quem troca pelo nome de cada marca é o carteiro (ou a prévia). */
    function proMontarEmail(o) {
      var corpo = proTextoParaHtml(o.texto);
      var link = String(o.botaoLink || '').trim(), rotulo = String(o.botaoTexto || '').trim();
      var fonte = 'font-family:Arial,Helvetica,sans-serif;';
      var botao = (rotulo && /^https?:\/\//i.test(link))
        ? '<tr><td style="padding:6px 0 26px 0;"><a href="' + proEsc(link) + '" style="display:inline-block;background:#4d301b;color:#ffffff;' + fonte + 'font-size:16px;font-weight:bold;line-height:1;text-decoration:none;padding:14px 26px;border-radius:8px;">' + proEsc(rotulo) + '</a></td></tr>\n'
        : '';
      return '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title></title>\n</head>\n' +
        '<body style="margin:0;padding:0;background:#ffffff;">\n' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">\n' +
        '<tr><td align="center" style="padding:24px 16px;">\n' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">\n' +
        '<tr><td style="' + fonte + 'font-size:16px;line-height:1.6;color:#1a1a1a;">' + corpo + '</td></tr>\n' +
        botao +
        '<tr><td style="' + fonte + 'font-size:12px;line-height:1.5;color:#8a8a8a;border-top:1px solid #eeeeee;padding-top:16px;">Se você não quer receber mais e-mails meus, é só responder com SAIR.</td></tr>\n' +
        '</table>\n</td></tr>\n</table>\n</body>\n</html>';
    }
    /* O HTML que vai sair: no modo "Texto fácil" é o e-mail montado; no modo HTML é exatamente o que foi colado */
    function proHtmlFinal(e) {
      if (e.modo === 'html') return String(e.html || '');
      return String(e.texto || '').trim() ? proMontarEmail(e) : '';
    }
    /* Versão só texto (para o Gmail e para copiar) */
    function proTextoDoHtml(html) {
      return String(html == null ? '' : html)
        .replace(/<(head|style|script)[\s\S]*?<\/\1>/gi, '')
        .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, function (_m, href, interno) {
          var texto = interno.replace(/<[^>]+>/g, '').trim();
          return texto && texto !== href ? texto + ' (' + href + ')' : href;
        })
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
        .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    function proTemSair(html) { return /\bSAIR\b/.test(String(html == null ? '' : html)); }

    /* Um "carimbo" do que está escrito. Serve para saber se o teste foi feito com este mesmo e-mail. */
    function proAssinatura(e) {
      var corpo = e.modo === 'html'
        ? String(e.html || '').trim()
        : [e.texto, e.botaoTexto, e.botaoLink].map(function (x) { return String(x || '').trim(); }).join('|');
      return [e.modo, String(e.assunto || '').trim(), corpo].join('###');
    }
    function proGmailLink(email, assunto, corpo) {
      return 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(email) + '&su=' + encodeURIComponent(assunto) + '&body=' + encodeURIComponent(corpo);
    }

    /* De uma lista de marcas para uma lista de destinatários: sem e-mail, descadastrados e repetidos ficam de fora */
    function proDestinatarios(marcas, optout) {
      var vistos = Object.create(null), r = { lista: [], semEmail: 0, repetidos: 0, descadastrados: 0 };
      (marcas || []).forEach(function (m) {
        var e = String(m.email == null ? '' : m.email).trim().toLowerCase();
        if (!proEmailValido(e)) { r.semEmail++; return; }
        if (optout && optout[e]) { r.descadastrados++; return; }
        if (vistos[e]) { r.repetidos++; return; }
        vistos[e] = true;
        r.lista.push({ email: e, marca: m.nome, marca_id: m.id || null, nome: proPrimeiroNome(m.nome) });
      });
      return r;
    }
    /* Uma opção de lista para cada situação que existe na sua tabela de marcas */
    function proSituacoes(marcas) {
      var vistos = Object.create(null), extras = [];
      (marcas || []).forEach(function (m) {
        var s = String(m.situacao == null ? '' : m.situacao).trim();
        if (!s || vistos[s]) return;
        vistos[s] = true;
        if (PRO_ORDEM_SITUACAO.indexOf(s) < 0) extras.push(s);
      });
      extras.sort();
      return PRO_ORDEM_SITUACAO.filter(function (s) { return vistos[s]; }).concat(extras).map(function (s) {
        return { v: s, t: Object.prototype.hasOwnProperty.call(PRO_ROTULO_SITUACAO, s) ? PRO_ROTULO_SITUACAO[s] : 'Só as marcas "' + s + '"' };
      });
    }
    /* PRO-PURO-FIM */

    var estado = {
      lista: 'selecionadas', modo: 'texto', canal: 'resend',
      assunto: '', texto: '', html: '', botaoTexto: '', botaoLink: '',
      pular: true, busca: '', soErros: false, testeAssinatura: '', enviando: false
    };
    var dados = { envios: [], optoutLista: [], optout: Object.create(null), totalOk: null, temEnvios: true, temOptout: true, temSelecao: true };
    var secaoAtual = null;
    var fila = null;
    var timerPrevia = 0;
    var restaurado = false;

    function el(id) { return secaoAtual ? $('#' + id, secaoAtual) : null; }
    function dataHora(iso) {
      var d = new Date(iso);
      return isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    /* ---- o que você escreveu fica guardado neste navegador (para voltar amanhã e continuar) ---- */
    function guardarLocal() {
      try {
        window.localStorage.setItem(CHAVE_LOCAL, JSON.stringify({
          modo: estado.modo, canal: estado.canal, lista: estado.lista, assunto: estado.assunto, texto: estado.texto, html: estado.html,
          botaoTexto: estado.botaoTexto, botaoLink: estado.botaoLink, pular: estado.pular, testeAssinatura: estado.testeAssinatura
        }));
      } catch (e) { /* sem armazenamento no navegador: segue sem guardar */ }
    }
    function restaurarLocal() {
      if (restaurado) return;
      restaurado = true;
      var s = null;
      try { s = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL) || 'null'); } catch (e) { s = null; }
      if (!s || typeof s !== 'object') return;
      ['modo', 'canal', 'lista', 'assunto', 'texto', 'html', 'botaoTexto', 'botaoLink', 'testeAssinatura'].forEach(function (k) {
        if (typeof s[k] === 'string') estado[k] = s[k];
      });
      if (typeof s.pular === 'boolean') estado.pular = s.pular;
      if (estado.modo !== 'html') estado.modo = 'texto';
      if (estado.canal !== 'rascunho') estado.canal = 'resend';
    }

    /* ---- ler do banco ---- */
    async function lerTabela(tabela, limite) {
      try {
        var r = await banco.from(tabela).select('*').order('criado_em', { ascending: false }).limit(limite);
        if (r.error) { problemas[tabela] = descreverErro(tabela, r.error); return null; }
        delete problemas[tabela];
        return r.data || [];
      } catch (e) {
        problemas[tabela] = descreverErro(tabela, e);
        return null;
      }
    }
    async function contarEnviados() {
      try {
        var r = await banco.from('email_envios').select('id', { count: 'exact', head: true }).eq('status', 'ok').neq('canal', 'teste');
        return r.error ? null : r.count;
      } catch (e) { return null; }
    }
    async function carregar() {
      var res = await Promise.all([listar('marcas', true), lerTabela('email_envios', 1000), lerTabela('email_optout', 3000), contarEnviados()]);
      dados.temEnvios = res[1] !== null;
      dados.envios = res[1] || [];
      dados.temOptout = res[2] !== null;
      dados.optoutLista = res[2] || [];
      dados.optout = Object.create(null);
      dados.optoutLista.forEach(function (o) { dados.optout[String(o.email).toLowerCase()] = true; });
      dados.totalOk = res[3];
      var m0 = (cache.marcas || [])[0];
      dados.temSelecao = !m0 || 'selecionada' in m0;
      if (!dados.temSelecao) problemas.marcas = 'Falta o campo "selecionada" na tabela "marcas". Cole o arquivo disparo.sql no SQL Editor do Supabase e clique em Run. Até lá, a lista "só as marcas selecionadas" fica vazia.';
    }

    /* ---- quem pode receber ---- */
    function marcasElegiveis() { return (cache.marcas || []).filter(function (m) { return !m.exemplo; }); }
    function baseComEmail() { return marcasElegiveis().filter(function (m) { return proEmailValido(m.email); }); }
    function todasAsListas() {
      var todas = marcasElegiveis();
      var itens = [
        { id: 'selecionadas', rotulo: 'Só as marcas selecionadas', marcas: todas.filter(function (m) { return m.selecionada; }) },
        { id: 'teste', rotulo: 'Só para mim (teste)', teste: true, marcas: [] },
        { id: 'todas', rotulo: 'Todas as marcas que têm e-mail', marcas: todas }
      ];
      proSituacoes(todas).forEach(function (s) {
        itens.push({ id: 'sit:' + s.v, rotulo: s.t, marcas: todas.filter(function (m) { return m.situacao === s.v; }) });
      });
      return itens;
    }
    function listaAtual() {
      var ls = todasAsListas();
      return ls.filter(function (l) { return l.id === estado.lista; })[0] || ls[0];
    }
    /* a marca usada como exemplo na prévia e no teste: a primeira da lista, ou um nome de exemplo */
    function exemplo() {
      var l = listaAtual();
      var d = l.teste ? null : proDestinatarios(l.marcas, dados.optout).lista[0];
      if (!d) d = proDestinatarios(marcasElegiveis(), dados.optout).lista[0];
      return d ? { nome: d.nome, marca: d.marca } : { nome: 'Marca', marca: 'Marca Exemplo' };
    }
    function resultado() {
      var l = listaAtual();
      if (l.teste) {
        var ex = exemplo();
        return { l: l, res: { lista: [{ email: PRO_EMAIL_DONA, marca: ex.marca, marca_id: null, nome: ex.nome }], semEmail: 0, repetidos: 0, descadastrados: 0 } };
      }
      return { l: l, res: proDestinatarios(l.marcas, dados.optout) };
    }
    function conteudoAtual() {
      var html = proHtmlFinal(estado);
      var assunto = estado.assunto.trim();
      return { assunto: assunto, html: html, temConteudo: !!(assunto && html.trim()) };
    }
    function enviosOk() { return dados.envios.filter(function (e) { return e.status === 'ok' && e.canal !== 'teste'; }); }

    /* ---- pintar a tela ---- */
    function pintarCapa() {
      var alvo = el('proCapa');
      if (!alvo) return;
      alvo.innerHTML = '<div class="pro-capa-texto">' +
          '<div class="pro-capa-topo"><span class="pro-capa-icone" aria-hidden="true">' + ic('envelope') + '</span><h2>Prospecção</h2></div>' +
          '<p class="explica">Manda o seu e-mail de apresentação para várias marcas da sua base de uma vez, chamando cada uma pelo nome, sem copiar e colar uma por uma.</p>' +
          '<div class="pro-etiquetas"><span class="pro-etiqueta">Teste antes, sempre</span><span class="pro-etiqueta">A chave vive no Supabase</span><span class="pro-etiqueta">Quem responde SAIR sai da lista</span></div>' +
        '</div>' +
        '<div class="pro-capa-numero"><b>' + (dados.totalOk ? fmtInt(dados.totalOk) : '-') + '</b><span>enviados até agora</span></div>';
    }
    function pintarKpis() {
      var alvo = el('proKpis');
      if (!alvo) return;
      var rr = resultado();
      var receberam = Object.create(null);
      enviosOk().forEach(function (e) { receberam[String(e.email).toLowerCase()] = true; });
      var cartoes = [
        { cls: 'k-principal', n: baseComEmail().length, nome: 'Marcas com e-mail', ctx: 'de ' + marcasElegiveis().length + ' na sua base' },
        { cls: 'k-azul', n: rr.res.lista.length, nome: 'A enviar', ctx: 'lista: ' + rr.l.rotulo },
        { cls: 'k-verde', n: dados.temEnvios ? Object.keys(receberam).length : null, nome: 'Já receberam', ctx: 'pessoas diferentes' },
        { cls: 'k-vermelho', n: dados.temEnvios ? dados.envios.filter(function (e) { return e.status === 'erro' && e.canal !== 'teste'; }).length : null, nome: 'Falhas', ctx: 'veja no histórico' },
        { cls: 'k-ambar', n: dados.temOptout ? dados.optoutLista.length : null, nome: 'Descadastrados', ctx: 'nunca mais recebem' }
      ];
      alvo.innerHTML = cartoes.map(function (c) {
        return '<div class="pro-kpi ' + c.cls + '"><b>' + (c.n == null ? '-' : fmtInt(c.n)) + '</b><strong>' + esc(c.nome) + '</strong>' + (c.ctx ? '<small>' + esc(c.ctx) + '</small>' : '') + '</div>';
      }).join('');
    }
    function caixa(tipo, titulo, texto, extra) {
      return '<div class="pro-caixa ' + tipo + '" role="status"><strong>' + esc(titulo) + '</strong>' + esc(texto) + (extra || '') + '</div>';
    }
    function pintarLista() {
      var sel = el('proLista');
      if (!sel) return;
      var itens = todasAsListas();
      if (!itens.some(function (l) { return l.id === estado.lista; })) estado.lista = itens[0].id;
      sel.innerHTML = itens.map(function (l) {
        var n = l.teste ? '' : ' (' + proDestinatarios(l.marcas, dados.optout).lista.length + ')';
        return '<option value="' + esc(l.id) + '"' + (l.id === estado.lista ? ' selected' : '') + '>' + esc(l.rotulo + n) + '</option>';
      }).join('');
      var rr = resultado(), res = rr.res, txt;
      if (rr.l.teste) {
        txt = 'Vai só para o seu e-mail (' + esc(PRO_EMAIL_DONA) + ').';
      } else {
        txt = '<b>' + res.lista.length + '</b> ' + (res.lista.length === 1 ? 'marca vai receber' : 'marcas vão receber') +
          ' <span>(' + rr.l.marcas.length + (rr.l.marcas.length === 1 ? ' marca' : ' marcas') + ' nesta lista)</span>';
        var fora = [];
        if (res.semEmail) fora.push(res.semEmail + (res.semEmail === 1 ? ' ficou de fora por não ter e-mail' : ' ficaram de fora por não ter e-mail'));
        if (res.repetidos) fora.push(res.repetidos + (res.repetidos === 1 ? ' e-mail repetido (manda uma vez só)' : ' e-mails repetidos (mandam uma vez só)'));
        if (res.descadastrados) fora.push(res.descadastrados + (res.descadastrados === 1 ? ' descadastrado' : ' descadastrados'));
        if (fora.length) txt += '<br><span>' + esc(fora.join(' · ')) + '</span>';
      }
      el('proContagem').innerHTML = txt;

      var aviso1 = '';
      if (!dados.temEnvios || !dados.temOptout) {
        aviso1 = caixa('erro', 'Faltam as tabelas do disparo.', 'Cole o arquivo disparo.sql no SQL Editor do Supabase e clique em Run. Enquanto isso, não dá para enviar.');
      } else if (rr.l.id === 'selecionadas' && !rr.l.marcas.length) {
        aviso1 = caixa('aviso', 'Você ainda não selecionou nenhuma marca.',
          dados.temSelecao ? 'Marque as caixinhas na aba Marcas e volte aqui.' : 'Antes, rode o arquivo disparo.sql no Supabase para liberar a seleção na aba Marcas.',
          '<br><a class="btn pequeno principal-btn" href="#marcas">Ir para a aba Marcas</a>');
      } else if (!rr.l.teste && !res.lista.length) {
        aviso1 = caixa('aviso', 'Nenhuma marca desta lista tem e-mail.', 'Cadastre ou importe os e-mails na aba Marcas.', '<br><a class="btn pequeno principal-btn" href="#marcas">Ir para a aba Marcas</a>');
      }
      el('proAvisoLista').innerHTML = aviso1;
    }

    function janelaEmail(assunto, html) {
      return '<div class="pro-janela"><div class="pro-janela-cab"><span class="pro-avatar" aria-hidden="true">' + esc(PRO_NOME_DONA.charAt(0)) + '</span>' +
        '<div class="pro-janela-txt"><div class="pro-assunto">' + esc(assunto) + '</div>' +
        '<div class="pro-remetente">' + esc(PRO_NOME_DONA) + ' &lt;' + esc(PRO_EMAIL_DONA) + '&gt; · para você</div></div></div>' +
        '<iframe class="pro-quadro" sandbox="allow-same-origin" title="Prévia do e-mail" srcdoc="' + esc(html) + '"></iframe></div>';
    }
    var PRO_VAZIO_HTML = '<body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#8a8a8a;">Escreva o texto do e-mail para ver a prévia aqui.</body>';
    /* a prévia é o e-mail de verdade com o nome de uma marca de exemplo no lugar das chaves */
    function previaPronta() {
      var ex = exemplo(), c = conteudoAtual();
      return {
        assunto: c.assunto ? proTrocarCampos(c.assunto, ex, false) : '(sem assunto)',
        html: c.html.trim() ? proTrocarCampos(c.html, ex, true) : PRO_VAZIO_HTML,
        ex: ex
      };
    }
    function ajustarAltura(quadro, minimo, maximo) {
      quadro.onload = function () {
        try {
          var h = quadro.contentDocument.documentElement.scrollHeight;
          quadro.style.height = Math.min(Math.max(h, minimo), maximo) + 'px';
        } catch (e) { /* sem acesso ao conteúdo: fica com a altura padrão */ }
      };
    }
    function pintarPrevia() {
      var quadro = el('proQuadro');
      if (!quadro) return;
      var p = previaPronta();
      el('proAssuntoPrevia').textContent = p.assunto;
      quadro.srcdoc = p.html;
      el('proExemploNome').textContent = 'Prévia com o nome de exemplo: ' + p.ex.nome + ' (marca: ' + p.ex.marca + ').';
    }
    function pintarPreviaDepois() {
      clearTimeout(timerPrevia);
      timerPrevia = setTimeout(pintarPrevia, 150);
    }
    function abrirTelaCheia() {
      var p = previaPronta();
      var partes = abrirModal({
        titulo: 'Como o e-mail vai chegar',
        largo: true,
        corpo: '<div class="pro-palco">' + janelaEmail(p.assunto, p.html) + '</div>',
        botoes: [{ rotulo: 'Fechar', aoClicar: fecharModal }]
      });
      var q = $('iframe', partes.corpo);
      if (q) { q.style.height = '480px'; ajustarAltura(q, 360, 1800); }
    }

    function atualizarBotoes() {
      var teste = el('proTeste');
      if (!teste) return;
      var c = conteudoAtual(), rr = resultado(), n = rr.res.lista.length;
      var tabelasOk = dados.temEnvios && dados.temOptout;
      var testado = !!estado.testeAssinatura && estado.testeAssinatura === proAssinatura(estado);
      teste.disabled = estado.enviando || !c.temConteudo || !tabelasOk;
      var motivo = '';
      if (!tabelasOk) motivo = 'Faltam as tabelas do disparo. Rode o arquivo disparo.sql no Supabase.';
      else if (!c.temConteudo) motivo = 'Escreva o assunto e o texto do e-mail.';
      else if (!n) motivo = rr.l.id === 'selecionadas' ? 'Selecione marcas na aba Marcas para poder disparar.' : 'Não há marcas com e-mail nesta lista.';
      else if (!testado && !rr.l.teste) motivo = 'Envie o teste para você primeiro. Depois o botão Disparar liga. Se você mudar o e-mail, precisa testar de novo.';
      var disparar = el('proDisparar');
      disparar.disabled = estado.enviando || !!motivo;
      disparar.innerHTML = ic('enviar') + (rr.l.teste ? 'Enviar para mim' : 'Disparar para ' + n + (n === 1 ? ' marca' : ' marcas'));
      el('proDicaEnvio').textContent = motivo || (testado ? 'Teste feito com este e-mail. Pronto para disparar.' : '');
      var montar = el('proMontarFila');
      montar.disabled = estado.enviando || !c.temConteudo || !n;
      montar.innerHTML = ic('copiar') + 'Montar a fila (' + n + ')';
    }

    function pintarHistorico() {
      var alvo = el('proHistoricoTabela');
      if (!alvo) return;
      if (!dados.temEnvios) { alvo.innerHTML = '<p class="vazio">O histórico aparece quando as tabelas do disparo existirem (arquivo disparo.sql).</p>'; return; }
      var mapas = { porId: Object.create(null), porEmail: Object.create(null) };
      (cache.marcas || []).forEach(function (m) {
        mapas.porId[m.id] = m.nome;
        if (m.email) mapas.porEmail[String(m.email).trim().toLowerCase()] = m.nome;
      });
      function nomeDe(e) { return mapas.porId[e.marca_id] || mapas.porEmail[String(e.email).toLowerCase()] || ''; }
      var q = estado.busca.trim().toLowerCase();
      var linhas = dados.envios.filter(function (e) {
        if (estado.soErros && e.status !== 'erro') return false;
        return !q || (String(e.email) + ' ' + String(e.assunto) + ' ' + nomeDe(e)).toLowerCase().indexOf(q) >= 0;
      });
      if (!dados.envios.length) { alvo.innerHTML = '<p class="vazio">Ainda não saiu nenhum e-mail.</p>'; return; }
      if (!linhas.length) { alvo.innerHTML = '<p class="vazio">Nenhum envio encontrado com essa busca.</p>'; return; }
      alvo.innerHTML = '<div class="rolagem"><table class="tabela"><thead><tr><th>Para</th><th>Assunto</th><th>Quando</th><th>Situação</th></tr></thead><tbody>' +
        linhas.slice(0, 100).map(function (e) {
          var nome = nomeDe(e);
          var pilula = e.status === 'ok' ? '<span class="pilula p-envio-ok">Enviado</span>' : '<span class="pilula p-envio-erro">Erro</span>';
          if (e.canal === 'teste') pilula += ' <span class="pilula p-parada">Teste</span>';
          if (e.canal === 'gmail') pilula += ' <span class="pilula p-lead">Gmail</span>';
          return '<tr><td>' + esc(e.email) + (nome ? '<span class="sub">' + esc(nome) + '</span>' : '') + '</td>' +
            '<td class="curto" title="' + esc(e.assunto) + '">' + esc(e.assunto) + '</td>' +
            '<td>' + esc(dataHora(e.criado_em)) + '</td>' +
            '<td>' + pilula + (e.erro ? '<span class="sub">' + esc(e.erro) + '</span>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (linhas.length > 100 ? '<p class="pro-dica" style="padding:0 1rem .8rem">Mostrando os 100 mais recentes de ' + linhas.length + '. Use a busca para achar os outros.</p>' : '');
    }
    function pintarOptoutLista() {
      var alvo = el('proOptoutLista');
      if (!alvo) return;
      if (!dados.temOptout) { alvo.innerHTML = '<p class="vazio">A lista de descadastro aparece quando as tabelas do disparo existirem (arquivo disparo.sql).</p>'; return; }
      if (!dados.optoutLista.length) { alvo.innerHTML = '<p class="vazio">Ninguém pediu para sair ainda.</p>'; return; }
      alvo.innerHTML = '<div class="rolagem"><table class="tabela"><thead><tr><th>E-mail</th><th>Quando</th></tr></thead><tbody>' +
        dados.optoutLista.slice(0, 10).map(function (o) { return '<tr><td>' + esc(o.email) + '</td><td>' + esc(dataHora(o.criado_em)) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' +
        (dados.optoutLista.length > 10 ? '<p class="pro-dica" style="padding:0 1rem .8rem">Mostrando os 10 mais recentes de ' + dados.optoutLista.length + '.</p>' : '');
    }

    function pintarTudo() {
      pintarCapa();
      pintarKpis();
      pintarLista();
      pintarPrevia();
      atualizarBotoes();
      pintarHistorico();
      pintarOptoutLista();
      pintarFila();
    }

    /* ---- esqueleto da aba ---- */
    function esqueleto(comBase) {
      return '<div class="pro" id="proRaiz">' +
        '<div class="pro-capa" id="proCapa"></div>' +
        '<div class="pro-kpis" id="proKpis"></div>' +
        '<div id="proCorpo">' + (comBase ? formularioHtml() : vazioHtml()) + '</div>' +
        '<div class="cartao" id="proOptout" style="margin-bottom:1.1rem">' +
          '<div class="cartao-cab"><h2>Descadastro</h2><span style="color:var(--muted);font-size:.8rem">Quem respondeu SAIR entra aqui e nunca mais recebe</span></div>' +
          '<div class="cartao-corpo"><div class="pro-optout-form"><input type="email" id="proOptoutEmail" placeholder="E-mail de quem pediu para sair" aria-label="E-mail de quem pediu para sair" autocomplete="off">' +
          '<button type="button" class="btn" data-acao="optout-add">Descadastrar</button></div></div>' +
          '<div id="proOptoutLista"></div></div>' +
        '<div class="cartao" id="proHistorico">' +
          '<div class="cartao-cab"><h2>Histórico de envios</h2></div>' +
          '<div class="ferramentas"><div class="busca">' + ic('busca') + '<input type="search" id="proBusca" placeholder="Buscar por e-mail" aria-label="Buscar no histórico por e-mail" autocomplete="off"></div>' +
          '<div class="segmentos" role="group" aria-label="Mostrar envios"><button type="button" data-acao="erros" data-erros="0" aria-pressed="true">Todos</button><button type="button" data-acao="erros" data-erros="1" aria-pressed="false">Só com erro</button></div></div>' +
          '<div id="proHistoricoTabela"></div></div>' +
      '</div>';
    }
    function vazioHtml() {
      return '<div class="cartao pro-vazio"><h2>A sua base ainda está sem e-mail</h2>' +
        '<p>Para prospectar, as marcas precisam ter e-mail. Cadastre pela aba Marcas ou importe a sua planilha de leads lá primeiro. Depois é só voltar aqui.</p>' +
        '<a class="btn principal-btn" href="#marcas">Ir para a aba Marcas</a></div>';
    }
    function formularioHtml() {
      return '<div class="pro-grade"><div class="pro-form">' +
        /* 1. para quem vai */
        '<div class="cartao"><div class="cartao-cab"><h2>Para quem vai</h2></div><div class="cartao-corpo">' +
          '<p class="pro-origem">' + ic('envelope') + '<span>Os e-mails vêm da sua aba Marcas.</span></p>' +
          '<div class="campo"><label for="proLista">Lista de destinatários</label><select id="proLista"></select></div>' +
          '<p class="pro-contagem" id="proContagem"></p><div id="proAvisoLista"></div>' +
          '<div class="campo marcar"><input type="checkbox" id="proPular"><label for="proPular">Pular quem já recebeu este mesmo assunto</label></div>' +
          '<p class="pro-dica" style="margin-top:0">Serve para continuar um disparo que parou no meio sem mandar duas vezes para a mesma pessoa.</p>' +
        '</div></div>' +
        /* 2. o e-mail */
        '<div class="cartao"><div class="cartao-cab"><h2>O e-mail</h2>' +
          '<div class="segmentos" role="group" aria-label="Jeito de escrever o e-mail">' +
            '<button type="button" data-acao="modo" data-modo="texto" aria-pressed="true">Texto fácil</button>' +
            '<button type="button" data-acao="modo" data-modo="html" aria-pressed="false">HTML</button></div></div>' +
        '<div class="cartao-corpo">' +
          '<div class="campo"><label for="proAssunto">Assunto</label><input type="text" id="proAssunto" maxlength="200" placeholder="Escreva o assunto. Use {{nome}} ou {{marca}} se quiser." autocomplete="off"></div>' +
          '<div id="proModoTexto">' +
            '<div class="campo"><label for="proTexto">Texto do e-mail</label>' +
              '<textarea id="proTexto" class="pro-editor" placeholder="Escreva o e-mail normalmente. Use {{nome}} e {{marca}} onde quiser que entre o nome da marca."></textarea>' +
              '<span class="ajuda">Linha em branco separa os parágrafos. Endereços que começam com https:// viram links clicáveis sozinhos.</span></div>' +
            '<div class="pro-linha-botao">' +
              '<div class="campo"><label for="proBotaoTexto">Texto do botão (opcional)</label><input type="text" id="proBotaoTexto" maxlength="60" autocomplete="off"></div>' +
              '<div class="campo"><label for="proBotaoLink">Link do botão</label><input type="url" id="proBotaoLink" placeholder="https://" autocomplete="off"></div></div>' +
          '</div>' +
          '<div id="proModoHtml" hidden>' +
            '<div class="campo"><label for="proHtml">HTML do e-mail</label>' +
              '<textarea id="proHtml" class="pro-editor pro-codigo" spellcheck="false" placeholder="Cole aqui o HTML pronto. {{nome}} e {{marca}} continuam funcionando."></textarea>' +
              '<span class="ajuda">Aqui sai exatamente o que você colar, sem nada por cima. O rodapé com a palavra SAIR precisa estar no seu HTML.</span></div>' +
            '<button type="button" class="btn" data-acao="modelo">Começar do modelo pronto</button>' +
          '</div>' +
        '</div></div>' +
        /* 3. enviar */
        '<div class="cartao"><div class="cartao-cab"><h2>Enviar</h2>' +
          '<div class="segmentos" role="group" aria-label="Como enviar">' +
            '<button type="button" data-acao="canal" data-canal="resend" aria-pressed="true">Pelo Resend</button>' +
            '<button type="button" data-acao="canal" data-canal="rascunho" aria-pressed="false">Rascunho no Gmail</button></div></div>' +
        '<div class="cartao-corpo">' +
          '<div id="proBlocoResend">' +
            '<p class="pro-dica" style="margin-top:0">Manda tudo sozinho, um por um, pelo Resend. Envie o teste antes: ele chega só para você.</p>' +
            '<div class="pro-botoes" style="margin-top:.7rem"><button type="button" class="btn" id="proTeste" data-acao="teste">' + ic('envelope') + 'Enviar teste para mim</button>' +
            '<button type="button" class="btn principal-btn" id="proDisparar" data-acao="disparar"></button></div>' +
            '<p class="pro-dica" id="proDicaEnvio"></p><div id="proProgresso" hidden></div><div id="proResultado"></div>' +
          '</div>' +
          '<div id="proBlocoRascunho" hidden>' +
            '<p class="pro-dica" style="margin-top:0">Plano B, funciona sem Resend nenhum. Monta o e-mail de cada marca, já com o nome dela, e você envia pelo seu Gmail, uma marca por vez.</p>' +
            '<div class="pro-botoes" style="margin-top:.7rem"><button type="button" class="btn principal-btn" id="proMontarFila" data-acao="fila-montar"></button></div>' +
          '</div>' +
        '</div></div>' +
        '<div id="proFila"></div>' +
      '</div>' +
      /* a prévia, do lado */
      '<aside class="pro-previa" aria-label="Prévia do e-mail">' +
        '<div class="pro-previa-topo"><h3>Como vai chegar</h3><button type="button" class="btn pequeno" data-acao="tela-cheia">' + ic('expandir') + 'Ver em tela cheia</button></div>' +
        '<div class="pro-palco"><div class="pro-janela"><div class="pro-janela-cab"><span class="pro-avatar" aria-hidden="true">' + esc(PRO_NOME_DONA.charAt(0)) + '</span>' +
          '<div class="pro-janela-txt"><div class="pro-assunto" id="proAssuntoPrevia"></div><div class="pro-remetente">' + esc(PRO_NOME_DONA) + ' &lt;' + esc(PRO_EMAIL_DONA) + '&gt; · para você</div></div></div>' +
          '<iframe class="pro-quadro" id="proQuadro" sandbox="allow-same-origin" title="Prévia do e-mail"></iframe></div></div>' +
        '<p class="pro-lembrete" id="proExemploNome"></p>' +
        '<p class="pro-lembrete">Antes de disparar, mande o teste para você mesma e abra no celular.</p>' +
      '</aside></div>';
    }
    function preencherCampos() {
      var f = el('proAssunto');
      if (!f) return;
      f.value = estado.assunto;
      el('proTexto').value = estado.texto;
      el('proHtml').value = estado.html;
      el('proBotaoTexto').value = estado.botaoTexto;
      el('proBotaoLink').value = estado.botaoLink;
      el('proPular').checked = estado.pular;
      mostrarModo();
      mostrarCanal();
    }
    function mostrarModo() {
      if (!el('proModoTexto')) return;
      el('proModoTexto').hidden = estado.modo !== 'texto';
      el('proModoHtml').hidden = estado.modo !== 'html';
      $$('button[data-acao="modo"]', secaoAtual).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-modo') === estado.modo)); });
    }
    function mostrarCanal() {
      if (!el('proBlocoResend')) return;
      el('proBlocoResend').hidden = estado.canal !== 'resend';
      el('proBlocoRascunho').hidden = estado.canal !== 'rascunho';
      $$('button[data-acao="canal"]', secaoAtual).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-canal') === estado.canal)); });
    }

    /* ---- falar com o carteiro (a função enviar-emails no Supabase) ---- */
    async function mensagemDeErro(erro) {
      var resp = erro && erro.context, corpo = null;
      try { corpo = resp && typeof resp.json === 'function' ? await resp.json() : null; } catch (e) { corpo = null; }
      if (corpo && corpo.erro) return corpo.erro;
      var st = resp && resp.status;
      if (st === 401 || st === 403) return 'A função recusou o seu login. Saia do painel, entre de novo e tente outra vez.';
      if (st === 404) return 'A função enviar-emails ainda não foi criada no Supabase. Siga o passo a passo para criá-la.';
      return MSG_SEM_FUNCAO;
    }
    async function chamarFuncao(corpo) {
      try {
        var r = await banco.functions.invoke('enviar-emails', { body: corpo });
        if (r.error) return { ok: false, erro: await mensagemDeErro(r.error) };
        var d = r.data;
        if (!d || typeof d !== 'object') return { ok: false, erro: 'A função respondeu algo inesperado. Tente de novo.' };
        if (d.ok === false) return { ok: false, erro: d.erro || 'A função recusou o pedido.', codigo: d.codigo };
        return d;
      } catch (e) {
        return { ok: false, erro: MSG_SEM_FUNCAO };
      }
    }
    function mostrarResultado(html) { var a = el('proResultado'); if (a) a.innerHTML = html; }
    function progresso(feitos, total, texto) {
      var c = el('proProgresso');
      if (!c) return;
      c.hidden = false;
      var pct = total ? Math.round(feitos / total * 100) : 0;
      c.innerHTML = '<div class="pro-progresso" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + feitos + '"><i style="width:' + pct + '%"></i></div>' +
        '<p class="pro-dica" style="margin-top:0">' + esc(texto || ('Enviando... ' + feitos + ' de ' + total)) + '</p>';
    }
    function esconderProgresso() { var c = el('proProgresso'); if (c) { c.hidden = true; c.innerHTML = ''; } }
    var avisoAoSair = function (e) { e.preventDefault(); e.returnValue = ''; };
    function comecarEnvio() { estado.enviando = true; window.addEventListener('beforeunload', avisoAoSair); atualizarBotoes(); }
    function terminarEnvio() { estado.enviando = false; window.removeEventListener('beforeunload', avisoAoSair); esconderProgresso(); atualizarBotoes(); }

    function validarConteudo() {
      var c = conteudoAtual();
      if (!c.assunto) { aviso('Escreva o assunto do e-mail.', 'erro'); var a = el('proAssunto'); if (a) a.focus(); return null; }
      if (!c.html.trim()) { aviso(estado.modo === 'html' ? 'Cole o HTML do e-mail.' : 'Escreva o texto do e-mail.', 'erro'); return null; }
      return c;
    }
    /* uma explicação em português simples para cada motivo de o carteiro ter parado */
    function explicarParada(motivo, enviados, faltando) {
      if (motivo === 'cota') {
        return caixa('aviso', 'A cota diária do Resend acabou.',
          'Enviei ' + enviados + ' e ficaram ' + faltando + ' faltando. O Resend limita quantos e-mails saem por dia. Volte amanhã, cole o mesmo assunto e o mesmo texto (o que você escreveu fica guardado neste navegador) e deixe marcada a caixinha "Pular quem já recebeu este mesmo assunto". Aí ele manda só para quem faltou.');
      }
      if (motivo === 'dominio') {
        return caixa('aviso', 'O Resend só entrega para você por enquanto.',
          'Enquanto o seu domínio não estiver verificado no Resend, ele só deixa mandar para o seu próprio e-mail. Verifique um domínio seu no Resend, ou use o modo "Rascunho no Gmail" aqui em cima, que funciona sem isso. Faltaram ' + faltando + '.');
      }
      if (motivo === 'chave') {
        return caixa('erro', 'A chave do Resend não foi aceita.', 'Ela está errada, foi apagada ou tem pouca permissão. Gere uma nova no Resend e guarde de novo no Supabase, no segredo RESEND_API_KEY. Faltaram ' + faltando + '.');
      }
      if (motivo === 'tempo') {
        return caixa('aviso', 'Parei por segurança para não estourar o tempo.', 'Ficaram ' + faltando + ' faltando. Clique em Disparar de novo, com "Pular quem já recebeu este mesmo assunto" marcada, para continuar de onde parou.');
      }
      return '';
    }

    async function enviarTeste() {
      if (estado.enviando) return;
      var c = validarConteudo();
      if (!c) return;
      var ex = exemplo();
      comecarEnvio();
      mostrarResultado('');
      progresso(0, 1, 'Enviando o teste para ' + PRO_EMAIL_DONA + '...');
      var r = await chamarFuncao({ teste: true, assunto: c.assunto, html: c.html, destinatarios: [{ email: PRO_EMAIL_DONA, marca: ex.marca }] });
      terminarEnvio();
      if (!r.ok) { mostrarResultado(caixa('erro', 'Não consegui enviar o teste.', r.erro)); return; }
      if (r.parou_por || r.enviados < 1) {
        var motivo = (r.falhas_lista && r.falhas_lista[0] && r.falhas_lista[0].erro) || 'O Resend não aceitou o e-mail.';
        mostrarResultado(caixa('erro', 'O teste não saiu.', motivo));
        return;
      }
      estado.testeAssinatura = proAssinatura(estado);
      guardarLocal();
      mostrarResultado(caixa('ok', 'Teste enviado.', 'Abra a caixa de entrada de ' + PRO_EMAIL_DONA + ' (olhe também o spam), de preferência no celular. Confira se o nome e a marca entraram nos lugares certos. Se estiver tudo certo, o botão Disparar já está ligado.'));
      await carregar();
      pintarTudo();
    }

    /* tira da lista quem já recebeu este mesmo assunto (confere no banco, não só na tela) */
    async function removerJaReceberam(destinatarios, assuntoModelo) {
      var mapa = Object.create(null);
      try {
        for (var i = 0; i < destinatarios.length; i += 80) {
          var emails = destinatarios.slice(i, i + 80).map(function (d) { return d.email; });
          var r = await banco.from('email_envios').select('email,assunto').in('email', emails).eq('status', 'ok').neq('canal', 'teste');
          if (r.error) return null;
          (r.data || []).forEach(function (l) { mapa[String(l.email).toLowerCase() + '\n' + l.assunto] = true; });
        }
      } catch (e) { return null; }
      var restantes = [], pulados = 0;
      destinatarios.forEach(function (d) {
        var assunto = proLimparAssunto(proTrocarCampos(assuntoModelo, { nome: d.nome, marca: d.marca }, false));
        if (mapa[d.email + '\n' + assunto]) pulados++; else restantes.push(d);
      });
      return { restantes: restantes, pulados: pulados };
    }

    async function disparar() {
      if (estado.enviando) return;
      var c = validarConteudo();
      if (!c) return;
      var rr = resultado();
      if (rr.l.teste) { enviarTeste(); return; }
      if (!rr.res.lista.length) { aviso('Não há ninguém para receber nesta lista.', 'erro'); return; }
      if (estado.modo === 'html' && !proTemSair(c.html)) {
        var seguir = await confirmar('O seu HTML não tem o rodapé com a palavra SAIR. Sem ele, quem não quer receber não sabe como pedir. Disparar mesmo assim?', 'Disparar mesmo assim');
        if (!seguir) return;
      }
      comecarEnvio();
      mostrarResultado('');
      var destinatarios = rr.res.lista.slice(), puladosJa = 0;
      if (estado.pular) {
        progresso(0, 1, 'Conferindo quem já recebeu este assunto...');
        var f = await removerJaReceberam(destinatarios, c.assunto);
        esconderProgresso();
        if (!f) { terminarEnvio(); mostrarResultado(caixa('erro', 'Não consegui conferir quem já recebeu.', 'Por segurança, não enviei nada. Tente de novo.')); return; }
        destinatarios = f.restantes; puladosJa = f.pulados;
      }
      if (!destinatarios.length) {
        terminarEnvio();
        mostrarResultado(caixa('aviso', 'Ninguém para enviar.', 'Todas as marcas desta lista já receberam este assunto.'));
        return;
      }
      var n = destinatarios.length;
      var certo = await confirmar('Vai para ' + n + (n === 1 ? ' marca' : ' marcas') + ', da lista "' + rr.l.rotulo + '", e não dá para desfazer.' +
        (puladosJa ? ' ' + puladosJa + (puladosJa === 1 ? ' já recebeu' : ' já receberam') + ' este assunto e ' + (puladosJa === 1 ? 'foi pulada.' : 'foram puladas.') : ''), 'Enviar agora');
      if (!certo) { terminarEnvio(); return; }

      var soma = { enviados: 0, falhas: 0, pulados: puladosJa, faltando: 0 };
      var parou = null, erroFuncao = null, processados = 0, listaFalhas = [], registroFalhou = 0, marcasNao = false;
      progresso(0, n);
      for (var i = 0; i < n; i += LOTE) {
        var lote = destinatarios.slice(i, i + LOTE);
        var r = await chamarFuncao({
          teste: false, assunto: c.assunto, html: c.html,
          destinatarios: lote.map(function (d) { return { email: d.email, marca: d.marca, marca_id: d.marca_id }; })
        });
        if (!r.ok) { erroFuncao = r; soma.faltando = n - i; break; }
        soma.enviados += r.enviados; soma.falhas += r.falhas; soma.pulados += r.pulados;
        (r.falhas_lista || []).forEach(function (x) { listaFalhas.push(x); });
        registroFalhou += r.registro_falhou || 0;
        if (r.marcas_nao_atualizadas) marcasNao = true;
        processados += r.enviados + r.falhas + r.pulados;
        progresso(Math.min(processados, n), n);
        if (r.parou_por) { parou = r.parou_por; soma.faltando = r.faltando + (n - i - lote.length); break; }
      }
      terminarEnvio();
      await carregar();
      pintarTudo();

      var chips = '<div class="imp-resumo" style="margin-top:.6rem">' +
        '<span class="imp-chip ok"><b>' + soma.enviados + '</b> ' + (soma.enviados === 1 ? 'enviado' : 'enviados') + '</span>' +
        '<span class="imp-chip' + (soma.falhas ? ' erro' : '') + '"><b>' + soma.falhas + '</b> ' + (soma.falhas === 1 ? 'falha' : 'falhas') + '</span>' +
        '<span class="imp-chip aviso"><b>' + soma.pulados + '</b> ' + (soma.pulados === 1 ? 'pulado' : 'pulados') + '</span>' +
        (soma.faltando ? '<span class="imp-chip erro"><b>' + soma.faltando + '</b> faltando</span>' : '') + '</div>';
      var saida = '';
      if (erroFuncao) saida = caixa('erro', 'O disparo parou.', erroFuncao.erro + ' Enviei ' + soma.enviados + ' e ficaram ' + soma.faltando + ' faltando.');
      else if (parou) saida = explicarParada(parou, soma.enviados, soma.faltando);
      else saida = caixa('ok', 'Disparo terminado.', 'Cada envio ficou no histórico aqui embaixo, e as marcas que receberam ganharam a data de hoje no "último contato".');
      var extra = '';
      if (listaFalhas.length && !parou) extra += caixa('aviso', 'E-mails que deram erro', listaFalhas.slice(0, 5).map(function (x) { return x.email + ': ' + x.erro; }).join(' | ') + (listaFalhas.length > 5 ? ' (e mais ' + (listaFalhas.length - 5) + ', veja no histórico)' : ''));
      if (registroFalhou) extra += caixa('erro', 'Atenção com o registro.', registroFalhou + ' envio(s) saíram, mas não consegui gravar no histórico. Confira as tabelas.');
      if (marcasNao) extra += caixa('aviso', 'Datas não atualizadas.', 'Não consegui marcar a data de hoje em algumas marcas na aba Marcas.');
      mostrarResultado(chips + saida + extra);

      if (rr.l.id === 'selecionadas' && soma.enviados > 0) {
        var limpar = await confirmar('Disparo terminado. Quer limpar a sua seleção de marcas na aba Marcas? Se você vai mandar a mesma lista outra vez, clique em Cancelar para manter.', 'Limpar seleção');
        if (limpar) {
          var rl = await gravarSelecaoMarcas(null, false);
          if (rl.ok) { aviso('Seleção limpa.'); await carregar(); pintarTudo(); } else aviso(rl.erro, 'erro');
        }
      }
    }

    /* ---- modo rascunho: uma marca por vez, para você enviar pelo Gmail ---- */
    async function montarFila() {
      if (estado.enviando) return;
      var c = validarConteudo();
      if (!c) return;
      var rr = resultado();
      var dest = rr.res.lista.slice();
      if (estado.pular && !rr.l.teste) {
        var f = await removerJaReceberam(dest, c.assunto);
        if (!f) { aviso('Não consegui conferir quem já recebeu. Tente de novo.', 'erro'); return; }
        dest = f.restantes;
      }
      if (!dest.length) { aviso('Ninguém para colocar na fila. Todas já receberam este assunto ou a lista está vazia.', 'erro'); return; }
      fila = {
        teste: !!rr.l.teste,
        total: dest.length,
        feitas: 0,
        itens: dest.map(function (d) {
          var dd = { nome: d.nome, marca: d.marca };
          return {
            email: d.email, marca: d.marca, marca_id: d.marca_id,
            assunto: proLimparAssunto(proTrocarCampos(c.assunto, dd, false)),
            corpo: proTextoDoHtml(proTrocarCampos(c.html, dd, true))
          };
        })
      };
      pintarFila();
      var alvo = el('proFila');
      if (alvo && alvo.scrollIntoView) alvo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    function pintarFila() {
      var alvo = el('proFila');
      if (!alvo) return;
      if (!fila) { alvo.innerHTML = ''; return; }
      if (!fila.itens.length) {
        alvo.innerHTML = '<div class="cartao"><div class="cartao-cab"><h2>Fila de rascunhos</h2></div><div class="cartao-corpo">' +
          caixa('ok', 'Fila concluída.', fila.feitas + (fila.feitas === 1 ? ' marca marcada como enviada.' : ' marcas marcadas como enviadas.')) +
          '<button type="button" class="btn" data-fila="fechar">Fechar a fila</button></div></div>';
        return;
      }
      var it = fila.itens[0], pct = Math.round(fila.feitas / fila.total * 100);
      alvo.innerHTML = '<div class="cartao"><div class="cartao-cab"><h2>Fila de rascunhos</h2><span style="color:var(--muted);font-size:.8rem">' + (fila.feitas + 1) + ' de ' + fila.total + '</span></div>' +
        '<div class="cartao-corpo"><div class="pro-progresso" role="progressbar" aria-valuemin="0" aria-valuemax="' + fila.total + '" aria-valuenow="' + fila.feitas + '"><i style="width:' + pct + '%"></i></div>' +
        '<div class="pro-fila-item"><dl><dt>Marca</dt><dd>' + esc(it.marca) + '</dd><dt>Para</dt><dd>' + esc(it.email) + '</dd><dt>Assunto</dt><dd>' + esc(it.assunto) + '</dd></dl>' +
          '<textarea class="pro-fila-corpo" readonly aria-label="Texto do e-mail para ' + esc(it.marca) + '">' + esc(it.corpo) + '</textarea>' +
          '<div class="pro-botoes" style="margin-top:.7rem">' +
            '<button type="button" class="btn" data-fila="copiar">' + ic('copiar') + 'Copiar o texto</button>' +
            '<a class="btn" data-fila="gmail" href="' + esc(proGmailLink(it.email, it.assunto, it.corpo)) + '" target="_blank" rel="noopener noreferrer">' + ic('externo') + 'Abrir no Gmail</a>' +
            '<button type="button" class="btn principal-btn" data-fila="enviada">' + ic('check') + 'Marcar como enviada</button>' +
            '<button type="button" class="btn" data-fila="pular">Pular por agora</button></div>' +
          '<p class="pro-dica">O Gmail abre com o destinatário, o assunto e o texto já preenchidos: é só clicar em enviar e voltar aqui para marcar como enviada. O Gmail só aceita texto simples, então o visual do HTML não vai junto.</p>' +
        '</div></div></div>';
    }
    async function copiarTexto(texto) {
      try {
        await navigator.clipboard.writeText(texto);
        aviso('Texto copiado.');
      } catch (e) {
        var t = $('.pro-fila-corpo', secaoAtual);
        if (t) { t.focus(); t.select(); }
        aviso('Não consegui copiar sozinho. O texto ficou selecionado: aperte Ctrl+C.', 'erro');
      }
    }
    async function marcarEnviada() {
      if (!fila || !fila.itens.length) return;
      var it = fila.itens[0];
      var linha = { email: it.email, assunto: it.assunto, status: 'ok', canal: fila.teste ? 'teste' : 'gmail', marca_id: it.marca_id || null };
      var r = await gravar('email_envios', linha);
      if (!r.ok) aviso('Não consegui gravar no histórico: ' + r.erro, 'erro');
      if (r.ok) dados.envios.unshift({ email: linha.email, assunto: linha.assunto, status: 'ok', canal: linha.canal, marca_id: linha.marca_id, erro: null, criado_em: new Date().toISOString() });
      if (!fila.teste && it.marca_id) {
        var rm = await gravar('marcas', { ultimo_contato: hojeISO() }, it.marca_id);
        if (rm.ok) {
          var m = (cache.marcas || []).filter(function (x) { return x.id === it.marca_id; })[0];
          if (m) m.ultimo_contato = hojeISO();
        } else aviso('Não consegui marcar a data na aba Marcas: ' + rm.erro, 'erro');
      }
      fila.itens.shift();
      fila.feitas++;
      if (r.ok && !fila.teste) dados.totalOk = (dados.totalOk || 0) + 1;
      pintarCapa(); pintarKpis(); pintarHistorico(); pintarFila();
    }

    /* ---- descadastro ---- */
    async function adicionarOptout() {
      var campo = el('proOptoutEmail');
      var e = campo.value.trim().toLowerCase();
      if (!dados.temOptout) { aviso('Antes, rode o arquivo disparo.sql no Supabase.', 'erro'); return; }
      if (!proEmailValido(e)) { aviso('Esse e-mail parece estranho. Confira e tente de novo.', 'erro'); campo.focus(); return; }
      if (dados.optout[e]) { aviso('Esse e-mail já está na lista de descadastro.'); campo.value = ''; return; }
      var r = await gravar('email_optout', { email: e });
      if (!r.ok) { aviso(r.erro, 'erro'); return; }
      campo.value = '';
      dados.optoutLista.unshift({ email: e, criado_em: new Date().toISOString() });
      dados.optout[e] = true;
      aviso('Pronto: esse e-mail nunca mais recebe.');
      pintarKpis(); pintarLista(); atualizarBotoes(); pintarOptoutLista();
    }

    /* ---- ligar os botões e campos (tudo numa raiz que é recriada a cada abertura da aba) ---- */
    function ligarEventos() {
      var raiz = el('proRaiz');
      raiz.addEventListener('click', function (e) {
        var b = e.target.closest('[data-acao],[data-fila]');
        if (!b || b.disabled) return;
        var f = b.getAttribute('data-fila');
        if (f) {
          if (f === 'copiar' && fila && fila.itens[0]) copiarTexto(fila.itens[0].corpo);
          else if (f === 'enviada') marcarEnviada();
          else if (f === 'pular' && fila && fila.itens.length > 1) { fila.itens.push(fila.itens.shift()); pintarFila(); }
          else if (f === 'fechar') { fila = null; pintarFila(); }
          return;                                   /* o botão "Abrir no Gmail" é um link de verdade: abre sozinho */
        }
        var acao = b.getAttribute('data-acao');
        if (acao === 'modo') { estado.modo = b.getAttribute('data-modo'); mostrarModo(); guardarLocal(); pintarPrevia(); atualizarBotoes(); }
        else if (acao === 'canal') { estado.canal = b.getAttribute('data-canal'); mostrarCanal(); guardarLocal(); }
        else if (acao === 'modelo') {
          if (!String(estado.texto).trim() && !String(estado.html).trim()) { aviso('Escreva o texto no modo "Texto fácil" primeiro. O modelo pronto usa o que você escreveu lá.', 'erro'); return; }
          var pronto = proMontarEmail(estado);
          if (String(estado.html).trim() && String(estado.html).trim() !== pronto.trim()) {
            confirmar('Isto troca o HTML que está no campo pelo modelo pronto. Continuar?', 'Trocar pelo modelo').then(function (sim) { if (sim) aplicarModelo(pronto); });
          } else aplicarModelo(pronto);
        }
        else if (acao === 'tela-cheia') abrirTelaCheia();
        else if (acao === 'teste') enviarTeste();
        else if (acao === 'disparar') disparar();
        else if (acao === 'fila-montar') montarFila();
        else if (acao === 'optout-add') adicionarOptout();
        else if (acao === 'erros') {
          estado.soErros = b.getAttribute('data-erros') === '1';
          $$('button[data-acao="erros"]', raiz).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          pintarHistorico();
        }
      });
      raiz.addEventListener('input', function (e) {
        var id = e.target.id;
        if (id === 'proBusca') { estado.busca = e.target.value; pintarHistorico(); return; }
        var mapa = { proAssunto: 'assunto', proTexto: 'texto', proHtml: 'html', proBotaoTexto: 'botaoTexto', proBotaoLink: 'botaoLink' };
        if (!mapa[id]) return;
        estado[mapa[id]] = e.target.value;
        guardarLocal();
        pintarPreviaDepois();
        atualizarBotoes();
      });
      raiz.addEventListener('change', function (e) {
        if (e.target.id === 'proLista') { estado.lista = e.target.value; guardarLocal(); pintarLista(); pintarKpis(); pintarPrevia(); atualizarBotoes(); }
        else if (e.target.id === 'proPular') { estado.pular = e.target.checked; guardarLocal(); }
      });
      raiz.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.id === 'proOptoutEmail') { e.preventDefault(); adicionarOptout(); }
      });
      var quadro = el('proQuadro');
      if (quadro) ajustarAltura(quadro, 300, 1400);
    }
    function aplicarModelo(pronto) {
      estado.html = pronto;
      var campo = el('proHtml');
      if (campo) campo.value = pronto;
      guardarLocal(); pintarPrevia(); atualizarBotoes();
      aviso('Modelo colado. Agora é só mexer no que quiser.');
    }

    Abas.prospeccao = {
      titulo: 'Prospecção',
      tabelas: TABELAS,
      abrir: async function (secao) {
        secaoAtual = secao;
        if (!secao.innerHTML.trim()) secao.innerHTML = '<p class="carregando">Carregando...</p>';
        restaurarLocal();
        await carregar();
        secao.innerHTML = esqueleto(baseComEmail().length > 0);
        preencherCampos();
        ligarEventos();
        pintarTudo();
      }
    };
  })();

  /* =========================================================
     ABA 5: CHECKLIST PORTFÓLIO
     Todo o conteúdo vem do arquivo js/biblioteca.js, sem mudar nada.
     O que você marca no checklist fica guardado na tabela "marcados".
     ========================================================= */
  (function () {
    var TABELAS = ['marcados'];
    var SUBABAS = [
      { id: 'checklist', t: 'Checklist do portfólio' },
      { id: 'referencias', t: 'Referências de vídeo' },
      { id: 'roteiros', t: 'Roteiros' },
      { id: 'nichos', t: 'Ideias por nicho' },
      { id: 'revisao', t: 'Revisar meu roteiro' }
    ];
    var montada = false;
    var marcados = {};          /* chave -> true. É a memória do que você já marcou. */
    var subAtual = 'checklist';
    var secaoAtual = null;

    function chaveItem(secaoId, i) { return 'checklist:' + secaoId + ':' + i; }

    /* ---------- 1. Checklist do portfólio ---------- */
    function contarSecao(s) {
      var feitos = 0;
      s.itens.forEach(function (_, i) { if (marcados[chaveItem(s.id, i)]) feitos++; });
      return feitos;
    }
    function atualizarProgresso() {
      var B = window.Biblioteca;
      var totalGeral = 0, feitosGeral = 0;
      B.CHECKLIST.forEach(function (s) {
        var f = contarSecao(s);
        totalGeral += s.itens.length; feitosGeral += f;
        var bloco = $('[data-secao="' + s.id + '"]', secaoAtual);
        if (!bloco) return;
        $('.contagem', bloco).textContent = f + ' de ' + s.itens.length;
        $('.progresso i', bloco).style.width = (s.itens.length ? Math.round((f / s.itens.length) * 100) : 0) + '%';
      });
      var pct = totalGeral ? Math.round((feitosGeral / totalGeral) * 100) : 0;
      $('#checkGeralTexto', secaoAtual).textContent = feitosGeral + ' de ' + totalGeral + ' itens prontos (' + pct + '%)';
      $('#checkGeralBarra', secaoAtual).style.width = pct + '%';
    }

    function htmlChecklist() {
      var B = window.Biblioteca;
      var blocos = B.CHECKLIST.map(function (s, n) {
        var itens = s.itens.map(function (it, i) {
          var id = 'ck_' + s.id + '_' + i;
          var marcado = !!marcados[chaveItem(s.id, i)];
          return '<div class="item-check' + (marcado ? ' feito' : '') + '"><input type="checkbox" id="' + id + '" data-chave="' + esc(chaveItem(s.id, i)) + '"' + (marcado ? ' checked' : '') + '>' +
            '<label for="' + id + '"><span class="t">' + esc(it.t) + '</span><span class="d">' + htmlSeguro(it.d) + '</span></label></div>';
        }).join('');
        return '<div class="cartao acordeao' + (n === 0 ? ' aberto' : '') + '" data-secao="' + esc(s.id) + '">' +
          '<button type="button" aria-expanded="' + (n === 0 ? 'true' : 'false') + '" aria-controls="corpo_' + esc(s.id) + '">' +
            '<span class="emoji" aria-hidden="true">' + esc(s.emoji) + '</span>' +
            '<span class="tit"><strong>' + esc(s.nome) + '</strong><small>' + esc(s.resumo) + '</small></span>' +
            '<span class="contagem"></span>' + ic('dir', 'seta-ac') + '</button>' +
          '<div class="progresso" style="margin:0 1rem .8rem" aria-hidden="true"><i style="width:0"></i></div>' +
          '<div class="acordeao-corpo" id="corpo_' + esc(s.id) + '"' + (n === 0 ? '' : ' hidden') + '>' +
            '<div class="porque"><b>Por que isso importa</b>' + htmlSeguro(s.porque) + '</div>' + itens + '</div></div>';
      }).join('');
      return '<div class="cartao geral"><strong id="checkGeralTexto"></strong><div class="progresso" aria-hidden="true"><i id="checkGeralBarra" style="width:0"></i></div></div>' + blocos;
    }

    async function alternarItem(caixa) {
      var chave = caixa.getAttribute('data-chave');
      var marcar = caixa.checked;
      if (marcar) marcados[chave] = true; else delete marcados[chave];
      caixa.closest('.item-check').classList.toggle('feito', marcar);
      atualizarProgresso();
      try {
        var r = marcar
          ? await banco.from('marcados').upsert({ chave: chave, marcado: true, atualizado_em: new Date().toISOString() })
          : await banco.from('marcados').delete().eq('chave', chave);
        if (r.error) throw r.error;
        delete problemas.marcados;
      } catch (e) {
        problemas.marcados = descreverErro('marcados', e) + ' Sua marcação vale só até você fechar esta página.';
        mostrarProblemas(TABELAS);
      }
    }

    /* ---------- 2. Referências de vídeo ---------- */
    function htmlReferencias() {
      var B = window.Biblioteca;
      return '<div class="refs">' + B.REFERENCIAS.map(function (r, i) {
        return '<button type="button" class="ref-cartao cor-' + esc(r.cor) + '" data-ref="' + i + '" aria-label="Abrir a ficha: ' + esc(r.titulo) + '">' +
          '<span class="ref-emoji" aria-hidden="true">' + esc(r.emoji) + '</span>' +
          '<span><span class="ref-tit" style="display:block">' + esc(r.titulo) + '</span>' +
          '<span class="ref-meta"><span>' + esc(r.estilo) + '</span><span>' + esc(r.duracao) + '</span><span>' + esc(r.marca) + '</span></span></span></button>';
      }).join('') + '</div>';
    }
    function abrirFicha(r) {
      var B = window.Biblioteca;
      var aud = (B.AUDIENCIAS || []).filter(function (a) { return a.v === r.audiencia; })[0];
      var youtube = linkSeguro(r.youtube);
      var blocos = (r.roteiro || []).map(function (b) {
        return '<li><span class="tempo">' + esc(b.t) + '</span><span>' + htmlSeguro(b.o) + '</span></li>';
      }).join('');
      var corpo = '<div class="ficha"><h3>' + esc(r.emoji) + ' ' + esc(r.titulo) + '</h3>' +
        '<div class="tags"><span>' + esc(r.estilo) + '</span>' + (aud ? '<span>' + esc(aud.t) + '</span>' : '') + '<span>' + esc(r.duracao) + '</span><span>Marca: ' + esc(r.marca) + '</span></div>' +
        '<h4>O gancho</h4><blockquote>' + esc(r.gancho) + '</blockquote>' +
        '<h4>Por que funciona</h4><p>' + esc(r.porque) + '</p>' +
        '<h4>O diferencial</h4><p>' + esc(r.diferencial) + '</p>' +
        '<h4>O erro comum</h4><p>' + esc(r.erro) + '</p>' +
        '<h4>Roteiro em blocos de tempo</h4><ul class="blocos-tempo">' + blocos + '</ul></div>';
      var botoes = [{ rotulo: 'Fechar', aoClicar: fecharModal }];
      if (youtube) botoes.push({ rotulo: 'Assistir o vídeo', classe: 'principal-btn', aoClicar: function () { window.open(youtube, '_blank', 'noopener'); } });
      abrirModal({ titulo: 'Referência de vídeo', corpo: corpo, botoes: botoes, largo: true });
    }

    /* ---------- 3. Roteiros ---------- */
    function acordeao(id, emoji, titulo, resumo, corpoHTML) {
      return '<div class="cartao acordeao" data-acordeao="' + esc(id) + '">' +
        '<button type="button" aria-expanded="false" aria-controls="ac_' + esc(id) + '"><span class="emoji" aria-hidden="true">' + esc(emoji) + '</span>' +
        '<span class="tit"><strong>' + esc(titulo) + '</strong><small>' + esc(resumo) + '</small></span>' + ic('dir', 'seta-ac') + '</button>' +
        '<div class="acordeao-corpo" id="ac_' + esc(id) + '" hidden>' + corpoHTML + '</div></div>';
    }
    function htmlRoteiros() {
      return window.Biblioteca.TIPOS.map(function (t) {
        var blocos = (t.beats || []).map(function (b) { return '<li><span class="tempo">' + esc(b.t) + '</span><span>' + htmlSeguro(b.o) + '</span></li>'; }).join('');
        var erros = (t.erros || []).length ? '<h4 style="font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:.9rem 0 .25rem">Erros comuns</h4><ul class="lista-simples">' + t.erros.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>' : '';
        var corpo = '<div class="porque"><b>Quando usar</b>' + esc(t.porque) + '</div>' +
          '<h4 style="font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:.5rem 0 .25rem">Blocos de tempo</h4><ul class="blocos-tempo">' + blocos + '</ul>' + erros;
        return acordeao('tipo_' + t.id, t.emoji, t.nome, t.duracao, corpo);
      }).join('');
    }

    /* ---------- 4. Ideias por nicho ---------- */
    function htmlNichos() {
      return window.Biblioteca.NICHOS.map(function (n) {
        var ideias = (n.ideias || []).map(function (i) {
          return '<div class="ideia"><strong>' + esc(i.t) + '</strong><em>' + esc(i.gancho) + '</em></div>';
        }).join('');
        return acordeao('nicho_' + n.id, n.emoji, n.nome, (n.ideias || []).length + ' ideias com gancho', ideias);
      }).join('');
    }

    /* ---------- 5. Revisar meu roteiro ---------- */
    function totalRevisao() {
      return window.Biblioteca.REVISAO.reduce(function (s, b) { return s + b.itens.length; }, 0);
    }
    function htmlRevisao() {
      var B = window.Biblioteca;
      var blocos = B.REVISAO.map(function (b, n) {
        var itens = b.itens.map(function (it, i) {
          var id = 'rv_' + n + '_' + i;
          return '<div class="item-check"><input type="checkbox" id="' + id + '" data-revisao="1"><label for="' + id + '"><span class="t">' + esc(it.t) + '</span><span class="d">' + htmlSeguro(it.d) + '</span></label></div>';
        }).join('');
        return '<div class="cartao" style="margin-bottom:.8rem"><div class="cartao-cab"><h2><span aria-hidden="true">' + esc(b.emoji) + '</span> ' + esc(b.bloco) + '</h2></div><div class="cartao-corpo" style="padding-top:.3rem;padding-bottom:.3rem">' + itens + '</div></div>';
      }).join('');
      return '<div class="cartao" style="padding:1rem;margin-bottom:1rem"><div class="campo" style="margin:0"><label for="roteiroTexto">Cole aqui o seu roteiro</label>' +
        '<textarea id="roteiroTexto" class="roteiro" style="margin-bottom:0" placeholder="Escreva ou cole o roteiro do vídeo. Depois confira cada item abaixo."></textarea>' +
        '<span class="ajuda">O texto e as marcações desta parte não ficam salvos: valem só enquanto esta página está aberta.</span></div></div>' +
        '<div class="cartao geral"><strong id="revisaoTexto"></strong><div class="progresso" aria-hidden="true"><i id="revisaoBarra" style="width:0"></i></div>' +
        '<button type="button" class="btn pequeno" id="revisaoLimpar">Limpar tudo</button></div>' + blocos;
    }
    function atualizarRevisao() {
      var feitos = $$('input[data-revisao]:checked', secaoAtual).length, total = totalRevisao();
      $('#revisaoTexto', secaoAtual).textContent = feitos + ' de ' + total + ' itens conferidos';
      $('#revisaoBarra', secaoAtual).style.width = (total ? Math.round((feitos / total) * 100) : 0) + '%';
    }

    /* ---------- montagem ---------- */
    function montar(secao) {
      var B = window.Biblioteca;
      if (!B || !B.CHECKLIST) {
        secao.innerHTML = '<div class="aviso grave" role="alert"><strong>Não achei o conteúdo do checklist.</strong>O arquivo js/biblioteca.js não carregou. Confira se ele está na pasta js do projeto.</div>';
        return false;
      }
      secao.innerHTML = '<div class="subabas" role="tablist" aria-label="Partes do checklist">' + SUBABAS.map(function (s) {
        return '<button type="button" role="tab" id="tab_' + s.id + '" data-sub="' + s.id + '" aria-controls="painel_' + s.id + '" aria-selected="' + (s.id === subAtual) + '">' + esc(s.t) + '</button>';
      }).join('') + '</div>' +
        '<div id="painel_checklist" role="tabpanel" aria-labelledby="tab_checklist">' + htmlChecklist() + '</div>' +
        '<div id="painel_referencias" role="tabpanel" aria-labelledby="tab_referencias" hidden>' + htmlReferencias() + '</div>' +
        '<div id="painel_roteiros" role="tabpanel" aria-labelledby="tab_roteiros" hidden>' + htmlRoteiros() + '</div>' +
        '<div id="painel_nichos" role="tabpanel" aria-labelledby="tab_nichos" hidden>' + htmlNichos() + '</div>' +
        '<div id="painel_revisao" role="tabpanel" aria-labelledby="tab_revisao" hidden>' + htmlRevisao() + '</div>';

      $('.subabas', secao).addEventListener('click', function (e) {
        var b = e.target.closest('button[data-sub]');
        if (!b) return;
        subAtual = b.getAttribute('data-sub');
        SUBABAS.forEach(function (s) {
          $('#painel_' + s.id, secao).hidden = s.id !== subAtual;
          $('#tab_' + s.id, secao).setAttribute('aria-selected', String(s.id === subAtual));
        });
      });
      /* Abrir e fechar as seções (acordeões) */
      secao.addEventListener('click', function (e) {
        var cab = e.target.closest('.acordeao > button');
        if (cab) {
          var bloco = cab.parentNode, corpo = $('.acordeao-corpo', bloco);
          var abrir = corpo.hidden;
          corpo.hidden = !abrir;
          bloco.classList.toggle('aberto', abrir);
          cab.setAttribute('aria-expanded', String(abrir));
          return;
        }
        var ref = e.target.closest('button[data-ref]');
        if (ref) abrirFicha(B.REFERENCIAS[Number(ref.getAttribute('data-ref'))]);
        if (e.target.id === 'revisaoLimpar') {
          $$('input[data-revisao]', secao).forEach(function (c) { c.checked = false; });
          $('#roteiroTexto', secao).value = '';
          atualizarRevisao();
        }
      });
      secao.addEventListener('change', function (e) {
        if (e.target.matches('input[data-chave]')) alternarItem(e.target);
        if (e.target.matches('input[data-revisao]')) atualizarRevisao();
      });
      atualizarRevisao();
      return true;
    }

    Abas.checklist = {
      titulo: 'Checklist portfólio',
      tabelas: TABELAS,
      abrir: async function (secao) {
        secaoAtual = secao;
        /* O que você já marcou vem do banco toda vez que abre a aba (as sub-abas não perdem o que você digitou) */
        var linhas = await listar('marcados', true);
        var novos = {};
        linhas.forEach(function (l) { if (l.marcado) novos[l.chave] = true; });
        marcados = novos;
        if (!montada) montada = montar(secao);
        if (!montada) return;
        $$('input[data-chave]', secao).forEach(function (c) {
          c.checked = !!marcados[c.getAttribute('data-chave')];
          c.closest('.item-check').classList.toggle('feito', c.checked);
        });
        atualizarProgresso();
      }
    };
  })();

  /* =========================================================
     VISITAS: busca e contas (usadas pelo Resumo e pela aba Visitas)
     ========================================================= */
  async function buscarVisitas(dias) {
    var inicio = new Date();
    inicio.setDate(inicio.getDate() - (dias - 1));
    inicio.setHours(0, 0, 0, 0);
    var todas = [];
    try {
      for (var pagina = 0; pagina < 40; pagina++) {
        var r = await banco.from('visitas').select('data,origem,pagina')
          .gte('data', inicio.toISOString()).range(pagina * 1000, pagina * 1000 + 999);
        if (r.error) { problemas.visitas = descreverErro('visitas', r.error); return []; }
        todas = todas.concat(r.data || []);
        if (!r.data || r.data.length < 1000) break;
      }
      delete problemas.visitas;
    } catch (e) {
      problemas.visitas = descreverErro('visitas', e);
      return [];
    }
    return todas;
  }

  function resumirVisitas(visitas, dias) {
    var hoje = hojeISO();
    var lista = [], porDia = {};
    for (var i = dias - 1; i >= 0; i--) { var iso = somarDias(hoje, -i); lista.push(iso); porDia[iso] = 0; }
    var origens = {}, paginas = {}, total = 0;
    visitas.forEach(function (v) {
      var d = new Date(v.data);
      if (isNaN(d.getTime())) return;
      var k = isoLocal(d);
      if (porDia[k] === undefined) return;
      porDia[k]++; total++;
      var o = String(v.origem || '').trim() || 'Direto'; origens[o] = (origens[o] || 0) + 1;
      var p = String(v.pagina || '').trim() || '/'; paginas[p] = (paginas[p] || 0) + 1;
    });
    function ordenar(mapa) {
      return Object.keys(mapa).map(function (n) { return { nome: n, qtd: mapa[n] }; })
        .sort(function (a, b) { return b.qtd - a.qtd || comparaTexto(a.nome, b.nome); });
    }
    var melhor = '';
    lista.forEach(function (d) { if (porDia[d] > (melhor ? porDia[melhor] : 0)) melhor = d; });
    return { dias: lista, porDia: porDia, total: total, hoje: porDia[hoje] || 0, media: total / dias, melhorDia: melhor, origens: ordenar(origens), paginas: ordenar(paginas) };
  }

  function fmtDataHora(valor) {
    var d = new Date(valor);
    if (isNaN(d.getTime())) return '';
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* Gráfico de barras dos últimos N dias (ou uma frase explicando, se ainda não há visitas) */
  function htmlGraficoDias(r, textoVazio) {
    if (r.total === 0) return '<p class="vazio">' + esc(textoVazio) + '</p>';
    var n = r.dias.length;
    var maximo = Math.max.apply(null, r.dias.map(function (d) { return r.porDia[d]; }));
    var hoje = hojeISO();
    var comNumeros = n <= 31;
    var passo = n <= 14 ? 1 : (n <= 31 ? 3 : (n <= 60 ? 7 : 10));
    var colunas = 'style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))"';
    return '<div class="grafico" ' + colunas + ' role="img" aria-label="Visitas por dia">' + r.dias.map(function (d) {
      var c = r.porDia[d];
      var fracao = maximo > 0 ? Math.max(c / maximo, c > 0 ? 0.03 : 0) : 0;
      return '<div class="barra-coluna" title="' + esc(fmtData(d)) + ': ' + c + (c === 1 ? ' visita' : ' visitas') + '">' +
        '<span class="barra-num">' + (comNumeros && c > 0 ? c : '') + '</span>' +
        '<div class="barra' + (d === hoje ? ' hoje' : '') + '" style="height:calc((100% - 1.2rem) * ' + fracao.toFixed(3) + ')"></div></div>';
    }).join('') + '</div>' +
      '<div class="rotulos" ' + colunas + ' aria-hidden="true">' + r.dias.map(function (d, i) {
        return '<span' + ((n - 1 - i) % passo === 0 ? '' : ' style="visibility:hidden"') + '>' + esc(fmtData(d).slice(0, 5)) + '</span>';
      }).join('') + '</div>';
  }

  function htmlListaComBarra(itens, total, vazio, limite) {
    if (!itens.length) return '<p class="vazio">' + esc(vazio) + '</p>';
    return '<ul class="origens">' + itens.slice(0, limite || 8).map(function (o) {
      var pct = total > 0 ? Math.round((o.qtd / total) * 100) : 0;
      return '<li><span>' + esc(o.nome) + '</span><strong>' + fmtInt(o.qtd) + ' <small>(' + pct + '%)</small></strong>' +
        '<span class="trilho"><i style="width:' + pct + '%"></i></span></li>';
    }).join('') + '</ul>';
  }

  /* =========================================================
     ABA: RESUMO (primeira tela) e a VERIFICAÇÃO "está tudo certo?"
     ========================================================= */
  (function () {
    var TABELAS = ['videos', 'marcas', 'campanhas', 'calendario', 'visitas'];
    var TABELAS_DO_SISTEMA = ['videos', 'marcas', 'calendario', 'campanhas', 'marcados', 'visitas', 'site_conteudo'];
    var secaoAtual = null;
    var rodando = false;

    /* Um "visitante": conversa com o banco SEM login, do mesmo jeito que o seu site faz */
    function clienteVisitante() {
      return window.supabase.createClient(window.BANCO_CONFIG.url, window.BANCO_CONFIG.chave, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb-visitante-de-teste' }
      });
    }

    async function verificar(completo) {
      var itens = [];
      function add(estado, titulo, detalhe) { itens.push({ estado: estado, titulo: titulo, detalhe: detalhe || '' }); }

      /* 1. login */
      var sess = await banco.auth.getSession();
      var email = sess && sess.data && sess.data.session && sess.data.session.user && sess.data.session.user.email;
      add(email ? 'ok' : 'erro', 'Login', email ? 'Você está logada como ' + email + '.' : 'Não achei a sua sessão. Entre de novo.');

      /* 2. as tabelas existem e você consegue ler */
      var existentes = [];
      for (var i = 0; i < TABELAS_DO_SISTEMA.length; i++) {
        var t = TABELAS_DO_SISTEMA[i];
        try {
          var r = await banco.from(t).select('*', { count: 'exact', head: true });
          if (r.error) add(t === 'site_conteudo' ? 'aviso' : 'erro', 'Tabela "' + t + '"', descreverErro(t, r.error));
          else existentes.push(t);
        } catch (e) { add('erro', 'Tabela "' + t + '"', descreverErro(t, e)); }
      }
      if (existentes.length === TABELAS_DO_SISTEMA.length) add('ok', 'Tabelas', 'As ' + existentes.length + ' tabelas existem e você consegue ler todas.');

      /* 3. as vitrines que o site usa */
      try {
        var v1 = await banco.rpc('videos_do_site');
        if (v1.error) add('erro', 'Vídeos no site', 'A vitrine de vídeos não respondeu. Rode o banco.sql de novo no Supabase.');
        else add('ok', 'Vídeos no site', fmtInt((v1.data || []).length) + (((v1.data || []).length === 1) ? ' vídeo aparecendo' : ' vídeos aparecendo') + ' no portfólio.');
      } catch (e) { add('erro', 'Vídeos no site', 'A vitrine de vídeos não respondeu.'); }
      try {
        var v2 = await banco.rpc('conteudo_do_site');
        if (v2.error) add('aviso', 'Textos e números do site', 'Ainda não estão ligados. Cole o arquivo banco-2.sql no SQL Editor do Supabase e clique em Run.');
        else add('ok', 'Textos e números do site', 'Prontos para editar na aba "Conteúdo do site".');
      } catch (e) { add('aviso', 'Textos e números do site', 'Ainda não estão ligados. Cole o banco-2.sql no Supabase.'); }

      /* 4. a tranca: um visitante sem login não pode LER nada */
      try {
        var visitante = clienteVisitante();
        var vazaram = [];
        for (var j = 0; j < existentes.length; j++) {
          try {
            var rv = await visitante.from(existentes[j]).select('*').limit(1);
            if (!rv.error && rv.data && rv.data.length) vazaram.push(existentes[j]);
          } catch (e) { /* recusou: é o certo */ }
        }
        add(vazaram.length ? 'erro' : 'ok', 'Tranca do banco',
          vazaram.length ? 'ATENÇÃO: um visitante sem login conseguiu ler: ' + vazaram.join(', ') + '. Rode o banco.sql de novo e me chame.'
            : 'Um visitante sem login não consegue ler nada (testei ' + existentes.length + ' tabelas).');

        /* 4b. teste completo: grava e apaga um contato e uma visita de teste, como o site faz */
        if (completo) {
          var marca = '__teste_painel__';
          var lead = await visitante.from('marcas').insert({ nome: marca, situacao: 'lead', obs: 'Teste automático do painel. Pode apagar.' });
          add(lead.error ? 'erro' : 'ok', 'Formulário do site', lead.error ? 'O formulário NÃO conseguiu gravar um contato: ' + descreverErro('marcas', lead.error) : 'O formulário do site consegue gravar um contato na aba Marcas.');
          var golpe = await visitante.from('marcas').insert({ nome: marca + '_cliente', situacao: 'cliente' });
          add(golpe.error ? 'ok' : 'erro', 'Visitante não vira "cliente"', golpe.error ? 'O banco recusou, como deve ser.' : 'ATENÇÃO: o banco aceitou um visitante como cliente. Rode o banco.sql de novo.');
          var vis = await visitante.from('visitas').insert({ pagina: '/__teste_painel__', origem: '__teste_painel__' });
          add(vis.error ? 'erro' : 'ok', 'Registro de visitas', vis.error ? 'O site NÃO conseguiu registrar uma visita: ' + descreverErro('visitas', vis.error) : 'O site consegue registrar visitas.');
          /* limpeza: só você (logada) consegue apagar */
          await banco.from('marcas').delete().eq('nome', marca);
          await banco.from('marcas').delete().eq('nome', marca + '_cliente');
          await banco.from('visitas').delete().eq('origem', '__teste_painel__');
          var sobrou = await banco.from('marcas').select('*', { count: 'exact', head: true }).eq('nome', marca);
          var sobrou2 = await banco.from('visitas').select('*', { count: 'exact', head: true }).eq('origem', '__teste_painel__');
          var restos = (sobrou.count || 0) + (sobrou2.count || 0);
          add(restos ? 'aviso' : 'ok', 'Limpeza do teste', restos ? 'Sobrou ' + restos + ' registro de teste. Apague na aba Marcas (nome __teste_painel__).' : 'Os registros de teste foram apagados. Nada ficou na sua base.');
        }
      } catch (e) {
        add('aviso', 'Tranca do banco', 'Não consegui rodar o teste de visitante agora.');
      }

      /* 5. o site publicado está usando o painel? */
      try {
        var resp = await fetch('../index.html?conferir=' + Date.now(), { cache: 'no-store' });
        var html = await resp.text();
        var ligado = /videos_do_site/.test(html);
        add(ligado ? 'ok' : 'erro', 'Site publicado', ligado ? 'O portfólio publicado está ligado ao painel.' : 'O portfólio publicado NÃO está lendo o painel. Falta publicar a versão nova.');
      } catch (e) {
        add('aviso', 'Site publicado', 'Não consegui abrir o site daqui para conferir.');
      }

      /* 6. as visitas estão chegando? */
      try {
        var ult = await banco.from('visitas').select('data').order('data', { ascending: false }).limit(1);
        if (ult.error) add('erro', 'Visitas', descreverErro('visitas', ult.error));
        else if (!ult.data || !ult.data.length) add('aviso', 'Visitas', 'Ainda nenhuma visita registrada. É normal se ninguém abriu o site depois que ele foi ligado ao painel. Abra o site numa janela anônima e confira de novo.');
        else add('ok', 'Visitas', 'Chegando normalmente. A última foi em ' + fmtDataHora(ult.data[0].data) + '.');
      } catch (e) { add('aviso', 'Visitas', 'Não consegui conferir as visitas agora.'); }

      return itens;
    }

    function htmlVerificacao(itens) {
      var erros = itens.filter(function (i) { return i.estado === 'erro'; }).length;
      var avisos = itens.filter(function (i) { return i.estado === 'aviso'; }).length;
      var titulo = erros ? erros + (erros === 1 ? ' coisa precisa de atenção' : ' coisas precisam de atenção')
        : (avisos ? 'Tudo certo, com ' + avisos + (avisos === 1 ? ' aviso' : ' avisos') : 'Tudo certo');
      return '<p class="v-resumo ' + (erros ? 'v-erro' : (avisos ? 'v-aviso' : 'v-ok')) + '">' + esc(titulo) + '</p>' +
        '<ul class="verificacao">' + itens.map(function (i) {
          var icone = i.estado === 'ok' ? ic('check') : (i.estado === 'erro' ? ic('fechar') : ic('alerta'));
          return '<li class="v-' + i.estado + '"><span class="v-ico">' + icone + '</span><div><strong>' + esc(i.titulo) + '</strong><small>' + esc(i.detalhe) + '</small></div></li>';
        }).join('') + '</ul>';
    }

    async function rodarVerificacao(completo) {
      if (rodando) return;
      rodando = true;
      var alvo = $('#verificacaoCorpo', secaoAtual);
      var b1 = $('#verificarAgora', secaoAtual), b2 = $('#verificarCompleto', secaoAtual);
      if (b1) b1.disabled = true; if (b2) b2.disabled = true;
      alvo.innerHTML = '<p class="carregando">Conferindo tudo, um instante...</p>';
      var itens;
      try { itens = await verificar(completo); }
      catch (e) { itens = [{ estado: 'erro', titulo: 'Verificação', detalhe: 'Não consegui rodar a verificação agora. Recarregue a página.' }]; }
      alvo.innerHTML = htmlVerificacao(itens);
      if (b1) b1.disabled = false; if (b2) b2.disabled = false;
      rodando = false;
    }

    function htmlAtencao() {
      var hoje = hojeISO();
      var camp = (cache.campanhas || []).filter(function (c) { return !c.exemplo && c.prazo && c.status !== 'Entregue'; });
      var atrasadas = camp.filter(function (c) { return diasEntre(hoje, String(c.prazo).slice(0, 10)) < 0; }).length;
      var perto = camp.filter(function (c) { var d = diasEntre(hoje, String(c.prazo).slice(0, 10)); return d >= 0 && d <= 3; }).length;
      var cal = (cache.calendario || []).filter(function (c) { return !c.exemplo && c.status !== 'feito' && c.data; });
      var calHoje = cal.filter(function (c) { return String(c.data).slice(0, 10) === hoje; }).length;
      var calAtras = cal.filter(function (c) { return String(c.data).slice(0, 10) < hoje; }).length;
      var limite = somarDias(hoje, -7);
      var leadsNovos = (cache.marcas || []).filter(function (m) { return !m.exemplo && m.situacao === 'lead' && String(m.criado_em || '').slice(0, 10) >= limite; }).length;
      function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
      var linhas = [];
      if (atrasadas) linhas.push({ n: atrasadas, classe: 'e-atraso', texto: plural(atrasadas, 'campanha com o prazo atrasado', 'campanhas com o prazo atrasado'), rota: 'campanhas' });
      if (perto) linhas.push({ n: perto, classe: 'e-aviso', texto: plural(perto, 'campanha vence', 'campanhas vencem') + ' em até 3 dias', rota: 'campanhas' });
      if (calAtras) linhas.push({ n: calAtras, classe: 'e-atraso', texto: plural(calAtras, 'item do calendário ficou pra trás', 'itens do calendário ficaram pra trás'), rota: 'calendario' });
      if (calHoje) linhas.push({ n: calHoje, classe: 'e-aviso', texto: plural(calHoje, 'coisa para fazer hoje', 'coisas para fazer hoje'), rota: 'calendario' });
      if (leadsNovos) linhas.push({ n: leadsNovos, classe: 'e-aviso', texto: plural(leadsNovos, 'contato novo', 'contatos novos') + ' nos últimos 7 dias', rota: 'marcas' });
      if (!linhas.length) return '<p class="vazio">Nada pendente. Tudo em dia.</p>';
      return '<ul class="atencao">' + linhas.map(function (l) {
        return '<li><span class="etiqueta ' + l.classe + '">' + l.n + '</span><span class="txt">' + esc(l.texto) + '</span><a class="btn pequeno" href="#' + l.rota + '">Abrir</a></li>';
      }).join('') + '</ul>';
    }

    Abas.resumo = {
      titulo: 'Resumo',
      tabelas: TABELAS,
      abrir: async function (secao) {
        secaoAtual = secao;
        if (!secao.innerHTML.trim()) secao.innerHTML = '<p class="carregando">Carregando...</p>';
        var resultado = await Promise.all([listar('videos', true), listar('marcas', true), listar('campanhas', true), listar('calendario', true), buscarVisitas(14)]);
        var videos = resultado[0], marcas = resultado[1], campanhas = resultado[2], visitas = resultado[4];
        var v = resumirVisitas(visitas, 14);
        var noAr = videos.filter(function (x) { return x.visivel && !x.exemplo; }).length;
        var leads = marcas.filter(function (m) { return !m.exemplo && m.situacao === 'lead'; }).length;
        var receber = campanhas.filter(function (c) { return !c.exemplo && c.pagamento !== 'pago'; }).reduce(function (s, c) { return s + (Number(c.valor) || 0); }, 0);
        secao.innerHTML =
          '<div class="cartao faixa-numeros" role="group" aria-label="Resumo geral">' +
            '<div class="numero"><div class="numero-rotulo">Visitas hoje</div><div class="numero-valor">' + fmtInt(v.hoje) + '</div><div class="numero-sub">' + fmtInt(v.total) + ' em 14 dias</div></div>' +
            '<div class="numero"><div class="numero-rotulo">Vídeos no ar</div><div class="numero-valor">' + fmtInt(noAr) + '</div></div>' +
            '<div class="numero"><div class="numero-rotulo">Leads (contatos)</div><div class="numero-valor">' + fmtInt(leads) + '</div><div class="numero-sub">na aba Marcas</div></div>' +
            '<div class="numero"><div class="numero-rotulo">Campanhas ativas</div><div class="numero-valor">' + fmtInt(campanhas.filter(function (c) { return !c.exemplo && c.ativa; }).length) + '</div></div>' +
            '<div class="numero"><div class="numero-rotulo">A receber</div><div class="numero-valor">' + fmtMoeda(receber) + '</div></div>' +
          '</div>' +
          '<div class="duas-colunas">' +
            '<div class="cartao"><div class="cartao-cab"><h2>Visitas nos últimos 14 dias</h2><a class="btn pequeno" href="#visitas">Ver detalhes</a></div><div class="cartao-corpo">' +
              htmlGraficoDias(v, 'Quando as pessoas começarem a visitar o seu portfólio, aqui vai aparecer o gráfico das visitas de cada dia.') + '</div></div>' +
            '<div class="cartao"><div class="cartao-cab"><h2>Precisa de atenção</h2></div><div class="cartao-corpo">' + htmlAtencao() + '</div></div>' +
          '</div>' +
          '<div class="cartao"><div class="cartao-cab"><h2>Está tudo certo?</h2>' +
            '<button type="button" class="btn" id="verificarCompleto" title="Grava e apaga um contato e uma visita de teste, como o site faria">Teste completo</button>' +
            '<button type="button" class="btn principal-btn" id="verificarAgora">Testar agora</button></div>' +
            '<div class="cartao-corpo" id="verificacaoCorpo"></div></div>';
        $('#verificarAgora', secao).addEventListener('click', function () { rodarVerificacao(false); });
        $('#verificarCompleto', secao).addEventListener('click', function () { rodarVerificacao(true); });
        rodarVerificacao(false);
      }
    };
  })();

  /* =========================================================
     ABA: VISITAS (detalhes)
     ========================================================= */
  (function () {
    var TABELAS = ['visitas'];
    var estado = { dias: 30 };
    var secaoAtual = null;

    async function desenhar() {
      var alvo = $('#visitasCorpo', secaoAtual);
      alvo.innerHTML = '<p class="carregando">Carregando...</p>';
      var visitas = await buscarVisitas(estado.dias);
      var r = resumirVisitas(visitas, estado.dias);
      var media = r.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      var recentes = visitas.slice().sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).slice(0, 50);
      alvo.innerHTML =
        '<div class="cartao faixa-numeros quatro" role="group" aria-label="Resumo das visitas">' +
          '<div class="numero"><div class="numero-rotulo">Visitas no período</div><div class="numero-valor">' + fmtInt(r.total) + '</div><div class="numero-sub">últimos ' + estado.dias + ' dias</div></div>' +
          '<div class="numero"><div class="numero-rotulo">Média por dia</div><div class="numero-valor">' + media + '</div></div>' +
          '<div class="numero"><div class="numero-rotulo">Hoje</div><div class="numero-valor">' + fmtInt(r.hoje) + '</div></div>' +
          '<div class="numero"><div class="numero-rotulo">Melhor dia</div><div class="numero-valor texto">' + (r.melhorDia ? esc(fmtData(r.melhorDia)) : 'Ainda nenhum') + '</div>' +
            (r.melhorDia ? '<div class="numero-sub">' + fmtInt(r.porDia[r.melhorDia]) + (r.porDia[r.melhorDia] === 1 ? ' visita' : ' visitas') + '</div>' : '') + '</div>' +
        '</div>' +
        '<div class="cartao" style="margin-bottom:1rem"><div class="cartao-cab"><h2>Visitas por dia</h2></div><div class="cartao-corpo">' +
          htmlGraficoDias(r, 'Quando as pessoas começarem a visitar o seu portfólio, aqui vai aparecer o gráfico com as visitas de cada dia.') + '</div></div>' +
        '<div class="duas-colunas" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
          '<div class="cartao"><div class="cartao-cab"><h2>Por onde chegaram</h2></div><div class="cartao-corpo">' +
            htmlListaComBarra(r.origens, r.total, 'Aqui vai aparecer se as pessoas vieram do Instagram, do Google, de um link direto ou de outro lugar.', 8) + '</div></div>' +
          '<div class="cartao"><div class="cartao-cab"><h2>Páginas mais vistas</h2></div><div class="cartao-corpo">' +
            htmlListaComBarra(r.paginas, r.total, 'Aqui vai aparecer quais páginas do seu site as pessoas abrem.', 8) + '</div></div>' +
        '</div>' +
        '<div class="cartao"><div class="cartao-cab"><h2>Últimos acessos</h2><span style="color:var(--muted);font-size:.8rem">Os 50 mais recentes. Não guarda nome nem nenhum dado pessoal.</span></div>' +
          (recentes.length
            ? '<div class="rolagem"><table class="tabela"><thead><tr><th>Data e hora</th><th>Origem</th><th>Página</th></tr></thead><tbody>' +
              recentes.map(function (v) { return '<tr><td>' + esc(fmtDataHora(v.data)) + '</td><td>' + esc(v.origem || 'Direto') + '</td><td>' + esc(v.pagina || '/') + '</td></tr>'; }).join('') + '</tbody></table></div>'
            : '<p class="vazio">Ainda nenhum acesso registrado. Assim que alguém abrir o seu portfólio, ele aparece aqui.</p>') +
        '</div>';
      mostrarProblemas(TABELAS);
    }

    Abas.visitas = {
      titulo: 'Visitas',
      tabelas: TABELAS,
      abrir: async function (secao) {
        secaoAtual = secao;
        secao.innerHTML = '<div class="cal-cab"><div class="segmentos" id="visitasPeriodo" role="group" aria-label="Período">' +
          [7, 14, 30, 90].map(function (d) { return '<button type="button" data-dias="' + d + '" aria-pressed="' + (d === estado.dias) + '">' + d + ' dias</button>'; }).join('') +
          '</div></div><div id="visitasCorpo"></div>';
        $('#visitasPeriodo', secao).addEventListener('click', function (e) {
          var b = e.target.closest('button[data-dias]');
          if (!b) return;
          estado.dias = Number(b.getAttribute('data-dias'));
          $$('#visitasPeriodo button', secao).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          desenhar();
        });
        await desenhar();
      }
    };
  })();

  /* =========================================================
     ABA: CONTEÚDO DO SITE
     Edita os textos e números do portfólio sem mexer em código.
     Fica guardado na tabela "site_conteudo" (rode o banco-2.sql).
     ========================================================= */
  (function () {
    var TABELAS = ['site_conteudo', 'videos'];
    var secaoAtual = null;
    var conteudo = {};           /* chave -> valor guardado no banco */

    function texto(v) { return v == null ? '' : String(v); }
    function cortar(t, n) { t = texto(t); return t.length > n ? t.slice(0, n).trim() + '...' : t; }

    /* Títulos das seções: o texto que já está no site (vale enquanto nada foi salvo). *palavra* fica em itálico. */
    var TITULOS_PADRAO = {
      sobre: { rotulo: 'Sobre mim', titulo: 'Prazer, eu sou a *Esther*' },
      destaques: { rotulo: 'Em evidência', titulo: 'Conteúdos de *destaque*', texto: 'Vídeos que mostram como uma boa ideia, contada com verdade, vira resultado. Toque em um card para assistir.' },
      trabalhos: { rotulo: 'Categorias', titulo: 'Que tipo de *conteúdo* você precisa?', texto: 'Navegue pelos nichos. Cada linha é uma especialidade. Deslize para o lado para ver mais.' },
      servicos: { rotulo: 'Serviços', titulo: 'Como eu te *ajudo*', texto: 'Do roteiro à publicação, cada etapa pensada para a sua marca aparecer melhor.' },
      numeros: { rotulo: 'Resultados', titulo: 'Números e *depoimentos*' },
      contato: { rotulo: 'Contato', titulo: 'Bora criar *juntos*', texto: 'Conte um pouco sobre a sua marca e o que você quer comunicar. Eu respondo com carinho e com uma proposta pensada para você.' }
    };
    var TITULOS_NOMES = { sobre: 'Sobre mim', destaques: 'Destaques', trabalhos: 'Trabalhos por nicho', servicos: 'Serviços', numeros: 'Números', contato: 'Contato' };

    function camposDosTitulos() {
      var campos = [];
      Object.keys(TITULOS_PADRAO).forEach(function (id, i) {
        var nome = TITULOS_NOMES[id];
        campos.push({ nome: id + '__rotulo', rotulo: nome + ': etiqueta pequena' });
        campos.push({ nome: id + '__titulo', rotulo: nome + ': título', largo: true,
          ajuda: i === 0 ? 'A palavra entre asteriscos fica em itálico. Exemplo: Conteúdos de *destaque*' : '' });
        if ('texto' in TITULOS_PADRAO[id]) campos.push({ nome: id + '__texto', rotulo: nome + ': texto de abertura', tipo: 'textarea', largo: true });
      });
      return campos;
    }

    /* As partes editáveis do site */
    var SECOES = [
      {
        chave: 'capa', titulo: 'Capa', tipo: 'objeto',
        descricao: 'O texto do selo, a frase e os dois números que aparecem logo abaixo do título da capa.',
        campos: [
          { nome: 'chip', rotulo: 'Texto do selo (ao lado do ícone)', obrigatorio: true, largo: true },
          { nome: 'frase', rotulo: 'Frase abaixo do título', tipo: 'textarea', largo: true },
          { nome: 'numero1', rotulo: 'Primeiro número', placeholder: '+500 vídeos' },
          { nome: 'numero2', rotulo: 'Segundo número', placeholder: '+200 marcas' }
        ],
        paraForm: function (v) { var n = (v && v.numeros) || []; return { chip: v && v.chip, frase: v && v.frase, numero1: n[0], numero2: n[1] }; },
        deForm: function (f) { return { chip: f.chip, frase: f.frase || '', numeros: [f.numero1, f.numero2].filter(Boolean) }; },
        resumo: function (v) { var n = (v && v.numeros) || []; return [texto(v && v.chip), cortar(v && v.frase, 90), n.join('  |  ')].filter(Boolean); }
      },
      {
        chave: 'sobre', titulo: 'Sobre mim', tipo: 'objeto',
        descricao: 'Os dois textos da seção "Sobre mim": a frase de abertura em destaque e o parágrafo seguinte.',
        campos: [
          { nome: 'abre', rotulo: 'Frase de abertura (em destaque)', tipo: 'textarea', largo: true, obrigatorio: true },
          { nome: 'texto', rotulo: 'Parágrafo', tipo: 'textarea', largo: true }
        ],
        paraForm: function (v) { return { abre: v && v.abre, texto: v && v.texto }; },
        deForm: function (f) { return { abre: f.abre, texto: f.texto || '' }; },
        resumo: function (v) { return [cortar(v && v.abre, 110), cortar(v && v.texto, 110)].filter(Boolean); }
      },
      {
        chave: 'titulos', titulo: 'Títulos das seções', tipo: 'objeto',
        descricao: 'A etiqueta pequena, o título e o texto de abertura de cada seção do site. Campo vazio mantém o texto original.',
        campos: camposDosTitulos(),
        paraForm: function (v) {
          var f = {};
          Object.keys(TITULOS_PADRAO).forEach(function (id) {
            var salvo = (v && v[id]) || {};
            Object.keys(TITULOS_PADRAO[id]).forEach(function (c) { f[id + '__' + c] = texto(salvo[c]).trim() || TITULOS_PADRAO[id][c]; });
          });
          return f;
        },
        deForm: function (f) {
          var v = {};
          Object.keys(TITULOS_PADRAO).forEach(function (id) {
            v[id] = {};
            Object.keys(TITULOS_PADRAO[id]).forEach(function (c) { v[id][c] = texto(f[id + '__' + c]).trim(); });
          });
          return v;
        },
        resumo: function (v) {
          return Object.keys(TITULOS_PADRAO).map(function (id) {
            var t = texto(v && v[id] && v[id].titulo).trim() || TITULOS_PADRAO[id].titulo;
            return TITULOS_NOMES[id] + ': ' + t.replace(/\*/g, '');
          });
        }
      },
      {
        chave: 'nichos', titulo: 'Nichos da galeria', tipo: 'lista', item: 'Nicho',
        descricao: 'As linhas da galeria: nome, descrição (a frase em itálico abaixo do nome) e a ordem. Use "Adicionar nicho" para criar um novo; depois escolha esse nicho nos vídeos. O nome precisa ser igual ao nicho escrito nos vídeos.',
        padrao: NICHOS_DO_SITE,
        colunas: [
          { nome: 'nome', rotulo: 'Nome do nicho', obrigatorio: true, placeholder: 'Skincare' },
          { nome: 'subtitulo', rotulo: 'Descrição (frase em itálico abaixo do nome)', largo: true, placeholder: 'Cuidados com a pele que entram na rotina' }
        ],
        resumo: function (v) { return (Array.isArray(v) ? v : []).map(function (n) { return texto(n.nome) + (n.subtitulo ? ': ' + texto(n.subtitulo) : ''); }); }
      },
      {
        chave: 'metricas', titulo: 'Números do portfólio', tipo: 'lista', item: 'Número',
        descricao: 'Os quatro números com contador animado. Deixe o valor em branco para mostrar "00".',
        colunas: [
          { nome: 'rotulo', rotulo: 'O que o número mostra', obrigatorio: true, largo: true, placeholder: 'vídeos entregues' },
          { nome: 'valor', rotulo: 'Valor', tipo: 'number', placeholder: '500' },
          { nome: 'prefixo', rotulo: 'Antes do número', placeholder: '+' },
          { nome: 'sufixo', rotulo: 'Depois do número', placeholder: ' mil' }
        ],
        resumo: function (v) { return (Array.isArray(v) ? v : []).map(function (m) { return texto(m.prefixo) + (m.valor == null ? '00' : fmtInt(m.valor)) + texto(m.sufixo) + ' ' + texto(m.rotulo); }); }
      },
      {
        chave: 'servicos', titulo: 'Serviços', tipo: 'lista', item: 'Serviço',
        descricao: 'Os serviços da seção "Como eu te ajudo".',
        colunas: [
          { nome: 'numero', rotulo: 'Número', placeholder: '01' },
          { nome: 'titulo', rotulo: 'Título', obrigatorio: true },
          { nome: 'texto', rotulo: 'Descrição', tipo: 'textarea', largo: true }
        ],
        resumo: function (v) { return (Array.isArray(v) ? v : []).map(function (s) { return texto(s.numero) + ' ' + texto(s.titulo); }); }
      },
      {
        chave: 'resultados', titulo: 'Resultados de campanha', tipo: 'lista', item: 'Resultado',
        descricao: 'Os cartões escuros com o resultado que você entregou.',
        colunas: [
          { nome: 'numero', rotulo: 'Número em destaque', placeholder: '+40%' },
          { nome: 'titulo', rotulo: 'Título', obrigatorio: true },
          { nome: 'marca', rotulo: 'Marca' },
          { nome: 'texto', rotulo: 'Descrição', tipo: 'textarea', largo: true }
        ],
        resumo: function (v) { return (Array.isArray(v) ? v : []).map(function (r) { return texto(r.numero) + ' ' + texto(r.titulo); }); }
      },
      {
        chave: 'depoimentos', titulo: 'Depoimentos', tipo: 'lista', item: 'Depoimento',
        descricao: 'O que os clientes falam de você.',
        colunas: [
          { nome: 'nome', rotulo: 'Nome de quem falou', obrigatorio: true },
          { nome: 'empresa', rotulo: 'Empresa ou marca' },
          { nome: 'texto', rotulo: 'Depoimento', tipo: 'textarea', largo: true, obrigatorio: true }
        ],
        resumo: function (v) { return (Array.isArray(v) ? v : []).map(function (d) { return texto(d.nome) + ' (' + texto(d.empresa) + ')'; }); }
      }
    ];

    /* ---------- Vídeos do site (a mesma tabela "videos" da aba Portfólio) ---------- */
    function semAcento(t) { return String(t == null ? '' : t).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim(); }

    function videosOrdenados() {
      return (cache.videos || []).filter(function (v) { return !v.exemplo; }).sort(function (a, b) {
        return (a.ordem || 0) - (b.ordem || 0) || String(a.criado_em || '').localeCompare(String(b.criado_em || ''));
      });
    }

    /* Os nichos, na ordem do cartão "Nichos" (ou na ordem padrão) */
    function nichosDoSite() {
      var lista = Array.isArray(conteudo.nichos) && conteudo.nichos.length ? conteudo.nichos : NICHOS_DO_SITE;
      return lista.map(function (n) { return { nome: texto(n && n.nome).trim(), subtitulo: texto(n && n.subtitulo) }; }).filter(function (n) { return n.nome; });
    }

    /* Grupos que aparecem no cartão: Destaques, um por nicho e os que estão sem nicho */
    function gruposDeVideos(novos) {
      var todos = videosOrdenados();
      var grupos = [];
      if (novos) {
        grupos.push({ chave: '@destaques', titulo: 'Destaques (carrossel)', sub: 'Os cards grandes do começo do site, na ordem abaixo.', videos: todos.filter(function (v) { return v.em_destaques; }), sempre: true });
      }
      var usados = {};
      nichosDoSite().forEach(function (n) {
        if (usados[semAcento(n.nome)]) return;
        usados[semAcento(n.nome)] = true;
        grupos.push({ chave: 'n:' + n.nome, titulo: n.nome, sub: n.subtitulo, videos: todos.filter(function (v) { return semAcento(v.nicho) === semAcento(n.nome); }) });
      });
      todos.forEach(function (v) {                       /* nichos que só existem nos vídeos */
        var k = semAcento(v.nicho);
        if (!k || usados[k]) return;
        usados[k] = true;
        grupos.push({ chave: 'n:' + texto(v.nicho).trim(), titulo: texto(v.nicho).trim(), sub: 'Este nicho não está no cartão "Nichos": ele aparece no fim da lista do site.', videos: todos.filter(function (x) { return semAcento(x.nicho) === k; }) });
      });
      var soltos = todos.filter(function (v) { return !semAcento(v.nicho) && !(novos && v.em_destaques); });
      if (soltos.length) grupos.push({ chave: '@sem', titulo: 'Sem nicho', sub: 'Não aparecem em nenhuma linha do site. Escolha um nicho ou marque como Destaque.', videos: soltos });
      return grupos.filter(function (g) { return g.sempre || g.videos.length; });
    }

    function capaNoPainel(v) {
      var c = texto(v.capa).trim();
      if (/^img\//i.test(c)) return '../' + c;
      if (/^https:\/\//i.test(c)) return c;
      var m = texto(v.link).match(/(?:youtube\.com\/(?:shorts\/|embed\/|watch\?(?:[^#\s]*&)?v=)|youtu\.be\/)([\w-]{11})/i);
      return m ? 'https://i.ytimg.com/vi/' + m[1] + '/mqdefault.jpg' : '';
    }

    function htmlLinhaVideoSite(v, g, i, total) {
      var capa = capaNoPainel(v);
      var nome = texto(v.marca).trim() || texto(v.titulo);
      var sub = [];
      if (texto(v.titulo).trim() && texto(v.titulo).trim().toLowerCase() !== texto(v.marca).trim().toLowerCase()) sub.push(texto(v.titulo).trim());
      if (texto(v.destaque).trim()) sub.push(texto(v.destaque).trim());
      var link = linkSeguro(v.link);
      var idv = esc(v.id), grupo = esc(g.chave);
      function bt(acao, icone, titulo, extra, perigo) {
        return '<button type="button" class="btn-icone' + (perigo ? ' perigo' : '') + '" data-vacao="' + acao + '" data-id="' + idv + '" data-grupo="' + grupo + '" title="' + titulo +
          '" aria-label="' + titulo + ': ' + esc(nome) + '"' + (extra || '') + '>' + ic(icone) + '</button>';
      }
      return '<div class="vlinha' + (v.visivel ? '' : ' escondida') + '">' +
        (capa ? '<img class="vthumb" src="' + esc(capa) + '" alt="" loading="lazy">' : '<span class="vthumb"></span>') +
        '<div class="vinfo"><strong>' + esc(nome || 'Sem nome') +
          (v.visivel ? '' : ' <span class="etiqueta e-aviso">Escondido</span>') +
          (g.chave.charAt(0) === 'n' && v.em_destaques ? ' <span class="pilula p-lead">Também nos Destaques</span>' : '') + '</strong>' +
        '<span>' + esc(sub.join(' · ') || 'Sem descrição') + (link ? '' : ' · sem link') + '</span></div>' +
        '<div class="acoes">' +
          bt('subir', 'setaCima', 'Subir', i === 0 ? ' disabled' : '') +
          bt('descer', 'setaBaixo', 'Descer', i === total - 1 ? ' disabled' : '') +
          bt('visivel', v.visivel ? 'olho' : 'olhoRiscado', v.visivel ? 'Aparece no site. Clique para esconder' : 'Escondido do site. Clique para mostrar') +
          bt('editar', 'lapis', 'Editar') +
          bt('apagar', 'lixo', 'Apagar', '', true) +
        '</div></div>';
    }

    function htmlVideosSite() {
      var novos = videosTemCamposNovos();
      var corpo;
      if (problemas.videos) {
        corpo = '<p class="vazio">' + esc(problemas.videos) + '</p>';
      } else {
        corpo = gruposDeVideos(novos).map(function (g) {
          return '<div class="vgrupo"><div class="vgrupo-cab"><h3>' + esc(g.titulo) + '</h3><small>' + g.videos.length + (g.videos.length === 1 ? ' vídeo' : ' vídeos') +
            (g.sub ? ' · ' + esc(g.sub) : '') + '</small></div>' +
            (g.videos.length ? g.videos.map(function (v, i) { return htmlLinhaVideoSite(v, g, i, g.videos.length); }).join('') : '<p class="vazio" style="padding:.6rem 1rem;text-align:left">Nenhum vídeo marcado como destaque ainda.</p>') + '</div>';
        }).join('') || '<p class="vazio">Você ainda não tem vídeos. Clique em "Adicionar vídeo".</p>';
      }
      var nota = !novos && !problemas.videos
        ? '<p class="cartao-corpo" style="border-top:1px solid var(--line);color:var(--muted);font-size:.8rem">Para editar capa e Destaques por aqui, rode o arquivo videos-site.sql no SQL Editor do Supabase.</p>'
        : '';
      return '<div class="cartao" style="margin-bottom:1rem"><div class="cartao-cab"><h2>Vídeos do site</h2>' +
        '<div style="display:flex;gap:.5rem;flex-wrap:wrap"><button type="button" class="btn" data-editar="nichos">' + ic('lapis') + 'Nichos e descrições</button>' +
        '<button type="button" class="btn principal-btn" data-vacao="novo">' + ic('mais') + 'Adicionar vídeo</button></div></div>' +
        '<p class="cartao-corpo" style="padding-bottom:.4rem;color:var(--muted);font-size:.84rem">Aqui você edita os vídeos que tocam no seu portfólio: marca, textos, nicho, capa e a ordem. As setas mudam a ordem dentro de cada grupo. O olhinho mostra ou esconde no site. Depois de salvar, recarregue o site para ver.</p>' +
        corpo + nota + '</div>';
    }

    function desenharVideosSite() {
      var alvo = $('#videosSite', secaoAtual);
      if (alvo) alvo.innerHTML = htmlVideosSite();
    }

    async function atualizarVideos() {
      await listar('videos', true);
      desenharVideosSite();
      mostrarProblemas(TABELAS);
    }

    /* Troca a posição do vídeo com o vizinho do mesmo grupo e renumera a ordem geral */
    async function moverVideo(v, chave, dir) {
      var g = gruposDeVideos(videosTemCamposNovos()).filter(function (x) { return x.chave === chave; })[0];
      if (!g) return;
      var vizinho = g.videos[g.videos.indexOf(v) + dir];
      if (!vizinho) return;
      var todos = videosOrdenados();
      var a = todos.indexOf(v), b = todos.indexOf(vizinho);
      todos[a] = vizinho; todos[b] = v;
      var mudou = [];
      todos.forEach(function (x, k) { if ((x.ordem || 0) !== k + 1) mudou.push({ x: x, ordem: k + 1 }); });
      var resultados = await Promise.all(mudou.map(function (m) { return gravar('videos', { ordem: m.ordem }, m.x.id); }));
      var falha = resultados.filter(function (r) { return !r.ok; })[0];
      if (falha) { aviso(falha.erro, 'erro'); await atualizarVideos(); return; }
      mudou.forEach(function (m) { m.x.ordem = m.ordem; });
      desenharVideosSite();
    }

    async function acaoVideo(botao) {
      var acao = botao.getAttribute('data-vacao');
      if (acao === 'novo') { formularioVideo(null, atualizarVideos); return; }
      var id = botao.getAttribute('data-id');
      var v = (cache.videos || []).filter(function (x) { return x.id === id; })[0];
      if (!v) return;
      if (acao === 'editar') { formularioVideo(v, atualizarVideos); return; }
      if (acao === 'subir' || acao === 'descer') {
        botao.disabled = true;
        await moverVideo(v, botao.getAttribute('data-grupo'), acao === 'subir' ? -1 : 1);
        return;
      }
      if (acao === 'visivel') {
        botao.disabled = true;
        var r = await gravar('videos', { visivel: !v.visivel }, v.id);
        if (r.ok) { aviso(v.visivel ? 'Vídeo escondido do site.' : 'Vídeo aparecendo no site.'); await atualizarVideos(); }
        else { botao.disabled = false; aviso(r.erro, 'erro'); }
        return;
      }
      if (acao === 'apagar') {
        if (!(await confirmar('Apagar "' + (texto(v.marca) || texto(v.titulo)) + '"? Ele some do site e não dá para desfazer.'))) return;
        var r2 = await apagar('videos', v.id);
        if (r2.ok) { aviso('Vídeo apagado.'); await atualizarVideos(); } else aviso(r2.erro, 'erro');
      }
    }

    async function guardar(chave, valor) {
      try {
        var r = await banco.from('site_conteudo').upsert({ chave: chave, valor: valor, atualizado_em: new Date().toISOString() });
        if (r.error) return { ok: false, erro: descreverErro('site_conteudo', r.error) };
        conteudo[chave] = valor;
        return { ok: true };
      } catch (e) { return { ok: false, erro: descreverErro('site_conteudo', e) }; }
    }

    function depoisDeSalvar() {
      aviso('Salvo. O portfólio já mostra a mudança (recarregue a página do site para ver).');
      desenhar();
    }

    function editarObjeto(sec) {
      formulario({
        titulo: 'Editar: ' + sec.titulo,
        campos: sec.campos,
        valores: sec.paraForm(conteudo[sec.chave] || {}),
        aoSalvar: async function (f) {
          var r = await guardar(sec.chave, sec.deForm(f));
          if (r.ok) depoisDeSalvar();
          return r;
        }
      });
    }

    function editarLinhas(sec) {
      formulario({
        titulo: 'Editar: ' + sec.titulo,
        campos: [{ nome: 'linhas', rotulo: 'Um nome por linha', tipo: 'textarea', largo: true, obrigatorio: true, ajuda: 'Dica: o letreiro fica melhor com 6 nomes ou mais.' }],
        valores: { linhas: (Array.isArray(conteudo[sec.chave]) ? conteudo[sec.chave] : []).join('\n') },
        aoSalvar: async function (f) {
          var lista = String(f.linhas || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 60);
          if (!lista.length) return { ok: false, erro: 'Escreva pelo menos um nome.' };
          var r = await guardar(sec.chave, lista);
          if (r.ok) depoisDeSalvar();
          return r;
        }
      });
    }

    /* Editor de listas: várias linhas, cada uma com seus campos, com subir, descer e remover */
    function editarLista(sec) {
      var itens = (Array.isArray(conteudo[sec.chave]) ? conteudo[sec.chave] : (sec.padrao || [])).map(function (x) { return Object.assign({}, x); });

      function ler() {
        $$('.linha-editor', corpo).forEach(function (fs) {
          var i = Number(fs.getAttribute('data-i'));
          sec.colunas.forEach(function (c) {
            var el = fs.querySelector('[data-nome="' + c.nome + '"]');
            if (!el || !itens[i]) return;
            var v = String(el.value).trim();
            if (c.tipo === 'number') itens[i][c.nome] = v === '' ? null : Number(v.replace(',', '.'));
            else itens[i][c.nome] = v;
          });
        });
      }
      function desenharLinhas() {
        corpo.innerHTML = itens.length ? itens.map(function (it, i) {
          var campos = sec.colunas.map(function (c) {
            var id = 'ed_' + i + '_' + c.nome;
            var val = it[c.nome] == null ? '' : it[c.nome];
            var entrada = c.tipo === 'textarea'
              ? '<textarea id="' + id + '" data-nome="' + c.nome + '">' + esc(val) + '</textarea>'
              : '<input id="' + id + '" data-nome="' + c.nome + '" type="' + (c.tipo === 'number' ? 'number' : 'text') + '"' + (c.tipo === 'number' ? ' step="any"' : '') + ' value="' + esc(val) + '" placeholder="' + esc(c.placeholder || '') + '" autocomplete="off">';
            return '<div class="campo' + (c.largo ? ' largo' : '') + '"><label for="' + id + '">' + esc(c.rotulo) + (c.obrigatorio ? ' *' : '') + '</label>' + entrada + '</div>';
          }).join('');
          return '<fieldset class="linha-editor" data-i="' + i + '"><legend>' + esc(sec.item) + ' ' + (i + 1) + '</legend><div class="grade-campos">' + campos + '</div>' +
            '<div class="acoes">' +
              '<button type="button" class="btn-icone" data-mover="-1" aria-label="Subir" title="Subir"' + (i === 0 ? ' disabled' : '') + '>' + ic('setaCima') + '</button>' +
              '<button type="button" class="btn-icone" data-mover="1" aria-label="Descer" title="Descer"' + (i === itens.length - 1 ? ' disabled' : '') + '>' + ic('setaBaixo') + '</button>' +
              '<button type="button" class="btn-icone perigo" data-remover="1" aria-label="Remover" title="Remover">' + ic('lixo') + '</button>' +
            '</div></fieldset>';
        }).join('') : '<p class="vazio">Nenhum item. Clique em "Adicionar" para criar o primeiro.</p>';
      }

      var corpo = document.createElement('div');
      desenharLinhas();
      corpo.addEventListener('click', function (e) {
        var fs = e.target.closest('.linha-editor');
        if (!fs) return;
        var i = Number(fs.getAttribute('data-i'));
        var mover = e.target.closest('[data-mover]');
        var remover = e.target.closest('[data-remover]');
        if (!mover && !remover) return;
        ler();
        if (remover) itens.splice(i, 1);
        else {
          var j = i + Number(mover.getAttribute('data-mover'));
          if (j < 0 || j >= itens.length) return;
          var tmp = itens[i]; itens[i] = itens[j]; itens[j] = tmp;
        }
        desenharLinhas();
      });

      abrirModal({
        titulo: 'Editar: ' + sec.titulo, largo: true, corpo: corpo,
        botoes: [
          { rotulo: 'Adicionar ' + sec.item.toLowerCase(), esquerda: true, aoClicar: function () { ler(); itens.push({}); desenharLinhas(); var ultimos = $$('.linha-editor', corpo); if (ultimos.length) ultimos[ultimos.length - 1].scrollIntoView({ block: 'nearest' }); } },
          { rotulo: 'Cancelar', aoClicar: fecharModal },
          {
            rotulo: 'Salvar', classe: 'principal-btn',
            aoClicar: async function (bt) {
              ler();
              var limpos = itens.filter(function (it) {
                return sec.colunas.some(function (c) { return it[c.nome] != null && String(it[c.nome]).trim() !== ''; });
              });
              if (!limpos.length) { aviso('Deixe pelo menos um item na lista.', 'erro'); return; }
              for (var k = 0; k < limpos.length; k++) {
                for (var m = 0; m < sec.colunas.length; m++) {
                  var c = sec.colunas[m];
                  if (c.obrigatorio && (limpos[k][c.nome] == null || String(limpos[k][c.nome]).trim() === '')) {
                    aviso('Preencha "' + c.rotulo + '" no ' + sec.item.toLowerCase() + ' ' + (k + 1) + '.', 'erro');
                    return;
                  }
                  if (c.tipo === 'number' && limpos[k][c.nome] != null && Number.isNaN(limpos[k][c.nome])) {
                    aviso('O valor do ' + sec.item.toLowerCase() + ' ' + (k + 1) + ' precisa ser um número.', 'erro');
                    return;
                  }
                }
              }
              bt.disabled = true;
              var r = await guardar(sec.chave, limpos);
              bt.disabled = false;
              if (!r.ok) { aviso(r.erro, 'erro'); return; }
              fecharModal();
              depoisDeSalvar();
            }
          }
        ]
      });
    }

    function abrirEditor(chave) {
      var sec = SECOES.filter(function (s) { return s.chave === chave; })[0];
      if (!sec) return;
      if (sec.tipo === 'objeto') editarObjeto(sec);
      else if (sec.tipo === 'linhas') editarLinhas(sec);
      else editarLista(sec);
    }

    function desenhar() {
      var intro = '<p style="color:var(--muted);margin:0 0 1rem;max-width:44rem">Aqui você troca os vídeos, os textos e os números do portfólio. Depois de salvar, é só recarregar o site para ver.</p>' +
        '<div id="videosSite">' + htmlVideosSite() + '</div>';
      if (problemas.site_conteudo) {
        secaoAtual.innerHTML = intro + '<div class="cartao"><div class="cartao-cab"><h2>Falta um passo para liberar os textos do site</h2></div><div class="cartao-corpo">' +
          '<p>Para editar os textos e números do site pelo painel, o banco precisa de mais uma tabela. É rápido:</p>' +
          '<ol class="passos"><li>Abra o Supabase e clique em <strong>SQL Editor</strong>, depois em <strong>New query</strong>.</li>' +
          '<li>Cole o conteúdo do arquivo <strong>banco-2.sql</strong> (está na pasta do seu portfólio) e clique em <strong>Run</strong>.</li>' +
          '<li>Volte aqui e recarregue a página.</li></ol></div></div>';
        return;
      }
      secaoAtual.innerHTML = intro +
        '<div class="cards-conteudo">' + SECOES.map(function (sec) {
          var v = conteudo[sec.chave];
          var linhas = v == null ? [] : sec.resumo(v);
          var previa = linhas.length
            ? '<ul class="previa">' + linhas.slice(0, 4).map(function (l) { return '<li>' + esc(cortar(l, 120)) + '</li>'; }).join('') + (linhas.length > 4 ? '<li class="mais">e mais ' + (linhas.length - 4) + '</li>' : '') + '</ul>'
            : '<p class="vazio" style="padding:.5rem 0;text-align:left">Ainda sem conteúdo salvo. O site mostra o texto original.</p>';
          return '<div class="cartao"><div class="cartao-cab"><h2>' + esc(sec.titulo) + '</h2>' +
            '<button type="button" class="btn pequeno" data-editar="' + sec.chave + '">' + ic('lapis') + 'Editar</button></div>' +
            '<div class="cartao-corpo"><p style="color:var(--muted);font-size:.84rem;margin-bottom:.6rem">' + esc(sec.descricao) + '</p>' + previa + '</div></div>';
        }).join('') + '</div>';
    }

    Abas.conteudo = {
      titulo: 'Conteúdo do site',
      tabelas: TABELAS,
      abrir: async function (secao) {
        secaoAtual = secao;
        if (!secao.innerHTML.trim()) secao.innerHTML = '<p class="carregando">Carregando...</p>';
        var carregados = await Promise.all([listar('site_conteudo', true), listar('videos', true)]);
        conteudo = {};
        carregados[0].forEach(function (l) { conteudo[l.chave] = l.valor; });
        if (!secao.getAttribute('data-ligada')) {
          secao.setAttribute('data-ligada', '1');
          secao.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-editar]');
            if (b) { abrirEditor(b.getAttribute('data-editar')); return; }
            var v = e.target.closest('button[data-vacao]');
            if (v && !v.disabled) acaoVideo(v);
          });
        }
        desenhar();
      }
    };
  })();

  /* =========================================================
     ABA: VER O SITE (prévia do portfólio dentro do painel)
     ========================================================= */
  (function () {
    Abas.site = {
      titulo: 'Ver o site',
      tabelas: [],
      abrir: async function (secao) {
        if (secao.getAttribute('data-pronta')) return;        /* já está carregado: só volta a mostrar */
        secao.setAttribute('data-pronta', '1');
        secao.innerHTML =
          '<div class="cal-cab">' +
            '<div class="segmentos" id="siteTamanho" role="group" aria-label="Tamanho da tela">' +
              '<button type="button" data-largura="100%" aria-pressed="true">Computador</button>' +
              '<button type="button" data-largura="820px" aria-pressed="false">Tablet</button>' +
              '<button type="button" data-largura="390px" aria-pressed="false">Celular</button></div>' +
            '<span style="flex:1"></span>' +
            '<button type="button" class="btn" id="siteRecarregar">Recarregar</button>' +
            '<a class="btn" href="../" target="_blank" rel="noopener">Abrir em outra aba ' + ic('externo') + '</a>' +
          '</div>' +
          '<div class="moldura-site" id="siteMoldura"><iframe id="siteFrame" title="Prévia do portfólio publicado" src="../"></iframe></div>' +
          '<p style="color:var(--muted);font-size:.8rem;margin-top:.6rem">Esta é a versão publicada do seu portfólio, do jeito que os visitantes veem. As suas visitas aqui dentro não entram na contagem.</p>';
        $('#siteTamanho', secao).addEventListener('click', function (e) {
          var b = e.target.closest('button[data-largura]');
          if (!b) return;
          $$('#siteTamanho button', secao).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          $('#siteMoldura', secao).style.maxWidth = b.getAttribute('data-largura');
        });
        $('#siteRecarregar', secao).addEventListener('click', function () {
          var f = $('#siteFrame', secao);
          f.src = '../?atualizar=' + Date.now();
        });
      }
    };
  })();

})();

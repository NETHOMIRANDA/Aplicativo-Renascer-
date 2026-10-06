/* =========================================================
   store.js - dados do aplicativo (localStorage)
   ========================================================= */
var Store = (function () {
  "use strict";

  var KEY = "renascer.dados.v1";
  var ALERT_KEY = "renascer.alertas.v1";
  var cache = null;
  var ouvintes = [];
  var versao = 0;

  var CONFIG_PADRAO = {
    senhaAdmin: "A103114",
    whatsapp: "5562982240434",
    pixChave: "5562982240434",
    pixNome: "RENASCER LOCACOES",
    pixCidade: "GOIANIA",
    nomeLoja: "RENASCRE LOCACOES & EVENTOS",
    msgBoasVindas: "Monte seu evento em poucos toques. Envie o pedido e aguarde nossa homologação.",
    msgAprovado: "PEDIDO AUTORIZADO E RESERVADO!",
    msgRecusado: "Infelizmente não foi possível autorizar este pedido.",
    avisoPagamento: "Assim que o pagamento for identificado sua reserva fica confirmada.",
    fretePadrao: 0,
    freteGratisAcima: 0,
    freteCidades: "",
    freteCepOrigem: "74353400",
    freteCepDestino: "74353400",
    freteKmValor: 0,
    freteCepTabela: "",
    nuvemUrl: "",
    nuvemAuto: true
  };

  function padrao() {
    var itens = (typeof CATALOGO_SEED !== "undefined" ? CATALOGO_SEED : []).map(function (it) {
      return {
        id: it.id,
        categoria: it.categoria,
        nome: it.nome,
        unidade: it.unidade,
        preco: it.preco,
        estoque: it.estoque,
        foto: it.foto || "",
        ativo: it.ativo !== false
      };
    });
    return {
      v: 1,
      criadoEm: new Date().toISOString(),
      itens: itens,
      pedidos: [],
      fotos: (typeof FOTOS_SEED !== "undefined" ? FOTOS_SEED.fotos.slice() : []),
      config: JSON.parse(JSON.stringify(CONFIG_PADRAO)),
      configAtualizadoEm: new Date().toISOString(),
      tombas: { pedidos: {}, itens: {} },
      proximoNumero: 1
    };
  }

  function ler() {
    if (cache) return cache;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var obj = JSON.parse(raw);
        if (obj && obj.itens) {
          cache = obj;
          if (!cache.config) cache.config = JSON.parse(JSON.stringify(CONFIG_PADRAO));
          if (!cache.fotos) cache.fotos = [];
          if (!cache.pedidos) cache.pedidos = [];
          if (!cache.tombas) cache.tombas = { pedidos: {}, itens: {} };
          if (!cache.tombas.pedidos) cache.tombas.pedidos = {};
          if (!cache.tombas.itens) cache.tombas.itens = {};
          if (!cache.configAtualizadoEm) {
            cache.configAtualizadoEm = cache.criadoEm || new Date().toISOString();
          }
          return cache;
        }
      }
    } catch (e) { /* dados corrompidos: recria */ }
    cache = gravarInterno(padrao());
    return cache;
  }

  function gravarInterno(obj) {
    try {
      localStorage.setItem(KEY, JSON.stringify(obj));
    } catch (e) {
      if (typeof console !== "undefined") console.warn("Sem espaco no armazenamento:", e);
    }
    return obj;
  }

  function salvar() {
    cache = gravarInterno(cache || ler());
    versao++;
    avisar();
  }

  function avisar() {
    for (var i = 0; i < ouvintes.length; i++) {
      try { ouvintes[i](); } catch (e) {}
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", function (e) {
      if (e.key === KEY) {
        cache = null;
        ler();
        avisar();
      }
    });
  }

  /* ---------- ITENS ---------- */
  function itens() { return ler().itens.slice(); }

  function item(id) {
    var l = ler().itens;
    for (var i = 0; i < l.length; i++) if (String(l[i].id) === String(id)) return l[i];
    return null;
  }

  function salvarItem(novo) {
    var d = ler();
    var existe = null;
    for (var i = 0; i < d.itens.length; i++) {
      if (String(d.itens[i].id) === String(novo.id)) { existe = i; break; }
    }
    if (existe === null) novo.id = proximoIdItens(d);
    novo.atualizadoEm = new Date().toISOString();
    var alvo = existe === null ? null : d.itens[existe];
    if (alvo) d.itens[existe] = novo;
    else d.itens.push(novo);
    if (d.tombas && d.tombas.itens) delete d.tombas.itens[String(novo.id)];
    salvar();
    return novo;
  }

  function proximoIdItens(d) {
    var maior = 0;
    for (var i = 0; i < d.itens.length; i++) maior = Math.max(maior, Number(d.itens[i].id) || 0);
    return maior + 1;
  }

  function excluirItem(id) {
    var d = ler();
    d.itens = d.itens.filter(function (i) { return String(i.id) !== String(id); });
    if (!d.tombas) d.tombas = { pedidos: {}, itens: {} };
    d.tombas.itens[String(id)] = new Date().toISOString();
    salvar();
  }

  function restaurarCatalogo() {
    var d = ler();
    var pad = padrao();
    var agora = new Date().toISOString();
    d.itens = pad.itens.map(function (it) { it.atualizadoEm = agora; return it; });
    if (d.tombas && d.tombas.itens) d.tombas.itens = {};
    salvar();
  }

  /* ---------- PEDIDOS ---------- */
  function pedidos() {
    return ler().pedidos.slice().sort(function (a, b) {
      return (b.criadoEm || "").localeCompare(a.criadoEm || "");
    });
  }

  function pedido(id) {
    var l = ler().pedidos;
    for (var i = 0; i < l.length; i++) if (String(l[i].id) === String(id)) return l[i];
    return null;
  }

  function novoPedido(dados) {
    var d = ler();
    var agora = new Date().toISOString();
    var p = {
      id: "P" + Date.now() + Math.floor(Math.random() * 900 + 100),
      numero: d.proximoNumero || 1,
      criadoEm: agora,
      atualizadoEm: agora,
      cliente: dados.cliente || {},
      dataEvento: dados.dataEvento || "",
      itens: dados.itens || [],
      itensTotal: Number(dados.itensTotal != null ? dados.itensTotal : dados.total) || 0,
      frete: Number(dados.frete) || 0,
      total: Number(dados.total) || 0,
      status: "aguardando",
      motivoRecusa: "",
      aprovadoEm: null,
      recusadoEm: null,
      pagoEnviadoEm: null,
      pagoConfirmadoEm: null,
      concluidoEm: null,
      entrega: { forma: "Retirada no local", data: "", obs: "" },
      observacaoAdmin: ""
    };
    d.proximoNumero = (d.proximoNumero || 1) + 1;
    d.pedidos.push(p);
    salvar();
    return p;
  }

  function atualizarPedido(id, patch) {
    var p = pedido(id);
    if (!p) return null;
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) p[k] = patch[k];
    }
    p.atualizadoEm = new Date().toISOString();
    salvar();
    return p;
  }

  function excluirPedido(id) {
    var d = ler();
    d.pedidos = d.pedidos.filter(function (p) { return p.id !== id; });
    if (!d.tombas) d.tombas = { pedidos: {}, itens: {} };
    d.tombas.pedidos[id] = new Date().toISOString();
    salvar();
  }

  /* ---------- ALERTAS DO CLIENTE ---------- */
  function alertas() {
    try { return JSON.parse(localStorage.getItem(ALERT_KEY)) || {}; } catch (e) { return {}; }
  }

  function statusAlertado(id) {
    var a = alertas();
    return a[id] || "";
  }

  function marcarAlertado(id, status) {
    var a = alertas();
    a[id] = status;
    try { localStorage.setItem(ALERT_KEY, JSON.stringify(a)); } catch (e) {}
  }

  /* ---------- CONFIG ---------- */
  function config() {
    var c = ler().config;
    var out = {};
    for (var k in CONFIG_PADRAO) out[k] = CONFIG_PADRAO[k];
    for (var k2 in c) out[k2] = c[k2];
    return out;
  }

  function salvarConfig(patch) {
    var d = ler();
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) d.config[k] = patch[k];
    }
    d.configAtualizadoEm = new Date().toISOString();
    salvar();
  }

  /* ---------- FOTOS ---------- */
  function fotos() { return ler().fotos.slice(); }

  function addFoto(nome) {
    var d = ler();
    if (d.fotos.indexOf(nome) === -1) {
      d.fotos.push(nome);
      salvar();
    }
  }

  function removerFoto(nome) {
    var d = ler();
    d.fotos = d.fotos.filter(function (f) { return f !== nome; });
    d.itens.forEach(function (i) {
      if (i.foto === nome || i.foto === "img/" + nome) i.foto = "";
    });
    salvar();
  }

  /* ---------- SINCRONIZAÇÃO (nuvem) ---------- */
  function estadoSync() {
    var d = ler();
    return {
      geradoEm: new Date().toISOString(),
      itens: d.itens,
      pedidos: d.pedidos,
      config: d.config,
      configAtualizadoEm: d.configAtualizadoEm || d.criadoEm || "",
      tombas: d.tombas || { pedidos: {}, itens: {} }
    };
  }

  function aplicarRemoto(estado) {
    if (!estado || typeof estado !== "object") return false;
    var d = ler();
    var mudou = false;
    var tom = d.tombas || { pedidos: {}, itens: {} };
    d.tombas = tom;

    /* 1) mescla as exclusões (túmbas): a mais nova vence */
    ["pedidos", "itens"].forEach(function (grupo) {
      var rem = (estado.tombas && estado.tombas[grupo]) || {};
      for (var id in rem) {
        var ts = String(rem[id] || "");
        if (!ts) continue;
        if (!tom[grupo][id] || String(tom[grupo][id]) < ts) { tom[grupo][id] = ts; mudou = true; }
      }
    });

    /* 2) mescla entidades: vale a data "atualizadoEm" mais nova */
    function mesclar(grupo, listaRemota) {
      if (!Array.isArray(listaRemota)) return;
      listaRemota.forEach(function (rem) {
        if (!rem || rem.id === undefined || rem.id === null) return;
        var id = String(rem.id);
        var tsRem = String(rem.atualizadoEm || "");
        var tsTom = String(tom[grupo][id] || "");
        var idx = -1;
        for (var i = 0; i < d[grupo].length; i++) {
          if (String(d[grupo][i].id) === id) { idx = i; break; }
        }
        if (tsTom && tsTom >= tsRem) {
          if (idx !== -1) { d[grupo].splice(idx, 1); mudou = true; }
          return;
        }
        if (idx === -1) { d[grupo].push(rem); mudou = true; return; }
        if (tsRem > String(d[grupo][idx].atualizadoEm || "")) { d[grupo][idx] = rem; mudou = true; }
      });
    }
    mesclar("pedidos", estado.pedidos);
    mesclar("itens", estado.itens);

    /* 3) aplica exclusões vindas de outro aparelho */
    ["pedidos", "itens"].forEach(function (grupo) {
      for (var id in tom[grupo]) {
        var ts = String(tom[grupo][id] || "");
        if (!ts) continue;
        for (var i = d[grupo].length - 1; i >= 0; i--) {
          if (String(d[grupo][i].id) !== id) continue;
          if (String(d[grupo][i].atualizadoEm || "") < ts) { d[grupo].splice(i, 1); mudou = true; }
        }
      }
    });

    /* 4) configurações (nome, frete, PIX, senha...) */
    if (estado.config && estado.configAtualizadoEm) {
      if (String(estado.configAtualizadoEm) > String(d.configAtualizadoEm || "")) {
        d.config = estado.config;
        d.configAtualizadoEm = String(estado.configAtualizadoEm);
        if (!d.config.senhaAdmin) d.config.senhaAdmin = CONFIG_PADRAO.senhaAdmin;
        mudou = true;
      }
    }

    if (mudou) { cache = d; gravarInterno(d); avisar(); }
    return mudou;
  }

  /* ---------- BACKUP ---------- */
  function exportar() {
    return JSON.stringify(ler(), null, 2);
  }

  function importar(texto) {
    var obj = JSON.parse(texto);
    if (!obj || !obj.itens) throw new Error("Arquivo invalido");
    cache = gravarInterno(obj);
    versao++;
    avisar();
  }

  function limparTudo() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(ALERT_KEY);
    } catch (e) {}
    cache = null;
    ler();
    versao++;
    avisar();
  }

  function usoBytes() {
    try {
      var raw = localStorage.getItem(KEY) || "";
      return raw.length;
    } catch (e) { return 0; }
  }

  return {
    itens: itens,
    item: item,
    salvarItem: salvarItem,
    excluirItem: excluirItem,
    restaurarCatalogo: restaurarCatalogo,
    pedidos: pedidos,
    pedido: pedido,
    novoPedido: novoPedido,
    atualizarPedido: atualizarPedido,
    excluirPedido: excluirPedido,
    statusAlertado: statusAlertado,
    marcarAlertado: marcarAlertado,
    config: config,
    salvarConfig: salvarConfig,
    fotos: fotos,
    addFoto: addFoto,
    removerFoto: removerFoto,
    exportar: exportar,
    importar: importar,
    limparTudo: limparTudo,
    usoBytes: usoBytes,
    estadoSync: estadoSync,
    aplicarRemoto: aplicarRemoto,
    versaoLocal: function () { return versao; },
    onChange: function (cb) { ouvintes.push(cb); }
  };
})();

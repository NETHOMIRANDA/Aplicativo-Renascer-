/* =========================================================
   sync.js - sincronização opcional com a nuvem
   (Google Planilha + Apps Script) — pedidos/itens/config
   entre celular e computador.
   ========================================================= */
var Nuvem = (function () {
  "use strict";

  var INTERVALO = 30000;
  var url = "";
  var ativa = false;
  var automatica = true;
  var timer = null;
  var timerEmpurrar = null;
  var versaoEmpurrada = -1;
  var ocupado = false;
  var ultimoOk = 0;
  var ultimoErro = "";
  var ultimoAcao = "";
  var ouvintes = [];

  function avisar() {
    for (var i = 0; i < ouvintes.length; i++) {
      try { ouvintes[i](status()); } catch (e) {}
    }
  }

  function status() {
    return {
      ativa: ativa,
      url: url,
      automatica: automatica,
      ocupado: ocupado,
      ultimoOk: ultimoOk,
      ultimoErro: ultimoErro,
      ultimoAcao: ultimoAcao
    };
  }

  /* Aceita a URL do editor, do /exec ou do /dev e normaliza. */
  function normalizar(u) {
    var s = String(u || "").trim().replace(/\s+/g, "");
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    s = s.replace(/\/+$/, "");
    if (/\/edit$/i.test(s)) s = s.replace(/\/edit$/i, "/exec");
    if (/\/macros\/d\//i.test(s)) s = s.replace(/\/macros\/d\//i, "/macros/s/");
    if (!/\/(exec|dev)$/i.test(s)) s = s.replace(/\/[^\/]*$/, "/exec").replace(/\/macros$/, "/macros/exec");
    return s;
  }

  function lerConfig() {
    var c = Store.config();
    url = normalizar(c.nuvemUrl);
    ativa = /^https?:\/\/(script\.google|script\.googleusercontent|localhost|127\.0\.0\.1)/i.test(url);
    automatica = c.nuvemAuto !== false && c.nuvemAuto !== "false";
    return ativa;
  }

  function simplificarItem(i) {
    if (i && i.foto && /^data:/i.test(String(i.foto))) {
      var c = {};
      for (var k in i) if (Object.prototype.hasOwnProperty.call(i, k)) c[k] = i[k];
      c.foto = ""; /* foto enviada pelo painel fica só neste aparelho */
      return c;
    }
    return i;
  }

  function prepararEstado() {
    var e = Store.estadoSync();
    e.itens = (e.itens || []).map(simplificarItem);
    return e;
  }

  function tratarResposta(j) {
    if (j && j.erro) throw new Error(String(j.erro));
    if (!j || !j.estado) throw new Error("Resposta inválida do servidor.");
    Store.aplicarRemoto(j.estado);
    ultimoOk = Date.now();
    ultimoErro = "";
    avisar();
  }

  function falha(e) {
    ultimoErro = String((e && e.message) || e);
    avisar();
  }

  /* ---------- ações ---------- */
  function puxar(cb) {
    if (!lerConfig()) { if (cb) cb(false, "Sem endereço de nuvem configurado."); return; }
    if (ocupado) { if (cb) cb(false, "Já existe uma sincronização em andamento."); return; }
    ocupado = true;
    ultimoAcao = "puxando";
    avisar();
    var alvo = url + (url.indexOf("?") > -1 ? "&" : "?") + "acao=estado&t=" + Date.now();
    fetch(alvo, { cache: "no-store", redirect: "follow" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        ocupado = false;
        ultimoAcao = "puxado";
        tratarResposta(j);
        if (cb) cb(true);
      })
      .catch(function (e) {
        ocupado = false;
        ultimoAcao = "erro";
        falha(e);
        if (cb) cb(false, ultimoErro);
      });
  }

  function empurrar(cb) {
    if (!lerConfig()) { if (cb) cb(false, "Sem endereço de nuvem configurado."); return; }
    if (ocupado) { if (cb) cb(false, "Já existe uma sincronização em andamento."); return; }
    ocupado = true;
    versaoEmpurrada = Store.versaoLocal();
    ultimoAcao = "enviando";
    avisar();
    fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ acao: "salvar", estado: prepararEstado() })
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        ocupado = false;
        ultimoAcao = "enviado";
        tratarResposta(j);
        if (cb) cb(true);
      })
      .catch(function (e) {
        ocupado = false;
        ultimoAcao = "erro";
        falha(e);
        if (cb) cb(false, ultimoErro);
      });
  }

  function sincronizarAgora(cb) {
    if (!lerConfig()) { if (cb) cb(false, "Sem endereço de nuvem configurado."); return; }
    puxar(function (ok, erro) {
      if (!ok) { if (cb) cb(false, erro); return; }
      empurrar(function (ok2, erro2) { if (cb) cb(ok2, erro2); });
    });
  }

  function testar(cb) {
    if (!lerConfig()) { if (cb) cb(false, "Endereço vazio ou inválido."); return; }
    puxar(function (ok, erro) {
      if (cb) cb(ok, ok ? "Conectado! Dados encontrados na planilha." : erro);
    });
  }

  /* ---------- automático ---------- */
  var ouvinteLigado = false;

  function agendarEmpurrar() {
    clearTimeout(timerEmpurrar);
    timerEmpurrar = setTimeout(function () {
      if (!ativa || !automatica) return;
      if (Store.versaoLocal() === versaoEmpurrada) return;
      /* puxa antes de enviar: assim nada feito no outro aparelho se perde */
      sincronizarAgora();
    }, 1500);
  }

  function iniciar() {
    if (!lerConfig()) { parar(); ativa = false; avisar(); return; }
    if (!timer) puxar();
    if (!timer) timer = setInterval(function () { if (ativa && automatica) puxar(); }, INTERVALO);
    if (!ouvinteLigado) {
      ouvinteLigado = true;
      Store.onChange(function () {
        if (!ativa || !automatica) return;
        if (Store.versaoLocal() !== versaoEmpurrada) agendarEmpurrar();
      });
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden && ativa && automatica) puxar();
      });
      window.addEventListener("online", function () { if (ativa) puxar(); });
    }
    avisar();
  }

  function parar() {
    if (timer) { clearInterval(timer); timer = null; }
    clearTimeout(timerEmpurrar);
  }

  return {
    iniciar: iniciar,
    parar: parar,
    puxar: puxar,
    empurrar: empurrar,
    sincronizarAgora: sincronizarAgora,
    testar: testar,
    status: status,
    recarregar: function () { return lerConfig(); },
    onChange: function (cb) { ouvintes.push(cb); }
  };
})();

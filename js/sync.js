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
  /* o painel do administrador pode alterar itens e ajustes; o app do cliente só envia pedidos */
  var ehAdmin = /\/admin(\.html)?\/?$/i.test(String((typeof location !== "undefined" && location.pathname) || ""));
  var tentativasOcupado = 0;

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
    if (!ehAdmin) {
      /* app do cliente: envia somente os pedidos feitos neste aparelho */
      return {
        geradoEm: e.geradoEm,
        itens: [],
        pedidos: e.pedidos,
        config: {},
        configAtualizadoEm: "",
        tombas: { pedidos: {}, itens: {} }
      };
    }
    e.itens = (e.itens || []).map(simplificarItem);
    return e;
  }

  /* credenciais enviadas à ponte: o administrador envia a senha; o cliente, os ids dos próprios pedidos */
  var SENHA_NUVEM_KEY = "renascer.senhaNuvem.v1";

  function senhaAntiga() {
    try { return localStorage.getItem(SENHA_NUVEM_KEY) || ""; } catch (e) { return ""; }
  }

  function credenciais() {
    return {
      senha: ehAdmin ? String(Store.config().senhaAdmin || "") : "",
      /* última senha que a ponte já aceitou: permite trocar a senha sem perder o acesso */
      senhaAntiga: ehAdmin ? senhaAntiga() : "",
      ids: ehAdmin ? [] : Store.meusIds()
    };
  }

  function tratarResposta(j, aposSalvar) {
    if (j && j.erro) throw new Error(String(j.erro));
    if (!j || !j.estado) throw new Error("Resposta inválida do servidor.");
    /* só depois de GRAVAR com sucesso é que a ponte já conhece a senha atual */
    if (ehAdmin && j.admin && aposSalvar) {
      try { localStorage.setItem(SENHA_NUVEM_KEY, String(Store.config().senhaAdmin || "")); } catch (e) {}
    }
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
    var cred = credenciais();
    fetch(url, {
      method: "POST",
      cache: "no-store",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ acao: "estado", senha: cred.senha, senhaAntiga: cred.senhaAntiga, ids: cred.ids })
    })
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
      body: JSON.stringify({ acao: "salvar", senha: credenciais().senha, senhaAntiga: credenciais().senhaAntiga, ids: credenciais().ids, estado: prepararEstado() })
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        ocupado = false;
        ultimoAcao = "enviado";
        tratarResposta(j, true);
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
    if (ocupado) {
      /* já há uma sincronização em curso: tenta de novo em instantes (não perde o envio) */
      if (tentativasOcupado < 8) {
        tentativasOcupado++;
        setTimeout(function () { sincronizarAgora(cb); }, 1500);
      } else {
        tentativasOcupado = 0;
        if (cb) cb(false, "A sincronização anterior ainda não terminou.");
      }
      return;
    }
    tentativasOcupado = 0;
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

  /* confere a senha do administrador na própria ponte (aparelho novo / senha trocada) */
  function verificarSenha(senha, cb) {
    if (!lerConfig()) { cb(false); return; }
    fetch(url, {
      method: "POST",
      cache: "no-store",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ acao: "verificar", senha: String(senha || "") })
    })
      .then(function (r) { return r.json(); })
      .then(function (j) { cb(!!(j && j.ok)); })
      .catch(function () { cb(false); });
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
    if (!timer) timer = setInterval(function () {
      if (!ativa || !automatica) return;
      /* se há algo local ainda não enviado (ex.: pedido feito sem sinal), reenvia; senão só atualiza */
      if (Store.versaoLocal() !== versaoEmpurrada) sincronizarAgora(); else puxar();
    }, INTERVALO);
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
    verificarSenha: verificarSenha,
    status: status,
    recarregar: function () { return lerConfig(); },
    onChange: function (cb) { ouvintes.push(cb); }
  };
})();

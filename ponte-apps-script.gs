/* =========================================================
   PONTE DO APLICATIVO (Google Apps Script)
   Cole este código no Apps Script da planilha (veja SINCRONIZAR_NUVEM.txt).

   - Cliente (app no celular): envia o próprio pedido e recebe só os pedidos dele.
   - Administrador (senha do painel): vê e altera tudo.
   - Tudo é gravado na coluna A da aba "estado" com bloqueio,
     então dois pedidos feitos ao mesmo tempo não se sobrescrevem.
   ========================================================= */
var ABA = "estado";
var SENHA_PADRAO = "A103114";

function doGet(e) {
  var p = (e && e.parameter) || {};
  return json(responder({ senha: p.senha, ids: p.ids }, lerEstado()));
}

function doPost(e) {
  var dados;
  try { dados = JSON.parse(e.postData.contents); }
  catch (err) { return json({ erro: "Requisição inválida." }); }

  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var estado = lerEstado();

    if (dados.acao === "verificar") {
      return json({ ok: senhaOk(estado, dados.senha) });
    }

    /* aceita a senha atual ou a anterior (quando o administrador acabou de trocá-la) */
    var admin = senhaOk(estado, dados.senha) || senhaOk(estado, dados.senhaAntiga);
    if (dados.acao === "salvar" && dados.estado) {
      estado = mesclar(estado, dados.estado, admin);
      gravarEstado(estado);
    }
    return json(responder(dados, estado, admin));
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- acesso ---------- */
function senhaOk(estado, senha) {
  var real = (estado.config && estado.config.senhaAdmin) || SENHA_PADRAO;
  return !!senha && String(senha) === String(real);
}

/* O administrador recebe tudo. O cliente recebe o catálogo, os ajustes públicos
   (sem a senha) e SOMENTE os pedidos cujos ids ele informou (os dele). */
function responder(req, estado, admin) {
  if (admin === undefined) admin = senhaOk(estado, req.senha);
  if (admin) return { estado: estado, admin: true };

  var ids = {};
  var lista = Array.isArray(req.ids) ? req.ids : String(req.ids || "").split(",");
  lista.forEach(function (i) { i = String(i).trim(); if (i) ids[i] = true; });

  var cfg = {};
  var c = estado.config || {};
  for (var k in c) { if (k !== "senhaAdmin") cfg[k] = c[k]; }

  return {
    admin: false,
    estado: {
      geradoEm: estado.geradoEm || "",
      itens: estado.itens || [],
      config: cfg,
      configAtualizadoEm: estado.configAtualizadoEm || "",
      pedidos: (estado.pedidos || []).filter(function (p) { return ids[String(p.id)]; }),
      tombas: { pedidos: {}, itens: (estado.tombas && estado.tombas.itens) || {} }
    }
  };
}

/* ---------- mescla ---------- */
function mesclar(estado, inc, admin) {
  estado.pedidos = estado.pedidos || [];
  estado.itens = estado.itens || [];
  estado.tombas = estado.tombas || {};
  estado.tombas.pedidos = estado.tombas.pedidos || {};
  estado.tombas.itens = estado.tombas.itens || {};

  if (admin) {
    mesclarTombas(estado.tombas.pedidos, inc.tombas && inc.tombas.pedidos);
    mesclarTombas(estado.tombas.itens, inc.tombas && inc.tombas.itens);
  }

  /* pedidos: o cliente só pode criar/editar o próprio pedido (ainda aguardando) ou marcar "pago enviado" */
  mesclarLista(estado.pedidos, inc.pedidos, estado.tombas.pedidos, admin ? null : aceitarDoCliente);

  if (admin) {
    purgarExcluidos(estado.pedidos, estado.tombas.pedidos);
    mesclarLista(estado.itens, inc.itens, estado.tombas.itens, null);
    purgarExcluidos(estado.itens, estado.tombas.itens);
    if (inc.config && String(inc.configAtualizadoEm || "") > String(estado.configAtualizadoEm || "")) {
      estado.config = inc.config;
      estado.configAtualizadoEm = inc.configAtualizadoEm;
    }
  }

  estado.geradoEm = new Date().toISOString();
  return estado;
}

function purgarExcluidos(lista, tombas) {
  for (var i = lista.length - 1; i >= 0; i--) {
    var ts = String(tombas[String(lista[i].id)] || "");
    if (ts && ts >= String(lista[i].atualizadoEm || "")) lista.splice(i, 1);
  }
}

function mesclarTombas(dest, src) {
  src = src || {};
  for (var id in src) {
    if (!dest[id] || String(dest[id]) < String(src[id])) dest[id] = src[id];
  }
}

function mesclarLista(dest, lista, tombas, filtro) {
  (lista || []).forEach(function (rem) {
    if (!rem || rem.id === undefined || rem.id === null) return;
    var id = String(rem.id);
    var tsRem = String(rem.atualizadoEm || "");
    var tsTom = String(tombas[id] || "");
    var idx = -1;
    for (var i = 0; i < dest.length; i++) {
      if (String(dest[i].id) === id) { idx = i; break; }
    }
    if (tsTom && tsTom >= tsRem) {
      if (idx !== -1) dest.splice(idx, 1);
      return;
    }
    if (idx === -1) {
      if (!filtro || filtro(null, rem)) dest.push(rem);
      return;
    }
    if (tsRem > String(dest[idx].atualizadoEm || "")) {
      if (!filtro || filtro(dest[idx], rem)) dest[idx] = rem;
    }
  });
}

function aceitarDoCliente(atual, novo) {
  if (!atual) return novo.status === "aguardando";                      /* pedido novo */
  if (atual.status === "aguardando") return novo.status === "aguardando"; /* edição antes da homologação */
  if (atual.status === "aprovado") return novo.status === "pago_enviado"; /* "já efetuei o pagamento" */
  return false;
}

/* ---------- armazenamento: uma única célula com o JSON completo ---------- */
function planilha() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ab = ss.getSheetByName(ABA);
  if (!ab) ab = ss.insertSheet(ABA);
  return ab;
}

/* Uma célula do Google Planilhas aceita até 50.000 caracteres: por isso o JSON
   é dividido em pedaços de 40.000 caracteres, um por linha da coluna A. */
var TAMANHO_PEDACO = 40000;

function lerEstado() {
  var ab = planilha();
  var ultima = ab.getLastRow();
  if (ultima < 1) return {};
  var valores = ab.getRange(1, 1, ultima, 1).getValues();
  var texto = valores.map(function (l) { return String(l[0] || ""); }).join("");
  if (!texto) return {};
  try { return JSON.parse(texto); } catch (err) { return {}; }
}

function gravarEstado(estado) {
  var ab = planilha();
  var texto = JSON.stringify(estado);
  var pedacos = [];
  for (var i = 0; i < texto.length; i += TAMANHO_PEDACO) pedacos.push([texto.substr(i, TAMANHO_PEDACO)]);
  if (!pedacos.length) pedacos.push([""]);
  var antes = ab.getLastRow();
  ab.getRange(1, 1, pedacos.length, 1).setValues(pedacos);
  if (antes > pedacos.length) ab.getRange(pedacos.length + 1, 1, antes - pedacos.length, 1).clearContent();
}

/* =========================================================
   app.js - aplicativo do cliente
   ========================================================= */
(function () {
  "use strict";

  var CARRINHO_KEY = "renascer.carrinho.v1";
  var EXT_KEY = "renascer.carrinho.ext.v1";
  var carrinho = lerCarrinho();
  var extCarrinho = lerExt();
  var selFoto = extCarrinho.selFoto || {};
  var obsItem = extCarrinho.obsItem || {};
  var filtroCategoria = "Todas";
  var textoBusca = "";

  /* ---------------- utilitarios ---------------- */
  function $(id) { return document.getElementById(id); }

  function moeda(v) {
    return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function dataBR(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return iso; }
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function lerCarrinho() {
    try { return JSON.parse(localStorage.getItem(CARRINHO_KEY)) || {}; } catch (e) { return {}; }
  }

  function gravarCarrinho() {
    try { localStorage.setItem(CARRINHO_KEY, JSON.stringify(carrinho)); } catch (e) {}
  }

  function lerExt() {
    try { return JSON.parse(localStorage.getItem(EXT_KEY)) || {}; } catch (e) { return {}; }
  }
  function gravarExt() {
    try { localStorage.setItem(EXT_KEY, JSON.stringify({ selFoto: selFoto, obsItem: obsItem })); } catch (e) {}
  }

  function fotoUrl(f) {
    if (!f) return "";
    if (/^data:/.test(f) || /^https?:/i.test(f)) return f;
    if (f.indexOf("img/") === 0 || f.indexOf("./") === 0) return f;
    return "img/" + f;
  }

  function imgPlaceholder() {
    return "data:image/svg+xml;utf8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">' +
      '<rect width="300" height="200" fill="#1E3A8A"/>' +
      '<text x="150" y="110" font-size="44" text-anchor="middle" fill="#7DD3FC" font-family="Arial">RENASCRE</text></svg>'
    );
  }

  /* ---------------- som e vibracao ---------------- */
  var audioCtx = null;
  function ctxAudio() {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    } catch (e) { return null; }
  }

  function nota(ctx, freq, inicio, dur, volume) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
    g.gain.exponentialRampToValueAtTime(volume || 0.25, ctx.currentTime + inicio + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(ctx.currentTime + inicio);
    osc.stop(ctx.currentTime + inicio + dur + 0.05);
  }

  function tocarAprovado() {
    var ctx = ctxAudio();
    if (ctx) {
      nota(ctx, 523.25, 0.00, 0.22);
      nota(ctx, 659.25, 0.14, 0.22);
      nota(ctx, 783.99, 0.28, 0.22);
      nota(ctx, 1046.50, 0.42, 0.45);
    }
    vibrar([150, 80, 150, 80, 250]);
  }

  function tocarNeutro() {
    var ctx = ctxAudio();
    if (ctx) {
      nota(ctx, 440, 0.0, 0.16, 0.18);
      nota(ctx, 587.33, 0.16, 0.24, 0.18);
    }
    vibrar([120]);
  }

  function tocarTriste() {
    var ctx = ctxAudio();
    if (ctx) {
      nota(ctx, 392, 0.0, 0.22, 0.16);
      nota(ctx, 311.13, 0.20, 0.35, 0.16);
    }
    vibrar([80, 100, 80]);
  }

  var permitiuTocar = false;

  function vibrar(p) {
    if (!permitiuTocar) return;
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {}
  }

  document.addEventListener("pointerdown", function () {
    permitiuTocar = true;
    ctxAudio();
  }, { once: true });

  /* ---------------- categorias / catalogo ---------------- */
  function categorias() {
    var vistos = {}, lista = [];
    Store.itens().forEach(function (i) {
      if (i.ativo === false) return;
      if (!vistos[i.categoria]) { vistos[i.categoria] = 1; lista.push(i.categoria); }
    });
    return lista.sort();
  }

  function renderChips() {
    var el = $("chips");
    var cats = ["Todas"].concat(categorias());
    el.innerHTML = cats.map(function (c) {
      return '<button class="chip' + (c === filtroCategoria ? " ativo" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>";
    }).join("");
    Array.prototype.forEach.call(el.querySelectorAll(".chip"), function (b) {
      b.addEventListener("click", function () {
        filtroCategoria = b.getAttribute("data-cat");
        renderChips();
        renderItens();
      });
    });
  }

  function itensVisiveis() {
    return Store.itens().filter(function (i) {
      if (i.ativo === false) return false;
      if (filtroCategoria !== "Todas" && i.categoria !== filtroCategoria) return false;
      if (textoBusca) {
        var alvo = (i.nome + " " + i.categoria).toLowerCase();
        if (alvo.indexOf(textoBusca) === -1) return false;
      }
      return true;
    });
  }

  function renderItens() {
    var el = $("listaItens");
    var lista = itensVisiveis();
    $("listaVazia").hidden = lista.length > 0;

    el.innerHTML = lista.map(function (i) {
      var qtd = carrinho[i.id] || 0;
      var foto = fotoUrl(i.foto) || imgPlaceholder();
      var estoqueNum = Number(i.estoque) || 0;
      var temNoCarrinho = qtd > 0;
      var extras = (i.fotos && i.fotos.length > 1) ? i.fotos.slice() : [];
      var fotoEsc = selFoto[i.id] || "";
      var fotoPrincipal = (fotoEsc ? fotoUrl(fotoEsc) : foto) || imgPlaceholder();
      var atual = fotoEsc || i.foto || "";
      return '' +
        '<article class="card' + (temNoCarrinho ? ' card-no-carrinho' : '') + '" data-id="' + i.id + '">' +
          '<div class="card-foto">' +
            '<img class="foto-principal" data-id="' + i.id + '" src="' + esc(fotoPrincipal) + '" alt="' + esc(i.nome) + '" loading="lazy" onerror="this.src=\'' + imgPlaceholder() + '\'">' +
            (temNoCarrinho ? '<span class="card-qtd-badge">' + qtd + ' no carrinho</span>' : '') +
            (extras.length ? '<div class="mini-fotos">' + extras.map(function (f) {
              var sel = String(fotoUrl(f)) === String(fotoUrl(atual));
              return '<img class="mini' + (sel ? " sel" : "") + '" data-id="' + i.id + '" data-foto="' + esc(f) + '" src="' + esc(fotoUrl(f)) + '" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
            }).join("") + "</div>" : "") +
          "</div>" +
          '<div class="card-corpo">' +
            '<span class="cat">' + esc(i.categoria) + "</span>" +
            "<h3>" + esc(i.nome) + "</h3>" +
            '<div class="preco"><strong>' + moeda(i.preco) + "</strong> / " + esc(i.unidade || "unidade") + "</div>" +
            '<div class="estoque">' +
              (estoqueNum > 0
                ? '<span class="dot-estoque"></span> ' + (estoqueNum <= 5 ? 'Últimas ' + estoqueNum + ' un' : 'Estoque: ' + estoqueNum)
                : '<span class="dot-esgotado"></span> Esgotado') +
            '</div>' +
            (extras.length ? '<input class="obs-item" data-obs="' + i.id + '" placeholder="Obs.: escolha a cor / modelo" value="' + esc(obsItem[i.id] || "") + '" autocomplete="off">' : "") +
            '<div class="controle">' +
              '<button class="menos" data-act="menos" aria-label="Diminuir"' + (qtd === 0 ? ' disabled' : '') + '>−</button>' +
              '<span class="qtd">' + qtd + "</span>" +
              '<button class="mais" data-act="mais" aria-label="Aumentar"' + (estoqueNum <= qtd ? ' disabled' : '') + '>+</button>' +
            "</div>" +
          "</div>" +
        "</article>";
    }).join("");

    Array.prototype.forEach.call(el.querySelectorAll(".card"), function (card) {
      var id = card.getAttribute("data-id");
      card.addEventListener("click", function (ev) {
        var btn = ev.target.closest ? ev.target.closest("[data-act]") : null;
        if (!btn) return;
        alterarQtd(id, btn.getAttribute("data-act") === "mais" ? 1 : -1);
      });
    });
    // miniaturas: cliente escolhe a foto (variante) do item
    Array.prototype.forEach.call(el.querySelectorAll(".mini-fotos img.mini"), function (m) {
      m.addEventListener("click", function (ev) {
        if (ev.stopPropagation) ev.stopPropagation();
        var id = m.getAttribute("data-id");
        var f = m.getAttribute("data-foto");
        selFoto[id] = f;
        gravarExt();
        var principal = el.querySelector('.foto-principal[data-id="' + id + '"]');
        if (principal) principal.src = fotoUrl(f);
        Array.prototype.forEach.call(el.querySelectorAll('.mini-fotos img.mini[data-id="' + id + '"]'), function (x) { x.classList.remove("sel"); });
        m.classList.add("sel");
        vibrar([15]);
      });
    });
    // observação do item (visível no card e no pedido)
    Array.prototype.forEach.call(el.querySelectorAll(".obs-item"), function (inp) {
      inp.addEventListener("input", function () {
        obsItem[inp.getAttribute("data-obs")] = inp.value;
        gravarExt();
      });
    });
  }

  function alterarQtd(id, delta) {
    var item = Store.item(id);
    if (!item) return;
    var atual = carrinho[id] || 0;
    var novo = atual + delta;
    var estoque = Number(item.estoque) || 0;
    if (novo < 0) novo = 0;
    if (novo > estoque) { toast("Estoque disponível: " + estoque); novo = estoque; }
    if (novo === 0) delete carrinho[id];
    else carrinho[id] = novo;
    gravarCarrinho();
    renderItens();
    atualizarBarra();
    vibrar([25]);
  }

  function totalCarrinho() {
    var total = 0, qtd = 0;
    for (var id in carrinho) {
      var it = Store.item(id);
      if (!it) continue;
      total += (Number(it.preco) || 0) * carrinho[id];
      qtd += carrinho[id];
    }
    return { total: total, qtd: qtd };
  }

  function atualizarBarra() {
    var t = totalCarrinho();
    $("badgeCarrinho").textContent = t.qtd;
    $("barraCarrinho").hidden = t.qtd === 0;
    $("barraResumo").textContent = t.qtd + (t.qtd === 1 ? " item • " : " itens • ") + moeda(t.total);
  }

  /* ---------------- carrinho ---------------- */
  function renderCarrinho() {
    var corpo = $("corpoCarrinho");
    var ids = Object.keys(carrinho);
    if (!ids.length) {
      corpo.innerHTML = '<p class="suave">Carrinho vazio. Escolha os itens do catálogo.</p>';
      $("totalCarrinho").textContent = moeda(0);
      return;
    }
    corpo.innerHTML = ids.map(function (id) {
      var it = Store.item(id);
      if (!it) return "";
      var sub = (Number(it.preco) || 0) * carrinho[id];
      return '' +
        '<div class="linha-carrinho" data-id="' + id + '">' +
          "<div><strong>" + esc(it.nome) + "</strong>" +
          ((obsItem[id] || "").trim() ? "<br><span class='suave'>📝 " + esc(obsItem[id].trim()) + "</span>" : "") +
          "<br><span class='suave'>" + moeda(it.preco) + " / " + esc(it.unidade || "un") + "</span></div>" +
          '<div class="controle">' +
            '<button class="menos" data-act="menos">−</button>' +
            '<span class="qtd">' + carrinho[id] + "</span>" +
            '<button class="mais" data-act="mais">+</button>' +
          "</div>" +
          "<div class='sub'>" + moeda(sub) + "</div>" +
        "</div>";
    }).join("");
    Array.prototype.forEach.call(corpo.querySelectorAll(".linha-carrinho"), function (linha) {
      var id = linha.getAttribute("data-id");
      linha.addEventListener("click", function (ev) {
        var btn = ev.target.closest ? ev.target.closest("[data-act]") : null;
        if (!btn) return;
        alterarQtd(id, btn.getAttribute("data-act") === "mais" ? 1 : -1);
        renderCarrinho();
      });
    });
    var t = totalCarrinho();
    $("totalCarrinho").textContent = moeda(t.total);
  }

  /* ---------------- CEP + frete ---------------- */
  var cepInvalido = false;
  var cepAuto = { endereco: false, bairro: false, cidade: false };

  function soDigitos(v) { return String(v || "").replace(/\D/g, ""); }

  function mascaraCep(v) {
    var d = soDigitos(v).slice(0, 8);
    return d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
  }

  function statusCep(txt, erro) {
    var el = $("statusCep");
    if (!el) return;
    el.hidden = !txt;
    el.textContent = txt || "";
    el.style.color = erro ? "#DC2626" : "";
  }

  function cepBate(digitos, de, ate) {
    if (!digitos) return false;
    if (de.length >= 8 && ate.length >= 8) {
      if (digitos.length !== 8) return false;
      var n = Number(digitos);
      return n >= Number(de) && n <= Number(ate);
    }
    if (de !== ate) {
      if (de.length !== ate.length) return false;
      var tam = de.length;
      if (digitos.length < tam) return false;
      var pref = digitos.slice(0, tam);
      return pref >= de && pref <= ate;
    }
    if (digitos.length < de.length) return false;
    return digitos.slice(0, de.length) === de;
  }

  /* ---- distância REAL por rota, da base (CEP 74353-400) até o CEP do cliente ---- */
  var FIXA_APP = (typeof RENASCER_CONFIG !== "undefined" && RENASCER_CONFIG) ? RENASCER_CONFIG : {};
  var BASE_COORD = { lat: Number(FIXA_APP.baseLat) || -16.7457271, lon: Number(FIXA_APP.baseLon) || -49.3239588 };
  var KM_CACHE_KEY = "renascer.kmcache.v2";
  var kmEmCalculo = {};

  function lerKmCache() {
    try { return JSON.parse(localStorage.getItem(KM_CACHE_KEY)) || {}; } catch (e) { return {}; }
  }
  var kmCache = lerKmCache();

  function gravarKmCache() {
    try { localStorage.setItem(KM_CACHE_KEY, JSON.stringify(kmCache)); } catch (e) {}
  }

  function haversineKm(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function consultaNominatim(params) {
    return fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&accept-language=pt-BR&" + params)
      .then(function (r) { return r.json(); })
      .then(function (a) { return a && a[0] ? { lat: parseFloat(a[0].lat), lon: parseFloat(a[0].lon) } : null; })
      .catch(function () { return null; });
  }

  /* Acha as coordenadas do endereço do CEP (rua > bairro > CEP). Sem achar, o frete usa a estimativa por região. */
  function geocodificarEndereco(j, cep) {
    var enc = encodeURIComponent;
    var estado = j.estado || j.uf || "";
    var tentativas = [];
    if (j.logradouro && j.bairro) {
      tentativas.push(function () {
        return consultaNominatim("q=" + enc(j.logradouro + ", " + j.bairro + ", " + j.localidade + ", " + estado));
      });
    }
    if (j.logradouro) {
      tentativas.push(function () {
        return consultaNominatim("street=" + enc(j.logradouro) + "&city=" + enc(j.localidade) + "&state=" + enc(estado));
      });
    }
    if (j.bairro) {
      tentativas.push(function () {
        return consultaNominatim("q=" + enc(j.bairro + ", " + j.localidade + ", " + estado));
      });
    }
    tentativas.push(function () { return consultaNominatim("postalcode=" + enc(mascaraCep(cep))); });
    var i = 0;
    function proxima() {
      if (i >= tentativas.length) return Promise.resolve(null);
      return tentativas[i++]().then(function (r) { return r || proxima(); });
    }
    return proxima();
  }

  function distanciaPorRota(dest) {
    var url = "https://router.project-osrm.org/route/v1/driving/" +
      BASE_COORD.lon + "," + BASE_COORD.lat + ";" + dest.lon + "," + dest.lat + "?overview=false";
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        return j && j.code === "Ok" && j.routes && j.routes[0] ? j.routes[0].distance / 1000 : null;
      })
      .catch(function () { return null; });
  }

  function calcularKmDoCep(cep, j) {
    if (kmCache[cep] || kmEmCalculo[cep]) return;
    kmEmCalculo[cep] = true;
    atualizarPreviewFrete();
    geocodificarEndereco(j, cep).then(function (coord) {
      if (!coord) return null;
      return distanciaPorRota(coord).then(function (km) {
        if (km != null) return { km: km, fonte: "rota" };
        return { km: haversineKm(BASE_COORD, coord) * 1.3, fonte: "linha" };
      });
    }).then(function (r) {
      delete kmEmCalculo[cep];
      if (r) {
        kmCache[cep] = { km: Math.max(0.1, Math.round(r.km * 10) / 10), fonte: r.fonte };
        gravarKmCache();
      }
      atualizarPreviewFrete();
    }).catch(function () {
      delete kmEmCalculo[cep];
      atualizarPreviewFrete();
    });
  }

  function estimarKmTrajetoria(origemDigitos, destinoDigitos) {
    if (!destinoDigitos || destinoDigitos.length < 5) return null;
    var pref = destinoDigitos.slice(0, 5);
    if (pref === "74353") return 2; // Mesmo bairro da base (Forteville e adjacências)
    var num = parseInt(pref, 10);
    if (num >= 74350 && num <= 74399) return 5;
    if (num >= 74200 && num <= 74349) return 10;
    if (num >= 74000 && num <= 74199) return 14;
    if (num >= 74700 && num <= 74899) return 18;
    if (num >= 74400 && num <= 74699) return 22;
    if (num >= 74900 && num <= 74999) return 18;
    if (num >= 75380 && num <= 75399) return 25;
    if (num >= 75250 && num <= 75259) return 32;
    if (num >= 75370 && num <= 75379) return 35;
    if (num >= 75000 && num <= 75199) return 70;
    return null;
  }

  function calcularFrete(itensTotal, cep) {
    var cfg = Store.config();
    var digitos = soDigitos(cep);
    var cepOrigem = mascaraCep(soDigitos(cfg.freteCepOrigem || cfg.freteCepDestino) || "74353400");
    var cepDestino = mascaraCep(digitos);
    var valor = Number(cfg.fretePadrao) || 0;
    var origem = valor > 0 ? "padrao" : "";
    var faixa = "";
    var kmInfo = kmCache[digitos];
    var km = kmInfo ? kmInfo.km : estimarKmTrajetoria("74353400", digitos);
    var kmFonte = kmInfo ? kmInfo.fonte : (km ? "estimado" : "");

    // 1. Tabela por faixa de CEP configurada no painel (prioridade máxima)
    var linhas = String(cfg.freteCepTabela || "").split(/\r?\n/);
    for (var i = 0; i < linhas.length; i++) {
      var linha = linhas[i].trim();
      if (!linha || linha.charAt(0) === "#") continue;
      var m = linha.match(/^(.+?)\s*=\s*([0-9]+(?:[.,][0-9]+)?)\s*$/);
      if (!m) continue;
      var chave = m[1].trim();
      var de, ate;
      if (chave.indexOf("-") !== -1) {
        var p = chave.split("-");
        de = soDigitos(p[0]);
        ate = soDigitos(p[1]);
      } else {
        de = ate = soDigitos(chave);
      }
      if (!de || !ate) continue;
      if (cepBate(digitos, de, ate)) {
        valor = parseFloat(String(m[2]).replace(",", ".")) || 0;
        origem = "tabela";
        faixa = chave;
        break;
      }
    }

    // 2. Se não casou na tabela e há valor por km configurado
    var kmValor = Number(cfg.freteKmValor) || 0;
    if (origem !== "tabela" && kmValor > 0 && km) {
      valor = Math.round(km * kmValor * 100) / 100;
      origem = "km";
    }

    // 3. Frete grátis se atingir valor mínimo
    var gratis = Number(cfg.freteGratisAcima) || 0;
    if (gratis > 0 && itensTotal >= gratis) { valor = 0; origem = "gratis"; faixa = ""; }
    if (isNaN(valor) || valor < 0) valor = 0;

    return {
      valor: valor,
      origem: origem,
      faixa: faixa,
      origemCep: cepOrigem,
      destinoCep: cepDestino,
      distanciaKm: km,
      kmFonte: kmFonte
    };
  }

  function cidadeUfAtual() {
    var partes = String($("fCidade").value || "").trim().split("/");
    return { cidade: (partes[0] || "").trim(), uf: (partes[1] || "").trim() };
  }

  function atualizarCamposFrete(f, calculando) {
    var kmEl = $("fKm"), frEl = $("fFrete");
    if (!kmEl || !frEl) return;
    if (!f) { kmEl.value = ""; frEl.value = ""; return; }
    if (calculando) { kmEl.value = "calculando..."; frEl.value = "calculando..."; return; }
    if (f.distanciaKm) {
      kmEl.value = (f.kmFonte === "estimado" ? "~" : "") + String(f.distanciaKm).replace(".", ",") + " km" +
        (f.kmFonte === "linha" ? " (aprox.)" : "");
    } else {
      kmEl.value = "não calculada";
    }
    if (f.origem === "gratis") frEl.value = "Grátis";
    else if (f.valor > 0) frEl.value = moeda(f.valor);
    else frEl.value = f.distanciaKm ? "A combinar" : "";
  }

  function atualizarPreviewFrete() {
    var el = $("fretePreview");
    if (!el) return;
    var t = totalCarrinho();
    var cepVal = $("fCep").value;
    var digitos = soDigitos(cepVal);

    if (digitos.length < 8) {
      el.hidden = true;
      atualizarCamposFrete(null);
      if ($("resumoDados")) {
        $("resumoDados").textContent = t.qtd + (t.qtd === 1 ? " item • " : " itens • ") + moeda(t.total);
      }
      return;
    }

    var f = calcularFrete(t.total, cepVal);
    atualizarCamposFrete(f, !!kmEmCalculo[digitos]);
    var kmTexto = f.distanciaKm
      ? " (" + (f.kmFonte === "rota" ? "" : "aprox. ") + String(f.distanciaKm).replace(".", ",") + " km)"
      : "";
    var rotaLinha = "Trajetória: saída da base (<strong>" + esc(f.origemCep) + "</strong>) ➔ entrega em seu CEP (<strong>" + esc(f.destinoCep) + "</strong>)" + kmTexto;

    if (f.origem === "gratis") {
      el.innerHTML = "🚚 <strong>Frete Grátis</strong> neste pedido 🎉<br><span class='suave'>" + rotaLinha + "</span>";
      el.hidden = false;
    } else if (f.valor > 0) {
      el.innerHTML = "🚚 " + rotaLinha + "<br>" +
        "Valor do frete: <strong>" + moeda(f.valor) + "</strong>" +
        (f.faixa ? " (faixa <em>" + esc(f.faixa) + "</em>)" : (f.origem === "km" ? " (cálculo por km)" : "")) +
        " • Total com frete: <strong>" + moeda(t.total + f.valor) + "</strong>";
      el.hidden = false;
    } else {
      el.innerHTML = "🚚 " + rotaLinha + "<br><strong>Frete sem custo adicional</strong>";
      el.hidden = false;
    }

    if ($("resumoDados")) {
      $("resumoDados").textContent = t.qtd + (t.qtd === 1 ? " item • " : " itens • ") + moeda(t.total) +
        (f.valor > 0 ? "  + frete " + moeda(f.valor) + "  = total " + moeda(t.total + f.valor) : "");
    }
  }

  function consultarCep() {
    var d = soDigitos($("fCep").value);
    if (d.length !== 8) {
      cepInvalido = false;
      statusCep(d.length ? "Digite os 8 dígitos do CEP." : "");
      return;
    }
    statusCep("Consultando o CEP nos Correios...");
    fetch("https://viacep.com.br/ws/" + d + "/json/", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || j.erro || !j.uf) {
          cepInvalido = true;
          statusCep("CEP não encontrado. Confira o número digitado.", true);
          return;
        }
        cepInvalido = false;
        var achado = (j.logradouro ? j.logradouro + ", " : "") + (j.bairro || "");
        statusCep("Endereço encontrado: " + (achado || j.localidade) + " — " + j.localidade + "/" + j.uf);

        if (j.logradouro && ($("fEndereco").value.trim() === "" || cepAuto.endereco)) {
          $("fEndereco").value = j.logradouro;
          cepAuto.endereco = true;
        }
        if (j.bairro && ($("fBairro").value.trim() === "" || cepAuto.bairro)) {
          $("fBairro").value = j.bairro;
          cepAuto.bairro = true;
        }
        var cid = (j.localidade || "") + (j.uf ? "/" + j.uf : "");
        if (j.localidade && ($("fCidade").value.trim() === "" || cepAuto.cidade)) {
          $("fCidade").value = cid;
          cepAuto.cidade = true;
        }
        calcularKmDoCep(d, j);
        atualizarPreviewFrete();
      })
      .catch(function () {
        statusCep("Sem internet para conferir o CEP — confirme o endereço manualmente.", true);
      });
  }

  /* ---------------- pedidos ---------------- */
  function meusPedidos() {
    /* cada cliente vê somente os pedidos feitos no próprio aparelho */
    var meus = Store.meusIds();
    return Store.pedidos().filter(function (p) { return meus.indexOf(p.id) !== -1; });
  }

  /* edicao de pedido enviado (somente enquanto aguarda homologacao) */
  var editandoId = null;
  var carrinhoAnterior = null;

  function definirModoEdicao(id) {
    editandoId = id || null;
    $("btnFazerPedido").textContent = id ? "✏️ Salvar alterações" : "Fazer pedido";
    $("btnEnviarPedido").textContent = id ? "✅ Salvar alterações do pedido" : "✅ Enviar pedido ao administrador";
  }

  function iniciarEdicao(id) {
    var p = Store.pedido(id);
    if (!p || p.status !== "aguardando") return;
    if (editandoId) cancelarEdicao(true);
    var faltando = 0;
    var novo = {};
    (p.itens || []).forEach(function (i) {
      if (Store.item(i.id)) novo[String(i.id)] = Number(i.qtd) || 0;
      else faltando++;
    });

    carrinhoAnterior = carrinho;
    carrinho = novo;
    gravarCarrinho();

    var cli = p.cliente || {};
    $("fNome").value = cli.nome || "";
    $("fTelefone").value = cli.telefone || "";
    $("fCep").value = cli.cep || "";
    $("fEndereco").value = cli.endereco || "";
    $("fBairro").value = cli.bairro || "";
    $("fCidade").value = [cli.cidade, cli.uf].filter(Boolean).join("/");
    $("fObs").value = cli.obs || "";
    $("fData").value = p.dataEvento || "";
    cepInvalido = false;
    cepAuto = { endereco: false, bairro: false, cidade: false };
    statusCep("");

    definirModoEdicao(id);
    renderItens();
    atualizarBarra();
    renderCarrinho();
    abrir("ovCarrinho");
    atualizarPreviewFrete();
    toast(faltando
      ? "Editando o pedido #" + p.numero + " — " + faltando + " item(ns) saíram do catálogo."
      : "Editando o pedido #" + p.numero + " 📝");
  }

  function cancelarEdicao(silencioso) {
    if (!editandoId) return;
    if (carrinhoAnterior) carrinho = carrinhoAnterior;
    carrinhoAnterior = null;
    definirModoEdicao(null);
    gravarCarrinho();
    limparFormularioDados();
    renderItens();
    atualizarBarra();
    renderStatus();
    if (!silencioso) toast("Edição cancelada.");
  }

  /* repete um pedido concluído: mesmos itens e dados, para mudar a data e o local do evento */
  function repetirPedido(id) {
    var p = Store.pedido(id);
    if (!p) return;
    var novo = {};
    (p.itens || []).forEach(function (i) {
      if (Store.item(i.id)) novo[String(i.id)] = Number(i.qtd) || 0;
    });
    if (!Object.keys(novo).length) {
      toast("Os itens desse pedido saíram do catálogo.");
      return;
    }
    if (editandoId) cancelarEdicao(true);
    carrinho = novo;
    gravarCarrinho();

    var cli = p.cliente || {};
    $("fNome").value = cli.nome || "";
    $("fTelefone").value = cli.telefone || "";
    $("fCep").value = cli.cep || "";
    $("fEndereco").value = cli.endereco || "";
    $("fBairro").value = cli.bairro || "";
    $("fCidade").value = [cli.cidade, cli.uf].filter(Boolean).join("/");
    $("fObs").value = cli.obs || "";
    $("fData").value = ""; /* o cliente define a nova data do evento */
    cepInvalido = false;
    cepAuto = { endereco: false, bairro: false, cidade: false };
    statusCep("");

    definirModoEdicao(null); /* enviar cria um pedido novo (não edita o antigo) */
    renderItens();
    atualizarBarra();
    renderCarrinho();
    abrir("ovDados");
    atualizarPreviewFrete();
    toast("Pedido copiado! Altere a data e o local do evento 📅📍");
    setTimeout(function () { $("fData").focus(); }, 350);
  }

  /* exclui pedido concluído da lista do cliente (o administrador mantém o registro) */
  function excluirPedidoConcluido(id) {
    var p = Store.pedido(id);
    if (!p) return;
    if (!window.confirm("Excluir o pedido #" + p.numero + " (" + dataBR(p.criadoEm) + ") da sua lista?\n\nEle continua no histórico do administrador.")) return;
    Store.excluirPedido(id);   /* remove aqui e marca túmulo (não volta na sincronização) */
    Store.removerMeuPedido(id); /* a ponte para de enviar este pedido */
    renderStatus();
    toast("Pedido #" + p.numero + " excluído 🗑️");
  }

  function aoFecharOverlay(id) {
    if (editandoId && (id === "ovCarrinho" || id === "ovDados")) cancelarEdicao();
  }

  function enviarPedido() {
    var nome = $("fNome").value.trim();
    var tel = $("fTelefone").value.trim();
    if (!nome) { toast("Informe seu nome."); $("fNome").focus(); return; }
    if (!tel) { toast("Informe seu telefone."); $("fTelefone").focus(); return; }

    var cep = soDigitos($("fCep").value);
    if (cep.length !== 8) { toast("Informe o CEP (8 dígitos)."); $("fCep").focus(); return; }
    if (cepInvalido) { toast("CEP não encontrado. Corrija antes de enviar."); $("fCep").focus(); return; }

    var rua = $("fEndereco").value.trim();
    if (!rua) { toast("Informe a rua / endereço."); $("fEndereco").focus(); return; }

    if (kmEmCalculo[cep]) { toast("Calculando o frete... aguarde um instante e envie de novo."); return; }

    var t = totalCarrinho();
    if (t.qtd === 0) { toast("Seu carrinho está vazio."); return; }

    var cu = cidadeUfAtual();
    var frete = calcularFrete(t.total, cep);

    var itens = Object.keys(carrinho).map(function (id) {
      var it = Store.item(id);
      return {
        id: it.id,
        nome: it.nome,
        unidade: it.unidade,
        preco: Number(it.preco) || 0,
        qtd: carrinho[id],
        observacao: (obsItem[id] || "").trim(),
        foto: selFoto[id] || it.foto || ""
      };
    });

    var dados = {
      cliente: {
        nome: nome,
        telefone: tel,
        cep: mascaraCep(cep),
        endereco: rua,
        bairro: $("fBairro").value.trim(),
        cidade: cu.cidade,
        uf: cu.uf,
        obs: $("fObs").value.trim()
      },
      dataEvento: $("fData").value,
      itens: itens,
      itensTotal: t.total,
      frete: frete.valor,
      freteOrigemCep: frete.origemCep,
      freteDestinoCep: mascaraCep(cep),
      freteDistanciaKm: frete.distanciaKm,
      freteKmFonte: frete.kmFonte,
      freteOrigemTipo: frete.origem,
      total: t.total + frete.valor
    };

    var eraEdicao = !!editandoId;
    var numero;
    if (eraEdicao) {
      dados.editadoEm = new Date().toISOString();
      var atual = Store.atualizarPedido(editandoId, dados);
      numero = atual ? atual.numero : "";
    } else {
      numero = Store.novoPedido(dados).numero;
    }

    carrinho = {};
    carrinhoAnterior = null;
    selFoto = {};
    obsItem = {};
    gravarCarrinho();
    gravarExt();
    definirModoEdicao(null);
    fechar("ovDados");
    fechar("ovCarrinho");
    renderItens();
    atualizarBarra();
    renderStatus();

    tocarNeutro();
    toast(eraEdicao
      ? "Pedido #" + numero + " atualizado. Enviando ao administrador..."
      : "Pedido #" + numero + " criado. Enviando ao administrador...");
    enviarParaNuvem(numero, eraEdicao);
    setTimeout(function () {
      var el = $("painelPedido");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
    limparFormularioDados();
  }

  /* Envia o pedido à ponte na hora e confirma (ou avisa) se ele realmente chegou ao administrador */
  function enviarParaNuvem(numero, eraEdicao) {
    var aviso = "⚠️ Pedido #" + numero + " salvo, mas AINDA NÃO chegou ao administrador. " +
      "Toque em “Avisar no WhatsApp” no seu pedido.";
    if (typeof Nuvem === "undefined" || !Nuvem.recarregar()) { toast(aviso); return; }
    Nuvem.sincronizarAgora(function (ok) {
      if (ok) toast("Pedido #" + numero + (eraEdicao ? " atualizado" : " enviado") + " e recebido pelo administrador ✅");
      else toast(aviso + " Vamos tentar de novo automaticamente.");
    });
  }

  function linkZapPedido(p) {
    var cfg = Store.config();
    var cli = p.cliente || {};
    var txt = "Olá! Fiz o pedido #" + p.numero + " no app da RENASCER.\n" +
      "Cliente: " + (cli.nome || "") + "\n" +
      (p.dataEvento ? "Data do evento: " + p.dataEvento + "\n" : "") +
      "Total: " + moeda(p.total) + "\nPode homologar?";
    return "https://wa.me/" + String(cfg.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent(txt);
  }

  function limparFormularioDados() {
    $("fNome").value = "";
    $("fTelefone").value = "";
    $("fCep").value = "";
    $("fEndereco").value = "";
    $("fBairro").value = "";
    $("fCidade").value = "";
    $("fObs").value = "";
    $("fData").value = "";
    cepInvalido = false;
    cepAuto = { endereco: false, bairro: false, cidade: false };
    statusCep("");
    if ($("fretePreview")) $("fretePreview").hidden = true;
    atualizarCamposFrete(null);
    if ($("resumoDados")) $("resumoDados").textContent = "";
  }

  var STATUS_INFO = {
    aguardando: { icone: "🕐", titulo: "Aguardando homologação", texto: "Seu pedido foi enviado ao administrador. Assim que ele for autorizado você receberá um aviso sonoro." },
    aprovado: { icone: "🎉", titulo: "AUTORIZADO E RESERVADO", texto: "Pedido aprovado! Efetue o pagamento PIX para garantir a reserva." },
    recusado: { icone: "😞", titulo: "Pedido não autorizado", texto: "" },
    pago_enviado: { icone: "sendo", titulo: "Pagamento enviado", texto: "Aguardando a conferência do pagamento pelo administrador." },
    pago_confirmado: { icone: "✅", titulo: "Pagamento confirmado", texto: "Sua reserva está garantida! Combine a retirada/entrega pelo WhatsApp." },
    concluido: { icone: "🏁", titulo: "Pedido concluído", texto: "Obrigado pela preferência!" }
  };

  function statusInfo(p) {
    var base = STATUS_INFO[p.status] || STATUS_INFO.aguardando;
    var texto = base.texto;
    if (p.status === "recusado") {
      texto = p.motivoRecusa ? "Motivo: " + p.motivoRecusa : "Fale conosco pelo WhatsApp para verificar outras datas.";
    }
    if (p.status === "pago_enviado") texto = base.texto;
    return { icone: base.icone === "sendo" ? "⏳" : base.icone, titulo: base.titulo, texto: texto };
  }

  function gerarStepper(st) {
    if (st === "recusado") return "";
    var etapas = [
      { rotulo: "Enviado" },
      { rotulo: "Análise" },
      { rotulo: "Aprovado" },
      { rotulo: "Pagamento" },
      { rotulo: "Pronto" }
    ];
    var nivel = 1;
    if (st === "aguardando") nivel = 2;
    else if (st === "aprovado") nivel = 3;
    else if (st === "pago_enviado") nivel = 4;
    else if (st === "pago_confirmado") nivel = 4.5;
    else if (st === "concluido") nivel = 5;

    return '<div class="status-stepper">' +
      etapas.map(function (e, idx) {
        var num = idx + 1;
        var classe = "";
        var icone = num;
        if (num < Math.floor(nivel)) { classe = "completo"; icone = "✓"; }
        else if (num === Math.floor(nivel)) {
          if (nivel === 4.5 && num === 4) { classe = "completo"; icone = "✓"; }
          else { classe = "atual"; }
        }
        return '<div class="step-item ' + classe + '">' +
          '<span class="step-dot">' + icone + '</span>' +
          '<span class="step-rotulo">' + e.rotulo + '</span>' +
        '</div>';
      }).join("") +
    '</div>';
  }

  function renderStatus() {
    var caixa = $("statusPedido");
    var lista = meusPedidos();
    if (!lista.length) {
      caixa.innerHTML = '<p class="suave">Você ainda não enviou nenhum pedido.</p>';
      return;
    }

    caixa.innerHTML = lista.slice(0, 6).map(function (p) {
      var info = statusInfo(p);
      var linhas = "";
      linhas += '<div class="status-topo">' +
        '<span class="status-icone">' + info.icone + "</span>" +
        "<div><strong>Pedido #" + p.numero + "</strong><br>" +
        '<span class="status-titulo">' + esc(info.titulo) + "</span></div>" +
        '<span class="status-hora">' + dataBR(p.criadoEm) + "</span>" +
        "</div>";
      linhas += '<p class="status-texto">' + esc(info.texto) + "</p>";
      linhas += gerarStepper(p.status);

      var itensHtml = (p.itens || []).map(function (i) {
        return "<li>" + i.qtd + "× " + esc(i.nome) + (i.observacao ? ' <span class="suave">(' + esc(i.observacao) + ")</span>" : "") + " <span class='suave'>(" + moeda(i.preco) + ")</span></li>";
      }).join("");
      linhas += "<ul class='resumo-itens'>" + itensHtml + "</ul>";

      var cli = p.cliente || {};
      var ender = [cli.endereco, cli.bairro].filter(Boolean).join(", ");
      var cidUf = [cli.cidade, cli.uf].filter(Boolean).join("/");
      var baseCep = p.freteOrigemCep || "74353-400";
      var cliCep = p.freteDestinoCep || (cli.cep ? "CEP " + cli.cep : "");

      if (cli.cep || ender || cidUf) {
        linhas += "<div class='entrega'>📍 <strong>Trajetória de entrega:</strong> Saída da base (<strong>" + esc(baseCep) + "</strong>) ➔ " + esc(cliCep) +
          (p.freteDistanciaKm ? " (~" + p.freteDistanciaKm + " km)" : "") +
          (ender ? "<br>🏠 " + esc(ender) : "") +
          (cidUf ? " • " + esc(cidUf) : "") +
          "</div>";
      }

      var itensTot = p.itensTotal != null ? Number(p.itensTotal) : Number(p.total) || 0;
      var frete = Number(p.frete) || 0;
      if (frete > 0) {
        linhas += "<div class='total-linha suave'>Itens: " + moeda(itensTot) + "</div>";
        linhas += "<div class='total-linha suave'>Frete (rota " + esc(baseCep) + " ➔ " + esc(cli.cep || "cliente") + "): " + moeda(frete) + "</div>";
      } else if (p.itensTotal != null && frete === 0 && cidUf) {
        linhas += "<div class='total-linha suave'>Entrega: frete não cobrado</div>";
      }
      linhas += "<div class='total-linha'>Total: <strong>" + moeda(p.total) + "</strong></div>";

      if (p.entrega && (p.entrega.data || p.entrega.forma)) {
        linhas += "<div class='entrega'>📦 " + esc(p.entrega.forma || "") +
          (p.entrega.data ? " • " + esc(p.entrega.data) : "") +
          (p.entrega.obs ? "<br><span class='suave'>" + esc(p.entrega.obs) + "</span>" : "") + "</div>";
      }
      if (p.observacaoAdmin) {
        linhas += "<div class='obs-admin'>💬 " + esc(p.observacaoAdmin) + "</div>";
      }

      if (p.status === "aguardando") {
        linhas += '<div class="acoes-status">' +
          '<button class="editar-pedido" data-editar="' + p.id + '">✏️ Editar pedido</button>' +
          '<a class="zap" target="_blank" rel="noopener" href="' + linkZapPedido(p) + '">💬 Avisar no WhatsApp</a>' +
          '<span class="suave">Você pode alterar itens, data e endereço até a homologação.</span>' +
          "</div>";
      }
      if (p.status === "concluido") {
        linhas += '<div class="acoes-status">' +
          '<button class="secundario" data-repetir="' + p.id + '">🔁 Fazer igual</button>' +
          '<button class="secundario" data-excluir="' + p.id + '">🗑️ Excluir</button>' +
          '<span class="suave">Repete o pedido mudando a data e o local do evento.</span>' +
          "</div>";
      }
      if (p.editadoEm) {
        linhas += '<div class="editado-em suave">✏️ Editado em ' + esc(dataBR(p.editadoEm)) + "</div>";
      }

      if (p.status === "aprovado" || p.status === "pago_enviado" || p.status === "pago_confirmado" || p.status === "concluido") {
        linhas += blocoPagamento(p);
      }

      return '<div class="status-card status-' + p.status + '">' + linhas + "</div>";
    }).join("");

    ligarAcoesStatus();
    verificarAlertas(lista);
  }

  function blocoPagamento(p) {
    var cfg = Store.config();
    var pago = p.status === "pago_enviado" || p.status === "pago_confirmado" || p.status === "concluido";
    var html = '<div class="pagamento">';
    html += "<h4>💳 Pagamento PIX</h4>";

    if (!pago) {
      html += '<div class="qr-wrap"><canvas class="qr" id="qr-' + p.id + '" width="240" height="240"></canvas></div>';
      html += '<p class="suave">Aponte a câmera do banco para o código acima, ou use o copia e cola:</p>';
      html += '<div class="pix-copia"><code id="pix-' + p.id + '"></code></div>';
      html += '<button class="secundario" data-copiar="' + p.id + '">📋 Copiar código PIX</button>';
      html += '<div class="pix-info">📱 Chave: <strong>' + esc(cfg.pixChave) + "</strong></div>";
      html += '<button class="primario" data-pago="' + p.id + '">✅ Já efetuei o pagamento</button>';
      html += '<a class="zap" target="_blank" rel="noopener" href="https://wa.me/' + esc(cfg.whatsapp) +
        '?text=' + encodeURIComponent("Olá! Acabei de fazer o pedido #" + p.numero + " no app da RENASCER.") + '">Falar no WhatsApp</a>';
    } else if (p.status === "pago_enviado") {
      html += '<div class="pagamento-ok">⏳ Comprovante enviado. Aguardando conferência do administrador.</div>';
    } else {
      html += '<div class="pagamento-ok">✅ Pagamento confirmado — reserva garantida!</div>';
    }
    html += "</div>";
    return html;
  }

  function ligarAcoesStatus() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-editar]"), function (b) {
      b.addEventListener("click", function () { iniciarEdicao(b.getAttribute("data-editar")); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-copiar]"), function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-copiar");
        var el = $("pix-" + id);
        if (!el) return;
        copiar(el.textContent);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-pago]"), function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-pago");
        Store.atualizarPedido(id, { status: "pago_enviado", pagoEnviadoEm: new Date().toISOString() });
        tocarNeutro();
        toast("Pagamento registrado! Aguardando confirmação ✅");
        renderStatus();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-repetir]"), function (b) {
      b.addEventListener("click", function () { repetirPedido(b.getAttribute("data-repetir")); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-excluir]"), function (b) {
      b.addEventListener("click", function () { excluirPedidoConcluido(b.getAttribute("data-excluir")); });
    });
    // desenha os QR codes
    Array.prototype.forEach.call(document.querySelectorAll("canvas.qr"), function (cv) {
      var id = cv.id.replace("qr-", "");
      var p = Store.pedido(id);
      if (!p) return;
      var cfg = Store.config();
      try {
        var payload = PIX.copiaECola({
          chave: cfg.pixChave,
          nome: cfg.pixNome,
          cidade: cfg.pixCidade,
          valor: p.total,
          txid: "PED" + p.numero
        });
        desenharQR(cv, payload);
        var alvo = $("pix-" + id);
        if (alvo) alvo.textContent = payload;
      } catch (e) {
        if (typeof console !== "undefined") console.warn(e);
      }
    });
  }

  function copiar(txt) {
    function ok() { toast("Código PIX copiado 📋"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(ok, function () { fallback(); });
    } else fallback();

    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { toast("Não foi possível copiar automaticamente."); }
      document.body.removeChild(ta);
    }
  }

  function desenharQR(cv, texto) {
    var q;
    try { q = QR.make(texto); } catch (e) { return; }
    var quiet = 4;
    var total = q.size + quiet * 2;
    var px = Math.max(2, Math.floor(240 / total));
    var size = px * total;
    cv.width = size; cv.height = size;
    cv.style.width = "100%";
    cv.style.maxWidth = "260px";
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#000000";
    for (var r = 0; r < q.size; r++) {
      for (var c = 0; c < q.size; c++) {
        if (q.modules[r][c]) {
          ctx.fillRect((c + quiet) * px, (r + quiet) * px, px, px);
        }
      }
    }
  }

  /* ---------------- alertas (som + emoji) ---------------- */
  function verificarAlertas(lista) {
    for (var i = 0; i < lista.length; i++) {
      var p = lista[i];
      if (["aprovado", "recusado", "pago_confirmado"].indexOf(p.status) === -1) continue;
      if (Store.statusAlertado(p.id) === p.status) continue;
      Store.marcarAlertado(p.id, p.status);
      mostrarCelebracao(p);
      return; // apenas o mais recente por renderizacao
    }
  }

  function mostrarCelebracao(p) {
    var info = statusInfo(p);
    var cfg = Store.config();
    var el = $("celebracao");
    var emoji = $("celebraEmoji");
    var titulo = $("celebraTitulo");
    var texto = $("celebraTexto");

    if (p.status === "aprovado") {
      emoji.textContent = "🎉🥳🎊";
      titulo.textContent = cfg.msgAprovado;
      texto.textContent = "Pedido #" + p.numero + " autorizado! Total " + moeda(p.total) + ". Faça o pagamento PIX para garantir.";
      tocarAprovado();
    } else if (p.status === "recusado") {
      emoji.textContent = "😔";
      titulo.textContent = "Pedido não autorizado";
      texto.textContent = p.motivoRecusa || cfg.msgRecusado;
      tocarTriste();
    } else {
      emoji.textContent = "✅🎉";
      titulo.textContent = "Pagamento confirmado!";
      texto.textContent = "Pedido #" + p.numero + " com pagamento confirmado. Reserva garantida!";
      tocarAprovado();
    }

    el.hidden = false;
    confettis(el);
  }

  function confettis(el) {
    var cores = ["#38BDF8", "#FACC15", "#F472B6", "#4ADE80", "#FFFFFF"];
    for (var i = 0; i < 36; i++) {
      (function (i) {
        var s = document.createElement("span");
        s.className = "confete";
        s.style.left = Math.random() * 100 + "%";
        s.style.background = cores[i % cores.length];
        s.style.animationDelay = Math.random() * 0.7 + "s";
        s.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
        el.appendChild(s);
        setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 4000);
      })(i);
    }
  }

  /* ---------------- overlays ---------------- */
  function abrir(id) {
    var el = $(id);
    if (!el) return;
    el.hidden = false;
    document.body.classList.add("sem-rollo");
  }

  function fechar(id) {
    var el = $(id);
    if (!el) return;
    el.hidden = true;
    document.body.classList.remove("sem-rollo");
  }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.hidden = true; }, 250);
    }, 2600);
  }

  /* ---------------- acesso admin discreto ---------------- */
  var toquesLogo = 0;
  var toqueTimer = null;

  function pedirSenhaAdmin() {
    $("fSenhaAdmin").value = "";
    $("erroSenha").hidden = true;
    abrir("ovSenha");
    setTimeout(function () { $("fSenhaAdmin").focus(); }, 120);
  }

  function tentarEntrar() {
    var cfg = Store.config();
    var digitada = $("fSenhaAdmin").value.trim();
    function liberar() {
      try { sessionStorage.setItem("renascer.admin", "1"); } catch (e) {}
      fechar("ovSenha");
      toast("Bem-vindo, administrador!");
      setTimeout(function () { window.location.href = "admin.html"; }, 350);
    }
    function recusar() {
      $("erroSenha").hidden = false;
      vibrar([80, 60, 80]);
    }
    if (digitada === cfg.senhaAdmin) {
      liberar();
    } else if (digitada && typeof Nuvem !== "undefined" && Nuvem.recarregar()) {
      Nuvem.verificarSenha(digitada, function (ok) {
        if (ok) { Store.definirSenhaLocal(digitada); liberar(); } else { recusar(); }
      });
    } else {
      recusar();
    }
  }

  /* ---------------- eventos ---------------- */
  function ligarEventos() {
    $("busca").addEventListener("input", function () {
      textoBusca = this.value.trim().toLowerCase();
      renderItens();
    });

    $("btnCarrinho").addEventListener("click", function () {
      renderCarrinho();
      abrir("ovCarrinho");
    });
    $("btnVerCarrinho").addEventListener("click", function () {
      renderCarrinho();
      abrir("ovCarrinho");
    });

    $("btnFazerPedido").addEventListener("click", function () {
      if (totalCarrinho().qtd === 0) { toast("Carrinho vazio."); return; }
      fechar("ovCarrinho");
      abrir("ovDados");
      atualizarPreviewFrete();
    });

    $("btnEnviarPedido").addEventListener("click", enviarPedido);

    // CEP: máscara + consulta automática nos Correios (ViaCEP)
    var timerCep = null;
    $("fCep").addEventListener("input", function () {
      this.value = mascaraCep(this.value);
      var d = soDigitos(this.value);
      cepInvalido = false;
      clearTimeout(timerCep);
      if (d.length === 8) {
        timerCep = setTimeout(consultarCep, 350);
      } else {
        statusCep(d.length ? "Digite os 8 dígitos do CEP." : "");
      }
      atualizarPreviewFrete();
    });
    $("fCep").addEventListener("blur", function () {
      if (soDigitos(this.value).length === 8) consultarCep();
    });
    $("fCidade").addEventListener("input", function () {
      cepAuto.cidade = false;
      atualizarPreviewFrete();
    });
    $("fEndereco").addEventListener("input", function () { cepAuto.endereco = false; });
    $("fBairro").addEventListener("input", function () { cepAuto.bairro = false; });

    Array.prototype.forEach.call(document.querySelectorAll("[data-fechar]"), function (b) {
      b.addEventListener("click", function () {
        var alvo = b.getAttribute("data-fechar");
        fechar(alvo);
        aoFecharOverlay(alvo);
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".overlay"), function (ov) {
      ov.addEventListener("click", function (e) {
        if (e.target === ov) {
          fechar(ov.id);
          aoFecharOverlay(ov.id);
        }
      });
    });

    // acesso discreto: pontinho no rodape
    $("pontoSecreto").addEventListener("click", pedirSenhaAdmin);

    // acesso discreto: 3 toques no logo
    $("marcaLogo").addEventListener("click", function () {
      toquesLogo++;
      clearTimeout(toqueTimer);
      toqueTimer = setTimeout(function () { toquesLogo = 0; }, 1400);
      if (toquesLogo >= 3) {
        toquesLogo = 0;
        pedirSenhaAdmin();
      }
    });

    $("btnEntrarAdmin").addEventListener("click", tentarEntrar);
    $("fSenhaAdmin").addEventListener("keydown", function (e) {
      if (e.key === "Enter") tentarEntrar();
    });

    $("btnCelebrar").addEventListener("click", function () {
      $("celebracao").hidden = true;
      renderStatus();
    });
  }

  function rodape() {
    var cfg = Store.config();
    $("msgBoasVindas").textContent = cfg.msgBoasVindas;
    var nome = String(cfg.nomeLoja || "").trim() || "RENASCRE LOCACOES & EVENTOS";
    $("marcaNome").textContent = nome;
    if ($("rodapeNome")) $("rodapeNome").textContent = nome;
    document.title = nome;
    var zap = String(cfg.whatsapp).replace(/^55/, "").replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    $("rodapeContato").textContent = "WhatsApp: " + zap;
  }

  function registrarSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  /* ---------------- inicializacao ---------------- */
  function iniciar() {
    rodape();
    renderChips();
    renderItens();
    atualizarBarra();
    renderStatus();
    ligarEventos();
    registrarSW();
    if (typeof Nuvem !== "undefined") Nuvem.iniciar();
    Store.onChange(function () {
      renderChips();
      renderItens();
      renderStatus();
      rodape();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();

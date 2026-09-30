/* =========================================================
   app.js - aplicativo do cliente
   ========================================================= */
(function () {
  "use strict";

  var CARRINHO_KEY = "renascer.carrinho.v1";
  var carrinho = lerCarrinho();
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
      return '' +
        '<article class="card" data-id="' + i.id + '">' +
          '<div class="card-foto">' +
            '<img src="' + esc(foto) + '" alt="' + esc(i.nome) + '" loading="lazy" onerror="this.src=\'' + imgPlaceholder() + '\'">' +
          "</div>" +
          '<div class="card-corpo">' +
            '<span class="cat">' + esc(i.categoria) + "</span>" +
            "<h3>" + esc(i.nome) + "</h3>" +
            '<div class="preco"><strong>' + moeda(i.preco) + "</strong> / " + esc(i.unidade || "unidade") + "</div>" +
            '<div class="estoque">Disponível: ' + (Number(i.estoque) || 0) + "</div>" +
            '<div class="controle">' +
              '<button class="menos" data-act="menos" aria-label="Diminuir">−</button>' +
              '<span class="qtd">' + qtd + "</span>" +
              '<button class="mais" data-act="mais" aria-label="Aumentar">+</button>' +
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
          "<div><strong>" + esc(it.nome) + "</strong><br><span class='suave'>" + moeda(it.preco) + " / " + esc(it.unidade || "un") + "</span></div>" +
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

  /* ---------------- pedidos ---------------- */
  function meusPedidos() {
    return Store.pedidos();
  }

  function enviarPedido() {
    var nome = $("fNome").value.trim();
    var tel = $("fTelefone").value.trim();
    if (!nome) { toast("Informe seu nome."); $("fNome").focus(); return; }
    if (!tel) { toast("Informe seu telefone."); $("fTelefone").focus(); return; }
    var t = totalCarrinho();
    if (t.qtd === 0) { toast("Seu carrinho está vazio."); return; }

    var itens = Object.keys(carrinho).map(function (id) {
      var it = Store.item(id);
      return {
        id: it.id,
        nome: it.nome,
        unidade: it.unidade,
        preco: Number(it.preco) || 0,
        qtd: carrinho[id]
      };
    });

    var pedido = Store.novoPedido({
      cliente: { nome: nome, telefone: tel, endereco: $("fEndereco").value.trim(), obs: $("fObs").value.trim() },
      dataEvento: $("fData").value,
      itens: itens,
      total: t.total
    });

    carrinho = {};
    gravarCarrinho();
    fechar("ovDados");
    fechar("ovCarrinho");
    renderItens();
    atualizarBarra();
    renderStatus();

    tocarNeutro();
    toast("Pedido #" + pedido.numero + " enviado ao administrador ✅");
    setTimeout(function () {
      var el = $("painelPedido");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
    $("fNome").value = ""; $("fTelefone").value = ""; $("fEndereco").value = ""; $("fObs").value = ""; $("fData").value = "";
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

      var itensHtml = (p.itens || []).map(function (i) {
        return "<li>" + i.qtd + "× " + esc(i.nome) + " <span class='suave'>(" + moeda(i.preco) + ")</span></li>";
      }).join("");
      linhas += "<ul class='resumo-itens'>" + itensHtml + "</ul>";
      linhas += "<div class='total-linha'>Total: <strong>" + moeda(p.total) + "</strong></div>";

      if (p.entrega && (p.entrega.data || p.entrega.forma)) {
        linhas += "<div class='entrega'>📦 " + esc(p.entrega.forma || "") +
          (p.entrega.data ? " • " + esc(p.entrega.data) : "") +
          (p.entrega.obs ? "<br><span class='suave'>" + esc(p.entrega.obs) + "</span>" : "") + "</div>";
      }
      if (p.observacaoAdmin) {
        linhas += "<div class='obs-admin'>💬 " + esc(p.observacaoAdmin) + "</div>";
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
    if ($("fSenhaAdmin").value.trim() === cfg.senhaAdmin) {
      try { sessionStorage.setItem("renascer.admin", "1"); } catch (e) {}
      fechar("ovSenha");
      toast("Bem-vindo, administrador!");
      setTimeout(function () { window.location.href = "admin.html"; }, 350);
    } else {
      $("erroSenha").hidden = false;
      vibrar([80, 60, 80]);
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
      $("resumoDados").textContent = totalCarrinho().qtd + " item(ns) • " + moeda(totalCarrinho().total);
      fechar("ovCarrinho");
      abrir("ovDados");
    });

    $("btnEnviarPedido").addEventListener("click", enviarPedido);

    Array.prototype.forEach.call(document.querySelectorAll("[data-fechar]"), function (b) {
      b.addEventListener("click", function () { fechar(b.getAttribute("data-fechar")); });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".overlay"), function (ov) {
      ov.addEventListener("click", function (e) {
        if (e.target === ov) ov.hidden = true;
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

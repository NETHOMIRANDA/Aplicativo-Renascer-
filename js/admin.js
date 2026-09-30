/* =========================================================
   admin.js - painel do administrador
   ========================================================= */
(function () {
  "use strict";

  var abaAtual = "pedidos";
  var filtroPedidos = "pendentes";
  var buscaItensTexto = "";
  var fotoPendenteNovo = "";
  var fotoPendenteEdicao = "";

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function moeda(v) {
    return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function dataBR(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return iso; }
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

  /* ---------------- autenticacao ---------------- */
  function autenticado() {
    try {
      if (sessionStorage.getItem("renascer.admin") === "1") return true;
      if (localStorage.getItem("renascer.admin.manter") === "1") {
        sessionStorage.setItem("renascer.admin", "1");
        return true;
      }
    } catch (e) {}
    return false;
  }

  function entrar(manter) {
    try {
      sessionStorage.setItem("renascer.admin", "1");
      if (manter) localStorage.setItem("renascer.admin.manter", "1");
      else localStorage.removeItem("renascer.admin.manter");
    } catch (e) {}
    mostrarApp();
  }

  function sair() {
    try {
      sessionStorage.removeItem("renascer.admin");
      localStorage.removeItem("renascer.admin.manter");
    } catch (e) {}
    mostrarApp();
  }

  function mostrarApp() {
    var ok = autenticado();
    $("telaLogin").hidden = ok;
    $("appAdmin").hidden = !ok;
    if (ok) renderTudo();
    else setTimeout(function () { $("senhaLogin").focus(); }, 100);
  }

  /* ---------------- modal generico ---------------- */
  function abrirModal(titulo, corpo, botoes) {
    $("modalTitulo").textContent = titulo;
    $("modalCorpo").innerHTML = corpo;
    var pe = $("modalPe");
    pe.innerHTML = "";
    (botoes || []).forEach(function (b) {
      var btn = document.createElement("button");
      btn.className = b.classe || "primario grande";
      btn.textContent = b.texto;
      btn.addEventListener("click", b.acao);
      pe.appendChild(btn);
    });
    $("ovModal").hidden = false;
    document.body.classList.add("sem-rollo");
  }

  function fecharModal() {
    $("ovModal").hidden = true;
    document.body.classList.remove("sem-rollo");
  }

  /* ---------------- imagens ---------------- */
  function fotoUrl(f) {
    if (!f) return "";
    if (/^data:/.test(f) || /^https?:/i.test(f)) return f;
    if (f.indexOf("img/") === 0 || f.indexOf("./") === 0) return f;
    return "img/" + f;
  }

  function redimensionar(file, maxLado, qualidade, cb) {
    var reader = new FileReader();
    reader.onerror = function () { toast("Não foi possível ler a imagem."); };
    reader.onload = function (e) {
      var img = new Image();
      img.onerror = function () { toast("Arquivo de imagem inválido."); };
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w > maxLado || h > maxLado) {
          var escala = Math.min(maxLado / w, maxLado / h);
          w = Math.round(w * escala);
          h = Math.round(h * escala);
        }
        var cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        var ctx = cv.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        cb(cv.toDataURL("image/jpeg", qualidade || 0.65));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------------- PEDIDOS ---------------- */
  var ROTULOS = {
    aguardando: "Aguardando",
    aprovado: "Aprovado",
    recusado: "Recusado",
    pago_enviado: "Pagamento enviado",
    pago_confirmado: "Pagamento confirmado",
    concluido: "Concluído"
  };

  function filtrarPedidos() {
    var l = Store.pedidos();
    if (filtroPedidos === "todos") return l;
    if (filtroPedidos === "pendentes") {
      return l.filter(function (p) { return p.status === "aguardando" || p.status === "pago_enviado"; });
    }
    if (filtroPedidos === "pagos") {
      return l.filter(function (p) { return p.status === "pago_enviado" || p.status === "pago_confirmado" || p.status === "concluido"; });
    }
    return l.filter(function (p) { return p.status === filtroPedidos; });
  }

  function renderPedidos() {
    var lista = filtrarPedidos();
    var pendentes = Store.pedidos().filter(function (p) { return p.status === "aguardando" || p.status === "pago_enviado"; }).length;
    $("contPedidos").textContent = pendentes;
    $("contPedidos").style.display = pendentes ? "" : "none";

    var el = $("listaPedidos");
    if (!lista.length) {
      el.innerHTML = '<div class="bloco"><p class="suave">Nenhum pedido neste filtro. 🎉</p></div>';
      return;
    }

    el.innerHTML = lista.map(function (p) {
      var h = "";
      h += '<div class="pedido-admin st-' + p.status + '" data-id="' + p.id + '">';
      h += '<div class="topo-pedido"><span class="numero">#' + p.numero + "</span>" +
        '<span class="selo ' + p.status + '">' + ROTULOS[p.status] + "</span>" +
        '<span class="hora">' + dataBR(p.criadoEm) + "</span></div>";

      h += '<div class="detalhes"><strong>' + esc(p.cliente.nome) + "</strong> • " + esc(p.cliente.telefone);
      if (p.dataEvento) h += "<br>📅 Evento: " + esc(dataBR(p.dataEvento + "T00:00:00").split(" ")[0]);
      if (p.cliente.endereco) h += "<br>📍 " + esc(p.cliente.endereco);
      h += "<ul>" + (p.itens || []).map(function (i) {
        return "<li>" + i.qtd + "× " + esc(i.nome) + " — " + moeda(i.preco * i.qtd) + "</li>";
      }).join("") + "</ul>";
      h += "<strong>Total: " + moeda(p.total) + "</strong>";
      if (p.cliente.obs) h += "<br>📝 " + esc(p.cliente.obs);
      if (p.entrega && (p.entrega.data || p.entrega.forma)) {
        h += "<br>📦 " + esc(p.entrega.forma || "") + (p.entrega.data ? " • " + esc(p.entrega.data) : "");
        if (p.entrega.obs) h += "<br><span class='suave'>" + esc(p.entrega.obs) + "</span>";
      }
      if (p.observacaoAdmin) h += "<br>💬 " + esc(p.observacaoAdmin);
      if (p.status === "recusado" && p.motivoRecusa) h += "<br>❌ Motivo: " + esc(p.motivoRecusa);
      h += "</div>";

      h += '<div class="acoes">';
      if (p.status === "aguardando") {
        h += '<button class="aprovar" data-act="aprovar">✅ Aprovar</button>';
        h += '<button class="recusar" data-act="recusar">❌ Recusar</button>';
      }
      if (p.status === "aprovado") {
        h += '<button class="pago" data-act="pagar">💰 Confirmar pagamento</button>';
        h += '<button class="remover" data-act="voltar">↩ Voltar para pendente</button>';
      }
      if (p.status === "pago_enviado") {
        h += '<button class="pago" data-act="pagar">💰 Confirmar pagamento</button>';
        h += '<button class="recusar" data-act="recusar">❌ Recusar</button>';
      }
      if (p.status === "pago_confirmado") {
        h += '<button class="concluir" data-act="concluir">🏁 Concluir entrega</button>';
      }
      h += '<a class="zap" target="_blank" rel="noopener" href="' + zapLink(p) + '">📱 WhatsApp</a>';
      h += '<button class="remover" data-act="remover">🗑 Excluir</button>';
      h += "</div></div>";
      return h;
    }).join("");

    Array.prototype.forEach.call(el.querySelectorAll(".pedido-admin"), function (card) {
      var id = card.getAttribute("data-id");
      card.addEventListener("click", function (ev) {
        var b = ev.target.closest ? ev.target.closest("[data-act]") : null;
        if (!b) return;
        acaoPedido(id, b.getAttribute("data-act"));
      });
    });
  }

  function zapLink(p) {
    var cfg = Store.config();
    var txt = "Olá, " + p.cliente.nome + "! Aqui é da RENASCER Locações.%0A" +
      "Seu pedido #" + p.numero + " foi *%STATUS%*." +
      "%0A%0AITENS:%0A" +
      (p.itens || []).map(function (i) { return "- " + i.qtd + "x " + i.nome; }).join("%0A") +
      "%0A%0ATotal: " + moeda(p.total).replace("R$", "R$");
    var status;
    switch (p.status) {
      case "aguardando": status = "recebido e está aguardando homologação"; break;
      case "aprovado": status = "APROVADO e RESERVADO 🎉"; break;
      case "recusado": status = "não autorizado. " + (p.motivoRecusa || ""); break;
      case "pago_enviado": status = "enviado para confirmação de pagamento"; break;
      case "pago_confirmado": status = "PAGO — reserva garantida ✅"; break;
      case "concluido": status = "concluído 🏁"; break;
      default: status = p.status;
    }
    txt = txt.replace("%STATUS%", status);
    if (p.entrega && p.entrega.data) txt += "%0A%0AEntrega/retirada: " + encodeURIComponent(p.entrega.data);
    return "https://wa.me/" + encodeURIComponent(String(Store.config().whatsapp).replace(/\D/g, "")) +
      "?text=" + txt;
  }

  function irParaTodos() {
    filtroPedidos = "todos";
    Array.prototype.forEach.call($("filtrosPedidos").querySelectorAll("button"), function (x) {
      x.classList.toggle("ativo", x.getAttribute("data-f") === "todos");
    });
  }

  function acaoPedido(id, act) {
    var p = Store.pedido(id);
    if (!p) return;

    if (act === "aprovar") {
      abrirModal("Aprovar pedido #" + p.numero,
        '<label class="campo">Forma<select id="mForma">' +
        '<option>Retirada no local</option><option>Entrega</option><option>Retirada + montagem</option></select></label>' +
        '<label class="campo">Data combinada<input type="date" id="mData"></label>' +
        '<label class="campo">Observação para o cliente<input type="text" id="mObs" placeholder="Ex.: chegue às 9h para montagem"></label>' +
        '<p class="suave">O cliente verá a confirmação com emoji e som no aplicativo.</p>',
        [
          { texto: "✅ Confirmar aprovação", acao: function () {
            Store.atualizarPedido(id, {
              status: "aprovado",
              aprovadoEm: new Date().toISOString(),
              entrega: { forma: $("mForma").value, data: $("mData").value, obs: $("mObs").value.trim() },
              observacaoAdmin: $("mObs").value.trim()
            });
            fecharModal();
            irParaTodos();
            renderPedidos();
            toast("Pedido aprovado! O cliente recebe o aviso. 🎉");
          } },
          { texto: "Cancelar", classe: "secundario grande", acao: fecharModal }
        ]);
      return;
    }

    if (act === "recusar") {
      abrirModal("Recusar pedido #" + p.numero,
        '<label class="campo">Motivo (o cliente verá)<textarea id="mMotivo" rows="3" placeholder="Ex.: data indisponível, item sem estoque..."></textarea></label>',
        [
          { texto: "❌ Confirmar recusa", acao: function () {
            var motivo = $("mMotivo").value.trim() || "Não autorizado pelo administrador.";
            Store.atualizarPedido(id, { status: "recusado", motivoRecusa: motivo, recusadoEm: new Date().toISOString() });
            fecharModal();
            irParaTodos();
            renderPedidos();
            toast("Pedido recusado.");
          } },
          { texto: "Cancelar", classe: "secundario grande", acao: fecharModal }
        ]);
      return;
    }

    if (act === "pagar") {
      Store.atualizarPedido(id, { status: "pago_confirmado", pagoConfirmadoEm: new Date().toISOString() });
      irParaTodos();
      renderPedidos();
      toast("Pagamento confirmado ✅");
      return;
    }

    if (act === "concluir") {
      Store.atualizarPedido(id, { status: "concluido", concluidoEm: new Date().toISOString() });
      irParaTodos();
      renderPedidos();
      toast("Pedido concluído 🏁");
      return;
    }

    if (act === "voltar") {
      Store.atualizarPedido(id, { status: "aguardando" });
      irParaTodos();
      renderPedidos();
      toast("Pedido voltou para pendente.");
      return;
    }

    if (act === "remover") {
      abrirModal("Excluir pedido #" + p.numero,
        "<p>Tem certeza que deseja excluir este pedido? Essa ação não pode ser desfeita.</p>",
        [
          { texto: "🗑 Excluir", classe: "primario grande", acao: function () {
            Store.excluirPedido(id);
            fecharModal();
            irParaTodos();
            renderPedidos();
            toast("Pedido excluído.");
          } },
          { texto: "Cancelar", classe: "secundario grande", acao: fecharModal }
        ]);
    }
  }

  /* ---------------- ITENS ---------------- */
  function renderItensAdmin() {
    var el = $("listaItensAdmin");
    var lista = Store.itens().filter(function (i) {
      if (!buscaItensTexto) return true;
      return (i.nome + " " + i.categoria).toLowerCase().indexOf(buscaItensTexto) !== -1;
    });

    var dlc = $("listaCategorias");
    var cats = {};
    Store.itens().forEach(function (i) { cats[i.categoria] = 1; });
    dlc.innerHTML = Object.keys(cats).map(function (c) { return '<option value="' + esc(c) + '">'; }).join("");

    if (!lista.length) {
      el.innerHTML = '<p class="suave">Nenhum item encontrado.</p>';
      return;
    }

    el.innerHTML = lista.map(function (i) {
      var foto = fotoUrl(i.foto);
      return '<div class="item-admin' + (i.ativo === false ? " inativo" : "") + '" data-id="' + i.id + '">' +
        '<img class="mini" src="' + esc(foto || "img/icon-192.png") + '" alt="" onerror="this.src=\'img/icon-192.png\'">' +
        '<div class="info">' +
          "<h4>" + esc(i.nome) + "</h4>" +
          '<div class="meta">' + esc(i.categoria) + " • " + moeda(i.preco) + "/" + esc(i.unidade) +
          " • estoque " + (Number(i.estoque) || 0) + (i.ativo === false ? " • inativo" : "") + "</div>" +
          '<div class="acoes-item">' +
            '<button class="dest" data-act="editar">✏️ Editar</button>' +
            '<button data-act="foto">🖼 Foto</button>' +
            '<button data-act="ativo">' + (i.ativo === false ? "▶ Ativar" : "⏸ Ocultar") + "</button>" +
            '<button class="perigo" data-act="excluir">🗑</button>' +
          "</div>" +
        "</div></div>";
    }).join("");

    Array.prototype.forEach.call(el.querySelectorAll(".item-admin"), function (card) {
      var id = card.getAttribute("data-id");
      card.addEventListener("click", function (ev) {
        var b = ev.target.closest ? ev.target.closest("[data-act]") : null;
        if (!b) return;
        var act = b.getAttribute("data-act");
        if (act === "editar") editarItem(id);
        else if (act === "foto") escolherFotoItem(id);
        else if (act === "ativo") alternarAtivo(id);
        else if (act === "excluir") excluirItem(id);
      });
    });
  }

  function editarItem(id) {
    var i = Store.item(id);
    if (!i) return;
    fotoPendenteEdicao = i.foto || "";
    var galeria = Store.fotos();

    var corpo =
      '<label class="campo">Nome<input type="text" id="eNome" value="' + esc(i.nome) + '"></label>' +
      '<label class="campo">Categoria<input type="text" id="eCat" value="' + esc(i.categoria) + '"></label>' +
      '<div class="grade-campos">' +
        '<label class="campo">Unidade<input type="text" id="eUnid" value="' + esc(i.unidade) + '"></label>' +
        '<label class="campo">Preço<input type="number" id="ePreco" step="0.01" value="' + (Number(i.preco) || 0) + '"></label>' +
        '<label class="campo">Estoque<input type="number" id="eEstq" step="1" value="' + (Number(i.estoque) || 0) + '"></label>' +
        '<label class="campo">Foto<input type="file" id="eFoto" accept="image/*"></label>' +
      "</div>" +
      '<div id="ePreview" style="text-align:center;">' +
        (i.foto ? '<img src="' + esc(fotoUrl(i.foto)) + '" style="max-height:130px;border-radius:12px;" alt="">' : '<p class="suave">Sem foto</p>') +
      "</div>" +
      (galeria.length ? '<label class="campo">Ou escolha uma foto da galeria<select id="eGaleria">' +
        '<option value="">— manter atual —</option>' +
        galeria.map(function (g) { return '<option value="' + esc(g) + '">' + esc(String(g).slice(0, 40)) + "</option>"; }).join("") +
        "</select></label>" : "");

    abrirModal("Editar item", corpo, [
      { texto: "💾 Salvar alterações", acao: function () {
        i.nome = $("eNome").value.trim() || i.nome;
        i.categoria = $("eCat").value.trim() || i.categoria;
        i.unidade = $("eUnid").value.trim() || i.unidade;
        i.preco = parseFloat($("ePreco").value) || 0;
        i.estoque = parseInt($("eEstq").value, 10) || 0;
        if (fotoPendenteEdicao !== undefined && fotoPendenteEdicao !== null && $("ePreview").getAttribute("data-nova") === "1") {
          i.foto = fotoPendenteEdicao;
        }
        var sel = $("eGaleria");
        if (sel && sel.value) i.foto = sel.value;
        Store.salvarItem(i);
        fecharModal();
        renderItensAdmin();
        toast("Item atualizado ✅");
      } },
      { texto: "Cancelar", classe: "secundario grande", acao: fecharModal }
    ]);

    $("eFoto").addEventListener("change", function () {
      if (!this.files || !this.files[0]) return;
      redimensionar(this.files[0], 1000, 0.68, function (dataUrl) {
        fotoPendenteEdicao = dataUrl;
        $("ePreview").setAttribute("data-nova", "1");
        $("ePreview").innerHTML = '<img src="' + dataUrl + '" style="max-height:130px;border-radius:12px;" alt="">';
      });
    });
  }

  function escolherFotoItem(id) {
    var i = Store.item(id);
    if (!i) return;
    var galeria = Store.fotos();
    if (!galeria.length) {
      toast("Nenhuma foto na galeria. Envie em 🖼️ Fotos.");
      return;
    }
    var corpo = '<div class="galeria" id="galeriaEscolha">' + galeria.map(function (g) {
      return '<figure data-f="' + esc(g) + '"><img src="' + esc(fotoUrl(g)) + '" alt=""><figcaption>escolher</figcaption></figure>';
    }).join("") + "</div>";
    abrirModal("Escolher foto • " + i.nome, corpo, [
      { texto: "Remover foto do item", classe: "secundario grande", acao: function () {
        i.foto = "";
        Store.salvarItem(i);
        fecharModal();
        renderItensAdmin();
        toast("Foto removida.");
      } },
      { texto: "Fechar", classe: "secundario grande", acao: fecharModal }
    ]);
    Array.prototype.forEach.call($("galeriaEscolha").querySelectorAll("figure"), function (fig) {
      fig.addEventListener("click", function () {
        i.foto = fig.getAttribute("data-f");
        Store.salvarItem(i);
        fecharModal();
        renderItensAdmin();
        toast("Foto definida ✅");
      });
    });
  }

  function alternarAtivo(id) {
    var i = Store.item(id);
    if (!i) return;
    i.ativo = i.ativo === false;
    Store.salvarItem(i);
    renderItensAdmin();
    toast(i.ativo === false ? "Item oculto do cliente." : "Item visível para o cliente.");
  }

  function excluirItem(id) {
    var i = Store.item(id);
    if (!i) return;
    abrirModal("Excluir item", "<p>Excluir <strong>" + esc(i.nome) + "</strong> do catálogo?</p>", [
      { texto: "🗑 Excluir", classe: "primario grande", acao: function () {
        Store.excluirItem(id);
        fecharModal();
        renderItensAdmin();
        toast("Item excluído.");
      } },
      { texto: "Cancelar", classe: "secundario grande", acao: fecharModal }
    ]);
  }

  function addItem() {
    var nome = $("nNome").value.trim();
    if (!nome) { toast("Informe o nome do item."); $("nNome").focus(); return; }
    var item = {
      categoria: $("nCategoria").value.trim() || "OUTROS",
      nome: nome,
      unidade: $("nUnidade").value.trim() || "Unidade",
      preco: parseFloat($("nPreco").value) || 0,
      estoque: parseInt($("nEstoque").value, 10) || 0,
      foto: fotoPendenteNovo,
      ativo: true
    };
    Store.salvarItem(item);
    $("nNome").value = ""; $("nPreco").value = ""; $("nEstoque").value = "1"; $("nUnidade").value = "";
    $("nFoto").value = "";
    fotoPendenteNovo = "";
    $("nFotoPreview").innerHTML = "";
    renderItensAdmin();
    toast("Item adicionado ✅");
  }

  /* ---------------- FOTOS ---------------- */
  function renderGaleria() {
    var el = $("galeriaFotos");
    var lista = Store.fotos();
    if (!lista.length) {
      el.innerHTML = '<p class="suave">Nenhuma foto enviada.</p>';
      return;
    }
    el.innerHTML = lista.map(function (f) {
      return "<figure>" +
        '<img src="' + esc(fotoUrl(f)) + '" alt="" onerror="this.src=\'img/icon-192.png\'">' +
        '<button class="excluir" data-f="' + esc(f) + '">✕</button>' +
        "<figcaption>" + esc(String(f).slice(0, 26)) + (String(f).indexOf("data:") === 0 ? " (enviada)" : "") + "</figcaption>" +
        "</figure>";
    }).join("");
    Array.prototype.forEach.call(el.querySelectorAll(".excluir"), function (b) {
      b.addEventListener("click", function () {
        Store.removerFoto(b.getAttribute("data-f"));
        renderGaleria();
        renderItensAdmin();
        toast("Foto removida da galeria.");
      });
    });
  }

  /* ---------------- AJUSTES ---------------- */
  function renderAjustes() {
    var c = Store.config();
    $("cNomeLoja").value = c.nomeLoja;
    $("cBoasVindas").value = c.msgBoasVindas;
    $("cWhats").value = c.whatsapp;
    $("cPixChave").value = c.pixChave;
    $("cPixNome").value = c.pixNome;
    $("cPixCidade").value = c.pixCidade;
    $("cSenha").value = c.senhaAdmin;
    $("cMsgAprovado").value = c.msgAprovado;
  }

  function salvarAjustes() {
    Store.salvarConfig({
      nomeLoja: $("cNomeLoja").value.trim() || "RENASCRE LOCACOES & EVENTOS",
      msgBoasVindas: $("cBoasVindas").value.trim(),
      whatsapp: $("cWhats").value.replace(/\D/g, "") || "5562982240434",
      pixChave: $("cPixChave").value.trim() || "5562982240434",
      pixNome: $("cPixNome").value.trim() || "RENASCER LOCACOES",
      pixCidade: $("cPixCidade").value.trim() || "GOIANIA",
      senhaAdmin: $("cSenha").value.trim() || "A103114",
      msgAprovado: $("cMsgAprovado").value.trim() || "PEDIDO AUTORIZADO E RESERVADO!"
    });
    toast("Ajustes salvos ✅");
    atualizarBarraStatus();
  }

  /* ---------------- BACKUP ---------------- */
  function atualizarBarraStatus() {
    var bytes = Store.usoBytes();
    var kb = bytes / 1024;
    var txt = kb < 1024 ? kb.toFixed(1) + " KB" : (kb / 1024).toFixed(2) + " MB";
    var limite = 5 * 1024;
    var pct = Math.min(100, (kb / limite) * 100);
    $("avisoEspaco").innerHTML = "Armazenamento usado: <strong>" + txt + "</strong> de ~5 MB (" + pct.toFixed(0) + "%).<br>" +
      "Fotos grandes ocupam rápido — o app já reduz automaticamente as imagens enviadas.";
    $("barraStatus").textContent = "RENASCRE • " + Store.pedidos().length + " pedido(s) • " +
      Store.itens().length + " item(ns) • " + txt;
  }

  function exportarBackup() {
    var texto = Store.exportar();
    var blob = new Blob([texto], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "backup-renascer-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 500);
    toast("Backup gerado ⬇️");
  }

  function importarBackup(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        Store.importar(e.target.result);
        renderTudo();
        toast("Backup importado ✅");
      } catch (err) {
        toast("Arquivo inválido.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- abas ---------------- */
  function trocarAba(aba) {
    abaAtual = aba;
    Array.prototype.forEach.call($("abas").querySelectorAll(".aba"), function (b) {
      b.classList.toggle("ativo", b.getAttribute("data-aba") === aba);
    });
    $("abaPedidos").hidden = aba !== "pedidos";
    $("abaItens").hidden = aba !== "itens";
    $("abaFotos").hidden = aba !== "fotos";
    $("abaAjustes").hidden = aba !== "ajustes";
    $("abaBackup").hidden = aba !== "backup";
    if (aba === "pedidos") renderPedidos();
    if (aba === "itens") renderItensAdmin();
    if (aba === "fotos") renderGaleria();
    if (aba === "ajustes") renderAjustes();
    if (aba === "backup") atualizarBarraStatus();
  }

  function renderTudo() {
    trocarAba(abaAtual);
    atualizarBarraStatus();
  }

  /* ---------------- eventos ---------------- */
  function ligarEventos() {
    $("btnLogin").addEventListener("click", function () {
      var cfg = Store.config();
      if ($("senhaLogin").value.trim() === cfg.senhaAdmin) {
        entrar($("manterConectado").checked);
        toast("Bem-vindo! 👋");
      } else {
        $("erroLogin").hidden = false;
        $("senhaLogin").value = "";
        $("senhaLogin").focus();
      }
    });
    $("senhaLogin").addEventListener("keydown", function (e) {
      if (e.key === "Enter") $("btnLogin").click();
    });

    $("btnSair").addEventListener("click", sair);

    Array.prototype.forEach.call($("abas").querySelectorAll(".aba"), function (b) {
      b.addEventListener("click", function () { trocarAba(b.getAttribute("data-aba")); });
    });

    Array.prototype.forEach.call($("filtrosPedidos").querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () {
        filtroPedidos = b.getAttribute("data-f");
        Array.prototype.forEach.call($("filtrosPedidos").querySelectorAll("button"), function (x) {
          x.classList.toggle("ativo", x === b);
        });
        renderPedidos();
      });
    });

    $("btnAddItem").addEventListener("click", addItem);
    $("buscaItens").addEventListener("input", function () {
      buscaItensTexto = this.value.trim().toLowerCase();
      renderItensAdmin();
    });
    $("nFoto").addEventListener("change", function () {
      if (!this.files || !this.files[0]) return;
      redimensionar(this.files[0], 1000, 0.68, function (dataUrl) {
        fotoPendenteNovo = dataUrl;
        $("nFotoPreview").innerHTML = '<img src="' + dataUrl + '" style="max-height:130px;border-radius:12px;margin:8px auto;" alt="">';
      });
    });

    $("addFoto").addEventListener("change", function () {
      var arquivos = this.files;
      if (!arquivos || !arquivos.length) return;
      var restantes = arquivos.length;
      Array.prototype.forEach.call(arquivos, function (f) {
        redimensionar(f, 1100, 0.66, function (dataUrl) {
          Store.addFoto(dataUrl);
          restantes--;
          if (restantes === 0) {
            renderGaleria();
            toast(arquivos.length + " foto(s) adicionada(s) ✅");
          }
        });
      });
      this.value = "";
    });

    $("btnSalvarAjustes").addEventListener("click", salvarAjustes);
    $("btnExportar").addEventListener("click", exportarBackup);
    $("btnImportar").addEventListener("click", function () { $("arquivoImport").click(); });
    $("arquivoImport").addEventListener("change", function () {
      if (this.files && this.files[0]) importarBackup(this.files[0]);
      this.value = "";
    });

    $("btnRestaurarCatalogo").addEventListener("click", function () {
      abrirModal("Restaurar catálogo", "<p>Os itens do catálogo voltarão ao padrão original (42 itens). Pedidos e fotos não são afetados.</p>", [
        { texto: "♻️ Restaurar", classe: "primario grande", acao: function () {
          Store.restaurarCatalogo();
          fecharModal();
          renderItensAdmin();
          toast("Catálogo restaurado ♻️");
        } },
        { texto: "Cancelar", classe: "secundario grande", acao: fecharModal }
      ]);
    });

    $("btnLimparTudo").addEventListener("click", function () {
      abrirModal("Apagar TODOS os dados",
        "<p><strong>Isso apaga itens, fotos, pedidos e ajustes deste aparelho.</strong></p><p>Faça um backup antes se quiser manter os dados.</p>",
        [
          { texto: "🗑 Apagar tudo", classe: "primario grande", acao: function () {
            Store.limparTudo();
            fecharModal();
            renderTudo();
            toast("Dados apagados.");
          } },
          { texto: "Cancelar", classe: "secundario grande", acao: fecharModal }
        ]);
    });

    $("btnFecharModal").addEventListener("click", fecharModal);
    $("ovModal").addEventListener("click", function (e) { if (e.target === $("ovModal")) fecharModal(); });

    Store.onChange(function () {
      if (!autenticado()) return;
      renderPedidos();
      if (abaAtual === "itens") renderItensAdmin();
      if (abaAtual === "fotos") renderGaleria();
      atualizarBarraStatus();
    });
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { ligarEventos(); mostrarApp(); });
  } else {
    ligarEventos();
    mostrarApp();
  }
})();

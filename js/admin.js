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
  var periodoEntrega = "semana";
  var selecionadosEntrega = {};

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
    if (filtroPedidos === "concluidos") {
      return l.filter(function (p) { return p.status === "concluido"; });
    }
    return l.filter(function (p) { return p.status === filtroPedidos; });
  }

  function renderPedidos() {
    var lista = filtrarPedidos();
    var pendentes = Store.pedidos().filter(function (p) { return p.status === "aguardando" || p.status === "pago_enviado"; }).length;
    $("contPedidos").textContent = pendentes;
    $("contPedidos").style.display = pendentes ? "" : "none";

    var el = $("listaPedidos");
    var avisoNuvem = "";
    try {
      if (!Nuvem.status().ativa) {
        avisoNuvem = '<div class="bloco aviso-nuvem">📡 <strong>Sincronização desativada.</strong> ' +
          "Pedidos feitos em <strong>outros celulares/navegadores</strong> não aparecem aqui. " +
          "Configure em <em>Ajustes → 🔄 Sincronização</em> (passo a passo no arquivo SINCRONIZAR_NUVEM.txt).</div>";
      }
    } catch (e) {}

    if (!lista.length) {
      el.innerHTML = avisoNuvem + '<div class="bloco"><p class="suave">Nenhum pedido neste filtro. 🎉</p></div>';
      return;
    }

    el.innerHTML = avisoNuvem + lista.map(function (p) {
      var h = "";
      h += '<div class="pedido-admin st-' + p.status + '" data-id="' + p.id + '">';
      h += '<div class="topo-pedido"><span class="numero">#' + p.numero + "</span>" +
        '<span class="selo ' + p.status + '">' + ROTULOS[p.status] + "</span>" +
        '<span class="hora">' + dataBR(p.criadoEm) + "</span></div>";

      h += '<div class="detalhes"><strong>' + esc(p.cliente.nome) + "</strong> • " + esc(p.cliente.telefone);
      if (p.dataEvento) h += "<br>📅 Evento: " + esc(dataBR(p.dataEvento + "T00:00:00").split(" ")[0]);
      var cli = p.cliente || {};
      var partes = [];
      if (cli.endereco) partes.push(cli.endereco);
      if (cli.bairro) partes.push(cli.bairro);
      if (partes.length) h += "<br>📍 " + esc(partes.join(", "));
      var cidadeUf = [cli.cidade, cli.uf].filter(Boolean).join(" / ");
      if (cli.cep || cidadeUf) h += "<br>CEP " + esc(cli.cep || "—") + (cidadeUf ? " • " + esc(cidadeUf) : "");
      h += "<ul>" + (p.itens || []).map(function (i) {
        return "<li>" + i.qtd + "× " + esc(i.nome) + (i.observacao ? ' <span class="suave">(' + esc(i.observacao) + ")</span>" : "") + " — " + moeda(i.preco * i.qtd) + "</li>";
      }).join("") + "</ul>";
      var itensTotal = p.itensTotal != null ? Number(p.itensTotal) : Number(p.total) || 0;
      if (p.frete != null && Number(p.frete) > 0) {
        var rotaInfo = " (rota: 74353-400 ➔ " + (cli.cep ? "CEP " + cli.cep : "cliente") + (p.freteDistanciaKm ? " • ~" + p.freteDistanciaKm + "km" : "") + ")";
        h += "<span class='suave'>Itens " + moeda(itensTotal) + " + Frete " + moeda(Number(p.frete)) + rotaInfo + "</span><br>";
      }
      h += "<strong>Total: " + moeda(p.total) + "</strong>";
      if (p.cliente.obs) h += "<br>📝 " + esc(p.cliente.obs);
      if (p.entrega && (p.entrega.data || p.entrega.forma)) {
        h += "<br>📦 " + esc(p.entrega.forma || "") + (p.entrega.data ? " • " + esc(p.entrega.data) : "");
        if (p.entrega.obs) h += "<br><span class='suave'>" + esc(p.entrega.obs) + "</span>";
      }
      if (p.observacaoAdmin) h += "<br>💬 " + esc(p.observacaoAdmin);
      if (p.status === "concluido" && p.concluidoEm) h += "<br>🏁 Entregue/efetivado em " + esc(dataBR(p.concluidoEm));
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
    var cli = p.cliente || {};
    var endereco = [];
    if (cli.cep) endereco.push("CEP " + cli.cep);
    if (cli.endereco) endereco.push(cli.endereco);
    if (cli.bairro) endereco.push(cli.bairro);
    var cidade = [cli.cidade, cli.uf].filter(Boolean).join("/");
    if (cidade) endereco.push(cidade);

    var itensTotal = p.itensTotal != null ? Number(p.itensTotal) : Number(p.total) || 0;
    var txt = "Olá, " + (cli.nome || "") + "! Aqui é da " + (cfg.nomeLoja || "RENASCER") + ".\n" +
      "Seu pedido #" + p.numero + " foi *%STATUS%*." +
      "\n\nITENS:\n" +
      (p.itens || []).map(function (i) { return "- " + i.qtd + "x " + i.nome + (i.observacao ? " (" + i.observacao + ")" : ""); }).join("\n");
    if (Number(p.frete) > 0) txt += "\n\nSubtotal dos itens: " + moeda(itensTotal) +
      "\nFrete: " + moeda(Number(p.frete));
    txt += "\n*Total: " + moeda(p.total) + "*";
    if (endereco.length) txt += "\n\nEndereço: " + endereco.join(", ");

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
    if (p.entrega && p.entrega.data) txt += "\n\nEntrega/retirada: " + p.entrega.data;
    return "https://wa.me/" + encodeURIComponent(String(cfg.whatsapp).replace(/\D/g, "")) +
      "?text=" + encodeURIComponent(txt);
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

  /* ---------------- ENTREGA (semana + PDF + relatório) ---------------- */
  var STATUS_ENTREGA = ["aprovado", "pago_enviado", "pago_confirmado", "concluido"];

  function dois(n) { return (n < 10 ? "0" : "") + n; }

  function brDate(iso) {
    if (!iso) return "";
    var p = String(iso).slice(0, 10).split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : String(iso);
  }

  function isoData(d) {
    return d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate());
  }

  function inicioSemana(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); /* segunda = início */
    return x;
  }

  function janelaPeriodo() {
    if (periodoEntrega === "todos") return null;
    if (periodoEntrega === "custom") {
      var ini = $("dataIni").value, fim = $("dataFim").value;
      if (!ini && !fim) return null;
      return { ini: ini || "0000-01-01", fim: fim || "9999-12-31" };
    }
    var seg = inicioSemana(new Date());
    var iniD, fimD;
    if (periodoEntrega === "proxima") {
      iniD = new Date(seg.getTime() + 7 * 86400000);
      fimD = new Date(seg.getTime() + 13 * 86400000);
    } else if (periodoEntrega === "duas") {
      iniD = seg;
      fimD = new Date(seg.getTime() + 13 * 86400000);
    } else {
      iniD = seg;
      fimD = new Date(seg.getTime() + 6 * 86400000);
    }
    return { ini: isoData(iniD), fim: isoData(fimD) };
  }

  function dataEntregaPedido(p) {
    var d = (p.entrega && p.entrega.data) || p.dataEvento || "";
    d = String(d).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
  }

  function pedidosEntrega() {
    var j = janelaPeriodo();
    return Store.pedidos().filter(function (p) {
      if (STATUS_ENTREGA.indexOf(p.status) === -1) return false;
      if (!j) return true;
      var d = dataEntregaPedido(p);
      if (!d) return true; /* sem data: sempre aparece */
      return d >= j.ini && d <= j.fim;
    }).sort(function (a, b) {
      var da = dataEntregaPedido(a) || "9999-99-99";
      var db = dataEntregaPedido(b) || "9999-99-99";
      if (da !== db) return da < db ? -1 : 1;
      return (Number(a.numero) || 0) - (Number(b.numero) || 0);
    });
  }

  function renderEntregas() {
    var el = $("listaEntregas");
    var lista = pedidosEntrega();
    var vivos = {};
    lista.forEach(function (p) { vivos[p.id] = 1; });
    Object.keys(selecionadosEntrega).forEach(function (id) {
      if (!vivos[id]) delete selecionadosEntrega[id];
    });

    if (!lista.length) {
      el.innerHTML = '<p class="suave">Nenhum pedido com entrega neste período. 📭</p>';
      return;
    }

    var j = janelaPeriodo();
    var cabec = '<p class="suave">' + lista.length + " pedido(s)" +
      (j ? " entre " + brDate(j.ini) + " e " + brDate(j.fim) : " (todos)") +
      " • " + Object.keys(selecionadosEntrega).length + " marcado(s)</p>";

    el.innerHTML = cabec + lista.map(function (p) {
      var marcado = !!selecionadosEntrega[p.id];
      var cli = p.cliente || {};
      var d = dataEntregaPedido(p);
      var end = [cli.endereco, cli.bairro].filter(Boolean).join(", ");
      var cid = [cli.cidade, cli.uf].filter(Boolean).join("/");
      return '<label class="linha-entrega' + (marcado ? " marcado" : "") + '">' +
        '<input type="checkbox" ' + (marcado ? "checked " : "") + 'data-check="' + p.id + '">' +
        '<span class="imp-numero">#' + p.numero + "</span>" +
        "<span class=\"imp-cli\"><strong>" + esc(cli.nome || "") + "</strong>" +
        (d ? " • 📅 " + esc(brDate(d)) : " • <em>sem data</em>") +
        '<br><span class="suave">' + esc([end, cid].filter(Boolean).join(" — ") || "sem endereço") + "</span></span>" +
        '<span class="selo ' + p.status + '">' + esc(ROTULOS[p.status] || p.status) + "</span>" +
        '<span class="imp-valor">' + moeda(p.total) + "</span>" +
        "</label>";
    }).join("");

    Array.prototype.forEach.call(el.querySelectorAll("[data-check]"), function (c) {
      c.addEventListener("change", function () {
        var id = c.getAttribute("data-check");
        if (c.checked) selecionadosEntrega[id] = true;
        else delete selecionadosEntrega[id];
        var lab = c.closest ? c.closest(".linha-entrega") : null;
        if (lab) lab.classList.toggle("marcado", c.checked);
        var cont = el.querySelector(".suave");
        if (cont) cont.textContent = cont.textContent.replace(/\d+ marcado\(s\)/, Object.keys(selecionadosEntrega).length + " marcado(s)");
      });
    });
  }

  function pedidosSelecionados() {
    return pedidosEntrega().filter(function (p) { return selecionadosEntrega[p.id]; });
  }

  function materiaisDe(lista) {
    var mapa = {}, ordem = [];
    lista.forEach(function (p) {
      (p.itens || []).forEach(function (i) {
        var chave = i.id != null ? String(i.id) : "n" + i.nome;
        if (!mapa[chave]) {
          mapa[chave] = { id: i.id, nome: i.nome, unidade: i.unidade, qtd: 0, valor: 0 };
          ordem.push(chave);
        }
        mapa[chave].qtd += Number(i.qtd) || 0;
        mapa[chave].valor += (Number(i.preco) || 0) * (Number(i.qtd) || 0);
      });
    });
    return ordem.map(function (k) { return mapa[k]; })
      .sort(function (a, b) { return b.qtd - a.qtd; });
  }

  function blocoMateriais(mats, comEstoque) {
    if (!mats.length) return "";
    var h = '<section class="imp-materiais"><h3>📦 Materiais das entregas selecionadas</h3>';
    h += '<table class="imp-tabela"><thead><tr><th>Qtd</th><th>Item</th><th>Unidade</th>' +
      (comEstoque ? "<th>Estoque</th><th>Situação</th>" : "") + "</tr></thead><tbody>";
    mats.forEach(function (m) {
      var it = m.id != null ? Store.item(m.id) : null;
      var est = it ? (Number(it.estoque) || 0) : null;
      var estoura = est != null && m.qtd > est;
      h += "<tr" + (estoura ? ' class="alerta"' : "") + ">" +
        "<td class='q'>" + m.qtd + "</td>" +
        "<td>" + esc(m.nome) + "</td>" +
        "<td>" + esc(m.unidade || "") + "</td>" +
        (comEstoque ? "<td>" + (est == null ? "—" : est) + "</td><td>" +
          (est == null ? "fora do catálogo" : (estoura ? "ESTOURA o estoque" : "ok")) + "</td>" : "") +
        "</tr>";
    });
    h += "</tbody></table></section>";
    return h;
  }

  function blocoPedidoImpressao(p) {
    var cli = p.cliente || {};
    var end = [cli.endereco, cli.bairro].filter(Boolean).join(", ");
    var cid = [cli.cidade, cli.uf].filter(Boolean).join("/");
    var itensTotal = p.itensTotal != null ? Number(p.itensTotal) : Number(p.total) || 0;
    var frete = Number(p.frete) || 0;
    var entrega = p.entrega || {};

    var h = '<section class="imp-pedido">';
    h += '<div class="imp-topo"><strong>#' + p.numero + " — " + esc(cli.nome || "") + "</strong>" +
      "<span>☎ " + esc(cli.telefone || "") + "</span>" +
      "<span>📅 " + esc(brDate(dataEntregaPedido(p)) || "sem data") + "</span>" +
      "<span>" + esc(ROTULOS[p.status] || p.status) + "</span></div>";
    h += '<div class="imp-endereco">📍 CEP ' + esc(cli.cep || "—") +
      (end ? " • " + esc(end) : "") + (cid ? " • " + esc(cid) : "") +
      (entrega.forma ? " • " + esc(entrega.forma) : "") + "</div>";
    h += '<table class="imp-tabela"><thead><tr><th>Qtd</th><th>Item</th><th>Unitário</th><th>Subtotal</th></tr></thead><tbody>';
    (p.itens || []).forEach(function (i) {
      h += "<tr><td class='q'>" + (Number(i.qtd) || 0) + "</td>" +
        "<td>" + esc(i.nome) + "</td>" +
        "<td>" + moeda(i.preco) + "</td>" +
        "<td>" + moeda((Number(i.preco) || 0) * (Number(i.qtd) || 0)) + "</td></tr>";
    });
    h += "<tr class='soma'><td colspan='3'>Itens</td><td>" + moeda(itensTotal) + "</td></tr>";
    if (frete > 0) h += "<tr class='soma'><td colspan='3'>Frete</td><td>" + moeda(frete) + "</td></tr>";
    h += "<tr class='total'><td colspan='3'>TOTAL</td><td>" + moeda(p.total) + "</td></tr>";
    h += "</tbody></table>";

    var obs = [p.observacaoAdmin, entrega.obs, cli.obs].filter(Boolean).join(" • ");
    if (obs) h += '<div class="imp-obs">📝 ' + esc(obs) + "</div>";
    h += '<div class="imp-conferencia">☐ Conferido &nbsp; ☐ Entregue &nbsp; ☐ Retirado pelo cliente ' +
      "&nbsp;&nbsp; Assinatura: ______________________________</div>";
    h += "</section>";
    return h;
  }

  function resumoEntregas() {
    var sel = pedidosSelecionados();
    var totalGeral = 0;
    sel.forEach(function (p) { totalGeral += Number(p.total) || 0; });
    return { sel: sel, totalGeral: totalGeral, mats: materiaisDe(sel) };
  }

  function imprimirEntregas() {
    var r = resumoEntregas();
    if (!r.sel.length) { toast("Selecione ao menos um pedido na lista."); return; }
    var cfg = Store.config();
    var j = janelaPeriodo();

    var html = '<header class="imp-cabalho">' +
      "<div><strong>" + esc(cfg.nomeLoja || "RENASCRE") + "</strong><br>Folha de entrega" +
      (j ? " • " + brDate(j.ini) + " a " + brDate(j.fim) : "") + "</div>" +
      '<div class="imp-data">Emitido em ' + esc(dataBR(new Date().toISOString())) +
      "<br>" + r.sel.length + " pedido(s) • " + moeda(r.totalGeral) + "</div>" +
      "</header>";
    html += r.sel.map(blocoPedidoImpressao).join("");
    html += blocoMateriais(r.mats, true);
    html += '<div class="imp-total-geral">Total geral das entregas: <strong>' + moeda(r.totalGeral) + "</strong></div>";

    var area = $("areaImpressao");
    area.innerHTML = html;
    area.hidden = false;
    if (!imprimirEntregas._ligado) {
      window.addEventListener("afterprint", function () { $("areaImpressao").hidden = true; });
      imprimirEntregas._ligado = true;
    }
    window.print();
  }

  function relatorioEntregas() {
    var r = resumoEntregas();
    if (!r.sel.length) { toast("Selecione ao menos um pedido na lista."); return; }

    var porDia = {};
    r.sel.forEach(function (p) {
      var d = dataEntregaPedido(p) || "sem data";
      porDia[d] = (porDia[d] || 0) + 1;
    });
    var dias = Object.keys(porDia).sort();

    var corpo = "<p><strong>" + r.sel.length + " pedido(s)</strong> • total <strong>" + moeda(r.totalGeral) + "</strong></p>";
    corpo += "<h3>📅 Entregas por dia</h3><ul>";
    dias.forEach(function (d) {
      corpo += "<li>" + esc(d === "sem data" ? "Sem data definida" : brDate(d)) + ": <strong>" + porDia[d] + "</strong> pedido(s)</li>";
    });
    corpo += "</ul>";
    corpo += blocoMateriais(r.mats, true);
    corpo += "<p><strong>Total dos itens locados: " + moeda(r.mats.reduce(function (s, m) { return s + m.valor; }, 0)) + "</strong></p>";

    abrirModal("📊 Relatório de materiais", corpo, [
      { texto: "🖨 Imprimir este relatório", acao: function () {
          fecharModal();
          setTimeout(imprimirEntregas, 250);
        } },
      { texto: "Fechar", classe: "secundario grande", acao: fecharModal }
    ]);
  }

  function concluirEntregas() {
    var sel = pedidosSelecionados();
    if (!sel.length) { toast("Selecione ao menos um pedido na lista."); return; }
    abrirModal("Marcar como entregue",
      "<p><strong>" + sel.length + "</strong> pedido(s) passarão para <strong>Concluído</strong>.</p>",
      [
        { texto: "🏁 Confirmar entrega", acao: function () {
            var agora = new Date().toISOString();
            sel.forEach(function (p) {
              Store.atualizarPedido(p.id, { status: "concluido", concluidoEm: agora });
            });
            selecionadosEntrega = {};
            fecharModal();
            renderEntregas();
            toast(sel.length + " pedido(s) entregue(s) 🏁");
          } },
        { texto: "Cancelar", classe: "secundario grande", acao: fecharModal }
      ]);
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
      var extras = (i.fotos || []).map(function (f) { return typeof f === "string" ? f : (f.foto || ""); });
      return '<div class="item-admin' + (i.ativo === false ? " inativo" : "") + '" data-id="' + i.id + '">' +
        '<img class="mini" src="' + esc(foto || "img/icon-192.png") + '" alt="" onerror="this.src=\'img/icon-192.png\'">' +
        (extras.length ? '<div class="mini-fotos-lista">' + extras.map(function (f) {
          return '<img src="' + esc(fotoUrl(f)) + '" alt="" title="' + esc(extras.length + " foto(s)") + '" onerror="this.style.visibility=\'hidden\'">';
        }).join("") + "</div>" : "") +
        '<div class="info">' +
          "<h4>" + esc(i.nome) + "</h4>" +
          '<div class="meta">' + esc(i.categoria) + " • " + moeda(i.preco) + "/" + esc(i.unidade) +
          " • estoque " + (Number(i.estoque) || 0) + (i.ativo === false ? " • inativo" : "") +
          ((i.fotos || []).length ? " • 📷 " + i.fotos.length + " fotos" : "") + "</div>" +
          '<div class="acoes-item">' +
            '<button class="dest" data-act="editar">✏️ Editar</button>' +
            '<button data-act="foto">🖼 Foto</button>' +
            '<button data-act="fotos">🖼️ Variantes</button>' +
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
        else if (act === "fotos") escolherFotosExtras(id);
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
        "</select></label>" : "") +
      '<div class="campo">Fotos extras (variantes)<br><button type="button" class="secundario grande" id="eFotosExtras">🖼️ Escolher fotos' + ((i.fotos || []).length ? " (" + i.fotos.length + ")" : "") + "</button>" +
      ((i.fotos || []).length ? '<div class="mini-fotos-admin">' + i.fotos.map(function (f) {
        var nome = typeof f === "string" ? f : (f.foto || "");
        var cor = typeof f === "string" ? "" : (f.cor || "");
        return '<div class="extra-admin"><img src="' + esc(fotoUrl(nome)) + '" alt="" onerror="this.style.visibility=\'hidden\'">' + (cor ? "<span>" + esc(cor) + "</span>" : "") + "</div>";
      }).join("") + "</div>" : "") +
      "</div>";

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
    $("eFotosExtras").addEventListener("click", function () { escolherFotosExtras(id); });
  }

  /* fotos extras por item (variantes: ex. cores de toalha) — o admin nomeia cada
     variante e o cliente escolhe a foto; a cor escolhida chega no pedido */
  function escolherFotosExtras(id) {
    var i = Store.item(id);
    if (!i) return;
    var galeria = Store.fotos();
    if (!galeria.length) {
      toast("Nenhuma foto na galeria. Envie em 🖼️ Fotos.");
      return;
    }
    var escolhidas = (Array.isArray(i.fotos) ? i.fotos : []).map(function (f) {
      return typeof f === "string" ? { foto: f, cor: "" } : { foto: f.foto || "", cor: f.cor || "" };
    });

    function coletarCores() {
      var ex = $("extrasEscolhidas");
      if (!ex) return;
      Array.prototype.forEach.call(ex.querySelectorAll(".cor-nome"), function (inp) {
        var idx = Number(inp.getAttribute("data-idx"));
        if (escolhidas[idx]) escolhidas[idx].cor = inp.value.trim();
      });
    }
    function galeriaHtml() {
      return '<div class="galeria" id="galeriaExtras">' + galeria.map(function (g) {
        var sel = escolhidas.some(function (e) { return e.foto === g; });
        return '<figure data-f="' + esc(g) + '"' + (sel ? ' class="sel"' : "") + '><img src="' + esc(fotoUrl(g)) + '" alt=""><figcaption>' + (sel ? "✓ selecionada" : "escolher") + "</figcaption></figure>";
      }).join("") + "</div>";
    }
    function escolhidasHtml() {
      return '<div class="extras-escolhidas" id="extrasEscolhidas">' + escolhidas.map(function (e, idx) {
        return '<div class="extra-row" data-f="' + esc(e.foto) + '">' +
          '<img src="' + esc(fotoUrl(e.foto)) + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
          '<input class="cor-nome" data-idx="' + idx + '" value="' + esc(e.cor) + '" placeholder="Cor / nome (ex.: Branca)">' +
          '<button type="button" class="remover-extra" data-f="' + esc(e.foto) + '" title="Remover">✕</button>' +
        "</div>";
      }).join("") + "</div>";
    }
    function refresh() {
      coletarCores();
      var g = $("galeriaExtras");
      if (g) g.innerHTML = galeriaHtml().replace(/^<div class="galeria" id="galeriaExtras">|<\/div>$/g, "");
      var ex = $("extrasEscolhidas");
      if (ex) ex.innerHTML = escolhidasHtml().replace(/^<div class="extras-escolhidas" id="extrasEscolhidas">|<\/div>$/g, "");
    }

    var corpo = '<p class="suave">1) Toque nas fotos para marcar/desmarcar. 2) Dê o <strong>nome/cor</strong> de cada variante — o cliente escolhe a foto e a cor já chega no pedido.</p>' +
      "<h4>Marcar fotos</h4>" + galeriaHtml() +
      "<h4>Escolhidas — nome/cor</h4>" + escolhidasHtml();

    function handlerExtras(ev) {
      var fig = ev.target.closest ? ev.target.closest("figure") : null;
      if (fig && fig.getAttribute("data-f")) {
        var f = fig.getAttribute("data-f");
        var idx = -1;
        for (var k = 0; k < escolhidas.length; k++) if (escolhidas[k].foto === f) { idx = k; break; }
        coletarCores();
        if (idx === -1) escolhidas.push({ foto: f, cor: "" });
        else escolhidas.splice(idx, 1);
        refresh();
        return;
      }
      var rem = ev.target.closest ? ev.target.closest(".remover-extra") : null;
      if (rem) {
        var rf = rem.getAttribute("data-f");
        for (var j = escolhidas.length - 1; j >= 0; j--) if (escolhidas[j].foto === rf) escolhidas.splice(j, 1);
        refresh();
      }
    }
    $("modalCorpo").addEventListener("click", handlerExtras);

    function encerrar() {
      $("modalCorpo").removeEventListener("click", handlerExtras);
      fecharModal();
    }

    abrirModal("Fotos extras • " + i.nome, corpo, [
      { texto: "💾 Salvar (" + escolhidas.length + ")", acao: function () {
        coletarCores();
        i.fotos = escolhidas;
        Store.salvarItem(i);
        encerrar();
        renderItensAdmin();
        toast("Fotos extras salvas ✅");
        editarItem(id);
      } },
      { texto: "Limpar fotos extras", classe: "secundario grande", acao: function () {
        i.fotos = [];
        Store.salvarItem(i);
        encerrar();
        renderItensAdmin();
        toast("Fotos extras removidas.");
        editarItem(id);
      } },
      { texto: "Cancelar", classe: "secundario grande", acao: encerrar }
    ]);
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
    $("cFretePadrao").value = c.fretePadrao || 0;
    $("cFreteGratis").value = c.freteGratisAcima || 0;
    if ($("cFreteKmValor")) $("cFreteKmValor").value = c.freteKmValor || 0;
    $("cFreteCepDestino").value = c.freteCepOrigem || c.freteCepDestino || "74353400";
    $("cFreteCepTabela").value = c.freteCepTabela || "";
    $("cNuvemUrl").value = c.nuvemUrl || "";
    $("cNuvemAuto").checked = c.nuvemAuto !== false;
    mostrarStatusNuvem();
  }

  function mostrarStatusNuvem(extra) {
    var el = $("nuvemStatus");
    if (!el) return;
    var s = Nuvem.status();
    var hora = s.ultimoOk ? new Date(s.ultimoOk).toLocaleTimeString("pt-BR") : "";
    var txt;
    if (!s.ativa) {
      txt = "Sincronização: <strong>desativada</strong> — cole o endereço da ponte (Apps Script) acima para os aparelhos conversarem.";
    } else {
      txt = "Sincronização: <strong>ativada</strong>" +
        (s.ultimoOk ? " • último contato às <strong>" + hora + "</strong>" : " • aguardando primeiro contato") +
        (s.ocupado ? " • enviando..." : "") +
        (s.ultimoErro ? ' • <span style="color:#DC2626">erro: ' + esc(s.ultimoErro) + "</span>" : "");
    }
    if (extra) txt += "<br>" + esc(extra);
    el.innerHTML = txt;
  }

  function salvarAjustes() {
    var cepBase = $("cFreteCepDestino").value.replace(/\D/g, "").slice(0, 8) || "74353400";
    Store.salvarConfig({
      nomeLoja: $("cNomeLoja").value.trim() || "RENASCRE LOCACOES & EVENTOS",
      msgBoasVindas: $("cBoasVindas").value.trim(),
      whatsapp: $("cWhats").value.replace(/\D/g, "") || "5562982240434",
      pixChave: $("cPixChave").value.trim() || "5562982240434",
      pixNome: $("cPixNome").value.trim() || "RENASCER LOCACOES",
      pixCidade: $("cPixCidade").value.trim() || "GOIANIA",
      senhaAdmin: $("cSenha").value.trim() || "A103114",
      msgAprovado: $("cMsgAprovado").value.trim() || "PEDIDO AUTORIZADO E RESERVADO!",
      fretePadrao: Math.max(0, Number(String($("cFretePadrao").value).replace(",", ".")) || 0),
      freteGratisAcima: Math.max(0, Number(String($("cFreteGratis").value).replace(",", ".")) || 0),
      freteKmValor: $("cFreteKmValor") ? Math.max(0, Number(String($("cFreteKmValor").value).replace(",", ".")) || 0) : 0,
      freteKmDefinido: true,
      freteCepOrigem: cepBase,
      freteCepDestino: cepBase,
      freteCepTabela: $("cFreteCepTabela").value.replace(/\r/g, "").trim(),
      nuvemUrl: $("cNuvemUrl").value.trim(),
      nuvemAuto: $("cNuvemAuto").checked
    });
    Nuvem.recarregar();
    Nuvem.parar();
    Nuvem.iniciar();
    toast("Ajustes salvos ✅");
    mostrarStatusNuvem(Nuvem.status().ativa ? "Ponte atualizada — sincronizando..." : "");
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
    $("abaEntrega").hidden = aba !== "entrega";
    $("abaItens").hidden = aba !== "itens";
    $("abaFotos").hidden = aba !== "fotos";
    $("abaAjustes").hidden = aba !== "ajustes";
    $("abaBackup").hidden = aba !== "backup";
    if (aba === "pedidos") renderPedidos();
    if (aba === "entrega") renderEntregas();
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
      var digitada = $("senhaLogin").value.trim();
      if (digitada && digitada !== cfg.senhaAdmin && typeof Nuvem !== "undefined" && Nuvem.recarregar() && !window.__loginNuvem) {
        /* aparelho novo ou senha trocada em outro aparelho: confere na nuvem */
        Nuvem.verificarSenha(digitada, function (ok) {
          if (ok) { Store.definirSenhaLocal(digitada); }
          window.__loginNuvem = true;
          $("btnLogin").click();
          window.__loginNuvem = false;
        });
        return;
      }
      cfg = Store.config();
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

    $("periodoEntrega").addEventListener("change", function () {
      periodoEntrega = this.value;
      $("datasCustom").hidden = periodoEntrega !== "custom";
      renderEntregas();
    });
    $("dataIni").addEventListener("change", renderEntregas);
    $("dataFim").addEventListener("change", renderEntregas);
    $("btnMarcarTodos").addEventListener("click", function () {
      pedidosEntrega().forEach(function (p) { selecionadosEntrega[p.id] = true; });
      renderEntregas();
    });
    $("btnMarcarNenhum").addEventListener("click", function () {
      selecionadosEntrega = {};
      renderEntregas();
    });
    $("btnImprimirEntregas").addEventListener("click", imprimirEntregas);
    $("btnRelatorioEntregas").addEventListener("click", relatorioEntregas);
    $("btnConcluirEntregas").addEventListener("click", concluirEntregas);

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

    $("btnNuvemTestar").addEventListener("click", function () {
      Store.salvarConfig({ nuvemUrl: $("cNuvemUrl").value.trim(), nuvemAuto: $("cNuvemAuto").checked });
      Nuvem.recarregar();
      mostrarStatusNuvem("Testando...");
      Nuvem.testar(function (ok, msg) { mostrarStatusNuvem(msg); });
    });
    $("btnNuvemAgora").addEventListener("click", function () {
      Store.salvarConfig({ nuvemUrl: $("cNuvemUrl").value.trim(), nuvemAuto: $("cNuvemAuto").checked });
      Nuvem.recarregar();
      mostrarStatusNuvem("Sincronizando...");
      Nuvem.sincronizarAgora(function (ok, msg) {
        mostrarStatusNuvem(ok ? "Sincronizado ✅ — " + Store.pedidos().length + " pedido(s) aqui." : msg);
        renderTudo();
      });
    });
    Nuvem.onChange(function () { if (abaAtual === "ajustes") mostrarStatusNuvem(); });
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
      if (abaAtual === "entrega") renderEntregas();
      if (abaAtual === "itens") renderItensAdmin();
      if (abaAtual === "fotos") renderGaleria();
      atualizarBarraStatus();
    });
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  function iniciarTudo() {
    ligarEventos();
    mostrarApp();
    Nuvem.iniciar();
    mostrarStatusNuvem();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarTudo);
  } else {
    iniciarTudo();
  }
})();

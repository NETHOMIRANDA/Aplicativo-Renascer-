/* =========================================================
   pix.js - Gera a chave PIX copia-e-cola (BR Code / EMV)
   ========================================================= */
var PIX = (function () {
  "use strict";

  function crc16(str) {
    var crc = 0xffff;
    for (var i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (var b = 0; b < 8; b++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xffff;
      }
    }
    return ("0000" + crc.toString(16).toUpperCase()).slice(-4);
  }

  function tlv(id, valor) {
    var v = String(valor);
    return id + ("0" + v.length).slice(-2) + v;
  }

  function limpar(txt, max) {
    var s = String(txt || "");
    if (s.normalize) s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    s = s.toUpperCase().replace(/[^A-Z0-9 \-_.]/g, "").trim();
    if (max && s.length > max) s = s.slice(0, max);
    return s;
  }

  /**
   * opts = { chave, nome, cidade, valor, txid }
   * valor = numero (ex: 145.5) ou string "145.50"
   */
  function copiaECola(opts) {
    opts = opts || {};
    var chave = String(opts.chave || "").trim();
    if (!chave) throw new Error("Chave PIX nao informada");

    var nome = limpar(opts.nome || "RENASCER LOCACOES", 25) || "RENASCER LOCACOES";
    var cidade = limpar(opts.cidade || "GOIANIA", 15) || "GOIANIA";
    var txid = limpar(opts.txid || "RENASCR", 25) || "RENASCR";

    var valor = "";
    if (opts.valor !== undefined && opts.valor !== null && opts.valor !== "") {
      var n = parseFloat(String(opts.valor).replace(",", "."));
      if (isNaN(n) || n <= 0) n = 0;
      valor = n.toFixed(2);
    }

    var corpo =
      tlv("00", "01") +
      tlv("01", "12") +
      tlv("26", tlv("00", "BR.GOV.BCB.PIX") + tlv("01", chave)) +
      tlv("52", "0000") +
      tlv("53", "986") +
      (valor ? tlv("54", valor) : "") +
      tlv("58", "BR") +
      tlv("59", nome) +
      tlv("60", cidade) +
      tlv("62", tlv("05", txid));

    var parcial = corpo + "6304";
    return parcial + crc16(parcial);
  }

  return { copiaECola: copiaECola, crc16: crc16, limpar: limpar };
})();

if (typeof module !== "undefined" && module.exports) module.exports = PIX;

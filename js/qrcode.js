/* =========================================================
   qrcode.js - Gerador de QR Code (modo byte, nivel M)
   Sem dependencias. Uso: QR.make(texto) -> {size, modules[][]}
   ========================================================= */
var QR = (function () {
  "use strict";

  var EC_TABLE = {
    // versao: [total_codewords, ec_por_bloco, [ [qtd_bloco, data_por_bloco], ... ] ]  (nivel M)
    1: [26, 10, [[1, 16]]],
    2: [44, 16, [[1, 28]]],
    3: [70, 26, [[1, 44]]],
    4: [100, 18, [[2, 32]]],
    5: [134, 24, [[2, 43]]],
    6: [172, 16, [[4, 27]]],
    7: [196, 18, [[4, 31]]],
    8: [242, 22, [[2, 38], [2, 39]]],
    9: [292, 22, [[3, 36], [2, 37]]],
    10: [346, 26, [[4, 43], [1, 44]]],
    11: [404, 30, [[1, 50], [4, 51]]],
    12: [466, 22, [[6, 36], [2, 37]]],
    13: [532, 22, [[8, 37], [1, 38]]],
    14: [581, 24, [[4, 40], [5, 41]]],
    15: [655, 24, [[5, 41], [5, 42]]]
  };

  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46],
    10: [6, 28, 50], 11: [6, 30, 54], 12: [6, 32, 58], 13: [6, 34, 62],
    14: [6, 26, 46, 66], 15: [6, 26, 48, 70]
  };

  /* ---------- GF(256) ---------- */
  var EXP = new Array(512), LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function gmul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  function polyMul(a, b) {
    var r = new Array(a.length + b.length - 1);
    for (var i = 0; i < r.length; i++) r[i] = 0;
    for (var x = 0; x < a.length; x++) {
      for (var y = 0; y < b.length; y++) {
        r[x + y] ^= gmul(a[x], b[y]);
      }
    }
    return r;
  }

  function rsGenerator(n) {
    var g = [1];
    for (var i = 0; i < n; i++) g = polyMul(g, [1, EXP[i]]);
    return g;
  }

  function rsEncode(data, ecLen) {
    var gen = rsGenerator(ecLen);
    var res = new Array(data.length + ecLen);
    var i;
    for (i = 0; i < data.length; i++) res[i] = data[i];
    for (i = data.length; i < res.length; i++) res[i] = 0;
    for (i = 0; i < data.length; i++) {
      var coef = res[i];
      if (coef !== 0) {
        for (var j = 0; j < gen.length; j++) {
          res[i + j] ^= gmul(gen[j], coef);
        }
      }
    }
    return res.slice(data.length);
  }

  /* ---------- bytes utf8 ---------- */
  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        var c2 = str.charCodeAt(i + 1);
        var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        i++;
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }
    return out;
  }

  function dataCodewords(ver) {
    var t = EC_TABLE[ver];
    var blocks = t[2], total = 0;
    for (var i = 0; i < blocks.length; i++) total += blocks[i][0] * blocks[i][1];
    return total;
  }

  /* ---------- montagem do bitstream ---------- */
  function buildCodewords(bytes, ver) {
    var totalDc = dataCodewords(ver);
    var bits = [];
    function push(val, len) {
      for (var i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
    }
    push(4, 4); // modo byte
    push(bytes.length, ver < 10 ? 8 : 16);
    for (var i = 0; i < bytes.length; i++) push(bytes[i], 8);
    // terminator
    var maxBits = totalDc * 8;
    var term = Math.min(4, maxBits - bits.length);
    push(0, term);
    // alinhar em byte
    while (bits.length % 8 !== 0) bits.push(0);
    // preencher
    var cw = [];
    for (var b = 0; b < bits.length; b += 8) {
      var v = 0;
      for (var k = 0; k < 8; k++) v = (v << 1) | bits[b + k];
      cw.push(v);
    }
    var pad = [0xec, 0x11], p = 0;
    while (cw.length < totalDc) cw.push(pad[p++ % 2]);

    // quebra em blocos
    var t = EC_TABLE[ver], ecLen = t[1], groups = t[2];
    var dataBlocks = [], ecBlocks = [], idx = 0;
    for (var g = 0; g < groups.length; g++) {
      for (var n = 0; n < groups[g][0]; n++) {
        var size = groups[g][1];
        var blk = cw.slice(idx, idx + size);
        idx += size;
        dataBlocks.push(blk);
        ecBlocks.push(rsEncode(blk, ecLen));
      }
    }
    // intercalar
    var out = [];
    var maxData = 0;
    for (var d = 0; d < dataBlocks.length; d++) maxData = Math.max(maxData, dataBlocks[d].length);
    for (var c = 0; c < maxData; c++) {
      for (var bi = 0; bi < dataBlocks.length; bi++) {
        if (c < dataBlocks[bi].length) out.push(dataBlocks[bi][c]);
      }
    }
    for (var e = 0; e < ecLen; e++) {
      for (var bj = 0; bj < ecBlocks.length; bj++) out.push(ecBlocks[bj][e]);
    }
    return out;
  }

  /* ---------- matriz ---------- */
  function newMatrix(size) {
    var m = [], r;
    for (r = 0; r < size; r++) {
      m[r] = [];
      for (var c = 0; c < size; c++) m[r][c] = null;
    }
    return m;
  }

  function placeFinder(m, res, row, col, size) {
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var rr = row + r, cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        var dark =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        m[rr][cc] = dark ? 1 : 0;
        res[rr][cc] = true;
      }
    }
  }

  function placeAlignment(m, res, row, col) {
    for (var r = -2; r <= 2; r++) {
      for (var c = -2; c <= 2; c++) {
        var dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
        m[row + r][col + c] = dark ? 1 : 0;
        res[row + r][col + c] = true;
      }
    }
  }

  function bchFormat(data) {
    var d = data << 10;
    var g = 0x537;
    for (var i = 14; i >= 10; i--) {
      if ((d >> i) & 1) d ^= g << (i - 10);
    }
    return ((data << 10) | d) ^ 0x5412;
  }

  function bchVersion(data) {
    var d = data << 12;
    var g = 0x1f25;
    for (var i = 17; i >= 12; i--) {
      if ((d >> i) & 1) d ^= g << (i - 12);
    }
    return (data << 12) | d;
  }

  function maskFn(id, r, c) {
    switch (id) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
    return false;
  }

  function penalty(m, size) {
    var score = 0, r, c, i;
    // regra 1: sequencias
    for (r = 0; r < size; r++) {
      var run = 1;
      for (c = 1; c < size; c++) {
        if (m[r][c] === m[r][c - 1]) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else run = 1;
      }
    }
    for (c = 0; c < size; c++) {
      var run2 = 1;
      for (r = 1; r < size; r++) {
        if (m[r][c] === m[r - 1][c]) {
          run2++;
          if (run2 === 5) score += 3;
          else if (run2 > 5) score += 1;
        } else run2 = 1;
      }
    }
    // regra 2: blocos 2x2
    for (r = 0; r < size - 1; r++) {
      for (c = 0; c < size - 1; c++) {
        var v = m[r][c];
        if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
      }
    }
    // regra 3: padroes 1:1:3:1:1
    var pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function match(get, len) {
      var total = 0;
      for (var s = 0; s + 11 <= len; s++) {
        var ok1 = true, ok2 = true;
        for (var k = 0; k < 11; k++) {
          var val = get(s + k);
          if (val !== pat1[k]) ok1 = false;
          if (val !== pat2[k]) ok2 = false;
        }
        if (ok1) total += 40;
        if (ok2) total += 40;
      }
      return total;
    }
    for (r = 0; r < size; r++) {
      score += match((function (rr) {
        return function (i) { return m[rr][i]; };
      })(r), size);
    }
    for (c = 0; c < size; c++) {
      score += match((function (cc) {
        return function (i) { return m[i][cc]; };
      })(c), size);
    }
    // regra 4: equilibrio
    var dark = 0;
    for (r = 0; r < size; r++) for (c = 0; c < size; c++) if (m[r][c]) dark++;
    var pct = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  function make(text) {
    var bytes = utf8Bytes(String(text));
    var ver = 0;
    for (var v = 1; v <= 15; v++) {
      var cap = dataCodewords(v) * 8;
      var need = 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
      if (need <= cap) { ver = v; break; }
    }
    if (!ver) throw new Error("Texto longo demais para o QR");

    var codewords = buildCodewords(bytes, ver);
    var size = 17 + 4 * ver;
    var base = newMatrix(size);
    var res = [];
    for (var r = 0; r < size; r++) {
      res[r] = [];
      for (var c = 0; c < size; c++) res[r][c] = false;
    }

    // finders + separadores
    placeFinder(base, res, 0, 0, size);
    placeFinder(base, res, 0, size - 7, size);
    placeFinder(base, res, size - 7, 0, size);

    // timing
    for (var t = 8; t < size - 8; t++) {
      var bit = t % 2 === 0 ? 1 : 0;
      if (base[6][t] === null) { base[6][t] = bit; res[6][t] = true; }
      if (base[t][6] === null) { base[t][6] = bit; res[t][6] = true; }
    }

    // alinhamento
    var pos = ALIGN[ver];
    for (var i = 0; i < pos.length; i++) {
      for (var j = 0; j < pos.length; j++) {
        var pr = pos[i], pc = pos[j];
        if ((pr <= 8 && pc <= 8) || (pr <= 8 && pc >= size - 9) || (pr >= size - 9 && pc <= 8)) continue;
        placeAlignment(base, res, pr, pc);
      }
    }

    // dark module
    base[size - 8][8] = 1;
    res[size - 8][8] = true;

    // reservar areas de formato
    for (var k = 0; k <= 8; k++) {
      if (k !== 6) {
        if (!res[8][k]) res[8][k] = true;
        if (!res[k][8]) res[k][8] = true;
      }
    }
    for (var k2 = 0; k2 < 8; k2++) {
      res[8][size - 1 - k2] = true;
      res[size - 1 - k2][8] = true;
    }
    // reservar version info
    if (ver >= 7) {
      for (var a = 0; a < 6; a++) {
        for (var b = 0; b < 3; b++) {
          res[a][size - 11 + b] = true;
          res[size - 11 + b][a] = true;
        }
      }
    }

    // colocar dados (zigzag)
    var bitList = [];
    for (var cw = 0; cw < codewords.length; cw++) {
      for (var bi = 7; bi >= 0; bi--) bitList.push((codewords[cw] >> bi) & 1);
    }
    var idxBit = 0;
    var up = true;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (var n = 0; n < size; n++) {
        var row = up ? size - 1 - n : n;
        for (var w = 0; w < 2; w++) {
          var cc = col - w;
          if (res[row][cc]) continue;
          base[row][cc] = idxBit < bitList.length ? bitList[idxBit] : 0;
          idxBit++;
        }
      }
      up = !up;
    }

    // escolher mascara
    var best = null, bestScore = Infinity, bestMask = 0;
    for (var mk = 0; mk < 8; mk++) {
      var cand = [];
      for (var rr = 0; rr < size; rr++) {
        cand[rr] = base[rr].slice();
      }
      for (var r2 = 0; r2 < size; r2++) {
        for (var c2 = 0; c2 < size; c2++) {
          if (!res[r2][c2] && maskFn(mk, r2, c2)) cand[r2][c2] ^= 1;
        }
      }
      // format info (nivel M = 00)
      var fmt = bchFormat((0 << 3) | mk);
      applyFormat(cand, res, fmt, size);
      if (ver >= 7) {
        var vinfo = bchVersion(ver);
        applyVersion(cand, vinfo, size);
      }
      var sc = penalty(cand, size);
      if (sc < bestScore) { bestScore = sc; best = cand; bestMask = mk; }
    }

    return { size: size, version: ver, mask: bestMask, modules: best };
  }

  function applyFormat(m, res, fmt, size) {
    function bit(i) { return (fmt >> i) & 1; }
    // primeira copia (ao redor do finder superior esquerdo)
    for (var i = 0; i <= 5; i++) m[i][8] = bit(i);
    m[7][8] = bit(6);
    m[8][8] = bit(7);
    m[8][7] = bit(8);
    for (var j = 9; j < 15; j++) m[8][14 - j] = bit(j);
    // segunda copia
    for (var k = 0; k < 8; k++) m[8][size - 1 - k] = bit(k);
    for (var n = 8; n < 15; n++) m[size - 15 + n][8] = bit(n);
    // modulo sempre escuro
    m[size - 8][8] = 1;
  }

  function applyVersion(m, vinfo, size) {
    for (var i = 0; i < 18; i++) {
      var bit = (vinfo >> i) & 1;
      var a = Math.floor(i / 3);
      var b = i % 3;
      m[a][size - 11 + b] = bit;
      m[size - 11 + b][a] = bit;
    }
  }

  return {
    make: make,
    debug: {
      utf8: utf8Bytes,
      dataCodewords: dataCodewords,
      codewords: function (text) {
        var b = utf8Bytes(String(text));
        var ver = 0;
        for (var v = 1; v <= 15; v++) {
          if (4 + (v < 10 ? 8 : 16) + b.length * 8 <= dataCodewords(v) * 8) { ver = v; break; }
        }
        return { version: ver, codewords: buildCodewords(b, ver) };
      }
    }
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QR;

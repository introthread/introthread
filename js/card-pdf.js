// Introthread - printable card PDF (v141, chip-card design v142). Shared by the browser (download in the NFC panel) and the server
// (api/_lib/pay.js emails it after a paid order). No dependencies: pass the qrcode-generator function in
// (window.qrcode in the browser, api/_lib/qrcode.js on the server). Returns the PDF as a binary (latin1) string.
// Page 1: one card, front and back, actual size (85 x 55 mm) with cut marks. Page 2: 10 fronts on A4.
// Page 3: 10 backs, columns swapped so they line up when printed double-sided (flip on long edge).
(function (root) {
  const MM = 72 / 25.4,
    PW = 595.28,
    PH = 841.89,
    CW = 85 * MM,
    CH = 55 * MM;
  const H =
    '278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584'
      .split(',')
      .map(Number);
  const HB =
    '278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584'
      .split(',')
      .map(Number);
  // Text the standard PDF fonts can show: accents dropped, smart quotes straightened, anything else becomes '?'.
  function clean(s) {
    return String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u00b7/g, '\u00b7')
      .replace(/[^\x20-\x7e\u00a0-\u00ff]/g, '?')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function tw(s, size, bold) {
    const t = bold ? HB : H;
    let w = 0;
    for (const ch of s) {
      const c = ch.charCodeAt(0);
      w += c >= 32 && c <= 126 ? t[c - 32] : 556;
    }
    return (w * size) / 1000;
  }
  const pdfStr = s => '(' + s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')';
  const n = v => (Math.round(v * 100) / 100).toString();
  const rgb = hex => [1, 3, 5].map(i => n(parseInt(hex.slice(i, i + 2), 16) / 255)).join(' ');
  // Fit text into a width: shrink down to min size, then cut with an ellipsis.
  function fit(s, size, min, maxW, bold) {
    while (size > min && tw(s, size, bold) > maxW) size -= 0.25;
    while (s.length > 1 && tw(s, size, bold) > maxW) s = s.replace(/\.{3}$/, '').slice(0, -1) + '...';
    return [s, size];
  }
  function text(x, y, s, size, bold, color) {
    return `BT /${bold ? 'F2' : 'F1'} ${n(size)} Tf ${rgb(color)} rg ${n(x)} ${n(y)} Td ${pdfStr(s)} Tj ET\n`;
  }
  function qrPath(qrFn, url, x, y, size) {
    const q = qrFn(0, 'M');
    q.addData(url);
    q.make();
    const m = q.getModuleCount(),
      c = size / m;
    let o = '0 0 0 rg\n';
    for (let r = 0; r < m; r++) {
      let s = -1;
      for (let k = 0; k <= m; k++) {
        const d = k < m && q.isDark(r, k);
        if (d && s < 0) s = k;
        if (!d && s >= 0) {
          o += `${n(x + s * c)} ${n(y + size - (r + 1) * c)} ${n((k - s) * c + 0.05)} ${n(c + 0.05)} re\n`;
          s = -1;
        }
      }
    }
    return o + 'f\n';
  }
  function brand(x, y, size, onDark) {
    const a = 'intro';
    return (
      text(x, y, a, size, true, onDark ? '#ffffff' : '#101828') +
      text(x + tw(a, size, true), y, 'thread', size, true, onDark ? '#8fb0ff' : '#1f5eff')
    );
  }
  // Shapes (v142): rounded rectangles and arcs drawn with Bezier curves.
  function rrect(x, y, w, h, r) {
    const k = 0.5523 * r;
    return (
      `${n(x + r)} ${n(y)} m ${n(x + w - r)} ${n(y)} l ` +
      `${n(x + w - r + k)} ${n(y)} ${n(x + w)} ${n(y + r - k)} ${n(x + w)} ${n(y + r)} c ` +
      `${n(x + w)} ${n(y + h - r)} l ${n(x + w)} ${n(y + h - r + k)} ${n(x + w - r + k)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)} c ` +
      `${n(x + r)} ${n(y + h)} l ${n(x + r - k)} ${n(y + h)} ${n(x)} ${n(y + h - r + k)} ${n(x)} ${n(y + h - r)} c ` +
      `${n(x)} ${n(y + r)} l ${n(x)} ${n(y + r - k)} ${n(x + r - k)} ${n(y)} ${n(x + r)} ${n(y)} c h\n`
    );
  }
  function arc(cx, cy, r, a0, a1) {
    const steps = 12;
    let o = '';
    for (let i = 0; i <= steps; i++) {
      const t = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
      o += `${n(cx + r * Math.cos(t))} ${n(cy + r * Math.sin(t))} ${i ? 'l' : 'm'} `;
    }
    return o + 'S\n';
  }
  // Gold contact chip, like a bank card. Drawn, not a real chip.
  function chip(x, y) {
    const w = 11.5 * MM,
      h = 9 * MM,
      cw = w * 0.34,
      ch = h * 0.46,
      cx = x + (w - cw) / 2,
      cy = y + (h - ch) / 2;
    let o = `${rgb('#c99a2e')} rg ` + rrect(x, y, w, h, 1.6 * MM) + 'f\n';
    o += `${rgb('#f0cf73')} rg ` + rrect(x + 0.5, y + h / 2, w - 1, h / 2 - 0.5, 1.4 * MM) + 'f\n';
    o += `${rgb('#e3b955')} rg ` + rrect(cx, cy, cw, ch, 0.8 * MM) + 'f\n';
    o += `${rgb('#8a6416')} RG 0.45 w ` + rrect(x, y, w, h, 1.6 * MM) + 'S\n';
    o += rrect(cx, cy, cw, ch, 0.8 * MM) + 'S\n';
    for (const f of [1 / 3, 2 / 3]) {
      const ly = y + h * f;
      o += `${n(x)} ${n(ly)} m ${n(cx)} ${n(ly)} l S ${n(cx + cw)} ${n(ly)} m ${n(x + w)} ${n(ly)} l S\n`;
    }
    o += `${n(x + w / 2)} ${n(y)} m ${n(x + w / 2)} ${n(cy)} l S ${n(x + w / 2)} ${n(cy + ch)} m ${n(x + w / 2)} ${n(y + h)} l S\n`;
    return o;
  }
  // Contactless symbol: three widening arcs.
  function waves(x, y, size, color) {
    let o = `${rgb(color)} RG ${n(size * 0.11)} w 1 J\n`;
    for (let i = 0; i < 4; i++) o += arc(x, y, size * (0.22 + i * 0.26), -38, 38);
    return o + '0 J\n';
  }
  // Front: the "chip card" side. Navy, gold chip, contactless mark, name.
  function front(info, qrFn, x, y) {
    const pad = 11;
    let o = `${rgb('#0b1430')} rg ${n(x)} ${n(y)} ${n(CW)} ${n(CH)} re f\n`;
    // soft diagonal light band
    o += `${rgb('#13235a')} rg ${n(x + CW * 0.48)} ${n(y + CH)} m ${n(x + CW)} ${n(y + CH)} l ${n(x + CW)} ${n(y + CH * 0.12)} l ${n(x + CW * 0.86)} ${n(y)} l ${n(x + CW * 0.66)} ${n(y)} l h f\n`;
    o += `${rgb('#1f5eff')} rg ${n(x)} ${n(y)} ${n(CW)} ${n(2.2)} re f\n`;
    o += brand(x + pad, y + CH - pad - 9, 10.5, true);
    o += waves(x + CW - pad - 13, y + CH - pad - 5.5, 14, '#ffffff');
    o += chip(x + pad, y + CH / 2 - 7);
    const tW = CW - 2 * pad;
    const [nm, ns] = fit(info.name, 12, 8, tW, true);
    let ty = y + pad + 12;
    const sub = [info.title, info.company].filter(Boolean).join(' \u00b7 ');
    if (!sub) ty -= 6;
    o += text(x + pad, ty, nm, ns, true, '#ffffff');
    if (sub) {
      const [t, s] = fit(sub, 7, 5.5, tW, false);
      o += text(x + pad, y + pad + 2, t, s, false, '#b9c6ea');
    }
    return o;
  }
  // Back: white, big QR to scan, link and a tap reminder.
  function back(info, qrFn, x, y) {
    const pad = 11,
      qs = 36 * MM,
      qx = x + CW - pad - qs + 2,
      qy = y + (CH - qs) / 2;
    const tW = qx - x - pad - 6;
    let o = `1 1 1 rg ${n(x)} ${n(y)} ${n(CW)} ${n(CH)} re f\n`;
    o += outline(x, y);
    o += brand(x + pad, y + CH - pad - 10, 10, false);
    o += text(x + pad, y + CH / 2 + 4, 'Scan or tap', 11, true, '#101828');
    o += text(x + pad, y + CH / 2 - 8, 'to connect with me', 8, false, '#344054');
    o += waves(x + pad + 4, y + pad + 13, 9, '#1f5eff');
    const [lk, ls] = fit(info.link, 7, 5, tW, false);
    o += text(x + pad, y + pad, lk, ls, false, '#475467');
    o += qrPath(qrFn, info.url, qx, qy, qs);
    return o;
  }
  function marks(x, y) {
    const L = 4 * MM,
      g = 1.5 * MM;
    let o = '0.6 0.6 0.6 RG 0.3 w\n';
    for (const [cx, sx] of [
      [x, -1],
      [x + CW, 1]
    ])
      for (const [cy, sy] of [
        [y, -1],
        [y + CH, 1]
      ])
        o += `${n(cx + sx * g)} ${n(cy)} m ${n(cx + sx * (g + L))} ${n(cy)} l S ${n(cx)} ${n(cy + sy * g)} m ${n(cx)} ${n(cy + sy * (g + L))} l S\n`;
    return o;
  }
  function outline(x, y) {
    return `0.85 0.87 0.91 RG 0.4 w ${n(x)} ${n(y)} ${n(CW)} ${n(CH)} re S\n`;
  }
  function cardPdf(raw, qrFn) {
    const info = {
      name: clean(raw.name) || clean(raw.handle),
      title: clean(raw.title),
      company: clean(raw.company),
      url: String(raw.url),
      link: clean(
        String(raw.url)
          .replace(/^https?:\/\/(www\.)?/, '')
          .replace(/\?.*$/, '')
      )
    };
    const pages = [];
    // page 1: actual size, front above back
    let p = text(56, PH - 64, 'Your Introthread card', 16, true, '#101828');
    p += text(
      56,
      PH - 84,
      'Print at 100% (Actual size), then cut along the marks. 85 x 55 mm, standard business card.',
      9,
      false,
      '#475467'
    );
    p += text(
      56,
      PH - 98,
      'For several cards, use page 2 (fronts) and page 3 (backs, print double-sided and flip on the long edge).',
      9,
      false,
      '#475467'
    );
    const x1 = (PW - CW) / 2;
    p += front(info, qrFn, x1, PH - 140 - CH) + marks(x1, PH - 140 - CH);
    p += back(info, qrFn, x1, PH - 180 - 2 * CH) + marks(x1, PH - 180 - 2 * CH);
    p += text(
      56,
      120,
      'Want people to tap instead of scan? Stick a blank NFC sticker or card (NTAG213, 215 or 216) on the back',
      9,
      false,
      '#475467'
    );
    p += text(
      56,
      106,
      'and write your link to it: in the Introthread app, open Tap, then NFC, then Write my own card.',
      9,
      false,
      '#475467'
    );
    p += text(56, 92, 'Your link: ' + info.link, 9, true, '#101828');
    pages.push(p);
    const mx = (PW - 2 * CW) / 2,
      my = (PH - 5 * CH) / 2;
    let f = '',
      b = '';
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 2; c++) {
        const y = my + r * CH;
        f += front(info, qrFn, mx + c * CW, y);
        b += back(info, qrFn, mx + (1 - c) * CW, y);
      }
    let cm = '';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) cm += marks(mx + c * CW, my + r * CH);
    pages.push(f + cm, b + cm);
    // assemble
    const objs = [];
    const add = s => (objs.push(s), objs.length);
    const cat = add(''),
      pagesId = add(''),
      f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
      f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = [];
    for (const c of pages) {
      const cs = add(`<< /Length ${c.length} >>\nstream\n${c}endstream`);
      kids.push(
        add(
          `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cs} 0 R >>`
        )
      );
    }
    objs[cat - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objs[pagesId - 1] =
      `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
    let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
    const off = [];
    objs.forEach((o, i) => {
      off.push(out.length);
      out += `${i + 1} 0 obj\n${o}\nendobj\n`;
    });
    const xr = out.length;
    out +=
      `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` +
      off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    out += `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R /Info << /Title (Introthread card) /Producer (Introthread) >> >>\nstartxref\n${xr}\n%%EOF\n`;
    return out;
  }
  const api = { cardPdf, cleanPdfText: clean };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : this);

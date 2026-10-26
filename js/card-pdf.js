// Introthread - printable card PDF (v141). Shared by the browser (download in the NFC panel) and the server
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
  function front(info, qrFn, x, y) {
    const pad = 11,
      qs = 34 * MM,
      qx = x + CW - pad - qs,
      qy = y + (CH - qs) / 2 + 4;
    const tW = qx - x - pad - 8;
    let o = '';
    const [nm, ns] = fit(info.name, 13, 8.5, tW, true);
    o += text(x + pad, y + CH - pad - 12, nm, ns, true, '#101828');
    let ty = y + CH - pad - 12 - 13;
    for (const line of [info.title, info.company].filter(Boolean)) {
      const [t, s] = fit(line, 8, 6, tW, false);
      o += text(x + pad, ty, t, s, false, line === info.company ? '#667085' : '#344054');
      ty -= 10.5;
    }
    o += brand(x + pad, y + pad + 11, 9.5, false);
    const [lk, ls] = fit(info.link, 7, 5.5, tW, false);
    o += text(x + pad, y + pad, lk, ls, false, '#475467');
    o += qrPath(qrFn, info.url, qx, qy, qs);
    const cap = 'Scan to connect';
    o += text(qx + (qs - tw(cap, 6, false)) / 2, qy - 9, cap, 6, false, '#667085');
    return o;
  }
  function back(info, x, y) {
    let o = `${rgb('#0b1430')} rg ${n(x)} ${n(y)} ${n(CW)} ${n(CH)} re f\n`;
    const bs = 17,
      bw = tw('introthread', bs, true);
    o += brand(x + (CW - bw) / 2, y + CH / 2 + 8, bs, true);
    const a = 'Tap or scan to connect';
    o += text(x + (CW - tw(a, 8.5, false)) / 2, y + CH / 2 - 10, a, 8.5, false, '#ffffff');
    const [lk, ls] = fit(info.link, 7.5, 5.5, CW - 24, false);
    o += text(x + (CW - tw(lk, ls, false)) / 2, y + CH / 2 - 24, lk, ls, false, '#b9c6ea');
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
    p += outline(x1, PH - 140 - CH) + front(info, qrFn, x1, PH - 140 - CH) + marks(x1, PH - 140 - CH);
    p += back(info, x1, PH - 180 - 2 * CH) + marks(x1, PH - 180 - 2 * CH);
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
        f += outline(mx + c * CW, y) + front(info, qrFn, mx + c * CW, y);
        b += back(info, mx + (1 - c) * CW, y);
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

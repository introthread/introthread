// Shared helpers for Introthread server functions (Vercel). No secrets in code: all keys come from Vercel environment variables.
const SB_URL = process.env.SUPABASE_URL || 'https://zpcsmsqnesqftodnondn.supabase.co';
const SITE = process.env.SITE_URL || 'https://www.introthread.com';
const FROM = process.env.NOTIFY_FROM || 'Introthread <hello@introthread.com>';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function first(n) { return String(n || '').trim().split(/\s+/)[0] || 'there'; }
// where_met may carry packed metadata after " @@{json}"; strip it for display.
function place(w) { return String(w || 'In person').split(' @@')[0].trim() || 'In person'; }
function send(res, code, body) { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return await new Promise(r => { let d = ''; req.on('data', c => { d += c; if (d.length > 20000) d = d.slice(0, 20000); }); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch (e) { r({}); } }); req.on('error', () => r({})); });
}
function isUuid(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '')); }

// Calls Supabase as the signed-in person (row-level security decides what they can see).
function asUser(token, anon) {
  const h = { apikey: anon, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  return {
    async user() { const r = await fetch(SB_URL + '/auth/v1/user', { headers: h }); return r.ok ? r.json() : null; },
    async get(path) { const r = await fetch(SB_URL + '/rest/v1/' + path, { headers: h }); return r.ok ? r.json() : null; },
    async rpc(fn, args) { const r = await fetch(SB_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: h, body: JSON.stringify(args || {}) }); return r.ok ? r.json() : null; },
    async post(table, row) { const r = await fetch(SB_URL + '/rest/v1/' + table, { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(row) }); return r.ok; },
  };
}
// Reads the caller's token and the public anon key (the anon key is public; it ships in config.js).
async function caller(req) {
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const anon = String(req.headers.apikey || process.env.SUPABASE_ANON_KEY || '');
  if (!token || !anon || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(anon)) return null;
  const db = asUser(token, anon);
  const u = await db.user();
  return u && u.id ? { db, user: u } : null;
}
async function sendEmail({ to, subject, html, text, replyTo, attachments }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: 'not_configured' };
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: FROM, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}), ...(attachments ? { attachments } : {}) }) });
  return { ok: r.ok, status: r.status };
}
// Simple, brand-consistent email shell (sans-serif only, no images, works in every client).
function layout(title, bodyHtml, cta, ctaUrl, footer) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:sans-serif;color:#0f1218"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;border:1px solid #e3e7ef"><tr><td style="padding:28px 28px 8px;font-weight:800;font-size:15px;color:#3157ff">Introthread</td></tr><tr><td style="padding:4px 28px 0"><h1 style="font-size:21px;line-height:1.3;margin:0 0 12px">${title}</h1>${bodyHtml}${cta ? `<p style="margin:22px 0 6px"><a href="${ctaUrl}" style="display:inline-block;background:#3157ff;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${cta}</a></p>` : ''}</td></tr><tr><td style="padding:18px 28px 26px;font-size:12px;line-height:1.5;color:#6b7385">${footer || ''}</td></tr></table></td></tr></table></body></html>`;
}

// Security guard for every browser-called function (see SECURITY-AUDIT.md):
//  - same-site only: a browser request from another website (Origin header not ours) is refused, so other
//    sites cannot call our API with a visitor's token (CORS is not opened to anyone);
//  - rate limit per IP address and route (sliding window, kept in memory per server instance; Vercel may run
//    several instances, so this is a first line of defence, not an exact quota);
//  - preflight (OPTIONS) requests are refused because no cross-site use is allowed.
const ORIGINS = new Set([SITE, 'https://introthread.com', 'https://www.introthread.com'].concat(String(process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean)));
const HITS = new Map();
function clientIp(req) { return String(req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || 'unknown').trim(); }
function guard(req, res, { max = 30, windowMs = 60000, sameSite = true } = {}) {
  if (req.method === 'OPTIONS') { send(res, 405, { error: 'method' }); return false; }
  const origin = String(req.headers.origin || '');
  if (sameSite && origin && !ORIGINS.has(origin)) { send(res, 403, { error: 'origin' }); return false; }
  const key = clientIp(req) + ' ' + String(req.url || '').split('?')[0], now = Date.now();
  const list = (HITS.get(key) || []).filter(t => now - t < windowMs);
  if (list.length >= max) { res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000))); send(res, 429, { error: 'rate_limited' }); return false; }
  list.push(now); HITS.set(key, list);
  if (HITS.size > 5000) for (const [k, v] of HITS) if (!v.length || now - v[v.length - 1] > windowMs) HITS.delete(k);
  return true;
}
module.exports = { SB_URL, SITE, esc, first, place, send, readBody, isUuid, caller, sendEmail, layout, guard };

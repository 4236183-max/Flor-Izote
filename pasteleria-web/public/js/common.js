const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + Number(n || 0).toFixed(2);
const fdate = (d) => (d ? new Date(d).toLocaleString('es-SV', { timeZone: 'America/El_Salvador', dateStyle: 'short', timeStyle: 'short' }) : '');
const fday = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const badge = (e) => `<span class="status st-${esc(String(e).replace(/ /g, '-'))}">${esc(e)}</span>`;
const icons = () => window.lucide && window.lucide.createIcons();

async function api(url, opts = {}) {
  const o = { credentials: 'same-origin', ...opts };
  if (o.body && !(o.body instanceof FormData)) {
    o.headers = { 'Content-Type': 'application/json', ...(o.headers || {}) };
    o.body = JSON.stringify(o.body);
  }
  const r = await fetch(url, o);
  let data = null;
  try { data = await r.json(); } catch (_) { /* sin cuerpo */ }
  if (r.status === 401 && url.startsWith('/api/admin')) { location.href = '/admin/login'; throw new Error('Sesión expirada'); }
  if (!r.ok) throw new Error((data && data.error) || `Error ${r.status}`);
  return data;
}

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'err' ? 'err' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

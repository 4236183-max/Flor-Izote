const EMOJI = { Pasteles: '🎂', Cupcakes: '🧁', Galletas: '🍪', Postres: '🍮', Tartas: '🥧', 'Productos especiales': '🎁' };
const state = { productos: [], categorias: [], cat: 'all', q: '', orden: 'destacados', cart: [], seg: null };

try { state.cart = JSON.parse(localStorage.getItem('cart') || '[]'); } catch (_) { state.cart = []; }
const saveCart = () => { try { localStorage.setItem('cart', JSON.stringify(state.cart)); } catch (_) { /* ignorar */ } };

/* ---------- Catálogo ---------- */
window.fotoRota = (img, e) => { const d = document.createElement('span'); d.className = 'ph'; d.textContent = e; img.replaceWith(d); };
const emojiDe = (p) => EMOJI[p.categoria] || '🍰';
const foto = (p) => (p.imagen_url ? `<img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy" onerror="fotoRota(this,'${emojiDe(p)}')">` : `<span class="ph">${emojiDe(p)}</span>`);

function card(p) {
  return `<article class="card"><button class="img" data-ver="${p.id}" aria-label="Ver ${esc(p.nombre)}">${foto(p)}</button><div class="body">
    ${p.categoria ? `<span class="chip">${esc(p.categoria)}</span>` : ''}<h3 data-ver="${p.id}">${esc(p.nombre)}</h3><p>${esc(p.descripcion || '')}</p>
    <div class="row"><span class="price">${money(p.precio)}</span>
    ${p.disponible ? `<button class="btn sm" data-add="${p.id}"><i data-lucide="plus" class="icon"></i> Agregar</button>` : '<span class="chip">Agotado</span>'}</div></div></article>`;
}

const ORDEN = {
  destacados: (a, b) => Number(b.destacado) - Number(a.destacado) || a.nombre.localeCompare(b.nombre),
  menor: (a, b) => a.precio - b.precio,
  mayor: (a, b) => b.precio - a.precio,
  nombre: (a, b) => a.nombre.localeCompare(b.nombre),
};

function renderCatalog() {
  const dest = state.productos.filter((p) => p.destacado).slice(0, 4);
  $('#destacados').innerHTML = dest.map(card).join('') || '<p class="section-sub">Pronto habrá favoritos.</p>';
  $('#categorias').innerHTML = state.categorias.map((c) => {
    const ps = state.productos.filter((p) => p.categoria_id === c.id);
    const conFoto = ps.find((p) => p.imagen_url);
    const img = conFoto ? `<img src="${esc(conFoto.imagen_url)}" alt="" loading="lazy" onerror="fotoRota(this,'${EMOJI[c.nombre] || '🍰'}')">` : (EMOJI[c.nombre] || '🍰');
    return `<button class="tile" data-cat="${c.id}"><span class="tile-img">${img}</span><b>${esc(c.nombre)}</b><small>${ps.length} producto${ps.length === 1 ? '' : 's'}</small></button>`;
  }).join('');
  const cats = [{ id: 'all', nombre: 'Todos' }, ...state.categorias];
  $('#filtro').innerHTML = cats.map((c) => `<button class="${String(state.cat) === String(c.id) ? 'on' : ''}" data-cat="${c.id}">${esc(c.nombre)}</button>`).join('');
  const q = state.q.toLowerCase();
  const list = state.productos
    .filter((p) => (state.cat === 'all' || String(p.categoria_id) === String(state.cat)) && (!q || (p.nombre + ' ' + (p.descripcion || '')).toLowerCase().includes(q)))
    .sort(ORDEN[state.orden] || ORDEN.destacados);
  $('#productos').innerHTML = list.map(card).join('');
  $('#vacio').classList.toggle('hidden', list.length > 0);
  icons();
}

async function loadCatalog() {
  try {
    const d = await api('/api/public/productos');
    state.productos = d.productos; state.categorias = d.categorias;
    // sincroniza carrito con catálogo actual
    state.cart = state.cart.map((c) => { const p = d.productos.find((x) => x.id === c.id && x.disponible); return p ? { ...c, nombre: p.nombre, precio: p.precio } : null; }).filter(Boolean);
    saveCart(); renderCatalog(); renderCart();
  } catch (e) { toast(e.message, 'err'); }
}

function verProducto(id) {
  const p = state.productos.find((x) => x.id === id);
  if (!p) return;
  let n = 1;
  openModal(`<div class="pm"><div class="pm-img">${foto(p)}</div><div>
    ${p.categoria ? `<span class="chip">${esc(p.categoria)}</span>` : ''}<h3>${esc(p.nombre)}</h3><p>${esc(p.descripcion || 'Elaborado artesanalmente.')}</p>
    <p class="price">${money(p.precio)}</p>
    ${p.disponible ? `<div class="qty" style="margin-bottom:14px"><button type="button" id="pmMenos">−</button><b id="pmN">1</b><button type="button" id="pmMas">+</button></div>
    <div class="actions" style="justify-content:flex-start"><button class="btn rosa" id="pmAdd"><i data-lucide="shopping-bag" class="icon"></i> Agregar al carrito</button><button class="btn ghost" type="button" onclick="closeModal()">Cerrar</button></div>` : '<span class="chip">Agotado por ahora</span>'}
  </div></div>`);
  if (!p.disponible) return;
  $('#pmMenos').onclick = () => { n = Math.max(1, n - 1); $('#pmN').textContent = n; };
  $('#pmMas').onclick = () => { n = Math.min(100, n + 1); $('#pmN').textContent = n; };
  $('#pmAdd').onclick = () => { addToCart(p.id, n); closeModal(); drawer(true); };
}

document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add) { addToCart(Number(add.dataset.add)); return; }
  const ver = e.target.closest('[data-ver]');
  if (ver) { verProducto(Number(ver.dataset.ver)); return; }
  const cat = e.target.closest('[data-cat]');
  if (cat) { state.cat = cat.dataset.cat; renderCatalog(); if (cat.closest('#categorias')) $('#catalogo').scrollIntoView(); }
});
$('#buscar').addEventListener('input', (e) => { state.q = e.target.value; renderCatalog(); });
$('#orden').addEventListener('change', (e) => { state.orden = e.target.value; renderCatalog(); });

/* ---------- Carrito ---------- */
function addToCart(id, n = 1) {
  const p = state.productos.find((x) => x.id === id);
  if (!p) return;
  const l = state.cart.find((c) => c.id === id);
  if (l) l.cantidad = Math.min(100, l.cantidad + n); else state.cart.push({ id, nombre: p.nombre, precio: p.precio, cantidad: n });
  saveCart(); renderCart(); toast(`${p.nombre} agregado`);
}
const cartTotal = () => state.cart.reduce((s, c) => s + c.precio * c.cantidad, 0);

function renderCart() {
  const n = state.cart.reduce((s, c) => s + c.cantidad, 0);
  $('#cartCount').textContent = n; $('#cartCount').classList.toggle('hidden', n === 0);
  $('#cartItems').innerHTML = state.cart.length ? state.cart.map((c) => `<div class="line"><div><b>${esc(c.nombre)}</b><br><small>${money(c.precio)} c/u</small></div>
    <div class="qty"><button data-q="-1" data-id="${c.id}">−</button><b>${c.cantidad}</b><button data-q="1" data-id="${c.id}">+</button></div>
    <b>${money(c.precio * c.cantidad)}</b><button class="iconbtn" data-del="${c.id}" aria-label="Quitar"><i data-lucide="trash-2" class="icon"></i></button></div>`).join('') : '<p class="section-sub">Tu carrito está vacío.</p>';
  $('#cartSub').textContent = $('#cartTotal').textContent = money(cartTotal());
  $('#goCheckout').disabled = !state.cart.length;
  icons();
}
$('#cartItems').addEventListener('click', (e) => {
  const q = e.target.closest('[data-q]'), d = e.target.closest('[data-del]');
  if (q) { const l = state.cart.find((c) => c.id === Number(q.dataset.id)); l.cantidad += Number(q.dataset.q); if (l.cantidad < 1) state.cart = state.cart.filter((c) => c !== l); if (l.cantidad > 100) l.cantidad = 100; }
  if (d) state.cart = state.cart.filter((c) => c.id !== Number(d.dataset.del));
  if (q || d) { saveCart(); renderCart(); }
});
const drawer = (on) => { $('#drawer').classList.toggle('on', on); $('#overlay').classList.toggle('on', on); };
$('#openCart').onclick = () => drawer(true); $('#closeCart').onclick = $('#overlay').onclick = () => drawer(false);
$('#burger').onclick = () => $('#menu').classList.toggle('on');
$('#menu').onclick = () => $('#menu').classList.remove('on');

/* ---------- Modal ---------- */
const openModal = (html) => { $('#modalBox').innerHTML = html; $('#modal').classList.add('on'); icons(); };
const closeModal = () => $('#modal').classList.remove('on');
$('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });

const payForm = (prefix = '') => `
  <label>Método de pago (simulado)</label>
  <div class="pay-opts">
    <label><input type="radio" name="${prefix}metodo" value="Efectivo" checked><span>💵 Efectivo</span></label>
    <label><input type="radio" name="${prefix}metodo" value="Tarjeta"><span>💳 Tarjeta</span></label>
    <label><input type="radio" name="${prefix}metodo" value="Transferencia"><span>🏦 Transferencia</span></label>
  </div>
  <label class="note" style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" name="${prefix}rechazo" style="width:auto"> Simulación académica: rechazar el pago con tarjeta</label>
  <p class="note" style="margin-top:8px">Pago simulado. No ingreses datos de tarjeta ni bancarios: el sistema no los solicita ni los guarda. Efectivo y transferencia quedan pendientes hasta que el negocio los confirme.</p>`;

/* ---------- Checkout ---------- */
$('#goCheckout').onclick = () => {
  drawer(false);
  if (!state.cuenta) { toast('Inicia sesión o crea tu cuenta para pedir'); authModal('registro', () => $('#goCheckout').click()); return; }
  openModal(`<h3>Confirmar pedido</h3>
  <form id="formCheckout">
    <div class="form-grid">
      <p class="note full" style="margin-bottom:12px">Pedido a nombre de <b>${esc(state.cuenta.nombre_completo)}</b> · ${esc(state.cuenta.telefono)}</p>
      <div class="field full"><label>Dirección (para entrega)</label><input name="direccion" maxlength="250" value="${esc(state.cuenta.direccion || '')}"></div>
      <div class="field full"><label>Notas</label><input name="notas" maxlength="500"></div>
    </div>
    ${payForm('c_')}
    <div style="margin-top:14px;font-size:1.15rem;display:flex;justify-content:space-between"><b>Total</b><b>${money(cartTotal())}</b></div>
    <div class="actions"><button type="button" class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn rosa" type="submit">Confirmar y pagar</button></div>
  </form>`);
  $('#formCheckout').onsubmit = submitCheckout;
};

async function submitCheckout(e) {
  e.preventDefault();
  const f = e.target, fd = new FormData(f), btn = f.querySelector('[type=submit]');
  btn.disabled = true;
  try {
    const items = state.cart.map((c) => ({ id: c.id, cantidad: c.cantidad }));
    const ped = await api('/api/public/pedidos', { method: 'POST', body: { direccion: fd.get('direccion'), notas: fd.get('notas'), items } });
    state.cart = []; saveCart(); renderCart();
    let pago = null, errPago = '';
    try {
      const r = await api('/api/public/pagos', { method: 'POST', body: { numero: ped.numero, telefono: state.cuenta.telefono, metodo: fd.get('c_metodo'), simular_rechazo: fd.get('c_rechazo') === 'on' } });
      pago = r.pago;
    } catch (er) { errPago = er.message; }
    const tel = encodeURIComponent(state.cuenta.telefono);
    const msg = pago ? (pago.estado === 'Pagado' ? '✅ Pago aprobado (simulado).' : pago.estado === 'Rechazado' ? '❌ Pago rechazado (simulado). Puedes reintentar en "Consulta tu pedido".' : '⏳ Pago pendiente de confirmación por el negocio.') : `⚠️ ${esc(errPago)}`;
    openModal(`<h3>¡Pedido registrado!</h3><p>Tu número de pedido es <b>${esc(ped.numero)}</b>. Guárdalo junto con tu teléfono para consultarlo.</p>
      <p style="margin:12px 0">${msg}</p><p><b>Total:</b> ${money(ped.total)}</p>
      <div class="actions"><a class="btn ghost" target="_blank" href="/factura.html?numero=${esc(ped.numero)}&telefono=${tel}">Ver factura</a><button class="btn" onclick="closeModal()">Cerrar</button></div>`);
  } catch (er) { toast(er.message, 'err'); btn.disabled = false; }
}

/* ---------- Encargo personalizado ---------- */
const hoy = new Date(); hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
$('#fechaEntrega').min = hoy.toISOString().slice(0, 10);
$('#formEncargo').onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
  try {
    const fd = new FormData(e.target);
    if (!fd.get('imagen') || !fd.get('imagen').size) fd.delete('imagen');
    const r = await api('/api/public/encargos', { method: 'POST', body: fd });
    toast(r.mensaje); e.target.reset();
  } catch (er) { toast(er.message, 'err'); }
  btn.disabled = false;
};

/* ---------- Seguimiento ---------- */
async function consultar() {
  if (!state.seg) return;
  try {
    const p = await api(`/api/public/seguimiento?numero=${encodeURIComponent(state.seg.numero)}&telefono=${encodeURIComponent(state.seg.telefono)}`);
    const pagado = p.pagos.some((x) => x.estado === 'Pagado');
    $('#segResult').innerHTML = `<div class="panel">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><h3>${esc(p.numero)}</h3>${badge(p.estado)}</div>
      <p class="section-sub">${fdate(p.creado_en)} · ${esc(p.nombre_completo)}</p>
      ${p.items.map((i) => `<div class="line"><span>${i.cantidad} × ${esc(i.nombre_producto)}</span><b>${money(i.subtotal)}</b></div>`).join('')}
      <p style="text-align:right;margin:10px 0"><b>Total ${money(p.total)}</b></p>
      <p><b>Pago:</b> ${p.pagos.length ? p.pagos.map((x) => `${esc(x.metodo)} ${badge(x.estado)}`).join(' ') : 'Sin pago registrado'}</p>
      ${!pagado && p.estado !== 'Cancelado' ? `<form id="formPagar" style="margin-top:14px">${payForm('s_')}<button class="btn rosa" style="margin-top:10px" type="submit">Registrar pago</button></form>` : ''}
      <p style="margin-top:14px"><a class="btn ghost sm" target="_blank" href="/factura.html?numero=${esc(p.numero)}&telefono=${encodeURIComponent(state.seg.telefono)}">Ver factura</a></p></div>`;
    const fp = $('#formPagar');
    if (fp) fp.onsubmit = async (e) => {
      e.preventDefault(); const fd = new FormData(fp);
      try { const r = await api('/api/public/pagos', { method: 'POST', body: { ...state.seg, metodo: fd.get('s_metodo'), simular_rechazo: fd.get('s_rechazo') === 'on' } }); toast(`Pago ${r.pago.estado.toLowerCase()}`); consultar(); } catch (er) { toast(er.message, 'err'); }
    };
    icons();
  } catch (e) { $('#segResult').innerHTML = `<p class="note">${esc(e.message)}</p>`; }
}
$('#formSeg').onsubmit = (e) => { e.preventDefault(); const fd = new FormData(e.target); state.seg = { numero: fd.get('numero').trim(), telefono: fd.get('telefono').trim() }; consultar(); };

/* ---------- Tiempo real ---------- */
if (window.io) {
  const sock = io();
  sock.on('productos:cambio', loadCatalog);
  sock.on('pedido:actualizado', (d) => { if (state.seg && state.seg.numero.toUpperCase() === d.numero) consultar(); });
}

/* ---------- Cuenta de cliente ---------- */
state.cuenta = null;
async function loadCuenta() {
  try { state.cuenta = (await api('/api/cuenta/me')).cliente; } catch (_) { state.cuenta = null; }
  renderCuenta();
}
function renderCuenta() {
  const b = $('#btnCuenta');
  if (state.cuenta) {
    b.innerHTML = `<i data-lucide="user" class="icon"></i> ${esc(state.cuenta.nombre_completo.split(' ')[0])}`;
    b.onclick = cuentaMenu;
    const f = $('#formSeg'); if (f && !f.telefono.value) f.telefono.value = state.cuenta.telefono;
  } else { b.innerHTML = '<i data-lucide="log-in" class="icon"></i> Ingresar'; b.onclick = () => authModal('login'); }
  icons();
}
function authModal(mode, after) {
  const reg = mode === 'registro';
  openModal(`<h3>${reg ? 'Crear cuenta' : 'Iniciar sesión'}</h3>
  <form id="formAuth">
    ${reg ? `<div class="field"><label>Nombre completo *</label><input name="nombre_completo" required minlength="3" autocomplete="name"></div>
    <div class="form-grid"><div class="field"><label>Teléfono *</label><input name="telefono" required inputmode="tel" autocomplete="tel"></div>
    <div class="field"><label>Dirección</label><input name="direccion" maxlength="250" autocomplete="street-address"></div></div>` : ''}
    <div class="field"><label>Correo *</label><input type="email" name="email" required autocomplete="email"></div>
    <div class="field"><label>Contraseña * ${reg ? '(mínimo 8 caracteres)' : ''}</label><input type="password" name="password" required minlength="${reg ? 8 : 1}" autocomplete="${reg ? 'new-password' : 'current-password'}"></div>
    <div class="actions" style="justify-content:space-between;align-items:center"><a href="#" id="swap" style="font-size:.85rem">${reg ? 'Ya tengo cuenta' : 'Crear una cuenta nueva'}</a>
    <span style="display:flex;gap:8px"><button type="button" class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn rosa" type="submit">${reg ? 'Registrarme' : 'Entrar'}</button></span></div>
  </form>`);
  $('#swap').onclick = (e) => { e.preventDefault(); authModal(reg ? 'login' : 'registro', after); };
  $('#formAuth').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
    try {
      await api(`/api/cuenta/${reg ? 'registro' : 'login'}`, { method: 'POST', body: Object.fromEntries(new FormData(e.target).entries()) });
      closeModal(); await loadCuenta(); toast(`¡Bienvenido/a, ${state.cuenta.nombre_completo.split(' ')[0]}!`);
      if (after) after();
    } catch (er) { toast(er.message, 'err'); btn.disabled = false; }
  };
}
function cuentaMenu() {
  const c = state.cuenta;
  openModal(`<h3>Mi cuenta</h3><p><b>${esc(c.nombre_completo)}</b><br>${esc(c.email)} · ${esc(c.telefono)}<br>${esc(c.direccion || '')}</p>
    <div class="actions" style="justify-content:flex-start"><button class="btn" id="misPed">Mis pedidos</button><button class="btn ghost" id="salir">Cerrar sesión</button><button class="btn ghost" onclick="closeModal()">Cerrar</button></div>`);
  $('#salir').onclick = async () => { await api('/api/cuenta/logout', { method: 'POST' }); state.cuenta = null; state.seg = null; $('#segResult').innerHTML = ''; closeModal(); renderCuenta(); toast('Sesión cerrada'); };
  $('#misPed').onclick = async () => {
    try {
      const rows = await api('/api/cuenta/pedidos');
      openModal(`<h3>Mis pedidos</h3>${rows.map((p) => `<div class="line"><span><b>${esc(p.numero)}</b><br><small>${fdate(p.creado_en)}</small></span><span>${money(p.total)} ${badge(p.estado)}</span><button class="btn sm" data-seg="${esc(p.numero)}">Ver / pagar</button></div>`).join('') || '<p class="note">Aún no tienes pedidos.</p>'}
        <div class="actions"><button class="btn ghost" onclick="closeModal()">Cerrar</button></div>`);
      $$('[data-seg]').forEach((x) => (x.onclick = () => { state.seg = { numero: x.dataset.seg, telefono: state.cuenta.telefono }; closeModal(); consultar(); $('#seguimiento').scrollIntoView(); }));
    } catch (er) { toast(er.message, 'err'); }
  };
}

$('#yr').textContent = new Date().getFullYear();

/* ---------- Detalles del sitio ---------- */
const SITIO = window.SITIO || {};
if (SITIO.whatsapp) { const w = $('#wa'); w.href = `https://wa.me/${encodeURIComponent(SITIO.whatsapp)}?text=${encodeURIComponent('Hola, quisiera información sobre sus pasteles')}`; w.classList.add('on'); }
if (SITIO.telefono) $('#cTel').textContent = SITIO.telefono;
if (SITIO.correo) $('#cMail').textContent = SITIO.correo;
{ const im = new Image(); im.onerror = () => $('#hero').classList.add('sin-foto'); im.src = '/images/hero.jpg'; }

loadCatalog(); renderCart(); loadCuenta(); icons();

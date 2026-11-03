const C = $('#content');
const ESTADOS_PEDIDO = ['Pendiente', 'En preparación', 'Listo', 'Entregado', 'Cancelado'];
const ESTADOS_ENCARGO = ['Recibido', 'En revisión', 'Cotizado', 'Confirmado', 'En preparación', 'Listo', 'Entregado', 'Cancelado'];
let current = 'dashboard', charts = [];

/* ---------- Modal ---------- */
function modal(title, body, { onSubmit, submit = 'Guardar', wide } = {}) {
  $('#modalBox').style.width = wide ? 'min(760px,100%)' : '';
  $('#modalBox').innerHTML = `<h3>${title}</h3><form id="mf">${body}<div class="actions"><button type="button" class="btn ghost" id="mc">Cerrar</button>${onSubmit ? `<button class="btn rosa" type="submit">${submit}</button>` : ''}</div></form>`;
  $('#modal').classList.add('on'); icons();
  $('#mc').onclick = closeModal;
  $('#mf').onsubmit = async (e) => {
    e.preventDefault(); if (!onSubmit) return;
    const b = e.target.querySelector('[type=submit]'); b.disabled = true;
    try { await onSubmit(new FormData(e.target), e.target); closeModal(); } catch (er) { toast(er.message, 'err'); b.disabled = false; }
  };
}
const closeModal = () => $('#modal').classList.remove('on');
$('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });
const confirmDel = (msg) => window.confirm(msg);
const table = (heads, rows) => `<div class="tablewrap"><table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${heads.length}" style="text-align:center;padding:24px">Sin registros</td></tr>`}</tbody></table></div>`;
const opts = (list, sel) => list.map((o) => `<option ${o === sel ? 'selected' : ''}>${esc(o)}</option>`).join('');

/* ---------- Router ---------- */
const sections = { dashboard, pedidos, productos, categorias, clientes, encargos, pagos, facturas };
async function go() {
  current = (location.hash || '#dashboard').slice(1);
  if (!sections[current]) current = 'dashboard';
  $$('.side [data-s]').forEach((a) => a.classList.toggle('on', a.dataset.s === current));
  $('#side').classList.remove('on');
  charts.forEach((c) => c.destroy()); charts = [];
  try { await sections[current](); } catch (e) { C.innerHTML = `<p class="note">${esc(e.message)}</p>`; }
  icons();
}
$$('.side [data-s]').forEach((a) => (a.onclick = () => { location.hash = a.dataset.s; }));
window.addEventListener('hashchange', go);
$('#tb').onclick = () => $('#side').classList.toggle('on');
$('#logout').onclick = async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/admin/login'; };

/* ---------- Dashboard ---------- */
async function dashboard() {
  const d = await api('/api/admin/dashboard'), t = d.totales;
  const stat = (l, v) => `<div class="stat"><small>${l}</small><b>${v}</b></div>`;
  C.innerHTML = `<h2>Resumen</h2><div class="stats">
    ${stat('Ingresos generados', money(t.ingresos))}${stat('Ventas hoy', money(t.ventas_hoy))}${stat('Ventas del mes', money(t.ventas_mes))}
    ${stat('Pedidos', t.pedidos)}${stat('Pedidos pendientes', t.pendientes)}${stat('Productos', t.productos)}${stat('Clientes', t.clientes)}${stat('Encargos nuevos', t.encargos_nuevos)}</div>
    <div class="two"><div class="panel"><h3>Ventas últimos 7 días</h3><canvas id="c1" height="140"></canvas></div><div class="panel"><h3>Pedidos por estado</h3><canvas id="c2" height="200"></canvas></div></div>
    <div class="two"><div><h3 style="margin-bottom:8px">Pedidos recientes</h3>${table(['Pedido', 'Cliente', 'Total', 'Estado'], d.recientes.map((p) => `<tr><td>${esc(p.numero)}</td><td>${esc(p.cliente)}</td><td>${money(p.total)}</td><td>${badge(p.estado)}</td></tr>`))}</div>
    <div><h3 style="margin-bottom:8px">Más vendidos</h3>${table(['Producto', 'Vendidos'], d.top.map((p) => `<tr><td>${esc(p.nombre)}</td><td>${p.vendidos}</td></tr>`))}</div></div>`;
  const pal = ['#E58FA3', '#C98B5A', '#4B2E26', '#7A4E3F', '#F6C1CC'];
  charts.push(new Chart($('#c1'), { type: 'bar', data: { labels: d.ventasDia.map((x) => x.dia), datasets: [{ label: 'Ventas ($)', data: d.ventasDia.map((x) => x.total), backgroundColor: '#E58FA3', borderRadius: 8 }] }, options: { plugins: { legend: { display: false } } } }));
  charts.push(new Chart($('#c2'), { type: 'doughnut', data: { labels: d.estados.map((x) => x.estado), datasets: [{ data: d.estados.map((x) => x.n), backgroundColor: pal }] } }));
}

/* ---------- Pedidos ---------- */
async function pedidos() {
  C.innerHTML = `<h2>Pedidos</h2><div class="toolbar"><select id="fe"><option value="">Todos los estados</option>${opts(ESTADOS_PEDIDO)}</select></div><div id="tb2"></div>`;
  const load = async () => {
    const rows = await api('/api/admin/pedidos' + ($('#fe').value ? `?estado=${encodeURIComponent($('#fe').value)}` : ''));
    $('#tb2').innerHTML = table(['Pedido', 'Cliente', 'Teléfono', 'Total', 'Estado', 'Pago', 'Fecha', ''], rows.map((p) => `<tr><td><b>${esc(p.numero)}</b></td><td>${esc(p.cliente)}</td><td>${esc(p.telefono)}</td><td>${money(p.total)}</td><td>${badge(p.estado)}</td><td>${p.pago_estado ? badge(p.pago_estado) : '—'}</td><td>${fdate(p.creado_en)}</td><td><button class="btn sm" data-ver="${p.id}">Ver</button></td></tr>`));
    $$('[data-ver]').forEach((b) => (b.onclick = () => verPedido(b.dataset.ver)));
  };
  $('#fe').onchange = load; await load();
}
async function verPedido(id) {
  const p = await api(`/api/admin/pedidos/${id}`);
  modal(`Pedido ${esc(p.numero)}`, `
    <p><b>${esc(p.nombre_completo)}</b> · ${esc(p.telefono)}<br>${esc(p.direccion || 'Sin dirección')}</p>
    ${p.notas ? `<p class="note" style="margin:8px 0">${esc(p.notas)}</p>` : ''}
    <div style="margin:10px 0">${p.items.map((i) => `<div class="line"><span>${i.cantidad} × ${esc(i.nombre_producto)}</span><b>${money(i.subtotal)}</b></div>`).join('')}<p style="text-align:right;margin-top:8px"><b>Total ${money(p.total)}</b></p></div>
    <p><b>Pagos:</b> ${p.pagos.map((x) => `${esc(x.metodo)} ${badge(x.estado)}`).join(' ') || 'Sin pagos'}</p>
    <div class="field" style="margin-top:12px"><label>Estado del pedido</label><select name="estado">${opts(ESTADOS_PEDIDO, p.estado)}</select></div>
    <a class="btn ghost sm" target="_blank" href="/factura.html?numero=${esc(p.numero)}">Ver factura</a>`,
    { wide: true, onSubmit: async (fd) => { await api(`/api/admin/pedidos/${id}/estado`, { method: 'PATCH', body: { estado: fd.get('estado') } }); toast('Estado actualizado'); go(); } });
}

/* ---------- Productos ---------- */
async function productos() {
  const [rows, cats] = await Promise.all([api('/api/admin/productos'), api('/api/admin/categorias')]);
  C.innerHTML = `<h2>Productos</h2><div class="toolbar"><button class="btn rosa" id="nuevo"><i data-lucide="plus" class="icon"></i> Nuevo producto</button></div>` +
    table(['', 'Producto', 'Categoría', 'Precio', 'Activo', 'Disponible', 'Destacado', ''], rows.map((p) => `<tr>
      <td>${p.imagen_url ? `<img class="thumb" src="${esc(p.imagen_url)}" alt="">` : '<div class="thumb">🍰</div>'}</td>
      <td><b>${esc(p.nombre)}</b></td><td>${esc(p.categoria || '—')}</td><td>${money(p.precio)}</td>
      ${['activo', 'disponible', 'destacado'].map((c) => `<td><label class="switch"><input type="checkbox" data-flag="${c}" data-id="${p.id}" ${p[c] ? 'checked' : ''}><i></i></label></td>`).join('')}
      <td><button class="btn sm" data-ed="${p.id}">Editar</button> <button class="btn sm bad" data-del="${p.id}">Eliminar</button></td></tr>`));
  const form = (p = {}) => `<div class="form-grid">
    <div class="field"><label>Nombre *</label><input name="nombre" required value="${esc(p.nombre || '')}"></div>
    <div class="field"><label>Precio ($) *</label><input name="precio" type="number" step="0.01" min="0" required value="${p.precio ?? ''}"></div>
    <div class="field"><label>Categoría</label><select name="categoria_id"><option value="">Sin categoría</option>${cats.map((c) => `<option value="${c.id}" ${c.id === p.categoria_id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></div>
    <div class="field"><label>Fotografía</label><input type="file" name="imagen" accept="image/jpeg,image/png,image/webp"></div>
    <div class="field full"><label>Descripción</label><textarea name="descripcion">${esc(p.descripcion || '')}</textarea></div>
    <label><input type="checkbox" name="activo" value="true" style="width:auto" ${p.activo !== false ? 'checked' : ''}> Activo (visible)</label>
    <label><input type="checkbox" name="disponible" value="true" style="width:auto" ${p.disponible !== false ? 'checked' : ''}> Disponible</label>
    <label><input type="checkbox" name="destacado" value="true" style="width:auto" ${p.destacado ? 'checked' : ''}> Destacado</label>
    ${p.imagen_url ? `<label><input type="checkbox" name="quitar_imagen" value="true" style="width:auto"> Quitar imagen actual</label>` : ''}</div>`;
  const send = (url, method) => async (fd, f) => {
    ['activo', 'disponible', 'destacado'].forEach((k) => { if (!f[k].checked) fd.set(k, 'false'); });
    if (!fd.get('imagen') || !fd.get('imagen').size) fd.delete('imagen');
    await api(url, { method, body: fd }); toast('Producto guardado'); go();
  };
  $('#nuevo').onclick = () => modal('Nuevo producto', form(), { wide: true, onSubmit: send('/api/admin/productos', 'POST') });
  $$('[data-ed]').forEach((b) => (b.onclick = () => { const p = rows.find((x) => x.id === Number(b.dataset.ed)); modal('Editar producto', form(p), { wide: true, onSubmit: send(`/api/admin/productos/${p.id}`, 'PUT') }); }));
  $$('[data-del]').forEach((b) => (b.onclick = async () => { if (!confirmDel('¿Eliminar este producto?')) return; try { await api(`/api/admin/productos/${b.dataset.del}`, { method: 'DELETE' }); toast('Producto eliminado'); go(); } catch (e) { toast(e.message, 'err'); } }));
  $$('[data-flag]').forEach((i) => (i.onchange = async () => { try { await api(`/api/admin/productos/${i.dataset.id}/flag`, { method: 'PATCH', body: { campo: i.dataset.flag, valor: i.checked } }); toast('Actualizado'); } catch (e) { toast(e.message, 'err'); i.checked = !i.checked; } }));
}

/* ---------- Categorías ---------- */
async function categorias() {
  const rows = await api('/api/admin/categorias');
  C.innerHTML = `<h2>Categorías</h2><div class="toolbar"><button class="btn rosa" id="nuevo"><i data-lucide="plus" class="icon"></i> Nueva categoría</button></div>` +
    table(['Nombre', 'Descripción', 'Productos', ''], rows.map((c) => `<tr><td><b>${esc(c.nombre)}</b></td><td>${esc(c.descripcion || '')}</td><td>${c.productos}</td><td><button class="btn sm" data-ed="${c.id}">Editar</button> <button class="btn sm bad" data-del="${c.id}">Eliminar</button></td></tr>`));
  const form = (c = {}) => `<div class="field"><label>Nombre *</label><input name="nombre" required value="${esc(c.nombre || '')}"></div><div class="field"><label>Descripción</label><input name="descripcion" value="${esc(c.descripcion || '')}"></div>`;
  const body = (fd) => ({ nombre: fd.get('nombre'), descripcion: fd.get('descripcion') });
  $('#nuevo').onclick = () => modal('Nueva categoría', form(), { onSubmit: async (fd) => { await api('/api/admin/categorias', { method: 'POST', body: body(fd) }); go(); } });
  $$('[data-ed]').forEach((b) => (b.onclick = () => { const c = rows.find((x) => x.id === Number(b.dataset.ed)); modal('Editar categoría', form(c), { onSubmit: async (fd) => { await api(`/api/admin/categorias/${c.id}`, { method: 'PUT', body: body(fd) }); go(); } }); }));
  $$('[data-del]').forEach((b) => (b.onclick = async () => { if (!confirmDel('¿Eliminar categoría? Sus productos quedarán sin categoría.')) return; try { await api(`/api/admin/categorias/${b.dataset.del}`, { method: 'DELETE' }); go(); } catch (e) { toast(e.message, 'err'); } }));
}

/* ---------- Clientes ---------- */
async function clientes() {
  C.innerHTML = `<h2>Clientes</h2><div class="toolbar"><input id="q" placeholder="Buscar por nombre o teléfono"><button class="btn rosa" id="nuevo"><i data-lucide="plus" class="icon"></i> Nuevo cliente</button></div><div id="tb2"></div>`;
  const form = (c = {}) => `<div class="field"><label>Nombre completo *</label><input name="nombre_completo" required value="${esc(c.nombre_completo || '')}"></div><div class="field"><label>Teléfono *</label><input name="telefono" required value="${esc(c.telefono || '')}"></div><div class="field"><label>Dirección</label><input name="direccion" value="${esc(c.direccion || '')}"></div>`;
  const body = (fd) => Object.fromEntries(fd.entries());
  const load = async () => {
    const rows = await api('/api/admin/clientes?q=' + encodeURIComponent($('#q').value));
    $('#tb2').innerHTML = table(['Nombre', 'Teléfono', 'Correo', 'Cuenta', 'Dirección', 'Registro', 'Pedidos', ''], rows.map((c) => `<tr><td><b>${esc(c.nombre_completo)}</b></td><td>${esc(c.telefono)}</td><td>${esc(c.email || '—')}</td><td>${c.tiene_cuenta ? 'Sí' : 'No'}</td><td>${esc(c.direccion || '')}</td><td>${fday(c.creado_en)}</td><td>${c.pedidos}</td><td><button class="btn sm" data-ed="${c.id}">Editar / historial</button></td></tr>`));
    $$('[data-ed]').forEach((b) => (b.onclick = async () => {
      const c = await api(`/api/admin/clientes/${b.dataset.ed}`);
      modal('Cliente', form(c) + `<h4 style="margin:12px 0 6px">Historial de pedidos</h4>${c.historial.map((p) => `<div class="line"><span>${esc(p.numero)} · ${fdate(p.creado_en)}</span><span>${money(p.total)} ${badge(p.estado)}</span></div>`).join('') || '<p class="note">Sin pedidos</p>'}`,
        { wide: true, onSubmit: async (fd) => { await api(`/api/admin/clientes/${c.id}`, { method: 'PUT', body: body(fd) }); toast('Cliente actualizado'); load(); } });
    }));
  };
  let tm; $('#q').oninput = () => { clearTimeout(tm); tm = setTimeout(load, 300); };
  $('#nuevo').onclick = () => modal('Nuevo cliente', form(), { onSubmit: async (fd) => { await api('/api/admin/clientes', { method: 'POST', body: body(fd) }); toast('Cliente registrado'); load(); } });
  await load();
}

/* ---------- Encargos ---------- */
async function encargos() {
  const rows = await api('/api/admin/encargos');
  C.innerHTML = '<h2>Encargos personalizados</h2>' + table(['#', 'Cliente', 'Teléfono', 'Entrega', 'Porciones', 'Estado', 'Precio est.', ''], rows.map((e) => `<tr><td>${e.id}</td><td><b>${esc(e.nombre_cliente)}</b></td><td>${esc(e.telefono)}</td><td>${fday(e.fecha_entrega)}</td><td>${e.porciones}</td><td>${badge(e.estado)}</td><td>${e.precio_estimado != null ? money(e.precio_estimado) : '—'}</td><td><button class="btn sm" data-ver="${e.id}">Gestionar</button></td></tr>`));
  $$('[data-ver]').forEach((b) => (b.onclick = () => {
    const e = rows.find((x) => x.id === Number(b.dataset.ver));
    modal(`Encargo #${e.id}`, `<p><b>${esc(e.nombre_cliente)}</b> · ${esc(e.telefono)}</p>
      <p>${esc(e.tamano)} · ${e.porciones} porciones · ${esc(e.sabor)} / ${esc(e.relleno)} / ${esc(e.cobertura)}<br>Entrega: <b>${fday(e.fecha_entrega)}</b></p>
      <p class="note" style="margin:8px 0"><b>Diseño:</b> ${esc(e.diseno)}${e.dedicatoria ? `<br><b>Dedicatoria:</b> ${esc(e.dedicatoria)}` : ''}${e.observaciones ? `<br><b>Obs.:</b> ${esc(e.observaciones)}` : ''}</p>
      ${e.imagen_referencia_url ? `<a href="${esc(e.imagen_referencia_url)}" target="_blank"><img src="${esc(e.imagen_referencia_url)}" alt="Referencia" style="max-height:200px;border-radius:12px;margin-bottom:10px"></a>` : ''}
      <div class="form-grid"><div class="field"><label>Estado</label><select name="estado">${opts(ESTADOS_ENCARGO, e.estado)}</select></div><div class="field"><label>Precio estimado ($)</label><input name="precio_estimado" type="number" step="0.01" min="0" value="${e.precio_estimado ?? ''}"></div></div>
      <div class="field"><label>Notas internas</label><textarea name="notas_admin">${esc(e.notas_admin || '')}</textarea></div>
      <button type="button" class="btn sm bad" id="del">Eliminar encargo</button>`,
      { wide: true, onSubmit: async (fd) => { await api(`/api/admin/encargos/${e.id}`, { method: 'PUT', body: Object.fromEntries(fd.entries()) }); toast('Encargo actualizado'); go(); } });
    $('#del').onclick = async () => { if (!confirmDel('¿Eliminar encargo?')) return; await api(`/api/admin/encargos/${e.id}`, { method: 'DELETE' }); closeModal(); go(); };
  }));
}

/* ---------- Pagos ---------- */
async function pagos() {
  const rows = await api('/api/admin/pagos');
  C.innerHTML = '<h2>Pagos (simulados)</h2>' + table(['#', 'Pedido', 'Cliente', 'Método', 'Monto', 'Estado', 'Fecha', ''], rows.map((p) => `<tr><td>${p.id}</td><td>${esc(p.pedido)}</td><td>${esc(p.cliente)}</td><td>${esc(p.metodo)}</td><td>${money(p.monto)}</td><td>${badge(p.estado)}</td><td>${fdate(p.fecha)}</td>
    <td>${p.estado !== 'Pagado' ? `<button class="btn sm ok" data-e="Pagado" data-id="${p.id}">Marcar pagado</button> ` : ''}${p.estado === 'Pendiente' ? `<button class="btn sm bad" data-e="Rechazado" data-id="${p.id}">Rechazar</button>` : ''}</td></tr>`));
  $$('[data-e]').forEach((b) => (b.onclick = async () => { try { await api(`/api/admin/pagos/${b.dataset.id}/estado`, { method: 'PATCH', body: { estado: b.dataset.e } }); toast('Pago actualizado'); go(); } catch (e) { toast(e.message, 'err'); } }));
}

/* ---------- Facturas ---------- */
async function facturas() {
  const rows = await api('/api/admin/facturas');
  C.innerHTML = '<h2>Facturas</h2>' + table(['Factura', 'Pedido', 'Cliente', 'Fecha', 'Total', 'Pago', ''], rows.map((f) => `<tr><td>FAC-${String(f.numero).padStart(6, '0')}</td><td>${esc(f.pedido)}</td><td>${esc(f.cliente)}</td><td>${fdate(f.fecha_emision)}</td><td>${money(f.total)}</td><td>${badge(f.pago_estado)}</td><td><a class="btn sm" target="_blank" href="/factura.html?numero=${esc(f.pedido)}">Abrir</a></td></tr>`));
}

/* ---------- Tiempo real ---------- */
if (window.io) {
  let t;
  const refresh = () => { clearTimeout(t); t = setTimeout(() => { if (!$('#modal').classList.contains('on')) go(); }, 600); };
  const sock = io();
  sock.on('pedido:nuevo', (d) => { toast(`🧁 Nuevo pedido ${d.numero} (${money(d.total)})`); refresh(); });
  sock.on('encargo:nuevo', (d) => { toast(`🎂 Nuevo encargo de ${d.cliente}`); refresh(); });
  sock.on('pago:actualizado', (d) => { toast(`💳 Pago ${d.estado} · ${d.numero}`); refresh(); });
  sock.on('pedido:actualizado', refresh);
}

go();

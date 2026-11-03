const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { wrap, HttpError } = require('../utils/http');
const V = require('../utils/validate');

const DUMMY = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5H3nJ4uV3Yq1l8W1b1u1b1u1b1u1b1u';
const pub = (c) => ({ id: c.id, nombre_completo: c.nombre_completo, email: c.email, telefono: c.telefono, direccion: c.direccion });
const promisify = (fn) => new Promise((resolve, reject) => fn((e) => (e ? reject(e) : resolve())));

async function iniciar(req, id) {
  await promisify((cb) => req.session.regenerate(cb));
  req.session.cliente = { id };
  await promisify((cb) => req.session.save(cb));
}

exports.registro = wrap(async (req, res) => {
  const b = req.body;
  const nombre = V.text(b.nombre_completo, 'Nombre completo', { min: 3, max: 120 });
  const email = V.text(b.email, 'Correo', { max: 120 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Correo no válido');
  const telefono = V.phone(b.telefono);
  const direccion = V.text(b.direccion, 'Dirección', { max: 250, required: false });
  const pass = V.text(b.password, 'Contraseña', { min: 8, max: 100 });
  if ((await query('SELECT 1 FROM clientes WHERE lower(email)=$1', [email])).rowCount) throw new HttpError(409, 'Ya existe una cuenta con ese correo');
  const hash = await bcrypt.hash(pass, 12);
  const ex = (await query('SELECT id,password_hash FROM clientes WHERE telefono=$1', [telefono])).rows[0];
  let c;
  if (ex) {
    if (ex.password_hash) throw new HttpError(409, 'Ya existe una cuenta con ese teléfono');
    // El teléfono ya existía por pedidos anteriores: se vincula la cuenta a ese cliente.
    c = (await query('UPDATE clientes SET nombre_completo=$1,email=$2,password_hash=$3,direccion=COALESCE($4,direccion),actualizado_en=now() WHERE id=$5 RETURNING *', [nombre, email, hash, direccion, ex.id])).rows[0];
  } else {
    c = (await query('INSERT INTO clientes(nombre_completo,telefono,direccion,email,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING *', [nombre, telefono, direccion, email, hash])).rows[0];
  }
  await iniciar(req, c.id);
  res.status(201).json({ cliente: pub(c) });
});

exports.login = wrap(async (req, res) => {
  const email = V.text(req.body.email, 'Correo', { max: 120 }).toLowerCase();
  const password = V.text(req.body.password, 'Contraseña', { max: 100 });
  const c = (await query('SELECT * FROM clientes WHERE lower(email)=$1', [email])).rows[0];
  const ok = await bcrypt.compare(password, c && c.password_hash ? c.password_hash : DUMMY);
  if (!c || !c.password_hash || !ok) throw new HttpError(401, 'Correo o contraseña incorrectos');
  await iniciar(req, c.id);
  res.json({ cliente: pub(c) });
});

exports.logout = wrap(async (req, res) => {
  await new Promise((resolve) => req.session.destroy(() => resolve()));
  res.clearCookie('izote.sid');
  res.json({ ok: true });
});

exports.me = wrap(async (req, res) => {
  const id = req.session?.cliente?.id;
  if (!id) return res.json({ cliente: null });
  const c = (await query('SELECT id,nombre_completo,email,telefono,direccion FROM clientes WHERE id=$1', [id])).rows[0];
  res.json({ cliente: c || null });
});

exports.pedidos = wrap(async (req, res) => {
  const r = await query(
    `SELECT p.numero,p.estado,p.total::float AS total,p.creado_en,
            (SELECT pg.estado FROM pagos pg WHERE pg.pedido_id=p.id ORDER BY (pg.estado='Pagado') DESC, pg.id DESC LIMIT 1) AS pago_estado
     FROM pedidos p WHERE p.cliente_id=$1 ORDER BY p.creado_en DESC LIMIT 100`, [req.session.cliente.id]);
  res.json(r.rows);
});

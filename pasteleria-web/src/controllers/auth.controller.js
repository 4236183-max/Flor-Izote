const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { wrap, HttpError } = require('../utils/http');
const V = require('../utils/validate');

const DUMMY = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5H3nJ4uV3Yq1l8W1b1u1b1u1b1u1b1u';

exports.login = wrap(async (req, res) => {
  const usuario = V.text(req.body.usuario, 'Usuario', { max: 50 });
  const password = V.text(req.body.password, 'Contraseña', { max: 200 });
  const u = (await query('SELECT * FROM usuarios WHERE usuario=$1', [usuario])).rows[0];
  const ok = await bcrypt.compare(password, u ? u.password_hash : DUMMY);
  if (!u || !ok) throw new HttpError(401, 'Usuario o contraseña incorrectos');
  await new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
  req.session.user = { id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol };
  await new Promise((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));
  res.json({ ok: true, user: req.session.user });
});

exports.logout = wrap(async (req, res) => {
  await new Promise((resolve) => req.session.destroy(() => resolve()));
  res.clearCookie('izote.sid');
  res.json({ ok: true });
});

exports.me = (req, res) => res.json({ user: req.session?.user || null });

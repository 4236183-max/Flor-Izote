const { HttpError } = require('./http');
const bad = (m) => new HttpError(400, m);

const text = (v, name, { min = 1, max = 255, required = true } = {}) => {
  v = (v ?? '').toString().trim();
  if (!v) { if (required) throw bad(`${name} es obligatorio`); return null; }
  if (v.length < min || v.length > max) throw bad(`${name} debe tener entre ${min} y ${max} caracteres`);
  return v;
};
const money = (v, name) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 9999999) throw bad(`${name} no es válido`);
  return Math.round(n * 100) / 100;
};
const int = (v, name, { min = 1, max = 100000 } = {}) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw bad(`${name} no es válido`);
  return n;
};
const bool = (v, def = false) => (v === undefined || v === '' || v === null ? def : v === true || v === 'true' || v === 'on' || v === '1' || v === 1);
const phone = (v) => {
  const t = text(v, 'Teléfono', { min: 7, max: 24 });
  if (!/^[0-9+()\-\s]{7,24}$/.test(t)) throw bad('Teléfono no válido');
  return t.replace(/[\s\-()]/g, '');
};
const normPhone = (v) => String(v || '').replace(/[\s\-()]/g, '');
const date = (v, name) => {
  const t = text(v, name, { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || Number.isNaN(Date.parse(t))) throw bad(`${name} no es válida`);
  return t;
};
const oneOf = (v, list, name) => {
  if (!list.includes(v)) throw bad(`${name} no es válido`);
  return v;
};
const optId = (v) => (v === undefined || v === null || v === '' || v === 'null' ? null : int(v, 'Identificador'));

module.exports = { text, money, int, bool, phone, normPhone, date, oneOf, optId };

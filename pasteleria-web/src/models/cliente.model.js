const { query } = require('../config/database');
// Nunca se expone password_hash.
const COLS = 'c.id,c.nombre_completo,c.telefono,c.direccion,c.email,(c.password_hash IS NOT NULL) AS tiene_cuenta,c.creado_en,c.actualizado_en';
exports.list = async (q) => {
  const like = `%${q || ''}%`;
  return (await query(
    `SELECT ${COLS}, (SELECT COUNT(*)::int FROM pedidos p WHERE p.cliente_id=c.id) AS pedidos
     FROM clientes c WHERE c.nombre_completo ILIKE $1 OR c.telefono ILIKE $1 OR c.email ILIKE $1 ORDER BY c.creado_en DESC LIMIT 300`, [like])).rows;
};
exports.get = async (id) => {
  const c = (await query(`SELECT ${COLS} FROM clientes c WHERE c.id=$1`, [id])).rows[0];
  if (!c) return null;
  c.historial = (await query('SELECT id,numero,estado,total::float AS total,creado_en FROM pedidos WHERE cliente_id=$1 ORDER BY creado_en DESC', [id])).rows;
  return c;
};
const RET = 'RETURNING id,nombre_completo,telefono,direccion,email,creado_en';
exports.create = async (d) => (await query(`INSERT INTO clientes(nombre_completo,telefono,direccion) VALUES($1,$2,$3) ${RET}`, [d.nombre_completo, d.telefono, d.direccion])).rows[0];
exports.update = async (id, d) => (await query(`UPDATE clientes SET nombre_completo=$1,telefono=$2,direccion=$3,actualizado_en=now() WHERE id=$4 ${RET}`, [d.nombre_completo, d.telefono, d.direccion, id])).rows[0];

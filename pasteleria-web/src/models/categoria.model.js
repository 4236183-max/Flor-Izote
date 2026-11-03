const { query } = require('../config/database');
exports.list = async () => (await query(`SELECT c.*, (SELECT COUNT(*)::int FROM productos p WHERE p.categoria_id=c.id) AS productos FROM categorias c ORDER BY c.nombre`)).rows;
exports.create = async ({ nombre, descripcion }) => (await query('INSERT INTO categorias(nombre,descripcion) VALUES($1,$2) RETURNING *', [nombre, descripcion])).rows[0];
exports.update = async (id, { nombre, descripcion }) => (await query('UPDATE categorias SET nombre=$1, descripcion=$2, actualizado_en=now() WHERE id=$3 RETURNING *', [nombre, descripcion, id])).rows[0];
exports.remove = async (id) => (await query('DELETE FROM categorias WHERE id=$1', [id])).rowCount;

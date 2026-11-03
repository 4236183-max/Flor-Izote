const { query } = require('../config/database');
const BASE = `SELECT p.id,p.categoria_id,p.nombre,p.descripcion,p.precio::float AS precio,p.imagen_url,p.imagen_public_id,p.activo,p.disponible,p.destacado,p.creado_en,p.actualizado_en,c.nombre AS categoria
  FROM productos p LEFT JOIN categorias c ON c.id=p.categoria_id`;

exports.listPublic = async () => (await query(`${BASE} WHERE p.activo=true ORDER BY p.destacado DESC, p.nombre`)).rows;
exports.listAdmin = async () => (await query(`${BASE} ORDER BY p.creado_en DESC`)).rows;
exports.get = async (id) => (await query(`${BASE} WHERE p.id=$1`, [id])).rows[0];
exports.create = async (d) => {
  const r = await query(
    'INSERT INTO productos(categoria_id,nombre,descripcion,precio,imagen_url,imagen_public_id,activo,disponible,destacado) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
    [d.categoria_id, d.nombre, d.descripcion, d.precio, d.imagen_url, d.imagen_public_id, d.activo, d.disponible, d.destacado]
  );
  return exports.get(r.rows[0].id);
};
exports.update = async (id, d) => {
  await query(
    'UPDATE productos SET categoria_id=$1,nombre=$2,descripcion=$3,precio=$4,imagen_url=$5,imagen_public_id=$6,activo=$7,disponible=$8,destacado=$9,actualizado_en=now() WHERE id=$10',
    [d.categoria_id, d.nombre, d.descripcion, d.precio, d.imagen_url, d.imagen_public_id, d.activo, d.disponible, d.destacado, id]
  );
  return exports.get(id);
};
exports.setFlag = async (id, campo, valor) => {
  if (!['activo', 'disponible', 'destacado'].includes(campo)) throw new Error('campo inválido');
  await query(`UPDATE productos SET ${campo}=$1, actualizado_en=now() WHERE id=$2`, [valor, id]);
  return exports.get(id);
};
exports.remove = async (id) => (await query('DELETE FROM productos WHERE id=$1', [id])).rowCount;

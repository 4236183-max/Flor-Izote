const { withTx, query } = require('../config/database');
const { HttpError } = require('../utils/http');
const V = require('../utils/validate');

async function crearPedido(body, clienteId) {
  const direccion = V.text(body.direccion, 'Dirección', { max: 250, required: false });
  const notas = V.text(body.notas, 'Notas', { max: 500, required: false });
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) throw new HttpError(400, 'El carrito está vacío');
  const items = new Map();
  for (const it of body.items) {
    const id = V.int(it.id, 'Producto');
    items.set(id, (items.get(id) || 0) + V.int(it.cantidad, 'Cantidad', { max: 100 }));
  }

  return withTx(async (client) => {
    const { rows: prods } = await client.query(
      'SELECT id,nombre,precio FROM productos WHERE id = ANY($1::int[]) AND activo AND disponible', [[...items.keys()]]);
    if (prods.length !== items.size) throw new HttpError(409, 'Algún producto ya no está disponible. Actualiza tu carrito.');

    let total = 0;
    const lines = prods.map((p) => {
      const cant = items.get(p.id);
      const sub = Math.round(Number(p.precio) * cant * 100) / 100;
      total += sub;
      return { ...p, cant, sub };
    });
    total = Math.round(total * 100) / 100;

    const cl = await client.query(
      'UPDATE clientes SET direccion=COALESCE($1, direccion), actualizado_en=now() WHERE id=$2 RETURNING id,nombre_completo', [direccion, clienteId]);
    if (!cl.rows[0]) throw new HttpError(401, 'Cuenta no encontrada. Inicia sesión de nuevo.');
    const seq = await client.query("SELECT nextval('pedidos_numero_seq') AS n");
    const numero = 'PED-' + String(seq.rows[0].n).padStart(6, '0');
    const ped = await client.query('INSERT INTO pedidos(numero,cliente_id,total,notas) VALUES($1,$2,$3,$4) RETURNING id', [numero, cl.rows[0].id, total, notas]);
    for (const l of lines) {
      await client.query(
        'INSERT INTO detalles_pedido(pedido_id,producto_id,nombre_producto,cantidad,precio_unitario,subtotal) VALUES($1,$2,$3,$4,$5,$6)',
        [ped.rows[0].id, l.id, l.nombre, l.cant, l.precio, l.sub]);
    }
    const f = await client.query('INSERT INTO facturas(pedido_id,total) VALUES($1,$2) RETURNING numero', [ped.rows[0].id, total]);
    return { id: ped.rows[0].id, numero, total, estado: 'Pendiente', factura: f.rows[0].numero, cliente: cl.rows[0].nombre_completo };
  });
}

async function obtenerPedido(where, params) {
  const p = (await query(
    `SELECT p.id,p.numero,p.estado,p.total::float AS total,p.notas,p.creado_en,p.actualizado_en,
            c.id AS cliente_id,c.nombre_completo,c.telefono,c.direccion,c.email
     FROM pedidos p JOIN clientes c ON c.id=p.cliente_id WHERE ${where}`, params)).rows[0];
  if (!p) return null;
  p.items = (await query('SELECT nombre_producto,cantidad,precio_unitario::float AS precio_unitario,subtotal::float AS subtotal FROM detalles_pedido WHERE pedido_id=$1 ORDER BY id', [p.id])).rows;
  p.pagos = (await query('SELECT id,metodo,monto::float AS monto,estado,fecha FROM pagos WHERE pedido_id=$1 ORDER BY id DESC', [p.id])).rows;
  const f = (await query('SELECT numero,fecha_emision,codigo_generacion FROM facturas WHERE pedido_id=$1', [p.id])).rows[0];
  p.factura = f || null;
  return p;
}

async function cambiarEstado(id, estado) {
  V.oneOf(estado, ['Pendiente', 'En preparación', 'Listo', 'Entregado', 'Cancelado'], 'Estado');
  const r = await query('UPDATE pedidos SET estado=$1, actualizado_en=now() WHERE id=$2 RETURNING id,numero,estado', [estado, id]);
  if (!r.rows[0]) throw new HttpError(404, 'Pedido no encontrado');
  return r.rows[0];
}

module.exports = { crearPedido, obtenerPedido, cambiarEstado };

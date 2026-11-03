const { withTx } = require('../config/database');
const { HttpError } = require('../utils/http');
const V = require('../utils/validate');

const marcarPedidoPagado = (client, pedidoId) =>
  client.query("UPDATE pedidos SET estado='En preparación', actualizado_en=now() WHERE id=$1 AND estado='Pendiente'", [pedidoId]);

// Pago simulado: NO se reciben ni guardan datos de tarjeta.
async function registrarPago({ pedidoId, metodo, simularRechazo = false }) {
  V.oneOf(metodo, ['Efectivo', 'Tarjeta', 'Transferencia'], 'Método de pago');
  return withTx(async (client) => {
    const ped = (await client.query('SELECT id,numero,estado,total FROM pedidos WHERE id=$1 FOR UPDATE', [pedidoId])).rows[0];
    if (!ped) throw new HttpError(404, 'Pedido no encontrado');
    if (ped.estado === 'Cancelado') throw new HttpError(409, 'El pedido está cancelado');
    const ya = await client.query("SELECT 1 FROM pagos WHERE pedido_id=$1 AND estado='Pagado'", [pedidoId]);
    if (ya.rowCount) throw new HttpError(409, 'El pedido ya está pagado');

    const estado = metodo === 'Tarjeta' ? (simularRechazo ? 'Rechazado' : 'Pagado') : 'Pendiente';
    await client.query("DELETE FROM pagos WHERE pedido_id=$1 AND estado='Pendiente'", [pedidoId]);
    const pago = (await client.query(
      'INSERT INTO pagos(pedido_id,metodo,monto,estado) VALUES($1,$2,$3,$4) RETURNING id,metodo,monto::float AS monto,estado,fecha',
      [pedidoId, metodo, ped.total, estado])).rows[0];
    if (estado === 'Pagado') await marcarPedidoPagado(client, pedidoId);
    const nuevo = (await client.query('SELECT id,numero,estado FROM pedidos WHERE id=$1', [pedidoId])).rows[0];
    return { pago, pedido: nuevo };
  });
}

async function cambiarEstadoPago(id, estado) {
  V.oneOf(estado, ['Pendiente', 'Pagado', 'Rechazado'], 'Estado de pago');
  return withTx(async (client) => {
    const pago = (await client.query(
      'UPDATE pagos SET estado=$1, fecha=now(), actualizado_en=now() WHERE id=$2 RETURNING id,pedido_id,metodo,monto::float AS monto,estado,fecha', [estado, id])).rows[0];
    if (!pago) throw new HttpError(404, 'Pago no encontrado');
    if (estado === 'Pagado') await marcarPedidoPagado(client, pago.pedido_id);
    const pedido = (await client.query('SELECT id,numero,estado FROM pedidos WHERE id=$1', [pago.pedido_id])).rows[0];
    return { pago, pedido };
  });
}

module.exports = { registrarPago, cambiarEstadoPago };

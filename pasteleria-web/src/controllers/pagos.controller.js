const { query } = require('../config/database');
const { wrap } = require('../utils/http');
const V = require('../utils/validate');
const pagos = require('../services/pago.service');
const rt = require('../services/realtime');

exports.listar = wrap(async (req, res) => {
  const r = await query(
    `SELECT pg.id,pg.pedido_id,p.numero AS pedido,c.nombre_completo AS cliente,pg.metodo,pg.monto::float AS monto,pg.estado,pg.fecha
     FROM pagos pg JOIN pedidos p ON p.id=pg.pedido_id JOIN clientes c ON c.id=p.cliente_id ORDER BY pg.id DESC LIMIT 300`);
  res.json(r.rows);
});

exports.registrar = wrap(async (req, res) => {
  const r = await pagos.registrarPago({ pedidoId: V.int(req.body.pedido_id, 'Pedido'), metodo: req.body.metodo, simularRechazo: V.bool(req.body.simular_rechazo) });
  rt.all(req, 'pedido:actualizado', { numero: r.pedido.numero, estado: r.pedido.estado });
  res.status(201).json(r);
});

exports.estado = wrap(async (req, res) => {
  const r = await pagos.cambiarEstadoPago(V.int(req.params.id, 'Identificador'), req.body.estado);
  rt.all(req, 'pedido:actualizado', { numero: r.pedido.numero, estado: r.pedido.estado });
  rt.admin(req, 'pago:actualizado', { numero: r.pedido.numero, estado: r.pago.estado, metodo: r.pago.metodo });
  res.json(r);
});

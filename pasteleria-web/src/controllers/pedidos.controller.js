const { query } = require('../config/database');
const { wrap, HttpError } = require('../utils/http');
const V = require('../utils/validate');
const pedidos = require('../services/pedido.service');
const pagos = require('../services/pago.service');
const rt = require('../services/realtime');

// ----- Público -----
exports.crear = wrap(async (req, res) => {
  const cid = req.session?.cliente?.id;
  if (!cid) throw new HttpError(401, 'Inicia sesión o crea tu cuenta para hacer pedidos');
  const p = await pedidos.crearPedido(req.body, cid);
  rt.admin(req, 'pedido:nuevo', { numero: p.numero, total: p.total, cliente: p.cliente });
  res.status(201).json(p);
});

async function pedidoVerificado(numero, telefono, req) {
  const num = V.text(numero, 'Número de pedido', { max: 20 }).toUpperCase();
  const p = await pedidos.obtenerPedido('p.numero=$1', [num]);
  const dueno = req.session?.cliente?.id === p?.cliente_id;
  if (!p || (!dueno && V.normPhone(telefono) !== p.telefono)) throw new HttpError(404, 'Pedido no encontrado. Revisa el número y el teléfono.');
  return p;
}

exports.seguimiento = wrap(async (req, res) => {
  const p = await pedidoVerificado(req.query.numero, req.query.telefono, req);
  const { telefono, direccion, cliente_id, ...seguro } = p;
  res.json(seguro);
});

exports.pagar = wrap(async (req, res) => {
  const p = await pedidoVerificado(req.body.numero, req.body.telefono, req);
  const r = await pagos.registrarPago({ pedidoId: p.id, metodo: req.body.metodo, simularRechazo: V.bool(req.body.simular_rechazo) });
  rt.admin(req, 'pago:actualizado', { numero: r.pedido.numero, estado: r.pago.estado, metodo: r.pago.metodo });
  rt.all(req, 'pedido:actualizado', { numero: r.pedido.numero, estado: r.pedido.estado });
  res.json(r);
});

// ----- Admin -----
exports.listar = wrap(async (req, res) => {
  const est = req.query.estado ? V.oneOf(req.query.estado, ['Pendiente', 'En preparación', 'Listo', 'Entregado', 'Cancelado'], 'Estado') : null;
  const r = await query(
    `SELECT p.id,p.numero,p.estado,p.total::float AS total,p.creado_en,c.nombre_completo AS cliente,c.telefono,
            (SELECT pg.estado FROM pagos pg WHERE pg.pedido_id=p.id ORDER BY pg.id DESC LIMIT 1) AS pago_estado
     FROM pedidos p JOIN clientes c ON c.id=p.cliente_id
     WHERE ($1::text IS NULL OR p.estado=$1) ORDER BY p.creado_en DESC LIMIT 300`, [est]);
  res.json(r.rows);
});

exports.detalle = wrap(async (req, res) => {
  const p = await pedidos.obtenerPedido('p.id=$1', [V.int(req.params.id, 'Identificador')]);
  if (!p) throw new HttpError(404, 'Pedido no encontrado');
  res.json(p);
});

exports.estado = wrap(async (req, res) => {
  const p = await pedidos.cambiarEstado(V.int(req.params.id, 'Identificador'), req.body.estado);
  rt.all(req, 'pedido:actualizado', { numero: p.numero, estado: p.estado });
  res.json(p);
});

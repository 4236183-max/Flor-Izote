const { query } = require('../config/database');
const { wrap, HttpError } = require('../utils/http');
const V = require('../utils/validate');
const pedidos = require('../services/pedido.service');
const emisor = require('../config/emisor');
const r2 = (n) => Math.round(n * 100) / 100;

// Factura simulada: pública con número de pedido + teléfono, o con sesión de admin.
exports.ver = wrap(async (req, res) => {
  const numero = V.text(req.query.numero, 'Número de pedido', { max: 20 }).toUpperCase();
  const p = await pedidos.obtenerPedido('p.numero=$1', [numero]);
  const autorizado = !!req.session?.user || (p && req.session?.cliente?.id === p.cliente_id);
  if (!p || (!autorizado && V.normPhone(req.query.telefono) !== p.telefono)) throw new HttpError(404, 'Factura no encontrada');
  const pago = p.pagos.find((x) => x.estado === 'Pagado') || p.pagos[0] || null;
  // Precios del catálogo = precio final al consumidor (IVA 13% incluido). Se desglosa el IVA.
  const base = r2(p.total / (1 + emisor.iva));
  const { numeroControl, ...datosEmisor } = emisor;
  res.json({
    emisor: datosEmisor,
    factura: { numero: p.factura.numero, fecha_emision: p.factura.fecha_emision, codigo_generacion: String(p.factura.codigo_generacion).toUpperCase(), numero_control: numeroControl(p.factura.numero) },
    calculo: { total: p.total, base, iva: r2(p.total - base) },
    pedido: { numero: p.numero, estado: p.estado, total: p.total, creado_en: p.creado_en },
    cliente: { nombre: p.nombre_completo, telefono: p.telefono, direccion: p.direccion, correo: p.email || null },
    items: p.items,
    pago: pago ? { metodo: pago.metodo, estado: pago.estado } : { metodo: '—', estado: 'Sin pago registrado' },
  });
});

exports.listar = wrap(async (req, res) => {
  const r = await query(
    `SELECT f.numero,f.fecha_emision,f.total::float AS total,p.numero AS pedido,c.nombre_completo AS cliente,
            COALESCE((SELECT pg.estado FROM pagos pg WHERE pg.pedido_id=p.id ORDER BY (pg.estado='Pagado') DESC, pg.id DESC LIMIT 1),'Sin pago') AS pago_estado
     FROM facturas f JOIN pedidos p ON p.id=f.pedido_id JOIN clientes c ON c.id=p.cliente_id ORDER BY f.numero DESC LIMIT 300`);
  res.json(r.rows);
});

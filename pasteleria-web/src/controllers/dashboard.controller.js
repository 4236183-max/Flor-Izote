const { query } = require('../config/database');
const { wrap } = require('../utils/http');

const HOY = "(now() AT TIME ZONE 'America/El_Salvador')::date";
const FECHA = "(pg.fecha AT TIME ZONE 'America/El_Salvador')::date";
const q = async (sql) => (await query(sql)).rows;

exports.get = wrap(async (req, res) => {
  const [[t], ventasDia, estados, recientes, top] = await Promise.all([
    q(`SELECT
        (SELECT COUNT(*)::int FROM pedidos) AS pedidos,
        (SELECT COUNT(*)::int FROM pedidos WHERE estado='Pendiente') AS pendientes,
        (SELECT COUNT(*)::int FROM productos) AS productos,
        (SELECT COUNT(*)::int FROM clientes) AS clientes,
        (SELECT COALESCE(SUM(monto),0)::float FROM pagos WHERE estado='Pagado') AS ingresos,
        (SELECT COALESCE(SUM(pg.monto),0)::float FROM pagos pg WHERE pg.estado='Pagado' AND ${FECHA}=${HOY}) AS ventas_hoy,
        (SELECT COALESCE(SUM(pg.monto),0)::float FROM pagos pg WHERE pg.estado='Pagado' AND date_trunc('month',${FECHA})=date_trunc('month',${HOY})) AS ventas_mes,
        (SELECT COUNT(*)::int FROM encargos_personalizados WHERE estado='Recibido') AS encargos_nuevos`),
    q(`SELECT to_char(d::date,'DD/MM') AS dia, COALESCE(SUM(pg.monto),0)::float AS total
       FROM generate_series(${HOY}-6, ${HOY}, interval '1 day') d
       LEFT JOIN pagos pg ON pg.estado='Pagado' AND ${FECHA}=d::date
       GROUP BY d ORDER BY d`),
    q('SELECT estado, COUNT(*)::int AS n FROM pedidos GROUP BY estado'),
    q(`SELECT p.id,p.numero,p.total::float AS total,p.estado,p.creado_en,c.nombre_completo AS cliente
       FROM pedidos p JOIN clientes c ON c.id=p.cliente_id ORDER BY p.creado_en DESC LIMIT 8`),
    q(`SELECT d.nombre_producto AS nombre, SUM(d.cantidad)::int AS vendidos
       FROM detalles_pedido d JOIN pedidos p ON p.id=d.pedido_id WHERE p.estado<>'Cancelado'
       GROUP BY d.nombre_producto ORDER BY vendidos DESC LIMIT 5`),
  ]);
  res.json({ totales: t, ventasDia, estados, recientes, top });
});

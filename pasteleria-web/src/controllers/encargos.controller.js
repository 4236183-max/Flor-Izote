const { query } = require('../config/database');
const { wrap, HttpError } = require('../utils/http');
const V = require('../utils/validate');
const imagenes = require('../services/imagen.service');
const rt = require('../services/realtime');

const ESTADOS = ['Recibido', 'En revisión', 'Cotizado', 'Confirmado', 'En preparación', 'Listo', 'Entregado', 'Cancelado'];

exports.crear = wrap(async (req, res) => {
  const b = req.body;
  const d = {
    nombre: V.text(b.nombre_cliente, 'Nombre', { min: 3, max: 120 }),
    telefono: V.phone(b.telefono),
    tamano: V.text(b.tamano, 'Tamaño', { max: 40 }),
    porciones: V.int(b.porciones, 'Porciones', { max: 500 }),
    sabor: V.text(b.sabor, 'Sabor', { max: 80 }),
    relleno: V.text(b.relleno, 'Relleno', { max: 80 }),
    cobertura: V.text(b.cobertura, 'Cobertura', { max: 80 }),
    diseno: V.text(b.diseno, 'Diseño solicitado', { max: 1500 }),
    dedicatoria: V.text(b.dedicatoria, 'Dedicatoria', { max: 200, required: false }),
    fecha: V.date(b.fecha_entrega, 'Fecha de entrega'),
    obs: V.text(b.observaciones, 'Observaciones', { max: 1000, required: false }),
  };
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if (new Date(d.fecha + 'T00:00:00') < hoy) throw new HttpError(400, 'La fecha de entrega no puede ser anterior a hoy');

  let img = { url: null, publicId: null };
  if (req.file) img = await imagenes.subir(req.file.buffer, 'encargos');

  const cl = await query(
    `INSERT INTO clientes(nombre_completo,telefono) VALUES($1,$2)
     ON CONFLICT (telefono) DO UPDATE SET actualizado_en=now() RETURNING id`, [d.nombre, d.telefono]);
  const r = await query(
    `INSERT INTO encargos_personalizados(cliente_id,nombre_cliente,telefono,tamano,porciones,sabor,relleno,cobertura,diseno,dedicatoria,fecha_entrega,observaciones,imagen_referencia_url,imagen_referencia_public_id)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
    [cl.rows[0].id, d.nombre, d.telefono, d.tamano, d.porciones, d.sabor, d.relleno, d.cobertura, d.diseno, d.dedicatoria, d.fecha, d.obs, img.url, img.publicId]);
  rt.admin(req, 'encargo:nuevo', { id: r.rows[0].id, cliente: d.nombre });
  res.status(201).json({ id: r.rows[0].id, mensaje: 'Encargo recibido. Te contactaremos para cotizar y confirmar.' });
});

exports.listar = wrap(async (req, res) => {
  const r = await query(
    `SELECT id,nombre_cliente,telefono,tamano,porciones,sabor,relleno,cobertura,diseno,dedicatoria,fecha_entrega,observaciones,
            imagen_referencia_url,estado,precio_estimado::float AS precio_estimado,notas_admin,creado_en
     FROM encargos_personalizados ORDER BY creado_en DESC LIMIT 300`);
  res.json(r.rows);
});

exports.actualizar = wrap(async (req, res) => {
  const id = V.int(req.params.id, 'Identificador');
  const estado = V.oneOf(req.body.estado, ESTADOS, 'Estado');
  const precio = req.body.precio_estimado === '' || req.body.precio_estimado == null ? null : V.money(req.body.precio_estimado, 'Precio estimado');
  const notas = V.text(req.body.notas_admin, 'Notas', { max: 1000, required: false });
  const r = await query('UPDATE encargos_personalizados SET estado=$1,precio_estimado=$2,notas_admin=$3,actualizado_en=now() WHERE id=$4 RETURNING id', [estado, precio, notas, id]);
  if (!r.rows[0]) throw new HttpError(404, 'Encargo no encontrado');
  res.json({ ok: true });
});

exports.eliminar = wrap(async (req, res) => {
  const r = await query('DELETE FROM encargos_personalizados WHERE id=$1 RETURNING imagen_referencia_public_id', [V.int(req.params.id, 'Identificador')]);
  if (!r.rows[0]) throw new HttpError(404, 'Encargo no encontrado');
  await imagenes.eliminar(r.rows[0].imagen_referencia_public_id);
  res.json({ ok: true });
});

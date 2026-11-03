const { wrap, HttpError } = require('../utils/http');
const V = require('../utils/validate');
const Producto = require('../models/producto.model');
const Categoria = require('../models/categoria.model');
const imagenes = require('../services/imagen.service');
const rt = require('../services/realtime');

const limpio = (p) => { const { imagen_public_id, ...r } = p; return r; };

// ---------- Productos ----------
exports.productosPublicos = wrap(async (req, res) => {
  const [productos, categorias] = await Promise.all([Producto.listPublic(), Categoria.list()]);
  res.json({ productos: productos.map(limpio), categorias: categorias.map(({ id, nombre, descripcion }) => ({ id, nombre, descripcion })) });
});

exports.productosAdmin = wrap(async (req, res) => res.json(await Producto.listAdmin()));

function datosProducto(b) {
  return {
    categoria_id: V.optId(b.categoria_id),
    nombre: V.text(b.nombre, 'Nombre', { min: 2, max: 120 }),
    descripcion: V.text(b.descripcion, 'Descripción', { max: 1000, required: false }),
    precio: V.money(b.precio, 'Precio'),
    activo: V.bool(b.activo, true),
    disponible: V.bool(b.disponible, true),
    destacado: V.bool(b.destacado, false),
  };
}

exports.crearProducto = wrap(async (req, res) => {
  const d = datosProducto(req.body);
  d.imagen_url = null; d.imagen_public_id = null;
  if (req.file) { const img = await imagenes.subir(req.file.buffer, 'productos'); d.imagen_url = img.url; d.imagen_public_id = img.publicId; }
  const p = await Producto.create(d);
  rt.all(req, 'productos:cambio', { accion: 'crear', id: p.id });
  res.status(201).json(p);
});

exports.actualizarProducto = wrap(async (req, res) => {
  const id = V.int(req.params.id, 'Identificador');
  const actual = await Producto.get(id);
  if (!actual) throw new HttpError(404, 'Producto no encontrado');
  const d = datosProducto(req.body);
  d.imagen_url = actual.imagen_url; d.imagen_public_id = actual.imagen_public_id;
  if (req.file) {
    const img = await imagenes.subir(req.file.buffer, 'productos');
    await imagenes.eliminar(actual.imagen_public_id);
    d.imagen_url = img.url; d.imagen_public_id = img.publicId;
  } else if (V.bool(req.body.quitar_imagen)) {
    await imagenes.eliminar(actual.imagen_public_id);
    d.imagen_url = null; d.imagen_public_id = null;
  }
  const p = await Producto.update(id, d);
  rt.all(req, 'productos:cambio', { accion: 'actualizar', id });
  res.json(p);
});

exports.flagProducto = wrap(async (req, res) => {
  const id = V.int(req.params.id, 'Identificador');
  const campo = V.oneOf(req.body.campo, ['activo', 'disponible', 'destacado'], 'Campo');
  const p = await Producto.setFlag(id, campo, V.bool(req.body.valor));
  if (!p) throw new HttpError(404, 'Producto no encontrado');
  rt.all(req, 'productos:cambio', { accion: 'flag', id });
  res.json(p);
});

exports.eliminarProducto = wrap(async (req, res) => {
  const id = V.int(req.params.id, 'Identificador');
  const actual = await Producto.get(id);
  if (!actual) throw new HttpError(404, 'Producto no encontrado');
  await Producto.remove(id);
  await imagenes.eliminar(actual.imagen_public_id);
  rt.all(req, 'productos:cambio', { accion: 'eliminar', id });
  res.json({ ok: true });
});

// ---------- Categorías ----------
const datosCat = (b) => ({ nombre: V.text(b.nombre, 'Nombre', { min: 2, max: 80 }), descripcion: V.text(b.descripcion, 'Descripción', { max: 250, required: false }) });

exports.categorias = wrap(async (req, res) => res.json(await Categoria.list()));
exports.crearCategoria = wrap(async (req, res) => {
  const c = await Categoria.create(datosCat(req.body));
  rt.all(req, 'productos:cambio', { accion: 'categoria' });
  res.status(201).json(c);
});
exports.actualizarCategoria = wrap(async (req, res) => {
  const c = await Categoria.update(V.int(req.params.id, 'Identificador'), datosCat(req.body));
  if (!c) throw new HttpError(404, 'Categoría no encontrada');
  rt.all(req, 'productos:cambio', { accion: 'categoria' });
  res.json(c);
});
exports.eliminarCategoria = wrap(async (req, res) => {
  const n = await Categoria.remove(V.int(req.params.id, 'Identificador'));
  if (!n) throw new HttpError(404, 'Categoría no encontrada');
  rt.all(req, 'productos:cambio', { accion: 'categoria' });
  res.json({ ok: true });
});

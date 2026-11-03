const { wrap, HttpError } = require('../utils/http');
const V = require('../utils/validate');
const Cliente = require('../models/cliente.model');

const datos = (b) => ({
  nombre_completo: V.text(b.nombre_completo, 'Nombre completo', { min: 3, max: 120 }),
  telefono: V.phone(b.telefono),
  direccion: V.text(b.direccion, 'Dirección', { max: 250, required: false }),
});

exports.listar = wrap(async (req, res) => res.json(await Cliente.list(String(req.query.q || '').slice(0, 60))));
exports.obtener = wrap(async (req, res) => {
  const c = await Cliente.get(V.int(req.params.id, 'Identificador'));
  if (!c) throw new HttpError(404, 'Cliente no encontrado');
  res.json(c);
});
exports.crear = wrap(async (req, res) => res.status(201).json(await Cliente.create(datos(req.body))));
exports.actualizar = wrap(async (req, res) => {
  const c = await Cliente.update(V.int(req.params.id, 'Identificador'), datos(req.body));
  if (!c) throw new HttpError(404, 'Cliente no encontrado');
  res.json(c);
});

const notFound = (req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Ruta no encontrada' });
  return res.status(404).send('Página no encontrada');
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message;
  if (err.code === 'LIMIT_FILE_SIZE') { status = 400; message = 'La imagen supera 5 MB'; }
  else if (err.name === 'MulterError') status = 400;
  else if (err.code === '23505') { status = 409; message = 'Ya existe un registro con esos datos'; }
  else if (err.code === '23503') { status = 409; message = 'No se puede completar: el registro está relacionado con otros datos'; }
  else if (status === 500) {
    console.error(err);
    message = 'Error interno del servidor';
  }
  res.status(status).json({ error: message });
};
module.exports = { notFound, errorHandler };

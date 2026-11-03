const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'No autorizado' });
};
const requireAuthPage = (req, res, next) => {
  if (req.session && req.session.user) return next();
  return res.redirect('/admin/login');
};
const requireRole = (...roles) => (req, res, next) => {
  if (req.session?.user && roles.includes(req.session.user.rol)) return next();
  return res.status(403).json({ error: 'Permisos insuficientes' });
};
module.exports = { requireAuth, requireAuthPage, requireRole };

module.exports.requireCliente = (req, res, next) => {
  if (req.session && req.session.cliente) return next();
  return res.status(401).json({ error: 'Inicia sesión para continuar' });
};

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const upload = require('../middleware/upload');
const catalogo = require('../controllers/catalogo.controller');
const pedidos = require('../controllers/pedidos.controller');
const encargos = require('../controllers/encargos.controller');
const facturas = require('../controllers/facturas.controller');

const escritura = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiadas solicitudes. Intenta más tarde.' } });

router.get('/productos', catalogo.productosPublicos);
router.post('/pedidos', escritura, pedidos.crear);
router.get('/seguimiento', pedidos.seguimiento);
router.post('/pagos', escritura, pedidos.pagar);
router.post('/encargos', escritura, upload.single('imagen'), encargos.crear);
router.get('/factura', facturas.ver);
module.exports = router;

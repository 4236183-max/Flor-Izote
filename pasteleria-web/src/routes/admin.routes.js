const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const catalogo = require('../controllers/catalogo.controller');
const clientes = require('../controllers/clientes.controller');
const pedidos = require('../controllers/pedidos.controller');
const pagos = require('../controllers/pagos.controller');
const encargos = require('../controllers/encargos.controller');
const facturas = require('../controllers/facturas.controller');
const dashboard = require('../controllers/dashboard.controller');

router.use(requireAuth, requireRole('admin', 'staff'));

router.get('/dashboard', dashboard.get);

router.get('/productos', catalogo.productosAdmin);
router.post('/productos', upload.single('imagen'), catalogo.crearProducto);
router.put('/productos/:id', upload.single('imagen'), catalogo.actualizarProducto);
router.patch('/productos/:id/flag', catalogo.flagProducto);
router.delete('/productos/:id', catalogo.eliminarProducto);

router.get('/categorias', catalogo.categorias);
router.post('/categorias', catalogo.crearCategoria);
router.put('/categorias/:id', catalogo.actualizarCategoria);
router.delete('/categorias/:id', catalogo.eliminarCategoria);

router.get('/clientes', clientes.listar);
router.get('/clientes/:id', clientes.obtener);
router.post('/clientes', clientes.crear);
router.put('/clientes/:id', clientes.actualizar);

router.get('/pedidos', pedidos.listar);
router.get('/pedidos/:id', pedidos.detalle);
router.patch('/pedidos/:id/estado', pedidos.estado);

router.get('/pagos', pagos.listar);
router.post('/pagos', pagos.registrar);
router.patch('/pagos/:id/estado', pagos.estado);

router.get('/encargos', encargos.listar);
router.put('/encargos/:id', encargos.actualizar);
router.delete('/encargos/:id', encargos.eliminar);

router.get('/facturas', facturas.listar);
module.exports = router;

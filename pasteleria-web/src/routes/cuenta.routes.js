const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { requireCliente } = require('../middleware/auth');
const c = require('../controllers/cuenta.controller');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' } });

router.post('/registro', limiter, c.registro);
router.post('/login', limiter, c.login);
router.post('/logout', c.logout);
router.get('/me', c.me);
router.get('/pedidos', requireCliente, c.pedidos);
module.exports = router;

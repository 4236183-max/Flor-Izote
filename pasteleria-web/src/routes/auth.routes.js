const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/auth.controller');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' } });

router.post('/login', limiter, c.login);
router.post('/logout', c.logout);
router.get('/me', c.me);
module.exports = router;

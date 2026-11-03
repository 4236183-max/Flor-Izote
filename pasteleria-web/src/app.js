const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const { pool } = require('./config/database');
const { requireAuthPage } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');

const isProd = process.env.NODE_ENV === 'production';
if (isProd && !process.env.SESSION_SECRET) { console.error('Falta SESSION_SECRET en producción.'); process.exit(1); }

const app = express();
if (isProd) app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

const sessionMiddleware = session({
  store: new pgSession({ pool, tableName: 'session' }),
  name: 'izote.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-solo-local',
  resave: false,
  saveUninitialized: false,
  proxy: isProd,
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 1000 * 60 * 60 * 8 },
});
app.use(sessionMiddleware);

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', db: 'ok', time: new Date().toISOString() }); }
  catch (e) { res.status(503).json({ status: 'error', db: 'down' }); }
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/cuenta', require('./routes/cuenta.routes'));
app.use('/api/public', require('./routes/public.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Páginas del panel (protegidas)
const views = path.join(__dirname, '../views');
app.get('/admin/login', (req, res) => (req.session?.user ? res.redirect('/admin') : res.sendFile(path.join(views, 'login.html'))));
app.get('/admin', requireAuthPage, (req, res) => res.sendFile(path.join(views, 'admin.html')));

app.use(express.static(path.join(__dirname, '../public'), { maxAge: isProd ? '1h' : 0 }));

app.use(notFound);
app.use(errorHandler);

module.exports = { app, sessionMiddleware };

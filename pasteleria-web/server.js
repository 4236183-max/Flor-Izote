require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { app, sessionMiddleware } = require('./src/app');
const { initDb } = require('./src/config/init');

const PORT = process.env.PORT || 3000;

(async () => {
  await initDb();
  const server = http.createServer(app);
  const io = new Server(server);
  io.engine.use(sessionMiddleware);
  io.on('connection', (socket) => {
    const sess = socket.request.session;
    if (sess && sess.user) socket.join('admin');
  });
  app.set('io', io);
  server.listen(PORT, () => console.log(`Flor de Izote escuchando en puerto ${PORT}`));
})().catch((e) => {
  console.error('Error al iniciar:', e);
  process.exit(1);
});

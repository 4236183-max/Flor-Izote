require('dotenv').config();
const { initDb } = require('../src/config/init');
const { pool } = require('../src/config/database');

initDb()
  .then(() => console.log('Base de datos lista.'))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => pool.end());

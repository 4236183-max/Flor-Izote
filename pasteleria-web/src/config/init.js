const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { query } = require('./database');

async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8');
  await query(schema);
  console.log('[db] Esquema verificado en Neon.');

  const { rows } = await query('SELECT COUNT(*)::int AS n FROM usuarios');
  if (rows[0].n === 0) {
    const usuario = process.env.ADMIN_USER || 'admin';
    const pass = process.env.ADMIN_PASSWORD;
    if (!pass || pass.length < 8) {
      console.warn('[db] No hay usuarios. Define ADMIN_PASSWORD (mínimo 8 caracteres) para crear el administrador inicial.');
    } else {
      const hash = await bcrypt.hash(pass, 12);
      await query('INSERT INTO usuarios (usuario, password_hash, nombre, rol) VALUES ($1,$2,$3,$4)', [usuario, hash, 'Administrador', 'admin']);
      console.log(`[db] Administrador inicial "${usuario}" creado.`);
    }
  }

  if (process.env.SEED_DEMO === 'true') {
    const seed = fs.readFileSync(path.join(__dirname, '../../database/seed.sql'), 'utf8');
    await query(seed);
    console.log('[db] Datos de ejemplo verificados.');
  }
}

module.exports = { initDb };

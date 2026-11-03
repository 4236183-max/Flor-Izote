// Vincula public/images/productos/<slug>.(jpg|jpeg|png|webp) a productos sin imagen.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, query } = require('../src/config/database');

const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dir = path.join(__dirname, '../public/images/productos');

(async () => {
  const { rows } = await query('SELECT id,nombre FROM productos WHERE imagen_url IS NULL AND imagen_public_id IS NULL');
  let n = 0;
  for (const p of rows) {
    const ext = ['jpg', 'jpeg', 'png', 'webp'].find((e) => fs.existsSync(path.join(dir, `${slug(p.nombre)}.${e}`)));
    if (!ext) { console.log(`- sin foto: ${p.nombre} (${slug(p.nombre)}.jpg)`); continue; }
    await query('UPDATE productos SET imagen_url=$1, actualizado_en=now() WHERE id=$2', [`/images/productos/${slug(p.nombre)}.${ext}`, p.id]);
    console.log(`✔ ${p.nombre}`); n++;
  }
  console.log(`${n} producto(s) vinculados.`);
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());

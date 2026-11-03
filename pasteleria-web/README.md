# Flor de Izote · Sistema web para pastelería

Proyecto académico (Instituto Nacional de Apopa · Desarrollo de Software · Recuperación Módulo 2.8).
Node.js + Express · PostgreSQL en **Neon** (`pg`) · express-session + connect-pg-simple + bcrypt · Cloudinary · Socket.IO · Render + GitHub.

## Estructura
```
server.js                 arranque (HTTP + Socket.IO + inicialización de BD)
src/app.js                Express, sesiones, rutas, errores
src/config/               database.js (pool + SSL + transacciones), init.js (esquema + admin + seed)
src/routes|controllers|models|services|middleware|utils
database/schema.sql       tablas, FK, índices (se aplica solo al iniciar, es idempotente)
database/seed.sql         categorías y productos de ejemplo (si SEED_DEMO=true)
views/                    login.html y admin.html (protegidos por sesión)
public/                   sitio público, factura.html, css, js, images
```
Las fotos NO se guardan en disco: van a Cloudinary (por eso no existe `public/uploads`).

## 1. Neon
1. Crea cuenta en https://neon.tech → *New project*.
2. En el dashboard copia la **Connection string** (termina en `?sslmode=require`).
3. Esa cadena es tu `DATABASE_URL`. No hay que crear tablas a mano: el servidor ejecuta `database/schema.sql` al iniciar.

## 2. Cloudinary
1. Cuenta gratis en https://cloudinary.com → Dashboard → *API Environment variable*.
2. Copia `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` como `CLOUDINARY_URL`.
Sin esto todo funciona, pero subir una imagen responde "Almacenamiento de imágenes no configurado".

## 2b. Imágenes del sitio
Pon los archivos en `public/images/` (se publican con el repositorio, funcionan en Render):
- `hero.jpg` (1920×900, banner principal) · `nosotros.jpg` (1000×800) · `encargo.jpg` (800×1000, opcional)
- `productos/<slug>.jpg` (800×800, una por producto; nombres exactos en `public/images/productos/LEEME.txt`)
Si falta una imagen, el sitio muestra un ícono o ilustración (no se rompe).
Productos nuevos: súbelos desde el panel (Cloudinary) o usa `npm run imagenes` para vincular fotos de esa carpeta.
Datos de contacto y WhatsApp: `public/js/config.js`.

## 3. Ejecutar en local
```bash
npm install
cp .env.example .env      # edita DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD, CLOUDINARY_URL
npm start                 # http://localhost:3000   ·   panel: /admin
```
- `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- El administrador inicial se crea **solo si la tabla `usuarios` está vacía**, con `ADMIN_USER` / `ADMIN_PASSWORD` (se guarda hash bcrypt). Luego puedes quitar `ADMIN_PASSWORD` de las variables.
- `npm run db:init` aplica esquema/admin/seed sin levantar el servidor.
- Con Postgres local (`localhost` en `DATABASE_URL`) el SSL se desactiva solo.

## 4. GitHub
```bash
git init && git add . && git commit -m "Pastelería Flor de Izote"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/pasteleria-web.git
git push -u origin main
```
`.env` está en `.gitignore`: nunca se sube.

## 5. Desplegar en Render
1. https://render.com → *New* → **Web Service** → conecta el repositorio de GitHub.
2. Runtime **Node** · Build Command `npm install` · Start Command `npm start`.
3. *Health Check Path*: `/api/health`.
4. *Environment* → agrega: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`, `ADMIN_USER`, `ADMIN_PASSWORD`, `CLOUDINARY_URL`, `SEED_DEMO=true` (`PORT` lo pone Render). También puedes usar `render.yaml` como Blueprint.
5. *Create Web Service*. Al terminar abre la URL pública; el panel está en `/admin`.
6. Los datos viven en Neon: sobreviven a reinicios y redeploys de Render.
Nota: el plan gratis de Render duerme el servicio tras inactividad; la primera visita tarda unos segundos.

## 6. Cómo funciona
- Cuentas de cliente: registro (nombre, correo, teléfono, contraseña ≥ 8, hash bcrypt) e inicio de sesión. **Para hacer un pedido hay que tener sesión iniciada.** "Mi cuenta" muestra el historial de pedidos para ver, pagar o abrir la factura. Si el teléfono ya existía por pedidos anteriores, la cuenta se vincula a ese cliente.
- Cliente: catálogo → (login/registro) → carrito → pago simulado → pedido (transacción SQL: cliente + pedido + detalles + factura) → factura imprimible / guardar como PDF.
- Pagos simulados: Tarjeta se aprueba al instante (casilla para simular rechazo); Efectivo y Transferencia quedan *Pendiente* hasta que el admin los marca *Pagado*. Pago exitoso ⇒ el pedido pasa a *En preparación*. Nunca se piden ni guardan datos de tarjeta.
- Admin: dashboard con gráficos, pedidos, productos (CRUD + foto), categorías, clientes (+ historial), encargos, pagos y facturas.
- Tiempo real: Socket.IO (nuevos pedidos/pagos/encargos en el panel; catálogo y estado del pedido en el sitio).

## Seguridad
bcrypt (12 rondas), sesiones en PostgreSQL con cookie `httpOnly`/`sameSite`/`secure` en producción, rate limit en login y escrituras públicas, consultas parametrizadas, validación en servidor, precios siempre tomados de la BD, rutas `/api/admin` y `/admin` protegidas, sin credenciales en el código.

## Pruebas realizadas
Probado de punta a punta contra PostgreSQL 16 local: health, catálogo, login/logout, protección de rutas, pedido + factura, pagos aprobado/rechazado/pendiente, confirmación por admin, CRUD de productos/categorías/clientes, encargos, dashboard.
**Pendiente de tu lado** (requiere tus credenciales): probar con tu Neon real, la subida de fotos a Cloudinary y el despliegue en Render.

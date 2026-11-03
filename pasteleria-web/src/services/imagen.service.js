const cloudinary = require('cloudinary').v2;
const { HttpError } = require('../utils/http');

if (!process.env.CLOUDINARY_URL && process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}
const configured = () => !!process.env.CLOUDINARY_URL || !!process.env.CLOUDINARY_CLOUD_NAME;

function subir(buffer, carpeta) {
  if (!configured()) throw new HttpError(503, 'Almacenamiento de imágenes no configurado (Cloudinary).');
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `flor-de-izote/${carpeta}`, resource_type: 'image', transformation: [{ width: 1400, crop: 'limit', quality: 'auto' }] },
      (err, r) => (err ? reject(new HttpError(502, 'No se pudo subir la imagen')) : resolve({ url: r.secure_url, publicId: r.public_id }))
    );
    stream.end(buffer);
  });
}

async function eliminar(publicId) {
  if (!publicId || !configured()) return;
  try { await cloudinary.uploader.destroy(publicId); } catch (e) { console.warn('Cloudinary destroy:', e.message); }
}

module.exports = { subir, eliminar, configured };

const multer = require('multer');
const { HttpError } = require('../utils/http');

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
    cb(new HttpError(400, 'Solo se permiten imágenes JPG, PNG o WEBP'));
  },
});

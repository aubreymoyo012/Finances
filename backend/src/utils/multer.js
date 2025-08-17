// backend/src/utils/multer.js
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { randomUUID } = require('crypto');

const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  // allow common image types
  const ok = /^image\/(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(file.mimetype || '');
  cb(ok ? null : new Error('Only image uploads are allowed'), ok);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Export a single-field middleware named 'receipt'
module.exports = upload.single('receipt');
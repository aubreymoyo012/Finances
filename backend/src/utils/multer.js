const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { InvalidInputError } = require('../utils/errors');
const crypto = require('crypto');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific subdirectory if needed
    const userDir = req.user ? path.join(uploadDir, req.user.id) : uploadDir;
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Generate secure random filename with original extension
    crypto.randomBytes(16, (err, buf) => {
      if (err) return cb(err);
      const uniqueName = buf.toString('hex') + path.extname(file.originalname).toLowerCase();
      cb(null, uniqueName);
    });
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.png', '.jpg', '.jpeg', '.pdf', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedTypes.includes(ext)) {
    return cb(new InvalidInputError(
      'Invalid file type',
      `Only ${allowedTypes.join(', ')} files are allowed`
    ), false);
  }

  // Basic file content validation (magic numbers)
  const isImage = file.mimetype.startsWith('image/');
  const isPDF = file.mimetype === 'application/pdf';
  
  if (!isImage && !isPDF) {
    return cb(new InvalidInputError(
      'Invalid file content',
      'File does not appear to be a valid image or PDF'
    ), false);
  }

  cb(null, true);
};

const uploadReceipt = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1, // Single file
    fields: 5 // Additional form fields
  },
  fileFilter
}).single('receipt');

// Wrapper middleware for better error handling
const receiptUploadMiddleware = (req, res, next) => {
  uploadReceipt(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // Handle Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new InvalidInputError(
            'File too large',
            'Maximum file size is 5MB'
          ));
        }
        return next(new InvalidInputError('File upload error', err.message));
      } else if (err instanceof InvalidInputError) {
        return next(err);
      }
      return next(new Error('File upload failed'));
    }

    // Additional validation if needed
    if (!req.file) {
      return next(new InvalidInputError(
        'No file uploaded',
        'Please upload a receipt image'
      ));
    }

    next();
  });
};

module.exports = receiptUploadMiddleware;
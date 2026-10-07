const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

fs.mkdirSync(env.uploadDir, { recursive: true });

// The old app named files DD-MM-YYYY_type_invoice.ext, so two uploads on the
// same day overwrote each other. New names are unique; original names are never trusted.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) return cb(new ApiError(400, 'Only JPG, PNG, WEBP or PDF files are allowed'));
    cb(null, true);
  },
});

// Remove a just-uploaded file when the request fails validation afterwards.
const discardUpload = (file) => {
  if (file) fs.promises.unlink(file.path).catch(() => {});
};

module.exports = { uploadInvoice: upload.single('invoice'), discardUpload };

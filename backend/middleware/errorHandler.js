const multer = require('multer');
const env = require('../config/env');

function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// One place that turns every kind of failure into the same JSON shape.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid value for ${err.path}` });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'A record with the same unique value already exists' });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body is not valid JSON' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 && env.nodeEnv === 'production' ? 'Internal server error' : err.message,
    ...(err.details && { errors: err.details }),
  });
}

module.exports = { notFound, errorHandler };

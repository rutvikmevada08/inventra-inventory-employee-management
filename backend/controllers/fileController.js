const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Invoices are business documents, so they are only served to signed-in users
// (the old app exposed the whole uploads folder as public static files).
exports.serve = (req, res, next) => {
  const name = path.basename(req.params.name);
  const full = path.join(env.uploadDir, name);
  if (!fs.existsSync(full)) return next(new ApiError(404, 'File not found'));
  res.sendFile(full);
};

require('dotenv').config({ quiet: true });
const path = require('path');

// Everything configurable lives here so no other file reads process.env directly.
const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads')),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 20,
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
  },
  notifyEmails: (process.env.NOTIFY_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean),
  company: {
    name: process.env.COMPANY_NAME || 'Your Company',
    defaultPaidBy: process.env.DEFAULT_PAID_BY || '',
    usdRate: Number(process.env.USD_RATE) || 73.7, // the rate the original sheet used
  },
};

env.validate = () => {
  const problems = [];
  if (!env.mongoUri) problems.push('MONGODB_URI is not set');
  if (!env.jwtSecret || env.jwtSecret.length < 32) problems.push('JWT_SECRET must be set and at least 32 characters long');
  if (problems.length) {
    throw new Error(`Invalid configuration:\n - ${problems.join('\n - ')}\nCopy .env.example to .env and fill it in.`);
  }
};

module.exports = env;

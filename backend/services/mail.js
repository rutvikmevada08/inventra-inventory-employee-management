const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;
const enabled = () => Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

// Notifications are a convenience. They must never make a request fail, so errors
// are logged and swallowed, and nothing is sent when SMTP is not configured.
function notify({ to, subject, text }) {
  const recipients = [].concat(to || []).filter(Boolean);
  if (!enabled() || !recipients.length) return Promise.resolve(false);
  return getTransporter()
    .sendMail({ from: env.smtp.from, to: recipients.join(', '), subject, text })
    .then(() => true)
    .catch((err) => {
      console.error('Mail not sent:', err.message);
      return false;
    });
}

module.exports = { notify, enabled };

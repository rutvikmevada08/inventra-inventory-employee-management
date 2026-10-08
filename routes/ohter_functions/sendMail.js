
const nodemailer = require('nodemailer');

async function sendEmail(to, subject, text) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.warn('SMTP credentials not configured. Skipping email send.');
        return null;
    }

    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtppro.zoho.in',
        port: parseInt(process.env.SMTP_PORT, 10) || 465,
        secure: (process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465'),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    let mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: to,
        subject: subject,
        text: text
    };

    let info = await transporter.sendMail(mailOptions);
    return info;
}

module.exports = sendEmail;
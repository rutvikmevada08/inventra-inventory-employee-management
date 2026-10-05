
const nodemailer = require('nodemailer');

async function sendEmail(to, subject, text) {
    // Create a transporter
    let transporter = nodemailer.createTransport({
        host: 'smtppro.zoho.in',
        // service: 'Gmail',

        port: 465,
        secure: true,
        auth: {
            user: 'pulkit.upadhyay@deepeigen.com', // Your Zoho Mail email address
            pass: 'rD1xQtsMN4nR' // Your Zoho Mail password
        }
    //     auth: {
    //       user: 'swaayatt.interviews@gmail.com', // Your Zoho Mail email address
    //       pass: 'zncx rxez hjcy hsny' // Your Zoho Mail password
    //   }
    });

    // Setup email data
    let mailOptions = {
        from: 'pulkit.upadhyay@deepeigen.com', // Sender address
        to: to, // Receiver address
        cc:'amrita@swaayatt.com, pulkit.upadhyay@deepeigen.com',
        subject: subject, // Subject line
        text: text // Plain text body
    };

    // Send mail with defined transport object
    let info = await transporter.sendMail(mailOptions);

}

module.exports = sendEmail;
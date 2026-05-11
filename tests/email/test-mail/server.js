/**
 * server.js - Test Email Server (Internal SMTP)
 * 
 * SMTP Configuration:
 *   Server: 192.168.98.1
 *   Port: 25
 *   Authentication: YES
 */

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Load env from current directory
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(bodyParser.json());

// =============================================
// Internal SMTP Config
// =============================================
const SMTP_HOST = process.env.SMTP_HOST || '192.168.98.1';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '';

// =============================================
// Send Email API
// =============================================
app.post('/send-email', async (req, res) => {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: to, subject, message'
        });
    }

    console.log('Attempting to send email to:', to);
    console.log('Using SMTP:', SMTP_HOST + ':' + SMTP_PORT);

    if (!SMTP_FROM) {
        return res.status(500).json({
            success: false,
            error: 'SMTP_FROM is not configured'
        });
    }

    // Create transporter with Internal SMTP
    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false, // Port 25 uses STARTTLS or no encryption
        auth: SMTP_USER && SMTP_PASS ? {
            user: SMTP_USER,
            pass: SMTP_PASS
        } : undefined,
        tls: {
            rejectUnauthorized: false // Accept self-signed certs
        }
    });

    const mailOptions = {
        from: SMTP_FROM,
        to: to,
        subject: subject,
        text: message,
        html: `<p>${message.replace(/\n/g, '<br>')}</p>`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${to} successfully`);
        console.log('Response:', info.response);
        res.json({ success: true, info: info.response });
    } catch (error) {
        console.error('❌ Error sending email:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// Health Check
// =============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        smtp_host: SMTP_HOST,
        smtp_port: SMTP_PORT,
        smtp_user: SMTP_USER,
        timestamp: new Date().toISOString()
    });
});

// =============================================
// Start Server
// =============================================
app.listen(PORT, () => {
    console.log('====================================');
    console.log(`🚀 Test Email Server running on http://localhost:${PORT}`);
    console.log('====================================');
    console.log(`📮 SMTP Host: ${SMTP_HOST}`);
    console.log(`📮 SMTP Port: ${SMTP_PORT}`);
    console.log(`📮 SMTP User: ${SMTP_USER}`);
    console.log(`📮 SMTP From: ${SMTP_FROM}`);
    console.log('====================================');
});

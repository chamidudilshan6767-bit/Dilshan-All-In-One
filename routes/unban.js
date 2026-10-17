const express = require('express');
const router = express.Router();

router.post('/generate', (req, res) => {
    const { phoneNumber, banReason, userEmail } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ success: false, error: 'Phone number is required!' });
    }

    const subject = `Account Ban Appeal - ${phoneNumber}`;
    const body = `Dear WhatsApp Support Team,

My WhatsApp account (${phoneNumber}) has been banned. I believe this ban was applied in error as I strictly follow WhatsApp's Terms of Service.

Reason / Issue Details: ${banReason || 'Not specified'}

Please review my account and restore access at your earliest convenience.

Thank you.
Email: ${userEmail || 'N/A'}
Phone: ${phoneNumber}`;

    res.json({
        success: true,
        subject,
        body,
        supportUrl: 'https://www.whatsapp.com/contact/?subject=messenger'
    });
});

module.exports = router;

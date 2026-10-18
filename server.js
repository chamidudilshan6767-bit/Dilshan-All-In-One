const express = require('express');
const path = require('path');
const useragent = require('express-useragent');
const geoip = require('geoip-lite');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(useragent.express());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let visitorLogs = [];
let ownerMessages = [];
let visitorNames = {};
let userReplies = {};
let adminNotices = [];

function logVisitor(req, pageName) {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();
    
    let locationStr = "Unknown Location";
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.')) {
        ip = 'Localhost (You)';
        locationStr = 'Local Network';
    } else {
        let geo = geoip.lookup(ip);
        if (geo) {
            let country = geo.country || '';
            let city = geo.city || '';
            locationStr = `${city ? city + ', ' : ''}${country}`;
        }
    }
    
    let ua = req.useragent;
    let userAgentRaw = req.headers['user-agent'] || 'Unknown Agent';
    let deviceName = `${ua.platform || 'Device'} - ${ua.os || 'OS'} (${ua.browser || 'Browser'})`;
    
    if (!ua.platform && !ua.os && !ua.browser || deviceName.includes('unknown')) {
        deviceName = userAgentRaw;
    }
    
    if (userAgentRaw.includes('SM-A14') || userAgentRaw.includes('Samsung A14')) {
        deviceName = 'Samsung Galaxy A14 (Mobile)';
    }

    let visitorName = visitorNames[ip] || 'Guest / Unnamed';

    visitorLogs.unshift({
        time: new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
        name: visitorName,
        ip: ip,
        location: locationStr,
        device: deviceName,
        action: `Visited: ${pageName}`
    });

    if (visitorLogs.length > 100) visitorLogs.pop();
}

app.post('/api/set-name', (req, res) => {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();
    
    const { name } = req.body;
    if (name) {
        visitorNames[ip] = name;
    }
    res.json({ success: true, ip: ip });
});

app.post('/api/send-owner-message', (req, res) => {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();

    const { username, message }  = req.body;
    if (username && message) {
        ownerMessages.unshift({
            id: Date.now(),
            time: new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
            ip: ip,
            username: username,
            message: message
        });
        if (ownerMessages.length > 50) ownerMessages.pop();
    }
    res.json({ success: true });
});

app.get('/api/check-reply', (req, res) => {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();

    res.json({ reply: userReplies[ip] || null });
});

app.get('/api/get-notices', (req, res) => {
    res.json({ notices: adminNotices });
});

app.get('/', (req, res) => {
    logVisitor(req, 'Home Page (/)');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/qr-generator.html', (req, res) => {
    logVisitor(req, 'QR Generator Tool');
    res.sendFile(path.join(__dirname, 'public', 'qr-generator.html'));
});

app.get('/whatsapp-unban.html', (req, res) => {
    logVisitor(req, 'WhatsApp Unban Tool');
    res.sendFile(path.join(__dirname, 'public', 'whatsapp-unban.html'));
});

app.get('/password-generator.html', (req, res) => {
    logVisitor(req, 'Password Generator Tool');
    res.sendFile(path.join(__dirname, 'public', 'password-generator.html'));
});

app.get('/tiktok-downloader.html', (req, res) => {
    logVisitor(req, 'Media Downloader Tool');
    res.sendFile(path.join(__dirname, 'public', 'tiktok-downloader.html'));
});

app.get('/admin-updates.html', (req, res) => {
    logVisitor(req, 'Admin Updates Page');
    res.sendFile(path.join(__dirname, 'public', 'admin-updates.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

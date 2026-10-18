const express = require('express');
const path = require('path');
const useragent = require('express-useragent');
const geoip = require('geoip-lite');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(useragent.express());
app.use(express.json());

// Memory-based visitor storage
let visitorLogs = [];
let ownerMessages = [];
let visitorNames = {};
let userReplies = {};

// Helper function to capture visitor details
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

// Endpoint to set name and return IP
app.post('/api/set-name', (req, res) => {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();
    
    const { name } = req.body;
    if (name) {
        visitorNames[ip] = name;
    }
    res.json({ success: true, ip: ip });
});

// Endpoint to send message to owner
app.post('/api/send-owner-message', (req, res) => {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();

    const { username, message } = req.body;
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

// Endpoint for user to check reply
app.get('/api/check-reply', (req, res) => {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();

    res.json({ reply: userReplies[ip] || null });
});

// Routes
app.get('/', (req, res) => {
    logVisitor(req, 'Home Page (/)');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page === 'api' || page === 'admin-dashboard-secret') {
        return next();
    }
    const filePath = path.join(__dirname, 'public', page);
    if (require('fs').existsSync(filePath)) {
        logVisitor(req, page);
        res.sendFile(filePath);
    } else {
        next();
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// Protected Admin API
app.post('/api/admin-stats', (req, res) => {
    const { password, replyText, targetIp } = req.body;
    const ADMIN_PASSWORD = "#chamidu*6767*#";

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, error: "Unauthorized!" });
    }

    if (replyText && targetIp) {
        userReplies[targetIp] = replyText;
        return res.json({ success: true, message: "Reply sent!" });
    }

    res.json({
        success: true,
        logs: visitorLogs,
        messages: ownerMessages
    });
});

// Secret Admin Dashboard Mobile App Route
app.get('/admin-dashboard-secret', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dilshan Admin Panel</title>
            <link rel="icon" type="image/svg+xml" href="/logo.svg">
            <link rel="manifest" href="/manifest.json">
            <meta name="theme-color" content="#00f0ff">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
                body { background: #030712; color: #ffffff; padding: 15px; min-height: 100vh; }
                header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #0a4f8a; padding-bottom: 10px; }
                header h1 { color: #00f0ff; font-size: 1.4rem; text-shadow: 0 0 10px #00f0ff; text-transform: uppercase; }
                
                .install-btn { display: none; width: 100%; max-width: 450px; margin: 0 auto 15px auto; padding: 14px; background: linear-gradient(90deg, #0072ff, #00f0ff); color: #000; font-weight: bold; border: none; border-radius: 10px; cursor: pointer; box-shadow: 0 0 20px rgba(0,240,255,0.6); font-size: 15px; text-transform: uppercase; }
                
                .container { max-width: 500px; margin: 0 auto; }
                .login-card { background: #081028; border: 1px solid #00f0ff; padding: 25px; border-radius: 16px; box-shadow: 0 0 20px rgba(0,240,255,0.3); text-align: center; }
                input { width: 100%; padding: 14px; margin: 15px 0; background: #030712; border: 1px solid #00f0ff; color: #fff; border-radius: 8px; font-size: 16px; outline: none; text-align: center; }
                .btn { width: 100%; padding: 14px; background: linear-gradient(90deg, #0072ff, #00f0ff); color: #000; font-weight: bold; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; text-transform: uppercase; }
                
                .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
                .refresh-btn { padding: 8px 16px; background: #00f0ff; color: #000; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
                
                .section-title { font-size: 15px; font-weight: bold; margin: 20px 0 10px 0; text-transform: uppercase; }
                
                .msg-box-admin { background: #1a0814; border: 1px solid #ff0055; border-radius: 12px; padding: 15px; margin-bottom: 12px; position: relative; }
                .msg-box-admin .time-stamp { font-size: 11px; color: #ff88aa; position: absolute; top: 12px; right: 15px; }
                .msg-box-admin .user-tag { font-size: 15px; font-weight: bold; color: #ff0055; margin-bottom: 4px; }
                .msg-box-admin .msg-body { font-size: 14px; color: #fff; background: #080206; padding: 10px; border-radius: 8px; margin: 8px 0; }
                
                .reply-input-group { display: flex; gap: 8px; margin-top: 8px; }
                .reply-input-group input { margin: 0; padding: 8px; font-size: 13px; text-align: left; }
                .reply-input-group button { width: auto; padding: 8px 14px; font-size: 13px; background: #00ffcc; color: #000; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; }

                .visitor-card { background: #081028; border: 1px solid #00f0ff; border-radius: 12px; padding: 15px; margin-bottom: 12px; position: relative; }
                .visitor-card .time-stamp { font-size: 11px; color: #8ab4f8; position: absolute; top: 12px; right: 15px; }
                .visitor-card .name-tag { font-size: 16px; font-weight: bold; color: #00ffcc; margin-bottom: 4px; }
                .visitor-card .ip-tag { font-size: 13px; color: #ff0055; margin-bottom: 6px; }
                .info-row { font-size: 13px; color: #e2e8f0; margin-top: 4px; display: flex; gap: 6px; }
                .info-row span { color: #00f0ff; font-weight: bold; }
                .no-logs { text-align: center; padding: 15px; color: #8ab4f8; font-size: 13px; background: #081028; border-radius: 10px; }
            </style>
        </head>
        <body>
            <header>
                <h1>CHAMIDU'S ADMIN APP</h1>
            </header>

            <div class="container">
                <button id="installAppBtn" class="install-btn">📲 INSTALL ADMIN APP TO PHONE</button>

                <div id="loginSection" class="login-card">
                    <h3 style="color:#8ab4f8;">Enter Admin Password</h3>
                    <input type="password" id="passInput" placeholder="Password...">
                    <button class="btn" onclick="fetchLogs()">Login to Live Stats</button>
                </div>

                <div id="dashSection" style="display:none;">
                    <div class="dash-header">
                        <span style="font-size:14px; color:#00f0ff;">Live Dashboard (Auto 5s)</span>
                        <button class="refresh-btn" onclick="fetchLogs()">Refresh</button>
                    </div>
                    
                    <div class="section-title" style="color:#ff0055;">📩 Messages from Users</div>
                    <div id="messagesContainer"></div>

                    <div class="section-title" style="color:#00f0ff;">👥 Live Visitors Log</div>
                    <div id="visitorCardsContainer"></div>
                </div>
            </div>

            <script>
                if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

                let deferredPrompt;
                let savedPassword = '';
                const installBtn = document.getElementById('installAppBtn');

                window.addEventListener('beforeinstallprompt', (e) => {
                    e.preventDefault();
                    deferredPrompt = e;
                    installBtn.style.display = 'block';
                });

                installBtn.addEventListener('click', async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') installBtn.style.display = 'none';
                        deferredPrompt = null;
                    }
                });

                async function fetchLogs() {
                    const inputPass = document.getElementById('passInput').value;
                    if (inputPass) savedPassword = inputPass;

                    try {
                        const res = await fetch('/api/admin-stats', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: savedPassword })
                        });
                        const data = await res.json();
                        if (data.success) {
                            document.getElementById('loginSection').style.display = 'none';
                            document.getElementById('dashSection').style.display = 'block';
                            
                            const msgContainer = document.getElementById('messagesContainer');
                            if (!data.messages || data.messages.length === 0) {
                                msgContainer.innerHTML = '<div class="no-logs">No messages received yet.</div>';
                            } else {
                                let mHtml = '';
                                data.messages.forEach(m => {
                                    mHtml += \`
                                        <div class="msg-box-admin">
                                            <div class="time-stamp">\${m.time}</div>
                                            <div class="user-tag">👤 \${m.username} <span style="font-size:11px; color:#ff88aa;">(IP: \${m.ip})</span></div>
                                            <div class="msg-body">💬 \${m.message}</div>
                                            <div class="reply-input-group">
                                                <input type="text" id="reply_\${m.id}" placeholder="Type reply here...">
                                                <button onclick="sendReply('\${m.ip}', 'reply_\${m.id}')">Send Reply</button>
                                            </div>
                                        </div>
                                    \`;
                                });
                                msgContainer.innerHTML = mHtml;
                            }

                            const container = document.getElementById('visitorCardsContainer');
                            if (data.logs.length === 0) {
                                container.innerHTML = '<div class="no-logs">No visits recorded yet.</div>';
                            } else {
                                let html = '';
                                data.logs.forEach(log => {
                                    html += \`
                                        <div class="visitor-card">
                                            <div class="time-stamp">\${log.time}</div>
                                            <div class="name-tag">👤 \${log.name}</div>
                                            <div class="ip-tag">IP: \${log.ip}</div>
                                            <div class="info-row">📍 <span>Location:</span> \${log.location}</div>
                                            <div class="info-row">📱 <span>Device:</span> \${log.device}</div>
                                            <div class="info-row">⚡ <span>Action:</span> \${log.action}</div>
                                        </div>
                                    \`;
                                });
                                container.innerHTML = html;
                            }
                        } else {
                            alert(data.error);
                        }
                    } catch (e) {
                        alert("Login failed or network error!");
                    }
                }

                async function sendReply(targetIp, inputId) {
                    let replyText = document.getElementById(inputId).value.trim();
                    if (!replyText) {
                        alert("Please type a reply message!");
                        return;
                    }

                    try {
                        let res = await fetch('/api/admin-stats', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: savedPassword, replyText, targetIp })
                        });
                        let data = await res.json();
                        if (data.success) {
                            alert("Reply sent successfully to the user!");
                            document.getElementById(inputId).value = '';
                        }
                    } catch(e) {
                        alert("Failed to send reply!");
                    }
                }

                setInterval(() => {
                    if(document.getElementById('dashSection').style.display === 'block') {
                        fetchLogs();
                    }
                }, 5000);
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

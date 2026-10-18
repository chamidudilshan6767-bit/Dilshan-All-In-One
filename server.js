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
// Temporary store for visitor names by IP/Session
let visitorNames = {};

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
    let deviceName = `${ua.platform || 'Device'} - ${ua.os || 'OS'} (${ua.browser || 'Browser'})`;
    
    let userAgentRaw = req.headers['user-agent'] || '';
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

// Endpoint to receive visitor's entered name
app.post('/api/set-name', (req, res) => {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();
    
    const { name } = req.body;
    if (name) {
        visitorNames[ip] = name;
        // Update latest log name if exists for this IP
        for (let log of visitorLogs) {
            if (log.ip === ip) {
                log.name = name;
                break;
            }
        }
    }
    res.json({ success: true });
});

// Routes
app.get('/', (req, res) => {
    logVisitor(req, 'Home Page (/)');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// PWA Service Worker script
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
        self.addEventListener('install', (e) => self.skipWaiting());
        self.addEventListener('activate', (e) => self.clients.claim());
        self.addEventListener('fetch', (e) => {});
    `);
});

app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page === 'api' || page === 'admin-dashboard-secret' || page === 'sw.js') {
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
    const { password } = req.body;
    const ADMIN_PASSWORD = "#chamidu*6767*#";

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, error: "Unauthorized! Incorrect Password." });
    }

    res.json({
        success: true,
        logs: visitorLogs
    });
});

// Secret Admin Dashboard Mobile App with Name display
app.get('/admin-dashboard-secret', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dilshan Admin Panel</title>
            <link rel="icon" type="image/svg+xml" href="/logo.svg">
            <link rel="manifest" href="data:application/manifest+json,${encodeURIComponent(JSON.stringify({
                name: "Dilshan Admin Panel",
                short_name: "Admin App",
                start_url: "/admin-dashboard-secret",
                display: "standalone",
                background_color: "#030712",
                theme_color: "#00f0ff",
                icons: [{
                    src: "/logo.svg",
                    sizes: "512x512",
                    type: "image/svg+xml"
                }]
            }))}">
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
                
                .visitor-card { background: #081028; border: 1px solid #00f0ff; border-radius: 12px; padding: 15px; margin-bottom: 12px; box-shadow: 0 0 15px rgba(0,240,255,0.15); position: relative; }
                .visitor-card .time-stamp { font-size: 11px; color: #8ab4f8; position: absolute; top: 12px; right: 15px; }
                .visitor-card .name-tag { font-size: 16px; font-weight: bold; color: #00ffcc; margin-bottom: 4px; }
                .visitor-card .ip-tag { font-size: 13px; color: #ff0055; margin-bottom: 6px; word-break: break-all; }
                .info-row { font-size: 13px; color: #e2e8f0; margin-top: 4px; display: flex; align-items: center; gap: 6px; }
                .info-row span { color: #00f0ff; font-weight: bold; }
                .no-logs { text-align: center; padding: 20px; color: #8ab4f8; font-size: 14px; }
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
                        <span style="font-size:14px; color:#00f0ff;">Live Visitors Log (Auto 5s)</span>
                        <button class="refresh-btn" onclick="fetchLogs()">Refresh</button>
                    </div>
                    
                    <div id="visitorCardsContainer"></div>
                </div>
            </div>

            <script>
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('/sw.js');
                }

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
                        if (outcome === 'accepted') {
                            installBtn.style.display = 'none';
                        }
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
                            
                            const container = document.getElementById('visitorCardsContainer');
                            if (data.logs.length === 0) {
                                container.innerHTML = '<div class="no-logs">No visits recorded yet. Open main site in new tab!</div>';
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

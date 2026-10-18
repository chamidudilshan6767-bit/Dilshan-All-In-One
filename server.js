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

// Helper function to capture and save visitor details with Location
function logVisitor(req, pageName) {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();
    
    // Default location
    let locationStr = "Unknown Location";

    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.')) {
        ip = 'Localhost (You)';
        locationStr = 'Local Network';
    } else {
        // Fetch Location from IP
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

    visitorLogs.unshift({
        time: new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
        ip: ip,
        location: locationStr,
        device: deviceName,
        action: `Visited: ${pageName}`
    });

    if (visitorLogs.length > 100) visitorLogs.pop();
}

// Explicit route for Home Page to capture visits 100%
app.get('/', (req, res) => {
    logVisitor(req, 'Home Page (/)');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Explicit route for other main pages
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

// Serve static assets
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

// Secret Admin Dashboard App Route with Location Column
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
                short_name: "Admin Panel",
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
                * { box-sizing: border-box; }
                body { background: #030712; color: #00f0ff; font-family: 'Segoe UI', monospace; padding: 15px; margin: 0; }
                h1 { text-align: center; text-shadow: 0 0 10px #00f0ff; font-size: 1.3rem; margin-top: 10px; text-transform: uppercase; }
                .install-btn { display: none; margin: 10px auto; width: 100%; max-width: 400px; padding: 12px; background: #00f0ff; color: #000; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 0 15px #00f0ff; font-size: 14px; text-transform: uppercase; }
                .login-box, .dashboard { max-width: 900px; margin: 20px auto; background: #081028; border: 1px solid #00f0ff; padding: 20px; border-radius: 12px; box-shadow: 0 0 20px rgba(0,240,255,0.3); }
                input, button { padding: 12px; margin: 8px 0; background: #030712; border: 1px solid #00f0ff; color: #fff; border-radius: 6px; width: 100%; font-size: 14px; outline: none; }
                button { background: linear-gradient(90deg, #0072ff, #00f0ff); color: #000; font-weight: bold; cursor: pointer; text-transform: uppercase; }
                .table-container { overflow-x: auto; margin-top: 15px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th, td { border: 1px solid #0a4f8a; padding: 8px; text-align: left; word-break: break-all; }
                th { background: #050b18; color: #00f0ff; }
                tr:hover { background: rgba(0,240,255,0.1); }
            </style>
        </head>
        <body>
            <h1>CHAMIDU'S ADMIN APP</h1>
            <button id="installAppBtn" class="install-btn">📲 INSTALL ADMIN APP TO PHONE</button>
            
            <div id="loginSection" class="login-box">
                <h3 style="margin-bottom:10px; color:#8ab4f8;">Enter Admin Password:</h3>
                <input type="password" id="passInput" placeholder="Enter password...">
                <button onclick="fetchLogs()">Login to Live Stats</button>
            </div>
            
            <div id="dashSection" class="dashboard" style="display:none;">
                <h3 style="color:#00f0ff; margin-bottom:10px;">Live Visitors Log (Auto-refreshing 5s)</h3>
                <button onclick="fetchLogs()" style="width:auto; padding:8px 16px; margin-bottom:10px;">Manual Refresh</button>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>IP Address</th>
                                <th>Location</th>
                                <th>Device Info</th>
                                <th>Action / Activity</th>
                            </tr>
                        </thead>
                        <tbody id="logTableBody">
                        </tbody>
                    </table>
                </div>
            </div>

            <script>
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
                            
                            let html = '';
                            if (data.logs.length === 0) {
                                html = '<tr><td colspan="5" style="text-align:center; color:#8ab4f8;">No visits recorded yet. Open main site in new tab!</td></tr>';
                            } else {
                                data.logs.forEach(log => {
                                    html += \`<tr>
                                        <td>\${log.time}</td>
                                        <td style="color:#ff0055; font-weight:bold;">\${log.ip}</td>
                                        <td style="color:#00f0ff; font-weight:bold;">\${log.location}</td>
                                        <td>\${log.device}</td>
                                        <td>\${log.action}</td>
                                    </tr>\`;
                                });
                            }
                            document.getElementById('logTableBody').innerHTML = html;
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

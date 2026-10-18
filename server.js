const express = require('express');
const path = require('path');
const useragent = require('express-useragent');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(useragent.express());
app.use(express.static(path.join(__dirname, 'public')));

// Store visitor statistics in memory
let analyticsData = {
    totalVisitors: 0,
    devices: {}
};

// Middleware to track device types and visitor counts
app.use((req, res, next) => {
    if (!req.url.includes('.') && !req.url.startsWith('/api/')) {
        analyticsData.totalVisitors++;
        
        let ua = req.useragent;
        let deviceName = 'Unknown Device';

        if (ua.isMobile) {
            deviceName = `Mobile - ${ua.platform || 'Phone'} (${ua.os || 'Android/iOS'})`;
        } else if (ua.isTablet) {
            deviceName = `Tablet (${ua.os || 'Tablet OS'})`;
        } else if (ua.isDesktop) {
            deviceName = `Desktop - ${ua.browser || 'Browser'} (${ua.os || 'Windows/Mac'})`;
        }

        analyticsData.devices[deviceName] = (analyticsData.devices[deviceName] || 0) + 1;
    }
    next();
});

// Endpoint to view stats in JSON format
app.get('/api/stats', (req, res) => {
    res.json({
        status: "success",
        totalVisitors: analyticsData.totalVisitors,
        devicesBreakdown: analyticsData.devices
    });
});

// Fallback to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

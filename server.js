const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const unbanRoutes = require('./routes/unban');
app.use('/api/unban', unbanRoutes);

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WhatsApp Unban Tool page route
app.get('/whatsapp-unban', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'whatsapp-unban.html'));
});

app.listen(PORT, () => {
    console.log(`Dilshan All In One is running on port ${PORT}`);
});

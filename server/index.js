const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// --- FIX 1: Allow Frontend (CORS) ---
app.use(cors({
    // Accept any localhost port in dev (Vite picks 5173, 5174, 5175 depending on availability).
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
        return cb(new Error('CORS not allowed for origin: ' + origin));
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (Images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- FIX 2: Register the Missing Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

// These were missing! Add them now:
// (Make sure you actually have these files in your 'routes' folder)
app.use('/api/products', require('./routes/products'));
app.use('/api/vendor', require('./routes/vendor'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/storefront', require('./routes/storefront'));
app.use('/api/social', require('./routes/social'));
app.use('/api/ai/health', require('./routes/ai/health'));
app.use('/api/ai/search', require('./routes/ai/search'));
app.use('/api/ai/chat', require('./routes/ai/chat'));
app.use('/api/ai/vendor/analytics', require('./routes/ai/vendorAnalytics'));
app.use('/api/ai/related', require('./routes/ai/related'));
app.use('/api/ai/vendor/generate-description', require('./routes/ai/generateDescription'));

// Test Route
app.get('/', (req, res) => {
    res.send('EverShop API is running...');
});

// Database Connection Check
db.query('SELECT NOW()')
    .then(res => console.log('Database connected on ' + res.rows[0].now))
    .catch(err => console.error('Database connection error:', err));

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please stop other server processes or use a different port.`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});
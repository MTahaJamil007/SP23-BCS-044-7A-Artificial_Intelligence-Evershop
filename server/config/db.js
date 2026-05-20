const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'evershop',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'evershop',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

pool.on('connect', () => {
    console.log('Connected to the database');
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};

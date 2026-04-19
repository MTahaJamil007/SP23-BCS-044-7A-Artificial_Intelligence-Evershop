const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Override port for connection if needed, but standard PG uses 5432.
// This script uses the DATABASE_URL from .env or default.

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:PASSWORD@localhost:5432/evershop_db';

const pool = new Pool({
    connectionString,
});

async function setup() {
    try {
        console.log('Reading schema.sql...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Connecting to database...');
        const client = await pool.connect();

        try {
            console.log('Running schema SQL...');
            await client.query(schemaSql);
            console.log('✅ Tables created successfully!');
        } finally {
            client.release();
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating tables:', err);
        process.exit(1);
    }
}

setup();

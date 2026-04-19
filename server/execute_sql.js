const db = require('./config/db');
const fs = require('fs');
const path = require('path');

const run = async () => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await db.query(sql);
        console.log('Schema applied successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();

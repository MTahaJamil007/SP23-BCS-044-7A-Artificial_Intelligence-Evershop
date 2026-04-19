const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const passwordsToTry = [
    'postgres',
    'password',
    'admin',
    'root',
    '123456',
    '1234',
    'master',
    'welcome',
    '123',
    '' // Empty string
];

async function tryConnect(password) {
    const connectionString = `postgres://postgres:${password}@localhost:5432/evershop_db`;
    const client = new Client({ connectionString });
    try {
        await client.connect();
        await client.end();
        return true;
    } catch (err) {
        return false;
    }
}

async function findPassword() {
    console.log('Attempting to find correct PostgreSQL password...');

    for (const pass of passwordsToTry) {
        process.stdout.write(`Trying "${pass}"... `);
        const success = await tryConnect(pass);
        if (success) {
            console.log('SUCCESS! ✅');

            // Update .env
            const envContent = `PORT=5001\nDATABASE_URL=postgres://postgres:${pass}@localhost:5432/evershop_db\nJWT_SECRET=supersecretkey123`;
            fs.writeFileSync(path.join(__dirname, '.env'), envContent);
            console.log('Updated .env with correct password.');
            process.exit(0);
        } else {
            console.log('Failed ❌');
        }
    }

    console.error('Could not find the password. Please update .env manually.');
    process.exit(1);
}

findPassword();

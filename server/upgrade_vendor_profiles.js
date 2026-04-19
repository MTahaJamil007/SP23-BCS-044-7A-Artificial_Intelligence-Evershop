const db = require('./config/db');

const run = async () => {
    try {
        const queries = [
            "ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS store_banner_url VARCHAR(255)"
        ];

        for (const query of queries) {
            await db.query(query);
            console.log(`Executed: ${query}`);
        }

        console.log('Vendor Profile Schema Updated successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();

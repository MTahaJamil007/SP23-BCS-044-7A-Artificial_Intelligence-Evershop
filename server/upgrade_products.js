const db = require('./config/db');

const run = async () => {
    try {
        const queries = [
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}'",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT '{}'",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '[]'"
        ];

        for (const query of queries) {
            await db.query(query);
            console.log(`Executed: ${query}`);
        }

        console.log('Product Schema Updated successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();

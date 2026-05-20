const db = require('./config/db');

const run = async () => {
    try {
        const queries = [
            'CREATE EXTENSION IF NOT EXISTS vector',
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}'",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT '{}'",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '[]'",
            'ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector',
            'ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100)',
            'ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMP WITH TIME ZONE'
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

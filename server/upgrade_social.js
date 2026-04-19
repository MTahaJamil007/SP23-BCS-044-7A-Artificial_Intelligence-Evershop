const db = require('./config/db');

const run = async () => {
    try {
        const queries = [
            // 1. Store Followers Table
            `CREATE TABLE IF NOT EXISTS store_followers (
                id SERIAL PRIMARY KEY,
                vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(vendor_id, user_id)
            )`,

            // 2. Wishlist Table
            `CREATE TABLE IF NOT EXISTS wishlists (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_id)
            )`
        ];

        for (const query of queries) {
            await db.query(query);
            console.log(`Executed Schema Update`);
        }

        console.log('Social Tables Created Successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();

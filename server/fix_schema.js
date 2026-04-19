const db = require('./config/db');

async function fixSchema() {
    try {
        console.log("Adding sub_order_id column to order_items table...");

        // Add the column if it doesn't exist
        await db.query(`
            ALTER TABLE order_items 
            ADD COLUMN IF NOT EXISTS sub_order_id INTEGER REFERENCES sub_orders(id) ON DELETE CASCADE;
        `);

        // Index for performance
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_order_items_sub_order ON order_items(sub_order_id);
        `);

        console.log("Schema migration successful.");
        process.exit();
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

fixSchema();

const db = require('./config/db');
const bcrypt = require('bcryptjs');

const seed = async () => {
    try {
        console.log('Seeding data...');

        // 1. Create Test Vendor
        const salt = await bcrypt.genSalt(10);
        const vendorPass = await bcrypt.hash('vendor123', salt);

        // Using ON CONFLICT DO NOTHING to avoid dupes if run multiple times
        // Note: 'email' is UNIQUE in schema
        const vendorRes = await db.query(`
            INSERT INTO users (name, email, password, role, is_approved)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE SET password = $3
            RETURNING id;
        `, ['Test Vendor', 'vendor@test.com', vendorPass, 'Vendor', true]);

        let vendorId;
        if (vendorRes.rows.length > 0) {
            vendorId = vendorRes.rows[0].id;
            console.log(`Vendor created/updated. ID: ${vendorId}`);
        } else {
            // If updated via DO NOTHING/UPDATE retuning might be empty depending on pg version/driver but here DO UPDATE RETURNING works
            const v = await db.query("SELECT id FROM users WHERE email = 'vendor@test.com'");
            vendorId = v.rows[0].id;
        }

        // 2. Create Test Admin
        const adminPass = await bcrypt.hash('admin123', salt);
        await db.query(`
            INSERT INTO users (name, email, password, role, is_approved)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE SET password = $3;
        `, ['Test Admin', 'admin@test.com', adminPass, 'Administrator', true]);
        console.log('Admin created/updated.');

        // 3. Create Dummy Product
        // Fix columns: title -> name, stock -> stock_quantity
        await db.query(`
            INSERT INTO products (name, description, price, stock_quantity, category, vendor_id, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['Demo Drone', 'High speed racing drone', 499.99, 10, 'Electronics', vendorId, 'uploads/drone_demo.jpg']);
        // Note: image_url is 'uploads/...' assuming we might put a placeholder there later.

        console.log('Dummy product created.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seed();

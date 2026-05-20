const { Pool } = require('pg');
const pool = new Pool({
  user: 'evershop',
  password: 'admin123',
  host: 'localhost',
  port: 5432,
  database: 'evershop'
});

async function buildMarketplace() {
  try {
    console.log("🔒 Extracting secure password hash from existing vendor...");
    // Grab the hashed 'vendor123' password so we don't break authentication
    const hashRes = await pool.query("SELECT password FROM users WHERE email = 'vendor@test.com'");
    const securePassword = hashRes.rows[0].password;

    // Define our 3 new specific vendors
    const newVendors = [
      { email: 'tech@test.com', name: 'Tech Haven', profile: 'Premium electronics and gadgets.', match: ['electronics'] },
      { email: 'fashion@test.com', name: 'The Wardrobe', profile: 'Modern apparel for men and women.', match: ["men's clothing", "women's clothing"] },
      { email: 'jewel@test.com', name: 'Luxe Gems', profile: 'Fine jewelry and accessories.', match: ['jewelery'] }
    ];

    const vendorIdMap = {};

    console.log("🏢 Creating new vendors and profiles...");
    for (const v of newVendors) {
      // 1. Insert User (already approved and set as Vendor)
      const userRes = await pool.query(`
        INSERT INTO users (name, email, password, role, is_approved) 
        VALUES ($1, $2, $3, 'Vendor', true) 
        ON CONFLICT (email) DO UPDATE SET is_approved = true
        RETURNING id
      `, [v.name, v.email, securePassword]);
      
      const newId = userRes.rows[0].id;
      vendorIdMap[v.name] = { id: newId, match: v.match };

      // 2. Insert Store Profile
      await pool.query(`
        INSERT INTO vendor_profiles (user_id, store_name, store_description) 
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO UPDATE SET store_name = EXCLUDED.store_name
      `, [newId, v.name, v.profile]);
      
      console.log(`✅ Created Vendor: ${v.name} (ID: ${newId})`);
    }

    console.log("\n📡 Fetching products from FakeStore API...");
    const response = await fetch("https://fakestoreapi.com/products");
    const products = await response.json();
    
    let count = 0;
    console.log("📦 Distributing products to their specific vendors...");

    for (const item of products) {
      // Find which vendor should own this product based on category
      let ownerId = null;
      for (const key in vendorIdMap) {
        if (vendorIdMap[key].match.includes(item.category)) {
          ownerId = vendorIdMap[key].id;
          break;
        }
      }

      if (ownerId) {
        await pool.query(`
          INSERT INTO products (vendor_id, name, description, price, stock_quantity, image_url, category) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [ownerId, item.title.substring(0, 255), item.description, parseFloat(item.price), 50, item.image, item.category]);
        count++;
      }
    }
    
    console.log(`\n🎉 Success! Assigned ${count} products perfectly across the new vendors.`);

  } catch (error) {
    console.error("❌ Execution error:", error);
  } finally {
    await pool.end();
  }
}

buildMarketplace();

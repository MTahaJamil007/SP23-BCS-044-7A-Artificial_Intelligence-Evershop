// seed-db.js
const { Pool } = require('pg');

// Use your verified working credentials
const pool = new Pool({
  user: 'evershop',
  password: 'admin123',
  host: 'localhost',
  port: 5432,
  database: 'evershop'
});

const FAKESTORE_API_URL = "https://fakestoreapi.com/products";

async function seedCleanData() {
  try {
    console.log("📡 Fetching clean, real-world data from FakeStore API...");
    const response = await fetch(FAKESTORE_API_URL);
    const products = await response.json();
    
    console.log(`📦 Fetched ${products.length} products. Safely injecting into database...`);

    let successCount = 0;

    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      
      // Strict parameterized query respecting your exact schema and constraints
      const query = `
        INSERT INTO products 
        (vendor_id, name, description, price, stock_quantity, image_url, category) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      const values = [
        1,                            // vendor_id (Strictly owned by admin@test.com)
        item.title.substring(0, 255), // name (varchar 255)
        item.description,             // description (text)
        parseFloat(item.price),       // price (numeric)
        100,                          // stock_quantity (integer)
        item.image,                   // image_url (varchar 255)
        item.category                 // category (varchar 100)
      ];

      await pool.query(query, values);
      console.log(`✅ Synced and owned by Vendor 1: ${item.title}`);
      successCount++;
    }
    
    console.log(`\n🎉 Success! ${successCount} products cleanly integrated with zero garbage data.`);
    
  } catch (error) {
    console.error("❌ Database execution error:", error);
  } finally {
    await pool.end(); // Close connection
  }
}

seedCleanData();
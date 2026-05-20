// import-products.js
const SERVER_API_URL = "http://localhost:5001/api/products"; 
const FAKESTORE_API_URL = "https://fakestoreapi.com/products";

// ⚠️ PASTE YOUR RECENTLY COPIED ADMIN TOKEN HERE
const ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFkbWluaXN0cmF0b3IiLCJpYXQiOjE3NzkyMTczNjUsImV4cCI6MTc3OTMwMzc2NX0.ULCYv0RNRm90N1J-o8kjHrGY3o90hvc2JJdDEnR_xw8";

async function populateProducts() {
  try {
    console.log("📡 Connecting to FakeStore API to collect data...");
    const response = await fetch(FAKESTORE_API_URL);
    const products = await response.json();
    
    console.log(`📦 Retreived ${products.length} products. Beginning injection into port 5001...`);

    for (let i = 0; i < products.length; i++) {
      const item = products[i];


      // Exact alignment with your public.products table schema
      const productPayload = {
        name: item.title.substring(0, 255),
        description: item.description || "",
        price: parseFloat(item.price),        // Matches numeric(10,2)
        stock_quantity: 100,                  // Matches stock_quantity int
        image_url: item.image || "",          // Matches image_url varchar(255)
        category: item.category || "General"  // Matches category varchar(100)
      };


      const res = await fetch(SERVER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify(productPayload)
      });

      if (res.ok) {
        console.log(`✅ Product inserted successfully: ${item.title}`);
      } else {
        const errorText = await res.text();
        console.error(`❌ Failed to insert: ${item.title}. Server response: ${errorText}`);
      }
    }
    
    console.log("\n🎉 Data synchronization cycle complete!");
    
  } catch (error) {
    console.error("An unhandled exception occurred during runtime:", error);
  }
}

populateProducts();

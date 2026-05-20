const { Pool } = require('pg');

const pool = new Pool({
  user: 'evershop',
  password: 'admin123',
  host: 'localhost',
  port: 5432,
  database: 'evershop'
});

const DUMMY_JSON_URL = 'https://dummyjson.com/products?limit=100';
const FAKESTORE_URL = 'https://fakestoreapi.com/products';
const FETCH_TIMEOUT_MS = 15000;

// Map categories directly to your specific vendor emails.
const vendorCategoryMap = {
  'tech@test.com': ['smartphones', 'laptops', 'tablets', 'mobile-accessories'],
  'fashion@test.com': ['mens-shirts', 'mens-shoes', 'womens-dresses', 'womens-shoes', 'tops'],
  'jewel@test.com': ['womens-jewellery', 'womens-watches', 'mens-watches']
};

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildLocalFallbackProducts() {
  const categoryTemplates = [
    {
      category: 'smartphones',
      title: 'Aurora X Smartphone',
      description: 'A fast, modern smartphone with a crisp display and long battery life.'
    },
    {
      category: 'laptops',
      title: 'Vertex Pro Laptop',
      description: 'A lightweight laptop designed for everyday productivity and creative work.'
    },
    {
      category: 'tablets',
      title: 'Nimbus Tablet',
      description: 'A portable tablet for media, reading, and on-the-go tasks.'
    },
    {
      category: 'mobile-accessories',
      title: 'Orbit Mobile Accessory',
      description: 'A practical accessory to keep your mobile device powered and protected.'
    },
    {
      category: 'mens-shirts',
      title: 'Tailored Mens Shirt',
      description: 'A clean, versatile shirt built for comfort and daily wear.'
    },
    {
      category: 'mens-shoes',
      title: 'Everyday Mens Shoe',
      description: 'Comfort-focused footwear for casual and active use.'
    },
    {
      category: 'womens-dresses',
      title: 'Modern Womens Dress',
      description: 'A stylish dress with an easy silhouette and refined feel.'
    },
    {
      category: 'womens-shoes',
      title: 'Elegant Womens Shoe',
      description: 'A polished shoe designed for comfort and everyday style.'
    },
    {
      category: 'tops',
      title: 'Classic Everyday Top',
      description: 'A simple top that pairs well with a variety of outfits.'
    },
    {
      category: 'womens-jewellery',
      title: 'Luxe Pendant Necklace',
      description: 'A refined jewelry piece with a premium finish.'
    },
    {
      category: 'womens-watches',
      title: 'Signature Womens Watch',
      description: 'A timeless watch with a clean face and elegant details.'
    },
    {
      category: 'mens-watches',
      title: 'Precision Mens Watch',
      description: 'A durable watch built for everyday reliability and style.'
    }
  ];

  const products = [];

  for (let i = 0; i < categoryTemplates.length; i++) {
    const template = categoryTemplates[i];

    for (let variation = 1; variation <= 8; variation++) {
      products.push({
        title: `${template.title} ${variation}`,
        description: template.description,
        price: (24.99 + i * 9 + variation).toFixed(2),
        stock: 50 + variation,
        thumbnail: `https://picsum.photos/seed/${template.category}-${variation}/600/600`,
        category: template.category
      });
    }
  }

  return products;
}

async function loadProducts() {
  const sources = [
    { label: 'DummyJSON', url: DUMMY_JSON_URL },
    { label: 'FakeStore', url: FAKESTORE_URL }
  ];

  for (const source of sources) {
    try {
      console.log(`📡 Fetching products from ${source.label} API...`);
      const data = await fetchJsonWithTimeout(source.url);
      const products = Array.isArray(data) ? data : data.products;

      if (Array.isArray(products) && products.length > 0) {
        return products;
      }
    } catch (error) {
      console.warn(`⚠️ ${source.label} unavailable, trying the next source...`);
    }
  }

  console.warn('⚠️ External product APIs unavailable, using local fallback inventory.');
  return buildLocalFallbackProducts();
}

async function expandInventory() {
  try {
    const products = await loadProducts();
    console.log(`📦 Loaded ${products.length} products. Beginning vendor assignment...`);

    console.log('🔍 Fetching your vendor IDs from the database...');
    const usersRes = await pool.query("SELECT id, email FROM users WHERE email IN ('tech@test.com', 'fashion@test.com', 'jewel@test.com')");

    const vendorIds = {};
    usersRes.rows.forEach(user => {
      vendorIds[user.email] = user.id;
    });

    let successCount = 0;

    for (const item of products) {
      let targetVendorEmail = null;

      for (const [email, categories] of Object.entries(vendorCategoryMap)) {
        if (categories.includes(item.category)) {
          targetVendorEmail = email;
          break;
        }
      }

      if (targetVendorEmail && vendorIds[targetVendorEmail]) {
        const vendorId = vendorIds[targetVendorEmail];

        await pool.query(
          `
          INSERT INTO products (vendor_id, name, description, price, stock_quantity, image_url, category)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            vendorId,
            item.title.substring(0, 255),
            item.description,
            parseFloat(item.price),
            parseInt(item.stock, 10),
            item.thumbnail,
            item.category
          ]
        );

        console.log(`✅ Added to ${targetVendorEmail}: ${item.title}`);
        successCount++;
      }
    }

    console.log(`\n🎉 Massive Expansion Complete! Added ${successCount} perfectly categorized products.`);
  } catch (error) {
    console.error('❌ Execution error:', error);
  } finally {
    await pool.end();
  }
}

expandInventory();
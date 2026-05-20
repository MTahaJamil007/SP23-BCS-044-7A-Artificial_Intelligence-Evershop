const db = require('./config/db');
require('dotenv').config();

const run = async () => {
  try {
    const queries = [
      `CREATE TABLE IF NOT EXISTS product_embeddings (
        product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
        embedding DOUBLE PRECISION[],
        embedding_model VARCHAR(100),
        embedding_updated_at TIMESTAMP WITH TIME ZONE
      );`
    ];

    for (const q of queries) {
      await db.query(q);
      console.log('Executed:', q.split('\n')[0]);
    }

    console.log('product_embeddings table created/verified');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();

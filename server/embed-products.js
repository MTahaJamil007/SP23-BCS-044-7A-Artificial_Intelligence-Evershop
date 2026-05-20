const { GoogleGenAI } = require('@google/genai');
const db = require('./config/db');
require('dotenv').config();

const MODEL_NAME = 'gemini-embedding-001';
const VECTOR_DIMENSIONS = 768;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let ai = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
} else {
  console.warn('GEMINI_API_KEY not set — running in dry-run mode if DRY_RUN=true');
}

function toPgVectorLiteral(values) {
  return `[${values.map((value) => Number(value).toFixed(8)).join(',')}]`;
}

function buildEmbeddingText(product) {
  const parts = [product.name, product.description, product.category]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);

  return parts.join(' | ');
}

async function embedProduct(product) {
  const text = buildEmbeddingText(product);
  if (!text) {
    return null;
  }
  // If no API key is available and DRY_RUN is set, generate a deterministic
  // pseudo-embedding from the text so we can validate the pipeline without
  // calling the external API.
  if (!ai) {
    if (process.env.DRY_RUN === 'true') {
      // Simple deterministic hash -> floats
      const hash = (s) => {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < s.length; i++) {
          h ^= s.charCodeAt(i);
          h = Math.imul(h, 16777619) >>> 0;
        }
        return h;
      };

      const base = hash(text).toString();
      const embedding = Array.from({ length: VECTOR_DIMENSIONS }, (_, i) => {
        const v = (hash(base + i) % 10000) / 10000; // 0..0.9999
        return v;
      });
      return embedding;
    }

    throw new Error('GEMINI_API_KEY not set. Set GEMINI_API_KEY or run with DRY_RUN=true');
  }

  const response = await ai.models.embedContent({ model: MODEL_NAME, contents: text });

  const embedding = response?.embeddings?.[0]?.values;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error(`No embedding returned for product ${product.id}`);
  }

  if (embedding.length !== VECTOR_DIMENSIONS) {
    console.warn(
      `Product ${product.id} embedding length is ${embedding.length}, expected ${VECTOR_DIMENSIONS}. Continuing with returned vector.`
    );
  }

  return embedding;
}

async function main() {
  if (!GEMINI_API_KEY && process.env.DRY_RUN !== 'true') {
    throw new Error('GEMINI_API_KEY is required in server/.env or run with DRY_RUN=true');
  }

  const productResult = await db.query(
    `
      SELECT id, name, description, category
      FROM products
      ORDER BY id ASC
    `
  );

  console.log(`Found ${productResult.rows.length} products to embed.`);

  let updatedCount = 0;

  for (const product of productResult.rows) {
    const embedding = await embedProduct(product);
    if (!embedding) {
      console.log(`Skipping product ${product.id} because it has no text to embed.`);
      continue;
    }

    const vectorLiteral = toPgVectorLiteral(embedding);

    // Store embeddings in a separate table to avoid requiring superuser
    // privileges for the vector extension. The `product_embeddings` table
    // uses a `double precision[]` column so it works on standard Postgres.
    await db.query(
      `
        INSERT INTO product_embeddings (product_id, embedding, embedding_model, embedding_updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (product_id) DO UPDATE
          SET embedding = EXCLUDED.embedding,
              embedding_model = EXCLUDED.embedding_model,
              embedding_updated_at = EXCLUDED.embedding_updated_at
      `,
      [product.id, embedding, MODEL_NAME]
    );

    updatedCount += 1;
    console.log(`Embedded product ${product.id}: ${product.name}`);
  }

  console.log(`Completed embedding update for ${updatedCount} products.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Embedding script failed:', error);
    process.exit(1);
  });

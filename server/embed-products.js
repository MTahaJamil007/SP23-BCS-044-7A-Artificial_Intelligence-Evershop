/**
 * Re-embeds all products using a structured "product card" text format
 * for richer semantic retrieval.
 *
 * Skips products whose embedding text is unchanged (uses embedding_cache hash).
 * Batches 10 at a time. Writes vector(768) into product_embeddings.embedding.
 *
 * Usage:
 *   npm run embed:products           # real embed
 *   npm run embed:products:dry       # dry run, no API calls
 */
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const db = require('./config/db');
require('dotenv').config();

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const VECTOR_DIMS = 768;
const BATCH_SIZE = 10;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DRY_RUN = process.env.DRY_RUN === 'true';

let ai = null;
if (GEMINI_API_KEY && !DRY_RUN) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function priceTier(price) {
  const p = Number(price);
  if (Number.isNaN(p)) return 'unknown';
  if (p < 50) return 'budget';
  if (p < 200) return 'mid-range';
  if (p < 500) return 'premium';
  return 'luxury';
}

function buildProductCard(product) {
  // No brand column in this schema — derive a sensible fallback.
  const brand = product.brand || extractBrandFromName(product.name) || 'unbranded';

  return [
    `Title: ${product.name}`,
    `Brand: ${brand}`,
    `Category: ${product.category || 'uncategorised'}`,
    `Vendor: ${product.vendor_name || 'unknown vendor'}`,
    `Price: $${Number(product.price).toFixed(2)} (${priceTier(product.price)})`,
    `Description: ${(product.description || '').trim() || 'no description provided'}`,
  ].join('\n');
}

// Best-effort brand extraction from the first capitalised word of the name.
// Examples that work: "Apple iPhone 15", "Nike Air Max", "Samsung Galaxy".
// Falls through to null when nothing useful can be inferred.
function extractBrandFromName(name) {
  if (!name) return null;
  const first = name.split(/\s+/)[0];
  if (!first || first.length < 2) return null;
  if (/^[A-Z][a-zA-Z]+$/.test(first)) return first;
  return null;
}

function hashInput(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 64);
}

function toVecLiteral(values) {
  return `[${values.map(v => Number(v).toFixed(8)).join(',')}]`;
}

// Deterministic pseudo-embedding for DRY_RUN — same input always gives same vector.
function fakeEmbedding(text) {
  const seed = parseInt(hashInput(text).slice(0, 8), 16);
  return Array.from({ length: VECTOR_DIMS }, (_, i) => {
    const x = Math.sin(seed + i * 0.137) * 10000;
    return x - Math.floor(x); // 0..1
  });
}

async function embedOne(text) {
  if (DRY_RUN || !ai) return fakeEmbedding(text);
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: VECTOR_DIMS, taskType: 'SEMANTIC_SIMILARITY' },
  });
  const values = response?.embeddings?.[0]?.values;
  if (!Array.isArray(values) || values.length !== VECTOR_DIMS) {
    throw new Error(`Bad embedding for input (got ${values?.length} dims)`);
  }
  return values;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!GEMINI_API_KEY && !DRY_RUN) {
    throw new Error('GEMINI_API_KEY required (or set DRY_RUN=true)');
  }

  // Pull products + vendor display name in one query.
  const { rows: products } = await db.query(`
    SELECT
      p.id, p.name, p.description, p.price, p.category,
      COALESCE(vp.store_name, u.name) AS vendor_name
    FROM products p
    LEFT JOIN users u ON u.id = p.vendor_id
    LEFT JOIN vendor_profiles vp ON vp.user_id = p.vendor_id
    ORDER BY p.id ASC
  `);

  console.log(`Embedding ${products.length} products${DRY_RUN ? ' (DRY RUN)' : ''}...`);

  let embedded = 0;
  let skipped = 0;
  let cacheHits = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(batch.map(async (product) => {
      const text = buildProductCard(product);
      const hash = hashInput(text);

      // Embedding cache lookup
      const cached = await db.query(
        'SELECT embedding FROM embedding_cache WHERE input_hash = $1',
        [hash]
      );

      let vector;
      let fromCache = false;

      if (cached.rows.length > 0) {
        vector = cached.rows[0].embedding;
        fromCache = true;
      } else {
        const values = await embedOne(text);
        vector = toVecLiteral(values);
        // populate cache
        await db.query(
          `INSERT INTO embedding_cache (input_hash, embedding)
           VALUES ($1, $2) ON CONFLICT (input_hash) DO NOTHING`,
          [hash, vector]
        );
      }

      // Upsert into product_embeddings
      await db.query(
        `INSERT INTO product_embeddings (product_id, embedding, embedding_model, embedding_updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (product_id) DO UPDATE
           SET embedding = EXCLUDED.embedding,
               embedding_model = EXCLUDED.embedding_model,
               embedding_updated_at = EXCLUDED.embedding_updated_at`,
        [product.id, vector, EMBEDDING_MODEL]
      );

      return { id: product.id, name: product.name, fromCache };
    }));

    for (const r of results) {
      if (r.fromCache) cacheHits++;
      embedded++;
      console.log(`  [${embedded}/${products.length}] ${r.fromCache ? 'cache' : 'API  '}  #${r.id} ${r.name}`);
    }
  }

  console.log(`\nDone. Embedded: ${embedded}, cache hits: ${cacheHits}, skipped: ${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('embed-products failed:', err);
    process.exit(1);
  });

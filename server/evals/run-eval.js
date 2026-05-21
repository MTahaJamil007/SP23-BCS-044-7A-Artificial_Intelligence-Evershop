/**
 * Retrieval eval harness.
 *
 * Computes Recall@K and MRR for golden_queries.json against a configurable
 * retriever. Defaults to the M1 baseline: pure cosine-similarity vector search.
 *
 * Usage:
 *   node evals/run-eval.js                       # baseline (vector-only)
 *   node evals/run-eval.js --retriever=hybrid    # M2's hybrid endpoint
 *   node evals/run-eval.js --out=evals/baseline.md
 */
const fs = require('fs');
const path = require('path');
const { embedText } = require('../services/gemini');
const db = require('../config/db');
require('dotenv').config();

const K = 5;

// ─── Args ────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const retrieverName = args.retriever || 'vector';
const outPath = args.out || null;

// ─── Retrievers ──────────────────────────────────────────────────────────────
async function vectorRetrieve(query) {
  const vec = await embedText(query);
  const lit = `[${vec.map(v => Number(v).toFixed(8)).join(',')}]`;
  const { rows } = await db.query(
    `SELECT product_id
       FROM product_embeddings
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
    [lit, K * 2]  // pull 2K to give downstream room
  );
  return rows.map(r => r.product_id);
}

// Call the hybrid search service directly — bypasses the HTTP layer and
// its rate limiter so we measure retrieval quality cleanly. We're not
// testing middleware here.
let _hybridSearch = null;
async function hybridRetrieve(query) {
  if (!_hybridSearch) _hybridSearch = require('../services/hybridSearch').hybridSearch;
  const { results } = await _hybridSearch(query);
  return results.map(r => r.id).slice(0, K * 2);
}

const RETRIEVERS = { vector: vectorRetrieve, hybrid: hybridRetrieve };

// ─── Metrics ─────────────────────────────────────────────────────────────────
function recallAtK(retrieved, expected, k = K) {
  if (expected.length === 0) return 1;
  const expectedSet = new Set(expected);
  const hits = retrieved.slice(0, k).filter(id => expectedSet.has(id)).length;
  // Cap at min(k, expected.length) so multi-answer queries aren't unfairly penalised
  return hits / Math.min(k, expected.length);
}

function mrr(retrieved, expected) {
  const expectedSet = new Set(expected);
  for (let i = 0; i < retrieved.length; i++) {
    if (expectedSet.has(retrieved[i])) return 1 / (i + 1);
  }
  return 0;
}

// ─── Runner ──────────────────────────────────────────────────────────────────
async function main() {
  const retriever = RETRIEVERS[retrieverName];
  if (!retriever) throw new Error(`Unknown retriever: ${retrieverName}`);

  const golden = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'golden_queries.json'), 'utf8')
  ).queries;

  console.log(`Running ${golden.length} queries against retriever="${retrieverName}"...\n`);

  const rows = [];
  let sumRecall = 0;
  let sumMrr = 0;

  for (const q of golden) {
    const t0 = Date.now();
    let retrieved = [];
    let err = null;
    try {
      retrieved = await retriever(q.query);
    } catch (e) {
      err = e.message;
    }
    const latency = Date.now() - t0;

    const r = recallAtK(retrieved, q.expected_product_ids, K);
    const m = mrr(retrieved, q.expected_product_ids);
    sumRecall += r;
    sumMrr += m;

    rows.push({ query: q.query, type: q.type, retrieved: retrieved.slice(0, K), expected: q.expected_product_ids, recall: r, mrr: m, latency, err });
    console.log(
      `[R@5=${r.toFixed(2)}  MRR=${m.toFixed(2)}  ${latency}ms]  ${q.query}` +
      (err ? `  ⚠ ${err}` : '')
    );
  }

  const N = golden.length;
  const avgRecall = sumRecall / N;
  const avgMrr = sumMrr / N;

  console.log(`\n=== Results (${retrieverName}) ===`);
  console.log(`Recall@${K}: ${avgRecall.toFixed(4)}`);
  console.log(`MRR:        ${avgMrr.toFixed(4)}`);

  // Markdown report
  let md = `# Eval results — retriever: \`${retrieverName}\`\n\n`;
  md += `_${new Date().toISOString()}_\n\n`;
  md += `**Aggregate (n=${N}):**\n\n`;
  md += `- Recall@${K}: **${avgRecall.toFixed(4)}**\n`;
  md += `- MRR: **${avgMrr.toFixed(4)}**\n\n`;
  md += `## Per-query\n\n`;
  md += `| Query | Type | R@5 | MRR | Top-${K} | Expected |\n|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    md += `| ${r.query} | ${r.type ?? ''} | ${r.recall.toFixed(2)} | ${r.mrr.toFixed(2)} | ${r.retrieved.join(', ')} | ${r.expected.join(', ')} |\n`;
  }

  if (outPath) {
    const target = path.resolve(__dirname, '..', outPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, md);
    console.log(`\nReport written to ${target}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Eval failed:', err);
  process.exit(1);
});

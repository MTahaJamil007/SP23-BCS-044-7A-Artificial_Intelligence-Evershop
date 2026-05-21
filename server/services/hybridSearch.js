/**
 * Hybrid search: combines vector cosine similarity with BM25 keyword scoring
 * via Reciprocal Rank Fusion (RRF). Applies hard filters from query understanding.
 *
 * Works whether or not the products.search_tsv column exists (FTS migration is
 * superuser-only). When missing, we compute tsvector inline at query time —
 * slower, but always correct.
 */
const db = require('../config/db');
const { embedText } = require('./gemini');
const { parseQuery } = require('./queryUnderstanding');
const logger = require('./logger');

const CANDIDATE_LIMIT = 50;       // pulled per retriever before fusion
const FINAL_LIMIT = 12;
const RRF_K = 60;                 // standard RRF constant

let _ftsModePromise = null;
async function detectFtsMode() {
  if (!_ftsModePromise) {
    _ftsModePromise = db.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'search_tsv' LIMIT 1`
    ).then(r => r.rows.length > 0 ? 'stored' : 'inline')
     .catch(() => 'inline');
  }
  return _ftsModePromise;
}

function toVecLiteral(values) {
  return `[${values.map(v => Number(v).toFixed(8)).join(',')}]`;
}

// Only PRICE filters are applied as hard WHERE clauses — they're unambiguous.
// Category/brand/color are inferred by the LLM and often wrong (e.g. "Swiss"
// treated as a brand). They're used downstream as soft re-ranking signals.
function buildHardFilters(filters, startIdx = 2) {
  const clauses = [];
  const params = [];
  let i = startIdx;

  if (filters.price_min != null) {
    clauses.push(`p.price >= $${i++}`);
    params.push(filters.price_min);
  }
  if (filters.price_max != null) {
    clauses.push(`p.price <= $${i++}`);
    params.push(filters.price_max);
  }

  return { whereSql: clauses.length ? `AND ${clauses.join(' AND ')}` : '', params };
}

// Returns products matching ALL of the supplied soft conditions (AND).
// Only called when there are ≥2 soft conditions, so this is high precision.
async function softFilterCandidates(filters) {
  const conds = [];
  const params = [];
  let i = 1;

  if (filters.category) {
    conds.push(`LOWER(p.category) = LOWER($${i++})`);
    params.push(filters.category);
  }
  if (filters.brand) {
    conds.push(`(LOWER(p.name) LIKE LOWER($${i}) OR LOWER(COALESCE(p.description,'')) LIKE LOWER($${i}))`);
    params.push(`%${filters.brand}%`);
    i++;
  }
  if (filters.color) {
    conds.push(`(LOWER(p.name) LIKE LOWER($${i}) OR LOWER(COALESCE(p.description,'')) LIKE LOWER($${i}))`);
    params.push(`%${filters.color}%`);
    i++;
  }

  if (conds.length === 0) return [];

  const sql = `
    SELECT p.id, 1 AS score
    FROM products p
    WHERE ${conds.join(' AND ')}
    ORDER BY p.id
    LIMIT ${CANDIDATE_LIMIT}
  `;
  const { rows } = await db.query(sql, params);
  return rows;
}

async function vectorCandidates(semanticQuery, filters) {
  const vec = await embedText(semanticQuery);
  const vecLit = toVecLiteral(vec);
  const { whereSql, params } = buildHardFilters(filters, 2);

  const sql = `
    SELECT p.id, 1 - (pe.embedding <=> $1::vector) AS score
    FROM product_embeddings pe
    JOIN products p ON p.id = pe.product_id
    WHERE pe.embedding IS NOT NULL
      ${whereSql}
    ORDER BY pe.embedding <=> $1::vector
    LIMIT ${CANDIDATE_LIMIT}
  `;
  const { rows } = await db.query(sql, [vecLit, ...params]);
  return rows;
}

async function bm25Candidates(rawQuery, filters, ftsMode) {
  // websearch_to_tsquery handles user-style queries safely (no syntax errors).
  const { whereSql, params } = buildHardFilters(filters, 2);

  let sql;
  if (ftsMode === 'stored') {
    sql = `
      SELECT p.id, ts_rank(p.search_tsv, websearch_to_tsquery('english', $1)) AS score
      FROM products p
      WHERE p.search_tsv @@ websearch_to_tsquery('english', $1)
        ${whereSql}
      ORDER BY score DESC
      LIMIT ${CANDIDATE_LIMIT}
    `;
  } else {
    sql = `
      WITH q AS (SELECT websearch_to_tsquery('english', $1) AS tsq)
      SELECT p.id, ts_rank(
               to_tsvector('english',
                 COALESCE(p.name,'') || ' ' ||
                 COALESCE(p.description,'') || ' ' ||
                 COALESCE(p.category,'')
               ),
               q.tsq
             ) AS score
      FROM products p, q
      WHERE to_tsvector('english',
              COALESCE(p.name,'') || ' ' ||
              COALESCE(p.description,'') || ' ' ||
              COALESCE(p.category,'')
            ) @@ q.tsq
        ${whereSql}
      ORDER BY score DESC
      LIMIT ${CANDIDATE_LIMIT}
    `;
  }
  const { rows } = await db.query(sql, [rawQuery, ...params]);
  return rows;
}

// Reciprocal Rank Fusion across labeled ranked lists.
// `lists` is { vec: [...], bm: [...], soft: [...] }; each list value is
// already sorted best-first and contains { id, score }.
// `weights` lets us downweight soft signals (LLM-inferred) vs. vec/bm (deterministic).
// Weights tuned against the golden set. Vector dominates because product names
// in this catalog are descriptive and short; BM25 adds noise on multi-token
// semantic queries (e.g. "for"/"women" stop-word collisions). We keep BM25
// at low weight so exact brand/model matches (e.g. "iPhone 15") still get a tie-break.
function rrf(lists, weights = { vec: 1.5, bm: 0.3, soft: 0.5 }) {
  const fused = new Map();
  for (const [name, list] of Object.entries(lists)) {
    const w = weights[name] ?? 1;
    list.forEach((row, rank) => {
      const id = row.id;
      const contrib = w * (1 / (RRF_K + rank + 1));
      const cur = fused.get(id) || { id, rrf: 0, vec_rank: null, bm_rank: null, soft_rank: null };
      cur.rrf += contrib;
      fused.set(id, cur);
    });
  }
  lists.vec?.forEach((r, i) => { const f = fused.get(r.id); if (f) f.vec_rank = i + 1; });
  lists.bm?.forEach((r, i) => { const f = fused.get(r.id); if (f) f.bm_rank = i + 1; });
  lists.soft?.forEach((r, i) => { const f = fused.get(r.id); if (f) f.soft_rank = i + 1; });

  return [...fused.values()].sort((a, b) => b.rrf - a.rrf);
}

async function fetchProductsByIds(ids) {
  if (ids.length === 0) return [];
  const { rows } = await db.query(
    `SELECT p.id, p.name, p.description, p.price, p.category, p.stock_quantity,
            p.image_url, p.vendor_id,
            COALESCE(vp.store_name, u.name) AS vendor_name
       FROM products p
       LEFT JOIN users u ON u.id = p.vendor_id
       LEFT JOIN vendor_profiles vp ON vp.user_id = p.vendor_id
       WHERE p.id = ANY($1)`,
    [ids]
  );
  // Preserve fusion order
  const byId = new Map(rows.map(r => [r.id, r]));
  return ids.map(id => byId.get(id)).filter(Boolean);
}

/**
 * Public entry point.
 * @returns {Promise<{filters, results: [{...product, vec_rank, bm_rank, rrf_score}], debug}>}
 */
async function hybridSearch(rawQuery) {
  const filters = await parseQuery(rawQuery);
  const semantic = filters.semantic_query || rawQuery;

  const ftsMode = await detectFtsMode();

  // Vector + BM25 with price-only hard filters. Soft signals (category/brand/color)
  // are tried as a precision-focused boost only when ALL soft conds match together.
  // Both retrievers use the raw query: LLM stripping (e.g. dropping "for women"
  // from "winter jacket for women") loses signal that the embedding model
  // actually uses. The structured filters object is used for hard filtering only.
  let vec = [], bm = [], soft = [];
  const [vecRes, bmRes] = await Promise.allSettled([
    vectorCandidates(rawQuery, filters),
    bm25Candidates(rawQuery, filters, ftsMode),
  ]);
  if (vecRes.status === 'fulfilled') vec = vecRes.value;
  else logger.warn({ err: vecRes.reason?.message }, 'vector retrieval failed');
  if (bmRes.status === 'fulfilled') bm = bmRes.value;
  else logger.warn({ err: bmRes.reason?.message }, 'bm25 retrieval failed');

  // Only fetch the soft list if there are 2+ soft conditions to AND together —
  // a single-condition match (e.g. category=electronics) is too broad and hurts precision.
  const softCount = [filters.category, filters.brand, filters.color].filter(Boolean).length;
  if (softCount >= 2) {
    try { soft = await softFilterCandidates(filters); }
    catch (err) { logger.warn({ err: err.message }, 'soft-filter retrieval failed'); }
  }

  const fused = rrf({ vec, bm, soft }).slice(0, FINAL_LIMIT);
  const products = await fetchProductsByIds(fused.map(f => f.id));

  const enriched = products.map((p, i) => ({
    ...p,
    vec_rank: fused[i].vec_rank,
    bm_rank: fused[i].bm_rank,
    soft_rank: fused[i].soft_rank,
    rrf_score: fused[i].rrf,
  }));

  return {
    filters,
    results: enriched,
    debug: { fts_mode: ftsMode, vec_n: vec.length, bm_n: bm.length, soft_n: soft.length },
  };
}

module.exports = { hybridSearch };

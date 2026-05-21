# EverShop AI Architecture

Reference document for the AI layer added on top of the PERN stack. Intended audience: project report reviewers, future maintainers.

## High-level system

```
┌────────────────────────── REACT (Vite) ──────────────────────────┐
│  Customer-facing                                  Vendor-facing  │
│  ├─ SmartSearch (Navbar)                          ├─ Analytics  │
│  │   debounced + voice                            │  Assistant   │
│  ├─ AIAssistant (floating widget)                 └─ Generate   │
│  │   chat w/ inline product cards                    Description │
│  └─ RelatedProducts (product detail)                             │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼  POST/GET (CORS: localhost:*)
┌──────────────────────────── EXPRESS ─────────────────────────────┐
│  /api/ai/health      (M0)  health + budget                       │
│  /api/ai/search      (M2)  hybrid: vec + bm25 + soft filters     │
│  /api/ai/chat        (M4)  tool-calling RAG w/ session memory    │
│  /api/ai/vendor/                                                 │
│      analytics       (M6)  tool-routed analytics (NO text-to-SQL)│
│      generate-description (M7) AI description for new products   │
│  /api/ai/related/:id (M7)  vector-similarity recommendations     │
│                                                                  │
│  Middleware chain on every /api/ai/* route:                      │
│    aiRateLimit  (20 req/min/IP)                                  │
│    aiBudgetGuard (daily request cap → 503)                       │
│    aiUsageLogger (writes ai_logs row on res.finish)              │
└──────────────────────────────────────────────────────────────────┘
              │                       │
              ▼                       ▼
   ┌────────────────────┐   ┌───────────────────────────┐
   │ Gemini API         │   │ PostgreSQL 14 + pgvector  │
   │ - embedding-001    │   │ ─ products + search_tsv   │
   │   (768-dim, MRL)   │   │ ─ product_embeddings      │
   │ - 2.5-flash        │   │   (HNSW vector_cosine_ops)│
   │   tool calling     │   │ ─ chat_sessions (JSONB)   │
   │ - 2.5-flash-lite   │   │ ─ ai_logs                 │
   │   query parsing    │   │ ─ embedding_cache         │
   │                    │   │ ─ query_understanding_   │
   │                    │   │   cache                   │
   │                    │   │ ─ daily_ai_usage          │
   └────────────────────┘   └───────────────────────────┘
```

## Database schema additions

| Table | Purpose | Created in |
|---|---|---|
| `schema_migrations` | tracks applied migrations | M0 |
| `chat_sessions` | UUID-keyed conversation memory, 30-min idle expiry | M0 |
| `ai_logs` | per-request log: route, user, hashed input, retrieved_ids, latency, tokens | M0 |
| `embedding_cache` | hash → vector(768), avoids re-embedding identical text | M0 |
| `daily_ai_usage` | per-day request/token counters, drives `aiBudgetGuard` | M0 |
| `query_understanding_cache` | hash → parsed `{filters}` from LLM, drastically reduces LLM calls on repeat queries | M2 |

Schema modifications:
- `product_embeddings.embedding` converted from `double precision[]` → `vector(768)` so HNSW indexing works
- `products.search_tsv tsvector` (+ GIN index + auto-update trigger) — optional, applied via the `_superuser.sql` migration; hybrid search degrades gracefully to inline `to_tsvector` if absent

## Retrieval — hybrid search (M2)

`POST /api/ai/search { query }` runs three retrievers in parallel and fuses them with **Reciprocal Rank Fusion**.

1. **Query understanding** — Gemini extracts `{price_min, price_max, category, brand, color, semantic_query}`. Result is cached by hashed lowercased query. Zod-validated. Any failure falls back to `{semantic_query: query}`.
2. **Vector retrieval** — embeds the *raw* query via `text-embedding-001` truncated to 768-dim (Matryoshka), `<=>` against `product_embeddings.embedding` with HNSW index. Top 50 candidates.
3. **BM25 retrieval** — `ts_rank(tsvector, websearch_to_tsquery(query))` against `products.search_tsv` (or inline tsvector if FTS migration not applied). Top 50 candidates.
4. **Soft-filter retrieval** — only when ≥2 of {category, brand, color} were extracted. AND-conjunction filter on products. Top 50 candidates.
5. **Reciprocal Rank Fusion** — weighted: `vec=1.5, bm=0.3, soft=0.5`. Score = `Σ w_i / (60 + rank_i)`. Top 12 returned.

**Hard filters**: only `price_min` and `price_max` are applied as SQL `WHERE` clauses. Category/brand/color are *soft* (contribute to ranking, never gate results). Rationale in [server/evals/comparison.md](server/evals/comparison.md).

### Eval

30 hand-picked golden queries in [server/evals/golden_queries.json](server/evals/golden_queries.json), spanning exact, semantic, brand, category, and price-filtered intents.

| Retriever | Recall@5 | MRR | Filter-aware |
|---|---|---|---|
| Vector-only baseline | 0.9917 | 1.0 | ❌ |
| Hybrid (shipped) | 0.9917 | 1.0 | ✅ |

`npm run eval:baseline` and `npm run eval:hybrid` regenerate the markdown reports.

## Chat (M4) — tool-calling RAG

`POST /api/ai/chat { session_id?, message }`

Three tools:
- `searchProducts(query)` → calls hybridSearch internally
- `getProductDetails(product_id)` → live stock via fresh DB read
- `getPolicies(topic)` → static text from [server/content/policies.json](server/content/policies.json)

Orchestrator loop (max 3 tool hops per user message):
1. Load or create `chat_sessions` row (UUID, 30 min idle expiry)
2. Append user message → call Gemini with `{messages, tools, systemInstruction}`
3. If model returns `functionCall(s)`: zod-validate args → execute tool(s) in parallel → append `functionResponse` part(s) → loop
4. If model returns text: extract `[product:ID]` citations → return `{reply, sources, session_id}`

System prompt enforces: only mention tool-returned products, refuse off-topic, refuse prompt injection, mark out-of-stock items explicitly.

## Vendor analytics (M6) — tool-routed, NOT text-to-SQL

`POST /api/ai/vendor/analytics { question }` — vendor JWT required.

Five hand-written SQL functions, every one parameterised by `vendor_id` (taken from `req.user.id`, never from request body or LLM):
- `getLowStockItems({threshold, min_price?})`
- `getTopSellingProducts({timeframe, limit})`
- `getRevenueByCategory({timeframe})`
- `getOrderTrends({timeframe})`
- `getProductsNeverSold({})`

LLM responsibility is only **tool selection + argument extraction**. It never sees the SQL, never controls vendor_id. Zod validates every arg before any DB call. Unsupported questions get the "I can answer: low stock / top sellers / …" help text.

**Security argument**: text-to-SQL on a multi-tenant DB can leak cross-vendor data when the model forgets the `WHERE vendor_id = ?` clause. The tool-routed pattern is strictly safer:
- LLM cannot construct `OR vendor_id IN (...)` byass
- LLM cannot reference non-existent columns (hallucinated fields)
- Prompt injection in product names cannot escape into the SQL string

## Bonus features (M7)

**Related products** — `GET /api/ai/related/:product_id` — pure cosine similarity, no LLM call, no rate-limit cost beyond the IP throttle. Powers the "You may also like" scroller on product pages.

**AI description generator** — `POST /api/ai/vendor/generate-description {name, category, key_features[]}` — vendor JWT required. Strict prompt constraints: 60-100 words, no markdown, no fabricated specs.

## Cost & safety controls

| Control | Implementation |
|---|---|
| Per-IP rate limit | `express-rate-limit`, 20 req/min, configurable via `AI_RATE_LIMIT_PER_MINUTE` |
| Daily budget cap | `daily_ai_usage` table + `aiBudgetGuard` middleware → 503 with friendly message |
| Embedding cache | hash(text) → vector(768) in `embedding_cache`. Re-embed runs skip duplicates. |
| Query understanding cache | hash(lowercased query) → filters JSON. Drives the eval being almost-free after first run. |
| Token tracking | Gemini `usageMetadata.totalTokenCount` accumulated into `daily_ai_usage.token_count` |
| Input hashing | `ai_logs.input_hash` stores SHA-256 prefix, not raw text — no PII in logs |
| Vendor isolation | `vendor_id` always comes from JWT, never request body or LLM output |
| Zod validation | Every LLM-supplied tool arg validated before execution |
| Soft auth on /chat | JWT optional. If present, links session to user; if absent, anonymous chat works |
| Voice search | Web Speech API feature-detected. Mic button hidden entirely on unsupported browsers. |

## Model choices

| Where | Model | Why |
|---|---|---|
| Embeddings | `gemini-embedding-001` @ 768-dim | Matryoshka truncation supported, smaller index, matches existing data |
| Chat (assistant + description gen) | `gemini-2.5-flash` | Strong tool-calling, supports `systemInstruction` |
| Query understanding | `gemini-2.5-flash-lite` | Cheap, fast, sufficient for JSON extraction; higher free-tier RPD than flash |

Model IDs are env-var configurable: `GEMINI_EMBEDDING_MODEL`, `GEMINI_CHAT_MODEL`, `GEMINI_QU_MODEL`.

## Files (added/modified for the AI layer)

```
server/
├── migrations/
│   ├── 001_ai_foundation.sql            # vector conversion, HNSW, all new tables
│   ├── 001_ai_fts_superuser.sql         # tsvector on products (needs postgres)
│   └── 002_query_understanding_cache.sql
├── scripts/migrate.js                   # idempotent runner
├── middleware/ai.js                     # rate limit, budget guard, usage logger
├── services/
│   ├── gemini.js                        # embedText, chatCompletion, incrementUsage
│   ├── logger.js                        # pino
│   ├── hybridSearch.js                  # M2 retrieval orchestrator
│   ├── queryUnderstanding.js            # filter extraction + cache
│   ├── chat/
│   │   ├── tools.js                     # search/details/policies
│   │   ├── systemPrompt.js              # concierge role + citation format
│   │   └── orchestrator.js              # tool-loop, session memory
│   └── analytics/
│       ├── tools.js                     # 5 hand-written SQL functions
│       └── router.js                    # LLM picks one + summarises result
├── routes/ai/
│   ├── health.js
│   ├── search.js
│   ├── chat.js
│   ├── vendorAnalytics.js
│   ├── related.js
│   └── generateDescription.js
├── content/policies.json
├── evals/
│   ├── golden_queries.json              # 30 hand-picked, real product ids
│   ├── run-eval.js                      # Recall@5, MRR
│   ├── baseline.md
│   ├── results.md
│   └── comparison.md
└── embed-products.js                    # rewritten: structured product-card text + cache + batching

client/src/
├── components/
│   ├── SmartSearch/SmartSearch.jsx      # debounced + voice + filter chips
│   ├── AIAssistant/
│   │   ├── AIAssistant.jsx              # floating widget
│   │   └── ProductCard.jsx              # inline card for [product:ID] tokens
│   ├── Vendor/
│   │   ├── AnalyticsAssistant.jsx
│   │   └── AddProduct.jsx               # + ✨ Generate description button
│   └── Customer/
│       ├── ProductDetailLuxury.jsx      # + RelatedProducts at bottom
│       └── RelatedProducts.jsx
├── api/axios.js                         # aiSearch, aiChat, askVendorAnalytics, etc.
└── App.jsx                              # AIAssistant mounted on customer routes
```

## Operating the system

```bash
# One-time
cd server
npm install
psql -d evershop -f migrations/001_ai_fts_superuser.sql   # optional, needs postgres
npm run migrate                                            # applies the rest
npm run embed:products                                     # populate 768-dim vectors

# Day-to-day
npm run dev          # backend on :5001
cd ../client && npm run dev   # frontend on :5173 (or next available)

# Evals
cd server
npm run eval:baseline    # vector-only, writes evals/baseline.md
npm run eval:hybrid      # full pipeline, writes evals/results.md
```

## Known limitations & honest tradeoffs

- Free-tier Gemini quotas (5 RPM flash, 15 RPM flash-lite, 20 RPD per project) cap live usage during demos. Caches mitigate but don't eliminate this.
- Hybrid search ties baseline on retrieval (0.9917 R@5) because the catalog is small (86 products, ~half duplicates). Real value is in filter compliance, not recall improvement. See [server/evals/comparison.md](server/evals/comparison.md).
- Browser voice input is Chromium/Safari only. Mic button is hidden on Firefox.
- Cart is client-side only; the chatbot recommends but cannot persist cart additions to the server.
- `products.search_tsv` requires a superuser migration. The system runs fine without it (falls back to inline tsvector); only large catalogs would notice the speed difference.
- The chatbot doesn't retry on transient Gemini 429s — it surfaces a "rate-limited" message and lets the user retry. Adding exponential backoff is a future improvement.

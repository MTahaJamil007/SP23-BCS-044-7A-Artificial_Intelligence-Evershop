# AI Implementation Brief — EverShop

## Project Context

You are working on a PERN stack e-commerce platform (`client/` = React+Vite, `server/` = Node 20 + Express, DB = PostgreSQL 14 with pgvector). The system has 4 vendors and ~86 products. Product embeddings live in a **`product_embeddings` table** (`product_id`, `embedding vector(768)`, `embedding_model`, `embedding_updated_at`) — NOT on the products table directly. Auth is JWT-based with roles `Administrator`, `Vendor`, `Customer` (capitalized). The Gemini API key is in `server/.env` as `GEMINI_API_KEY`. The `@google/genai` SDK is already installed. JWT payload shape: `{ id, role }` — vendor's user id = their vendor_id throughout the system.

Your job is to add five AI features in strict sequence (M0 → M8). For each milestone, you must:

1. Read existing code before writing anything. Never assume table/column names — verify via node scripts or by reading `server/schema.sql`.
2. Write code in small, reviewable units. Pause after each file for verification.
3. Add tests where specified.
4. NEVER commit or modify `.env`. NEVER log API keys or full prompts containing PII.
5. NEVER generate raw SQL from LLM output and execute it. (See M6 for the safe pattern.)
6. Use parameterized queries. Always.
7. After completing a milestone, output a short "Verification Checklist" the human can run.

## Hard Constraints (apply to every milestone)

- **Security**: All AI endpoints under `/api/ai/*` must go through `requireAuth` + `aiRateLimit` + `aiBudgetGuard` middleware (we'll build these in M0).
- **Vendor isolation**: Any vendor-scoped query MUST inject `vendor_id` from `req.user.id` (the JWT `id` field), never from request body or LLM output.
- **Validation**: All LLM tool-call outputs MUST be validated with `zod` schemas before use. If validation fails, fall back to a safe default and log the failure.
- **Cost**: Every call to Gemini must first check `embedding_cache` (for embeddings) and respect the daily budget in `daily_ai_usage`. If budget exceeded, return a 503 with a friendly message.
- **Logging**: Every AI request writes one row to `ai_logs` with `{route, user_id, input_hash, retrieved_ids, latency_ms, tokens_used, success}`. Never log raw user PII — hash the input.
- **No silent fallbacks to "search returned nothing."** If hybrid search returns 0 results, say so explicitly to the UI.

## Architecture Notes

- Embeddings are stored in `product_embeddings` table with `vector(768)` type (migrated in M0 from `double precision[]`).
- pgvector IS installed. HNSW index lives on `product_embeddings.embedding`.
- JWT contains only `{ id, role }`. For vendor queries, use `req.user.id` as the vendor_id.
- The embed script currently uses `gemini-embedding-001` model. M1 standardizes this to match `.env` config.

## Milestone M0 — Foundation (DO THIS FIRST)

### Goal
Build the infrastructure every other milestone depends on. No user-visible features yet.

### Tasks
1. Create migration file `server/migrations/001_ai_foundation.sql` with:
   - Convert `product_embeddings.embedding` from `double precision[]` to `vector(768)` type.
   - HNSW index on `product_embeddings.embedding` (`CREATE INDEX IF NOT EXISTS product_embeddings_hnsw ON product_embeddings USING hnsw (embedding vector_cosine_ops);`)
   - Add `products.search_tsv tsvector` column, GIN index, and a trigger that auto-updates it from `name || ' ' || COALESCE(description,'') || ' ' || COALESCE(category,'')`.
   - Create tables: `chat_sessions(id uuid pk default gen_random_uuid(), user_id int references users(id), messages jsonb default '[]', created_at, updated_at, expires_at)`, `ai_logs(id serial pk, route varchar, user_id int nullable, input_hash varchar(64), retrieved_ids int[], latency_ms int, tokens_used int, success bool, error text, created_at)`, `embedding_cache(input_hash varchar(64) pk, embedding vector(768), created_at)`, `daily_ai_usage(day date pk, request_count int default 0, token_count bigint default 0)`.
2. Add a runner: `server/scripts/migrate.js` that executes any `*.sql` file in `server/migrations/` it hasn't tracked yet (store applied migrations in a `schema_migrations` table). Add `npm run migrate` to `server/package.json`.
3. Build middleware in `server/middleware/ai.js`:
   - `aiRateLimit` — `express-rate-limit`, 20 req/min per IP for `/api/ai/*`.
   - `aiBudgetGuard` — reads today's row in `daily_ai_usage`, blocks if `request_count >= process.env.AI_DAILY_BUDGET_REQUESTS`.
   - `aiUsageLogger` — writes to `ai_logs` after response is sent.
4. Build `server/services/gemini.js` exposing: `embedText(text)` (with embedding_cache lookup), `chatCompletion({messages, tools})`, `incrementUsage(tokens)`.
5. Build `server/services/logger.js` using `pino`.
6. Add `GET /api/ai/health` returning `{ ok: true, budget_remaining, today_requests }`.

### Acceptance criteria
- `npm run migrate` is idempotent (running twice does nothing the second time).
- `curl localhost:5001/api/ai/health` returns 200 with the right shape.
- Hitting `/api/ai/health` 21 times in a minute returns 429 on the 21st.
- `SELECT * FROM ai_logs` shows one row per request.

### Files to create / modify
- CREATE: `server/migrations/001_ai_foundation.sql`
- CREATE: `server/scripts/migrate.js`
- CREATE: `server/middleware/ai.js`
- CREATE: `server/services/gemini.js`
- CREATE: `server/services/logger.js`
- CREATE: `server/routes/ai/health.js`
- MODIFY: `server/index.js` (mount `/api/ai/health`)
- MODIFY: `server/package.json` (add scripts, deps)

## Milestone M1 — Rich Product Embeddings

### Goal
Re-embed products with a structured "product card" string so retrieval is dramatically better. Also build the eval harness so M2 can measure improvement.

### Tasks
1. Update `server/embed-products.js`:
   - Build the text-to-embed as a structured block:
     ```
     Title: {name}
     Brand: {brand || 'unbranded'}
     Category: {category}
     Vendor: {vendor_name}
     Price: ${price} ({price_tier})  // tier = budget/<50, mid/<200, premium/<500, luxury/>=500
     Description: {description}
     ```
   - Compute `price_tier` server-side.
   - Use `embedding_cache` so re-runs are cheap if text is unchanged (hash the input string).
   - Batch in groups of 10 with `Promise.all`.
   - Write into `product_embeddings.embedding` as `vector(768)`.
2. Create `server/evals/golden_queries.json` with 30 queries — read actual seeded products first.
3. Build `server/evals/run-eval.js`.
4. Add `npm run embed:products` (re-runnable) and `npm run eval`.

## Milestone M2 — Hybrid Search Endpoint

### Goal
`POST /api/ai/search { query: string }` returns best products via extracted filters + BM25 + vector cosine similarity (Reciprocal Rank Fusion).

## Milestone M3 — Smart Search UI (with voice)

### Goal
Replace existing search bar with debounced input + optional voice, hitting `/api/ai/search`.

## Milestone M4 — AI Shopping Assistant Backend (Tool-Calling RAG)

### Goal
Chatbot with tool calls (searchProducts, getProductDetails, getPolicies, addToCart), conversation memory in chat_sessions.

## Milestone M5 — AI Shopping Assistant UI

### Goal
Floating chat widget. Product cards inline with [product:ID] citation tokens.

## Milestone M6 — Vendor Analytics Assistant (Tool-Routed, NOT Text-to-SQL)

### Goal
LLM picks from pre-built analytics functions. SQL is hand-written. LLM never generates SQL.
Vendor isolation: `vendor_id = req.user.id` always injected server-side.

## Milestone M7 — Bonus Features

- "Customers also viewed" via cosine similarity on product_embeddings.
- AI product description generator for vendors.

## Milestone M8 — Eval + Observability Dashboard

- 50-query golden set, chatbot tool-selection tests.
- Admin page: AI usage, ai_logs, top queries.
- AI_ARCHITECTURE.md for report.

## Things You Must Never Do

- Never let LLM-generated text be executed as SQL, shell, or eval'd JS.
- Never pass user JWTs or API keys into LLM prompts.
- Never trust LLM output's structure without zod validation.
- Never embed PII (customer emails, addresses) — only product data.
- Never disable rate limits "temporarily for testing."
- Never commit `.env`, embeddings cache, or `ai_logs` dumps.

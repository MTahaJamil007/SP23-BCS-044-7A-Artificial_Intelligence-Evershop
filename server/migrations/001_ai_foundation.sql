-- Migration 001: AI Foundation
-- Runs as the regular DB user (evershop).
-- Handles: product_embeddings vector conversion, HNSW index, all new AI tables.
-- NOTE: Full-text search on products requires superuser — see 001_ai_fts_superuser.sql.

-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── 1. Convert product_embeddings.embedding to vector(768) ─────────────────
-- The embed-products.js script stored embeddings as double precision[].
-- pgvector HNSW requires the native vector type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_embeddings' AND column_name = 'embedding'
      AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE product_embeddings ADD COLUMN IF NOT EXISTS embedding_vec vector(768);
    UPDATE product_embeddings
      SET embedding_vec = embedding::vector(768)
      WHERE embedding IS NOT NULL AND array_length(embedding, 1) = 768;
    ALTER TABLE product_embeddings DROP COLUMN embedding;
    ALTER TABLE product_embeddings RENAME COLUMN embedding_vec TO embedding;
  END IF;
END$$;

-- ─── 2. HNSW index on product embeddings ────────────────────────────────────
CREATE INDEX IF NOT EXISTS product_embeddings_hnsw
  ON product_embeddings USING hnsw (embedding vector_cosine_ops);

-- ─── 3. Chat sessions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id integer REFERENCES users(id) ON DELETE SET NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_expires_at ON chat_sessions(expires_at);

-- ─── 4. AI request logs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_logs (
  id serial PRIMARY KEY,
  route varchar(100),
  user_id integer,
  input_hash varchar(64),
  retrieved_ids integer[],
  latency_ms integer,
  tokens_used integer,
  success boolean,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_logs_created_at ON ai_logs(created_at DESC);

-- ─── 5. Embedding cache ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS embedding_cache (
  input_hash varchar(64) PRIMARY KEY,
  embedding vector(768) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 6. Daily AI usage / budget ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_ai_usage (
  day date PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 0,
  token_count bigint NOT NULL DEFAULT 0
);

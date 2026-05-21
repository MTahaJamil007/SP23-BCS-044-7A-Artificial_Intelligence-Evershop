-- Migration 002: Query understanding cache
-- Caches the structured filters parsed from a user query so repeat searches
-- and eval runs don't burn LLM quota on the same input.

CREATE TABLE IF NOT EXISTS query_understanding_cache (
  query_hash varchar(64) PRIMARY KEY,
  query_text text NOT NULL,
  filters jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

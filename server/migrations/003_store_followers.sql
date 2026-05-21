-- Migration 003: store_followers table
-- Backfills the missing table that routes/social.js depends on. The endpoints
-- were 500'ing on the vendor dashboard because this table never existed.

CREATE TABLE IF NOT EXISTS store_followers (
  vendor_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id   integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vendor_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_followers_user ON store_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_store_followers_vendor ON store_followers(vendor_id);

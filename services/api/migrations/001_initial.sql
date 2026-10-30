CREATE TABLE IF NOT EXISTS fretenow_tenants (
 id text PRIMARY KEY,
 state jsonb NOT NULL DEFAULT '{"rates":{},"shipments":{},"idempotency":{}}'::jsonb
);
CREATE TABLE IF NOT EXISTS fretenow_sessions (
 token_hash text PRIMARY KEY,
 tenant_id text NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS fretenow_sessions_expiry ON fretenow_sessions(expires_at);

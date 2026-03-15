-- ============================================================
-- Migration 003: eximIA Integration Contract v1
-- Tables: integration_keys, integration_outbound, integration_logs
-- ============================================================

-- ── Inbound API Keys ──
CREATE TABLE IF NOT EXISTS integration_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] DEFAULT '{read}',
  status text DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_used timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_integration_keys_hash ON integration_keys(key_hash);
CREATE INDEX idx_integration_keys_owner ON integration_keys(owner_id);

-- ── Outbound Connections ──
CREATE TABLE IF NOT EXISTS integration_outbound (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  remote_app text NOT NULL,
  remote_url text NOT NULL,
  api_key_encrypted text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('active', 'error', 'pending', 'disabled')),
  entities text[] DEFAULT '{}',
  catalog_cache jsonb,
  last_sync timestamptz,
  last_error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_integration_outbound_owner ON integration_outbound(owner_id);

-- ── Integration Logs ──
CREATE TABLE IF NOT EXISTS integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  method text NOT NULL,
  endpoint text NOT NULL,
  entity text,
  status_code int NOT NULL,
  duration_ms int NOT NULL,
  remote_app text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_integration_logs_created ON integration_logs(created_at DESC);
CREATE INDEX idx_integration_logs_owner ON integration_logs(owner_id);

-- ── RLS Policies ──
ALTER TABLE integration_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_outbound ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- Keys: owner only
CREATE POLICY "integration_keys_owner" ON integration_keys
  FOR ALL USING (auth.uid() = owner_id);

-- Outbound: owner only
CREATE POLICY "integration_outbound_owner" ON integration_outbound
  FOR ALL USING (auth.uid() = owner_id);

-- Logs: owner only
CREATE POLICY "integration_logs_owner" ON integration_logs
  FOR ALL USING (auth.uid() = owner_id);

ALTER TABLE mind_maps ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_mind_maps_share_token ON mind_maps(share_token);

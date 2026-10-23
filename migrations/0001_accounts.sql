CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS favorites (
  discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (discord_id, slug)
);

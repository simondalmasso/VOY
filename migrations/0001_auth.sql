-- ORDER-046 optional account persistence.
-- Identity is provider+provider_sub. Intentionally excludes email/name/avatar,
-- trip history, exact coordinates, searches, audio, transcripts and Google tokens.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS voy_users (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'google' CHECK (provider = 'google'),
  provider_sub TEXT NOT NULL,
  preferences_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL,
  UNIQUE(provider, provider_sub)
);

CREATE TABLE IF NOT EXISTS voy_sessions (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES voy_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS voy_sessions_user_id_idx ON voy_sessions(user_id);
CREATE INDEX IF NOT EXISTS voy_sessions_expires_at_idx ON voy_sessions(expires_at);

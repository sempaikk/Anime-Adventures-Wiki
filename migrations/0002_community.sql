CREATE TABLE IF NOT EXISTS community_media (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
 bytes BLOB NOT NULL, mime TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS community_media_owner ON community_media(owner_id, created_at);
CREATE TABLE IF NOT EXISTS community_profiles (
 owner_id TEXT PRIMARY KEY REFERENCES users(discord_id) ON DELETE CASCADE,
 public_id TEXT NOT NULL UNIQUE, handle TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 bio TEXT NOT NULL DEFAULT '', roblox_name TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
 cover TEXT NOT NULL DEFAULT 'city', avatar_id TEXT REFERENCES community_media(id) ON DELETE SET NULL,
 banner_id TEXT REFERENCES community_media(id) ON DELETE SET NULL,
 published INTEGER NOT NULL DEFAULT 0, show_favorites INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS community_comments (
 id TEXT PRIMARY KEY, article_slug TEXT NOT NULL,
 author_id TEXT REFERENCES users(discord_id) ON DELETE SET NULL,
 parent_id TEXT REFERENCES community_comments(id) ON DELETE SET NULL,
 body TEXT NOT NULL, image_id TEXT REFERENCES community_media(id) ON DELETE SET NULL,
 kind TEXT NOT NULL DEFAULT 'discussion', resolution TEXT NOT NULL DEFAULT 'open',
 moderation TEXT NOT NULL DEFAULT 'visible', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS community_comments_article ON community_comments(article_slug, parent_id, created_at, id);
CREATE INDEX IF NOT EXISTS community_comments_author ON community_comments(author_id, created_at);
CREATE TABLE IF NOT EXISTS community_reports (
 id TEXT PRIMARY KEY, comment_id TEXT NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
 reporter_id TEXT REFERENCES users(discord_id) ON DELETE SET NULL, reason TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL, UNIQUE(comment_id, reporter_id)
);
CREATE TABLE IF NOT EXISTS community_notes (
 id TEXT PRIMARY KEY, article_slug TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
 source_url TEXT NOT NULL, author_id TEXT REFERENCES users(discord_id) ON DELETE SET NULL,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, withdrawn_at INTEGER
);
CREATE INDEX IF NOT EXISTS community_notes_article ON community_notes(article_slug, created_at);

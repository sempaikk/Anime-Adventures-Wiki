CREATE TABLE IF NOT EXISTS community_posts (
 id TEXT PRIMARY KEY, author_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
 body TEXT NOT NULL DEFAULT '', image_id TEXT REFERENCES community_media(id) ON DELETE SET NULL,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 deleted_at INTEGER, moderation TEXT NOT NULL DEFAULT 'visible'
);
CREATE INDEX IF NOT EXISTS community_posts_feed ON community_posts(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS community_posts_author ON community_posts(author_id,created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_image ON community_posts(image_id);
CREATE TABLE IF NOT EXISTS community_post_comments (
 id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
 author_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
 body TEXT NOT NULL, created_at INTEGER NOT NULL, deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS community_post_comments_post ON community_post_comments(post_id,created_at);
CREATE INDEX IF NOT EXISTS community_post_comments_author ON community_post_comments(author_id,created_at);
CREATE TABLE IF NOT EXISTS community_friendships (
 user_a TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
 user_b TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
 requested_by TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL,
 PRIMARY KEY(user_a,user_b), CHECK(user_a<user_b), CHECK(requested_by=user_a OR requested_by=user_b),
 CHECK(status IN ('pending','accepted'))
);
CREATE INDEX IF NOT EXISTS community_friendships_recipient ON community_friendships(user_b,status);
CREATE INDEX IF NOT EXISTS community_friendships_sender ON community_friendships(requested_by,created_at);
CREATE TABLE IF NOT EXISTS community_post_reports (
 id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
 reporter_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
 reason TEXT NOT NULL, created_at INTEGER NOT NULL, resolved_at INTEGER, UNIQUE(post_id,reporter_id)
);
CREATE TABLE IF NOT EXISTS community_social_limits (
 owner_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
 action TEXT NOT NULL, bucket INTEGER NOT NULL, attempts INTEGER NOT NULL,
 PRIMARY KEY(owner_id,action,bucket)
);

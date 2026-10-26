-- Optional wiki context. Existing posts remain unchanged and visible.
CREATE TABLE IF NOT EXISTS community_post_topics (
 post_id TEXT PRIMARY KEY REFERENCES community_posts(id) ON DELETE CASCADE,
 article_slug TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS community_post_topics_article ON community_post_topics(article_slug,post_id);

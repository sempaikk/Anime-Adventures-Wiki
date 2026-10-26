/** Daily housekeeping, independent of whether anyone uploads an image.
 * Keep active sessions, private profiles, all comments and a day of draft media. */
export async function maintainStorage(env) {
  if(!env.DB)return;
  const time=Math.floor(Date.now()/1000), cutoff=time-86400;
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(time).run();
  const community=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='community_media'").first();
  if(!community)return;
  const social=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='community_posts'").first();
  if(social)await env.DB.prepare('DELETE FROM community_social_limits WHERE bucket<?').bind(Math.floor(time/86400)-1).run();
  await env.DB.prepare(`DELETE FROM community_media WHERE created_at < ?
    AND NOT EXISTS(SELECT 1 FROM community_profiles p WHERE p.avatar_id=community_media.id OR p.banner_id=community_media.id)
    AND NOT EXISTS(SELECT 1 FROM community_comments c WHERE c.image_id=community_media.id AND c.deleted_at IS NULL)
    ${social?'AND NOT EXISTS(SELECT 1 FROM community_posts s WHERE s.image_id=community_media.id AND s.deleted_at IS NULL)':''}`)
    .bind(cutoff).run();
}

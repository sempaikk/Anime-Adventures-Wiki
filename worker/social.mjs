// Community posts and friendships reuse the existing Discord identity and D1.
// All lists are bounded; no timers, polling service or paid binding is required.
export async function socialRequest(request, context) {
  const {db,user,path,env,json,fail,text,id,now,readBody,publishedProfile,ownedImage,moderator,safeAvatar,imagePath,profileData,profileSelect}=context;
  const url=new URL(request.url),method=request.method;
  const requireUser=()=>{if(!user)fail('Entre com Discord para continuar.',401);return user};
  const postSelect=`SELECT s.*,p.name AS profile_name,p.handle,p.avatar_id,u.avatar_url AS discord_avatar,
    (SELECT COUNT(*) FROM community_post_comments c JOIN community_profiles cp ON cp.owner_id=c.author_id WHERE c.post_id=s.id AND c.deleted_at IS NULL AND cp.published=1) AS comment_count
    FROM community_posts s JOIN community_profiles p ON p.owner_id=s.author_id JOIN users u ON u.discord_id=s.author_id`;
  const visible="s.deleted_at IS NULL AND s.moderation='visible' AND p.published=1";
  const postData=row=>({id:row.id,body:row.body,image:imagePath(row.image_id),image_id:row.image_id,
    author:{name:row.profile_name,handle:row.handle,url:`/perfil/${row.handle}/`,avatar:row.avatar_id?imagePath(row.avatar_id):safeAvatar(row.discord_avatar)},
    created_at:row.created_at,edited:row.updated_at>row.created_at,comment_count:Number(row.comment_count),
    can_edit:user?.id===row.author_id,can_moderate:moderator(user,env)});
  async function getPost(value){
    const row=await db.prepare(postSelect+` WHERE s.id=? AND ${visible}`).bind(value).first();
    if(!row)fail('Publicação não encontrada.',404);return row;
  }
  const cursor=()=>{const n=Number(url.searchParams.get('before')||0);if(!Number.isSafeInteger(n)||n<0)fail('Página inválida.');return n};
  async function dailyLimit(action,maximum){
    const allowed=await db.prepare(`INSERT INTO community_social_limits(owner_id,action,bucket,attempts) VALUES(?,?,?,1) ON CONFLICT(owner_id,action,bucket) DO UPDATE SET attempts=attempts+1 WHERE attempts<? RETURNING attempts`).bind(user.id,action,Math.floor(now()/86400),maximum).first();
    return !!allowed;
  }
  if(path==='/posts'&&method==='GET'){
    const before=cursor(),friends=url.searchParams.get('feed')==='friends',handle=url.searchParams.get('profile')||'';
    if(friends)requireUser();
    const filter=friends?` AND EXISTS(SELECT 1 FROM community_friendships f WHERE f.status='accepted' AND ((f.user_a=? AND f.user_b=s.author_id) OR (f.user_b=? AND f.user_a=s.author_id)))`:'';
    const params=[before,before,handle,handle,...(friends?[user.id,user.id]:[])];
    const result=await db.prepare(postSelect.replace('SELECT s.*','SELECT s.rowid AS position,s.*')+` WHERE ${visible} AND (?=0 OR s.rowid<?) AND (?='' OR p.handle=?)${filter} ORDER BY s.rowid DESC LIMIT 13`).bind(...params).all();
    return json({posts:result.results.slice(0,12).map(postData),next:result.results.length>12?result.results[11].position:null});
  }
  if(path==='/posts'&&method==='POST'){
    requireUser();await publishedProfile(db,user);
    const data=await readBody(request),body=text(data.body||'',2000,'Publicação'),image=await ownedImage(db,user,data.image_id);
    if(!body&&!image)fail('Escreva algo ou escolha uma foto.');
    const postId=id(),time=now();
    const saved=await db.prepare(`INSERT INTO community_posts(id,author_id,body,image_id,created_at,updated_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM community_posts WHERE author_id=? AND created_at>?)<10 RETURNING id`).bind(postId,user.id,body,image,time,time,user.id,time-3600).first();
    if(!saved)fail('Você atingiu o limite de publicações desta hora. Tente mais tarde.',429);
    return json({post:postData(await getPost(postId))},201);
  }
  const postMatch=path.match(/^\/posts\/([a-f0-9]{32})$/);
  if(postMatch&&['PATCH','DELETE'].includes(method)){
    requireUser();const row=await getPost(postMatch[1]);
    if(row.author_id!==user.id&&!(method==='DELETE'&&moderator(user,env)))fail('Você não pode alterar esta publicação.',403);
    if(method==='DELETE'){
      await db.prepare('UPDATE community_posts SET deleted_at=? WHERE id=?').bind(now(),row.id).run();return json({ok:true});
    }
    const data=await readBody(request),body=text(data.body||'',2000,'Publicação'),image=await ownedImage(db,user,data.image_id);
    if(!body&&!image)fail('Escreva algo ou escolha uma foto.');
    await db.prepare('UPDATE community_posts SET body=?,image_id=?,updated_at=? WHERE id=?').bind(body,image,now(),row.id).run();
    return json({post:postData(await getPost(row.id))});
  }
  const commentsMatch=path.match(/^\/posts\/([a-f0-9]{32})\/comments$/);
  if(commentsMatch&&['GET','POST'].includes(method)){
    const post=await getPost(commentsMatch[1]);
    if(method==='POST'){
      requireUser();await publishedProfile(db,user);
      const data=await readBody(request),body=text(data.body,1000,'Comentário');if(!body)fail('Escreva seu comentário.');
      const time=now();
      const saved=await db.prepare(`INSERT INTO community_post_comments(id,post_id,author_id,body,created_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM community_post_comments WHERE author_id=? AND created_at>?)<30 RETURNING id`).bind(id(),post.id,user.id,body,time,user.id,time-3600).first();
      if(!saved)fail('Você atingiu o limite de comentários desta hora.',429);
    }
    const before=cursor();
    const result=await db.prepare(`SELECT c.*,c.rowid AS position,p.name,p.handle,p.avatar_id,u.avatar_url FROM community_post_comments c JOIN community_profiles p ON p.owner_id=c.author_id JOIN users u ON u.discord_id=c.author_id WHERE c.post_id=? AND c.deleted_at IS NULL AND p.published=1 AND (?=0 OR c.rowid<?) ORDER BY c.rowid DESC LIMIT 21`).bind(post.id,before,before).all();
    return json({comments:result.results.slice(0,20).map(r=>({id:r.id,body:r.body,created_at:r.created_at,can_delete:r.author_id===user?.id||moderator(user,env),author:{name:r.name,url:`/perfil/${r.handle}/`,handle:r.handle,avatar:r.avatar_id?imagePath(r.avatar_id):safeAvatar(r.avatar_url)}})),next:result.results.length>20?result.results[19].position:null},method==='POST'?201:200);
  }
  const commentMatch=path.match(/^\/post-comments\/([a-f0-9]{32})$/);
  if(commentMatch&&method==='DELETE'){
    requireUser();const row=await db.prepare('SELECT author_id FROM community_post_comments WHERE id=? AND deleted_at IS NULL').bind(commentMatch[1]).first();
    if(!row)fail('Comentário não encontrado.',404);
    if(row.author_id!==user.id&&!moderator(user,env))fail('Você não pode excluir este comentário.',403);
    await db.prepare('UPDATE community_post_comments SET deleted_at=? WHERE id=?').bind(now(),commentMatch[1]).run();return json({ok:true});
  }
  const reportMatch=path.match(/^\/posts\/([a-f0-9]{32})\/report$/);
  if(reportMatch&&method==='POST'){
    requireUser();await getPost(reportMatch[1]);
    const data=await readBody(request),reason=text(data.reason,500,'Motivo');if(reason.length<5)fail('Explique o motivo da denúncia.');
    const existing=await db.prepare('SELECT id FROM community_post_reports WHERE post_id=? AND reporter_id=?').bind(reportMatch[1],user.id).first();
    if(existing)return json({ok:true});
    if(!(await dailyLimit('reports',20)))fail('Você atingiu o limite diário de denúncias.',429);
    await db.prepare('INSERT INTO community_post_reports(id,post_id,reporter_id,reason,created_at) VALUES(?,?,?,?,?) ON CONFLICT(post_id,reporter_id) DO NOTHING').bind(id(),reportMatch[1],user.id,reason,now()).run();return json({ok:true});
  }
  if(path==='/post-reports'&&method==='GET'){
    requireUser();if(!moderator(user,env))fail('Acesso restrito à moderação.',403);
    const result=await db.prepare(`SELECT r.id,r.reason,r.created_at,s.id AS post_id,s.body,s.image_id,p.handle,p.name FROM community_post_reports r JOIN community_posts s ON s.id=r.post_id JOIN community_profiles p ON p.owner_id=s.author_id WHERE s.deleted_at IS NULL AND r.resolved_at IS NULL ORDER BY r.created_at LIMIT 30`).all();return json({reports:result.results.map(row=>({...row,image:imagePath(row.image_id)}))});
  }
  const resolveMatch=path.match(/^\/post-reports\/([a-f0-9]{32})$/);
  if(resolveMatch&&method==='PATCH'){
    requireUser();if(!moderator(user,env))fail('Acesso restrito à moderação.',403);
    await db.prepare('UPDATE community_post_reports SET resolved_at=? WHERE id=?').bind(now(),resolveMatch[1]).run();return json({ok:true});
  }
  const friendshipState=row=>!row?'none':row.status==='accepted'?'accepted':row.requested_by===user?.id?'sent':'received';
  if(path==='/friends'&&method==='GET'){
    requireUser();
    const before=cursor();
    const result=await db.prepare(profileSelect.replace('SELECT p.*','SELECT p.*,f.rowid AS position,f.status,f.requested_by')+` JOIN community_friendships f ON ((f.user_a=? AND f.user_b=p.owner_id) OR (f.user_b=? AND f.user_a=p.owner_id)) WHERE p.published=1 AND (?=0 OR f.rowid<?) ORDER BY f.rowid DESC LIMIT 21`).bind(user.id,user.id,before,before).all();
    return json({friends:result.results.slice(0,20).map(row=>({...profileData(row),relationship:friendshipState(row)})),next:result.results.length>20?result.results[19].position:null});
  }
  const friendMatch=path.match(/^\/friends\/([a-z0-9_-]{3,24})$/);
  if(friendMatch&&['GET','POST','PATCH','DELETE'].includes(method)){
    requireUser();
    const target=await db.prepare('SELECT owner_id FROM community_profiles WHERE handle=? AND published=1').bind(friendMatch[1]).first();
    if(!target)fail('Perfil não encontrado ou privado.',404);
    if(target.owner_id===user.id)return method==='GET'?json({relationship:'self'}):fail('Escolha outro perfil.');
    const pair=[user.id,target.owner_id].sort();
    const relation=()=>db.prepare('SELECT * FROM community_friendships WHERE user_a=? AND user_b=?').bind(...pair).first();
    if(method==='POST'){
      await publishedProfile(db,user);
      const existing=await relation();
      if(!existing){
        if(!(await dailyLimit('friends',30)))fail('Você atingiu o limite diário de solicitações.',429);
        await db.prepare('INSERT INTO community_friendships(user_a,user_b,requested_by,created_at) VALUES(?,?,?,?) ON CONFLICT(user_a,user_b) DO NOTHING').bind(...pair,user.id,now()).run();
      }
    }
    if(method==='PATCH'){
      await publishedProfile(db,user);
      const row=await relation();
      if(!row||row.status!=='pending'||row.requested_by===user.id)fail('Solicitação não encontrada.',409);
      await db.prepare("UPDATE community_friendships SET status='accepted' WHERE user_a=? AND user_b=? AND status='pending' AND requested_by<>?").bind(...pair,user.id).run();
    }
    if(method==='DELETE')await db.prepare('DELETE FROM community_friendships WHERE user_a=? AND user_b=?').bind(...pair).run();
    return json({relationship:friendshipState(await relation())});
  }
  return null;
}

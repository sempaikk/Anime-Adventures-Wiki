import { accountsReady, accountSession } from "./accounts.mjs";
import schema from "./community-schema.mjs";
import articles from "../source/community-content.json" with { type: "json" };
import art from "../source/interface-art.json" with { type: "json" };
import {readJson, readLimited} from './security.mjs';
import {imageDimensions} from './raster.mjs';
import {socialRequest} from './social.mjs';
export {imageDimensions} from './raster.mjs';

const initialized = new WeakMap();
const now = () => Math.floor(Date.now() / 1000);
const id = () => crypto.randomUUID().replaceAll("-", "");
const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const text = (value, max, field) => {
  if (typeof value !== "string" || value.length > max)
    fail(`${field}: confira o texto informado.`);
  return value.trim();
};
const moderator = (user, env) =>
  !!user &&
  String(env.COMMUNITY_ADMIN_IDS || "")
    .split(",")
    .map((v) => v.trim())
    .includes(user.id);
const imagePath = (value) => (value ? `/api/community/media/${value}` : null);
const validId = (value) =>
  typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
const covers = {
  city: art.city.image,
  spaceship: art.spaceship.image,
  dungeon: art.dungeon.image,
};
const coverNames = new Set(Object.keys(covers));
async function initialize(db) {
  if (!initialized.has(db))
    initialized.set(
      db,
      db.batch(schema.map((sql) => db.prepare(sql))).catch((error) => {
        initialized.delete(db);
        throw error;
      }),
    );
  return initialized.get(db);
}
async function readBody(request) {
  return readJson(request, 32000);
}
function website(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.href.length > 300
    )
      throw Error();
    return url.href;
  } catch {
    fail("Use um endereço de site que comece com https://.");
  }
}
function requireArticle(slug) {
  if (typeof slug !== "string" || !Object.hasOwn(articles, slug))
    fail("Artigo não encontrado.", 404);
  return slug;
}
function safeAvatar(value) {
  return /^https:\/\/cdn\.discordapp\.com\/(avatars|embed\/avatars)\//.test(
    value || "",
  )
    ? value
    : null;
}
function profileData(row, privateView = false) {
  const value = {
    id: row.public_id,
    handle: row.handle,
    name: row.name,
    bio: row.bio,
    roblox_name: row.roblox_name,
    website: row.website,
    cover: row.cover,
    cover_url: row.banner_id
      ? imagePath(row.banner_id)
      : covers[row.cover] || covers.city,
    avatar: row.avatar_id
      ? imagePath(row.avatar_id)
      : safeAvatar(row.discord_avatar),
    joined: row.joined || row.created_at,
    published: !!row.published,
    show_favorites: !!row.show_favorites,
    url: `/perfil/${row.handle}/`,
  };
  if (privateView)
    Object.assign(value, {
      avatar_id: row.avatar_id,
      banner_id: row.banner_id,
    });
  return value;
}
const profileSelect =
  "SELECT p.*, u.avatar_url AS discord_avatar, u.created_at AS joined FROM community_profiles p JOIN users u ON u.discord_id=p.owner_id";
async function ownProfile(db, user) {
  return db
    .prepare(profileSelect + " WHERE p.owner_id=?")
    .bind(user.id)
    .first();
}
async function ownedImage(db, user, value) {
  if (value === null || value === "" || value === undefined) return null;
  if (
    !validId(value) ||
    !(await db
      .prepare("SELECT id FROM community_media WHERE id=? AND owner_id=?")
      .bind(value, user.id)
      .first())
  )
    fail("Esta imagem não pertence ao seu perfil.");
  return value;
}
async function publishedProfile(db, user) {
  const row = await ownProfile(db, user);
  if (!row?.published)
    fail("Publique seu perfil para participar da comunidade.", 409);
  return row;
}
function commentData(row, user, env) {
  const author =
    row.published && row.author_id
      ? {
          name: row.profile_name,
          handle: row.handle,
          url: `/perfil/${row.handle}/`,
          avatar: row.avatar_id
            ? imagePath(row.avatar_id)
            : safeAvatar(row.discord_avatar),
        }
      : null;
  return {
    id: row.id,
    article: row.article_slug,
    article_title: articles[row.article_slug]?.title || "Artigo",
    article_url: articles[row.article_slug]?.url || "/biblioteca/",
    parent_id: row.parent_id,
    body: row.deleted_at ? "" : row.body,
    image: row.deleted_at ? null : imagePath(row.image_id),
    image_id: row.deleted_at ? null : row.image_id,
    kind: row.kind,
    resolution: row.resolution,
    author,
    deleted: !!row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    edited: row.updated_at > row.created_at,
    reply_count: Number(row.reply_count || 0),
    can_edit: !!user && row.author_id === user.id && !row.deleted_at,
    can_moderate: moderator(user, env),
    moderation: row.moderation,
  };
}
const commentSelect = `SELECT c.*, p.name AS profile_name, p.handle, p.published, p.avatar_id, u.avatar_url AS discord_avatar,
 (SELECT COUNT(*) FROM community_comments r WHERE r.parent_id=c.id AND r.moderation='visible') AS reply_count
 FROM community_comments c LEFT JOIN community_profiles p ON p.owner_id=c.author_id LEFT JOIN users u ON u.discord_id=c.author_id`;
async function commentById(db, value) {
  return db
    .prepare(commentSelect + " WHERE c.id=?")
    .bind(value)
    .first();
}
async function usableImage(db, user, value) {
  return ownedImage(db, user, value);
}

/** Public profiles, article discussions, image attachments and editorial notes. */
export async function communityRequest(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/community/")) return null;
  try {
    if (!accountsReady(env, url.origin))
      return json(
        { error: "A comunidade ainda não está disponível.", enabled: false },
        503,
      );
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(request.method))
      return json({ error: "Método indisponível." }, 405);
    if (
      request.method !== "GET" &&
      request.headers.get("Origin") !== url.origin
    )
      return json({ error: "Reabra o site para continuar." }, 403);
    await initialize(env.DB);
    const db = env.DB,
      path = url.pathname.slice("/api/community".length);
    const user = await accountSession(request, env);
    const requireUser = () => {
      if (!user) fail("Entre com Discord para continuar.", 401);
      return user;
    };
    const social = await socialRequest(request, {db,user,path,env,json,fail,text,id,now,readBody,publishedProfile,ownedImage,moderator,safeAvatar,imagePath,profileData,profileSelect});
    if (social) return social;

    if (path === "/me" && request.method === "GET") {
      requireUser();
      const row = await ownProfile(db, user);
      return json({
        profile: row
          ? profileData(row, true)
          : {
              name: user.name,
              handle: "",
              bio: "",
              roblox_name: "",
              website: "",
              cover: "city",
              cover_url: covers.city,
              avatar: safeAvatar(user.avatar),
              avatar_id: null,
              banner_id: null,
              published: false,
              show_favorites: false,
            },
        moderator: moderator(user, env),
        limits: { image_bytes: 180000, comment_length: 4000 },
      });
    }
    if (path === "/me" && request.method === "PUT") {
      requireUser();
      const data = await readBody(request),
        handle = text(data.handle, 24, "Identificador").toLowerCase();
      if (
        !/^[a-z0-9][a-z0-9_-]{2,23}$/.test(handle) ||
        [
          "admin",
          "api",
          "moderacao",
          "discord",
          "equipe",
          "suporte",
          "perfil",
        ].includes(handle)
      )
        fail(
          "Escolha um identificador de 3 a 24 caracteres, usando letras, números, _ ou -.",
        );
      const name = text(data.name, 50, "Nome");
      if (!name) fail("Informe seu nome de exibição.");
      const bio = text(data.bio || "", 600, "Biografia"),
        roblox = text(data.roblox_name || "", 30, "Nome no Roblox");
      if (roblox && !/^[A-Za-z0-9_]{3,30}$/.test(roblox))
        fail("Confira o nome de usuário do Roblox.");
      const site = website(data.website || ""),
        cover = coverNames.has(data.cover) ? data.cover : "city";
      const avatar = await ownedImage(db, user, data.avatar_id),
        banner = await ownedImage(db, user, data.banner_id);
      const duplicate = await db
        .prepare(
          "SELECT owner_id FROM community_profiles WHERE handle=? AND owner_id<>?",
        )
        .bind(handle, user.id)
        .first();
      if (duplicate) fail("Este identificador já está em uso.", 409);
      const previous = await ownProfile(db, user),
        time = now();
      try {
        await db
          .prepare(
            `INSERT INTO community_profiles(owner_id,public_id,handle,name,bio,roblox_name,website,cover,avatar_id,banner_id,published,show_favorites,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET handle=excluded.handle,name=excluded.name,bio=excluded.bio,roblox_name=excluded.roblox_name,website=excluded.website,cover=excluded.cover,avatar_id=excluded.avatar_id,banner_id=excluded.banner_id,published=excluded.published,show_favorites=excluded.show_favorites,updated_at=excluded.updated_at`,
          )
          .bind(
            user.id,
            previous?.public_id || id(),
            handle,
            name,
            bio,
            roblox,
            site,
            cover,
            avatar,
            banner,
            data.published === true ? 1 : 0,
            data.show_favorites === true ? 1 : 0,
            previous?.created_at || time,
            time,
          )
          .run();
      } catch (error) {
        if (String(error).includes("UNIQUE"))
          fail("Este identificador já está em uso.", 409);
        throw error;
      }
      return json({ profile: profileData(await ownProfile(db, user), true) });
    }
    if (path === "/profiles" && request.method === "GET") {
      const q = (url.searchParams.get("q") || "").slice(0, 80),
        cursor = Number(url.searchParams.get("before") || 0);
      if (!Number.isSafeInteger(cursor) || cursor < 0)
        fail("Página de perfis inválida.");
      const result = await db
        .prepare(
          profileSelect.replace(
            "SELECT p.*",
            "SELECT p.rowid AS position,p.*",
          ) +
            ` WHERE p.published=1 AND (p.name LIKE ? ESCAPE '\\' OR p.handle LIKE ? ESCAPE '\\') AND (?=0 OR p.rowid<?) ORDER BY p.rowid DESC LIMIT 21`,
        )
        .bind(
          "%" + q.replace(/[\\%_]/g, "\\$&") + "%",
          "%" + q.replace(/[\\%_]/g, "\\$&") + "%",
          cursor,
          cursor,
        )
        .all();
      return json({
        profiles: result.results.slice(0, 20).map((row) => profileData(row)),
        next: result.results.length > 20 ? result.results[19].position : null,
      });
    }
    const profileMatch = path.match(/^\/profiles\/([a-z0-9_-]{3,24})$/);
    if (profileMatch && request.method === "GET") {
      const row = await db
        .prepare(profileSelect + " WHERE p.handle=? AND p.published=1")
        .bind(profileMatch[1])
        .first();
      if (!row) fail("Perfil não encontrado ou privado.", 404);
      const comments = await db
        .prepare(
          commentSelect +
            ` WHERE c.author_id=? AND c.deleted_at IS NULL AND c.moderation='visible' AND (c.parent_id IS NULL OR EXISTS(SELECT 1 FROM community_comments root WHERE root.id=c.parent_id AND root.moderation='visible')) ORDER BY c.created_at DESC,c.id DESC LIMIT 12`,
        )
        .bind(row.owner_id)
        .all();
      const count = await db
        .prepare(
          "SELECT COUNT(*) AS count FROM community_comments c WHERE c.author_id=? AND c.deleted_at IS NULL AND c.moderation='visible' AND (c.parent_id IS NULL OR EXISTS(SELECT 1 FROM community_comments root WHERE root.id=c.parent_id AND root.moderation='visible'))",
        )
        .bind(row.owner_id)
        .first();
      const favorites = row.show_favorites
        ? (
            await db
              .prepare(
                "SELECT slug FROM favorites WHERE discord_id=? ORDER BY created_at DESC LIMIT 100",
              )
              .bind(row.owner_id)
              .all()
          ).results.map((f) => f.slug)
        : [];
      return json({
        profile: profileData(row),
        comments: comments.results.map((comment) =>
          commentData(comment, user, env),
        ),
        contributions: Number(count.count),
        favorites,
        own: user?.id === row.owner_id,
        editor: moderator({ id: row.owner_id }, env),
      });
    }

    if (path === "/media" && request.method === "POST") {
      requireUser();
      if (Number(request.headers.get("Content-Length") || 0) > 180000)
        fail("A imagem ultrapassa o limite de envio.", 413);
      const bytes = await readLimited(request, 180000);
      if (bytes.length < 30) fail("Escolha uma imagem válida.");
      const image = imageDimensions(bytes);
      if (
        !image ||
        image.width < 1 ||
        image.height < 1 ||
        image.width > 2400 ||
        image.height > 2400
      )
        fail(
          "Use uma imagem PNG ou WebP válida, com até 2400 pixels por lado.",
        );
      const uploads = await db
        .prepare(
          "SELECT COUNT(*) AS count FROM community_media WHERE owner_id=? AND created_at>?",
        )
        .bind(user.id, now() - 86400)
        .first();
      if (uploads.count >= 30)
        fail(
          "Você atingiu o limite diário de imagens. Tente novamente amanhã.",
          429,
        );
      // Remove unreferenced uploads only after a day, so in-progress drafts remain usable.
      await db
        .prepare(
          `DELETE FROM community_media WHERE created_at<? AND NOT EXISTS(SELECT 1 FROM community_profiles p WHERE p.avatar_id=community_media.id OR p.banner_id=community_media.id) AND NOT EXISTS(SELECT 1 FROM community_comments c WHERE c.image_id=community_media.id AND c.deleted_at IS NULL) AND NOT EXISTS(SELECT 1 FROM community_posts s WHERE s.image_id=community_media.id AND s.deleted_at IS NULL)`,
        )
        .bind(now() - 86400)
        .run();
      const storage = await db
        .prepare(
          "SELECT COALESCE(SUM(length(bytes)),0) AS total FROM community_media",
        )
        .first();
      if (storage.total + bytes.byteLength > 200000000)
        fail(
          "O envio de novas imagens está temporariamente indisponível. Você pode continuar publicando texto.",
          503,
        );
      const mediaId = id();
      const savedMedia = await db
        .prepare(
          "INSERT INTO community_media(id,owner_id,bytes,mime,width,height,created_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(length(bytes)),0) FROM community_media)+?<=200000000 AND (SELECT COUNT(*) FROM community_media WHERE owner_id=? AND created_at>?)<30 RETURNING id",
        )
        .bind(
          mediaId,
          user.id,
          bytes.buffer,
          image.mime,
          image.width,
          image.height,
          now(),
          bytes.byteLength,
          user.id,
          now()-86400,
        )
        .first();
      if(!savedMedia)fail("O limite de imagens foi atingido. Você pode continuar publicando texto.",429);
      return json({ id: mediaId, url: imagePath(mediaId), ...image }, 201);
    }
    const mediaMatch = path.match(/^\/media\/([a-f0-9]{32})$/);
    if (mediaMatch && request.method === "GET") {
      const media = await db
        .prepare("SELECT * FROM community_media WHERE id=?")
        .bind(mediaMatch[1])
        .first();
      if (!media) fail("Imagem não encontrada.", 404);
      const publicUse = await db
        .prepare(
          `SELECT 1 AS visible WHERE EXISTS(SELECT 1 FROM community_profiles WHERE published=1 AND (avatar_id=? OR banner_id=?)) OR EXISTS(SELECT 1 FROM community_comments c LEFT JOIN community_comments root ON root.id=c.parent_id WHERE c.image_id=? AND c.deleted_at IS NULL AND c.moderation='visible' AND (c.parent_id IS NULL OR root.moderation='visible')) OR EXISTS(SELECT 1 FROM community_posts s JOIN community_profiles p ON p.owner_id=s.author_id WHERE s.image_id=? AND s.deleted_at IS NULL AND s.moderation='visible' AND p.published=1)`,
        )
        .bind(media.id, media.id, media.id, media.id)
        .first();
      if (!publicUse && user?.id !== media.owner_id && !moderator(user, env))
        fail("Imagem não encontrada.", 404);
      return new Response(new Uint8Array(media.bytes), {
        headers: {
          "Content-Type": media.mime,
          "Content-Length": String(
            media.bytes.byteLength || media.bytes.length,
          ),
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "Cache-Control": publicUse
            ? "private, max-age=60, must-revalidate"
            : "private, no-store",
        },
      });
    }

    if (path === "/comments" && request.method === "GET") {
      const slug = requireArticle(url.searchParams.get("article")),
        before = url.searchParams.get("before") || "";
      if (before && !validId(before)) fail("Página de comentários inválida.");
      const result = await db
        .prepare(
          commentSelect +
            ` WHERE c.article_slug=? AND c.parent_id IS NULL AND c.moderation='visible' AND (c.deleted_at IS NULL OR EXISTS(SELECT 1 FROM community_comments r WHERE r.parent_id=c.id AND r.moderation='visible')) AND (?='' OR c.rowid<(SELECT rowid FROM community_comments WHERE id=?)) ORDER BY c.rowid DESC LIMIT 11`,
        )
        .bind(slug, before, before)
        .all();
      return json({
        comments: result.results
          .slice(0, 10)
          .map((row) => commentData(row, user, env)),
        next: result.results.length > 10 ? result.results[9].id : null,
        can_comment: !!user && !!(await ownProfile(db, user))?.published,
        logged_in: !!user,
        moderator: moderator(user, env),
      });
    }
    if (path === "/comments" && request.method === "POST") {
      requireUser();
      await publishedProfile(db, user);
      const data = await readBody(request),
        slug = requireArticle(data.article),
        body = text(data.body || "", 4000, "Comentário"),
        image = await usableImage(db, user, data.image_id);
      if (!body && !image) fail("Escreva um comentário ou escolha uma imagem.");
      let parent = null;
      if (data.parent_id) {
        if (!validId(data.parent_id)) fail("Resposta inválida.");
        const target = await commentById(db, data.parent_id);
        if (
          !target ||
          target.article_slug !== slug ||
          target.moderation !== "visible"
        )
          fail("O comentário não está mais disponível.", 404);
        parent = target.parent_id || target.id;
        const root = await commentById(db, parent);
        if (root.moderation !== "visible")
          fail("O comentário não está mais disponível.", 404);
      }
      const recent = await db
        .prepare(
          "SELECT COUNT(*) AS count FROM community_comments WHERE author_id=? AND created_at>?",
        )
        .bind(user.id, now() - 300)
        .first();
      if (recent.count >= 8)
        fail(
          "Você enviou vários comentários em pouco tempo. Aguarde alguns minutos.",
          429,
        );
      const commentId = id(),
        time = now();
      await db
        .prepare(
          "INSERT INTO community_comments(id,article_slug,author_id,parent_id,body,image_id,kind,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          commentId,
          slug,
          user.id,
          parent,
          body,
          image,
          !parent && data.kind === "correction" ? "correction" : "discussion",
          time,
          time,
        )
        .run();
      return json(
        { comment: commentData(await commentById(db, commentId), user, env) },
        201,
      );
    }
    const commentMatch = path.match(
      /^\/comments\/([a-f0-9]{32})(?:\/(replies|report|moderate))?$/,
    );
    if (commentMatch) {
      const row = await commentById(db, commentMatch[1]);
      if (!row) fail("Comentário não encontrado.", 404);
      const action = commentMatch[2];
      if (action === "replies" && request.method === "GET") {
        const root = row.parent_id ? await commentById(db, row.parent_id) : row;
        if (root.moderation !== "visible") fail("Discussão indisponível.", 404);
        const after = url.searchParams.get("after") || "";
        if (after && !validId(after)) fail("Página de respostas inválida.");
        const result = await db
          .prepare(
            commentSelect +
              ` WHERE c.parent_id=? AND c.moderation='visible' AND (?='' OR c.rowid>(SELECT rowid FROM community_comments WHERE id=?)) ORDER BY c.rowid LIMIT 21`,
          )
          .bind(root.id, after, after)
          .all();
        return json({
          comments: result.results
            .slice(0, 20)
            .map((item) => commentData(item, user, env)),
          next: result.results.length > 20 ? result.results[19].id : null,
        });
      }
      requireUser();
      if (!action && request.method === "PATCH") {
        if (
          row.author_id !== user.id ||
          row.deleted_at ||
          row.moderation !== "visible"
        )
          fail(
            "Você pode editar apenas seus próprios comentários disponíveis.",
            403,
          );
        const data = await readBody(request),
          body = text(data.body || "", 4000, "Comentário"),
          image = await usableImage(db, user, data.image_id);
        if (!body && !image) fail("O comentário precisa de texto ou imagem.");
        await db
          .prepare(
            "UPDATE community_comments SET body=?,image_id=?,updated_at=?,resolution=CASE WHEN kind='correction' THEN 'open' ELSE resolution END WHERE id=?",
          )
          .bind(body, image, Math.max(now(), row.updated_at + 1), row.id)
          .run();
        return json({
          comment: commentData(await commentById(db, row.id), user, env),
        });
      }
      if (!action && request.method === "DELETE") {
        if (row.author_id !== user.id)
          fail("Você pode excluir apenas seus próprios comentários.", 403);
        await db
          .prepare(
            "UPDATE community_comments SET body='',image_id=NULL,deleted_at=?,updated_at=? WHERE id=?",
          )
          .bind(now(), Math.max(now(), row.updated_at + 1), row.id)
          .run();
        return json({ ok: true });
      }
      if (action === "report" && request.method === "POST") {
        if (row.moderation !== "visible" || row.deleted_at)
          fail("Comentário indisponível.", 404);
        const data = await readBody(request),
          reason = text(data.reason || "", 300, "Motivo");
        if (reason.length < 5) fail("Explique brevemente o motivo.");
        await db
          .prepare(
            "INSERT OR IGNORE INTO community_reports(id,comment_id,reporter_id,reason,created_at) VALUES(?,?,?,?,?)",
          )
          .bind(id(), row.id, user.id, reason, now())
          .run();
        return json({ ok: true });
      }
      if (action === "moderate" && request.method === "POST") {
        if (!moderator(user, env))
          fail("Acesso reservado à revisão do site.", 403);
        const data = await readBody(request);
        if (
          (data.moderation &&
            !["visible", "hidden"].includes(data.moderation)) ||
          (data.resolution &&
            !["open", "reviewing", "resolved", "declined"].includes(
              data.resolution,
            ))
        )
          fail("Estado de revisão inválido.");
        await db
          .prepare(
            "UPDATE community_comments SET moderation=?,resolution=? WHERE id=?",
          )
          .bind(
            data.moderation || row.moderation,
            data.resolution || row.resolution,
            row.id,
          )
          .run();
        if (data.moderation === "hidden" || data.close_reports === true)
          await db
            .prepare(
              "UPDATE community_reports SET status='closed' WHERE comment_id=?",
            )
            .bind(row.id)
            .run();
        return json({ ok: true });
      }
    }
    if (path === "/review" && request.method === "GET") {
      requireUser();
      if (!moderator(user, env))
        fail("Acesso reservado à revisão do site.", 403);
      const corrections = await db
        .prepare(
          commentSelect +
            " WHERE c.kind='correction' AND c.deleted_at IS NULL AND c.resolution IN ('open','reviewing') ORDER BY c.created_at LIMIT 60",
        )
        .all();
      const reports = await db
        .prepare(
          "SELECT r.id,r.comment_id,r.reason,r.created_at,c.body,c.article_slug FROM community_reports r JOIN community_comments c ON c.id=r.comment_id WHERE r.status='open' ORDER BY r.created_at LIMIT 60",
        )
        .all();
      return json({
        corrections: corrections.results.map((row) =>
          commentData(row, user, env),
        ),
        reports: reports.results.map((row) => ({
          ...row,
          article_title: articles[row.article_slug]?.title,
          article_url: articles[row.article_slug]?.url,
        })),
      });
    }
    if (path === "/notes" && request.method === "GET") {
      const slug = requireArticle(url.searchParams.get("article"));
      const result = await db
        .prepare(
          "SELECT id,title,body,source_url,created_at,updated_at FROM community_notes WHERE article_slug=? AND withdrawn_at IS NULL ORDER BY created_at DESC LIMIT 20",
        )
        .bind(slug)
        .all();
      return json({ notes: result.results, moderator: moderator(user, env) });
    }
    if (path === "/notes" && request.method === "POST") {
      requireUser();
      if (!moderator(user, env))
        fail("Acesso reservado à revisão do site.", 403);
      const data = await readBody(request),
        slug = requireArticle(data.article),
        title = text(data.title || "", 120, "Título"),
        body = text(data.body || "", 5000, "Nota");
      if (!title || !body) fail("Preencha título e texto da nota.");
      const source = website(data.source_url);
      if (!source) fail("Informe a fonte conferida para publicar esta nota.");
      const noteId = id(),
        time = now();
      await db
        .prepare(
          "INSERT INTO community_notes(id,article_slug,title,body,source_url,author_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
        )
        .bind(noteId, slug, title, body, source, user.id, time, time)
        .run();
      return json({ id: noteId }, 201);
    }
    const noteMatch = path.match(/^\/notes\/([a-f0-9]{32})$/);
    if (noteMatch && request.method === "DELETE") {
      requireUser();
      if (!moderator(user, env))
        fail("Acesso reservado à revisão do site.", 403);
      await db
        .prepare("UPDATE community_notes SET withdrawn_at=? WHERE id=?")
        .bind(now(), noteMatch[1])
        .run();
      return json({ ok: true });
    }
    return json({ error: "Recurso indisponível." }, 404);
  } catch (error) {
    if (error.status) return json({ error: error.message }, error.status);
    throw error;
  }
}

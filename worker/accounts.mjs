const SESSION = "__Host-aa-session",
  OAUTH = "__Host-aa-oauth";
const MONTH = 30 * 24 * 60 * 60,
  encoder = new TextEncoder();
const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const cookie = (name, value, age) =>
  `${name}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
const cookies = (request) =>
  new Map(
    (request.headers.get("Cookie") || "")
      .split(";")
      .map((value) => value.trim().split("=")),
  );
const base64 = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const decode = (value) =>
  Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (character) => character.charCodeAt(0),
  );
const random = () => base64(crypto.getRandomValues(new Uint8Array(32)));
const hash = async (value) =>
  base64(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
  );
const now = () => Math.floor(Date.now() / 1000);

function ready(env, origin) {
  if (
    !env.DB ||
    !env.DISCORD_CLIENT_ID ||
    !env.DISCORD_CLIENT_SECRET ||
    !env.SESSION_SECRET ||
    env.SESSION_SECRET.length < 32
  )
    return false;
  try {
    const expected = new URL(env.APP_ORIGIN);
    return (
      expected.origin === origin &&
      expected.protocol === "https:" &&
      expected.pathname === "/"
    );
  } catch {
    return false;
  }
}
async function key(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
async function sign(data, secret) {
  const payload = base64(encoder.encode(JSON.stringify(data)));
  return (
    payload +
    "." +
    base64(
      new Uint8Array(
        await crypto.subtle.sign(
          "HMAC",
          await key(secret),
          encoder.encode(payload),
        ),
      ),
    )
  );
}
async function verify(value, secret) {
  try {
    const [payload, signature, extra] = value.split(".");
    if (extra || !payload || !signature) return null;
    return (await crypto.subtle.verify(
      "HMAC",
      await key(secret),
      decode(signature),
      encoder.encode(payload),
    ))
      ? JSON.parse(new TextDecoder().decode(decode(payload)))
      : null;
  } catch {
    return null;
  }
}
function destination(value, origin) {
  try {
    if (!value?.startsWith("/") || value.startsWith("//")) return "/conta/";
    const url = new URL(value, origin);
    return url.origin === origin
      ? url.pathname + url.search + url.hash
      : "/conta/";
  } catch {
    return "/conta/";
  }
}
function redirect(path, headers = {}) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: path,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      ...headers,
    },
  });
}
async function session(request, env) {
  const token = cookies(request).get(SESSION);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return env.DB.prepare(
    "SELECT u.discord_id AS id, u.display_name AS name, u.avatar_url AS avatar FROM sessions s JOIN users u ON u.discord_id = s.discord_id WHERE s.token_hash = ? AND s.expires_at > ?",
  )
    .bind(await hash(token), now())
    .first();
}
const validSlug = (value) =>
  typeof value === "string" &&
  value.length <= 110 &&
  /^[a-z0-9-]+$/.test(value) &&
  (/\d/.test(value) || /^unit-[a-z0-9-]+$/.test(value));
async function body(request) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    throw new Error("content-type");
  if (Number(request.headers.get("Content-Length") || 0) > 128000)
    throw new Error("size");
  const raw = await request.text();
  if (raw.length > 128000) throw new Error("size");
  return JSON.parse(raw);
}
function jsonWithCookie(data, value) {
  const response = json(data);
  response.headers.set("Set-Cookie", value);
  return response;
}

/** Same-origin account endpoints. Discord tokens are never persisted. */
export async function accountRequest(request, env, network = fetch) {
  const url = new URL(request.url),
    path = url.pathname,
    enabled = ready(env, url.origin);
  if (path === "/api/session" && request.method === "GET")
    return json({
      enabled,
      user: enabled ? await session(request, env) : null,
    });
  if (!enabled)
    return json(
      { error: "O acesso com Discord ainda não está disponível." },
      503,
    );

  if (path === "/api/auth/discord" && request.method === "GET") {
    const state = random(),
      verifier = random();
    const flow = {
      state,
      verifier,
      created: now(),
      returnTo: destination(url.searchParams.get("return_to"), url.origin),
    };
    const authorize = new URL("https://discord.com/oauth2/authorize");
    for (const [name, value] of Object.entries({
      client_id: env.DISCORD_CLIENT_ID,
      redirect_uri: url.origin + "/api/auth/callback",
      response_type: "code",
      scope: "identify",
      state,
      code_challenge: await hash(verifier),
      code_challenge_method: "S256",
    }))
      authorize.searchParams.set(name, value);
    return redirect(authorize.href, {
      "Set-Cookie": cookie(OAUTH, await sign(flow, env.SESSION_SECRET), 600),
    });
  }
  if (path === "/api/auth/callback" && request.method === "GET") {
    const clear = { "Set-Cookie": cookie(OAUTH, "", 0) };
    const flow = await verify(
      cookies(request).get(OAUTH) || "",
      env.SESSION_SECRET,
    );
    if (
      !flow ||
      flow.created > now() + 30 ||
      now() - flow.created > 600 ||
      !flow.state ||
      flow.state !== url.searchParams.get("state")
    )
      return redirect("/conta/?auth=invalid", clear);
    if (url.searchParams.has("error"))
      return redirect("/conta/?auth=cancelled", clear);
    const code = url.searchParams.get("code");
    if (!code || code.length > 4096)
      return redirect("/conta/?auth=invalid", clear);
    let access;
    try {
      const response = await network(
        "https://discord.com/api/v10/oauth2/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: env.DISCORD_CLIENT_ID,
            client_secret: env.DISCORD_CLIENT_SECRET,
            grant_type: "authorization_code",
            code,
            redirect_uri: url.origin + "/api/auth/callback",
            code_verifier: flow.verifier,
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) throw new Error("exchange");
      const grant = await response.json();
      if (
        !grant.access_token ||
        !String(grant.scope).split(" ").includes("identify")
      )
        throw new Error("scope");
      access = grant.access_token;
      const identity = await network("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bearer ${access}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!identity.ok) throw new Error("identity");
      const user = await identity.json();
      if (
        !/^\d{15,22}$/.test(user.id) ||
        typeof user.username !== "string" ||
        user.bot
      )
        throw new Error("identity");
      const avatar =
        user.avatar && /^[a-zA-Z0-9_]+$/.test(user.avatar)
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`
          : `https://cdn.discordapp.com/embed/avatars/${(BigInt(user.id) >> 22n) % 6n}.png`;
      const token = random();
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO users (discord_id, display_name, avatar_url, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(discord_id) DO UPDATE SET display_name = excluded.display_name, avatar_url = excluded.avatar_url",
        ).bind(
          user.id,
          (user.global_name || user.username).slice(0, 100),
          avatar,
          now(),
        ),
        env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(
          now(),
        ),
        env.DB.prepare(
          "INSERT INTO sessions (token_hash, discord_id, expires_at) VALUES (?, ?, ?)",
        ).bind(await hash(token), user.id, now() + MONTH),
      ]);
      const result = redirect(destination(flow.returnTo, url.origin));
      result.headers.append("Set-Cookie", cookie(OAUTH, "", 0));
      result.headers.append("Set-Cookie", cookie(SESSION, token, MONTH));
      return result;
    } catch {
      return redirect("/conta/?auth=unavailable", clear);
    } finally {
      if (access) {
        try {
          await network("https://discord.com/api/v10/oauth2/token/revoke", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: env.DISCORD_CLIENT_ID,
              client_secret: env.DISCORD_CLIENT_SECRET,
              token: access,
            }),
            signal: AbortSignal.timeout(5000),
          });
        } catch {
          /* No access token is stored, even when revocation is temporarily unavailable. */
        }
      }
    }
  }
  if (!["GET", "POST", "PUT", "DELETE"].includes(request.method))
    return json({ error: "Método indisponível." }, 405);
  if (request.method !== "GET" && request.headers.get("Origin") !== url.origin)
    return json({ error: "Reabra esta página para continuar." }, 403);
  const user = await session(request, env);
  if (!user) return json({ error: "Entre com Discord para continuar." }, 401);
  if (path === "/api/logout" && request.method === "POST") {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await hash(cookies(request).get(SESSION)))
      .run();
    return jsonWithCookie({ ok: true }, cookie(SESSION, "", 0));
  }
  if (path === "/api/account" && request.method === "DELETE") {
    const community = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'community_comments'",
    ).first();
    await env.DB.batch([
      ...(community
        ? [
            env.DB.prepare(
              "UPDATE community_comments SET body = '', image_id = NULL, author_id = NULL, deleted_at = ?, updated_at = ? WHERE author_id = ?",
            ).bind(now(), now(), user.id),
            env.DB.prepare(
              "DELETE FROM community_reports WHERE reporter_id = ?",
            ).bind(user.id),
          ]
        : []),
      env.DB.prepare("DELETE FROM favorites WHERE discord_id = ?").bind(
        user.id,
      ),
      env.DB.prepare("DELETE FROM sessions WHERE discord_id = ?").bind(user.id),
      env.DB.prepare("DELETE FROM users WHERE discord_id = ?").bind(user.id),
    ]);
    return jsonWithCookie({ ok: true }, cookie(SESSION, "", 0));
  }
  if (path === "/api/favorites" && request.method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT slug FROM favorites WHERE discord_id = ? ORDER BY created_at, slug",
    )
      .bind(user.id)
      .all();
    return json({ ids: rows.results.map((row) => row.slug) });
  }
  if (path === "/api/favorites/merge" && request.method === "POST") {
    let values;
    try {
      values = (await body(request)).ids;
    } catch {
      return json({ error: "Não foi possível ler os favoritos." }, 400);
    }
    if (
      !Array.isArray(values) ||
      values.length > 1000 ||
      !values.every(validSlug)
    )
      return json({ error: "Lista de favoritos inválida." }, 400);
    const ids = [...new Set(values)];
    const existing = await env.DB.prepare(
      "SELECT slug FROM favorites WHERE discord_id = ?",
    )
      .bind(user.id)
      .all();
    if (
      new Set([...existing.results.map((row) => row.slug), ...ids]).size > 1000
    )
      return json(
        { error: "Sua coleção atingiu o limite de 1.000 favoritos." },
        409,
      );
    for (let offset = 0; offset < ids.length; offset += 80)
      await env.DB.batch(
        ids
          .slice(offset, offset + 80)
          .map((slug) =>
            env.DB.prepare(
              "INSERT OR IGNORE INTO favorites (discord_id, slug, created_at) VALUES (?, ?, ?)",
            ).bind(user.id, slug, now()),
          ),
      );
    return json({ ok: true });
  }
  const match = path.match(/^\/api\/favorites\/([a-z0-9-]+)$/);
  if (
    match &&
    validSlug(match[1]) &&
    ["PUT", "DELETE"].includes(request.method)
  ) {
    if (request.method === "PUT") {
      const count = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM favorites WHERE discord_id = ?",
      )
        .bind(user.id)
        .first();
      if (count.count >= 1000)
        return json(
          { error: "Sua coleção atingiu o limite de 1.000 favoritos." },
          409,
        );
      await env.DB.prepare(
        "INSERT OR IGNORE INTO favorites (discord_id, slug, created_at) VALUES (?, ?, ?)",
      )
        .bind(user.id, match[1], now())
        .run();
    } else
      await env.DB.prepare(
        "DELETE FROM favorites WHERE discord_id = ? AND slug = ?",
      )
        .bind(user.id, match[1])
        .run();
    return json({ ok: true });
  }
  return json({ error: "Recurso indisponível." }, 404);
}

export { ready as accountsReady, session as accountSession };

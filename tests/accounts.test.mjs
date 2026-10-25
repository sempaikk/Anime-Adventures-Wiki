import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { accountRequest } from "../worker/accounts.mjs";

const origin = "https://wiki.example.test";
function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(fs.readFileSync("migrations/0001_accounts.sql", "utf8"));
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) {
          values = args;
          return this;
        },
        async first() {
          return sqlite.prepare(sql).get(...values) || null;
        },
        async all() {
          return { results: sqlite.prepare(sql).all(...values) };
        },
        async run() {
          return sqlite.prepare(sql).run(...values);
        },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const env = {
    DB,
    DISCORD_CLIENT_ID: "1561527465657114644",
    DISCORD_CLIENT_SECRET: "test-secret-only",
    SESSION_SECRET: "isolated-test-key-with-more-than-32-characters",
    APP_ORIGIN: origin,
  };
  return { sqlite, env };
}
async function login(
  env,
  id = "1401930158348177438",
  name = "Nome de exibição",
  previousCookie = "",
) {
  const start = await accountRequest(
    new Request(origin + "/api/auth/discord?return_to=/favoritos/"),
    env,
  );
  const authorize = new URL(start.headers.get("Location"));
  const flowCookie = start.headers.get("Set-Cookie").split(";")[0];
  const calls = [];
  const network = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/oauth2/token"))
      return Response.json({
        access_token: "ephemeral-discord-token",
        scope: "identify",
      });
    if (url.endsWith("/users/@me"))
      return Response.json({
        id,
        username: "original-handle",
        global_name: name,
        avatar: null,
      });
    return new Response(null, { status: 200 });
  };
  const finish = await accountRequest(
    new Request(
      origin +
        "/api/auth/callback?code=isolated-code&state=" +
        authorize.searchParams.get("state"),
      { headers: { Cookie: [flowCookie, previousCookie].filter(Boolean).join('; ') } },
    ),
    env,
    network,
  );
  const cookies = finish.headers.getSetCookie();
  return {
    finish,
    authorize,
    calls,
    cookie: cookies
      .find((value) => value.startsWith("__Host-aa-session="))
      .split(";")[0],
    flowCookie,
  };
}
function request(path, cookie, method = "GET", body, from = origin) {
  return new Request(origin + path, {
    method,
    headers: {
      Cookie: cookie,
      Origin: from,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

test("accounts stay disabled until the same-origin database and secrets are configured", async () => {
  const result = await accountRequest(new Request(origin + "/api/session"), {});
  assert.deepEqual(await result.json(), { enabled: false, user: null });
  const { env } = fixture();
  delete env.SESSION_SECRET;
  assert.equal(
    (
      await (
        await accountRequest(new Request(origin + "/api/session"), env)
      ).json()
    ).enabled,
    false,
  );
  env.SESSION_SECRET = "long-secret-of-at-least-32-characters";
  env.APP_ORIGIN = "https://other.example.test";
  assert.equal(
    (
      await (
        await accountRequest(new Request(origin + "/api/session"), env)
      ).json()
    ).enabled,
    false,
  );
});
test("OAuth uses identify, PKCE, signed state and secure opaque sessions without persisting Discord tokens", async () => {
  const { env, sqlite } = fixture(),
    result = await login(env);
  assert.equal(result.authorize.searchParams.get("scope"), "identify");
  assert.equal(
    result.authorize.searchParams.get("code_challenge_method"),
    "S256",
  );
  assert.equal(result.finish.headers.get("Location"), "/favoritos/");
  assert(
    result.finish.headers
      .getSetCookie()
      .some((value) => value.includes("HttpOnly; Secure; SameSite=Lax")),
  );
  const verifier = result.calls[0].options.body.get("code_verifier");
  const expected = Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
  ).toString("base64url");
  assert.equal(result.authorize.searchParams.get("code_challenge"), expected);
  assert(
    result.calls.some((call) => call.url.endsWith("/oauth2/token/revoke")),
  );
  const rows = sqlite.prepare("SELECT * FROM sessions").all();
  assert.equal(rows.length, 1);
  assert(!JSON.stringify(rows).includes("ephemeral-discord-token"));
  assert(!result.cookie.includes(rows[0].token_hash));
  const session = await (
    await accountRequest(request("/api/session", result.cookie), env)
  ).json();
  assert.equal(session.user.name, "Nome de exibição");
  assert(!JSON.stringify(session).includes("original-handle"));
});
test("invalid OAuth state cannot contact Discord or create a session", async () => {
  const { env, sqlite } = fixture();
  let calls = 0;
  const response = await accountRequest(
    request(
      "/api/auth/callback?code=bad&state=bad",
      "__Host-aa-oauth=forged.value",
    ),
    env,
    async () => {
      calls++;
      throw Error();
    },
  );
  assert.equal(response.status, 303);
  assert.match(response.headers.get("Location"), /invalid/);
  assert.equal(calls, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM sessions").get().n, 0);
});
test("OAuth return URLs cannot redirect visitors to another origin", async () => {
  const { env } = fixture();
  for (const value of ["https://evil.test", "//evil.test", "/\\evil.test"]) {
    const start = await accountRequest(
      new Request(
        origin + "/api/auth/discord?return_to=" + encodeURIComponent(value),
      ),
      env,
    );
    const flow = start.headers.get("Set-Cookie").split(";")[0],
      state = new URL(start.headers.get("Location")).searchParams.get("state");
    const result = await accountRequest(
      request(
        "/api/auth/callback?state=" + state + "&error=access_denied",
        flow,
      ),
      env,
    );
    assert.equal(result.headers.get("Location"), "/conta/?auth=cancelled");
  }
});
test("favorites merge across devices without replacing another collection, and accounts remain isolated", async () => {
  const { env } = fixture();
  const first = await login(env),
    secondDevice = await login(env),
    other = await login(env, "1401953040004550858", "Outra pessoa");
  assert.equal(
    (
      await accountRequest(
        request("/api/favorites/agony-divine-5379", first.cookie, "PUT"),
        env,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await accountRequest(
        request("/api/favorites/merge", secondDevice.cookie, "POST", {
          ids: ["traits-165", "agony-divine-5379"],
        }),
        env,
      )
    ).status,
    200,
  );
  assert.deepEqual(
    new Set(
      (
        await (
          await accountRequest(request("/api/favorites", first.cookie), env)
        ).json()
      ).ids,
    ),
    new Set(["agony-divine-5379", "traits-165"]),
  );
  assert.deepEqual(
    (
      await (
        await accountRequest(request("/api/favorites", other.cookie), env)
      ).json()
    ).ids,
    [],
  );
  await accountRequest(
    request("/api/favorites/traits-165", secondDevice.cookie, "DELETE"),
    env,
  );
  assert.deepEqual(
    (
      await (
        await accountRequest(request("/api/favorites", first.cookie), env)
      ).json()
    ).ids,
    ["agony-divine-5379"],
  );
});
test("cross-origin changes and malformed collections are refused", async () => {
  const { env } = fixture(),
    user = await login(env);
  assert.equal(
    (
      await accountRequest(
        request(
          "/api/favorites/traits-165",
          user.cookie,
          "PUT",
          undefined,
          "https://evil.test",
        ),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await accountRequest(
        request("/api/favorites/merge", user.cookie, "POST", {
          ids: ["<script>alert(1)</script>"],
        }),
        env,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await accountRequest(
        request("/api/favorites/merge", user.cookie, "POST", {
          ids: Array(1001).fill("traits-165"),
        }),
        env,
      )
    ).status,
    400,
  );
});
test("logout revokes its session; deleting the profile clears all devices and account data", async () => {
  const { env, sqlite } = fixture(),
    one = await login(env),
    two = await login(env);
  await accountRequest(request("/api/logout", one.cookie, "POST"), env);
  assert.equal(
    (await accountRequest(request("/api/favorites", one.cookie), env)).status,
    401,
  );
  await accountRequest(
    request("/api/favorites/traits-165", two.cookie, "PUT"),
    env,
  );
  assert.equal(
    (await accountRequest(request("/api/account", two.cookie, "DELETE"), env))
      .status,
    200,
  );
  for (const table of ["users", "sessions", "favorites"])
    assert.equal(
      sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,
      0,
    );
  assert.equal(
    (await accountRequest(request("/api/favorites", two.cookie), env)).status,
    401,
  );
});

test("catalog-only characters can be saved and removed without changing article favorite keys", async () => {
  const { env } = fixture();
  const { cookie } = await login(env);
  const key = "unit-attack-titan";
  const put = await accountRequest(
    new Request(origin + "/api/favorites/" + key, {
      method: "PUT",
      headers: { Cookie: cookie, Origin: origin },
    }),
    env,
  );
  assert.equal(put.status, 200);
  const list = await accountRequest(
    new Request(origin + "/api/favorites", { headers: { Cookie: cookie } }),
    env,
  );
  assert.deepEqual((await list.json()).ids, [key]);
  const remove = await accountRequest(
    new Request(origin + "/api/favorites/" + key, {
      method: "DELETE",
      headers: { Cookie: cookie, Origin: origin },
    }),
    env,
  );
  assert.equal(remove.status, 200);
});

test('signing in again replaces this browser session and keeps another device signed in', async () => {
  const {env,sqlite}=fixture();
  const first=await login(env);
  const otherDevice=await login(env);
  const again=await login(env,'1401930158348177438','Nome de exibição',first.cookie);
  assert.notEqual(again.cookie,first.cookie);
  assert.equal((await accountRequest(request('/api/favorites',first.cookie),env)).status,401);
  assert.equal((await accountRequest(request('/api/favorites',otherDevice.cookie),env)).status,200);
  assert.equal((await accountRequest(request('/api/favorites',again.cookie),env)).status,200);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM sessions').get().count,2);
});

test('favorite imports reject chunked oversized and primitive JSON without writes', async () => {
  const {env,sqlite}=fixture(),user=await login(env);
  let cancelled=false;
  const body=new ReadableStream({pull(c){c.enqueue(new Uint8Array(70000))},cancel(){cancelled=true}});
  const response=await accountRequest(new Request(origin+'/api/favorites/merge',{method:'POST',headers:{Cookie:user.cookie,Origin:origin,'Content-Type':'application/json'},body,duplex:'half'}),env);
  assert.equal(response.status,413);assert.equal(cancelled,true);
  for(const data of ['null','[]','true']){
    const response=await accountRequest(new Request(origin+'/api/favorites/merge',{method:'POST',headers:{Cookie:user.cookie,Origin:origin,'Content-Type':'application/json'},body:data}),env);
    assert.equal(response.status,400);
  }
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM favorites').get().count,0);
});

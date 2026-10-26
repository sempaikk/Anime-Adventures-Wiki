import assert from "node:assert/strict";
import fs from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {createHash,randomBytes} from "node:crypto";
import {communityRequest} from "../../worker/community.mjs";
const origin = "https://community.example.test",
  article = "iron-knight-arsenal-2259";
function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  sqlite.exec(fs.readFileSync("migrations/0001_accounts.sql", "utf8"));
  const DB = {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) {
          args = values.map((v) =>
            v instanceof ArrayBuffer ? new Uint8Array(v) : v,
          );
          return this;
        },
        async first() {
          return sqlite.prepare(sql).get(...args) || null;
        },
        async all() {
          return { results: sqlite.prepare(sql).all(...args) };
        },
        async run() {
          return sqlite.prepare(sql).run(...args);
        },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const result = [];
        for (const s of statements) result.push(await s.run());
        sqlite.exec("COMMIT");
        return result;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  const env = {
    DB,
    DISCORD_CLIENT_ID: "1561527465657114644",
    DISCORD_CLIENT_SECRET: "test-client",
    SESSION_SECRET: "test-isolated-secret-with-more-than-32-characters",
    APP_ORIGIN: origin,
    COMMUNITY_ADMIN_IDS: "1401930158348177438",
  };
  const users = [
    "1401930158348177438",
    "1500000000000000001",
    "1500000000000000002",
  ].map((id, index) => {
    const token = randomBytes(32).toString("base64url");
    sqlite
      .prepare("INSERT INTO users VALUES(?,?,?,?)")
      .run(
        id,
        "Pessoa " + index,
        "https://cdn.discordapp.com/embed/avatars/1.png",
        1700000000,
      );
    sqlite
      .prepare("INSERT INTO sessions VALUES(?,?,?)")
      .run(
        createHash("sha256").update(token).digest("base64url"),
        id,
        Math.floor(Date.now() / 1000) + 3600,
      );
    return { id, cookie: "__Host-aa-session=" + token };
  });
  return { sqlite, env, users };
}
function req(path, user, method = "GET", data, extra = {}) {
  return new Request(origin + "/api/community" + path, {
    method,
    headers: {
      ...(user ? { Cookie: user.cookie } : {}),
      Origin: origin,
      ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
      ...extra,
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
}
async function call(f, path, user, method = "GET", data, extra) {
  const r = await communityRequest(req(path, user, method, data, extra), f.env);
  return { status: r.status, data: await r.json() };
}
async function publish(
  f,
  user,
  handle = "pessoa-" + user.id.slice(-3),
  extra = {},
) {
  const r = await call(f, "/me", user, "PUT", {
    name: "Nome " + handle,
    handle,
    bio: "Biografia",
    published: true,
    ...extra,
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data.profile;
}
async function comment(f, user, extra = {}) {
  const r = await call(f, "/comments", user, "POST", {
    article,
    body: "Uma contribuição com contexto.",
    ...extra,
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data.comment;
}


export {fixture,call,publish,req,origin,article};

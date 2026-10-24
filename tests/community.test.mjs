import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { communityRequest, imageDimensions } from "../worker/community.mjs";
import { accountRequest } from "../worker/accounts.mjs";

test("a chunked image upload is stopped at the server limit", async () => {
  const f = fixture(),
    user = f.users[1];
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(100000));
      controller.enqueue(new Uint8Array(100000));
      controller.close();
    },
  });
  const response = await communityRequest(
    new Request(origin + "/api/community/media", {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: user.cookie,
        "Content-Type": "image/webp",
      },
      body,
      duplex: "half",
    }),
    f.env,
  );
  assert.equal(response.status, 413);
  assert.equal(
    f.sqlite.prepare("SELECT COUNT(*) AS count FROM community_media").get()
      .count,
    0,
  );
});

test("publishing a profile does not publish favorites without a separate choice", async () => {
  const f = fixture(),
    user = f.users[1];
  f.sqlite
    .prepare("INSERT INTO favorites(discord_id,slug,created_at) VALUES(?,?,?)")
    .run(user.id, article, 1700000000);
  await publish(f, user, "favoritos-privados");
  assert.deepEqual(
    (await call(f, "/profiles/favoritos-privados")).data.favorites,
    [],
  );
  await publish(f, user, "favoritos-privados", { show_favorites: true });
  assert.deepEqual(
    (await call(f, "/profiles/favoritos-privados")).data.favorites,
    [article],
  );
  await publish(f, user, "favoritos-privados", { show_favorites: false });
  assert.deepEqual(
    (await call(f, "/profiles/favoritos-privados")).data.favorites,
    [],
  );
});
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

test("community creates its additive schema and publishes only profiles deliberately made public", async () => {
  const f = fixture(),
    user = f.users[1];
  assert.equal((await call(f, "/profiles")).data.profiles.length, 0);
  assert.equal((await call(f, "/me", user)).data.profile.published, false);
  await publish(f, user, "perfil-publico", { published: false });
  assert.equal((await call(f, "/profiles/perfil-publico")).status, 404);
  assert.equal((await call(f, "/profiles")).data.profiles.length, 0);
  await publish(f, user, "perfil-publico");
  const publicProfile = (await call(f, "/profiles/perfil-publico")).data;
  assert.equal(publicProfile.profile.handle, "perfil-publico");
  assert.ok(!Object.hasOwn(publicProfile.profile, "owner_id"));
  assert.equal(publicProfile.favorites.length, 0);
  assert.equal((await call(f, "/profiles")).data.profiles.length, 1);
  assert.equal((await call(f, "/profiles?before=oops")).status, 400);
});
test("profile handles, fields and media ownership are validated on the server", async () => {
  const f = fixture();
  await publish(f, f.users[1], "nome-unico");
  assert.equal(
    (
      await call(f, "/me", f.users[2], "PUT", {
        name: "Outra pessoa",
        handle: "nome-unico",
        published: true,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call(f, "/me", f.users[2], "PUT", {
        name: "Outra",
        handle: "valid-name",
        website: "javascript:alert(1)",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(f, "/me", f.users[2], "PUT", {
        name: "Outra",
        handle: "valid-name",
        avatar_id: "a".repeat(32),
      })
    ).status,
    400,
  );
  assert.equal(
    (await call(f, "/me", null, "PUT", { name: "Outra", handle: "valid-name" }))
      .status,
    401,
  );
  assert.equal(
    (
      await call(
        f,
        "/me",
        f.users[1],
        "PUT",
        {},
        { Origin: "https://other.example" },
      )
    ).status,
    403,
  );
});
test("comments require a public identity, preserve plain text, and authorize edits and deletion by author", async () => {
  const f = fixture(),
    a = f.users[1],
    b = f.users[2];
  assert.equal(
    (await call(f, "/comments", a, "POST", { article, body: "texto" })).status,
    409,
  );
  await publish(f, a, "autor");
  await publish(f, b, "leitor");
  const c = await comment(f, a, {
    body: "<img onerror=alert(1)> é apenas texto",
    kind: "correction",
  });
  assert.equal(c.body, "<img onerror=alert(1)> é apenas texto");
  assert.equal(
    (await call(f, "/comments/" + c.id, b, "PATCH", { body: "troca" })).status,
    403,
  );
  const edit = await call(f, "/comments/" + c.id, a, "PATCH", {
    body: "Contexto corrigido.",
  });
  assert.equal(edit.data.comment.edited, true);
  assert.equal((await call(f, "/comments/" + c.id, b, "DELETE")).status, 403);
  assert.equal(
    (
      await call(f, "/comments", a, "POST", {
        article: "unknown-article",
        body: "texto",
      })
    ).status,
    404,
  );
});
test("reply threads remain readable after deleting the original comment, and reject cross-article parents", async () => {
  const f = fixture(),
    a = f.users[1],
    b = f.users[2];
  await publish(f, a, "autor");
  await publish(f, b, "resposta");
  const root = await comment(f, a),
    reply = await comment(f, b, {
      parent_id: root.id,
      body: "Resposta preservada.",
    });
  assert.equal(reply.parent_id, root.id);
  await call(f, "/comments/" + root.id, a, "DELETE");
  const listed = (await call(f, "/comments?article=" + article)).data.comments;
  assert.equal(listed.length, 1);
  assert.equal(listed[0].deleted, true);
  assert.equal(listed[0].body, "");
  assert.equal(
    (await call(f, "/comments/" + root.id + "/replies")).data.comments[0].body,
    "Resposta preservada.",
  );
  assert.equal(
    (
      await call(f, "/comments", b, "POST", {
        article: "items-5620",
        body: "troca",
        parent_id: root.id,
      })
    ).status,
    404,
  );
});
test("reports and correction resolutions are reserved to the configured editor, with hidden discussions excluded", async () => {
  const f = fixture(),
    admin = f.users[0],
    a = f.users[1],
    b = f.users[2];
  await publish(f, a, "autor");
  await publish(f, b, "outra");
  const root = await comment(f, a, { kind: "correction" });
  await comment(f, b, { parent_id: root.id });
  assert.equal((await call(f, "/review", a)).status, 403);
  assert.equal(
    (
      await call(f, "/comments/" + root.id + "/moderate", a, "POST", {
        moderation: "hidden",
      })
    ).status,
    403,
  );
  await call(f, "/comments/" + root.id + "/report", b, "POST", {
    reason: "Informação precisa de revisão.",
  });
  assert.equal((await call(f, "/review", admin)).data.reports.length, 1);
  await call(f, "/comments/" + root.id + "/moderate", admin, "POST", {
    resolution: "reviewing",
  });
  assert.equal(
    (await call(f, "/review", admin)).data.corrections[0].resolution,
    "reviewing",
  );
  await call(f, "/comments/" + root.id + "/moderate", admin, "POST", {
    moderation: "hidden",
  });
  assert.equal(
    (await call(f, "/comments?article=" + article)).data.comments.length,
    0,
  );
  assert.equal(
    (await call(f, "/comments/" + root.id + "/replies")).status,
    404,
  );
  assert.equal((await call(f, "/review", admin)).data.reports.length, 0);
});
test("image attachments are bounded, private until linked, and cannot be borrowed by another account", async () => {
  const f = fixture(),
    a = f.users[1],
    b = f.users[2];
  const bytes = fs.readFileSync("public/art/navigation/units.webp");
  const upload = await communityRequest(
    new Request(origin + "/api/community/media", {
      method: "POST",
      headers: {
        Cookie: a.cookie,
        Origin: origin,
        "Content-Type": "image/webp",
      },
      body: bytes,
    }),
    f.env,
  );
  assert.equal(upload.status, 201);
  const image = await upload.json();
  assert.ok(imageDimensions(bytes));
  assert.equal(
    (await communityRequest(req("/media/" + image.id), f.env)).status,
    404,
  );
  assert.equal(
    (await communityRequest(req("/media/" + image.id, a), f.env)).status,
    200,
  );
  await publish(f, a, "autor");
  await publish(f, b, "outro");
  assert.equal(
    (
      await call(f, "/comments", b, "POST", {
        article,
        body: "texto",
        image_id: image.id,
      })
    ).status,
    400,
  );
  const root = await comment(f, a, { image_id: image.id });
  const publicImage = await communityRequest(req("/media/" + image.id), f.env);
  assert.equal(publicImage.status, 200);
  assert.equal(publicImage.headers.get("X-Content-Type-Options"), "nosniff");
  await call(f, "/comments/" + root.id, a, "DELETE");
  assert.equal(
    (await communityRequest(req("/media/" + image.id), f.env)).status,
    404,
  );
  const video = await communityRequest(
    new Request(origin + "/api/community/media", {
      method: "POST",
      headers: { Cookie: a.cookie, Origin: origin },
      body: new Uint8Array(100),
    }),
    f.env,
  );
  assert.equal(video.status, 400);
  assert.equal(
    imageDimensions(new TextEncoder().encode("<svg onload=alert(1)>")),
    null,
  );
});
test("editorial notes require sources and editor permission; readers can access published notes", async () => {
  const f = fixture(),
    admin = f.users[0],
    user = f.users[1];
  assert.equal(
    (
      await call(f, "/notes", user, "POST", {
        article,
        title: "Nota",
        body: "Correção",
        source_url: "https://example.test/source",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(f, "/notes", admin, "POST", {
        article,
        title: "Nota",
        body: "Correção",
      })
    ).status,
    400,
  );
  const note = await call(f, "/notes", admin, "POST", {
    article,
    title: "Informação conferida",
    body: "Correção documentada.",
    source_url: "https://example.test/source",
  });
  assert.equal(note.status, 201);
  assert.equal(
    (await call(f, "/notes?article=" + article)).data.notes.length,
    1,
  );
  await call(f, "/notes/" + note.data.id, admin, "DELETE");
  assert.equal(
    (await call(f, "/notes?article=" + article)).data.notes.length,
    0,
  );
});
test("deleting an account clears public identity and image data while retaining other authors replies", async () => {
  const f = fixture(),
    a = f.users[1],
    b = f.users[2];
  await publish(f, a, "autor");
  await publish(f, b, "resposta");
  const root = await comment(f, a);
  const reply = await comment(f, b, {
    parent_id: root.id,
    body: "Resposta de outra pessoa.",
  });
  await call(f, "/comments/" + reply.id + "/report", a, "POST", {
    reason: "Relato do autor que pediu exclusão.",
  });
  const response = await accountRequest(
    new Request(origin + "/api/account", {
      method: "DELETE",
      headers: { Origin: origin, Cookie: a.cookie },
    }),
    f.env,
  );
  assert.equal(response.status, 200);
  assert.equal((await call(f, "/profiles/autor")).status, 404);
  assert.equal(
    f.sqlite.prepare("SELECT COUNT(*) AS count FROM community_reports").get()
      .count,
    0,
  );
  const list = (await call(f, "/comments?article=" + article)).data.comments;
  assert.equal(list[0].deleted, true);
  assert.equal(list[0].author, null);
  assert.equal(
    (await call(f, "/comments/" + root.id + "/replies")).data.comments[0].body,
    "Resposta de outra pessoa.",
  );
});

# Interface regression checks

Use an isolated build and SQLite fixtures. Never point this harness at production.

From the repository root, build a disposable copy with `npm run build` and the existing lockfile dependencies, then run:

```sh
REVIEW_BUILD=/absolute/path/to/disposable-build node tests/helpers/browser-server.mjs
```

In another terminal, with Python Playwright and Chromium installed:

```sh
REVIEW_OUTPUT=/tmp/adventures-quality python tests/browser/quality.py
```

Set `REVIEW_PORT` on the harness and the matching `REVIEW_BASE=http://127.0.0.1:PORT` on the Python checks when another local harness is running.

The harness binds only to `127.0.0.1:4399`. Synthetic sessions last one hour; restart it before a new validation session. It loads the built assets and Worker from `REVIEW_BUILD`. No Cloudflare secrets or production database are used. The test exercises both languages, failure recovery, upload ordering, focus, moderation and 225 page/theme/viewport combinations. Physical devices and a human Discord authorization require separate checks.

The additional `redesign.py` check exercises draft recovery and identity isolation,
article-linked posts, related feeds, photo enlargement, navigation context and
recent articles. Run it against a separate fresh harness (for example port 4402)
with the same `REVIEW_BASE` and `REVIEW_OUTPUT` variables. Both scripts mutate only
the isolated local fixture database.

import fs from "node:fs";
import path from "node:path";
import { load } from "cheerio";
const root = path.resolve("dist"),
  failures = [],
  warnings = [],
  counts = { pages: 0, links: 0, images: 0 };
function files(folder) {
  return fs
    .readdirSync(folder, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(folder, entry.name))
        : [path.join(folder, entry.name)],
    );
}
for (const file of files(root).filter((file) => file.endsWith(".html"))) {
  counts.pages++;
  const $ = load(fs.readFileSync(file, "utf8")),
    route = "/" + path.relative(root, file).replace(/index\.html$/, "");
  $("[href],[src]").each((_, node) => {
    const value = $(node).attr("src") || $(node).attr("href");
    if (
      !value ||
      value.startsWith("data:")
    )
      return;
    const resource = new URL(value, "https://wiki.example.test"+route);
    if(resource.origin!=="https://wiki.example.test"||resource.pathname.startsWith('/api/'))return;
    let relative;
    try {
      relative = decodeURIComponent(resource.pathname);
    } catch {
      return;
    }
    const target = path.resolve(root, "." + relative);
    if (target !== root && !target.startsWith(root + path.sep)) {
      failures.push({ route, value, reason: "Path outside build" });
      return;
    }
    const resolved =
      fs.existsSync(target) && fs.statSync(target).isDirectory()
        ? path.join(target, "index.html")
        : target;
    if (!fs.existsSync(resolved))
      failures.push({ route, value, reason: "Missing internal resource" });
    if (node.tagName === "img") counts.images++;
    else counts.links++;
  });
  const article = $(".wiki-content");
  if (article.length) {
    if (/File:[^\n]{0,150}\.(?:png|webp|gif)/i.test(article.text()))
      failures.push({
        route,
        reason: "Unresolved file reference visible in article",
      });
    if (/Lua error|stack traceback/.test(article.text()))
      failures.push({ route, reason: "Source exception visible in article" });
    const ids = new Set();
    article.find("[id]").each((_, node) => {
      const id = $(node).attr("id");
      if (ids.has(id)) warnings.push({ route, reason: "Duplicate anchor", id });
      ids.add(id);
    });
    article.find("[data-article-tabs]").each((_, node) => {
      const group = $(node),
        tabs = group.children(".article-tab-nav").find("[role=tab]"),
        panels = group.children("[data-article-panel]");
      if (tabs.length !== panels.length)
        failures.push({ route, reason: "Tab/panel mismatch" });
    });
  }
}
const report = { counts, failures, warnings };
fs.writeFileSync(
  "source/build-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    counts,
    failures: failures.slice(0, 12),
    failureCount: failures.length,
    warnings: warnings.length,
  }),
);
if (failures.length) process.exitCode = 1;

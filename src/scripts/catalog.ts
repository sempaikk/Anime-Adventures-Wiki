import {arrange,cue,respond} from './ui-motion';
const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
function writeParams(values: Record<string, string>) {
  const url = new URL(location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  history.replaceState(history.state, "", url);
}
function choose(select: HTMLSelectElement, value: string) {
  select.value = value;
  if (select.selectedIndex < 0) select.selectedIndex = 0;
}
const grid = $("#unit-grid");
if (grid) {
  const cards = Array.from(grid.querySelectorAll<HTMLElement>("[data-unit-card]"));
  const query = $<HTMLInputElement>("#unit-search"), rarity = $<HTMLSelectElement>("#rarity-filter"), tower = $<HTMLSelectElement>("#tower-filter"), sort = $<HTMLSelectElement>("#unit-sort"), retired = $<HTMLInputElement>("#retired-filter");
  let shown = 12, initialized=false;
  function filter(reset = true) {
    if (reset) shown = 12;
    const q = normalize(query.value.trim());
    const matched = cards.filter((card) => normalize(card.dataset.name || "").includes(q) && (!rarity.value || card.dataset.rarity === rarity.value) && (!tower.value || (card.dataset.tower || "unknown") === tower.value) && (retired.checked || card.dataset.retired !== "true"));
    const byName = (a: HTMLElement, b: HTMLElement) => (a.dataset.title || "").localeCompare(b.dataset.title || "");
    matched.sort((a,b) => {
      if (sort.value === "name") return byName(a,b);
      const ca = a.dataset.cost === "" ? null : Number(a.dataset.cost), cb = b.dataset.cost === "" ? null : Number(b.dataset.cost);
      if (ca === null || cb === null) return ca === cb ? byName(a,b) : ca === null ? 1 : -1;
      return (sort.value === "cost-desc" ? cb - ca : ca - cb) || byName(a,b);
    });
    const visible = new Set(matched.slice(0, shown));
    arrange(grid,()=>{for(const card of cards)card.hidden=!visible.has(card);for(const card of matched)grid.append(card)},initialized);initialized=true;
    $("#unit-results").textContent = `${matched.length} personagem${matched.length === 1 ? "" : "s"} encontrado${matched.length === 1 ? "" : "s"}`;
    $("#unit-empty").hidden = matched.length > 0;
    $("#load-units").hidden = shown >= matched.length;
    const count = [rarity.value, tower.value, retired.checked, sort.value !== "name"].filter(Boolean).length;
    $("[data-filter-count]").textContent = count ? `· ${count} ativo${count > 1 ? "s" : ""}` : "";
    writeParams({ q: query.value.trim(), raridade: rarity.value, tipo: tower.value, ordem: sort.value === "name" ? "" : sort.value, arquivo: retired.checked ? "1" : "" });
  }
  function read() {
    const params = new URL(location.href).searchParams;
    query.value = params.get("q") || ""; choose(rarity, params.get("raridade") || ""); choose(tower, params.get("tipo") || ""); choose(sort, params.get("ordem") || "name"); retired.checked = params.get("arquivo") === "1";
    if (rarity.value || tower.value || retired.checked || sort.value !== "name") $<HTMLDetailsElement>("[data-catalog-filters]").open = true;
    filter();
  }
  query.addEventListener("input", () => filter());
  for (const control of [rarity,tower,sort,retired]) control.addEventListener("change", () => filter());
  $("#load-units").addEventListener("click", () => { shown += 12; filter(false); });
  $("#clear-filters").addEventListener("click", () => { query.value = ""; rarity.value = tower.value = ""; sort.value = "name"; retired.checked = false; filter(); query.focus(); });
  window.addEventListener("popstate", read); read();
}
const library = $("#article-grid");
if (library) {
  const cards = Array.from(library.children) as HTMLElement[], query = $<HTMLInputElement>("#article-search"), archived = $<HTMLInputElement>("#library-retired"), kinds = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-article-kind]"));
  let kind = "", shown = 12, initialized=false;
  function filter(reset = true) {
    if (reset) shown = 12;
    const q = normalize(query.value.trim());
    const matched = cards.filter((card) => (!kind || card.dataset.kind === kind) && (archived.checked || card.dataset.retired !== "true") && normalize(card.dataset.title || "").includes(q));
    const visible = new Set(matched.slice(0, shown));
    arrange(library,()=>cards.forEach(card=>card.hidden=!visible.has(card)),initialized);initialized=true;
    kinds.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.articleKind === kind)));
    $("#article-results").textContent = `${matched.length} artigo${matched.length === 1 ? "" : "s"} encontrado${matched.length === 1 ? "" : "s"}`;
    $("#article-empty").hidden = matched.length > 0; $("#load-articles").hidden = shown >= matched.length;
    writeParams({q:query.value.trim(),tipo:kind,arquivo:archived.checked ? "1" : ""});
  }
  function read() {
    const params = new URL(location.href).searchParams;
    query.value = params.get("q") || ""; const type = params.get("tipo") || "";
    kind = kinds.some((button) => button.dataset.articleKind === type) ? type : "";
    archived.checked = params.get("arquivo") === "1"; filter();
  }
  query.addEventListener("input", () => filter()); archived.addEventListener("change", () => filter());
  kinds.forEach((button) => button.addEventListener("click", () => { kind = button.dataset.articleKind || ""; filter(); }));
  $("#load-articles").addEventListener("click", () => { shown += 12; filter(false); });
  $("#clear-library-filters").addEventListener("click", () => { query.value = kind = ""; archived.checked = false; filter(); query.focus(); });
  window.addEventListener("popstate", read); read();
}
document.querySelector("[data-share-filters]")?.addEventListener("click", async () => {
  const message = $("[data-filter-message]");
  try { await navigator.clipboard.writeText(location.href); message.textContent = "Link da busca copiado.";cue("success");respond(document.querySelector("[data-share-filters]"),"success"); }
  catch { message.textContent = "Copie este endereço: "; const field = document.createElement("input"); field.value = location.href; field.readOnly = true; field.setAttribute("aria-label", "Link da busca"); message.append(field); field.select(); }
});

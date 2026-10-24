import { getUnits, type Unit } from "./unit-data";
import { comparisonFields, factValue, validComparison } from "../lib/unit-tools.mjs";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const key = "aa-comparison";
const page = document.querySelector<HTMLElement>("[data-comparison-page]");
const tray = document.querySelector<HTMLElement>("#comparison-tray")!;
const picker = document.querySelector<HTMLDialogElement>("[data-unit-picker]");
const status = document.querySelector<HTMLElement>("[data-comparison-status]")!;
let selection: string[] = [], catalog: Unit[] = [], version = 0, replacing: number | null = null;
let opener: HTMLElement | null = null;
function readSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? [...new Set(saved.filter((id) => typeof id === "string" && /^[a-z0-9_-]{1,100}$/.test(id)))].slice(0, 3) as string[] : [];
  } catch { return selection; }
}
function save() { try { localStorage.setItem(key, JSON.stringify(selection)); } catch { /* Links also carry the selection when storage is unavailable. */ } }
function link() {
  const url = new URL(base + "/comparar/", location.origin);
  if (selection.length) url.searchParams.set("unidades", selection.join(","));
  return url;
}
function announce(message: string) {
  status.textContent = message;
  const target = page?.querySelector<HTMLElement>("[data-comparison-message]");
  if (target) target.textContent = message;
  else {
    const toast = document.querySelector<HTMLElement>(".toast");
    if (toast) { toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2800); }
  }
}
function updateButtons() {
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-compare]")) {
    const selected = selection.includes(button.dataset.compare!);
    button.setAttribute("aria-pressed", String(selected));
    if (!button.dataset.compareLabel) button.dataset.compareLabel = button.getAttribute("aria-label") || "Comparar personagem";
    const name = catalog.find((unit) => unit.id === button.dataset.compare)?.name;
    button.setAttribute("aria-label", selected ? `Remover ${name || "personagem"} da comparação` : button.dataset.compareLabel);
    button.textContent = selected ? "Selecionado ✓" : "Comparar";
  }
}
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function portrait(unit: Unit, className: string) {
  const wrap = node("span", undefined, className);
  if (unit.image?.startsWith("/art/")) {
    const image = node("img"); image.src = base + unit.image; image.alt = ""; image.width = 160; image.height = 160; image.loading = "lazy";
    wrap.append(image);
  } else wrap.append(node("small", "Sem retrato confirmado"));
  return wrap;
}
function renderTable(units: Unit[]) {
  if (!page) return;
  const empty = page.querySelector<HTMLElement>("[data-comparison-empty]")!;
  const result = page.querySelector<HTMLElement>("[data-comparison-result]")!;
  empty.hidden = units.length > 0; result.hidden = units.length === 0;
  page.querySelector<HTMLButtonElement>("[data-comparison-picker]")!.disabled = units.length >= 3;
  page.querySelector<HTMLButtonElement>("[data-comparison-share]")!.disabled = !units.length;
  if (!units.length) return;
  const table = page.querySelector<HTMLTableElement>("[data-comparison-table]")!;
  table.style.setProperty("--comparison-columns", String(units.length));
  table.querySelectorAll("thead,tbody").forEach((part) => part.remove());
  const head = node("thead"), row = node("tr");
  const label = node("th", "Personagens"); label.scope = "col"; row.append(label);
  units.forEach((unit, index) => {
    const th = node("th"); th.scope = "col";
    const controls = node("div", undefined, "comparison-column-actions");
    const change = node("button", "Trocar", "plain-button"), remove = node("button", undefined, "comparison-remove ui-close");
    change.type = remove.type = "button"; change.dataset.comparisonEdit = String(index); remove.dataset.comparisonRemove = unit.id;
    remove.setAttribute("aria-label", `Remover ${unit.name} da comparação`);
    const cross = node("span", undefined, "close-mark"); cross.setAttribute("aria-hidden", "true"); remove.append(cross);
    controls.append(change, remove);
    const name = node("a", unit.name, "comparison-unit-name"); name.href = base + unit.url;
    th.append(controls, portrait(unit, "comparison-portrait"), node("span", unit.retired ? "Arquivo histórico" : unit.rarity || "Personagem", "comparison-rarity"), name);
    row.append(th);
  });
  head.append(row);
  const body = node("tbody");
  for (const [field, title] of comparisonFields) {
    const row = node("tr"), label = node("th", title); label.scope = "row"; row.append(label);
    for (const unit of units) row.append(node("td", factValue(unit, field) || "Não informado"));
    body.append(row);
  }
  const aliases = node("tr"), aliasTitle = node("th", "Nomes anteriores"); aliasTitle.scope = "row"; aliases.append(aliasTitle);
  for (const unit of units) aliases.append(node("td", unit.aliases.length ? unit.aliases.join(" · ") : "—", "comparison-aliases"));
  body.append(aliases);
  const sources = node("tr"), sourceTitle = node("th", "Fonte dos dados"); sourceTitle.scope = "row"; sources.append(sourceTitle);
  for (const unit of units) {
    const cell = node("td");
    if (unit.source?.url.startsWith("https://animeadventures.fandom.com/")) {
      const source = node("a", "Artigo original", "comparison-source"); source.href = unit.source.url; source.target = "_blank"; source.rel = "noopener noreferrer";
      const date = new Date(unit.source.revision);
      cell.append(source);
      if (!Number.isNaN(date.getTime())) cell.append(node("small", "Revisão de " + date.toLocaleDateString("pt-BR", { timeZone: "UTC" })));
    } else cell.append(node("small", "Sem artigo correspondente na fonte."));
    sources.append(cell);
  }
  body.append(sources); table.append(head, body);
}
async function render() {
  const request = ++version;
  updateButtons();
  if (!selection.length) {
    tray.hidden = true; document.body.classList.remove("has-comparison-tray"); renderTable([]);
    if (page) history.replaceState(history.state, "", link());
    return;
  }
  try {
    const units = await getUnits();
    if (request !== version) return;
    catalog = units;
    selection = validComparison(selection, new Set(units.map((unit) => unit.id))); save(); updateButtons();
    const selected = selection.map((id) => units.find((unit) => unit.id === id)!);
    tray.hidden = !!page || !selected.length;
    document.body.classList.toggle("has-comparison-tray", !page && !!selected.length);
    tray.querySelector<HTMLElement>("[data-comparison-count]")!.textContent = `${selected.length} de 3 personagens`;
    const names = tray.querySelector<HTMLElement>("[data-comparison-units]")!; names.replaceChildren();
    for (const unit of selected) {
      const item = node("span", undefined, "comparison-tray-item");
      item.append(portrait(unit, "comparison-tray-portrait"), node("span", unit.name)); names.append(item);
    }
    tray.querySelector<HTMLAnchorElement>("[data-comparison-link]")!.href = link().href;
    if (page) { history.replaceState(history.state, "", link()); renderTable(selected); }
  } catch (error) { announce((error as Error).message); }
}
async function change(id: string) {
  const units = await getUnits(); catalog = units;
  if (!units.some((unit) => unit.id === id)) return;
  selection = validComparison(readSaved(), new Set(units.map((unit) => unit.id)));
  if (replacing !== null) {
    if (selection.some((selected, index) => selected === id && index !== replacing)) return;
    selection[replacing] = id;
  } else if (selection.includes(id)) selection = selection.filter((selected) => selected !== id);
  else if (selection.length < 3) selection.push(id);
  else { announce("Você pode comparar até três personagens. Remova um para escolher outro."); return; }
  save(); await render();
  announce(`${selection.length} personagem${selection.length === 1 ? "" : "s"} na comparação.`);
}

async function renderPicker() {
  if (!picker) return;
  const list = picker.querySelector<HTMLElement>("[data-picker-results]")!, message = picker.querySelector<HTMLElement>("[data-picker-message]")!;
  message.textContent = "Carregando personagens…";
  try {
    catalog = await getUnits();
    const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const q = normalize(picker.querySelector<HTMLInputElement>("#compare-search")!.value.trim());
    const archived = picker.querySelector<HTMLInputElement>("[data-picker-retired]")!.checked;
    const found = catalog.filter((unit) => (archived || !unit.retired) && normalize([unit.name, ...unit.aliases].join(" ")).includes(q)).sort((a,b) => a.name.localeCompare(b.name));
    list.replaceChildren();
    for (const unit of found.slice(0, 12)) {
      const button = node("button", undefined, "picker-unit"); button.type = "button"; button.dataset.pickerUnit = unit.id;
      const selected = selection.includes(unit.id) && selection[replacing ?? -1] !== unit.id;
      button.disabled = selected;
      const text = node("span"); text.append(node("strong", unit.name), node("small", selected ? "Já está na comparação" : unit.retired ? "Arquivo histórico" : unit.rarity || "Personagem"));
      button.append(portrait(unit, "picker-portrait"), text); list.append(button);
    }
    message.textContent = found.length ? `${found.length} resultado${found.length === 1 ? "" : "s"}${found.length > 12 ? " · refine a busca para encontrar outros" : ""}` : "Nenhum personagem encontrado. Tente um nome anterior ou inclua o arquivo histórico.";
  } catch (error) { message.textContent = (error as Error).message; }
}
function openPicker(target: HTMLElement, index: number | null = null) {
  if (!picker) return;
  replacing = index; opener = target;
  picker.querySelector<HTMLInputElement>("#compare-search")!.value = "";
  picker.showModal(); picker.querySelector<HTMLInputElement>("#compare-search")!.focus(); renderPicker();
}
document.addEventListener("click", async (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const compare = target?.closest<HTMLButtonElement>("[data-compare]");
  if (compare) {
    compare.disabled = true; replacing = null;
    try { await change(compare.dataset.compare!); } catch (error) { announce((error as Error).message); } finally { compare.disabled = false; }
  }
  if (target?.closest("[data-comparison-clear]")) { selection = []; save(); render(); announce("Seleção de comparação limpa."); }
  const remove = target?.closest<HTMLElement>("[data-comparison-remove]");
  if (remove) { selection = selection.filter((id) => id !== remove.dataset.comparisonRemove); save(); await render(); page?.querySelector<HTMLElement>("[data-comparison-picker]:not(:disabled)")?.focus(); }
  const add = target?.closest<HTMLElement>("[data-comparison-picker]"); if (add) openPicker(add);
  const edit = target?.closest<HTMLElement>("[data-comparison-edit]"); if (edit) openPicker(edit, Number(edit.dataset.comparisonEdit));
  const picked = target?.closest<HTMLButtonElement>("[data-picker-unit]");
  if (picked && !picked.disabled) {
    picked.disabled = true;
    try { await change(picked.dataset.pickerUnit!); picker?.close(); } catch (error) { announce((error as Error).message); picked.disabled = false; }
  }
});
if (picker) {
  picker.querySelector("[data-picker-close]")!.addEventListener("click", () => picker.close());
  picker.querySelector("#compare-search")!.addEventListener("input", renderPicker);
  picker.querySelector("[data-picker-retired]")!.addEventListener("change", renderPicker);
  picker.addEventListener("close", () => {
    replacing = null;
    if (opener?.isConnected && !(opener as HTMLButtonElement).disabled) opener.focus();
    else page?.querySelector<HTMLElement>("[data-comparison-edit], [data-comparison-picker]:not(:disabled)")?.focus();
  });
  picker.addEventListener("click", (event) => {
    if (event.target !== picker) return;
    const rect = picker.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) picker.close();
  });
  picker.querySelector("#compare-search")!.addEventListener("keydown", (event) => {
    const e = event as KeyboardEvent;
    if (e.key === "ArrowDown") { e.preventDefault(); picker.querySelector<HTMLButtonElement>("[data-picker-unit]:not(:disabled)")?.focus(); }
  });
  picker.querySelector("[data-picker-results]")!.addEventListener("keydown", (event) => {
    const e = event as KeyboardEvent;
    if (!["ArrowUp", "ArrowDown"].includes(e.key)) return;
    const buttons = Array.from(picker.querySelectorAll<HTMLButtonElement>("[data-picker-unit]:not(:disabled)"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement); e.preventDefault();
    (buttons[index + (e.key === "ArrowDown" ? 1 : -1)] || picker.querySelector<HTMLInputElement>("#compare-search"))?.focus();
  });
}
page?.querySelector("[data-comparison-share]")?.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(link().href); announce("Link da comparação copiado."); }
  catch {
    const message = page.querySelector<HTMLElement>("[data-comparison-message]")!;
    message.textContent = "Copie este endereço: "; const field = node("input"); field.readOnly = true; field.value = link().href; field.setAttribute("aria-label", "Link da comparação"); message.append(field); field.select();
  }
});
document.addEventListener("aa:comparison-refresh", updateButtons);
selection = readSaved();
if (page && new URL(location.href).searchParams.has("unidades")) {
  getUnits().then((units) => { selection = validComparison(new URL(location.href).searchParams.get("unidades")!.split(","), new Set(units.map((unit) => unit.id))); save(); render(); }).catch((error) => announce(error.message));
} else render();
window.addEventListener("storage", (event) => { if (event.key === key || event.key === null) { selection = readSaved(); render(); } });
window.addEventListener("pageshow", (event) => { if (event.persisted) { selection = readSaved(); render(); } });

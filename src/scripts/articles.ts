// Source widgets are converted at build time. Only our own tab controls run here.
for (const group of document.querySelectorAll<HTMLElement>(
  "[data-article-tabs]",
)) {
  const nav = group.querySelector<HTMLElement>(":scope > .article-tab-nav");
  const panels = Array.from(
    group.querySelectorAll<HTMLElement>(":scope > [data-article-panel]"),
  );
  const buttons = nav
    ? Array.from(nav.querySelectorAll<HTMLButtonElement>("[role=tab]"))
    : [];
  if (!buttons.length || buttons.length !== panels.length) continue;
  function choose(index: number) {
    buttons.forEach((button, item) => {
      button.setAttribute("aria-selected", String(index === item));
      button.tabIndex = index === item ? 0 : -1;
      panels[item].hidden = index !== item;
    });
  }
  for (const [index, button] of buttons.entries()) {
    button.addEventListener("click", () => choose(index));
    button.addEventListener("keydown", (event) => {
      let target: number | undefined;
      if (event.key === "ArrowRight") target = (index + 1) % buttons.length;
      if (event.key === "ArrowLeft")
        target = (index + buttons.length - 1) % buttons.length;
      if (event.key === "Home") target = 0;
      if (event.key === "End") target = buttons.length - 1;
      if (target !== undefined) {
        event.preventDefault();
        choose(target);
        buttons[target].focus();
      }
    });
  }
  group.dataset.tabsReady = "";
  choose(0);
}
function revealAnchor() {
  let id: string;
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return;
  }
  const target = document.getElementById(id);
  if (!target) return;
  let parent: HTMLElement | null = target;
  while (parent) {
    if (parent.matches("[data-article-panel]")) {
      const button = document.querySelector<HTMLButtonElement>(
        `[aria-controls="${CSS.escape(parent.id)}"]`,
      );
      button?.click();
    }
    if (parent.dataset.statsSelectId) {
      const select = document.getElementById(
        parent.dataset.statsSelectId,
      ) as HTMLSelectElement | null;
      if (select) {
        select.value = parent.dataset.statsStep || "0";
        select.dispatchEvent(new Event("change"));
      }
    }
    if (parent instanceof HTMLDetailsElement) parent.open = true;
    parent = parent.parentElement;
  }
  requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
}
window.addEventListener("hashchange", revealAnchor);

for (const image of document.querySelectorAll<HTMLImageElement>(
  "img[data-animation-src]",
)) {
  const source = image.dataset.animationSrc!;
  if (
    !source.startsWith(
      "https://static.wikia.nocookie.net/animeadventures/images/",
    )
  )
    continue;
  const poster = image.src,
    button = document.createElement("button");
  button.className = "animation-control";
  button.type = "button";
  button.textContent = "Reproduzir animação";
  button.setAttribute("aria-pressed", "false");
  const link =
    image.parentElement?.tagName === "A" ? image.parentElement : null;
  if (link && link.children.length === 1) link.replaceWith(image);
  image.after(button);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const playing = button.getAttribute("aria-pressed") === "true";
    image.src = playing ? poster : source;
    button.setAttribute("aria-pressed", String(!playing));
    button.textContent = playing ? "Reproduzir animação" : "Pausar animação";
  });
}

// External source media may no longer exist. Explain the absence instead of
// leaving a broken-image glyph or silently substituting a different character.
document.addEventListener(
  "error",
  (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.closest(".wiki-content"))
      return;
    const note = document.createElement("span");
    note.className = "image-unavailable";
    note.textContent = image.alt
      ? `${image.alt} · imagem indisponível na fonte`
      : "Imagem indisponível na fonte";
    image.replaceWith(note);
  },
  true,
);

// Large item and recipe tables can be narrowed without leaving the article.
for (const [index, table] of Array.from(
  document.querySelectorAll<HTMLTableElement>(".wiki-content table"),
).entries()) {
  if (table.parentElement?.closest("table")) continue;
  const rows = Array.from(table.rows).filter((row) =>
    Array.from(row.cells).some((cell) => cell.tagName === "TD"),
  );
  if (rows.length < 25) continue;
  const normalize = (text: string) =>
    text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const terms = rows.map((row) => normalize(row.textContent || ""));
  const tools = document.createElement("div"),
    label = document.createElement("label"),
    input = document.createElement("input"),
    count = document.createElement("span");
  tools.className = "table-tools";
  label.textContent = "Filtrar nesta tabela";
  input.type = "search";
  input.id = `table-search-${index}`;
  input.placeholder = "Nome do item, personagem ou material…";
  label.htmlFor = input.id;
  count.setAttribute("role", "status");
  count.textContent = `${rows.length} entradas`;
  tools.append(label, input, count);
  table.closest(".table-scroll")?.before(tools);
  input.addEventListener("input", () => {
    const q = normalize(input.value.trim());
    let found = 0;
    rows.forEach((row, i) => {
      row.hidden = !terms[i].includes(q);
      if (!row.hidden) found++;
    });
    count.textContent = `${found} de ${rows.length} entradas`;
  });
}

// Show the source's real upgrade values one step at a time; no interpolation.
const statGroups = new Map<HTMLElement, HTMLElement[]>();
for (const box of document.querySelectorAll<HTMLElement>(
  ".wiki-content .Stats-Box",
)) {
  const root =
    box.closest<HTMLElement>("[data-article-panel]") ||
    box.closest<HTMLElement>(".mainStats");
  if (!root) continue;
  const title = box.querySelector("h3")?.cloneNode(true) as HTMLElement | null;
  title?.querySelectorAll("details").forEach((e) => e.remove());
  if (!/^(?:Deployment|Upgrade)\b/i.test(title?.textContent?.trim() || ""))
    continue;
  const list = statGroups.get(root) || [];
  list.push(box);
  statGroups.set(root, list);
}
let statsIndex = 0;
for (const [root, boxes] of statGroups) {
  if (boxes.length < 3) continue;
  const tools = document.createElement("div"),
    label = document.createElement("label"),
    row = document.createElement("div"),
    previous = document.createElement("button"),
    next = document.createElement("button"),
    select = document.createElement("select"),
    foot = document.createElement("div"),
    count = document.createElement("small"),
    last = document.createElement("button");
  tools.className = "stats-controls";
  row.className = "stats-controls-row";
  foot.className = "stats-controls-foot";
  select.id = `stats-step-${++statsIndex}`;
  select.dataset.statsSelect = "";
  label.htmlFor = select.id;
  label.textContent = "Escolha a etapa do personagem";
  previous.type = next.type = last.type = "button";
  previous.textContent = "‹";
  next.textContent = "›";
  last.textContent = "Última etapa";
  previous.setAttribute("aria-label", "Etapa anterior");
  next.setAttribute("aria-label", "Próxima etapa");
  boxes.forEach((box, index) => {
    const heading = box
      .querySelector("h3")
      ?.cloneNode(true) as HTMLElement | null;
    heading?.querySelectorAll("details").forEach((e) => e.remove());
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent =
      heading?.textContent?.replace(/\s+/g, " ").trim() || `Etapa ${index + 1}`;
    select.append(option);
    box.dataset.statsSelectId = select.id;
    box.dataset.statsStep = String(index);
  });
  function choose() {
    const index = Number(select.value);
    boxes.forEach((box, i) => {
      box.hidden = index !== i;
    });
    previous.disabled = index === 0;
    next.disabled = index === boxes.length - 1;
    count.textContent = `${index + 1} de ${boxes.length} etapas · valores da fonte`;
  }
  select.addEventListener("change", choose);
  previous.addEventListener("click", () => {
    select.value = String(Math.max(0, Number(select.value) - 1));
    choose();
  });
  next.addEventListener("click", () => {
    select.value = String(Math.min(boxes.length - 1, Number(select.value) + 1));
    choose();
  });
  last.addEventListener("click", () => {
    select.value = String(boxes.length - 1);
    choose();
  });
  row.append(previous, select, next);
  foot.append(count, last);
  tools.append(label, row, foot);
  const top = boxes[0];
  let anchor: HTMLElement = top;
  while (anchor.parentElement && anchor.parentElement !== root)
    anchor = anchor.parentElement;
  root.insertBefore(tools, anchor);
  choose();
}

// Preserve the complete source infobox alongside the compact profile summary.
for (const infobox of document.querySelectorAll<HTMLElement>(
  ".article-kind-unit .portable-infobox",
)) {
  const detail = document.createElement("details"),
    summary = document.createElement("summary");
  detail.className = "unit-extra-data";
  summary.textContent = "Ver dados adicionais da fonte";
  infobox.before(detail);
  detail.append(summary, infobox);
}

if (location.hash) revealAnchor();

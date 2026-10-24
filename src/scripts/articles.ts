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

// Article sections remain visible, following the source wiki's reading order.
if (matchMedia("(max-width: 650px)").matches) {
  for (const index of document.querySelectorAll<HTMLDetailsElement>(
    ".article-index",
  ))
    index.open = false;
}
if (location.hash) revealAnchor();

// The compact index remains reachable while reading, including on touch screens.
const readingIndex =
  document.querySelector<HTMLDetailsElement>(".reading-index");
const sectionLinks = Array.from(
  document.querySelectorAll<HTMLAnchorElement>(".reading-index-panel a"),
);
const sectionTargets = sectionLinks.map((link) =>
  document.getElementById(decodeURIComponent(link.hash.slice(1))),
);
let currentSection = -1,
  sectionFrame = 0;
function updateReadingSection() {
  if (sectionFrame) return;
  sectionFrame = requestAnimationFrame(() => {
    sectionFrame = 0;
    const bottom =
      document.querySelector("[data-article-tools]")?.getBoundingClientRect()
        .bottom || 160;
    let next = -1;
    sectionTargets.forEach((target, index) => {
      if (
        target?.getClientRects().length &&
        target.getBoundingClientRect().top <= bottom + 28
      )
        next = index;
    });
    if (next === currentSection) return;
    currentSection = next;
    document
      .querySelectorAll<HTMLAnchorElement>(
        ".reading-index-panel a,.table-of-contents a",
      )
      .forEach((link) => {
        if (next >= 0 && link.hash === sectionLinks[next].hash)
          link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    const label = document.querySelector("[data-reading-current]");
    if (label)
      label.textContent =
        next >= 0 ? sectionLinks[next].textContent : "Informações";
  });
}
if (sectionLinks.length) {
  addEventListener("scroll", updateReadingSection, { passive: true });
  addEventListener("resize", updateReadingSection, { passive: true });
  addEventListener("pageshow", updateReadingSection);
  updateReadingSection();
}
readingIndex?.addEventListener("click", (event) => {
  if ((event.target as Element).closest("a")) readingIndex.open = false;
});
document.addEventListener("click", (event) => {
  if (readingIndex && !(event.target as Element).closest(".reading-index"))
    readingIndex.open = false;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && readingIndex?.open) {
    readingIndex.open = false;
    readingIndex.querySelector("summary")?.focus();
  }
});
const copyStates = new WeakMap<
  HTMLButtonElement,
  { label: string; timer: number }
>();
async function copyReadingLink(url: string, button: HTMLButtonElement) {
  const previous = copyStates.get(button);
  const original = previous?.label || button.textContent || "Copiar link";
  if (previous) clearTimeout(previous.timer);
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = button.classList.contains("section-share")
      ? "✓"
      : "Copiado ✓";
    const toast = document.querySelector<HTMLElement>(".toast");
    if (toast) {
      toast.textContent = "Link copiado.";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2600);
    }
  } catch {
    const field = document.createElement("input");
    field.className = "reading-copy-fallback";
    field.value = url;
    field.readOnly = true;
    field.setAttribute("aria-label", "Link para copiar");
    button.after(field);
    field.focus();
    field.select();
    field.addEventListener("blur", () => field.remove(), { once: true });
  }
  const timer = window.setTimeout(() => {
    button.textContent = original;
    copyStates.delete(button);
  }, 2200);
  copyStates.set(button, { label: original, timer });
}
document
  .querySelector<HTMLButtonElement>("[data-share-article]")
  ?.addEventListener("click", (event) => {
    const url = new URL(location.href);
    url.hash = "";
    copyReadingLink(url.href, event.currentTarget as HTMLButtonElement);
  });
for (const target of sectionTargets) {
  const heading = target?.matches("h2,h3,h4")
    ? target
    : target?.closest("h2,h3,h4");
  if (!target || !heading) continue;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "section-share";
  button.textContent = "#";
  button.setAttribute(
    "aria-label",
    `Copiar link da seção ${target.textContent?.trim()}`,
  );
  button.title = "Copiar link desta seção";
  button.addEventListener("click", () => {
    const url = new URL(location.href);
    url.hash = target.id;
    copyReadingLink(url.href, button);
  });
  heading.append(button);
}

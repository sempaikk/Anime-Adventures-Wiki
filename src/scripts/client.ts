const $ = (s: string) => document.querySelector(s) as HTMLElement;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const local = (url: string) => BASE + url;
const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
function toast(message: string) {
  const box = $(".toast");
  box.textContent = message;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), 2600);
}
const themeMenu = document.querySelector<HTMLDetailsElement>(".theme-menu")!;
function markTheme() {
  document
    .querySelectorAll<HTMLElement>("[data-set-theme]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(
          button.dataset.setTheme === document.documentElement.dataset.theme,
        ),
      ),
    );
}
markTheme();
document
  .querySelectorAll<HTMLButtonElement>("[data-set-theme]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      const next = button.dataset.setTheme!;
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("aa-theme", next);
      } catch {
        toast(
          "O tema foi aplicado. Seu navegador não permitiu salvar a preferência.",
        );
      }
      markTheme();
      themeMenu.open = false;
      themeMenu.querySelector<HTMLElement>("summary")?.focus();
    }),
  );
document.addEventListener("click", (event) => {
  if (!(event.target as Element).closest(".theme-menu")) themeMenu.open = false;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && themeMenu.open) {
    themeMenu.open = false;
    themeMenu.querySelector<HTMLElement>("summary")?.focus();
  }
});
window.addEventListener("storage", (event) => {
  if (
    event.key === "aa-theme" &&
    ["adventures", "dark", "light"].includes(event.newValue || "")
  ) {
    document.documentElement.dataset.theme = event.newValue!;
    markTheme();
  }
});

document
  .querySelectorAll<HTMLButtonElement>("[data-hub-filter]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      const kind = button.dataset.hubFilter;
      document
        .querySelectorAll<HTMLElement>("[data-hub-kind]")
        .forEach((entry) => {
          entry.hidden = kind !== "all" && entry.dataset.hubKind !== kind;
        });
      document
        .querySelectorAll("[data-hub-filter]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
    }),
  );
const menu = $("[data-menu-toggle]");
function closeMenu() {
  const wasOpen = document.body.classList.contains("sidebar-open");
  document.body.classList.remove("sidebar-open");
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-label", "Abrir navegação");
  if (wasOpen) menu.focus();
}
menu.addEventListener("click", () => {
  const open = document.body.classList.toggle("sidebar-open");
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute(
    "aria-label",
    open ? "Fechar navegação" : "Abrir navegação",
  );
});
$("[data-menu-close]").addEventListener("click", closeMenu);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
  if (e.key === "Tab" && document.body.classList.contains("sidebar-open")) {
    const controls = [
      menu,
      ...Array.from(document.querySelectorAll("#side-nav a")),
    ] as HTMLElement[];
    const first = controls[0],
      last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
matchMedia("(max-width:650px)").addEventListener("change", closeMenu);
let searchIndex: any[] | null = null;
let pending: Promise<any> | null = null;
async function getIndex() {
  if (searchIndex) return searchIndex;
  if (!pending)
    pending = fetch(local("/data/search.json"))
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => (searchIndex = data))
      .catch((error) => {
        pending = null;
        throw error;
      });
  return pending;
}
const dialog = $("#search-dialog") as HTMLDialogElement,
  input = $("#global-search") as HTMLInputElement,
  results = $("#global-results");
let searchVersion = 0;
function message(text: string) {
  results.replaceChildren();
  const p = document.createElement("p");
  p.className = "search-message";
  p.textContent = text;
  results.append(p);
}
async function search() {
  const version = ++searchVersion,
    q = normalize(input.value.trim());
  if (!q) {
    message(
      "Personagens, evoluções, itens e modos: comece pelo que você quer descobrir.",
    );
    return;
  }
  message("Buscando no arquivo…");
  try {
    const index = await getIndex();
    if (version !== searchVersion) return;
    const matches = index
      .filter((p: any) =>
        normalize(
          p.title + " " + p.excerpt + " " + (p.aliases || []).join(" "),
        ).includes(q),
      )
      .sort((a: any, b: any) => searchRank(b, q) - searchRank(a, q))
      .slice(0, 12);
    results.replaceChildren();
    if (!matches.length) {
      message("Nenhum resultado. Tente outro nome ou um termo mais curto.");
      return;
    }
    for (const item of matches) {
      const a = document.createElement("a");
      a.className = "search-result";
      a.href = local(item.url);
      const strong = document.createElement("strong");
      strong.textContent = item.title;
      const small = document.createElement("small");
      small.textContent = item.excerpt.slice(0, 130);
      a.append(strong, small);
      results.append(a);
    }
  } catch {
    if (version === searchVersion)
      message(
        "Não foi possível carregar a busca. Confira sua conexão e tente digitar novamente.",
      );
  }
}
function openSearch() {
  closeMenu();
  dialog.showModal();
  input.focus();
  search();
}
$("[data-search-open]").addEventListener("click", openSearch);
$("[data-search-close]").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
input.addEventListener("input", search);
input.addEventListener("keydown", (e) => {
  const first = results.querySelector("a") as HTMLAnchorElement | null;
  if (first && e.key === "ArrowDown") {
    e.preventDefault();
    first.focus();
  }
  if (first && e.key === "Enter" && !e.isComposing) {
    e.preventDefault();
    location.assign(first.href);
  }
});
results.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const links = Array.from(results.querySelectorAll("a"));
  const index = links.indexOf(document.activeElement as HTMLAnchorElement);
  if (index < 0) return;
  e.preventDefault();
  const next = e.key === "ArrowDown" ? links[index + 1] : links[index - 1];
  (next || input).focus();
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    dialog.open ? dialog.close() : openSearch();
  }
});
const unitGrid = $("#unit-grid");
if (unitGrid) {
  const cards = Array.from(
    unitGrid.querySelectorAll("[data-unit-card]"),
  ) as HTMLElement[];
  const query = $("#unit-search") as HTMLInputElement,
    rarity = $("#rarity-filter") as HTMLSelectElement,
    form = $("#form-filter") as HTMLSelectElement,
    retired = $("#retired-filter") as HTMLInputElement;
  let shown = 24;
  function filter(reset = true) {
    if (reset) shown = 24;
    const q = normalize(query.value);
    const matched = cards.filter(
      (card) =>
        normalize(card.dataset.name || "").includes(q) &&
        (!rarity.value || card.dataset.rarity === rarity.value) &&
        (!form.value ||
          card.dataset.evolved === String(form.value === "variant")) &&
        (retired.checked || card.dataset.retired !== "true"),
    );
    const visible = new Set(matched.slice(0, shown));
    for (const c of cards) c.hidden = !visible.has(c);
    $("#unit-results").textContent =
      `${matched.length} personagem${matched.length === 1 ? "" : "s"} encontrado${matched.length === 1 ? "" : "s"}`;
    $("#unit-empty").hidden = matched.length > 0;
    $("#load-units").hidden = shown >= matched.length;
  }
  query.addEventListener("input", () => filter());
  for (const control of [rarity, form, retired])
    control.addEventListener("change", () => filter());
  $("#load-units").addEventListener("click", () => {
    shown += 24;
    filter(false);
  });
  $("#clear-filters").addEventListener("click", () => {
    query.value = "";
    rarity.value = "";
    form.value = "";
    retired.checked = false;
    filter();
  });
  filter();
}
const articleGrid = $("#article-grid");
if (articleGrid) {
  const cards = Array.from(articleGrid.children) as HTMLElement[],
    query = $("#article-search") as HTMLInputElement;
  const includeRetired = $("#library-retired") as HTMLInputElement;
  query.value = new URLSearchParams(location.search).get("q") || "";
  let kind = new URLSearchParams(location.search).get("tipo") || "",
    shown = 30;
  const kindButtons = Array.from(
    document.querySelectorAll<HTMLElement>("[data-article-kind]"),
  );
  if (!kindButtons.some((button) => button.dataset.articleKind === kind))
    kind = "";
  kindButtons.forEach((button) =>
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.articleKind === kind),
    ),
  );
  function filter(reset = true) {
    if (reset) shown = 30;
    const q = normalize(query.value);
    const matched = cards.filter(
      (c) =>
        (!kind || c.dataset.kind === kind) &&
        (includeRetired.checked || c.dataset.retired !== "true") &&
        normalize(c.dataset.title || "").includes(q),
    );
    const visible = new Set(matched.slice(0, shown));
    for (const c of cards) c.hidden = !visible.has(c);
    $("#article-results").textContent =
      `${matched.length} artigo${matched.length === 1 ? "" : "s"} encontrado${matched.length === 1 ? "" : "s"}`;
    $("#article-empty").hidden = matched.length > 0;
    $("#load-articles").hidden = shown >= matched.length;
  }
  query.addEventListener("input", () => filter());
  includeRetired.addEventListener("change", () => filter());
  document.querySelectorAll("[data-article-kind]").forEach((b) =>
    b.addEventListener("click", () => {
      kind = (b as HTMLElement).dataset.articleKind || "";
      document
        .querySelectorAll("[data-article-kind]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      filter();
    }),
  );
  $("#load-articles").addEventListener("click", () => {
    shown += 30;
    filter(false);
  });
  filter();
}
const favorite = $("[data-favorite]");
if (favorite) {
  const id = favorite.dataset.favorite!;
  function refresh(active: boolean) {
    favorite.setAttribute("aria-pressed", String(active));
    favorite.textContent = active
      ? "Salvo nos favoritos ✓"
      : "Salvar nos favoritos ＋";
  }
  favorite.addEventListener("click", async () => {
    (favorite as HTMLButtonElement).disabled = true;
    try {
      const result = await toggleFavorite(id);
      refresh(result.active);
      toast(
        result.active
          ? result.account
            ? "Artigo salvo na sua conta."
            : "Artigo salvo neste navegador."
          : "Artigo removido dos favoritos.",
      );
    } catch (error) {
      toast((error as Error).message || "Não foi possível salvar agora.");
    } finally {
      (favorite as HTMLButtonElement).disabled = false;
    }
  });
  getFavorites()
    .then((state) => refresh(state.ids.includes(id)))
    .catch(() => {
      favorite.textContent = "Tentar salvar nos favoritos";
    });
}
const favorites = $("#favorite-grid");
if (favorites) {
  Promise.all([getIndex(), getFavorites()])
    .then(([index, state]) => {
      const ids = new Set(state.ids);
      const found = index.filter((p: any) =>
        ids.has(p.favorite_id || p.url.split("/")[2]),
      );
      $("#favorite-empty").hidden = found.length > 0;
      for (const item of found) {
        const a = document.createElement("a");
        a.className = item.image
          ? "library-card"
          : "library-card library-card--text";
        a.href = local(item.url);
        const box = document.createElement("div"),
          h = document.createElement("h2"),
          p = document.createElement("p");
        h.textContent = item.title;
        p.textContent = item.excerpt;
        box.className = "library-card-copy";
        if (item.image) {
          const portrait = document.createElement("div"),
            image = document.createElement("img");
          portrait.className = "library-thumbnail";
          image.src = local(item.image);
          image.alt = "";
          image.loading = "lazy";
          portrait.append(image);
          a.append(portrait);
        }
        box.append(h, p);
        a.append(box);
        favorites.append(a);
      }
    })
    .catch(() => {
      favorites.textContent =
        "Não foi possível carregar seus favoritos. Atualize a página para tentar novamente.";
    });
}
const updateTabs = Array.from(
  document.querySelectorAll("[data-update-tab]"),
) as HTMLElement[];
function chooseUpdate(tab: HTMLElement) {
  for (const item of updateTabs) {
    const active = item === tab;
    item.setAttribute("aria-selected", String(active));
    item.setAttribute("aria-pressed", String(active));
    item.tabIndex = active ? 0 : -1;
    $("#updates-" + item.dataset.updateTab).hidden = !active;
  }
}
for (const tab of updateTabs) {
  tab.addEventListener("click", () => chooseUpdate(tab));
  tab.addEventListener("keydown", (e) => {
    const index = updateTabs.indexOf(tab);
    let target: number | undefined;
    if (e.key === "ArrowRight") target = (index + 1) % updateTabs.length;
    if (e.key === "ArrowLeft")
      target = (index + updateTabs.length - 1) % updateTabs.length;
    if (e.key === "Home") target = 0;
    if (e.key === "End") target = updateTabs.length - 1;
    if (target !== undefined) {
      e.preventDefault();
      chooseUpdate(updateTabs[target]);
      updateTabs[target].focus();
    }
  });
}
if (location.hash === "#bot" && updateTabs.length)
  chooseUpdate(updateTabs.find((t) => t.dataset.updateTab === "bot")!);
const mapStage = $(".map-stage");
if (mapStage) {
  const markers = Array.from(
      document.querySelectorAll("[data-map-point]"),
    ) as HTMLElement[],
    locations = Array.from(
      document.querySelectorAll("[data-map-select]"),
    ) as HTMLElement[];
  function selectMap(id: string) {
    const item = locations.find((p) => p.dataset.mapSelect === id);
    if (!item) return;
    for (const marker of markers)
      marker.setAttribute(
        "aria-pressed",
        String(marker.dataset.mapPoint === id),
      );
    for (const place of locations)
      place.classList.toggle("selected", place === item);
    $("#map-point-title").textContent = item.dataset.title || "";
    $("#map-point-description").textContent = item.dataset.description || "";
    const link = $("#map-point-link") as HTMLAnchorElement;
    link.hidden = !item.dataset.url;
    link.href = local(item.dataset.url || "/biblioteca/");
    if (matchMedia("(max-width:900px)").matches)
      $("#map-point-title").scrollIntoView({
        block: "center",
        behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  for (const marker of markers)
    marker.addEventListener("click", () => selectMap(marker.dataset.mapPoint!));
  for (const place of locations)
    place.addEventListener("click", () => selectMap(place.dataset.mapSelect!));
  let zoom = 1;
  function scale(value: number) {
    zoom = Math.max(1, Math.min(2, value));
    mapStage.style.width = `${zoom * 100}%`;
    $("#map-reset").textContent = Math.round(zoom * 100) + "%";
    ($("#map-minus") as HTMLButtonElement).disabled = zoom === 1;
    ($("#map-plus") as HTMLButtonElement).disabled = zoom === 2;
  }
  $("#map-plus").addEventListener("click", () => scale(zoom + 0.25));
  $("#map-minus").addEventListener("click", () => scale(zoom - 0.25));
  $("#map-reset").addEventListener("click", () => scale(1));
  scale(1);
}
import "./articles";
import "./effects";
import "./account";
import "./unit-preview";
import { getFavorites, toggleFavorite } from "./favorites";

function searchRank(item: any, q: string) {
  const title = normalize(item.title),
    aliases = (item.aliases || []).map(normalize);
  return title === q
    ? 100
    : aliases.includes(q)
      ? 95
      : title.startsWith(q)
        ? 80
        : aliases.some((alias: string) => alias.startsWith(q))
          ? 75
          : title.includes(q)
            ? 50
            : aliases.some((alias: string) => alias.includes(q))
              ? 45
              : 1;
}

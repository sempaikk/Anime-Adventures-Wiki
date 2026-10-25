import {showDialog,closeDialog,moveMenu,favoriteLabel,motionOn} from './ui-motion';
import {localPath,localData} from './i18n';
import {requestJson} from './request';
// One inset arrow and one consistent text baseline for every native select.
function enhanceSelects(root:ParentNode){
  const selects=[...(root instanceof HTMLSelectElement?[root]:[]),...root.querySelectorAll('select')];
  for(const select of selects){
    if(select.parentElement?.classList.contains('select-control'))continue;
    const wrapper=document.createElement('span');wrapper.className='select-control';
    select.before(wrapper);wrapper.append(select);
  }
}
enhanceSelects(document);
new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node instanceof Element)enhanceSelects(node)}).observe(document.body,{childList:true,subtree:true});
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const local = (url: string) => BASE + localPath(url);
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
let themeTransition:{skipTransition:()=>void}|undefined;
function applyTheme(next:string) {
  themeTransition?.skipTransition();
  const paint=()=>{document.documentElement.dataset.theme=next;markTheme()};
  if(motionOn()&&document.startViewTransition){const transition=document.startViewTransition(paint);themeTransition=transition;transition.ready.catch(()=>{});transition.finished.catch(()=>{})}else paint();
}
document.addEventListener('aa:motion-change',()=>{if(!motionOn())themeTransition?.skipTransition()});
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
      applyTheme(next);
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
    applyTheme(event.newValue!);
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
const sideNav = $("#side-nav");
sideNav.inert = true;
let menuOpen=false, menuVersion=0;
function closeMenu() {
  const wasOpen=menuOpen, version=++menuVersion;menuOpen=false;
  sideNav.inert=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir navegação');
  if(wasOpen){menu.focus();moveMenu(sideNav,false).then(()=>{if(version===menuVersion)document.body.classList.remove('sidebar-open')})}
  else document.body.classList.remove('sidebar-open');
}
menu.addEventListener('click',()=>{
  if(menuOpen){closeMenu();return}
  menuOpen=true;++menuVersion;sideNav.getAnimations().forEach(a=>a.cancel());
  document.body.classList.add('sidebar-open');sideNav.inert=false;
  document.documentElement.style.setProperty('--nav-menu-top',`${Math.round(document.querySelector('.site-header')!.getBoundingClientRect().bottom+8)}px`);
  menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Fechar navegação');moveMenu(sideNav,true);
});
addEventListener('pageshow',()=>{menuOpen=false;++menuVersion;sideNav.getAnimations().forEach(a=>a.cancel());document.body.classList.remove('sidebar-open');sideNav.inert=true;menu.setAttribute('aria-expanded','false')});
$("[data-menu-close]").addEventListener("click", closeMenu);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
  if (e.key === "Tab" && menuOpen) {
    const controls = [
      menu,
      ...Array.from(
        document.querySelectorAll("#side-nav a, #side-nav summary"),
      ).filter(
        (control) => (control as HTMLElement).getClientRects().length > 0 &&
          (!control.closest('details:not([open])') || control.matches('summary')),
      ),
    ] as HTMLElement[];
    const current=controls.indexOf(document.activeElement as HTMLElement);
    e.preventDefault();
    controls[(current+(e.shiftKey?-1:1)+controls.length)%controls.length]?.focus();
  }
});
matchMedia("(max-width:1000px)").addEventListener("change", closeMenu);
let searchIndex: any[] | null = null;
let pending: Promise<any> | null = null;
async function getIndex() {
  if (searchIndex) return searchIndex;
  if (!pending)
    pending = requestJson(BASE + localData("search"))
      .then(({response,data}) => {
        if (!response.ok) throw Error();
        return data;
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
    message("Digite o nome de um personagem, item ou assunto.");
    return;
  }
  message("Pesquisando…");
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
let searchOpener: HTMLElement | null = null;
function openSearch() {
  searchOpener =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  closeMenu();
  showDialog(dialog);
  input.focus();
  search();
}
document
  .querySelectorAll<HTMLElement>("[data-search-open]")
  .forEach((button) => button.addEventListener("click", openSearch));
document
  .querySelector<HTMLFormElement>("[data-home-search]")
  ?.addEventListener("submit", (event) => {
    event.preventDefault();
    input.value =
      document.querySelector<HTMLInputElement>("#home-search")?.value.trim() ||
      "";
    openSearch();
  });
dialog.addEventListener("close", () =>
  searchOpener?.focus({ preventScroll: true }),
);
$("[data-search-close]").addEventListener("click", () => closeDialog(dialog));
dialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeDialog(dialog);
  }
});
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeDialog(dialog);
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
    dialog.open ? closeDialog(dialog) : openSearch();
  }
});
const favorite = $("[data-favorite]");
if (favorite) {
  const id = favorite.dataset.favorite!;
  function refresh(active: boolean) {
    favorite.setAttribute("aria-pressed", String(active));
    favoriteLabel(favorite,active,true);
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
  function refreshFavorite() {
    getFavorites()
      .then((state) => refresh(state.ids.includes(id)))
      .catch(() => {
        favorite.textContent = "Tentar salvar nos favoritos";
      });
  }
  document.addEventListener("aa:favorites-changed", refreshFavorite);
  refreshFavorite();
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
import "./article-images";
import "./effects";
import "./account";
import "./unit-preview";
import "./compare";
import "./catalog";
import "./favorite-page";
import "./discussion";
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

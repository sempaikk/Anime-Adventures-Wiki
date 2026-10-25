import {showDialog,closeDialog,animateUI,portraitFlight,respond,favoriteLabel} from './ui-motion';
import { getFavorites, toggleFavorite } from "./favorites";
import { getUnits, type Unit } from "./unit-data";
import { factLabel, factValue } from "../lib/unit-tools.mjs";
const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const modal = document.querySelector<HTMLDialogElement>("#unit-preview")!;
const title = modal.querySelector<HTMLElement>("#preview-name")!;
const image = modal.querySelector<HTMLImageElement>("[data-preview-image]")!;
const rarity = modal.querySelector<HTMLElement>("[data-preview-rarity]")!;
const aliases = modal.querySelector<HTMLElement>("[data-preview-aliases]")!;
const facts = modal.querySelector<HTMLElement>("[data-preview-facts]")!;
const message = modal.querySelector<HTMLElement>("[data-preview-message]")!;
const article = modal.querySelector<HTMLAnchorElement>(
  "[data-preview-article]",
)!;
const save = modal.querySelector<HTMLButtonElement>("[data-preview-save]")!;
let version = 0,
  current: Unit | null = null;
const tone = (value: string) => {
  const s = value.toLowerCase();
  return s.includes("secret")
    ? "secret"
    : s.includes("mythic")
      ? "mythic"
      : s.includes("legendary")
        ? "legendary"
        : s.includes("epic")
          ? "epic"
          : s.includes("rare")
            ? "rare"
            : s.includes("exclusive")
              ? "exclusive"
              : "neutral";
};
async function open(id: string, source:HTMLImageElement|null) {
  const request = ++version;
  current = null;
  modal.dataset.previewLoading='';
  save.disabled = true;
  favoriteLabel(save,false);
  save.setAttribute("aria-pressed", "false");
  title.textContent = "Carregando personagem…";
  message.textContent = "";
  rarity.textContent = "";
  aliases.textContent = "";
  facts.replaceChildren();
  image.hidden = true;
  image.removeAttribute("src");
  article.hidden = true;
  modal.removeAttribute("data-tone");
  const compare = modal.querySelector<HTMLButtonElement>("[data-preview-compare]")!;
  compare.disabled = true;
  compare.removeAttribute("data-compare");
  showDialog(modal);
  try {
    const units = await getUnits();
    if (request !== version || !modal.open) return;
    const unit = units.find((u) => u.id === id);
    if (!unit) throw Error();
    if(unit.image?.startsWith('/art/')){const preload=new Image();preload.src=base+unit.image;try{await preload.decode()}catch{}}
    if(request!==version||!modal.open||modal.hasAttribute('data-motion-closing'))return;
    current = unit;
    compare.dataset.compare = unit.id;
    delete compare.dataset.compareLabel;
    compare.setAttribute("aria-label", `Comparar ${unit.name}`);
    compare.disabled = false;
    document.dispatchEvent(new Event("aa:comparison-refresh"));
    title.textContent = unit.name;
    rarity.textContent = unit.retired
      ? "Arquivo histórico"
      : unit.rarity || "Personagem";
    modal.dataset.tone = tone(unit.rarity || "");
    aliases.textContent = unit.aliases.length
      ? "Também conhecido como: " + unit.aliases.join(" · ")
      : "";
    if (unit.image?.startsWith("/art/")) {
      image.src = base + unit.image;
      image.alt = unit.name;
      image.hidden = false;
    } else
      message.textContent =
        "Ainda não há um retrato confirmado para esta forma.";
    for (const fact of unit.facts) {
      if (!factValue(unit, fact.label)) continue;
      const row = document.createElement("div"),
        dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = factLabel(fact.label);
      dd.textContent = fact.value;
      row.append(dt, dd);
      facts.append(row);
    }
    if(unit.image?.startsWith('/art/')){try{await image.decode()}catch{}}
    if(request!==version||!modal.open||modal.hasAttribute('data-motion-closing'))return;
    delete modal.dataset.previewLoading;
    portraitFlight(source,image);
    [...facts.children].forEach((row,i)=>animateUI(row,[{opacity:0,translate:'18px 0'},{opacity:1,translate:'0 0'}],{duration:650,delay:i*75}));
    animateUI(title,[{opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}],{duration:650});
    article.href = base + unit.url;
    article.hidden = false;
    try {
      const state = await getFavorites();
      if (request !== version || !modal.open) return;
      const active = state.ids.includes(unit.favorite_id);
      favoriteLabel(save,active);
      save.setAttribute("aria-pressed", String(active));
      save.disabled = false;
    } catch (error) {
      if (request === version) {
        message.textContent = (error as Error).message;
        save.disabled = false;
      }
    }
  } catch {
    if (request === version) {
      delete modal.dataset.previewLoading;
      title.textContent = "Não foi possível carregar a ficha";
      message.textContent =
        "Não foi possível carregar a ficha. Confira sua conexão e abra o personagem novamente.";
    }
  }
}
document.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLElement>(
    "[data-unit-preview]",
  );
  if (button) open(button.dataset.unitPreview!,button.closest('.unit-entry,.nexus-stage-wrap')?.querySelector<HTMLImageElement>('.unit-art>img,[data-stage-image]')||null);
});
modal
  .querySelector("[data-preview-close]")!
  .addEventListener("click", () => closeDialog(modal));
modal.addEventListener("close", () => {
  version++;
  current = null;
});
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    const rect = modal.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeDialog(modal);
  }
});
save.addEventListener("click", async () => {
  if (!current) return;
  const unit = current,
    request = version;
  save.disabled = true;
  try {
    const result = await toggleFavorite(unit.favorite_id);
    if (request !== version) return;
    favoriteLabel(save,result.active);
    save.setAttribute("aria-pressed", String(result.active));
    respond(save,"success");
    message.textContent = result.active
      ? result.account
        ? "Salvo na sua conta."
        : "Salvo neste navegador."
      : "Removido dos favoritos.";
  } catch (error) {
    if (request === version) message.textContent = (error as Error).message;
  } finally {
    if (request === version) save.disabled = false;
  }
});
document.addEventListener("aa:favorites-changed", async () => {
  const unit = current, request = version;
  if (!unit || !modal.open) return;
  try {
    const state = await getFavorites();
    if (request !== version || !modal.open) return;
    const active = state.ids.includes(unit.favorite_id);
    favoriteLabel(save,active);
    save.setAttribute("aria-pressed", String(active));
  } catch (error) { if (request === version) message.textContent = (error as Error).message; }
});

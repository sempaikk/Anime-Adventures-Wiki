import { getFavorites, toggleFavorite } from "./favorites";
type Unit = {
  id: string;
  favorite_id: string;
  name: string;
  aliases: string[];
  rarity: string;
  image: string | null;
  retired: boolean;
  url: string;
  facts: { label: string; value: string }[];
};
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
let pending: Promise<Unit[]> | undefined,
  version = 0,
  current: Unit | null = null;
function loadUnits() {
  if (!pending)
    pending = fetch(base + "/data/units.json")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .catch((error) => {
        pending = undefined;
        throw error;
      });
  return pending;
}
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
async function open(id: string) {
  const request = ++version;
  current = null;
  save.disabled = true;
  save.textContent = "Salvar";
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
  modal.showModal();
  try {
    const units = await loadUnits();
    if (request !== version || !modal.open) return;
    const unit = units.find((u) => u.id === id);
    if (!unit) throw Error();
    current = unit;
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
      const row = document.createElement("div"),
        dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = fact.label;
      dd.textContent = fact.value;
      row.append(dt, dd);
      facts.append(row);
    }
    article.href = base + unit.url;
    article.hidden = false;
    try {
      const state = await getFavorites();
      if (request !== version || !modal.open) return;
      const active = state.ids.includes(unit.favorite_id);
      save.textContent = active ? "Salvo ✓" : "Salvar";
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
  if (button) open(button.dataset.unitPreview!);
});
modal
  .querySelector("[data-preview-close]")!
  .addEventListener("click", () => modal.close());
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
      modal.close();
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
    save.textContent = result.active ? "Salvo ✓" : "Salvar";
    save.setAttribute("aria-pressed", String(result.active));
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

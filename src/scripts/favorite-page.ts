import { getFavorites, removeFavorite } from "./favorites";
const grid = document.querySelector<HTMLElement>("#favorite-grid");
if (grid) {
  type Entry = {title:string; url:string; favorite_id?:string; excerpt:string; kind:string; image?:string; aliases?:string[]};
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const query = document.querySelector<HTMLInputElement>("#favorite-search")!, kind = document.querySelector<HTMLSelectElement>("#favorite-kind")!, sort = document.querySelector<HTMLSelectElement>("#favorite-sort")!;
  const results = document.querySelector<HTMLElement>("#favorite-results")!, message = document.querySelector<HTMLElement>("[data-favorites-message]")!, load = document.querySelector<HTMLButtonElement>("#load-favorites")!;
  const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let indexPromise: Promise<Entry[]> | undefined, version = 0, shown = 12, failed = false;
  function index() {
    if (!indexPromise) indexPromise = fetch(base + "/data/search.json").then((response) => { if (!response.ok) throw Error(); return response.json(); }).catch(() => { indexPromise = undefined; throw Error("Não foi possível carregar os artigos. Atualize a página para tentar novamente."); });
    return indexPromise;
  }
  function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?:string, className?:string) {
    const element = document.createElement(tag); if (text) element.textContent = text; if (className) element.className = className; return element;
  }
  async function render(reset = false) {
    const request = ++version;
    if (reset) shown = 12;
    try {
      const [entries,state] = await Promise.all([index(),getFavorites()]);
      if (request !== version) return;
      const lookup = new Map<string,Entry>();
      for (const item of entries) {
        const slug = item.url.split("/")[2];
        if (slug) lookup.set(slug,item);
      }
      for (const item of entries) if (item.favorite_id && !lookup.has(item.favorite_id)) lookup.set(item.favorite_id,item);
      const q = normalize(query.value.trim());
      const saved = state.ids.map((id,position) => ({id,position,item:lookup.get(id)})).filter(({item}) => (!kind.value || (kind.value === "unit" ? item?.kind === "unit" : item?.kind !== "unit")) && (!q || normalize([item?.title || "Artigo indisponível",...(item?.aliases || [])].join(" ")).includes(q)));
      saved.sort((a,b) => sort.value === "name" ? (a.item?.title || a.id).localeCompare(b.item?.title || b.id) : b.position-a.position);
      const focused = document.activeElement instanceof HTMLButtonElement ? document.activeElement.dataset.favoriteRemove : null;
      grid!.replaceChildren();
      for (const {id,item} of saved.slice(0,shown)) {
        const card = node("article",undefined,"favorite-entry");
        const content = node(item ? "a" : "div",undefined,"library-card");
        if (item) (content as HTMLAnchorElement).href = base + item.url;
        if (item?.image?.startsWith("/art/")) {
          const portrait = node("div",undefined,"library-thumbnail"), image = node("img"); image.src = base + item.image; image.alt = ""; image.width = image.height = 96; image.loading = "lazy"; portrait.append(image); content.append(portrait);
        } else content.classList.add("library-card--text");
        const copy = node("div",undefined,"library-card-copy"); copy.append(node("h2",item?.title || "Artigo indisponível"),node("p",item?.excerpt || "Este favorito não tem um artigo correspondente no catálogo atual. Você pode removê-lo da coleção.")); content.append(copy);
        const footer = node("div",undefined,"favorite-entry-footer"), remove = node("button","Remover","favorite-remove"); remove.type = "button"; remove.dataset.favoriteRemove = id; remove.setAttribute("aria-label",`Remover ${item?.title || "artigo indisponível"} dos favoritos`);
        footer.append(node("span",state.account ? "SALVO NA CONTA" : "SALVO NESTE NAVEGADOR"),remove); card.append(content,footer); grid!.append(card);
      }
      if (focused) Array.from(grid!.querySelectorAll<HTMLButtonElement>("[data-favorite-remove]")).find((button) => button.dataset.favoriteRemove === focused)?.focus({preventScroll:true});
      results.textContent = `${saved.length} de ${state.ids.length} favorito${state.ids.length === 1 ? "" : "s"}`;
      document.querySelector<HTMLElement>("#favorite-empty")!.hidden = state.ids.length > 0;
      document.querySelector<HTMLElement>("#favorite-filter-empty")!.hidden = !state.ids.length || saved.length > 0;
      load.hidden = saved.length <= shown;
      if (failed || message.textContent === "Carregando favoritos…") message.textContent = "";
      failed = false;
    } catch (error) { if (request === version) { failed = true; message.textContent = (error as Error).message; load.hidden = true; } }
  }
  query.addEventListener("input",() => render(true)); for (const control of [kind,sort]) control.addEventListener("change",() => render(true));
  document.querySelector("#clear-favorite-filters")!.addEventListener("click",() => { query.value = kind.value = ""; sort.value = "saved"; render(true); query.focus(); });
  load.addEventListener("click",() => { shown += 12; render(); });
  grid.addEventListener("click",async (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-favorite-remove]");
    if (!button || button.disabled) return;
    button.disabled = true;
    try { await removeFavorite(button.dataset.favoriteRemove!); await render(); message.textContent = "Favorito removido."; results.focus({preventScroll:true}); }
    catch (error) { message.textContent = (error as Error).message; button.disabled = false; }
  });
  document.addEventListener("aa:favorites-changed",() => render()); render();
}

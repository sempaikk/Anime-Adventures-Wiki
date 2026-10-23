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
    if (parent instanceof HTMLDetailsElement) parent.open = true;
    parent = parent.parentElement;
  }
  requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
}
window.addEventListener("hashchange", revealAnchor);
if (location.hash) revealAnchor();

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

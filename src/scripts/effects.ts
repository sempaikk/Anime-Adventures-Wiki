// A single delegated pointer handler: no animation loop when the visitor is idle.
const motion = matchMedia(
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
);
const selector =
  ".unit-card,.library-card,.game-tile,.hub-intro,.unit-profile,.map-view,.feed-entry,.account-panel";
let current: HTMLElement | null = null,
  frame = 0,
  point = { x: 0, y: 0 };
function clear() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  current?.classList.remove("pointer-active");
  current?.style.removeProperty("--art-x");
  current?.style.removeProperty("--art-y");
  current = null;
}
document.addEventListener(
  "pointermove",
  (event) => {
    if (!motion.matches) return;
    const card = (event.target as Element).closest<HTMLElement>(selector);
    if (card !== current) {
      clear();
      current = card;
      current?.classList.add("pointer-active");
    }
    if (!card) return;
    point = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!current) return;
      const rect = current.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (point.x - rect.left) / rect.width)),
        y = Math.min(1, Math.max(0, (point.y - rect.top) / rect.height));
      current.style.setProperty("--pointer-x", `${Math.round(x * 100)}%`);
      current.style.setProperty("--pointer-y", `${Math.round(y * 100)}%`);
      current.style.setProperty("--art-x", `${((x - 0.5) * 7).toFixed(1)}px`);
      current.style.setProperty("--art-y", `${((y - 0.5) * 5).toFixed(1)}px`);
    });
  },
  { passive: true },
);
document.addEventListener("pointerleave", clear);
window.addEventListener("blur", clear);
motion.addEventListener("change", clear);

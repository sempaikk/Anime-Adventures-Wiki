// A single delegated pointer handler: no animation loop when the visitor is idle.
const motion = matchMedia(
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
);
const selector =
  ".unit-card,.library-card,.orbit-portal,.person-card,.game-tile,.hub-intro,.unit-profile,.map-view,.home-shortcut,.account-panel";
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

// Reveal only content reached by scrolling or filtering. The first screen stays visible.
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const animated = new Set<Animation>();
let observer: IntersectionObserver | undefined;
const revealed = new WeakSet<Element>();
function observeContent() {
  observer?.disconnect();
  if (reduced.matches || !("IntersectionObserver" in window)) return;
  const cards = document.querySelectorAll<HTMLElement>(
    ".orbit-portal,.person-card,.featured-strip>a,.game-tile,.home-shortcut,.unit-entry,.library-card,.community-channel,.update-entry",
  );
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (rect.width && rect.top < innerHeight && rect.bottom > 0)
      revealed.add(card);
  }
  observer = new IntersectionObserver(
    (entries) => {
      let position = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer?.unobserve(entry.target);
        if (revealed.has(entry.target)) continue;
        revealed.add(entry.target);
        const animation = entry.target.animate(
          [
            { opacity: 0, transform: "translateY(12px)" },
            { opacity: 1, transform: "none" },
          ],
          {
            duration: 320,
            delay: Math.min(position++ * 30, 90),
            easing: "cubic-bezier(.2,.7,.2,1)",
          },
        );
        animated.add(animation);
        animation.finished
          .catch(() => {})
          .finally(() => animated.delete(animation));
      }
    },
    { threshold: 0.08 },
  );
  for (const card of cards) if (!revealed.has(card)) observer.observe(card);
}
observeContent();
reduced.addEventListener("change", () => {
  for (const animation of animated) animation.cancel();
  animated.clear();
  observeContent();
});
document.addEventListener("click", (event) => {
  if (reduced.matches) return;
  const button = (event.target as Element).closest<HTMLElement>(".button");
  if (!button || button.matches(":disabled")) return;
  const r = button.getBoundingClientRect(),
    pulse = document.createElement("span");
  pulse.className = "click-pulse";
  pulse.setAttribute("aria-hidden", "true");
  pulse.style.left = `${(event.clientX || r.left + r.width / 2) - r.left - 6}px`;
  pulse.style.top = `${(event.clientY || r.top + r.height / 2) - r.top - 6}px`;
  button.append(pulse);
  setTimeout(() => pulse.remove(), 550);
});

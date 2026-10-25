// Effects use the game artwork and control states.
const enabled = () => document.documentElement.dataset.motion === "on";
// Reveal only content reached by scrolling or filtering. The first screen stays visible.
let initialPass = true;
const animated = new Set<Animation>();
let observer: IntersectionObserver | undefined;
const revealed = new WeakSet<Element>();
const surfaces =
  ".unit-entry,.library-card,.orbit-portal,.person-card,.comparison-slot,.community-channel";
const watchedSurfaces = new WeakSet<Element>();
const surfaceObserver =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            entry.target.toggleAttribute(
              "data-effect-visible",
              entry.isIntersecting,
            );
        },
        { rootMargin: "80px" },
      )
    : undefined;
function observeContent() {
  observer?.disconnect();
  if (!enabled() || !("IntersectionObserver" in window)) return;
  for (const card of document.querySelectorAll(surfaces)) {
    if (!watchedSurfaces.has(card)) {
      watchedSurfaces.add(card);
      surfaceObserver?.observe(card);
    }
  }
  const cards = document.querySelectorAll<HTMLElement>(
    ".orbit-portal,.person-card,.featured-strip>a,.game-tile,.home-shortcut,.unit-entry,.library-card,.community-channel,.update-entry,.comment,.public-profile-header,[data-nexus-surface]",
  );
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (initialPass && rect.width && rect.top < innerHeight && rect.bottom > 0)
      revealed.add(card);
  }
  initialPass = false;
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
            { opacity: 0, transform: "translateY(25px) scale(.985)" },
            { opacity: 1, transform: "none" },
          ],
          {
            duration: 560,
            delay: Math.min(position++ * 45, 180),
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
document.addEventListener("aa:motion-change", () => {
  for (const animation of animated) animation.cancel();
  animated.clear();
  observeContent();
});
// New profile/comment cards also receive the same reveal treatment.
let contentTimer = 0;
new MutationObserver((records) => {
  if (!enabled()) return;
  if (
    records.some((record) =>
      [...record.addedNodes].some(
        (node) =>
          node instanceof Element &&
          (node.matches(".person-card,.comment,.public-profile-header") ||
            node.querySelector(".person-card,.comment,.public-profile-header")),
      ),
    )
  ) {
    clearTimeout(contentTimer);
    contentTimer = window.setTimeout(observeContent, 60);
  }
}).observe(document.getElementById("main")!, {
  childList: true,
  subtree: true,
});

function syncPageVisibility() {
  document.documentElement.dataset.pageHidden = String(document.hidden);
}
document.addEventListener('visibilitychange', syncPageVisibility);
syncPageVisibility();
let readingFrame = 0;
function readingProgress() {
  if (readingFrame) return;
  readingFrame = requestAnimationFrame(() => {
    readingFrame = 0;
    const distance = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty(
      "--reading-progress",
      String(distance > 0 ? Math.max(0, Math.min(1, scrollY / distance)) : 0),
    );
  });
}
addEventListener("scroll", readingProgress, { passive: true });
addEventListener("resize", readingProgress, { passive: true });
addEventListener("pageshow", readingProgress);
// Filters, images and discussions can change the reading distance without a scroll.
if ("ResizeObserver" in window)
  new ResizeObserver(readingProgress).observe(document.body);
readingProgress();

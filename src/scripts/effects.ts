// Pointer effects share one delegated handler and only render after pointer movement.
const motion = matchMedia("(hover: hover) and (pointer: fine)");
const selector =
  ".unit-entry,.library-card,.orbit-portal,.person-card,.game-tile,.home-shortcut,.comparison-slot,.community-channel,.map-location,[data-nexus-surface]";
const enabled = () => document.documentElement.dataset.motion === "on";
let current: HTMLElement | null = null,
  frame = 0,
  point = { x: 0, y: 0 };
function clear() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  current?.classList.remove("pointer-active");
  current?.style.removeProperty("--art-x");
  current?.style.removeProperty("--art-y");
  current?.style.removeProperty("--tilt-x");
  current?.style.removeProperty("--tilt-y");
  current = null;
}
document.addEventListener(
  "pointermove",
  (event) => {
    if (!motion.matches || !enabled()) return;
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
      current.style.setProperty(
        "--tilt-x",
        `${((0.5 - y) * 3.2).toFixed(2)}deg`,
      );
      current.style.setProperty(
        "--tilt-y",
        `${((x - 0.5) * 3.2).toFixed(2)}deg`,
      );
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
  clear();
  for (const animation of animated) animation.cancel();
  animated.clear();
  observeContent();
});
const pressed = new WeakMap<
  HTMLElement,
  { position: string; overflow: string; count: number }
>();
document.addEventListener("click", (event) => {
  if (!enabled()) return;
  const button = (event.target as Element).closest<HTMLElement>(
    ".button,button,summary.square-button,.back-top",
  );
  if (!button || button.matches(":disabled")) return;
  const state = pressed.get(button) ?? {
    position: button.style.position,
    overflow: button.style.overflow,
    count: 0,
  };
  pressed.set(button, state);
  state.count++;
  if (getComputedStyle(button).position === "static")
    button.style.position = "relative";
  button.style.overflow = "hidden";
  const r = button.getBoundingClientRect(),
    pulse = document.createElement("span");
  pulse.className = "click-pulse";
  pulse.setAttribute("aria-hidden", "true");
  pulse.style.left = `${(event.clientX || r.left + r.width / 2) - r.left - 6}px`;
  pulse.style.top = `${(event.clientY || r.top + r.height / 2) - r.top - 6}px`;
  button.append(pulse);
  setTimeout(() => {
    pulse.remove();
    if (--state.count === 0) {
      button.style.position = state.position;
      button.style.overflow = state.overflow;
      pressed.delete(button);
    }
  }, 550);
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

const particleCanvas = document.querySelector<HTMLCanvasElement>(
  "[data-site-particles]",
);
if (particleCanvas) {
  const context = particleCanvas.getContext("2d");
  if (context) {
    let width = innerWidth,
      height = innerHeight,
      particleFrame = 0,
      lastFrame = 0,
      accent = "#73eeed",
      violet = "#bc9aff";
    let pointer = { x: -1000, y: -1000 };
    const particles = Array.from(
      { length: innerWidth < 700 ? 22 : 44 },
      () => ({
        x: Math.random(),
        y: Math.random(),
        speed: 0.000008 + Math.random() * 0.000015,
        radius: 0.6 + Math.random() * 1.3,
        phase: Math.random() * Math.PI * 2,
      }),
    );
    const resize = () => {
      width = innerWidth;
      height = innerHeight;
      const ratio = Math.min(devicePixelRatio, 1.5);
      particleCanvas.width = Math.round(width * ratio);
      particleCanvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const colors = () => {
      const css = getComputedStyle(document.documentElement);
      accent = css.getPropertyValue("--accent").trim();
      violet = css.getPropertyValue("--violet").trim();
    };
    function draw(time: number) {
      if (!enabled() || document.hidden) {
        particleFrame = 0;
        return;
      }
      particleFrame = requestAnimationFrame(draw);
      if (time - lastFrame < 33) return;
      const step = Math.min(80, time - lastFrame || 33);
      lastFrame = time;
      context.clearRect(0, 0, width, height);
      for (const [index, p] of particles.entries()) {
        p.y -= p.speed * step;
        if (p.y < -0.02) {
          p.y = 1.02;
          p.x = Math.random();
        }
        const x = p.x * width + Math.sin(time * 0.0002 + p.phase) * 14,
          y = p.y * height;
        const distance = Math.hypot(pointer.x - x, pointer.y - y),
          near = distance < 155;
        context.fillStyle = index % 3 ? accent : violet;
        context.globalAlpha = near
          ? 0.8
          : 0.22 + Math.sin(time * 0.001 + p.phase) * 0.13;
        context.beginPath();
        context.arc(x, y, p.radius + (near ? 0.7 : 0), 0, Math.PI * 2);
        context.fill();
        if (near) {
          context.globalAlpha = 0.13 * (1 - distance / 155);
          context.strokeStyle = accent;
          context.lineWidth = 0.7;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(pointer.x, pointer.y);
          context.stroke();
        }
      }
      context.globalAlpha = 1;
    }
    const update = () => {
      document.documentElement.dataset.pageHidden = String(document.hidden);
      colors();
      if (enabled() && !document.hidden) {
        if (!particleFrame) {
          lastFrame = 0;
          particleFrame = requestAnimationFrame(draw);
        }
      } else {
        cancelAnimationFrame(particleFrame);
        particleFrame = 0;
        context.clearRect(0, 0, width, height);
      }
    };
    document.addEventListener(
      "pointermove",
      (event) => {
        pointer = { x: event.clientX, y: event.clientY };
      },
      { passive: true },
    );
    document.addEventListener(
      "pointerleave",
      () => (pointer = { x: -1000, y: -1000 }),
    );
    document.addEventListener("aa:motion-change", update);
    document.addEventListener("visibilitychange", () => {
      document.documentElement.dataset.pageHidden = String(document.hidden);
      update();
    });
    new MutationObserver(colors).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    addEventListener("resize", resize, { passive: true });
    addEventListener("pagehide", () => {
      cancelAnimationFrame(particleFrame);
      particleFrame = 0;
    });
    addEventListener("pageshow", update);
    resize();
    colors();
    update();
  }
}
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

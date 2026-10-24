const hero = document.querySelector<HTMLElement>("[data-orbit-hero]");
if (hero) {
  const fine = matchMedia("(pointer:fine)");
  const image = hero.querySelector<HTMLImageElement>(".hero-world-image")!;
  const motionEnabled = () => document.documentElement.dataset.motion === "on";
  const nextImage = hero.querySelector<HTMLImageElement>(".hero-world-next")!;
  const caption = hero.querySelector<HTMLElement>("[data-scene-label]")!;
  const toggle = hero.querySelector<HTMLButtonElement>("[data-scene-toggle]")!;
  const scenes = JSON.parse(hero.dataset.sceneFrames || "[]") as {
    label: string;
    image: string;
  }[];
  const connection = (navigator as any).connection;
  let changeTexture: ((url: string) => void) | undefined;
  let sceneIndex = 0,
    sceneTimer = 0,
    paused = false,
    inView = hero.getBoundingClientRect().bottom > 0,
    changing = false,
    pageActive = true;
  const canRotate = () =>
    !paused &&
    motionEnabled() &&
    !connection?.saveData &&
    !document.hidden &&
    inView &&
    pageActive;
  function scheduleScene() {
    clearTimeout(sceneTimer);
    toggle.hidden =
      !motionEnabled() || !!connection?.saveData || scenes.length < 2;
    toggle.textContent = paused ? "Retomar rotação" : "Pausar rotação";
    if (canRotate() && scenes.length > 1)
      sceneTimer = window.setTimeout(rotateScene, 9000);
  }
  async function rotateScene() {
    if (!canRotate() || changing) return;
    changing = true;
    const index = (sceneIndex + 1) % scenes.length,
      next = scenes[index];
    try {
      nextImage.src = next.image;
      await nextImage.decode();
      if (!canRotate()) return;
      hero.querySelector("canvas")?.classList.remove("is-ready");
      nextImage.classList.add("is-active");
      await new Promise((resolve) => setTimeout(resolve, 850));
      image.src = next.image;
      await image.decode();
      sceneIndex = index;
      caption.textContent = next.label;
      nextImage.classList.remove("is-active");
      changeTexture?.(next.image);
    } catch {
      /* The current original stays visible if another image cannot load. */
    } finally {
      changing = false;
      scheduleScene();
    }
  }
  toggle.addEventListener("click", () => {
    paused = !paused;
    scheduleScene();
  });
  document.addEventListener("visibilitychange", scheduleScene);
  document.addEventListener("aa:motion-change", scheduleScene);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        inView = entries[0].isIntersecting;
        scheduleScene();
      },
      { threshold: 0.05 },
    );
    observer.observe(hero);
  }
  addEventListener("pagehide", () => {
    pageActive = false;
    clearTimeout(sceneTimer);
  });
  addEventListener("pageshow", () => {
    pageActive = true;
    scheduleScene();
  });
  scheduleScene();
  let frame = 0,
    px = 0,
    py = 0;
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (!motionEnabled() || !fine.matches) return;
      const r = hero.getBoundingClientRect();
      px = (event.clientX - r.left) / r.width - 0.5;
      py = (event.clientY - r.top) / r.height - 0.5;
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          hero.style.setProperty("--character-x", `${px * 17}px`);
          hero.style.setProperty("--character-y", `${py * 10}px`);
          hero.style.setProperty("--scene-x", `${-px * 8}px`);
          hero.style.setProperty("--scene-y", `${-py * 5}px`);
        });
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", () => {
    px = py = 0;
    hero.style.setProperty("--character-x", "0px");
    hero.style.setProperty("--character-y", "0px");
  });
  // The original image is always present. WebGL only adds a subtle interactive lens.
  if (fine.matches && !connection?.saveData) {
    const start = async () => {
      let renderer: any,
        texture: any,
        material: any,
        geometry: any,
        resizeObserver: ResizeObserver | undefined,
        renderFrame = 0;
      try {
        const THREE = await import("three");
        const canvas = hero.querySelector<HTMLCanvasElement>(
          "[data-scene-canvas]",
        )!;
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: false,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.3));
        const scene = new THREE.Scene(),
          camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
          loader = new THREE.TextureLoader();
        const uniforms = {
          picture: { value: null },
          cover: { value: new THREE.Vector2(1, 1) },
          pointer: { value: new THREE.Vector2(0, 0) },
        };
        material = new THREE.ShaderMaterial({
          uniforms,
          vertexShader:
            "varying vec2 uvImage; void main(){uvImage=uv;gl_Position=vec4(position.xy,0.,1.);}",
          fragmentShader:
            "uniform sampler2D picture;uniform vec2 cover;uniform vec2 pointer;varying vec2 uvImage;void main(){vec2 p=(uvImage-.5)*cover+.5;vec2 d=uvImage-(pointer*.5+.5);float lens=exp(-dot(d,d)*9.);p+=pointer*.009+normalize(d+vec2(.001))*lens*length(pointer)*.004;gl_FragColor=texture2D(picture,clamp(p,.002,.998));gl_FragColor.rgb*=.8;\n#include <colorspace_fragment>\n}",
        });
        geometry = new THREE.PlaneGeometry(2, 2);
        scene.add(new THREE.Mesh(geometry, material));
        const render = () => {
          if (renderFrame || document.hidden || !motionEnabled()) return;
          renderFrame = requestAnimationFrame(() => {
            renderFrame = 0;
            uniforms.pointer.value.set(px, py);
            renderer.render(scene, camera);
          });
        };
        const resize = () => {
          const r = hero.getBoundingClientRect();
          renderer.setSize(r.width, r.height, false);
          const ratio = r.width / r.height,
            source = 1023 / 575;
          uniforms.cover.value.set(
            Math.min(1, ratio / source),
            Math.min(1, source / ratio),
          );
          render();
        };
        let version = 0;
        changeTexture = async (url) => {
          const ticket = ++version;
          try {
            const next = await loader.loadAsync(url);
            if (ticket !== version) {
              next.dispose();
              return;
            }
            next.colorSpace = THREE.SRGBColorSpace;
            texture?.dispose();
            texture = next;
            uniforms.picture.value = next;
            resize();
            canvas.classList.toggle("is-ready", motionEnabled());
          } catch {
            canvas.classList.remove("is-ready");
          }
        };
        changeTexture(image.src);
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(hero);
        hero.addEventListener("pointermove", render, { passive: true });
        hero.addEventListener("pointerleave", render);
        canvas.addEventListener("webglcontextlost", () =>
          canvas.classList.remove("is-ready"),
        );
        document.addEventListener("aa:motion-change", () => {
          canvas.classList.toggle("is-ready", motionEnabled() && !!texture);
          if (motionEnabled()) render();
        });
        addEventListener("pagehide", (event) => {
          if (event.persisted) return;
          cancelAnimationFrame(renderFrame);
          resizeObserver?.disconnect();
          texture?.dispose();
          material?.dispose();
          geometry?.dispose();
          renderer?.dispose();
          changeTexture = undefined;
        });
      } catch {
        renderer?.dispose();
      }
    };
    let started = false;
    const maybeStart = () => {
      if (!started && motionEnabled()) {
        started = true;
        start();
      }
    };
    document.addEventListener("aa:motion-change", maybeStart);
    if ("requestIdleCallback" in window)
      (window as any).requestIdleCallback(maybeStart, { timeout: 1600 });
    else setTimeout(maybeStart, 500);
  }
}

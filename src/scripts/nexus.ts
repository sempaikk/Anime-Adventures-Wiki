type FocusUnit = {
  id: string;
  name: string;
  image: string;
  rarity: string;
  href: string;
  cost: string;
  tower: string;
};
const hero = document.querySelector<HTMLElement>("[data-nexus-scene]");
if (hero) {
  const models = JSON.parse(hero.dataset.models || "[]") as FocusUnit[];
  const scenes = JSON.parse(hero.dataset.sceneFrames || "[]") as {
    label: string;
    image: string;
  }[];
  const stage = hero.querySelector<HTMLElement>("[data-stage]")!;
  const image = hero.querySelector<HTMLImageElement>("[data-stage-image]")!;
  const backdrop = hero.querySelector<HTMLImageElement>(
    "[data-nexus-backdrop]",
  )!;
  const nextBackdrop = hero.querySelector<HTMLImageElement>(
    "[data-nexus-backdrop-next]",
  )!;
  const label = hero.querySelector<HTMLElement>("[data-scene-label]")!;
  const toggle = hero.querySelector<HTMLButtonElement>("[data-scene-toggle]")!;
  const enabled = () => document.documentElement.dataset.motion === "on";
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  let modelIndex = 0,
    modelTicket = 0,
    sceneIndex = 0,
    timer = 0,
    paused = false,
    visible = true,
    pageActive = true,
    changing = false;
  const text = (selector: string, value: string) => {
    const target = hero.querySelector(selector);
    if (target) target.textContent = value;
  };
  async function select(index: number) {
    if (!models.length) return;
    const ticket = ++modelTicket;
    index = (index + models.length) % models.length;
    const unit = models[index];
    try {
      const preload = new Image();
      preload.src = unit.image;
      await preload.decode();
    } catch {
      /* The image element keeps a readable alternative if the source cannot load. */
    }
    if (ticket !== modelTicket) return;
    modelIndex = index;
    stage.classList.remove("is-changing");
    image.src = unit.image;
    image.alt = unit.name;
    text("[data-stage-name]", unit.name);
    text("[data-stage-rarity]", unit.rarity);
    text("[data-stage-tower]", unit.tower);
    text("[data-stage-cost]", unit.cost);
    text(
      "[data-model-position]",
      `${String(index + 1).padStart(2, "0")} / ${String(models.length).padStart(2, "0")}`,
    );
    hero
      .querySelectorAll<HTMLAnchorElement>(
        "[data-stage-link],[data-stage-article]",
      )
      .forEach((link) => {
        link.href = unit.href;
        link.setAttribute("aria-label", `Abrir artigo de ${unit.name}`);
      });
    const peek = hero.querySelector<HTMLButtonElement>("[data-stage-preview]")!;
    peek.dataset.unitPreview = unit.id;
    const compare = hero.querySelector<HTMLButtonElement>(
      "[data-stage-compare]",
    )!;
    compare.dataset.compare = unit.id;
    delete compare.dataset.compareLabel;
    compare.setAttribute("aria-label", `Comparar ${unit.name}`);
    hero
      .querySelectorAll<HTMLElement>("[data-model-pick]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.modelPick) === index),
        ),
      );
    document.dispatchEvent(new Event("aa:comparison-refresh"));
    if (enabled()) {
      void stage.offsetWidth;
      stage.classList.add("is-changing");
      setTimeout(() => {
        if (ticket === modelTicket) stage.classList.remove("is-changing");
      }, 650);
    }
    document.dispatchEvent(new CustomEvent("aa:scene-select"));
  }
  hero
    .querySelector("[data-model-prev]")
    ?.addEventListener("click", () => select(modelIndex - 1));
  hero
    .querySelector("[data-model-next]")
    ?.addEventListener("click", () => select(modelIndex + 1));
  hero
    .querySelectorAll<HTMLElement>("[data-model-pick]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        select(Number(button.dataset.modelPick)),
      ),
    );
  stage.addEventListener("keydown", (event) => {
    if (event.target !== stage) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      select(modelIndex + (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  function schedule() {
    clearTimeout(timer);
    toggle.hidden = !enabled() || !!connection?.saveData || scenes.length < 2;
    toggle.textContent = paused ? "Retomar cenário" : "Pausar cenário";
    toggle.setAttribute("aria-pressed", String(paused));
    if (
      !paused &&
      enabled() &&
      !connection?.saveData &&
      !document.hidden &&
      visible &&
      pageActive
    )
      timer = window.setTimeout(rotate, 9000);
  }
  async function rotate() {
    if (changing || !enabled() || !visible || document.hidden) return;
    changing = true;
    const next = (sceneIndex + 1) % scenes.length;
    try {
      nextBackdrop.src = scenes[next].image;
      await nextBackdrop.decode();
      if (!visible || !enabled() || document.hidden) return;
      nextBackdrop.classList.add("is-active");
      await new Promise((resolve) => setTimeout(resolve, 1150));
      backdrop.src = scenes[next].image;
      await backdrop.decode();
      nextBackdrop.classList.remove("is-active");
      sceneIndex = next;
      label.textContent = scenes[next].label;
    } catch {
      /* Preserve the current documented scene on a network failure. */
    } finally {
      changing = false;
      schedule();
    }
  }
  toggle.addEventListener("click", () => {
    paused = !paused;
    schedule();
  });
  let point = { x: 0, y: 0 },
    pointerFrame = 0;
  const fine = matchMedia("(hover:hover) and (pointer:fine)");
  stage.addEventListener(
    "pointermove",
    (event) => {
      if (!enabled() || !fine.matches) return;
      const r = stage.getBoundingClientRect();
      point = {
        x: Math.max(
          -0.5,
          Math.min(0.5, (event.clientX - r.left) / r.width - 0.5),
        ),
        y: Math.max(
          -0.5,
          Math.min(0.5, (event.clientY - r.top) / r.height - 0.5),
        ),
      };
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        stage.style.setProperty("--stage-x", `${point.x * 22}px`);
        stage.style.setProperty("--stage-lift", `${point.y * 12}px`);
        stage.style.setProperty("--stage-y", `${point.x * 8}deg`);
        hero.style.setProperty("--scene-x", `${-point.x * 12}px`);
        hero.style.setProperty("--scene-y", `${-point.y * 8}px`);
      });
    },
    { passive: true },
  );
  function resetPointer() {
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    point = { x: 0, y: 0 };
    stage.style.removeProperty("--stage-x");
    stage.style.removeProperty("--stage-lift");
    stage.style.removeProperty("--stage-y");
    hero.style.removeProperty("--scene-x");
    hero.style.removeProperty("--scene-y");
  }
  stage.addEventListener("pointerleave", resetPointer);
  fine.addEventListener("change", resetPointer);
  // A GPU grid gives the scene depth; the CSS floor remains available without WebGL.
  let gridController:
      | { resume: () => void; pause: () => void; dispose: () => void }
      | undefined,
    gridPending = false;
  async function prepareGrid() {
    if (
      gridPending ||
      gridController ||
      !enabled() ||
      connection?.saveData ||
      !visible
    )
      return;
    gridPending = true;
    try {
      const THREE = await import("three");
      if (!enabled() || !pageActive) return;
      const canvas =
        hero.querySelector<HTMLCanvasElement>("[data-nexus-grid]")!;
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      canvas.dataset.gpu = "ready";
      const scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
      camera.position.set(0, 3.5, 8);
      camera.lookAt(0, 0, -3);
      const geometry = new THREE.PlaneGeometry(30, 30, 1, 1);
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `varying vec2 vUv;uniform float uTime;void main(){vec2 p=vUv*30.;p.y+=uTime*.22;vec2 q=abs(fract(p-.5)-.5)/fwidth(p);float grid=1.-min(min(q.x,q.y),1.);float fade=smoothstep(0.,.3,vUv.y)*(1.-smoothstep(.45,1.,vUv.y));fade*=1.-smoothstep(.1,.52,abs(vUv.x-.5));float pulse=pow(max(0.,1.-abs(fract(vUv.y-uTime*.055)*2.-1.)),14.);vec3 color=mix(vec3(.13,.65,.67),vec3(.63,.42,1.),vUv.x);gl_FragColor=vec4(color,grid*fade*(.22+pulse*.5));}`,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -1.8;
      scene.add(mesh);
      let frame = 0,
        last = 0,
        active = false;
      function resize() {
        const r = stage.getBoundingClientRect();
        renderer.setSize(r.width, r.height, false);
        camera.aspect = r.width / Math.max(1, r.height);
        camera.updateProjectionMatrix();
      }
      const observer = new ResizeObserver(resize);
      observer.observe(stage);
      resize();
      function render(time: number) {
        if (!active) return;
        frame = requestAnimationFrame(render);
        if (time - last < 33) return;
        last = time;
        material.uniforms.uTime.value = time / 1000;
        camera.position.x = point.x * 0.7;
        camera.lookAt(point.x * 0.3, 0, -3);
        renderer.render(scene, camera);
      }
      gridController = {
        resume() {
          if (
            active ||
            !enabled() ||
            !visible ||
            document.hidden ||
            !pageActive
          )
            return;
          active = true;
          frame = requestAnimationFrame(render);
        },
        pause() {
          active = false;
          cancelAnimationFrame(frame);
        },
        dispose() {
          active = false;
          cancelAnimationFrame(frame);
          observer.disconnect();
          geometry.dispose();
          material.dispose();
          renderer.dispose();
        },
      };
      gridController.resume();
    } catch {
      /* The CSS perspective grid stays visible on unsupported devices. */
    } finally {
      gridPending = false;
    }
  }
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      schedule();
      if (visible) {
        prepareGrid();
        gridController?.resume();
      } else gridController?.pause();
    },
    { threshold: 0.05 },
  );
  observer.observe(hero);
  document.addEventListener("visibilitychange", () => {
    schedule();
    if (document.hidden) gridController?.pause();
    else gridController?.resume();
  });
  document.addEventListener("aa:motion-change", () => {
    resetPointer();
    schedule();
    if (enabled()) {
      prepareGrid();
      gridController?.resume();
    } else {
      gridController?.pause();
      stage.classList.remove("is-changing");
    }
  });
  addEventListener("pagehide", () => {
    pageActive = false;
    clearTimeout(timer);
    gridController?.pause();
  });
  addEventListener("pageshow", () => {
    pageActive = true;
    schedule();
    gridController?.resume();
  });
  schedule();
  prepareGrid();
}

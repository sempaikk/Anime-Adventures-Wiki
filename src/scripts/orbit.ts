const hero = document.querySelector<HTMLElement>("[data-orbit-hero]");
if (hero) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    fine = matchMedia("(pointer:fine)");
  const image = hero.querySelector<HTMLImageElement>(".hero-world-image")!;
  let changeTexture: ((url: string) => void) | undefined;
  for (const button of hero.querySelectorAll<HTMLButtonElement>("[data-scene]"))
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-pressed") === "true") return;
      for (const item of hero.querySelectorAll("[data-scene]"))
        item.setAttribute("aria-pressed", String(item === button));
      const next = button.dataset.sceneImage!;
      image.src = next;
      changeTexture?.(next);
    });
  let frame = 0,
    px = 0,
    py = 0;
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (reduced.matches || !fine.matches) return;
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
  const connection = (navigator as any).connection;
  // The original image is always present. WebGL only adds a subtle interactive lens.
  if (!reduced.matches && fine.matches && !connection?.saveData) {
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
          if (renderFrame || document.hidden || reduced.matches) return;
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
            canvas.classList.add("is-ready");
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
        reduced.addEventListener("change", () => {
          if (reduced.matches) canvas.classList.remove("is-ready");
          else render();
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
    if ("requestIdleCallback" in window)
      (window as any).requestIdleCallback(start, { timeout: 1600 });
    else setTimeout(start, 500);
  }
}

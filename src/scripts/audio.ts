// A small synthesized interface palette. No audio files, tracking or autoplay.
type Cue = "tap" | "open" | "select" | "welcome" | "hover";
const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
let soundOn = read("aa-sound") === "on";
let volume = Number(read("aa-sound-volume") ?? "25");
if (!Number.isFinite(volume)) volume = 25;
volume = Math.max(0, Math.min(100, volume));
let context: AudioContext | undefined,
  master: GainNode | undefined,
  lastCue = 0,
  lastHover = 0;
function persist() {
  try {
    localStorage.setItem("aa-sound", soundOn ? "on" : "off");
    localStorage.setItem("aa-sound-volume", String(volume));
  } catch {
    /* The current controls still work without persistent storage. */
  }
}
function sync() {
  document.documentElement.dataset.sound = soundOn ? "on" : "off";
  document
    .querySelectorAll<HTMLInputElement>("[data-sound-setting]")
    .forEach((input) => (input.checked = soundOn));
  document
    .querySelectorAll<HTMLElement>("[data-sound-toggle]")
    .forEach((button) => button.setAttribute("aria-pressed", String(soundOn)));
  document
    .querySelectorAll<HTMLElement>("[data-sound-label]")
    .forEach(
      (label) => (label.textContent = soundOn ? "Som ligado" : "Ativar som"),
    );
  document
    .querySelectorAll<HTMLInputElement>("[data-sound-volume]")
    .forEach((input) => (input.value = String(volume)));
  document
    .querySelectorAll<HTMLOutputElement>("[data-volume-label]")
    .forEach((output) => (output.value = `${volume}%`));
  if (context && master)
    master.gain.setTargetAtTime(
      soundOn && !document.hidden ? volume / 100 : 0,
      context.currentTime,
      0.035,
    );
}
async function ready() {
  if (!context) {
    context = new AudioContext({ latencyHint: "interactive" });
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
  }
  if (context.state === "suspended") await context.resume();
  return context;
}
function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  length: number,
  gain: number,
  type: OscillatorType = "sine",
  endFrequency?: number,
) {
  const oscillator = ctx.createOscillator(),
    envelope = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency)
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      start + length,
    );
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(envelope);
  envelope.connect(master!);
  oscillator.start(start);
  oscillator.stop(start + length + 0.02);
  oscillator.onended = () => {
    oscillator.disconnect();
    envelope.disconnect();
  };
}
function sweep(
  ctx: AudioContext,
  start: number,
  length: number,
  level: number,
) {
  const buffer = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * length),
    ctx.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index++)
    samples[index] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource(),
    filter = ctx.createBiquadFilter(),
    envelope = ctx.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.Q.value = 0.75;
  filter.frequency.setValueAtTime(420, start);
  filter.frequency.exponentialRampToValueAtTime(2600, start + length * 0.35);
  filter.frequency.exponentialRampToValueAtTime(700, start + length);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(level, start + 0.025);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(master!);
  source.start(start);
  source.stop(start + length);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    envelope.disconnect();
  };
}
async function play(cue: Cue, preview = false) {
  if ((!soundOn && !preview) || document.hidden || volume === 0) return;
  const now = performance.now();
  if (now - lastCue < 65 && cue !== "welcome") return;
  lastCue = now;
  if (!context && !navigator.userActivation?.isActive) return;
  try {
    const ctx = await ready();
    if (!soundOn && !preview) return;
    master!.gain.setTargetAtTime(volume / 100, ctx.currentTime, 0.012);
    const t = ctx.currentTime + 0.007;
    if (cue === "hover") tone(ctx, 740, t, 0.055, 0.018, "sine", 880);
    if (cue === "tap") {
      tone(ctx, 340, t, 0.075, 0.055, "triangle", 620);
      tone(ctx, 1240, t + 0.012, 0.06, 0.018);
    }
    if (cue === "select") {
      sweep(ctx, t, 0.24, 0.07);
      tone(ctx, 120, t, 0.12, 0.065, "sine", 65);
      tone(ctx, 440, t, 0.16, 0.05, "triangle", 660);
      tone(ctx, 880, t + 0.045, 0.2, 0.035);
      tone(ctx, 1320, t + 0.09, 0.13, 0.015);
    }
    if (cue === "open") {
      sweep(ctx, t, 0.28, 0.055);
      tone(ctx, 180, t, 0.23, 0.04, "triangle", 480);
      tone(ctx, 960, t + 0.055, 0.17, 0.025);
    }
    if (cue === "welcome") {
      sweep(ctx, t, 0.42, 0.065);
      for (const [i, f] of [330, 495, 660, 990].entries())
        tone(ctx, f, t + i * 0.075, 0.25, 0.035, i === 0 ? "triangle" : "sine");
    }
    if (preview && !soundOn)
      setTimeout(() => {
        if (master && context && !soundOn)
          master.gain.setTargetAtTime(0, context.currentTime, 0.05);
      }, 650);
  } catch {
    const toast = document.querySelector<HTMLElement>(".toast");
    if (toast) {
      toast.textContent = "Seu navegador não conseguiu iniciar o som.";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);
    }
  }
}
function choose(next: boolean) {
  soundOn = next;
  persist();
  sync();
  if (next) play("welcome");
  else
    setTimeout(() => {
      if (!soundOn) context?.suspend().catch(() => {});
    }, 120);
}
sync();
document
  .querySelectorAll<HTMLElement>("[data-sound-toggle]")
  .forEach((button) =>
    button.addEventListener("click", () => choose(!soundOn)),
  );
document
  .querySelectorAll<HTMLInputElement>("[data-sound-setting]")
  .forEach((input) =>
    input.addEventListener("change", () => choose(input.checked)),
  );
document
  .querySelectorAll<HTMLInputElement>("[data-sound-volume]")
  .forEach((input) => {
    input.addEventListener("input", () => {
      volume = Number(input.value);
      persist();
      sync();
    });
    input.addEventListener("change", () => play("tap"));
  });
document
  .querySelectorAll<HTMLElement>("[data-sound-preview]")
  .forEach((button) =>
    button.addEventListener("click", () => play("welcome", true)),
  );
document.addEventListener("click", (event) => {
  if (!event.isTrusted || !soundOn) return;
  const target = event.target instanceof Element ? event.target : null;
  if (
    !target ||
    target.closest(
      "[data-sound-toggle],[data-sound-preview],[data-sound-setting],.nexus-audio-settings,[data-model-prev],[data-model-next],[data-model-pick]",
    )
  )
    return;
  const control = target.closest("button,a,summary");
  if (!control || control.matches(":disabled")) return;
  play(
    control.matches("summary,[data-search-open],[data-unit-preview]")
      ? "open"
      : control.matches("a")
        ? "open"
        : "tap",
  );
});
let hoverTarget: Element | null = null;
document.addEventListener(
  "pointerover",
  (event) => {
    if (!soundOn || !context || event.pointerType !== "mouse") return;
    const target =
      event.target instanceof Element
        ? event.target.closest(
            ".nexus-destination,.nexus-topic-grid>a,.nexus-rail>a",
          )
        : null;
    if (target === hoverTarget) return;
    hoverTarget = target;
    if (target && performance.now() - lastHover > 220) {
      lastHover = performance.now();
      play("hover");
    }
  },
  { passive: true },
);
document.addEventListener("aa:scene-select", () => play("select"));
document.addEventListener("visibilitychange", () => {
  sync();
  if (document.hidden) context?.suspend().catch(() => {});
});
window.addEventListener("storage", (event) => {
  if (
    event.key !== "aa-sound" &&
    event.key !== "aa-sound-volume" &&
    event.key !== null
  )
    return;
  soundOn = read("aa-sound") === "on";
  const saved = Number(read("aa-sound-volume") ?? 25);
  volume = Number.isFinite(saved) ? Math.max(0, Math.min(100, saved)) : 25;
  sync();
});
window.addEventListener("pageshow", sync);

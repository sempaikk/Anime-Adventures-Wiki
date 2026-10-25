type Scene = {label:string;image:string};
const backdrop = document.querySelector<HTMLElement>('[data-game-backdrop]');
if (backdrop) {
  const scenes = JSON.parse(backdrop.dataset.sceneFrames || '[]') as Scene[];
  const layers = [...backdrop.querySelectorAll<HTMLImageElement>('.game-backdrop-pan img')];
  const label = document.querySelector<HTMLElement>('[data-scene-label]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-scene-toggle]');
  const root = document.documentElement;
  const connection = (navigator as Navigator & {connection?:EventTarget & {saveData?:boolean}}).connection;
  let index=0, active=0, timer=0, paused=false, changing=false, pageActive=true, version=0;
  try {paused=localStorage.getItem('aa-scene-paused')==='true'} catch {}
  const enabled=()=>root.dataset.motion==='on' && !connection?.saveData;
  const playing=()=>enabled() && !paused && !document.hidden && pageActive;
  layers[0]?.classList.add('is-active');
  if(label && scenes[0]) label.textContent=scenes[0].label;
  function sync() {
    clearTimeout(timer);
    root.dataset.scenePlaying=String(playing());
    if(toggle) {
      toggle.hidden=!enabled() || scenes.length<2;
      toggle.textContent=paused ? 'Retomar cenário' : 'Pausar cenário';
      toggle.setAttribute('aria-pressed',String(paused));
    }
    if(playing() && !changing && scenes.length>1) timer=window.setTimeout(rotate,14000);
  }
  async function rotate() {
    if(!playing() || changing) return;
    changing=true;
    const ticket=version, next=(index+1)%scenes.length, incoming=layers[1-active];
    try {
      incoming.src=scenes[next].image;
      await incoming.decode();
      if(ticket!==version || !playing()) return;
      incoming.classList.add('is-active');
      layers[active].classList.remove('is-active');
      index=next; active=1-active;
      if(label) label.textContent=scenes[index].label;
      // Only two decoded layers, even on long pages. Never preload the full library.
      await new Promise(resolve=>setTimeout(resolve,2600));
    } catch {
      // Leave the last loaded map in place if the next image is unavailable.
    } finally {changing=false;sync()}
  }
  toggle?.addEventListener('click',()=>{
    paused=!paused;version++;
    try {localStorage.setItem('aa-scene-paused',String(paused))} catch {}
    sync();
  });
  document.addEventListener('aa:motion-change',()=>{version++;sync()});
  document.addEventListener('visibilitychange',()=>{version++;sync()});
  connection?.addEventListener('change',()=>{version++;sync()});
  addEventListener('pagehide',()=>{pageActive=false;version++;sync()});
  addEventListener('pageshow',()=>{pageActive=true;sync()});
  sync();
}

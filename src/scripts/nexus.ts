import {localPath} from './i18n';
type FocusUnit = {id:string;name:string;image:string;rarity:string;href:string;cost:string;tower:string};
const hero=document.querySelector<HTMLElement>('[data-nexus-scene]');
if(hero) {
  const models=JSON.parse(hero.dataset.models || '[]') as FocusUnit[];
  const stage=hero.querySelector<HTMLElement>('[data-stage]')!;
  const image=hero.querySelector<HTMLImageElement>('[data-stage-image]')!;
  const portrait=hero.querySelector<HTMLElement>('[data-stage-portrait]')!;
  const enabled=()=>document.documentElement.dataset.motion==='on';
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  let modelIndex=0, requestedIndex=0, ticket=0, pointerFrame=0;
  const transitions=new Set<Animation>();
  function clearTransition() {
    for(const animation of transitions) animation.cancel();
    transitions.clear();
    portrait.querySelectorAll('[data-portrait-outgoing]').forEach(node=>node.remove());
  }
  const text=(selector:string,value:string)=>{const target=hero.querySelector(selector);if(target)target.textContent=value};
  async function select(index:number) {
    if(!models.length) return;
    requestedIndex=(index+models.length)%models.length;
    const currentTicket=++ticket, selectedIndex=requestedIndex, unit=models[selectedIndex];
    try { const preload=new Image();preload.src=unit.image;await preload.decode() } catch { return }
    if(currentTicket!==ticket || selectedIndex===modelIndex) return;
    clearTransition();
    const outgoing=image.cloneNode() as HTMLImageElement;
    outgoing.removeAttribute('data-stage-image');outgoing.setAttribute('data-portrait-outgoing','');
    outgoing.alt='';outgoing.setAttribute('aria-hidden','true');
    image.src=unit.image;image.alt=unit.name;modelIndex=selectedIndex;
    text('[data-stage-name]',unit.name);text('[data-stage-rarity]',unit.rarity);
    text('[data-stage-tower]',unit.tower);text('[data-stage-cost]',unit.cost);
    const article=hero.querySelector<HTMLAnchorElement>('[data-stage-article]')!;
    article.href=localPath(unit.href);article.setAttribute('aria-label',`Abrir artigo de ${unit.name}`);
    const peek=hero.querySelector<HTMLButtonElement>('[data-stage-preview]')!;
    peek.dataset.unitPreview=unit.id;peek.setAttribute('aria-label',`Abrir ficha rápida de ${unit.name}`);
    const compare=hero.querySelector<HTMLButtonElement>('[data-stage-compare]')!;
    compare.dataset.compare=unit.id;delete compare.dataset.compareLabel;compare.setAttribute('aria-label',`Comparar ${unit.name}`);
    hero.querySelectorAll<HTMLElement>('[data-model-pick]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.modelPick)===selectedIndex)));
    document.dispatchEvent(new Event('aa:comparison-refresh'));
    document.dispatchEvent(new CustomEvent('aa:scene-select'));
    if(enabled()) {
      portrait.append(outgoing);
      const options={duration:900,easing:'cubic-bezier(.22,.65,.25,1)'};
      const leaving=outgoing.animate([{opacity:1,translate:'0 0'},{opacity:0,translate:'-18px 4px'}],options);
      const entering=image.animate([{opacity:0,translate:'20px 5px'},{opacity:1,translate:'0 0'}],options);
      for(const animation of [leaving,entering]) {
        transitions.add(animation);
        animation.finished.catch(()=>{}).finally(()=>{transitions.delete(animation);if(animation===leaving)outgoing.remove()});
      }
    }
  }
  hero.querySelector('[data-model-prev]')?.addEventListener('click',()=>select(requestedIndex-1));
  hero.querySelector('[data-model-next]')?.addEventListener('click',()=>select(requestedIndex+1));
  hero.querySelectorAll<HTMLElement>('[data-model-pick]').forEach(button=>button.addEventListener('click',()=>select(Number(button.dataset.modelPick))));
  stage.addEventListener('keydown',event=>{
    if(event.target!==stage || !['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();select(requestedIndex+(event.key==='ArrowRight'?1:-1));
  });
  stage.addEventListener('pointermove',event=>{
    if(!enabled() || !fine.matches || pointerFrame) return;
    const rect=stage.getBoundingClientRect();
    const x=Math.max(-.5,Math.min(.5,(event.clientX-rect.left)/rect.width-.5));
    const y=Math.max(-.5,Math.min(.5,(event.clientY-rect.top)/rect.height-.5));
    pointerFrame=requestAnimationFrame(()=>{
      pointerFrame=0;
      stage.style.setProperty('--stage-x',`${x*16}px`);
      stage.style.setProperty('--stage-lift',`${y*10}px`);
      stage.style.setProperty('--stage-y',`${x*5}deg`);
    });
  },{passive:true});
  function resetPointer() {
    cancelAnimationFrame(pointerFrame);pointerFrame=0;
    for(const variable of ['--stage-x','--stage-lift','--stage-y'])stage.style.removeProperty(variable);
  }
  stage.addEventListener('pointerleave',resetPointer);fine.addEventListener('change',resetPointer);
  document.addEventListener('aa:motion-change',()=>{clearTransition();resetPointer()});
  addEventListener('pagehide',()=>{clearTransition();resetPointer()});
}

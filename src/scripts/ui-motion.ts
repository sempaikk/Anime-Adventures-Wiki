// Shared, interruptible motion. Native links, dialogs and controls keep their semantics.
export const motionOn = () => document.documentElement.dataset.motion === 'on' && !document.hidden;
const ease = 'cubic-bezier(.18,.72,.22,1)';
const live = new Set<Animation>();
export function animateUI(element: Element, frames: Keyframe[], options: KeyframeAnimationOptions = {}) {
  if (!motionOn() || !element.isConnected) return undefined;
  const animation = element.animate(frames, {duration:620,easing:ease,fill:'backwards',...options});
  live.add(animation);
  animation.finished.catch(()=>{}).finally(()=>live.delete(animation));
  return animation;
}
export function cue(name:string) { document.dispatchEvent(new CustomEvent('aa:ui-cue',{detail:name})); }
export function respond(element:Element|null, kind:'press'|'success'='press') {
  if(!element) return;
  if(motionOn()&&element instanceof HTMLElement&&element.matches('button,.button,.side-link,.square-button')){
    element.classList.add('motion-control');if(getComputedStyle(element).position==='static')element.classList.add('motion-control-static');element.querySelectorAll(':scope>.motion-impulse').forEach(n=>{n.getAnimations().forEach(a=>a.cancel());n.remove()});
    const light=document.createElement('span');light.className='motion-impulse';light.setAttribute('aria-hidden','true');element.append(light);
    const flash=animateUI(light,[{translate:'-110% 0',opacity:0},{translate:'0 0',opacity:.6,offset:.45},{translate:'110% 0',opacity:0}],{duration:620});
    if(flash)flash.finished.catch(()=>{}).finally(()=>light.remove());else light.remove();
  }
  animateUI(element, kind==='success' ? [{scale:'1'},{scale:'1.045',offset:.4},{scale:'1'}] : [{scale:'1'},{scale:'.965',offset:.32},{scale:'1'}], {duration:kind==='success'?520:320});
}
const dialogs = new WeakMap<HTMLDialogElement,{ticket:number;closing:boolean;animation?:Animation}>();
export function closeDialog(dialog:HTMLDialogElement|null, returnValue?:string) {
  if(!dialog?.open) return;
  let state=dialogs.get(dialog);
  if(!state){state={ticket:0,closing:false};dialogs.set(dialog,state)}
  if(state.closing) return;
  state.closing=true;cue('close');
  const ticket=++state.ticket;
  state.animation?.cancel();
  dialog.dataset.motionClosing='';
  const finish=()=>{
    if(dialogs.get(dialog)?.ticket!==ticket)return;
    delete dialog.dataset.motionClosing;
    state!.closing=false;
    if(returnValue===undefined)dialog.close();else dialog.close(returnValue);
  };
  state.animation=animateUI(dialog,[{opacity:1,translate:'0 0',scale:'1'},{opacity:0,translate:'0 18px',scale:'.975'}],{duration:230,fill:'forwards'});
  if(state.animation)state.animation.finished.then(finish,finish);else finish();
}
export function showDialog(dialog:HTMLDialogElement) {
  if(dialog.open)enterDialog(dialog);else dialog.showModal();
}
export function enterDialog(dialog:HTMLDialogElement) {
  const previous=dialogs.get(dialog);previous?.animation?.cancel();
  const state={ticket:(previous?.ticket||0)+1,closing:false,animation:undefined as Animation|undefined};dialogs.set(dialog,state);
  delete dialog.dataset.motionClosing;
  state.animation=animateUI(dialog,[{opacity:0,clipPath:'inset(12% 8% round 30px)'},{opacity:1,clipPath:'inset(0 round 26px)'}],{duration:680});
  const children=dialog.querySelectorAll('.search-head,.search-foot,.preview-copy>*,.picker-results,.confirm-actions');
  children.forEach((child,index)=>animateUI(child,[{opacity:0,translate:'0 18px'},{opacity:1,translate:'0 0'}],{duration:650,delay:Math.min(index*65,280)}));
}
const within=(r:DOMRect)=>r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;
const layouts = new WeakMap<HTMLElement,{animations:Animation[];ghosts:HTMLElement[];ticket:number}>();
export function arrange(container:HTMLElement, update:()=>void, enabled=true) {
  const old=layouts.get(container), ticket=(old?.ticket||0)+1;
  const before=new Map<HTMLElement,DOMRect>();
  if(enabled&&motionOn())for(const child of container.children){if(!(child instanceof HTMLElement)||child.hidden)continue;const r=child.getBoundingClientRect();if(within(r))before.set(child,r)}
  old?.animations.forEach(a=>a.cancel());old?.ghosts.forEach(g=>g.remove());
  const state={animations:[] as Animation[],ghosts:[] as HTMLElement[],ticket};layouts.set(container,state);
  update();
  if(!enabled||!motionOn())return;
  container.dataset.reflowing='';
  const after=new Map<HTMLElement,DOMRect>();
  for(const child of container.children){if(!(child instanceof HTMLElement)||child.hidden)continue;const r=child.getBoundingClientRect();if(within(r))after.set(child,r)}
  for(const [child,r] of before)if(!after.has(child)&&child.hidden){
    const ghost=child.cloneNode(true) as HTMLElement;
    ghost.hidden=false;ghost.removeAttribute('id');ghost.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));ghost.inert=true;
    ghost.classList.add('motion-departure');ghost.setAttribute('aria-hidden','true');
    Object.assign(ghost.style,{position:'fixed',left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`,margin:'0',zIndex:'120',pointerEvents:'none'});
    document.body.append(ghost);state.ghosts.push(ghost);
    const a=animateUI(ghost,[{opacity:.7,scale:'1'},{opacity:0,scale:'.92',translate:'0 14px'}],{duration:240});
    if(a){state.animations.push(a);a.finished.catch(()=>{}).finally(()=>ghost.remove())}else ghost.remove();
  }
  let index=0;
  for(const [child,r] of after){
    const prior=before.get(child);
    const a=prior ? animateUI(child,[{translate:`${prior.left-r.left}px ${prior.top-r.top}px`},{translate:'0 0'}],{duration:680}) : animateUI(child,[{opacity:0,translate:'0 30px',scale:'.94'},{opacity:1,translate:'0 0',scale:'1'}],{duration:760,delay:Math.min(index++*45,225)});
    if(a)state.animations.push(a);
  }
  Promise.allSettled(state.animations.map(a=>a.finished)).then(()=>{if(layouts.get(container)?.ticket===ticket){delete container.dataset.reflowing;state.ghosts.forEach(g=>g.remove())}});
}
export function portraitFlight(source:HTMLImageElement|null,target:HTMLImageElement) {
  if(!source||!motionOn()||source.hidden||target.hidden)return;
  document.querySelectorAll('.motion-portrait-flight').forEach(n=>{n.getAnimations().forEach(a=>a.cancel());n.remove()});
  const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
  if(!within(a)||!within(b)||!target.complete)return;
  const sourceStyle=getComputedStyle(source),targetStyle=getComputedStyle(target);
  let ratio=(source.naturalWidth||target.naturalWidth||1)/(source.naturalHeight||target.naturalHeight||1);
  const inset=sourceStyle.getPropertyValue('object-view-box').match(/^inset\(([%\d.\s]+)\)$/);
  if(inset){const n=inset[1].trim().split(/\s+/).map(parseFloat),[top,right,bottom,left]=n.length===4?n:n.length===3?[n[0],n[1],n[2],n[1]]:n.length===2?[n[0],n[1],n[0],n[1]]:[n[0],n[0],n[0],n[0]];ratio*=Math.max(.001,100-left-right)/Math.max(.001,100-top-bottom)}
  const placement=(rect:DOMRect,style:CSSStyleDeclaration)=>{
    const width=Math.min(rect.width,rect.height*ratio),height=width/ratio;
    const p=style.objectPosition.split(' ').map(v=>v.endsWith('%')?parseFloat(v)/100:v==='left'||v==='top'?0:v==='right'||v==='bottom'?1:.5);
    return {x:rect.left+(rect.width-width)*(p[0]??.5)+width/2,y:rect.top+(rect.height-height)*(p[1]??.5)+height/2,width};
  };
  const from=placement(a,sourceStyle),to=placement(b,targetStyle),scale=to.width/from.width;
  const ghost=source.cloneNode(false) as HTMLImageElement;
  ghost.removeAttribute('id');ghost.removeAttribute('data-stage-image');ghost.alt='';ghost.setAttribute('aria-hidden','true');ghost.className='motion-portrait-flight';
  Object.assign(ghost.style,{position:'fixed',left:`${a.left}px`,top:`${a.top}px`,width:`${a.width}px`,height:`${a.height}px`,objectFit:'contain',objectPosition:sourceStyle.objectPosition,transform:'none',zIndex:'2147483000',pointerEvents:'none'});
  ghost.style.setProperty('object-view-box',getComputedStyle(source).getPropertyValue('object-view-box'));
  Object.assign(ghost.style,{inset:'auto',left:`${a.left}px`,top:`${a.top}px`,margin:'0',padding:'0',border:'0',background:'transparent',transformOrigin:`${from.x-a.left}px ${from.y-a.top}px`});
  if(!('showPopover' in ghost))return;
  ghost.popover='manual';document.body.append(ghost);ghost.showPopover();
  const animation=animateUI(ghost,[{opacity:.85,translate:'0 0',scale:'1'},{opacity:0,translate:`${to.x-from.x}px ${to.y-from.y}px`,scale:String(scale)}],{duration:750});
  animateUI(target,[{opacity:0,scale:'.92'},{opacity:1,scale:'1'}],{duration:850,delay:120});
  const cleanup=()=>{animation?.cancel();ghost.remove()};
  target.closest('dialog')?.addEventListener('close',cleanup,{once:true});
  if(animation)animation.finished.catch(()=>{}).finally(()=>{ghost.remove();target.closest('dialog')?.removeEventListener('close',cleanup)});else cleanup();
}
function settleMotion() {
  if(document.documentElement.dataset.motion==='off')for(const animation of live)animation.finish();
}
document.addEventListener('aa:motion-change',settleMotion);
document.addEventListener('visibilitychange',()=>{
  for(const animation of live){if(document.hidden)animation.pause();else if(document.documentElement.dataset.motion==='on')animation.play();else animation.finish()}
});
addEventListener('pagehide',()=>{for(const a of live)a.cancel();document.querySelectorAll('.motion-departure,.motion-portrait-flight').forEach(n=>n.remove())});

export function moveMenu(side:HTMLElement, open:boolean) {
  const animations:Animation[]=[];
  const a=animateUI(side,open ? [{opacity:0,translate:'26px -10px',scale:'.96'},{opacity:1,translate:'0 0',scale:'1'}] : [{opacity:1,translate:'0 0',scale:'1'},{opacity:0,translate:'20px -6px',scale:'.975'}],{duration:open?650:240,fill:open?'none':'forwards'});
  if(a)animations.push(a);
  if(open)for(const [i,link] of [...side.querySelectorAll('.nav-label,.side-link,.side-section>summary,.sidebar-bottom')].entries()) {
    const child=animateUI(link,[{opacity:0,translate:'18px 0'},{opacity:1,translate:'0 0'}],{duration:550,delay:Math.min(i*22,330)});if(child)animations.push(child);
  }
  return Promise.allSettled(animations.map(a=>a.finished));
}

export function favoriteLabel(button:HTMLElement,active:boolean,full=false) {
  const icon=document.createElement('span');icon.className='ui-emoji';icon.setAttribute('aria-hidden','true');icon.textContent=active?'✅':'❤️';
  button.replaceChildren(icon,document.createTextNode(full?(active?' Salvo nos favoritos':' Salvar nos favoritos'):(active?' Salvo':' Salvar')));
}

export function revealKeyboardFocus(target:HTMLElement) {
  if(!target.matches(':focus-visible'))return;
  for(let node:HTMLElement|null=target;node&&node!==document.body;node=node.parentElement){
    if(node.hasAttribute('data-motion-closing'))continue;
    for(const animation of node.getAnimations())if(live.has(animation))animation.finish();
  }
}

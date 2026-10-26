import {animateUI,enterDialog,closeDialog,respond,motionOn,revealKeyboardFocus} from './ui-motion';
const boundTabs=new WeakSet<HTMLElement>();
const tabResize=new ResizeObserver(entries=>{for(const entry of entries){const group=entry.target.closest<HTMLElement>('.motion-tabs');if(group)positionSelection(group)}});
function positionSelection(group:HTMLElement) {
  const button=group.querySelector<HTMLElement>('button[aria-selected="true"],button[aria-pressed="true"]');
  if(!button)return;
  group.style.setProperty('--selection-x',`${button.offsetLeft}px`);group.style.setProperty('--selection-y',`${button.offsetTop}px`);
  group.style.setProperty('--selection-width',`${button.offsetWidth}px`);group.style.setProperty('--selection-height',`${button.offsetHeight}px`);
}
const panels=new WeakMap<HTMLElement,{animation?:Animation;time:number}>();
function enterPanel(panel:HTMLElement) {
  if(panel.hidden||!panel.getClientRects().length)return;
  const previous=panels.get(panel),now=performance.now();if(previous&&now-previous.time<60)return;
  previous?.animation?.cancel();
  panels.set(panel,{time:now,animation:animateUI(panel,panel.matches('tr')?[{opacity:0},{opacity:1}]:[{opacity:0,translate:'0 18px'},{opacity:1,translate:'0 0'}],{duration:panel.matches('tr')?400:650})});
}
function scan(root:ParentNode) {
  const selector='[role=tablist],.library-categories,.wiki-top-links';
  const groups=[...(root instanceof HTMLElement&&root.matches(selector)?[root]:[]),...root.querySelectorAll<HTMLElement>(selector)];
  for(const group of groups) {
    if(boundTabs.has(group))continue;boundTabs.add(group);
    // The global header already has its own active-page treatment.
    if(!group.matches('.wiki-top-links')){
      group.classList.add('motion-tabs');const indicator=document.createElement('span');indicator.className='motion-selection';indicator.setAttribute('aria-hidden','true');group.prepend(indicator);
      positionSelection(group);tabResize.observe(group);group.querySelectorAll("button").forEach(button=>tabResize.observe(button));
    }
  }
}
scan(document);
let statusTimer=0;const pendingStatuses=new Set<HTMLElement>();
const observer=new MutationObserver(records=>{
  for(const record of records){
    const target=record.target instanceof HTMLElement?record.target:record.target.parentElement;
    if(!target||target.closest('.motion-departure,.motion-portrait-flight'))continue;
    if(record.type==='attributes'){
      if(record.attributeName==='open'&&target instanceof HTMLDialogElement&&target.open)enterDialog(target);
      if(record.attributeName==='open'&&target instanceof HTMLDetailsElement&&target.open){
        for(const [i,child] of [...target.children].filter(c=>c.tagName!=='SUMMARY').entries())animateUI(child,[{opacity:0,translate:'0 -9px'},{opacity:1,translate:'0 0'}],{duration:520,delay:i*45});
      }
      if(record.attributeName==='hidden'&&!target.hidden&&!target.closest('[data-reflowing]')&&!target.matches('img,[role=status],.toast,.community-status,.tool-message,.profile-save-status'))enterPanel(target);
      if(record.attributeName==='aria-selected'||record.attributeName==='aria-pressed'){
        const group=target.closest<HTMLElement>('.motion-tabs');if(group)positionSelection(group);
        if(record.oldValue!==null&&record.oldValue!==target.getAttribute(record.attributeName)&&target.matches('button[aria-pressed="true"]'))respond(target,'success');
      }
      if(record.attributeName==='aria-busy'||record.attributeName==='disabled'){
        target.toggleAttribute('data-motion-busy',target.getAttribute('aria-busy')==='true'||(target.matches('button:disabled')&&!!target.closest('form,.preview-actions,.unit-card-actions')));
      }
    }
    if(record.type==='childList')for(const added of record.addedNodes)if(added instanceof HTMLElement&&!added.matches('.motion-selection')){
      scan(added);
      if(added.matches('.search-result,.picker-unit,.comparison-tray-item,.comment'))animateUI(added,[{opacity:0,translate:'18px 0'},{opacity:1,translate:'0 0'}],{duration:650,delay:Math.min([...added.parentElement!.children].indexOf(added)*45,220)});
    }
    const status=target.closest<HTMLElement>('.toast,[role=status],.community-status,.tool-message,.profile-save-status');
    if(status&&status.textContent?.trim()&&status.getClientRects().length)pendingStatuses.add(status);
  }
  if(pendingStatuses.size){clearTimeout(statusTimer);statusTimer=window.setTimeout(()=>{for(const status of pendingStatuses){animateUI(status,[{opacity:.25,translate:'0 9px'},{opacity:1,translate:'0 0'}],{duration:480})}pendingStatuses.clear()},45)}
});
observer.observe(document.body,{attributes:true,attributeFilter:['open','hidden','aria-selected','aria-pressed','aria-busy','disabled','class'],attributeOldValue:true,childList:true,characterData:true,subtree:true});
document.addEventListener('cancel',event=>{
  if(event.target instanceof HTMLDialogElement&&event.target.getAttribute('aria-busy')==='true'){event.preventDefault();return}
  if(event.target instanceof HTMLDialogElement&&motionOn()){event.preventDefault();closeDialog(event.target)}
},true);
document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target.closest<HTMLElement>('button,a,summary'):null;
  if(!target||target.matches(':disabled')||target.closest('.motion-departure'))return;
  if(event.detail===0)respond(target);
  if(target.matches('[role=tab]')){const id=target.getAttribute('aria-controls'),panel=id?document.getElementById(id):null;if(panel)enterPanel(panel)}
});
document.addEventListener('focusin',event=>{
  const target=event.target;
  if(target instanceof HTMLElement)revealKeyboardFocus(target);
  if(target instanceof HTMLElement&&target.matches('input:not([type=checkbox]):not([type=range]),textarea,select'))animateUI(target,[{boxShadow:'0 0 0 0 transparent'},{boxShadow:'0 0 0 4px color-mix(in srgb,var(--accent) 24%,transparent)',offset:.45},{boxShadow:'0 0 0 2px color-mix(in srgb,var(--accent) 15%,transparent)'}],{duration:650});
});

document.addEventListener('pointerdown',event=>{const target=event.target instanceof Element?event.target.closest<HTMLElement>('button,.button,.side-link,summary'):null;if(target&&!target.matches(':disabled'))respond(target)},{passive:true});

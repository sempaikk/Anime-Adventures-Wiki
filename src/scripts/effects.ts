import './ui-interactions';
import {animateUI,motionOn} from './ui-motion';
const surfaces='.unit-entry,.library-card,.orbit-portal,.person-card,.comparison-slot,.community-channel,.nexus-stage-wrap,.nexus-destination,.nexus-topic-grid>a';
const reveals=surfaces+',.nexus-intro,.catalog-heading,.classic-article-heading,.filter-panel,.nexus-section-heading,.nexus-tools,.nexus-source,.section-heading,.original-infobox,.reading-index,.related-forms,.source-details,.wiki-content>:is(p,ul,ol,blockquote,figure),.wiki-content .article-section>:is(p,ul,ol,blockquote,figure),.wiki-content>h2,.wiki-content>h3,.account-panel,.profile-settings,.people-search,.site-footer,.comment,.public-profile-header';
const watched=new WeakSet<Element>();
const states=new WeakMap<Element,{armed:boolean;timer:number;animation?:Animation}>();
const visibility=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.toggleAttribute('data-effect-visible',entry.isIntersecting)},{rootMargin:'80px'});
const reveal=new IntersectionObserver(entries=>{
  let order=0;
  for(const entry of entries){
    const state=states.get(entry.target)!;clearTimeout(state.timer);
    if(!entry.isIntersecting){
      state.timer=window.setTimeout(async()=>{
        const animation=state.animation;
        if(animation)try{await animation.finished}catch{}
        if(state.animation!==animation)return;
        const r=entry.target.getBoundingClientRect();if(r.bottom<=0||r.top>=innerHeight||!r.width)state.armed=true;
      },300);continue;
    }
    if(!state.armed||!motionOn())continue;
    state.armed=false;
    if(entry.target.closest('[data-reflowing]')||entry.target.contains(document.activeElement))continue;
    state.animation?.cancel();
    const above=entry.boundingClientRect.top<0,reading=!!entry.target.closest('.wiki-content');
    state.animation=animateUI(entry.target,[{opacity:0,translate:`0 ${above?(reading?'-12':'-22'):(reading?'14':'32')}px`,scale:reading?'1':'.975'},{opacity:1,translate:'0 0',scale:'1'}],{duration:reading?650:900,delay:Math.min(order++*65,260)});
  }
},{threshold:.06});
function observe(root:ParentNode){
 const nodes=[...(root instanceof Element&&root.matches(reveals)?[root]:[]),...root.querySelectorAll(reveals)];
 for(const node of nodes){if(watched.has(node))continue;watched.add(node);states.set(node,{armed:true,timer:0});reveal.observe(node);if(node.matches(surfaces))visibility.observe(node)}
}
observe(document);
new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node instanceof HTMLElement)observe(node)}).observe(document.getElementById('main')!,{childList:true,subtree:true});
function pageVisibility(){document.documentElement.dataset.pageHidden=String(document.hidden)}
document.addEventListener('visibilitychange',pageVisibility);pageVisibility();
let frame=0;
function readingProgress(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const distance=document.documentElement.scrollHeight-innerHeight;document.documentElement.style.setProperty('--reading-progress',String(distance>0?Math.max(0,Math.min(1,scrollY/distance)):0))})}
addEventListener('scroll',readingProgress,{passive:true});addEventListener('resize',readingProgress,{passive:true});addEventListener('pageshow',readingProgress);
new ResizeObserver(readingProgress).observe(document.body);readingProgress();

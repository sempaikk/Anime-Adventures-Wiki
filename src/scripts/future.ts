const motion=()=>document.documentElement.dataset.motion==='on'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero=document.querySelector<HTMLElement>('[data-future-hero]');
if(hero){
  if('IntersectionObserver'in window){const visible=new IntersectionObserver(entries=>{hero.classList.toggle('future-paused',!entries[0].isIntersecting||document.hidden)});visible.observe(hero);document.addEventListener('visibilitychange',()=>hero.classList.toggle('future-paused',document.hidden||hero.getBoundingClientRect().bottom<0));addEventListener('pagehide',()=>visible.disconnect(),{once:true})}
  let frame=0;
  hero.addEventListener('pointermove',event=>{
    if(!motion()||!matchMedia('(pointer:fine)').matches||frame)return;
    frame=requestAnimationFrame(()=>{
      const bounds=hero.getBoundingClientRect();
      hero.style.setProperty('--hero-x',`${((event.clientX-bounds.left)/bounds.width-.5)*14}px`);
      hero.style.setProperty('--hero-y',`${((event.clientY-bounds.top)/bounds.height-.5)*10}px`);frame=0;
    });
  },{passive:true});
  const reset=()=>{cancelAnimationFrame(frame);frame=0;hero.style.removeProperty('--hero-x');hero.style.removeProperty('--hero-y')};
  hero.addEventListener('pointerleave',reset);document.addEventListener('aa:motion-change',reset);addEventListener('pagehide',reset);
}
const targets=document.querySelectorAll<HTMLElement>('.future-destination,.future-section-heading,.future-collection');
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){
    if(entry.isIntersecting&&motion()){
      entry.target.animate([{opacity:.35,translate:'0 22px'},{opacity:1,translate:'0 0'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});
      observer.unobserve(entry.target);
    }
  }},{threshold:.12});targets.forEach(node=>observer.observe(node));
  addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}

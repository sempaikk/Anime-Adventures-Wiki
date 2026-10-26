import {localPath} from './i18n';
import {icon} from '../lib/icons';
import {t} from './i18n';
import {showDialog,closeDialog,motionOn} from './ui-motion';
// Shared-element names belong to one exact-form portrait at a time.
const incomingKey='aa-navigation-art';
const sourceImage=(anchor:HTMLAnchorElement)=>anchor.querySelector<HTMLImageElement>('.unit-art img,.library-thumbnail img,.comparison-lineup img,.related-forms img');
document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||!motionOn())return;
  const anchor=(event.target as Element)?.closest<HTMLAnchorElement>('a[href]');
  if(!anchor||anchor.target||anchor.hasAttribute('download'))return;
  const url=new URL(anchor.href),image=sourceImage(anchor);
  if(url.origin!==location.origin||!image)return;
  try{sessionStorage.setItem(incomingKey,JSON.stringify({src:image.getAttribute('src'),path:url.pathname,at:Date.now()}));image.style.viewTransitionName='unit-portrait';}catch{}
});
addEventListener('pagereveal',(event:Event)=>{
  try{
    const saved=JSON.parse(sessionStorage.getItem(incomingKey)||'null');sessionStorage.removeItem(incomingKey);
    if(!motionOn()||!saved||saved.path!==location.pathname||Date.now()-saved.at>15000)return;
    const image=[...document.querySelectorAll<HTMLImageElement>('.article-aside img')].find(image=>image.getAttribute('src')===saved.src);
    if(!image)return;image.style.viewTransitionName='unit-portrait';
    (event as Event&{viewTransition?:{finished:Promise<void>}}).viewTransition?.finished.finally(()=>{image.style.viewTransitionName=''}).catch(()=>{});
  }catch{}
});
addEventListener('pageshow',event=>{if(!event.persisted)return;for(const image of document.querySelectorAll<HTMLImageElement>('[style*="view-transition-name"]'))image.style.viewTransitionName=''});
// Photo zoom is user initiated and never changes the original file.
let viewer:HTMLDialogElement|undefined,returnFocus:HTMLElement|undefined;
document.addEventListener('click',event=>{
  const target=event.target as Element;
  if(!target.matches('img.post-photo,img.comment-image'))return;
  const image=target as HTMLImageElement;returnFocus=image;
  if(!viewer){
    viewer=document.createElement('dialog');viewer.className='photo-viewer';viewer.setAttribute('aria-label',t('Foto da publicação'));
    const close=document.createElement('button');close.type='button';close.className='square-button';close.setAttribute('aria-label',t('Fechar foto'));close.append(icon('close'));
    const full=document.createElement('img');viewer.append(close,full);document.body.append(viewer);
    close.addEventListener('click',()=>closeDialog(viewer!));viewer.addEventListener('click',event=>{if(event.target===viewer)closeDialog(viewer!)});
    viewer.addEventListener('close',()=>{returnFocus?.focus({preventScroll:true});viewer!.querySelector('img')!.removeAttribute('src')});
  }
  const full=viewer.querySelector('img')!;full.src=image.src;full.alt=image.alt;showDialog(viewer);
});
const photos=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node instanceof Element){for(const image of [node,...node.querySelectorAll('img.post-photo,img.comment-image')])if(image.matches('img.post-photo,img.comment-image')){image.setAttribute('tabindex','0');image.setAttribute('role','button');image.setAttribute('aria-label',t('Abrir foto'));}}});
photos.observe(document.body,{childList:true,subtree:true});
document.addEventListener('keydown',event=>{const target=event.target as Element;if((event.key==='Enter'||event.key===' ')&&target.matches('img.post-photo,img.comment-image')){event.preventDefault();(target as HTMLElement).click()}});

// Only public article identities, never profile, account or search data.
const recentKey='aa-recent-articles';
type Recent={title:string;path:string;at:number};
try{
 let recent:Recent[]=JSON.parse(localStorage.getItem(recentKey)||'[]');
 if(!Array.isArray(recent))recent=[];
 recent=recent.filter(item=>item&&typeof item.title==='string'&&item.title.length<=250&&/^\/artigo\/[a-z0-9-]{1,110}\/$/.test(item.path)&&Number.isFinite(item.at)&&Date.now()-item.at<7*86400000).slice(0,6);
 if(document.body.dataset.article==='true'&&document.querySelector('meta[name="robots"]')?.getAttribute('content')?.startsWith('index')){
  const path=new URL(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href).pathname.replace(/^\/(pt-br|en-us)/,'');
  const title=document.querySelector('main h1')?.textContent?.trim()||'';
  if(title&&/^\/artigo\/[a-z0-9-]{1,110}\/$/.test(path))recent=[{title,path,at:Date.now()},...recent.filter(item=>item.path!==path)].slice(0,6);
 }
 localStorage.setItem(recentKey,JSON.stringify(recent));
 const container=document.querySelector<HTMLElement>('[data-recent-articles]');
 if(container&&recent.length){container.hidden=false;for(const item of recent.slice(0,4)){const anchor=document.createElement('a');anchor.href=localPath(item.path);anchor.textContent=item.title;anchor.dataset.noTranslate='';anchor.setAttribute('translate','no');container.querySelector('div')!.append(anchor)}container.querySelector('[data-clear-recent]')!.addEventListener('click',()=>{localStorage.removeItem(recentKey);container.hidden=true;container.querySelector('div')!.replaceChildren()})}
}catch{}

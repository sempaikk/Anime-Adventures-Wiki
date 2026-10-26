import {t} from './i18n';
import {icon as vectorIcon} from '../lib/icons';
import {animateUI,showDialog,closeDialog,cue} from './ui-motion';
const images=[...document.querySelectorAll<HTMLImageElement>('article.wiki-content img.source-image')].filter(image=>{
  if(image.closest('button')||Number(image.getAttribute('width')||300)<180)return false;
  const link=image.closest('a');
  return !link||((/^https:\/\/(?:animeadventures\.fandom\.com\/wiki\/File:|(?:static|vignette)\.wikia\.nocookie\.net\/animeadventures\/images\/)/i.test(link.href))&&link.children.length===1);
});
if(images.length){
  const viewer=document.createElement('dialog');viewer.className='article-image-viewer';viewer.setAttribute('aria-label','Ampliar imagem');
  const toolbar=document.createElement('div');toolbar.className='article-image-toolbar';
  const zoom=document.createElement('button');zoom.type='button';zoom.className='button button-outline';zoom.textContent='Tamanho original';zoom.setAttribute('aria-pressed','false');
  const close=document.createElement('button');close.type='button';close.className='square-button ui-close';close.setAttribute('aria-label','Fechar imagem');
  const closeIcon=document.createElement('span');closeIcon.className='ui-emoji';closeIcon.setAttribute('aria-hidden','true');closeIcon.append(vectorIcon('close')); close.append(closeIcon);
  const source=document.createElement('a');source.className='text-link';source.textContent='Ver na fonte';source.append(vectorIcon('external'));source.target='_blank';source.rel='noopener noreferrer';source.hidden=true;
  const frame=document.createElement('div');frame.className='article-image-frame';frame.tabIndex=0;frame.setAttribute('aria-label','Imagem ampliada');
  const large=document.createElement('img');large.alt='';frame.append(large);
  const caption=document.createElement('p');caption.dataset.noTranslate='';caption.setAttribute('translate','no');
  toolbar.append(zoom,source,close);viewer.append(toolbar,frame,caption);document.body.append(viewer);
  let opener:HTMLElement|null=null;
  function reset(){viewer.classList.remove('is-zoomed');zoom.setAttribute('aria-pressed','false');zoom.textContent='Tamanho original';frame.scrollTo(0,0)}
  function toggle(){const active=viewer.classList.toggle('is-zoomed');zoom.setAttribute('aria-pressed',String(active));zoom.textContent=active?'Ajustar à tela':'Tamanho original';cue('select');}
  zoom.addEventListener('click',toggle);close.addEventListener('click',()=>closeDialog(viewer));
  viewer.addEventListener('close',()=>{reset();large.removeAttribute('src');opener?.focus({preventScroll:true})});
  viewer.addEventListener('click',event=>{if(event.target===viewer){const r=viewer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog(viewer)}});
  for(const image of images){
    const link=image.closest('a'),control=link||image;
    control.tabIndex=0;control.classList.add('article-image-expand');control.setAttribute('aria-haspopup','dialog');
    if(!link)control.setAttribute('role','button');control.setAttribute('aria-label',t('Ampliar imagem: {0}',image.alt||link?.title||t('Imagem do artigo')));
    function open(){if(!image.complete||!image.naturalWidth)return false;opener=control;reset();large.src=image.currentSrc||image.src;large.alt=image.alt;caption.textContent=image.alt;source.hidden=!link;if(link)source.href=link.href;showDialog(viewer);cue('open');animateUI(large,[{opacity:0,scale:'.94'},{opacity:1,scale:'1'}],{duration:700});return true;}
    control.addEventListener('click',event=>{if(event instanceof MouseEvent&&(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey))return;if(open())event.preventDefault()});
    control.addEventListener('keydown',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;if(event.key==='Enter'||event.key===' '){if(open())event.preventDefault()}});
  }
}

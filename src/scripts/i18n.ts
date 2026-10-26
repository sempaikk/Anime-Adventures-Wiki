import messages from '../../source/translations/ui-en-US.json';
import futureMessages from '../../source/translations/future-en-US.json';
import {createTranslator,localizedPath,splitLocale,validLocale} from '../lib/locales.mjs';

const locale=splitLocale(location.pathname).locale || (document.documentElement.lang==='en-US'?'en-US':'pt-BR');
const translate=createTranslator({...messages,...futureMessages},locale);
const ignored='[data-no-translate],[translate="no"],script,style,pre,code,kbd';
const sourceControls='.unit-reference-card,.section-share,.article-tab-nav button,.wiki-content .empty-state,[data-ui]';
const attributes=['aria-label','aria-description','title','placeholder','alt'];

export function currentLocale(){return locale}
export function localPath(value:string){return splitLocale(location.pathname).locale?localizedPath(value,locale):value}
export function localData(name:string){return `/data/${name}${splitLocale(location.pathname).locale==='pt-BR'?'.pt-br':''}.json`}

function navigation(element:Element){
  if(element.closest('[data-no-translate],[translate="no"]'))return;
  for(const key of ['href','action']){
    const value=element.getAttribute(key);
    if(!value||value.startsWith('#'))continue;
    let url:URL;try{url=new URL(value,location.href)}catch{continue}
    if(url.origin!==location.origin)continue;
    let next=localPath(url.pathname+url.search+url.hash);
    if(url.pathname==='/api/auth/discord'){
      const target=url.searchParams.get('return_to');
      if(target){url.searchParams.set('return_to',localPath(target));next=url.pathname+url.search+url.hash}
    }
    if(next!==value)element.setAttribute(key,next);
  }
}

function text(node:Text){
  const parent=node.parentElement;
  if(!parent||parent.closest(ignored+',textarea'))return;
  if(parent.closest('.wiki-content')&&!parent.closest(sourceControls))return;
  const next=translate(node.data);if(next!==node.data)node.data=next;
}

function tree(node:Node){
  if(node.nodeType===Node.TEXT_NODE){if(locale==='en-US')text(node as Text);return}
  if(!(node instanceof Element)||node.closest(ignored))return;
  navigation(node);
  if(locale==='en-US')for(const key of attributes){const value=node.getAttribute(key);if(value){const next=translate(value);if(next!==value)node.setAttribute(key,next)}}
  if(node.matches('.wiki-content')){node.querySelectorAll(sourceControls).forEach(tree);return}
  if(!node.matches('textarea'))for(const child of node.childNodes)tree(child);
}

document.querySelectorAll<HTMLElement>('[data-language-code]').forEach(node=>node.textContent=locale==='pt-BR'?'PT':'EN');
document.querySelectorAll<HTMLElement>('[data-set-locale]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.setLocale===locale));
  button.addEventListener('click',()=>{
    const next=button.dataset.setLocale;if(!validLocale(next))return;
    document.cookie=`aa-language=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
    try{localStorage.setItem('aa-language',next!)}catch{}
    document.querySelector<HTMLDetailsElement>('.language-menu')?.removeAttribute('open');
    if(next!==locale||!splitLocale(location.pathname).locale)location.assign(localizedPath(location.pathname+location.search+location.hash,next));
  });
});
document.querySelectorAll('[data-language-auto]').forEach(button=>button.addEventListener('click',()=>{
  document.cookie=`aa-language=; Path=/; Max-Age=0; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
  try{localStorage.removeItem('aa-language')}catch{}
  location.assign(splitLocale(location.pathname).pathname+location.search+location.hash);
}));
document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target:null;
  if(!target?.closest('.language-menu'))document.querySelector('.language-menu')?.removeAttribute('open');
},true);
document.addEventListener('keydown',event=>{
  const menu=document.querySelector<HTMLDetailsElement>('.language-menu');
  if(event.key==='Escape'&&menu?.open){menu.open=false;menu.querySelector<HTMLElement>('summary')?.focus()}
});
// Published variants already contain translated text and localized links.
// Rewalking hundreds of server-rendered cards delays their first interaction.
// The observer below still handles all newly created controls and account data.
if(splitLocale(location.pathname).locale!==locale||document.documentElement.lang!==locale){
  document.querySelectorAll('a[href],form[action]').forEach(navigation);
  tree(document.body);
}
new MutationObserver(records=>{
  for(const record of records){
    if(record.type==='childList')record.addedNodes.forEach(tree);
    else if(record.type==='characterData') {if(locale==='en-US')text(record.target as Text)}
    else if(record.target instanceof Element) {
      navigation(record.target);
      const key=record.attributeName;
      if(locale==='en-US'&&key&&attributes.includes(key)&&!record.target.closest(ignored)){
        const value=record.target.getAttribute(key);if(value){const next=translate(value);if(next!==value)record.target.setAttribute(key,next)}
      }
    }
  }
}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['href','action',...attributes]});
document.addEventListener('click',event=>{const link=event.target instanceof Element?event.target.closest('a[href]'):null;if(link)navigation(link)},true);

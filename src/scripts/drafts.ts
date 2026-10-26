import {t} from './i18n';
const prefix='aa-draft:';
// Tab-local, identity-scoped text. Photos and session tokens are never persisted.
export function clearDrafts(){try{for(const key of Object.keys(sessionStorage))if(key.startsWith(prefix))sessionStorage.removeItem(key)}catch{}}
export function bindDraft(input:HTMLTextAreaElement,user:string,scope:string){
  const key=prefix+encodeURIComponent(user)+':'+encodeURIComponent(scope);
  const notice=document.createElement('p');notice.className='draft-state';notice.hidden=true;
  (input.closest('label')||input).after(notice);
  const show=(message:string)=>{notice.hidden=false;const text=t(message);if(notice.textContent!==text)notice.textContent=text};
  try{
    const saved=JSON.parse(sessionStorage.getItem(key)||'null');
    if(saved&&typeof saved.body==='string'&&saved.body.length<=input.maxLength&&Date.now()-saved.at<86400000){input.value=saved.body;show('Texto recuperado. Adicione a foto novamente, se necessário.');input.dispatchEvent(new Event('input',{bubbles:true}))}
    else sessionStorage.removeItem(key);
  }catch{}
  const save=()=>{try{if(input.value){sessionStorage.setItem(key,JSON.stringify({body:input.value,at:Date.now()}));show('Rascunho salvo nesta aba.')}else{sessionStorage.removeItem(key);notice.hidden=true}}catch{notice.hidden=true}};
  input.addEventListener('input',save);
  return {clear(){try{sessionStorage.removeItem(key)}catch{}notice.hidden=true},save};
}

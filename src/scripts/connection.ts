import {animateUI,cue} from './ui-motion';
const banner=document.createElement('div');
banner.className='connection-notice';banner.hidden=true;
banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
const icon=document.createElement('span');icon.className='ui-emoji';icon.setAttribute('aria-hidden','true');
const label=document.createElement('span');banner.append(icon,label);document.body.append(banner);
let timer=0,wasOffline=false;
function sync(){
  clearTimeout(timer);
  if(!navigator.onLine){wasOffline=true;icon.textContent='📡';label.textContent='Sem conexão. Algumas funções precisam de internet.';banner.dataset.online='false';banner.hidden=false;animateUI(banner,[{opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}],{duration:550});}
  else if(wasOffline){wasOffline=false;icon.textContent='✅';label.textContent='Conexão restabelecida.';banner.dataset.online='true';banner.hidden=false;cue('success');timer=window.setTimeout(()=>{banner.hidden=true},3500);}
}
addEventListener('online',sync);addEventListener('offline',sync);addEventListener('pageshow',sync);sync();

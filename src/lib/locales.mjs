export const locales = ['pt-BR','en-US'];
export const localePrefix = locale => locale === 'pt-BR' ? '/pt-br' : '/en-us';
export const validLocale = value => locales.includes(value);

export function splitLocale(pathname) {
  const match=pathname.match(/^\/(pt-br|en-us)(?=\/|$)/i);
  return match?{locale:match[1].toLowerCase()==='pt-br'?'pt-BR':'en-US',pathname:pathname.slice(match[0].length)||'/'}:{locale:null,pathname};
}

export function documentPath(pathname) {
  const path=splitLocale(pathname).pathname;
  if(/^\/(?:api|art|data|_astro|source)(?:\/|$)/.test(path))return false;
  return !/\.[a-z\d]+$/i.test(path) || /\.html$/i.test(path);
}

export function localizedPath(value, locale) {
  if(!value||!value.startsWith('/')||value.startsWith('//'))return value;
  const split=value.match(/^([^?#]*)([\s\S]*)$/),path=split[1],suffix=split[2];
  if(!documentPath(path))return value;
  let plain=splitLocale(path).pathname;
  plain=plain.replace(/\/index\.html$/,'/');
  return localePrefix(locale)+plain+suffix;
}

export function preferenceFromCookie(cookie='') {
  for(const part of cookie.split(';')){
    const match=part.trim().match(/^aa-language=(.*)$/);
    if(!match)continue;
    try {const value=decodeURIComponent(match[1]);if(validLocale(value))return value} catch {}
  }
  return null;
}

export function visitorLocale(request) {
  return preferenceFromCookie(request.headers.get('Cookie')||'') || (request.cf?.country==='BR'?'pt-BR':'en-US');
}

export function createTranslator(messages,locale='en-US') {
  const patterns=Object.entries(messages).filter(([key])=>/\{\d+\}/.test(key)).sort(([a],[b])=>b.replace(/\{\d+\}/g,'').length-a.replace(/\{\d+\}/g,'').length).map(([key,value])=>{
    const slots=[];let cursor=0,source='^';
    for(const match of key.matchAll(/\{(\d+)\}/g)){
      source+=key.slice(cursor,match.index).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([\\s\\S]*?)';slots.push(match[1]);cursor=match.index+match[0].length;
    }
    source+=key.slice(cursor).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$';
    return {expression:new RegExp(source),value,slots};
  });
  return value=>{
    if(locale!=='en-US'||typeof value!=='string'||!value.trim())return value;
    const clean=value.replace(/\s+/g,' ').trim(),head=value.match(/^\s*/)[0],tail=value.match(/\s*$/)[0];
    if(messages[clean]!==undefined&&!/\{\d+\}/.test(clean))return head+messages[clean]+tail;
    const count=clean.match(/^([\d.,]+\s+)(.+)$/);
    if(count&&messages[count[2]]!==undefined&&!/\{\d+\}/.test(count[2]))return head+count[1]+messages[count[2]]+tail;
    for(const pattern of patterns){
      const match=clean.match(pattern.expression);
      if(match){const slots=Object.fromEntries(pattern.slots.map((slot,index)=>[slot,match[index+1]]));return head+pattern.value.replace(/\{(\d+)\}/g,(_,slot)=>slots[slot]??'')+tail}
    }
    return value;
  };
}

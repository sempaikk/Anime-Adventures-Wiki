import fs from 'node:fs';
import {load} from 'cheerio';
import {glossary,prepareTranslation,restoreTranslation} from '../src/lib/translation-structure.mjs';
const work=process.env.AA_TRANSLATION_WORK_DIR||'.cache/translations';fs.mkdirSync(work,{recursive:true});
const terms=glossary(JSON.parse(fs.readFileSync('source/translations/glossary.json')));
const lookup=JSON.parse(fs.readFileSync(work+'/ui-lookups.json'));
const cache=JSON.parse(fs.readFileSync('source/translations/ui-en-US-canonical.json')).entries;
const messages={};
for(const [text,key] of Object.entries(lookup)){
  const $=load('<p></p>',{},false);$('p').text(text);
  const prepared=prepareTranslation($('p').html(),terms,{headings:false});
  if(prepared.key!==key)throw Error('UI glossary or source changed; regenerate the corpus.');
  if(!cache[key])throw Error('Missing UI translation: '+text);
  try {messages[text]=load(restoreTranslation(prepared,cache[key]),{},false).root().text()} catch(error){throw Error(text+' => '+cache[key]+'; '+error.message)}
}
Object.assign(messages,{
  'Tipografia':'Typography','Adventures Wiki é um projeto independente para organizar informações públicas sobre Anime Adventures. A interface e os artigos estão disponíveis em português brasileiro e inglês dos Estados Unidos. Os artigos em português identificam a tradução automática e permitem consultar o original em inglês.':'Adventures Wiki is an independent project that organizes public information about Anime Adventures. The interface and articles are available in Brazilian Portuguese and US English. Portuguese articles identify automatic translation and link to the English original.',
  'Fontes sob a licença SIL Open Font License:':'Fonts licensed under the SIL Open Font License:',
  'A interface e os artigos estão disponíveis em português brasileiro e inglês dos Estados Unidos. Os artigos em português identificam a tradução automática e permitem consultar o original em inglês.':'The interface and articles are available in Brazilian Portuguese and US English. Portuguese articles identify automatic translation and link to the English original.',
  'Personagens':'Characters','Personagem':'Character','WIKI E COMUNIDADE':'WIKI & COMMUNITY',
  'Personagens, itens, guias e informações sobre Anime Adventures. Wiki independente da comunidade.':'Characters, items, guides and information about Anime Adventures. Independent community wiki.',
  'Ground — solo':'Ground','Hill — elevação':'Hill','Hybrid — híbrido':'Hybrid',
  'Fonte':'Source','Fontes':'Sources','Créditos':'Credits','Favoritos':'Favorites','Sua conta':'Your account',
  'Índice do artigo':'Article contents','Não informado':'Not specified','Não informada':'Not specified',
  'Não informado nesta revisão da fonte.':'Not specified in this source revision.',
  'Sem raridade informada':'Rarity not specified','Aparência e som':'Appearance & sound',
  'Animações e efeitos':'Animations & effects','Som ligado':'Sound on','Ativar som':'Turn on sound',
  'Sons da interface':'Interface sounds','Pesquisar na wiki':'Search the wiki','Pesquisar':'Search',
  'SKIN ORIGINAL':'ORIGINAL SKIN','Skin original':'Original Skin','Skin Shiny':'Shiny Skin',
  'OUTRAS FORMAS':'OTHER FORMS','Neste artigo':'In this article','Informações':'Information',
  'Português (Brasil)':'Português (Brasil)','English (US)':'English (US)',
  'Idioma do site':'Site language','Usar idioma da região':'Use regional language',
  'Salvar':'Save','Salvo':'Saved','Cancelar':'Cancel','Carregando…':'Loading…','Responder':'Reply','Publicar comentário':'Post comment','Fonte, revisão e créditos':'Source, revision and credits',
  'SEM RARIDADE INFORMADA':'RARITY NOT SPECIFIED','Sem raridade':'Rarity not specified',
  'UNIDADES':'UNITS','unidades':'units','unidade':'unit','ARTIGOS':'ARTICLES','artigos':'articles','artigo':'article',
  'ITENS':'ITEMS','itens':'items','PERFIS':'PROFILES','perfis':'profiles','PESSOAS':'PEOPLE','pessoas':'people',
  'favorito':'favorite','favoritos':'favorites','contribuição':'contribution','contribuições':'contributions',
  '{0} favorito na sua conta':'{0} favorite in your account','{0} favoritos na sua conta':'{0} favorites in your account',
  'Avatar de {0}':'Avatar of {0}','Entrou em {0}':'Joined {0}','Roblox: {0} · informado pelo jogador':'Roblox: {0} · provided by the player',
  'Revisão de {0}':'Revision from {0}',
  'A data da revisão é':'The revision date is','; ela não corresponde necessariamente à data de uma atualização do jogo. Esta é uma fonte comunitária e pode conter lacunas.':'; it does not necessarily match a game update date. This community source may have missing information.',
});
fs.writeFileSync('source/translations/ui-en-US.json',JSON.stringify(messages,null,2)+'\n');
console.log(`Compiled ${Object.keys(messages).length} UI translations.`);

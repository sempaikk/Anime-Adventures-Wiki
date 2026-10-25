import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {parse as parseAstro} from '@astrojs/compiler-rs';
import {load} from 'cheerio';
import {htmlFiles,sourceExcerpts} from './translation-corpus.mjs';
import {glossary,normalText,prepareTranslation} from '../src/lib/translation-structure.mjs';

const work=process.env.AA_TRANSLATION_WORK_DIR||'.cache/translations';fs.mkdirSync(work,{recursive:true});
const wiki=JSON.parse(fs.readFileSync('source/wiki.json'));
const names=JSON.parse(fs.readFileSync('source/translations/glossary.json'));
const terms=glossary(names),proper=terms.names,excerpts=new Set(sourceExcerpts(wiki).map(normalText));
const values=new Set();
const pt=/[áàâãéêíóôõúç]|\b(?:abrir|adicionar|arquivo|artigo|artigos|busca|buscar|cancelar|carregar|carregando|copiar|comentario|comentarios|comparar|personagem|personagens|comunidade|favoritos|biblioteca|conta|perfil|publicar|privado|rascunho|resposta|respostas|nome|imagem|volume|idioma|todos|todas|nenhum|nenhuma|sem|sim|sair|entrar|voltar|editar|excluir|remover|ocultar|mostrar|fechar|confirmar|conectar|salvar|enviar|erro|aviso|aplicar|seu|sua|seus|suas|este|esta|deste|desta|para|pelo|pela|pode|foi|tente|agora|carregado|painel|retirar|pendente|disponivel)\b/i;
const attributes=['aria-label','aria-description','title','placeholder','alt','content'];
const sourceUI='.unit-reference-card,.section-share,.article-tab-nav button,.empty-state,[data-ui]';
function add(value,visible=false){
  const text=normalText(value);
  if(!text||text.length>2500||!/[\p{L}]{2}/u.test(text.replace(/\{\d+\}/g,''))||proper.has(text)||excerpts.has(text))return;
  if(/^(?:https?:|\/|\.\/|\.\.\/|#|\[data-|SELECT |INSERT |UPDATE |DELETE |CREATE |ALTER |PRAGMA |WITH )/i.test(text))return;
  if(!visible&&!pt.test(text))return;
  values.add(text);
  const plain=text.replace(/\s*↗[\uFE0E\uFE0F]?$/u,'');
  if(plain!==text&&plain)values.add(plain);
}
function markup(html){
  const $=load(html,{},false);
  const walk=node=>{
    if(node.type==='text'){
      if(!$(node).parent().closest('script,style,code,pre,kbd,textarea,[translate="no"],[data-no-translate]').length)add(node.data,true);
    }else for(const child of node.children||[])walk(child);
    if(node.type==='tag')for(const key of attributes){const value=$(node).attr(key);if(value)add(value,true)}
  };
  walk($.root()[0]);
}
for(const file of htmlFiles('dist')){
  const $=load(fs.readFileSync(file,'utf8'));
  $('.wiki-content').each((_,root)=>{ $(root).find(sourceUI).each((_,node)=>$('body').append($(node).clone()));$(root).remove(); });
  const walk=node=>{
    if(node.type==='text'){
      const parent=$(node).parent();
      if(!parent.closest('script,style,pre,code,kbd,textarea,[translate="no"],[data-no-translate]').length&&(!parent.closest('.wiki-content').length||parent.closest(sourceUI).length))add(node.data,true);
    }else for(const child of node.children||[])walk(child);
    if(node.type==='tag'&&!$(node).closest('[translate="no"],[data-no-translate]').length)for(const key of attributes){const value=$(node).attr(key);if(value)add(value,true)}
  };
  walk($.root()[0]);
}
function files(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{const file=path.join(folder,entry.name);return entry.isDirectory()?files(file):/\.(?:mjs|ts|astro)$/.test(file)?[file]:[]})}
for(const file of [...files('src'),...files('worker')]){
  const content=fs.readFileSync(file,'utf8');
  if(file.endsWith('.astro')){
    for(const match of content.matchAll(/(['"])((?:\\.|(?!\1)[^\r\n])*?)\1/g))if(pt.test(match[2]))add(match[2]);
    const parsed=await parseAstro(content);
    const collect=node=>{
      if(node.type==='text')add(node.value,true);
      if(node.attributes)for(const attr of node.attributes)if(attributes.includes(attr.name)&&attr.kind==='quoted')add(attr.value,true);
      for(const child of node.children||[])collect(child);
    };
    collect(parsed.ast);
    continue;
  }
  const source=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true);
  function visit(node){
    if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken){
      let slot=0;
      const flatten=part=>ts.isBinaryExpression(part)&&part.operatorToken.kind===ts.SyntaxKind.PlusToken?flatten(part.left)+flatten(part.right):ts.isStringLiteralLike(part)?part.text:`{${slot++}}`;
      add(flatten(node));
    }
    if(ts.isTemplateExpression(node)){
      const value=node.head.text+node.templateSpans.map((span,index)=>`{${index}}`+span.literal.text).join('');
      if(/<\/?[a-z]/i.test(value))markup(value);else add(value);
      for(const span of node.templateSpans)visit(span.expression);
      return;
    }
    if(ts.isStringLiteralLike(node)){
      const parent=node.parent;
      let visible=false;
      if(ts.isCallExpression(parent)||ts.isNewExpression(parent)){
        const index=[...(parent.arguments||[])].indexOf(node),callee=parent.expression.getText(source);
        visible=(['element','contentElement'].includes(callee)&&index>=2)||(['link','contentLink','button','action','toast','Error'].includes(callee)&&index===0)||(callee==='status'&&index===1)||(callee.endsWith('.setAttribute')&&index===1&&attributes.includes(parent.arguments[0]?.text));
      }
      if(ts.isPropertyAssignment(parent)&&['label','title','placeholder','message','description'].includes(parent.name.getText(source)))visible=true;
      if(ts.isBinaryExpression(parent)&&parent.operatorToken.kind===ts.SyntaxKind.EqualsToken&&/\.(?:textContent|placeholder|title)$/.test(parent.left.getText(source)))visible=true;
      if(/<\/?[a-z]/i.test(node.text))markup(node.text);else add(node.text,visible);
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
}
const records={},lookups={};
for(const value of [...values].sort()){
  const $=load('<p></p>',{},false);$('p').text(value);const prepared=prepareTranslation($('p').html(),terms,{headings:false});
  if(prepared.key){records[prepared.key]=prepared.canonical;lookups[value]=prepared.key}
}
fs.writeFileSync(work+'/ui-input.json',JSON.stringify({version:1,source:'pt-BR',target:'en-US',entries:records}));
fs.writeFileSync(work+'/ui-lookups.json',JSON.stringify(lookups));
console.log(JSON.stringify({labels:Object.keys(lookups).length,fragments:Object.keys(records).length,characters:Object.values(records).reduce((sum,value)=>sum+value.length,0)}));

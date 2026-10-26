import {bindDraft} from './drafts';
import {socialDialog} from './social-dialog';
import {t} from './i18n';
import {communityApi,element,contentElement,contentLink,link,picture,date,status,uploadImage} from './community-client';
import {getSession} from './favorites';
import {icon} from '../lib/icons';

const errorText=(error:unknown)=>(error as Error).message||'Não foi possível concluir agora.';
let participationPromise:Promise<any>|undefined;
function participation(){return participationPromise??=communityApi('/me').catch(error=>{participationPromise=undefined;throw error})}
function button(label:string,run:()=>Promise<void>|void,className='button button-outline',message?:HTMLElement){
  const node=element('button',className,label);node.type='button';
  node.addEventListener('click',async()=>{node.disabled=true;try{await run()}catch(error){if(message)status(message,errorText(error),true)}finally{node.disabled=false}});
  return node;
}
function emptyFeed(root:HTMLElement,title:string,description:string,players=true){
  const box=element('div','feed-empty');box.append(icon('message'),element('h3','',title));if(description)box.append(element('p','',description));if(players)box.append(link('Ver jogadores','/pessoas/','future-text-link'));root.append(box);
}
function authorLine(author:any,created:number){
  const row=element('header','post-header'),avatar=contentLink('',author.url);avatar.setAttribute('aria-label',t('Perfil de {0}',author.name));avatar.append(picture(author.avatar,'','post-avatar'));
  const identity=element('div','post-author');identity.append(contentLink(author.name,author.url),element('small','',`@${author.handle} · ${date(created)}`));row.append(avatar,identity);return row;
}
function postCard(post:any){
  const card=element('article','post-card');card.dataset.postId=post.id;
  const header=authorLine(post.author,post.created_at),message=element('p','community-status');message.setAttribute('role','status');message.hidden=true;
  const body=contentElement('p','post-body',post.body),photo=post.image?picture(post.image,'Foto da publicação','post-photo'):null;
  body.dataset.noTranslate='';body.setAttribute('translate','no');
  const menu=element('details','post-menu'),summary=element('summary','','···');summary.setAttribute('aria-label','Opções da publicação');
  const options=element('div');
  if(post.can_edit)options.append(button('Editar publicação',async()=>{
    menu.open=false;await socialDialog({title:'Editar publicação',label:'Salvar alterações',initial:post.body,allowEmpty:!!post.image,submit:async text=>{
      const result=await communityApi('/posts/'+post.id,'PATCH',{body:text,image_id:post.image_id});post=result.post;body.textContent=post.body;status(message,'Publicação atualizada.');
    }});
  },'',message));
  if(post.can_edit||post.can_moderate)options.append(button('Excluir publicação',async()=>{
    menu.open=false;
    if(await socialDialog({title:'Excluir esta publicação?',label:'Excluir',description:'A publicação e seus comentários serão removidos.',submit:()=>communityApi('/posts/'+post.id,'DELETE')}))
      card.dispatchEvent(new CustomEvent('aa:post-deleted',{bubbles:true,detail:{postId:post.id}}));
  },'',message));
  options.append(button('Denunciar publicação',async()=>{
    menu.open=false;await socialDialog({title:'Denunciar publicação',label:'Enviar denúncia',fieldLabel:'Motivo',initial:'',max:500,min:5,submit:async reason=>{
      await communityApi('/posts/'+post.id+'/report','POST',{reason});status(message,'Denúncia enviada para revisão.');
    }});
  },'',message));
  menu.append(summary,options);header.append(menu);card.append(header);
  if(post.article){const topic=link(post.article.title,post.article.url,'post-topic');topic.prepend(icon('book'));card.append(topic);}
  card.append(body);if(photo)card.append(photo);
  const footer=element('footer','post-footer'),toggle=button('Comentários ('+post.comment_count+')',()=>{comments.hidden=!comments.hidden},'post-comment-toggle',message);
  toggle.prepend(icon('message'));toggle.setAttribute('aria-expanded','false');
  const comments=element('section','post-comment-panel');comments.hidden=true;
  const commentList=element('div','post-comment-list'),commentStatus=element('p','community-status');commentStatus.setAttribute('role','status');comments.append(commentStatus,commentList);
  let loaded=false,next:number|null=null;
  const more=button('Ver comentários anteriores',()=>loadComments(true),'button button-outline',commentStatus);more.hidden=true;comments.append(more);
  async function loadComments(append=false){
    status(commentStatus,'Carregando comentários…');more.disabled=true;
    try{
      const data=await communityApi('/posts/'+post.id+'/comments'+(append&&next?'?before='+next:''));
      if(!append)commentList.replaceChildren();
      for(const comment of data.comments){
        const row=element('article','post-comment');row.append(picture(comment.author.avatar,'','post-avatar'));
        const text=element('div','post-comment-content');text.append(contentLink(comment.author.name,comment.author.url),contentElement('p','',comment.body),element('small','',date(comment.created_at)));row.append(text);
        if(comment.can_delete)row.append(button('Excluir',async()=>{
          if(!(await socialDialog({title:'Excluir este comentário?',label:'Excluir',description:'O comentário será removido da publicação.',submit:()=>communityApi('/post-comments/'+comment.id,'DELETE')})))return;
          row.remove();toggle.focus();post.comment_count=Math.max(0,post.comment_count-1);refreshCount();
        },'',commentStatus));commentList.append(row);
      }
      next=data.next;more.hidden=!next;loaded=true;
      status(commentStatus,commentList.children.length?'':'Ainda não há comentários nesta publicação.');
    }catch(error){status(commentStatus,errorText(error),true)}finally{more.disabled=false}
  }
  const refreshCount=()=>{toggle.replaceChildren(icon('message'),document.createTextNode('Comentários ('+post.comment_count+')'))};
  toggle.addEventListener('click',()=>{toggle.setAttribute('aria-expanded',String(!comments.hidden));if(!comments.hidden&&!loaded)loadComments()});
  let commentFormReady=false;const participationStatus=element('p','community-status');participationStatus.setAttribute('role','status');participationStatus.hidden=true;comments.append(participationStatus);
  const prepareCommentForm=()=>getSession().then(async session=>{
    if(commentFormReady)return;
    if(!session.user){commentFormReady=true;comments.append(link('Entre para participar','/conta/','future-text-link'));return}
    const me=await participation();
    if(!me.profile.published){commentFormReady=true;comments.append(link('Publique seu perfil para participar','/conta/#perfil','future-text-link'));return}
    commentFormReady=true;status(participationStatus,'');comments.querySelector('[data-comment-retry]')?.remove();
    const form=element('form','post-comment-form'),label=element('label','','Seu comentário'),input=element('textarea');input.required=true;input.maxLength=1000;input.rows=2;label.append(input);
    const submit=element('button','button button-primary','Comentar');submit.type='submit';form.append(label,submit);comments.append(form);
    form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{
      await communityApi('/posts/'+post.id+'/comments','POST',{body:input.value});input.value='';post.comment_count++;refreshCount();await loadComments();
    }catch(error){status(commentStatus,errorText(error),true)}finally{submit.disabled=false}});
  }).catch(error=>{status(participationStatus,errorText(error),true);if(!comments.querySelector('[data-comment-retry]')){const retry=button('Tentar novamente',prepareCommentForm,'button button-outline',participationStatus);retry.dataset.commentRetry='';comments.append(retry)}});prepareCommentForm();
  footer.append(toggle,contentLink('Perfil do autor',post.author.url));card.append(footer,message,comments);return card;
}

export function mountFeed(root:HTMLElement){
  if(root.dataset.mounted)return;root.dataset.mounted='true';root.tabIndex=-1;root.setAttribute('role','region');root.setAttribute('aria-label','Publicações da comunidade');
  const list=root.querySelector<HTMLElement>('[data-feed-list]')!,message=root.querySelector<HTMLElement>('[data-feed-status]')!,more=root.querySelector<HTMLButtonElement>('[data-feed-more]')!;
  const compact=root.dataset.compact==='true',profile=root.dataset.profile||'',article=root.dataset.article||(!compact?new URLSearchParams(location.search).get('artigo')||'':'');
  const topicInput=root.querySelector<HTMLInputElement>('#post-topic'),topicOptions=[...root.querySelectorAll<HTMLOptionElement>('[data-topic-slug]')];
  const selectedTopic=topicOptions.find(option=>option.dataset.topicSlug===article);
  if(topicInput&&selectedTopic)topicInput.value=selectedTopic.value;
  const topicLabel=root.querySelector<HTMLElement>('[data-feed-topic]');
  if(topicLabel&&selectedTopic){topicLabel.hidden=false;topicLabel.append(element('span','','Publicações sobre: '),contentElement('strong','',selectedTopic.value),link('Ver todos','/comunidade/','future-text-link'));}
  let feed='all',next:number|null=null,ticket=0;
  async function load(append=false,focusAfter?:string){
    const version=++ticket;more.disabled=true;status(message,'Carregando publicações…');
    try{
      const query=new URLSearchParams({feed,...(article?{article}:{}),...(profile?{profile}:{}),...(append&&next?{before:String(next)}:{})});
      const data=await communityApi('/posts?'+query);
      if(version!==ticket)return;
      if(!append)list.replaceChildren();
      for(const post of compact?data.posts.slice(0,2):data.posts)list.append(postCard(post));
      next=data.next;more.hidden=compact||!next;status(message,'');
      if(focusAfter!==undefined)([...list.querySelectorAll<HTMLElement>('[data-post-id]')].find(card=>card.dataset.postId===focusAfter)?.querySelector<HTMLElement>('summary')||root).focus({preventScroll:true});
      if(!list.children.length)emptyFeed(list,profile?'Este jogador ainda não publicou.':feed==='friends'?'Ainda não há publicações dos seus amigos.':'Ainda não há publicações.',profile?'As publicações públicas deste jogador aparecerão neste espaço.':feed==='friends'?'Encontre jogadores e envie uma solicitação de amizade para acompanhar suas publicações.':'Publique uma mensagem ou foto sobre o jogo.');
    }catch(error){
      if(version!==ticket)return;
      const description=(error as any).status===401?'Entre com Discord para acompanhar as publicações dos seus amigos.':'Não foi possível carregar as publicações agora. Tente novamente.';
      if(!append){list.replaceChildren();emptyFeed(list,'Publicações indisponíveis.','',false);
        const control=(error as any).status===401?link('Entrar com Discord','/conta/','button button-outline'):button('Tentar novamente',()=>load(),'button button-outline',message);list.lastElementChild?.append(control)}
      status(message,description,true);more.hidden=!append;if(focusAfter!==undefined)root.focus({preventScroll:true});
    }finally{if(version===ticket)more.disabled=false}
  }
  root.addEventListener('aa:post-deleted',event=>{const postId=(event as CustomEvent).detail?.postId,cards=[...list.querySelectorAll<HTMLElement>('[data-post-id]')],index=cards.findIndex(card=>card.dataset.postId===postId);load(false,postId?((cards[index+1]||cards[index-1])?.dataset.postId||''):undefined)});more.addEventListener('click',()=>load(true));
  document.addEventListener('aa:friends-change',()=>{if(feed==='friends')load()});
  for(const tab of root.querySelectorAll<HTMLButtonElement>('[data-feed-tab]'))tab.addEventListener('click',()=>{
    if(tab.dataset.feedTab===feed)return;feed=tab.dataset.feedTab!;next=null;
    root.querySelectorAll('[data-feed-tab]').forEach(item=>item.setAttribute('aria-pressed',String(item===tab)));load();
  });
  const form=root.querySelector<HTMLFormElement>('[data-post-form]'),entry=root.querySelector<HTMLElement>('[data-feed-entry]');
  if(form&&entry){
    let initialized=false;
    const initialize=()=>getSession().then(async session=>{
      entry.querySelector('strong')!.textContent='Perfil da comunidade';entry.querySelector('a')!.hidden=false;entry.querySelector('[data-participation-retry]')?.remove();
      if(!session.enabled){entry.querySelector('p')!.textContent='O acesso com Discord ainda não está disponível. A wiki continua aberta para consulta.';return}
      if(!session.user)return;
      const me=await participation();
      if(!me.profile.published){entry.querySelector('p')!.textContent='Publique seu perfil para postar e comentar na comunidade.';entry.querySelector('a')!.textContent='Configurar meu perfil';return}
      form.hidden=false;entry.hidden=true;if(initialized)return;initialized=true;
      const input=form.elements.namedItem('body') as HTMLTextAreaElement,file=form.querySelector<HTMLInputElement>('[type=file]')!,preview=form.querySelector<HTMLElement>('[data-photo-preview]')!,photo=preview.querySelector('img')!,submit=form.querySelector<HTMLButtonElement>('[type=submit]')!,feedback=form.querySelector<HTMLElement>('[data-composer-status]')!;
      const draft=bindDraft(input,session.user.id,'publication:'+article);
      form.querySelector('[data-post-count]')!.textContent=input.value.length+' / 2000';
      let imageId:string|null=null,uploading=false;
      const clear=()=>{imageId=null;preview.hidden=true;photo.removeAttribute('src');file.value=''};
      input.addEventListener('input',()=>{form.querySelector('[data-post-count]')!.textContent=input.value.length+' / 2000'});
      form.querySelector('[data-remove-photo]')!.addEventListener('click',clear);
      file.addEventListener('change',async()=>{
        const selected=file.files?.[0];if(!selected)return;uploading=true;submit.disabled=true;file.disabled=true;(form.querySelector('[data-remove-photo]') as HTMLButtonElement).disabled=true;status(feedback,'Preparando sua foto…');
        try{const result=await uploadImage(selected);imageId=result.id;photo.src=result.url;preview.hidden=false;status(feedback,'Foto pronta para publicar.')}catch(error){status(feedback,errorText(error),true)}finally{uploading=false;submit.disabled=false;file.disabled=false;(form.querySelector('[data-remove-photo]') as HTMLButtonElement).disabled=false;file.value=''}
      });
      form.addEventListener('submit',async event=>{
        event.preventDefault();if(uploading)return;submit.disabled=true;file.disabled=true;status(feedback,'Publicando…');
        try{
          const chosen=topicOptions.find(option=>option.value===topicInput?.value.trim());
          if(topicInput?.value.trim()&&!chosen)throw Error(t('Escolha um artigo da lista ou deixe o campo vazio.'));
          await communityApi('/posts','POST',{body:input.value,image_id:imageId,article_slug:chosen?.dataset.topicSlug||null});draft.clear();input.value='';clear();form.querySelector('[data-post-count]')!.textContent='0 / 2000';status(feedback,'Publicação enviada.');
          feed='all';root.querySelectorAll<HTMLElement>('[data-feed-tab]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.feedTab==='all')));await load();
        }catch(error){status(feedback,errorText(error),true)}finally{submit.disabled=false;file.disabled=false}
      });
    }).catch(error=>{
      form.hidden=true;entry.hidden=false;entry.querySelector('strong')!.textContent='Não foi possível carregar seu perfil.';
      entry.querySelector('p')!.textContent=errorText(error);entry.querySelector('p')!.setAttribute('role','status');entry.querySelector('a')!.hidden=true;
      if(!entry.querySelector('[data-participation-retry]')){const retry=button('Tentar novamente',initialize);retry.dataset.participationRetry='';entry.append(retry)}
    });initialize();
  }
  if(compact&&'IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();load()}},{rootMargin:'250px'});observer.observe(root);addEventListener('pagehide',()=>observer.disconnect(),{once:true})}else load();
}

export function profilePosts(handle:string){
  const root=element('section','social-feed');root.dataset.profile=handle;
  const message=element('p','community-status');message.dataset.feedStatus='';message.setAttribute('role','status');
  const list=element('div','feed-list');list.dataset.feedList='';const more=element('button','button button-outline feed-more','Ver mais publicações');more.type='button';more.dataset.feedMore='';more.hidden=true;
  root.append(message,list,more);mountFeed(root);return root;
}
export async function mountFriendActions(root:HTMLElement,handle:string){
  root.classList.add('friendship-actions');const message=element('p','community-status');message.setAttribute('role','status');
  try{
    const session=await getSession();if(!session.user){root.replaceChildren(link('Adicionar amigo','/conta/','button button-outline'));return}
    const data=await communityApi('/friends/'+handle);root.replaceChildren();if(data.relationship==='self')return;
    const change=async(method:string)=>{await communityApi('/friends/'+handle,method);await mountFriendActions(root,handle);document.dispatchEvent(new Event('aa:friends-change'))};
    if(data.relationship==='none')root.append(button('Adicionar amigo',()=>change('POST'),'button button-primary',message));
    if(data.relationship==='sent')root.append(element('span','friendship-status','Solicitação enviada'),button('Cancelar solicitação',()=>change('DELETE'),'button button-outline',message));
    if(data.relationship==='received')root.append(button('Aceitar amizade',()=>change('PATCH'),'button button-primary',message),button('Recusar',()=>change('DELETE'),'button button-outline',message));
    if(data.relationship==='accepted')root.append(element('span','friendship-status','Vocês são amigos'),button('Remover amizade',async()=>{if(await socialDialog({title:'Remover esta amizade?',label:'Remover',description:'Esta pessoa será removida da sua lista de amigos.',submit:()=>communityApi('/friends/'+handle,'DELETE')})){await mountFriendActions(root,handle);root.querySelector<HTMLElement>('button')?.focus();document.dispatchEvent(new Event('aa:friends-change'))}},'button button-outline',message));
    root.append(message);
  }catch(error){root.append(message);status(message,errorText(error),true)}
}
document.querySelectorAll<HTMLElement>('[data-social-feed]').forEach(mountFeed);

const friendList=document.querySelector<HTMLElement>('[data-friend-list]');
if(friendList){
  const items=friendList.querySelector<HTMLElement>('[data-friends-items]')!,message=friendList.querySelector<HTMLElement>('[data-friends-status]')!;
  let next:number|null=null;
  const more=button('Ver mais conexões',()=>load(true),'friend-more',message);more.hidden=true;friendList.append(more);
  async function load(append=false){try{
    const session=await getSession();if(!session.user)return;friendList!.hidden=false;
    const data=await communityApi('/friends'+(append&&next?'?before='+next:''));if(!append)items.replaceChildren();
    for(const person of data.friends){
      const row=element('div','friend-item');row.append(picture(person.avatar,'','post-avatar'));
      const info=element('div');info.append(contentLink(person.name,person.url),element('small','',person.relationship==='received'?'Quer adicionar você':person.relationship==='sent'?'Solicitação enviada':'Amigo'));
      const actions=element('div','friend-item-actions');
      if(person.relationship==='received')actions.append(button('Aceitar',async()=>{await communityApi('/friends/'+person.handle,'PATCH');await load()},'',message),button('Recusar',async()=>{await communityApi('/friends/'+person.handle,'DELETE');await load()},'',message));
      if(person.relationship==='sent')actions.append(button('Cancelar',async()=>{await communityApi('/friends/'+person.handle,'DELETE');await load()},'',message));
      info.append(actions);row.append(info);items.append(row);
    }
    next=data.next;more.hidden=!next;status(message,items.children.length?'':'Você ainda não tem amizades ou solicitações.');
  }catch(error){status(message,errorText(error),true)}}
  document.addEventListener('aa:friends-change',()=>load());load();
}
const moderation=document.querySelector<HTMLElement>('[data-post-moderation]');
if(moderation){getSession().then(async session=>{
  if(!session.user)return;const me=await participation();if(!me.moderator)return;moderation.hidden=false;
  moderation.addEventListener('toggle',async()=>{
    if(!moderation.hasAttribute('open'))return;const message=moderation.querySelector<HTMLElement>('[data-reports-status]')!,list=moderation.querySelector<HTMLElement>('[data-reports-list]')!;
    try{const data=await communityApi('/post-reports');list.replaceChildren();status(message,data.reports.length?'':'Nenhuma publicação aguardando revisão.');
      for(const report of data.reports){const row=element('article','social-report');row.append(contentLink(report.name,'/perfil/'+report.handle+'/'),contentElement('p','',report.body),contentElement('p','',report.reason));if(report.image){const media=link('Ver foto da publicação',report.image,'report-photo-link');media.target='_blank';media.rel='noopener noreferrer';media.prepend(picture(report.image,'Foto da publicação denunciada','report-photo'));row.append(media)}row.append(button('Remover publicação',async()=>{
        if(!(await socialDialog({title:'Remover a publicação denunciada?',label:'Remover',description:'A publicação e seus comentários serão removidos.',submit:()=>communityApi('/posts/'+report.post_id,'DELETE')})))return;row.remove();moderation.querySelector<HTMLElement>('summary')?.focus();document.querySelectorAll('[data-social-feed]').forEach(node=>node.dispatchEvent(new Event('aa:post-deleted')));
      },'button button-outline',message),button('Manter publicação',async()=>{await communityApi('/post-reports/'+report.id,'PATCH');row.remove();moderation.querySelector<HTMLElement>('summary')?.focus()},'button button-outline',message));list.append(row)}
    }catch(error){status(message,errorText(error),true)}
  });
}).catch(()=>{})}

// Native details keep their keyboard semantics, with the same dismissal as header menus.
document.addEventListener('click',event=>{const target=event.target as Node;document.querySelectorAll<HTMLDetailsElement>('.post-menu[open]').forEach(menu=>{if(!menu.contains(target))menu.open=false})});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){const menu=document.querySelector<HTMLDetailsElement>('.post-menu[open]');if(menu){menu.open=false;menu.querySelector('summary')?.focus()}}});

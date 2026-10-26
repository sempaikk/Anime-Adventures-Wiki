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
function textDialog(title:string,initial:string,label:string,max=2000,confirmation=false,allowEmpty=false):Promise<string|null>{
  return new Promise(resolve=>{
    const previous=document.activeElement as HTMLElement|null;
    const dialog=element('dialog','social-dialog'),form=element('form'),heading=element('h2','',title);
    heading.id='social-dialog-title';dialog.setAttribute('aria-labelledby',heading.id);
    const input=element('textarea');input.value=initial;input.maxLength=max;input.required=!allowEmpty;
    const field=element('label','','Texto');field.append(input);
    form.append(heading,confirmation?element('p','','Esta ação remove o conteúdo da comunidade.'):field);
    const controls=element('div','social-dialog-actions'),cancel=element('button','button button-outline','Cancelar'),save=element('button','button button-primary',label);
    cancel.type='button';save.type='submit';cancel.addEventListener('click',()=>dialog.close());controls.append(cancel,save);form.append(controls);dialog.append(form);
    let result:string|null=null;
    form.addEventListener('submit',event=>{event.preventDefault();result=confirmation?'confirm':input.value;dialog.close()});
    dialog.addEventListener('close',()=>{dialog.remove();(previous?.closest('details')?.querySelector<HTMLElement>('summary')||previous)?.focus();resolve(result)},{once:true});
    document.body.append(dialog);dialog.showModal();
  });
}
function emptyFeed(root:HTMLElement,title:string,description:string){
  const box=element('div','feed-empty');box.append(icon('message'),element('h3','',title),element('p','',description),link('Conhecer jogadores','/pessoas/','future-text-link'));root.append(box);
}
function authorLine(author:any,created:number){
  const row=element('header','post-header'),avatar=contentLink('',author.url);avatar.append(picture(author.avatar,'','post-avatar'));
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
    menu.open=false;const text=await textDialog('Editar publicação',post.body,'Salvar alterações',2000,false,!!post.image);if(text===null)return;
    const result=await communityApi('/posts/'+post.id,'PATCH',{body:text,image_id:post.image_id});post=result.post;body.textContent=post.body;
    status(message,'Publicação atualizada.');
  },'',message));
  if(post.can_edit||post.can_moderate)options.append(button('Excluir publicação',async()=>{
    menu.open=false;if(!(await textDialog('Excluir esta publicação?','','Excluir',2000,true)))return;
    await communityApi('/posts/'+post.id,'DELETE');card.dispatchEvent(new CustomEvent('aa:post-deleted',{bubbles:true}));
  },'',message));
  options.append(button('Denunciar publicação',async()=>{
    menu.open=false;const reason=await textDialog('O que precisa ser revisado?','','Enviar denúncia',500);if(reason===null)return;
    await communityApi('/posts/'+post.id+'/report','POST',{reason});status(message,'Denúncia enviada para revisão.');
  },'',message));
  menu.append(summary,options);header.append(menu);card.append(header);
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
          if(!(await textDialog('Excluir este comentário?','','Excluir',1000,true)))return;
          await communityApi('/post-comments/'+comment.id,'DELETE');row.remove();post.comment_count=Math.max(0,post.comment_count-1);refreshCount();
        },'',commentStatus));commentList.append(row);
      }
      next=data.next;more.hidden=!next;loaded=true;
      status(commentStatus,commentList.children.length?'':'A conversa começa com o seu comentário.');
    }catch(error){status(commentStatus,errorText(error),true)}finally{more.disabled=false}
  }
  const refreshCount=()=>{toggle.replaceChildren(icon('message'),document.createTextNode('Comentários ('+post.comment_count+')'))};
  toggle.addEventListener('click',()=>{toggle.setAttribute('aria-expanded',String(!comments.hidden));if(!comments.hidden&&!loaded)loadComments()});
  getSession().then(async session=>{
    if(!session.user){comments.append(link('Entre para participar','/conta/','future-text-link'));return}
    const me=await participation();
    if(!me.profile.published){comments.append(link('Publique seu perfil para participar','/conta/#perfil','future-text-link'));return}
    const form=element('form','post-comment-form'),label=element('label','','Seu comentário'),input=element('textarea');input.required=true;input.maxLength=1000;input.rows=2;label.append(input);
    const submit=element('button','button button-primary','Comentar');submit.type='submit';form.append(label,submit);comments.append(form);
    form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{
      await communityApi('/posts/'+post.id+'/comments','POST',{body:input.value});input.value='';post.comment_count++;refreshCount();await loadComments();
    }catch(error){status(commentStatus,errorText(error),true)}finally{submit.disabled=false}});
  }).catch(()=>{});
  footer.append(toggle,contentLink('Perfil do autor',post.author.url));card.append(footer,message,comments);return card;
}

export function mountFeed(root:HTMLElement){
  if(root.dataset.mounted)return;root.dataset.mounted='true';
  const list=root.querySelector<HTMLElement>('[data-feed-list]')!,message=root.querySelector<HTMLElement>('[data-feed-status]')!,more=root.querySelector<HTMLButtonElement>('[data-feed-more]')!;
  const compact=root.dataset.compact==='true',profile=root.dataset.profile||'';
  let feed='all',next:number|null=null,ticket=0;
  async function load(append=false){
    const version=++ticket;more.disabled=true;status(message,'Carregando publicações…');
    try{
      const query=new URLSearchParams({feed,...(profile?{profile}:{}),...(append&&next?{before:String(next)}:{})});
      const data=await communityApi('/posts?'+query);
      if(version!==ticket)return;
      if(!append)list.replaceChildren();
      for(const post of compact?data.posts.slice(0,2):data.posts)list.append(postCard(post));
      next=data.next;more.hidden=compact||!next;status(message,'');
      if(!list.children.length)emptyFeed(list,profile?'Este perfil ainda não publicou.':feed==='friends'?'As descobertas dos seus amigos aparecem aqui.':'A próxima descoberta pode ser sua.',profile?'As publicações públicas deste jogador aparecerão neste espaço.':feed==='friends'?'Encontre jogadores e envie uma solicitação de amizade para acompanhar suas publicações.':'Compartilhe uma conquista, uma composição ou uma dica. Este espaço reúne as publicações dos jogadores.');
    }catch(error){
      if(version!==ticket)return;
      if(!append){list.replaceChildren();emptyFeed(list,'Um espaço para as suas descobertas.',(error as any).status===503?'A comunidade ainda não está disponível. Você pode continuar explorando a wiki.':(error as any).status===401?'Entre com Discord para acompanhar as publicações dos seus amigos.':'Não foi possível carregar as publicações agora. Tente novamente.');
        const retry=button('Tentar novamente',()=>load(),'button button-outline',message);list.lastElementChild?.append(retry)}
      status(message,'');more.hidden=true;
    }finally{if(version===ticket)more.disabled=false}
  }
  root.addEventListener('aa:post-deleted',()=>load());more.addEventListener('click',()=>load(true));
  document.addEventListener('aa:friends-change',()=>{if(feed==='friends')load()});
  for(const tab of root.querySelectorAll<HTMLButtonElement>('[data-feed-tab]'))tab.addEventListener('click',()=>{
    if(tab.dataset.feedTab===feed)return;feed=tab.dataset.feedTab!;next=null;
    root.querySelectorAll('[data-feed-tab]').forEach(item=>item.setAttribute('aria-pressed',String(item===tab)));load();
  });
  const form=root.querySelector<HTMLFormElement>('[data-post-form]'),entry=root.querySelector<HTMLElement>('[data-feed-entry]');
  if(form&&entry){
    getSession().then(async session=>{
      if(!session.enabled){entry.querySelector('p')!.textContent='O acesso com Discord ainda não está disponível. A wiki continua aberta para consulta.';return}
      if(!session.user)return;
      const me=await participation();
      if(!me.profile.published){entry.querySelector('p')!.textContent='Publique seu perfil para compartilhar descobertas com os outros jogadores.';entry.querySelector('a')!.textContent='Configurar meu perfil';return}
      form.hidden=false;entry.hidden=true;
      const input=form.elements.namedItem('body') as HTMLTextAreaElement,file=form.querySelector<HTMLInputElement>('[type=file]')!,preview=form.querySelector<HTMLElement>('[data-photo-preview]')!,photo=preview.querySelector('img')!,submit=form.querySelector<HTMLButtonElement>('[type=submit]')!,feedback=form.querySelector<HTMLElement>('[data-composer-status]')!;
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
          await communityApi('/posts','POST',{body:input.value,image_id:imageId});input.value='';clear();form.querySelector('[data-post-count]')!.textContent='0 / 2000';status(feedback,'Publicação enviada.');
          feed='all';root.querySelectorAll<HTMLElement>('[data-feed-tab]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.feedTab==='all')));await load();
        }catch(error){status(feedback,errorText(error),true)}finally{submit.disabled=false;file.disabled=false}
      });
    }).catch(()=>{});
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
    if(data.relationship==='accepted')root.append(element('span','friendship-status','Vocês são amigos'),button('Remover amizade',async()=>{if(await textDialog('Remover esta amizade?','','Remover',100,true))await change('DELETE')},'button button-outline',message));
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
    next=data.next;more.hidden=!next;status(message,items.children.length?'':'Encontre jogadores para criar suas primeiras conexões.');
  }catch(error){status(message,errorText(error),true)}}
  document.addEventListener('aa:friends-change',()=>load());load();
}
const moderation=document.querySelector<HTMLElement>('[data-post-moderation]');
if(moderation){getSession().then(async session=>{
  if(!session.user)return;const me=await participation();if(!me.moderator)return;moderation.hidden=false;
  moderation.addEventListener('toggle',async()=>{
    if(!moderation.hasAttribute('open'))return;const message=moderation.querySelector<HTMLElement>('[data-reports-status]')!,list=moderation.querySelector<HTMLElement>('[data-reports-list]')!;
    try{const data=await communityApi('/post-reports');list.replaceChildren();status(message,data.reports.length?'':'Nenhuma publicação aguardando revisão.');
      for(const report of data.reports){const row=element('article','social-report');row.append(contentLink(report.name,'/perfil/'+report.handle+'/'),contentElement('p','',report.body),contentElement('p','',report.reason),button('Remover publicação',async()=>{
        if(!(await textDialog('Remover a publicação denunciada?','','Remover',100,true)))return;await communityApi('/posts/'+report.post_id,'DELETE');row.remove();document.querySelectorAll('[data-social-feed]').forEach(node=>node.dispatchEvent(new Event('aa:post-deleted')));
      },'button button-outline',message),button('Manter publicação',async()=>{await communityApi('/post-reports/'+report.id,'PATCH');row.remove()},'button button-outline',message));list.append(row)}
    }catch(error){status(message,errorText(error),true)}
  });
}).catch(()=>{})}

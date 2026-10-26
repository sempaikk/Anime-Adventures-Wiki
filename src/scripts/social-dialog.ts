import {element,status} from './community-client';

type Options={title:string;label:string;description?:string;initial?:string;fieldLabel?:string;max?:number;min?:number;allowEmpty?:boolean;submit:(value:string)=>Promise<unknown>};

// Keep the draft and the error in the dialog until the server confirms the action.
export function socialDialog(options:Options):Promise<boolean>{
  return new Promise(resolve=>{
    const previous=document.activeElement as HTMLElement|null;
    const dialog=element('dialog','social-dialog'),form=element('form'),title=element('h2','',options.title);
    title.id='social-dialog-'+crypto.randomUUID();dialog.setAttribute('aria-labelledby',title.id);form.append(title);
    if(options.description)form.append(element('p','',options.description));
    const input=element('textarea');input.value=options.initial||'';input.maxLength=options.max||2000;input.minLength=options.min||0;input.required=!options.allowEmpty;
    if(options.initial!==undefined){const label=element('label','',options.fieldLabel||'Texto');label.append(input);form.append(label)}
    const feedback=element('p','community-status');feedback.setAttribute('role','alert');feedback.hidden=true;
    const controls=element('div','social-dialog-actions'),cancel=element('button','button button-outline','Cancelar'),save=element('button','button button-primary',options.label);
    cancel.type='button';save.type='submit';controls.append(cancel,save);form.append(feedback,controls);dialog.append(form);
    let busy=false,success=false;
    cancel.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault()});
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;busy=true;save.disabled=cancel.disabled=true;input.readOnly=true;dialog.setAttribute('aria-busy','true');status(feedback,options.initial===undefined?'Processando…':'Enviando…');
      try{await options.submit(input.value);success=true;dialog.close()}
      catch(error){status(feedback,(error as Error).message||'Não foi possível concluir agora. Tente novamente.',true)}
      finally{busy=false;save.disabled=cancel.disabled=false;input.readOnly=false;dialog.removeAttribute('aria-busy')}
    });
    dialog.addEventListener('close',()=>{
      dialog.remove();const target=previous?.closest('details')?.querySelector<HTMLElement>('summary')||previous;
      if(target?.isConnected)target.focus({preventScroll:true});resolve(success);
    },{once:true});
    document.body.append(dialog);dialog.showModal();if(options.initial!==undefined)input.focus();else cancel.focus();
  });
}

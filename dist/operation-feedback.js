'use strict';
(() => {
 const contexts=new Set();let account;
 const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 function start({root=document.querySelector('#sheet-content'),message='正在处理…',guard=()=>true,allowSessionChange=false}={}){
  if(!root)return null;
  for(const previous of contexts)if(previous.root===root)previous.discard();
  const dialog=root.closest('dialog'),panel=dialog?.dataset.panel,uid=account?.user?.id||null,fragment=document.createDocumentFragment(),focus=document.activeElement;
  while(root.firstChild)fragment.append(root.firstChild);
  const state=document.createElement('section');state.className='operation-state';state.tabIndex=-1;state.setAttribute('aria-live','polite');state.setAttribute('aria-atomic','true');root.append(state);if(dialog)dialog.classList.add('operation-dialog');
  let alive=true;
  const current=()=>alive&&state.isConnected&&state.parentNode===root&&(!dialog||dialog.open&&dialog.dataset.panel===panel)&&guard();
  function cleanSecrets(){fragment.querySelectorAll('input[type=password]').forEach(input=>input.value='')}
  function release(){alive=false;contexts.delete(context);if(dialog)dialog.classList.remove('operation-dialog')}
  function restore(){if(!current())return;release();root.replaceChildren(fragment);if(focus?.isConnected&&!focus.disabled)focus.focus({preventScroll:true})}
  function discard(){if(!alive)return;cleanSecrets();fragment.replaceChildren();if(state.isConnected&&state.parentNode===root)state.remove();release()}
  function show(kind,title,text,actionLabel,action,restoreOnDone=true){
   if(!current())return;
   state.dataset.state=kind;state.setAttribute('aria-busy',String(kind==='processing'));state.setAttribute('role','status');
   state.innerHTML=`${kind==='processing'?'<span class="operation-spinner" aria-hidden="true"></span>':`<span class="operation-mark ${kind}" aria-hidden="true"><svg><use href="#i-${kind==='success'?'check':'close'}"/></svg></span>`}<h2 class="operation-title">${escape(title)}</h2>${text?`<p class="operation-message">${escape(text)}</p>`:''}${kind!=='processing'?`<button type="button" class="primary-btn operation-continue">${escape(actionLabel||'完成')}</button>`:''}`;
   const button=state.querySelector('button');if(button)button.addEventListener('click',()=>{if(!current())return;if(restoreOnDone)restore();else{release();fragment.replaceChildren()}if(action)action()},{once:true});state.focus({preventScroll:true});if(!dialog)state.scrollIntoView?.({block:'center',behavior:globalThis.EchoAppearance?.reducedMotion?'auto':'smooth'});
  }
  const context={root,uid,allowSessionChange,current,restore,discard,cleanSecrets,
   success({title='操作成功',message='',actionLabel='完成',onDone,restore=true}={}){cleanSecrets();if(!restore)fragment.replaceChildren();show('success',title,message,actionLabel,onDone,restore)},
   failure({title='操作未完成',message='',actionLabel='返回重试'}={}){cleanSecrets();show('error',title,message,actionLabel)},
   processing(text){show('processing',text||'正在处理…','')}
  };
  contexts.add(context);context.processing(message);return context;
 }
 function init(value){account=value.account;const observer=new MutationObserver(()=>{for(const context of [...contexts])if(!context.current())context.discard()});for(const node of [document.querySelector('#sheet-content'),document.querySelector('#main')])if(node)observer.observe(node,{childList:true,subtree:true});account.addEventListener('session',()=>{const uid=account.user?.id||null;for(const context of [...contexts])if(!context.allowSessionChange&&context.uid!==uid){const dialog=context.root.closest('dialog');context.discard();if(dialog?.open)dialog.close()}});document.querySelector('#sheet').addEventListener('close',()=>{for(const context of [...contexts])if(context.root.closest('#sheet'))context.discard()})}
 globalThis.EchoFeedback=Object.freeze({init,start,discard(root){for(const context of [...contexts])if(context.root===root)context.discard()}});
})();

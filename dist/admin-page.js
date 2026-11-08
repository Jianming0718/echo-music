'use strict';
(() => {
 let hooks,tab='members',previous='library',booted=false,renderedOwner,renderedTab,renderedAdmin,renderedBoot;const historyToken=crypto.randomUUID();
 const target=()=>document.querySelector('#admin-content');
 function isActive(name){return hooks.view()==='admin'&&hooks.account.user&&hooks.account.isAdmin&&target()?.dataset.section===name}
 function clear(){EchoAdminUsers.unmount?.();EchoRedemption.unmountAdmin?.();const root=target();if(root)EchoFeedback.discard(root)}
 function route(){return new URLSearchParams(location.hash.slice(1)).get('admin')}
 function render(){
  const uid=hooks.account.user?.id||null,admin=Boolean(hooks.account.isAdmin);if(target()&&renderedOwner===uid&&renderedTab===tab&&renderedAdmin===admin&&renderedBoot===booted)return;renderedOwner=uid;renderedTab=tab;renderedAdmin=admin;renderedBoot=booted;
  clear();hooks.main.innerHTML=`<section class="admin-workspace"><div class="admin-page-heading"><button class="text-button" id="admin-page-back"><svg><use href="#i-prev"/></svg><span>返回音乐</span></button></div><nav class="admin-tabs" aria-label="管理中心"><button type="button" data-admin-tab="members" aria-pressed="${tab==='members'}" class="${tab==='members'?'active':''}">用户管理</button><button type="button" data-admin-tab="codes" aria-pressed="${tab==='codes'}" class="${tab==='codes'?'active':''}">兑换码管理</button></nav><div id="admin-content" data-section="${tab}"></div></section>`;
  const root=target();
  if(!hooks.account.user){root.innerHTML=booted?'<div class="admin-access"><h2>请先登录管理员账号</h2><button class="primary-btn" id="account-btn-inline">登录</button></div>':'<div class="admin-access" role="status"><span class="operation-spinner"></span><p>正在确认管理员权限…</p></div>';return}
  if(!hooks.account.isAdmin){root.innerHTML='<div class="admin-access"><h2>仅管理员可访问</h2><button class="secondary-btn" data-view="library">返回资料库</button></div>';return}
  if(tab==='codes')EchoRedemption.mountAdmin(root);else EchoAdminUsers.mount(root);
 }
 function open(name='members',{push=true}={}){
  tab=name==='codes'?'codes':'members';if(hooks.view()!=='admin')previous=['discover','search','library','liked','friends'].includes(hooks.view())?hooks.view():'library';
  hooks.closeOverlays();hooks.setView('admin');const hash='#admin='+tab;if(push&&location.hash!==hash)history.pushState({echoAdmin:historyToken},'',location.pathname+location.search+hash);else if(!push&&location.hash!==hash)history.replaceState(history.state,'',location.pathname+location.search+hash);
 }
 function leave(){clear();if(route())history.replaceState(null,'',location.pathname+location.search)}
 function init(value){hooks=value;
  document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.adminTab)open(button.dataset.adminTab);if(button.id==='admin-page-back'){if(history.state?.echoAdmin===historyToken)history.back();else hooks.setView(previous)}});
  window.addEventListener('popstate',()=>{const next=route();if(next)open(next,{push:false});else if(hooks.view()==='admin')hooks.setView(previous)});
  hooks.account.addEventListener('session',()=>{if(hooks.view()==='admin'){renderedOwner=undefined;clear();render()}});
 }
 globalThis.EchoAdminPage=Object.freeze({init,open,render,isActive,leave,refresh(){renderedTab=null;if(hooks.view()==='admin')render()},settled(){booted=true;if(route())open(route(),{push:false})}});
})();

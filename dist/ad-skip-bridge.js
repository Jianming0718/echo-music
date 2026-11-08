'use strict';
(() => {
 const origins=new Set(['https://www.youtube.com','https://www.youtube-nocookie.com']);
 const channel='echo-ad-helper';let enabled=true,peer=null;
 try{enabled=localStorage.getItem('echo-ad-helper-enabled')!=='false'}catch{}
 const frame=()=>document.querySelector('#youtube-player iframe');
 function connected(){return Boolean(peer&&frame()?.contentWindow===peer.window&&Date.now()-peer.seen<15000)}
 function status(){return !enabled?'disabled':!connected()?'missing':peer.ad?'ad':'ready'}
 function update(){const messages={disabled:'广告跳过脚本已关闭',missing:'未检测到 Safari 跳广告脚本',ad:'正在尝试跳过广告',ready:'Safari 跳广告脚本已连接'};for(const node of document.querySelectorAll('[data-ad-helper-status]'))node.textContent=EchoI18n.t(messages[status()])}
 function configure(){if(peer&&frame()?.contentWindow===peer.window)peer.window.postMessage({channel,version:1,type:'configure',nonce:peer.nonce,enabled},peer.origin);update()}
 function setEnabled(value){enabled=Boolean(value);try{localStorage.setItem('echo-ad-helper-enabled',String(enabled))}catch{}configure()}
 window.addEventListener('message',event=>{
  const data=event.data;
  if(!origins.has(event.origin)||event.source!==frame()?.contentWindow||!data||typeof data!=='object'||data.channel!==channel||data.version!==1||typeof data.nonce!=='string'||data.nonce.length<8||data.nonce.length>80)return;
  if(data.type==='hello'){peer={window:event.source,origin:event.origin,nonce:data.nonce,seen:Date.now(),ad:false};configure()}
  else if(data.type==='status'&&peer&&peer.window===event.source&&peer.nonce===data.nonce){peer.seen=Date.now();peer.ad=data.ad===true&&data.enabled===true;update()}
 });
 document.addEventListener('echo:languagechange',update);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)configure()});
 globalThis.EchoAdHelper=Object.freeze({setEnabled,update,get enabled(){return enabled},get status(){return status()}});
})();

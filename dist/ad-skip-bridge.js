'use strict';
(() => {
 const origins=new Set(['https://www.youtube.com','https://www.youtube-nocookie.com']),channel='echo-ad-helper';
 let enabled=true,peer=null,challenge=crypto.randomUUID(),observed=null,binding=null,gate=null,serial=0;
 try{enabled=localStorage.getItem('echo-ad-helper-enabled')!=='false'}catch{}
 const frame=()=>document.querySelector('#youtube-player iframe');
 function connected(){return Boolean(peer&&frame()?.contentWindow===peer.window&&Date.now()-peer.seen<15000)}
 function status(){return !enabled?'disabled':!connected()?'missing':peer.version===1?'legacy':peer.ad?'ad':'ready'}
 function update(){const messages={disabled:'广告跳过脚本已关闭',missing:'未检测到 Safari 跳广告脚本',legacy:'脚本版本过旧，请更新至 0.2.0',ad:'已检测到广告，正在静音并尝试加速',ready:'Safari 跳广告脚本已连接'};for(const node of document.querySelectorAll('[data-ad-helper-status]'))node.textContent=EchoI18n.t(messages[status()])+(connected()&&peer.version===2?' · '+peer.scriptVersion:'')}
 function release(){const saved=gate;gate=null;if(!saved)return;clearTimeout(saved.timer);if(!saved.wasMuted&&binding===saved.binding&&binding.getVolume()>0)try{binding.player.unMute?.()}catch{}}
 function mute(){try{binding?.player.mute?.()}catch{}}
 function configure(type='configure'){if(connected())peer.window.postMessage({channel,version:peer.version,type,nonce:peer.nonce,challenge,enabled,token:gate?.token||null},peer.origin);update()}
 function probe(){const target=frame();if(target!==observed){release();observed=target;peer=null;challenge=crypto.randomUUID()}if(!target)return;for(const origin of origins)target.contentWindow?.postMessage({channel,version:2,type:'probe',challenge},origin);if(peer&&!connected()){release();peer=null;update()}}
 function prepare(){release();if(!enabled||!connected()||peer.version!==2||!binding)return;const token=String(++serial)+'-'+crypto.randomUUID();gate={token,binding,wasMuted:binding.getVolume()===0,timer:null};mute();const expire=()=>{if(gate?.token!==token)return;if(connected()&&peer.ad){gate.timer=setTimeout(expire,15000);return}release();configure()};gate.timer=setTimeout(expire,15000);configure('arm')}
 function setEnabled(value){enabled=Boolean(value);if(!enabled)release();try{localStorage.setItem('echo-ad-helper-enabled',String(enabled))}catch{}configure()}
 window.addEventListener('message',event=>{
  const data=event.data,target=frame();
  if(!target||!origins.has(event.origin)||!data||typeof data!=='object'||data.channel!==channel||![1,2].includes(data.version)||typeof data.nonce!=='string'||data.nonce.length<8||data.nonce.length>80)return;
  if(event.source!==target.contentWindow&&!(event.source===null&&data.version===2&&data.challenge===challenge))return;
  if(data.version===2&&data.challenge!==challenge){probe();return}
  if(data.type==='hello'){peer={window:target.contentWindow,origin:event.origin,nonce:data.nonce,version:data.version,scriptVersion:typeof data.scriptVersion==='string'?data.scriptVersion.slice(0,16):'0.2.0',seen:Date.now(),ad:false};configure()}
  else if(data.type==='status'&&peer&&peer.nonce===data.nonce&&peer.version===data.version){peer.seen=Date.now();peer.ad=data.ad===true&&data.enabled===true;if(enabled&&data.version===2&&binding){if(peer.ad){if(!gate)prepare();mute()}else if(data.state==='content'&&gate&&data.token===gate.token&&binding.active())release()}update()}
 });
 document.addEventListener('echo:languagechange',update);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){probe();configure()}});
 const observer=new MutationObserver(probe);observer.observe(document.querySelector('#youtube-player')||document.documentElement,{childList:true,subtree:true});
 setInterval(probe,3000);window.addEventListener('pagehide',release);
 globalThis.EchoAdHelper=Object.freeze({setEnabled,update,prepare,cancel:release,bind(value){release();binding=value;probe()},get enabled(){return enabled},get status(){return status()}});
})();

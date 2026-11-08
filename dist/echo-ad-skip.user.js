// ==UserScript==
// @name         Echo Safari Ad Helper
// @namespace    https://github.com/Jianming0718/echo-music
// @version      0.1.0
// @description  Try visible ad skip controls and mute/accelerate marked ads inside Echo's YouTube player.
// @match        https://www.youtube-nocookie.com/embed/*
// @match        https://www.youtube.com/embed/*
// @run-at       document-start
// @inject-into  content
// @grant        none
// @license      MIT
// @downloadURL  https://jianming0718.github.io/echo-music/echo-ad-skip.user.js
// @updateURL    https://jianming0718.github.io/echo-music/echo-ad-skip.user.js
// ==/UserScript==
'use strict';
(() => {
 if(window.parent===window)return;
 const parents=new Set(['https://jianming0718.github.io','https://echo-music-free-player.stablepeace1.chatgpt.site','http://localhost:8000']);
 const channel='echo-ad-helper',nonce=crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 let enabled=false,parentOrigin=null,snapshot=null,observer=null,lastReport=0,lastAd=null,lastHello=0,timer=null;
 const clicked=new WeakMap();
 const send=(type,extra={})=>window.parent.postMessage({channel,version:1,type,nonce,...extra},parentOrigin||'*');
 function restore(){
  const saved=snapshot;snapshot=null;
  if(!saved)return;
  try{if(saved.changedRate&&saved.video.playbackRate===saved.changedRate)saved.video.playbackRate=saved.rate}catch{}
  try{if(saved.video.muted===true)saved.video.muted=saved.muted}catch{}
 }
 function report(ad=false,force=false){const now=Date.now();if(force||ad!==lastAd||now-lastReport>3000){lastReport=now;lastAd=ad;send('status',{enabled,ad})}}
 function inspect(){
  if(!enabled)return;
  const player=document.querySelector('#movie_player,.html5-video-player');
  const ad=Boolean(player&&(player.classList.contains('ad-showing')||player.classList.contains('ad-interrupting')));
  const video=player?.querySelector('video');
  if(!ad||!video){restore();report(false);return}
  if(snapshot?.video!==video){restore();snapshot={video,rate:video.playbackRate,muted:video.muted,changedRate:0}}
  video.muted=true;
  if(video.playbackRate<8){for(const rate of [16,8,4,2]){try{video.playbackRate=rate;if(video.playbackRate>snapshot.rate){snapshot.changedRate=video.playbackRate;break}}catch{}}}
  const skip=player.querySelector('.ytp-ad-skip-button,.ytp-ad-skip-button-modern,button.ytp-skip-ad-button,.ytp-ad-skip-button-container button');
  if(skip&&!skip.disabled&&!skip.hidden&&skip.getAttribute('aria-disabled')!=='true'&&skip.getClientRects().length&&!skip.closest('[hidden],[aria-hidden="true"]')&&getComputedStyle(skip).display!=='none'&&getComputedStyle(skip).visibility!=='hidden'){
   const now=Date.now();if(now-(clicked.get(skip)||0)>750){clicked.set(skip,now);skip.click()}
  }
  report(true);
 }
 function configure(value){
  enabled=value===true;
  if(!enabled){observer?.disconnect();observer=null;restore();report(false,true);return}
  if(!observer){observer=new MutationObserver(inspect);observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','aria-hidden','disabled','aria-disabled']})}
  inspect();report(lastAd===true,true);
 }
 window.addEventListener('message',event=>{
  const data=event.data;
  if(event.source!==window.parent||!parents.has(event.origin)||!data||data.channel!==channel||data.version!==1||data.nonce!==nonce)return;
  if(data.type==='configure'){parentOrigin=event.origin;configure(data.enabled)}
 });
 function start(){if(timer===null)timer=setInterval(()=>{if(!parentOrigin){if(Date.now()-lastHello>1000){lastHello=Date.now();send('hello')}}else if(enabled)inspect();else report(false)},200);send('hello')}
 window.addEventListener('pagehide',()=>{clearInterval(timer);timer=null;observer?.disconnect();observer=null;restore();enabled=false;parentOrigin=null;lastReport=0;lastHello=0});
 window.addEventListener('pageshow',start);
 start();
})();

// ==UserScript==
// @name         Echo Safari Ad Helper
// @namespace    https://github.com/Jianming0718/echo-music
// @version      0.2.0
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
 const channel='echo-ad-helper',nonce=crypto.randomUUID(),snapshots=new Map(),clicked=new WeakMap();
 let enabled=false,parentOrigin=null,challenge=null,token=null,awaitingPlayback=false,observer=null,timer=null,lastReport=0,lastState=null;
 const send=(type,extra={})=>window.parent.postMessage({channel,version:2,type,nonce,challenge,scriptVersion:'0.2.0',...extra},parentOrigin||'*');
 function restore(){for(const [video,saved]of snapshots){try{if(saved.changedRate&&video.playbackRate===saved.changedRate)video.playbackRate=saved.rate;if(video.muted)video.muted=saved.muted}catch{}}snapshots.clear()}
 function report(state,force=false){const now=Date.now();if(force||state!==lastState||now-lastReport>2500){lastReport=now;lastState=state;send('status',{enabled,ad:state==='ad',state,token})}}
 function visible(node){return Boolean(node&&!node.hidden&&!node.closest('[hidden],[aria-hidden="true"]')&&node.getClientRects().length&&getComputedStyle(node).display!=='none'&&getComputedStyle(node).visibility!=='hidden')}
 function inspect(){
  if(!enabled)return;
  const player=document.querySelector('#movie_player,.html5-video-player'),videos=player?[...player.querySelectorAll('video')]:[];
  const ad=Boolean(player&&(player.classList.contains('ad-showing')||player.classList.contains('ad-interrupting')||[...player.querySelectorAll('.ytp-ad-player-overlay,.ytp-ad-preview-container,.ytp-ad-skip-button-container')].some(visible)));
  if(!ad){if(lastState==='ad')awaitingPlayback=false;restore();report(!awaitingPlayback&&videos.some(video=>!video.paused&&!video.ended&&video.readyState>=2)?'content':'unknown');return}
  for(const video of videos){
   if(!snapshots.has(video))snapshots.set(video,{rate:video.playbackRate,muted:video.muted,changedRate:0});const saved=snapshots.get(video);video.muted=true;
   if(video.playbackRate<8)for(const rate of [16,8,4,2]){try{video.playbackRate=rate;if(video.playbackRate>saved.rate){saved.changedRate=video.playbackRate;break}}catch{}}
  }
  for(const skip of player.querySelectorAll('.ytp-ad-skip-button,.ytp-ad-skip-button-modern,button.ytp-skip-ad-button,.ytp-ad-skip-button-container button'))if(!skip.disabled&&skip.getAttribute('aria-disabled')!=='true'&&visible(skip)){const now=Date.now();if(now-(clicked.get(skip)||0)>750){clicked.set(skip,now);skip.click()}}
  report('ad');
 }
 function configure(value){enabled=value===true;if(!enabled){observer?.disconnect();observer=null;restore();report('unknown',true);return}if(!observer){observer=new MutationObserver(inspect);observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','aria-hidden','disabled','aria-disabled','style']})}inspect();report(lastState||'unknown',true)}
 window.addEventListener('message',event=>{
  const data=event.data;if((event.source!==window.parent&&event.source!==null)||!parents.has(event.origin)||!data||data.channel!==channel||data.version!==2)return;
  if(data.type==='probe'&&typeof data.challenge==='string'&&data.challenge.length>=16&&data.challenge.length<=80){if(challenge!==data.challenge){restore();enabled=false;token=null;awaitingPlayback=false}parentOrigin=event.origin;challenge=data.challenge;send('hello');return}
  if(event.origin!==parentOrigin||data.challenge!==challenge||data.nonce!==nonce)return;
  if(data.type==='arm'){token=data.token;awaitingPlayback=true;lastState=null}
  if(data.type==='configure'||data.type==='arm')configure(data.enabled);
 });
 for(const name of ['play','playing','loadstart','loadedmetadata','durationchange','emptied'])document.addEventListener(name,event=>{if(event.target.tagName!=='VIDEO')return;if(name==='play'||name==='playing')awaitingPlayback=false;inspect()},true);
 function start(){if(timer===null)timer=setInterval(()=>{if(!challenge)send('hello');else if(enabled)inspect();else report('unknown')},100);send('hello')}
 window.addEventListener('pagehide',()=>{clearInterval(timer);timer=null;observer?.disconnect();observer=null;restore();enabled=false;parentOrigin=null;challenge=null;token=null;lastReport=0});window.addEventListener('pageshow',start);start();
})();

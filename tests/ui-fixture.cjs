const {JSDOM,VirtualConsole}=require('jsdom');
const {indexedDB}=require('fake-indexeddb');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../dist');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fixture({config={},fetcher,videoReadyDelay=0,width=390,autoStart=true,storage={},reducedMotion=false,viewportHeight}={}){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{url:'https://echo.test/echo/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document;
 const viewportListeners=new Set(),viewport={height:viewportHeight||768,addEventListener:(name,fn)=>viewportListeners.add(fn)};if(viewportHeight)Object.defineProperty(w,'visualViewport',{value:viewport});
 const motionListeners=new Set();const motionQuery={matches:reducedMotion,addEventListener:(type,fn)=>motionListeners.add(fn),removeEventListener:(type,fn)=>motionListeners.delete(fn)};w.matchMedia=query=>query.includes('prefers-reduced-motion')?motionQuery:{matches:false,addEventListener:()=>{},removeEventListener:()=>{}};
 Object.defineProperty(w,'innerWidth',{value:width});w.indexedDB=indexedDB;w.CSS={escape:x=>x};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollTo=function(options){this.scrollTop=options.top||0};
 for(const name of ['show','showModal'])w.HTMLDialogElement.prototype[name]=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.URL.createObjectURL=()=>`blob:echo-${Math.random()}`;w.URL.revokeObjectURL=()=>{};
 const media=w.HTMLMediaElement.prototype;Object.defineProperty(media,'paused',{get(){return !this._playing}});Object.defineProperty(media,'duration',{get(){return 246}});
 media.play=function(){this._playing=true;this.dispatchEvent(new w.Event('play'));return Promise.resolve()};media.pause=function(){this._playing=false;this.dispatchEvent(new w.Event('pause'))};media.load=function(){};
 w.fetch=fetcher||(async()=>({ok:false,status:404,json:async()=>[]}));
 const videos=[];
 w.YT={Player:class{
  constructor(container,options){this.options=options;this.state=5;this.time=0;this.data={};this.playCount=0;const frame=container.tagName==='IFRAME'?container:d.createElement('iframe');frame.title='YouTube video player';if(frame!==container)container.replaceWith(frame);this.frame=frame;videos.push(this);setTimeout(()=>options.events.onReady(),videoReadyDelay)}
  cueVideoById(id){this.data={video_id:id,title:'Video title',author:'Artist'};this.state=5;this.options.events.onStateChange({data:5})}
  playVideo(){this.playCount++;this.state=3;this.options.events.onStateChange({data:3});if(autoStart)this.start()}
  loadVideoById(value){this.data={video_id:value.videoId,title:'Video title',author:'Artist'};this.time=value.startSeconds||0;this.state=5;this.options.events.onStateChange({data:5});this.playVideo()}
  start(){this.state=1;this.options.events.onStateChange({data:1})}
  pauseVideo(){this.state=2;this.options.events.onStateChange({data:2})}
  getVideoData(){return this.data}getPlayerState(){return this.state}getDuration(){return 180}getCurrentTime(){return this.time}getPlaybackRate(){return 1}setVolume(){}seekTo(time){this.time=time}destroy(){}
 }};
 for(const [key,value]of Object.entries(storage))w.localStorage.setItem('echo-'+key,['language','theme'].includes(key)?String(value):JSON.stringify(value));
 w.ECHO_CONFIG=config;
 for(const name of ['appearance.js','i18n.js','music-library.js','artwork.js','profile-photo.js','account-service.js','sheets-account-service.js','media-transport.js','player-core.js','ad-skip-bridge.js','artist-service.js','live-data.js','operation-feedback.js','admin-page.js','admin-users.js','redemption.js'])w.eval(fs.readFileSync(root+'/'+name,'utf8'));
 w.eval(fs.readFileSync(root+'/app.js','utf8').replace(/\ninit\(\);\s*$/, '\nwindow.echoAppReady=init();')+';'+fs.readFileSync(root+'/social.js','utf8')+';'+fs.readFileSync(root+'/community.js','utf8')+';'+fs.readFileSync(root+'/mobile-ui.js','utf8')+';window.echoTest={player,audio,parseLrc,cleanLyricTitle,bestLyricRecord,playYouTube,openNowPlaying,toggleLyrics,loadLyrics,showLyrics,syncLyrics,setView,getTrack,activeTrack,updateProgress,renderYouTubeResults,cloud,openChat,stopChat,chooseMusicFriend,sharedMusic,categoryForTrack,accountPanel,receiveAccount,registerCloudTrack,playTrack,setAccountMode:mode=>{accountMode=mode;accountPanel()}};');
 return {dom,w,d,errors,videos,resizeViewport(height){viewport.height=height;viewportListeners.forEach(fn=>fn())},ready:()=>w.echoAppReady,setReducedMotion(value){motionQuery.matches=value;motionListeners.forEach(fn=>fn({matches:value}))},close:()=>w.close(),click(selector){const node=d.querySelector(selector);if(!node)throw Error('Missing '+selector);node.click()},search(term){const node=d.querySelector('#music-search');node.value=term;node.dispatchEvent(new w.Event('input',{bubbles:true}));d.querySelector('#music-search-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}))}};
}
module.exports={fixture,delay};

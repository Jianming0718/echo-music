const {JSDOM,VirtualConsole}=require('jsdom'),{indexedDB}=require('fake-indexeddb'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../dist'),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fixture({config={},fetcher,width=390}={}){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{url:'https://echo.test/echo/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document;
 Object.defineProperty(w,'innerWidth',{value:width});w.indexedDB=indexedDB;w.CSS={escape:value=>value};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollTo=function(options){this.scrollTop=options.top||0};
 for(const name of ['show','showModal'])w.HTMLDialogElement.prototype[name]=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};w.URL.createObjectURL=()=>`blob:echo-${Math.random()}`;w.URL.revokeObjectURL=()=>{};
 const media=w.HTMLMediaElement.prototype;Object.defineProperty(media,'paused',{get(){return !this._playing}});Object.defineProperty(media,'duration',{get(){return 246}});media.play=function(){this._playing=true;this.dispatchEvent(new w.Event('play'));return Promise.resolve()};media.pause=function(){this._playing=false;this.dispatchEvent(new w.Event('pause'))};media.load=function(){};
 w.fetch=fetcher||(async()=>({ok:false,status:404,json:async()=>[]}));w.ECHO_CONFIG=config;
 for(const name of ['music-library.js','profile-photo.js','account-service.js','media-transport.js','player-core.js'])w.eval(fs.readFileSync(root+'/'+name,'utf8'));
 w.eval(fs.readFileSync(root+'/app.js','utf8')+';'+fs.readFileSync(root+'/social.js','utf8')+';window.echoTest={player,audio,parseLrc,cleanLyricTitle,bestLyricRecord,openNowPlaying,toggleLyrics,loadLyrics,showLyrics,syncLyrics,setView,getTrack,activeTrack,updateProgress,cloud,openChat,stopChat,chooseMusicFriend,sharedMusic,categoryForTrack,accountPanel,receiveAccount,registerCloudTrack,playTrack,setAccountMode:mode=>{accountMode=mode;accountPanel()}};');
 return{w,d,errors,close:()=>w.close(),click(selector){const node=d.querySelector(selector);if(!node)throw Error('Missing '+selector);node.click()},search(term){const node=d.querySelector('#music-search');node.value=term;node.dispatchEvent(new w.Event('input',{bubbles:true}));d.querySelector('#music-search-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}))}};
}
module.exports={fixture,delay};

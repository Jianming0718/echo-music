'use strict';
class EchoMediaTransport extends EventTarget {
  constructor(audio,{container,stage}={}) {
    super();this.element=audio;this.container=container;this.stage=stage;this.provider='audio';this.source=audio.getAttribute('src')||'';this.videoId=null;this.youtube=null;this.readyPromise=null;this.pendingPlay=null;this.generation=0;this.timer=null;this.wantVideoPlayback=false;this.videoState={paused:true,ended:false,duration:NaN,time:0,error:null,volume:audio.volume};
    for(const name of ['loadedmetadata','timeupdate','play','pause','waiting','playing','canplay','volumechange','ended','error'])audio.addEventListener(name,()=>{if(this.provider==='audio')this.dispatchEvent(new Event(name))});
  }
  get src(){return this.source}
  set src(value){
    this.generation++;this.wantVideoPlayback=false;this.rejectPending(Object.assign(new Error('Source changed'),{name:'AbortError'}));this.source=String(value);const match=this.source.match(/^youtube:([A-Za-z0-9_-]{11})$/);this.provider=match?'youtube':'audio';this.videoId=match?.[1]||null;
    if(match){this.element.pause();this.element.removeAttribute('src');this.element.load();this.videoState={paused:true,ended:false,duration:NaN,time:0,error:null,volume:this.videoState.volume};if(this.youtube)this.youtube.cueVideoById(this.videoId);this.setStage(true);this.startTimer()}
    else{if(this.youtube)this.youtube.pauseVideo();clearInterval(this.timer);this.timer=null;this.element.src=this.source;this.setStage(false)}
    this.dispatchEvent(new CustomEvent('sourcechange',{detail:{provider:this.provider,videoId:this.videoId}}));
  }
  get currentTime(){return this.provider==='youtube'?this.videoState.time:this.element.currentTime}
  set currentTime(value){if(this.provider==='youtube'){this.videoState.time=Number(value)||0;this.youtube?.seekTo(this.videoState.time,true);this.dispatchEvent(new Event('timeupdate'))}else this.element.currentTime=value}
  get duration(){return this.provider==='youtube'?this.videoState.duration:this.element.duration}
  get paused(){return this.provider==='youtube'?this.videoState.paused:this.element.paused}
  get ended(){return this.provider==='youtube'?this.videoState.ended:this.element.ended}
  get error(){return this.provider==='youtube'?this.videoState.error:this.element.error}
  get volume(){return this.provider==='youtube'?this.videoState.volume:this.element.volume}
  set volume(value){this.videoState.volume=value;this.element.volume=value;this.youtube?.setVolume(value*100);if(this.provider==='youtube')this.dispatchEvent(new Event('volumechange'))}
  get playbackRate(){return this.provider==='youtube'?(this.youtube?.getPlaybackRate?.()||1):this.element.playbackRate}
  getAttribute(name){return name==='src'?this.source:this.element.getAttribute(name)}
  removeAttribute(name){if(name==='src'){this.source='';this.pause();this.setStage(false)}this.element.removeAttribute(name)}
  load(){if(this.provider==='audio')this.element.load();else if(this.youtube){this.youtube.cueVideoById(this.videoId);this.updateVideoMetadata()}}
  setStage(visible){if(this.stage)this.stage.hidden=!visible;document.body.classList.toggle('youtube-active',visible);const link=document.querySelector('#youtube-origin-link');if(link&&this.videoId)link.href='https://www.youtube.com/watch?v='+this.videoId}
  async ready(){
    if(this.youtube)return this.youtube;if(this.readyPromise)return this.readyPromise;
    this.readyPromise=(async()=>{await EchoMediaTransport.loadAPI();return await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('YouTube 播放器未能加载，请重试。')),15000);const activate=document.querySelector('#youtube-activate');if(activate)activate.hidden=true;this.youtube=new YT.Player(this.container,{host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',playerVars:{playsinline:1,controls:1,origin:location.origin,enablejsapi:1},events:{onReady:()=>{clearTimeout(timeout);if(this.videoId)this.youtube.cueVideoById(this.videoId);this.youtube.setVolume(this.videoState.volume*100);resolve(this.youtube)},onStateChange:event=>this.onVideoState(event.data),onError:event=>{const messages={100:'该 YouTube 视频已移除或设为私密。',101:'该视频不允许嵌入播放。',150:'该视频不允许嵌入播放。',153:'YouTube 无法验证嵌入来源，请使用正常浏览器访问。'};const message=messages[event.data]||'YouTube 视频暂时无法播放。';this.videoState.error={code:4,message};this.videoState.paused=true;this.rejectPending(new Error(message));this.dispatchEvent(new Event('error'))},onAutoplayBlocked:()=>{this.wantVideoPlayback=false;this.videoState.paused=true;this.dispatchEvent(new Event('gestureblocked'));this.rejectPending(Object.assign(new Error('请点击 YouTube 播放器中的播放按钮。'),{name:'NotAllowedError'}));this.dispatchEvent(new Event('pause'))}}})})})();
    try{return await this.readyPromise}catch(error){this.readyPromise=null;this.youtube=null;throw error}
  }
  async play(){
    if(this.provider==='audio')return this.element.play();if(document.hidden)throw Object.assign(new Error('请返回页面后播放。'),{name:'NotAllowedError'});
    const generation=this.generation;this.wantVideoPlayback=true;this.videoState.paused=false;this.dispatchEvent(new Event('waiting'));this.setStage(true);const yt=await this.ready();if(generation!==this.generation||!this.wantVideoPlayback)throw Object.assign(new Error('Source changed'),{name:'AbortError'});
    if(yt.getVideoData?.()?.video_id!==this.videoId)yt.cueVideoById(this.videoId);this.videoState.ended=false;this.videoState.error=null;
    return new Promise((resolve,reject)=>{this.rejectPending(Object.assign(new Error('New playback request'),{name:'AbortError'}));const timeout=setTimeout(()=>{this.pendingPlay=null;reject(Object.assign(new Error('请点击视频中的播放按钮，或重试。'),{name:'NotAllowedError'}))},25000);this.pendingPlay={resolve:()=>{clearTimeout(timeout);this.pendingPlay=null;resolve()},reject:error=>{clearTimeout(timeout);this.pendingPlay=null;reject(error)}};yt.playVideo();if(yt.getPlayerState?.()===1)this.onVideoState(1)});
  }
  pause(){this.wantVideoPlayback=false;if(this.provider==='audio')this.element.pause();else{this.youtube?.pauseVideo();this.videoState.paused=true;this.rejectPending(Object.assign(new Error('Paused'),{name:'AbortError'}));this.dispatchEvent(new Event('pause'))}}
  rejectPending(error){this.pendingPlay?.reject(error)}
  onVideoState(state){
    if(this.provider!=='youtube')return;const id=this.youtube?.getVideoData?.()?.video_id;if(id&&id!==this.videoId)return;this.updateVideoMetadata();
    if(state===1){this.videoState.paused=false;this.videoState.ended=false;this.pendingPlay?.resolve();this.dispatchEvent(new Event('play'));this.dispatchEvent(new Event('playing'))}
    else if(state===2){this.wantVideoPlayback=false;this.videoState.paused=true;this.dispatchEvent(new Event('pause'))}
    else if(state===3)this.dispatchEvent(new Event('waiting'));
    else if(state===0&&!this.videoState.ended){this.videoState.ended=true;this.videoState.paused=true;this.dispatchEvent(new Event('ended'))}
    else if(state===5)this.dispatchEvent(new Event('canplay'));
  }
  updateVideoMetadata(){if(!this.youtube||this.provider!=='youtube')return;const duration=Number(this.youtube.getDuration?.());if(duration>0&&duration!==this.videoState.duration){this.videoState.duration=duration;this.dispatchEvent(new Event('loadedmetadata'))}const data=this.youtube.getVideoData?.();if(data?.title&&data.video_id===this.videoId)this.dispatchEvent(new CustomEvent('videometadata',{detail:{videoId:this.videoId,title:data.title,artist:data.author||'YouTube',duration:this.videoState.duration||0}}))}
  startTimer(){if(this.timer)return;this.timer=setInterval(()=>{if(this.provider!=='youtube'||!this.youtube)return;this.videoState.time=Number(this.youtube.getCurrentTime?.())||0;this.updateVideoMetadata();this.dispatchEvent(new Event('timeupdate'))},350)}
  static loadAPI(){
    if(window.YT?.Player)return Promise.resolve();if(this.apiPromise)return this.apiPromise;
    this.apiPromise=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('YouTube API 加载超时。')),15000),previous=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);if(typeof previous==='function')previous();resolve()};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.referrerPolicy='strict-origin-when-cross-origin';script.onerror=()=>{clearTimeout(timeout);reject(new Error('无法连接 YouTube，请检查网络。'))};document.head.appendChild(script)}).catch(error=>{this.apiPromise=null;throw error});return this.apiPromise;
  }
}
globalThis.EchoMediaTransport=EchoMediaTransport;

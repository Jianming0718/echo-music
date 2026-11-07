'use strict';
class EchoMediaTransport extends EventTarget {
  constructor(audio,{container,stage}={}) {
    super();this.element=audio;this.container=container;this.stage=stage;this.provider='audio';this.source=audio.getAttribute('src')||'';this.videoId=null;this.youtube=null;this.youtubeReady=false;this.readyPromise=null;this.pendingPlay=null;this.generation=0;this.playRequest=0;this.timer=null;this.wantVideoPlayback=false;this.startedVideoId=null;this.videoIssue=null;this.needsVideoLoad=true;
    this.videoState={paused:true,ended:false,duration:NaN,time:0,error:null,volume:audio.volume};
    for(const name of ['loadedmetadata','timeupdate','play','pause','waiting','playing','canplay','volumechange','ended','error'])audio.addEventListener(name,()=>{if(this.provider==='audio')this.dispatchEvent(new Event(name))});
  }
  get src(){return this.source}
  set src(value){
    this.generation++;this.playRequest++;this.wantVideoPlayback=false;this.startedVideoId=null;this.needsVideoLoad=true;
    this.rejectPending(Object.assign(new Error('Source changed'),{name:'AbortError'}));this.source=String(value);
    const match=this.source.match(/^youtube:([A-Za-z0-9_-]{11})$/);this.provider=match?'youtube':'audio';this.videoId=match?.[1]||null;this.setIssue(null);
    if(match){
      this.element.pause();this.element.removeAttribute('src');this.element.load();
      this.videoState={paused:true,ended:false,duration:NaN,time:0,error:null,volume:this.videoState.volume};this.setStage(true);this.startTimer();
    }else{
      this.youtube?.pauseVideo();clearInterval(this.timer);this.timer=null;
      if(this.source)this.element.src=this.source;else this.element.removeAttribute('src');this.setStage(false);
    }
    this.dispatchEvent(new CustomEvent('sourcechange',{detail:{provider:this.provider,videoId:this.videoId}}));
  }
  get currentTime(){return this.provider==='youtube'?this.videoState.time:this.element.currentTime}
  set currentTime(value){if(this.provider==='youtube'){this.videoState.time=Number(value)||0;this.videoState.ended=false;if(this.youtubeReady&&this.youtube.getVideoData?.()?.video_id===this.videoId)this.youtube.seekTo(this.videoState.time,true);this.dispatchEvent(new Event('timeupdate'))}else this.element.currentTime=value}
  get duration(){return this.provider==='youtube'?this.videoState.duration:this.element.duration}
  get paused(){return this.provider==='youtube'?this.videoState.paused:this.element.paused}
  get ended(){return this.provider==='youtube'?this.videoState.ended:this.element.ended}
  get error(){return this.provider==='youtube'?this.videoState.error:this.element.error}
  get volume(){return this.provider==='youtube'?this.videoState.volume:this.element.volume}
  set volume(value){this.videoState.volume=value;this.element.volume=value;if(this.youtubeReady)this.youtube.setVolume(value*100);if(this.provider==='youtube')this.dispatchEvent(new Event('volumechange'))}
  get playbackRate(){return this.provider==='youtube'?(this.youtubeReady?this.youtube.getPlaybackRate?.()||1:1):this.element.playbackRate}
  getAttribute(name){return name==='src'?this.source:this.element.getAttribute(name)}
  removeAttribute(name){if(name==='src'){this.pause();this.src=''}else this.element.removeAttribute(name)}
  load(){if(this.provider==='audio')this.element.load()}
  setStage(visible){if(this.stage)this.stage.hidden=!visible;document.body.classList.toggle('youtube-active',visible);const link=document.querySelector('#youtube-origin-link');if(link&&this.videoId)link.href='https://www.youtube.com/watch?v='+this.videoId}
  setIssue(issue){this.videoIssue=issue;this.dispatchEvent(new CustomEvent('videoissue',{detail:issue}))}
  ready(){
    if(this.readyPromise)return this.readyPromise;
    this.readyPromise=(async()=>{
      await EchoMediaTransport.loadAPI();
      return await new Promise((resolve,reject)=>{
        this.readyTimeout=setTimeout(()=>reject(new Error('YouTube 播放器加载超时，请检查网络后重试。')),15000);
        const activate=document.querySelector('#youtube-activate');if(activate)activate.hidden=true;
        const frame=document.createElement('iframe');frame.id='youtube-embed';frame.title='YouTube 视频播放器';frame.width='100%';frame.height='100%';
        frame.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen');frame.allowFullscreen=true;
        frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
        const url=new URL('https://www.youtube-nocookie.com/embed/'+this.videoId);
        for(const[key,value]of Object.entries({enablejsapi:'1',origin:location.origin,playsinline:'1',controls:'1',autoplay:'0'}))url.searchParams.set(key,value);
        frame.src=url.href;this.container.replaceChildren(frame);
        let initialized=false;
        this.youtube=new YT.Player(frame,{events:{
          onReady:()=>{clearTimeout(this.readyTimeout);initialized=true;this.youtubeReady=true;this.youtube.setVolume(this.videoState.volume*100);resolve(this.youtube)},
          onStateChange:event=>this.onVideoState(event.data),
          onError:event=>{
            if(this.provider!=='youtube')return;
            const activeId=this.youtube?.getVideoData?.()?.video_id;if(activeId&&activeId!==this.videoId)return;
            const code=Number(event.data),messages={2:'视频参数无效，请重新选择歌曲。',5:'YouTube 视频解码失败，请重试或换一个版本。',100:'视频已移除或设为私密。',101:'发布者不允许嵌入播放此视频。',150:'发布者不允许嵌入播放此视频。',153:'YouTube 无法验证网页来源，请直接在浏览器打开本站后重试。'};
            const message=(messages[code]||'YouTube 暂时无法播放此视频。')+'（YouTube '+code+'）';
            this.wantVideoPlayback=false;this.videoState.error={code:4,message};this.videoState.paused=true;this.setIssue({kind:'error',code,message});
            this.rejectPending(new Error(message));this.dispatchEvent(new Event('error'));
            if(!initialized){clearTimeout(this.readyTimeout);reject(new Error(message))}
          },
          onAutoplayBlocked:()=>this.blocked()
        }});
      });
    })();
    this.readyPromise=this.readyPromise.catch(error=>{
      clearTimeout(this.readyTimeout);this.readyPromise=null;this.youtubeReady=false;
      try{this.youtube?.destroy?.()}catch{}
      this.youtube=null;this.container.replaceChildren();throw error;
    });
    return this.readyPromise;
  }
  play(){
    if(this.provider==='audio')return this.element.play();
    if(document.hidden)return Promise.reject(Object.assign(new Error('请返回页面后播放。'),{name:'NotAllowedError'}));
    const generation=this.generation,request=++this.playRequest;this.wantVideoPlayback=true;this.setIssue(null);this.videoState.error=null;this.videoState.ended=false;this.setStage(true);
    this.dispatchEvent(new Event('waiting'));
    if(this.youtubeReady)return this.startVideo(this.youtube,generation,request);
    return this.ready().then(yt=>this.startVideo(yt,generation,request));
  }
  startVideo(yt,generation,request){
    if(generation!==this.generation||request!==this.playRequest||!this.wantVideoPlayback)return Promise.reject(Object.assign(new Error('Playback cancelled'),{name:'AbortError'}));
    this.rejectPending(Object.assign(new Error('New playback request'),{name:'AbortError'}));
    return new Promise((resolve,reject)=>{
      const pending={resolve:()=>{clearTimeout(pending.timeout);if(this.pendingPlay===pending)this.pendingPlay=null;resolve()},reject:error=>{clearTimeout(pending.timeout);if(this.pendingPlay===pending)this.pendingPlay=null;reject(error)}};
      pending.timeout=setTimeout(()=>{if(this.pendingPlay===pending)this.blocked()},15000);this.pendingPlay=pending;
      try{
        if(!this.needsVideoLoad&&yt.getVideoData?.()?.video_id===this.videoId)yt.playVideo();
        else{this.needsVideoLoad=false;yt.loadVideoById({videoId:this.videoId,startSeconds:this.videoState.time||0})}
        if(yt.getPlayerState?.()===1)this.onVideoState(1);
      }catch(error){pending.reject(error)}
    });
  }
  blocked(){
    if(this.provider!=='youtube')return;
    const message='浏览器没有允许自动开始，请点视频中的播放按钮。';
    this.wantVideoPlayback=false;this.videoState.paused=true;this.setIssue({kind:'gesture',message});
    this.rejectPending(Object.assign(new Error(message),{name:'NotAllowedError'}));
    if(this.youtubeReady)this.youtube.pauseVideo();this.dispatchEvent(new Event('gestureblocked'));this.dispatchEvent(new Event('pause'));
  }
  pause(){
    this.playRequest++;this.wantVideoPlayback=false;
    if(this.provider==='audio')this.element.pause();
    else{this.rejectPending(Object.assign(new Error('Paused'),{name:'AbortError'}));this.videoState.paused=true;this.youtubeReady&&this.youtube.pauseVideo();this.dispatchEvent(new Event('pause'))}
  }
  rejectPending(error){this.pendingPlay?.reject(error)}
  onVideoState(state){
    if(this.provider!=='youtube'||!this.youtubeReady)return;
    const id=this.youtube?.getVideoData?.()?.video_id;if(id&&id!==this.videoId)return;
    if(state===1){
      if(document.hidden){this.pause();return}
      this.videoState.paused=false;this.videoState.ended=false;this.startedVideoId=this.videoId;this.wantVideoPlayback=true;this.setIssue(null);
      this.updateVideoMetadata();this.pendingPlay?.resolve();this.dispatchEvent(new Event('play'));this.dispatchEvent(new Event('playing'));
    }else if(state===2){
      if(this.pendingPlay)return;
      this.wantVideoPlayback=false;this.videoState.paused=true;this.dispatchEvent(new Event('pause'));
    }else if(state===3){this.dispatchEvent(new Event('waiting'))}
    else if(state===0&&this.startedVideoId===this.videoId&&!this.videoState.ended&&!this.pendingPlay){this.videoState.ended=true;this.videoState.paused=true;this.dispatchEvent(new Event('ended'))}
    else if(state===5){this.updateVideoMetadata();this.dispatchEvent(new Event('canplay'))}
  }
  updateVideoMetadata(){
    if(!this.youtubeReady||this.provider!=='youtube')return;
    const data=this.youtube.getVideoData?.();if(data?.video_id!==this.videoId)return;
    const duration=Number(this.youtube.getDuration?.());if(duration>0&&duration!==this.videoState.duration){this.videoState.duration=duration;this.dispatchEvent(new Event('loadedmetadata'))}
    if(data.title)this.dispatchEvent(new CustomEvent('videometadata',{detail:{videoId:this.videoId,title:data.title,artist:data.author||'YouTube',duration:this.videoState.duration||0}}));
  }
  startTimer(){if(this.timer)return;this.timer=setInterval(()=>{if(this.provider!=='youtube'||!this.youtubeReady||this.youtube.getVideoData?.()?.video_id!==this.videoId)return;this.videoState.time=Number(this.youtube.getCurrentTime?.())||0;this.updateVideoMetadata();this.dispatchEvent(new Event('timeupdate'))},350)}
  static loadAPI(){
    if(window.YT?.Player)return Promise.resolve();if(this.apiPromise)return this.apiPromise;
    this.apiPromise=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('YouTube API 加载超时。')),15000),previous=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);if(typeof previous==='function')previous();resolve()};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.referrerPolicy='strict-origin-when-cross-origin';script.onerror=()=>{clearTimeout(timeout);reject(new Error('无法连接 YouTube，请检查网络。'))};document.head.appendChild(script)}).catch(error=>{this.apiPromise=null;throw error});return this.apiPromise;
  }
}
globalThis.EchoMediaTransport=EchoMediaTransport;

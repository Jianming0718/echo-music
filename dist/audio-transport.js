'use strict';
(() => {
  if (globalThis.ECHO_CONFIG?.playbackMode !== 'audio-only') return;
  class EchoAudioTransport extends EventTarget {
    constructor(element) {
      super();
      this.element=element;this.provider='audio';this.engine='native';this.source=element.getAttribute('src')||'';
      this.videoId=null;this.videoIssue=null;this.sourceError=null;this.generation=0;this.playRequest=0;
      for(const name of ['loadedmetadata','timeupdate','play','pause','waiting','playing','canplay','volumechange','ended','error']) {
        element.addEventListener(name,()=>{
          if(name==='error'&&this.provider==='youtube')this.setIssue({kind:'error',message:'音频暂时无法播放，请重试或选择其他版本。'});
          this.dispatchEvent(new Event(name));
        });
      }
      document.querySelector('#youtube-engine')?.remove();
      element.preload='none';
    }
    get src(){return this.source}
    set src(value){
      this.generation++;this.element.pause();this.source=String(value);this.sourceError=null;
      const match=this.source.match(/^youtube:([A-Za-z0-9_-]{11})$/);
      this.provider=match?'youtube':'audio';this.videoId=match?.[1]||null;this.setIssue(null);
      if(!match){if(this.source)this.element.src=this.source;else this.element.removeAttribute('src')}
      else {
        this.element.removeAttribute('src');
        try{
          const configured=globalThis.ECHO_CONFIG?.audioGatewayUrl;
          if(!configured)throw Error('音频服务尚未连接。');
          const endpoint=new URL(configured,location.href);
          if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password)throw Error('音频服务地址无效。');
          endpoint.search='';endpoint.hash='';endpoint.searchParams.set('v',this.videoId);
          endpoint.searchParams.set('format',this.element.canPlayType('audio/mp4')?'mp4':'webm');
          this.element.src=endpoint.href;
        }catch(error){this.sourceError={code:4,message:error.message}}
      }
      this.dispatchEvent(new CustomEvent('sourcechange',{detail:{provider:this.provider,videoId:this.videoId,engine:this.engine}}));
    }
    get currentTime(){return this.element.currentTime}
    set currentTime(value){this.element.currentTime=value}
    get duration(){return this.element.duration}
    get paused(){return this.element.paused}
    get ended(){return this.element.ended}
    get error(){return this.sourceError||this.element.error}
    get volume(){return this.element.volume}
    set volume(value){this.element.volume=value}
    get playbackRate(){return this.element.playbackRate}
    getAttribute(name){return name==='src'?this.source:this.element.getAttribute(name)}
    removeAttribute(name){if(name==='src')this.src='';else this.element.removeAttribute(name)}
    load(){this.element.load()}
    ready(){return Promise.resolve(this)}
    setIssue(issue){this.videoIssue=issue;this.dispatchEvent(new CustomEvent('videoissue',{detail:issue}))}
    play(){
      this.setIssue(null);
      if(this.sourceError){this.setIssue({kind:'error',message:this.sourceError.message});return Promise.reject(Error(this.sourceError.message))}
      const generation=this.generation,request=++this.playRequest;
      return this.element.play().catch(error=>{
        if(generation!==this.generation||request!==this.playRequest)throw Object.assign(Error('Playback cancelled'),{name:'AbortError'});
        if(error.name==='NotAllowedError'){
          this.setIssue({kind:'gesture',message:'请再点一次播放以开始音乐。'});
          throw Object.assign(Error('请再点一次播放以开始音乐。'),{name:'NotAllowedError'});
        }
        if(error.name==='AbortError')throw error;
        const message='音频暂时无法播放，请重试或选择其他版本。';
        this.setIssue({kind:'error',message});throw Error(message);
      });
    }
    pause(){this.playRequest++;this.element.pause()}
  }
  globalThis.EchoMediaTransport=EchoAudioTransport;
})();

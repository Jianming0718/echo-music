'use strict';
class EchoPlayerCore extends EventTarget {
  constructor({audio,resolveTrack,storage=null,sessionKey='echo-player-session',random=Math.random,mediaSession=null,baseURL=''}={}) {
    super();
    if(!audio||typeof resolveTrack!=='function')throw new TypeError('An audio element and a track resolver are required.');
    this.audio=audio;
    this.resolveTrack=resolveTrack;
    this.storage=storage;
    this.sessionKey=sessionKey;
    this.random=random;
    this.mediaSession=mediaSession;
    this.baseURL=baseURL;
    this.state={currentId:null,queue:[],cursor:-1,position:0,duration:0,shuffle:false,repeat:0,volume:.8,status:'idle',error:null};
    this.history=[];
    this.future=[];
    this.shuffleBag=[];
    this.priority=[];
    this.generation=0;
    this.wantPlayback=false;
    this.pendingSeek=null;
    this.switching=false;
    this.lastPersist=0;
    this.restored=false;
    this.listeners=[];
    this.actions=[];
    this.bindAudio();
    this.bindMediaSession();
  }
  getSnapshot() {
    return Object.freeze({...this.state,queue:Object.freeze([...this.state.queue]),playing:!this.audio.paused&&this.state.status!=='error'});
  }
  emit(name,detail=this.getSnapshot()) {
    this.dispatchEvent(new CustomEvent(name,{detail}));
  }
  notify(persist=true) {
    if(!this.restored)return;
    if(persist)this.persist();
    this.updateMediaSession();
    this.emit('statechange');
  }
  validIds(ids) {
    return [...new Set(Array.isArray(ids)?ids:[])].filter(id=>typeof id==='string'&&this.resolveTrack(id)?.src);
  }
  restore(fallback={}) {
    let saved=null;
    try{saved=JSON.parse(this.storage?.getItem(this.sessionKey)||'null')}catch{}
    const source=saved?.version===1?saved:fallback;
    this.state.queue=this.validIds(source.queue);
    const preferred=source.currentId??source.current;
    this.state.currentId=this.resolveTrack(preferred)?.src?preferred:this.state.queue[0]||null;
    if(!this.state.currentId){const defaultId=fallback.currentId??fallback.current;this.state.currentId=this.resolveTrack(defaultId)?.src?defaultId:null;if(Array.isArray(source.queue)&&source.queue.length)this.state.queue=this.validIds(fallback.queue)}
    this.state.cursor=this.state.queue.indexOf(this.state.currentId);
    if(this.state.cursor<0&&Number.isInteger(source.cursor))this.state.cursor=Math.max(-1,Math.min(this.state.queue.length-1,source.cursor));
    this.state.shuffle=source.shuffle===true;
    this.state.repeat=[0,1,2].includes(source.repeat)?source.repeat:0;
    this.state.volume=Math.max(0,Math.min(1,Number.isFinite(Number(source.volume))?Number(source.volume):.8));
    this.history=(Array.isArray(source.history)?source.history:[]).filter(id=>this.resolveTrack(id)?.src).slice(-100);
    this.future=(Array.isArray(source.future)?source.future:[]).filter(id=>this.resolveTrack(id)?.src).slice(-100);
    this.priority=this.validIds(source.priority).filter(id=>this.state.queue.includes(id)&&id!==this.state.currentId);
    this.shuffleBag=Array.isArray(source.shuffleBag)?this.validIds(source.shuffleBag).filter(id=>this.state.queue.includes(id)&&id!==this.state.currentId):this.makeBag();
    const duration=Number(this.resolveTrack(this.state.currentId)?.duration)||0;
    let position=Math.max(0,Number(source.position)||0);
    if(duration&&position>=duration-.5)position=0;
    this.restored=true;
    this.audio.volume=this.state.volume;
    if(this.state.currentId)this.loadCurrent(position);
    else this.notify();
    return this.getSnapshot();
  }
  persist(force=true) {
    if(!this.restored)return;
    const now=Date.now();
    if(!force&&now-this.lastPersist<5000)return;
    this.lastPersist=now;
    const data={version:1,...this.state,history:this.history.slice(-100),future:this.future.slice(-100),shuffleBag:this.shuffleBag,priority:this.priority};
    delete data.status;
    delete data.error;
    try{this.storage?.setItem(this.sessionKey,JSON.stringify(data))}catch{}
  }
  makeBag() {
    const bag=this.state.queue.filter(id=>id!==this.state.currentId);
    for(let i=bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
    return bag;
  }
  loadCurrent(position=0) {
    const track=this.resolveTrack(this.state.currentId);
    if(!track?.src)return false;
    this.generation++;
    this.wantPlayback=false;
    this.switching=true;
    this.audio.pause();
    this.state.position=position;
    this.state.duration=Number(track.duration)||0;
    this.state.status='paused';
    this.state.error=null;
    this.pendingSeek=position>0?position:null;
    this.audio.src=track.src;
    this.audio.load();
    this.switching=false;
    this.emit('trackchange');
    this.notify();
    return true;
  }
  select(id,{queue,autoplay=true,recordHistory=true,preserveFuture=false,resetShuffle=true}={}) {
    if(!this.resolveTrack(id)?.src)return false;
    const old=this.state.currentId;
    if(queue!==undefined){this.state.queue=this.validIds(queue);this.priority=[]}
    if(!this.state.queue.includes(id))this.state.queue.push(id);
    if(old&&old!==id&&recordHistory){this.history.push(old);this.history=this.history.slice(-100)}
    if(!preserveFuture)this.future=[];
    this.state.currentId=id;
    this.state.cursor=this.state.queue.indexOf(id);
    this.priority=this.priority.filter(key=>key!==id&&this.state.queue.includes(key));
    if(resetShuffle)this.shuffleBag=this.makeBag();
    else this.shuffleBag=this.shuffleBag.filter(key=>key!==id&&this.state.queue.includes(key));
    if(old!==id||queue!==undefined||this.state.status==='error'||!this.audio.getAttribute('src'))this.loadCurrent(0);
    else this.notify();
    this.emit('queuechange');
    if(autoplay)this.play();
    return true;
  }
  async play() {
    if(!this.state.currentId)return false;
    if(this.state.status==='error')this.loadCurrent(this.state.position);
    if(this.audio.ended)this.seek(0);
    this.wantPlayback=true;
    const generation=this.generation;
    this.state.error=null;
    this.state.status='loading';
    this.notify();
    try{
      await this.audio.play();
      if(generation!==this.generation||!this.wantPlayback)return false;
      this.state.status=this.audio.paused?'paused':'playing';
      this.notify();
      return !this.audio.paused;
    }catch(error){
      if(generation!==this.generation||!this.wantPlayback||error.name==='AbortError')return false;
      if(error.name==='NotAllowedError'){
        this.wantPlayback=false;
        this.state.status='paused';
        this.notify();
        this.emit('error',{kind:'gesture',message:'Tap Play to start the audio on this device.'});
        return false;
      }
      this.fail('This audio could not play. Retry or choose another song.');
      return false;
    }
  }
  pause() {
    this.wantPlayback=false;
    this.audio.pause();
    if(this.state.status!=='error')this.state.status='paused';
    this.notify();
  }
  toggle() {
    if(this.audio.paused)return this.play();
    this.pause();
    return Promise.resolve(false);
  }
  seek(seconds) {
    const value=Number(seconds);
    if(!Number.isFinite(value))return false;
    const duration=Number.isFinite(this.audio.duration)&&this.audio.duration>0?this.audio.duration:this.state.duration;
    const position=Math.max(0,duration?Math.min(duration,value):value);
    this.state.position=position;
    try{
      if(Number.isFinite(this.audio.duration)){this.audio.currentTime=position;this.pendingSeek=null}
      else this.pendingSeek=position;
    }catch{this.pendingSeek=position}
    this.persist();
    this.emit('timeupdate');
    this.updateMediaSession();
    return true;
  }
  seekBy(seconds) {
    return this.seek(this.state.position+seconds);
  }
  next({automatic=false}={}) {
    const queue=this.state.queue;
    if(!queue.length){this.finish();return false}
    const upcoming=this.priority.shift();
    if(upcoming&&queue.includes(upcoming))return this.select(upcoming,{resetShuffle:false});
    const future=this.future.pop();
    if(future&&this.resolveTrack(future))return this.select(future,{preserveFuture:true,resetShuffle:false});
    let id;
    if(this.state.shuffle){
      this.shuffleBag=this.shuffleBag.filter(key=>key!==this.state.currentId&&queue.includes(key));
      if(!this.shuffleBag.length){
        if(automatic&&this.state.repeat!==1){this.finish();return false}
        this.shuffleBag=this.makeBag();
      }
      id=this.shuffleBag.shift()||this.state.currentId;
    }else{
      const actual=queue.indexOf(this.state.currentId);
      const index=actual>=0?actual:this.state.cursor;
      if(index+1>=queue.length&&automatic&&this.state.repeat!==1){this.finish();return false}
      id=queue[(index+1)%queue.length];
    }
    return this.select(id,{resetShuffle:false});
  }
  previous() {
    if(this.state.position>3){this.seek(0);return true}
    const old=this.state.currentId;
    let id=this.history.pop();
    if(!id){const index=this.state.queue.indexOf(old);id=this.state.queue[(index-1+this.state.queue.length)%this.state.queue.length]}
    if(!id)return false;
    if(old&&id!==old)this.future.push(old);
    return this.select(id,{recordHistory:false,preserveFuture:true,resetShuffle:false});
  }
  setShuffle(enabled) {
    this.state.shuffle=Boolean(enabled);
    this.shuffleBag=this.makeBag();
    this.future=[];
    this.notify();
  }
  setRepeat(mode) {
    this.state.repeat=[0,1,2].includes(mode)?mode:0;
    this.notify();
  }
  setVolume(value) {
    const volume=Number(value);
    if(!Number.isFinite(volume))return;
    this.state.volume=Math.max(0,Math.min(1,volume));
    this.audio.volume=this.state.volume;
    this.notify();
  }
  enqueue(id,{next=false}={}) {
    if(!this.resolveTrack(id)?.src)return false;
    if(this.state.queue.includes(id)){
      if(!next||id===this.state.currentId)return false;
      this.state.queue.splice(this.state.queue.indexOf(id),1);
    }
    const index=this.state.queue.indexOf(this.state.currentId);
    if(next){this.state.queue.splice(Math.max(0,index+1),0,id);this.priority=this.priority.filter(key=>key!==id);this.priority.unshift(id)}
    else this.state.queue.push(id);
    const activeIndex=this.state.queue.indexOf(this.state.currentId);
    if(activeIndex>=0)this.state.cursor=activeIndex;
    if(this.state.shuffle&&!this.shuffleBag.includes(id)&&id!==this.state.currentId)this.shuffleBag.push(id);
    this.notify();
    this.emit('queuechange');
    return true;
  }
  moveQueue(from,to) {
    const queue=this.state.queue;
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=queue.length||to>=queue.length)return false;
    const [id]=queue.splice(from,1);
    queue.splice(to,0,id);
    const index=queue.indexOf(this.state.currentId);
    if(index>=0)this.state.cursor=index;
    this.notify();
    this.emit('queuechange');
    return true;
  }
  removeFromQueue(index) {
    if(!Number.isInteger(index)||index<0||index>=this.state.queue.length)return false;
    const [id]=this.state.queue.splice(index,1);
    this.shuffleBag=this.shuffleBag.filter(key=>key!==id);
    this.priority=this.priority.filter(key=>key!==id);
    const actual=this.state.queue.indexOf(this.state.currentId);
    if(actual>=0)this.state.cursor=actual;
    else if(id===this.state.currentId)this.state.cursor=index-1;
    else if(index<=this.state.cursor)this.state.cursor--;
    this.notify();
    this.emit('queuechange');
    return true;
  }
  clearQueue() {
    this.state.queue=[];
    this.state.cursor=-1;
    this.priority=[];
    this.shuffleBag=[];
    this.notify();
    this.emit('queuechange');
  }
  forget(id) {
    for(let index=this.state.queue.length-1;index>=0;index--)if(this.state.queue[index]===id)this.removeFromQueue(index);
    this.history=this.history.filter(key=>key!==id);
    this.future=this.future.filter(key=>key!==id);
    if(this.state.currentId===id){
      this.pause();
      this.state.currentId=this.state.queue[Math.max(0,this.state.cursor+1)]||this.state.queue[0]||null;
      this.state.cursor=this.state.queue.indexOf(this.state.currentId);
      if(this.state.currentId)this.loadCurrent();
      else{this.generation++;this.audio.removeAttribute('src');this.audio.load();this.state.position=0;this.state.duration=0;this.state.status='idle';this.emit('trackchange');this.notify()}
    }
    this.persist();
  }
  finish() {
    this.wantPlayback=false;
    this.audio.pause();
    this.state.status='ended';
    this.notify();
    this.emit('complete');
  }
  fail(message) {
    this.wantPlayback=false;
    this.state.status='error';
    this.state.error=message;
    this.audio.pause();
    this.notify();
    this.emit('error',{kind:'playback',message});
  }
  bindAudio() {
    const listen=(name,handler)=>{this.audio.addEventListener(name,handler);this.listeners.push([name,handler])};
    listen('loadedmetadata',()=>{
      if(Number.isFinite(this.audio.duration)&&this.audio.duration>0){
        this.state.duration=this.audio.duration;
        const track=this.resolveTrack(this.state.currentId);
        if(track)track.duration=this.audio.duration;
      }
      if(this.pendingSeek!==null){
        const position=this.pendingSeek;
        this.pendingSeek=null;
        this.seek(position);
      }
      this.emit('timeupdate');
      this.notify();
    });
    listen('timeupdate',()=>{
      if(this.pendingSeek===null&&Number.isFinite(this.audio.currentTime))this.state.position=this.audio.currentTime;
      this.persist(false);
      this.updateMediaSession();
      this.emit('timeupdate');
    });
    listen('play',()=>{
      if(this.switching||this.audio.paused)return;
      this.wantPlayback=true;
      this.state.status='playing';
      this.state.error=null;
      this.notify();
    });
    listen('pause',()=>{
      if(this.switching||!this.audio.paused)return;
      this.wantPlayback=false;
      if(this.state.status!=='error'&&this.state.status!=='ended')this.state.status='paused';
      this.notify();
    });
    listen('waiting',()=>{
      if(this.wantPlayback){this.state.status='buffering';this.notify(false)}
    });
    listen('playing',()=>{
      if(!this.audio.paused){this.wantPlayback=true;this.state.status='playing';this.notify()}
    });
    listen('canplay',()=>{
      if(!this.audio.paused&&this.wantPlayback)this.state.status='playing';
      else if(this.state.status!=='error')this.state.status='paused';
      this.notify();
    });
    listen('volumechange',()=>{
      if(Number.isFinite(this.audio.volume))this.state.volume=this.audio.volume;
      this.notify();
    });
    listen('ended',()=>{
      if(this.state.repeat===2){this.seek(0);this.play()}
      else this.next({automatic:true});
    });
    listen('error',()=>{
      if(this.switching||!this.state.currentId)return;
      const code=this.audio.error?.code;
      if(code===1)return;
      const message=this.audio.error?.message||(code===3?'This file could not be decoded. Try a supported audio format.':code===4?'This audio source is unavailable or unsupported. Retry or choose another song.':'The audio connection failed. Retry when you are online, or choose a song saved on your device.');
      this.fail(message);
    });
  }
  bindMediaSession() {
    if(!this.mediaSession)return;
    const handlers={
      play:()=>this.play(),
      pause:()=>this.pause(),
      previoustrack:()=>this.previous(),
      nexttrack:()=>this.next(),
      seekbackward:event=>this.seekBy(-(event.seekOffset||10)),
      seekforward:event=>this.seekBy(event.seekOffset||10),
      seekto:event=>this.seek(event.seekTime),
      stop:()=>{this.pause();this.seek(0)}
    };
    for(const[action,handler]of Object.entries(handlers)){
      try{this.mediaSession.setActionHandler(action,handler);this.actions.push(action)}catch{}
    }
  }
  updateMediaSession() {
    if(!this.mediaSession)return;
    const track=this.resolveTrack(this.state.currentId);
    const signature=track?JSON.stringify([track.id,track.title,track.artist,track.album,track.cover]):'';
    if(track&&this.mediaSignature!==signature&&typeof globalThis.MediaMetadata==='function'){
      try{
        const artwork=track.cover?[{src:new URL(track.cover,this.baseURL).href}]:[];
        this.mediaSession.metadata=new globalThis.MediaMetadata({title:track.title,artist:track.artist,album:track.album,artwork});
        this.mediaSignature=signature;
      }catch{}
    }
    try{this.mediaSession.playbackState=this.audio.paused?'paused':'playing'}catch{}
    if(this.state.duration>0&&typeof this.mediaSession.setPositionState==='function'){
      try{this.mediaSession.setPositionState({duration:this.state.duration,playbackRate:this.audio.playbackRate||1,position:Math.max(0,Math.min(this.state.duration,this.state.position))})}catch{}
    }
  }
  destroy() {
    this.persist();
    for(const[name,handler]of this.listeners)this.audio.removeEventListener(name,handler);
    for(const action of this.actions){try{this.mediaSession.setActionHandler(action,null)}catch{}}
    this.listeners=[];
    this.actions=[];
    this.generation++;
  }
}
globalThis.EchoPlayerCore=EchoPlayerCore;
if(typeof module!=='undefined'&&module.exports)module.exports=EchoPlayerCore;

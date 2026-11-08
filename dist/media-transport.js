'use strict';
class EchoMediaTransport extends EventTarget{
 constructor(element){super();this.element=element;this.provider='audio';for(const name of ['loadedmetadata','timeupdate','play','pause','waiting','playing','canplay','volumechange','ended','error'])element.addEventListener(name,()=>this.dispatchEvent(new Event(name)))}
 get src(){return this.element.src}set src(value){this.element.src=value;this.dispatchEvent(new CustomEvent('sourcechange',{detail:{provider:'audio'}}))}
 get currentTime(){return this.element.currentTime}set currentTime(value){this.element.currentTime=value}
 get duration(){return this.element.duration}get paused(){return this.element.paused}get ended(){return this.element.ended}get error(){return this.element.error}
 get volume(){return this.element.volume}set volume(value){this.element.volume=value}
 get playbackRate(){return this.element.playbackRate}
 getAttribute(name){return this.element.getAttribute(name)}removeAttribute(name){this.element.removeAttribute(name)}
 load(){this.element.load()}play(){return this.element.play()}pause(){this.element.pause()}
}
globalThis.EchoMediaTransport=EchoMediaTransport;

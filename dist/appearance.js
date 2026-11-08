'use strict';
(() => {
 const root=document.documentElement;let theme='dark',ambient=false,open=false,playing=false,current=null,generation=0,image=null;
 try{theme=localStorage.getItem('echo-theme')==='light'?'light':'dark';ambient=localStorage.getItem('echo-ambient-background')==='true'}catch{}
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')||{matches:false};
 const cache=new Map();
 function sync(){root.dataset.theme=theme;root.style.colorScheme=theme;root.dataset.ambient=ambient?'on':'off';root.dataset.ambientState=!ambient||!open?'off':!playing||document.hidden||reduced.matches?'paused':'running';const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==='light'?'#f5f7f2':'#111211';const status=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(status)status.content=theme==='light'?'default':'black-translucent'}
 function cancel(){generation++;if(image){image.onload=null;image.onerror=null;image.removeAttribute('src');image=null}}
 function applyPalette(colors){colors.forEach((color,index)=>root.style.setProperty('--ambient-'+String.fromCharCode(97+index),color))}
 function fallback(track){let hash=0;for(const char of String(track?.id||track?.title||'echo'))hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;const hue=hash%360;return [hue,(hue+55)%360,(hue+150)%360].map(value=>'hsl('+value+' 65% 50%)')}
 function sample(track){
  cancel();current=track?{id:track.id,cover:track.cover,title:track.title}:null;if(!ambient||!open||!track)return;
  const source=track.cover;if(cache.has(source)){applyPalette(cache.get(source));return}applyPalette(fallback(track));if(!source)return;
  const epoch=generation,candidate=new Image();image=candidate;candidate.crossOrigin='anonymous';
  candidate.onload=()=>{if(epoch!==generation||!ambient||!open)return;try{const canvas=document.createElement('canvas');canvas.width=24;canvas.height=24;const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return;context.drawImage(candidate,0,0,24,24);const data=context.getImageData(0,0,24,24).data,buckets=new Map();for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2];if(data[i+3]<220||Math.max(r,g,b)-Math.min(r,g,b)<18||r+g+b<70||r+g+b>715)continue;const key=[r>>5,g>>5,b>>5].join(',');const value=buckets.get(key)||{r:0,g:0,b:0,n:0};value.r+=r;value.g+=g;value.b+=b;value.n++;buckets.set(key,value)}const ranked=[...buckets.values()].sort((a,b)=>b.n-a.n).slice(0,3);if(!ranked.length)return;const colors=ranked.map(value=>'rgb('+Math.round(value.r/value.n)+' '+Math.round(value.g/value.n)+' '+Math.round(value.b/value.n)+')');while(colors.length<3)colors.push(fallback(track)[colors.length]);if(epoch!==generation)return;if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(source,colors);applyPalette(colors)}catch{}finally{if(image===candidate)image=null}};
  candidate.onerror=()=>{if(image===candidate)image=null};candidate.src=source;
 }
 function setTheme(value){theme=value==='light'?'light':'dark';try{localStorage.setItem('echo-theme',theme)}catch{}sync();document.dispatchEvent(new CustomEvent('echo:appearancechange',{detail:{theme,ambient}}))}
 function setAmbient(value){ambient=Boolean(value);try{localStorage.setItem('echo-ambient-background',String(ambient))}catch{}sync();if(ambient)sample(current);else cancel();document.dispatchEvent(new CustomEvent('echo:appearancechange',{detail:{theme,ambient}}))}
 function setNowPlaying(value,track){open=Boolean(value);sync();if(track&&(current?.id!==track.id||current?.cover!==track.cover))sample(track);else if(open&&ambient)sample(track||current);else if(!open)cancel()}
 function setTrack(track){if(current?.id!==track?.id||current?.cover!==track?.cover)sample(track)}
 function setPlayback(value){playing=Boolean(value);sync()}
 document.addEventListener('visibilitychange',sync);reduced.addEventListener?.('change',sync);
 globalThis.EchoAppearance=Object.freeze({setTheme,setAmbient,setNowPlaying,setTrack,setPlayback,get theme(){return theme},get ambient(){return ambient},get reducedMotion(){return reduced.matches}});sync();
})();

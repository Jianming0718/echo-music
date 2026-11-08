'use strict';
(() => {
 const selector='#mini-cover,#np-cover,#np-inline-cover,.collection-art img,.sidebar-playlist img,.track-main img,.sheet-cover,.sheet-track img,.video-card img,.release-card img,.music-message img,.album-card img,.artist-photo,.artist-release img,.profile-release-cover';
 const states=new WeakMap();
 function candidates(value){const first=EchoMusicLibrary.cover(value,1200);if(/^https:\/\/i\.ytimg\.com\//.test(first))return [...new Set([first,EchoMusicLibrary.cover(first,640),EchoMusicLibrary.cover(first,320),'assets/disc-cover.svg'])];return [...new Set([first,EchoMusicLibrary.cover(value,640),value,'assets/disc-cover.svg'])].filter(Boolean)}
 function fallback(image,state){if(states.get(image)!==state||state.index>=state.urls.length-1)return;state.index++;image.removeAttribute('srcset');state.last=state.urls[state.index];image.setAttribute('src',state.last)}
 function prepare(image){
  if(!image.matches(selector))return;
  const value=image.getAttribute('src');if(!value)return;let state=states.get(image);if(state?.last===value)return;
  state={urls:candidates(value),index:0,last:null};states.set(image,state);image.decoding='async';
  if(!image.dataset.artworkEvents){image.dataset.artworkEvents='1';image.addEventListener('error',()=>fallback(image,states.get(image)));image.addEventListener('load',()=>{const current=states.get(image);if(current?.last?.includes('/maxresdefault.')&&image.naturalWidth>0&&image.naturalWidth<200)fallback(image,current)})}
  const sized=[320,640,1200].map(size=>({size,url:EchoMusicLibrary.cover(value,size)}));
  if(new Set(sized.map(item=>item.url)).size>1&&!/^https:\/\/i\.ytimg\.com\//.test(value)){image.setAttribute('srcset',sized.map(item=>item.url+' '+item.size+'w').join(', '));image.setAttribute('sizes',image.id==='np-cover'?'(max-width: 640px) calc(100vw - 48px), 480px':image.matches('.video-card img,.collection-art img,.album-card img,.artist-photo,.artist-release img,.profile-release-cover')?'(max-width: 640px) 46vw, 320px':image.matches('.sheet-cover')?'200px':'64px')}
  state.last=state.urls[0];if(value!==state.last)image.setAttribute('src',state.last);
 }
 function scan(root){if(root.nodeType!==1&&root.nodeType!==9)return;if(root.matches?.(selector))prepare(root);root.querySelectorAll(selector).forEach(prepare)}
 new MutationObserver(records=>{for(const record of records)if(record.type==='attributes')prepare(record.target);else for(const node of record.addedNodes)scan(node)}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
 scan(document);
 globalThis.EchoArtwork=Object.freeze({scan,candidates});
})();

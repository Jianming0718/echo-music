'use strict';
const PREFIX='echo-shell-'+new URL(self.registration.scope).pathname+'-';
const CACHE=PREFIX+'v8';
const SHELL=['./','index.html','style.css','spotify-theme.css','minimal.css','refined.css','fonts.css','config.js','vendor/supabase.js','account-service.js','media-transport.js','player-core.js','app.js','manifest.webmanifest','assets/disc-cover.svg','assets/icon.svg','assets/icon-192.png','assets/icon-512.png','assets/hero.jpg','assets/forest.jpg','assets/sea.jpg','assets/mountain.jpg','assets/night.jpg','assets/bloom.jpg','assets/city.jpg','assets/inter-0.ttf','assets/inter-1.ttf','assets/inter-2.ttf','assets/inter-3.ttf'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.endsWith('.mp3')||url.pathname.endsWith('.zip')||url.pathname.endsWith('/config.js'))return;
 event.respondWith(fetch(request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}
  return response;
 }).catch(()=>caches.match(request).then(cached=>cached||(request.mode==='navigate'?caches.match('index.html'):Response.error()))));
});

'use strict';
const PREFIX='echo-shell-'+new URL(self.registration.scope).pathname+'-';
const CACHE=PREFIX+'v20';
const SHELL=['./','index.html','style.css','spotify-theme.css','minimal.css','refined.css','appearance.css','appearance.js','artist-service.js','admin-users.js','fonts.css','config.js','vendor/supabase.js','i18n.js','music-library.js','artwork.js','ad-skip-bridge.js','profile-photo.js','account-service.js','sheets-account-service.js','social.js','community.js','community.css','mobile-ui.js','media-transport.js','player-core.js','app.js','manifest.webmanifest','assets/disc-cover.svg','assets/fav.png','assets/brand/Echo_Darktheme.png','assets/brand/Echo_Lighttheme.png','assets/brand/Logo_Darktheme.png','assets/brand/Logo_Lighttheme.png','assets/hero.jpg','assets/forest.jpg','assets/sea.jpg','assets/mountain.jpg','assets/night.jpg','assets/bloom.jpg','assets/city.jpg','assets/inter-0.ttf','assets/inter-1.ttf','assets/inter-2.ttf','assets/inter-3.ttf'].map(path=>/\.(js|css)$/.test(path)?path+'?v=0.11.0':path);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(path=>new Request(path,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.endsWith('.mp3')||url.pathname.endsWith('.zip')||url.pathname.endsWith('.user.js')||url.pathname.endsWith('/config.js'))return;
 event.respondWith(fetch(request,{cache:'no-cache'}).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}
  return response;
 }).catch(()=>caches.match(request,{ignoreSearch:true}).then(cached=>cached||(request.mode==='navigate'?caches.match('index.html'):Response.error()))));
});

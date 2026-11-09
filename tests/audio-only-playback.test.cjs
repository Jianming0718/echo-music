const assert=require('node:assert/strict');
const {fixture,delay}=require('./ui-fixture.cjs');
const config={playbackMode:'audio-only',audioGatewayUrl:'https://echo.netlify.app/api/audio'};
let passed=0;
async function test(name,run){await run();console.log('PASS '+name);passed++}
(async()=>{
 await test('plays searched music through native audio with no iframe or YouTube API',async()=>{
  const f=fixture({config});await f.ready();f.w.echoTest.playYouTube('gdZLi9oWNZg');await delay(5);
  const {audio,player}=f.w.echoTest;assert.equal(audio.engine,'native');assert.equal(audio.provider,'youtube');
  assert.equal(player.getSnapshot().status,'playing');assert.equal(f.videos.length,0);
  assert.equal(f.d.querySelectorAll('iframe').length,0);assert.equal(f.d.querySelector('#youtube-engine'),null);
  assert.equal(f.d.querySelector('script[src*="iframe_api"]'),null);
  const source=new URL(f.d.querySelector('#audio').src);assert.equal(source.origin,'https://echo.netlify.app');assert.equal(source.searchParams.get('v'),'gdZLi9oWNZg');
  assert.equal(f.w.EchoAdHelper,undefined);f.close();
 });
 await test('calls native play synchronously in the real user gesture',async()=>{
  const f=fixture({config});await f.ready();f.w.echoTest.playYouTube('gdZLi9oWNZg');f.w.echoTest.player.pause();
  const element=f.d.querySelector('#audio'),play=element.play.bind(element);let clicking=false,calls=0;
  element.play=()=>{assert(clicking);calls++;return play()};clicking=true;
  const result=f.w.echoTest.player.play();assert.equal(calls,1);clicking=false;assert(await result);f.close();
 });
 await test('keeps seeking, volume, local audio, lyrics and room track IDs compatible',async()=>{
  const f=fixture({config});await f.ready();f.w.echoTest.playYouTube('gdZLi9oWNZg');await delay(5);
  const {audio,player}=f.w.echoTest;player.seek(45);assert.equal(audio.element.currentTime,45);
  player.setVolume(.3);assert.equal(audio.element.volume,.3);assert.equal(f.d.querySelector('#np-volume').value,'0.3');
  f.w.echoTest.openNowPlaying();assert(f.d.querySelector('#np-cover'));assert(f.d.querySelector('#lyrics-scroll'));
  assert.equal(f.w.echoTest.activeTrack().id,'youtube-gdZLi9oWNZg');
  f.w.echoTest.playTrack('sanctuary');await delay(5);assert.equal(audio.provider,'audio');assert(audio.element.src.endsWith('/assets/sanctuary.mp3'));assert(!audio.paused);assert.equal(f.videos.length,0);f.close();
 });
 await test('unconfigured gateway reports a failure and never loads an advertising fallback',async()=>{
  const f=fixture({config:{playbackMode:'audio-only'}});await f.ready();f.w.echoTest.playYouTube('gdZLi9oWNZg');await delay(5);
  assert.equal(f.w.echoTest.player.getSnapshot().status,'error');assert(!f.d.querySelector('#youtube-feedback').hidden);
  assert(f.d.querySelector('#youtube-feedback').textContent.includes('音频服务'));
  assert.equal(f.d.querySelectorAll('iframe').length,0);assert.equal(f.videos.length,0);assert(!f.d.querySelector('#youtube-feedback a'));f.close();
 });
 await test('native playback failure offers retry and a library search without switching engines',async()=>{
  const f=fixture({config});await f.ready();f.w.echoTest.playYouTube('gdZLi9oWNZg');await delay(5);
  f.d.querySelector('#audio').dispatchEvent(new f.w.Event('error'));await delay(5);
  assert.equal(f.w.echoTest.player.getSnapshot().status,'error');assert(f.d.querySelector('#youtube-retry'));assert(f.d.querySelector('#youtube-other-version'));
  f.click('#youtube-retry');await delay(5);assert.equal(f.w.echoTest.player.getSnapshot().status,'playing');assert(f.d.querySelector('#youtube-feedback').hidden);
  assert.equal(f.videos.length,0);f.close();
 });
 await test('autoplay rejection stays paused and a later physical click can retry',async()=>{
  const f=fixture({config});await f.ready();const element=f.d.querySelector('#audio'),play=element.play.bind(element);
  element.play=()=>Promise.reject(Object.assign(Error('blocked'),{name:'NotAllowedError'}));f.w.echoTest.playYouTube('gdZLi9oWNZg');await delay(5);
  assert.equal(f.w.echoTest.player.getSnapshot().status,'paused');assert(f.d.querySelector('#youtube-feedback').textContent.includes('播放'));
  element.play=play;assert(await f.w.echoTest.player.play());assert.equal(f.videos.length,0);f.close();
 });
 await test('late failures from a previous song cannot overwrite the new song or its feedback',async()=>{
  const f=fixture({config});await f.ready();const element=f.d.querySelector('#audio'),play=element.play.bind(element);let reject;
  element.play=()=>new Promise((_resolve,fail)=>reject=fail);f.w.echoTest.playYouTube('gdZLi9oWNZg');
  element.play=play;f.w.echoTest.playYouTube('c6ASQOwKkhk');await delay(5);reject(Object.assign(Error('old failure'),{name:'NotAllowedError'}));await delay(5);
  assert.equal(f.w.echoTest.player.getSnapshot().currentId,'youtube-c6ASQOwKkhk');assert.equal(f.w.echoTest.player.getSnapshot().status,'playing');assert(f.d.querySelector('#youtube-feedback').hidden);f.close();
 });
 await test('restores saved YouTube IDs without rewriting favorites or creating video players',async()=>{
  const id='youtube-HaEYUJ2aRHs',saved={id,provider:'youtube',remote:true,title:'Saved',artist:'BTS',disabledSource:true};
  const f=fixture({config,storage:{'online-tracks':[saved],likes:[id],playlists:[{id:'mine',title:'Mine',ids:[id]}],current:id,queue:[id]}});
  await f.ready();assert.equal(f.w.echoTest.getTrack(id).src,'youtube:HaEYUJ2aRHs');f.click('[data-view="liked"]');assert(f.d.querySelector('[data-play="'+id+'"]'));
  f.click('[data-play="'+id+'"]');await delay(5);assert.equal(f.w.echoTest.player.getSnapshot().currentId,id);assert.equal(f.videos.length,0);assert.deepEqual(f.errors,[]);f.close();
 });
 console.log(passed+' audio-only playback scenarios passed.');
})().catch(error=>{console.error(error);process.exit(1)});

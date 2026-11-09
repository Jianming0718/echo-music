import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResolver, selectAudio, evaluatePlayer, readWatchVisitor } from '../services/audio-gateway/resolver.mjs';

const id='c6ASQOwKkhk';
const format=overrides=>({has_audio:true,has_video:false,mime_type:'audio/mp4; codecs="mp4a.40.2"',bitrate:128000,url:'https://r1.googlevideo.com/videoplayback?expire=9999999999',...overrides});
const info=formats=>({basic_info:{},playability_status:{status:'OK'},streaming_data:{adaptive_formats:formats}});
const playable=overrides=>format({decipher:async()=>format().url,...overrides});

test('selects original audio-only AAC and excludes DRM, video, dubbing and streaming fragments',()=>{
 const audio=format({is_original:true});
 assert.equal(selectAudio([format({has_video:true}),format({drm_families:['x']}),format({is_type_otf:true}),format({is_dubbed:true}),format({bitrate:160000}),audio],'mp4'),audio);
 assert.throws(()=>selectAudio([format({mime_type:'video/mp4'})],'mp4'));
 assert.throws(()=>selectAudio([format()],'webm'));
});

test('coalesces extraction, expires cached URLs and explicitly refreshes',async()=>{
 let count=0,time=1000,release;
 const gate=new Promise(resolve=>release=resolve);
 const resolver=createResolver({now:()=>time,makeSession:async()=>({session:{},getBasicInfo:async()=>{count++;await gate;return info([playable()])}})});
 const first=resolver.resolve(id),second=resolver.resolve(id);release();assert.equal(await first,await second);assert.equal(count,1);
 await resolver.resolve(id);assert.equal(count,1);time+=120001;await resolver.resolve(id);assert.equal(count,2);
 await resolver.resolve(id,'mp4',{fresh:true});assert.equal(count,3);
});

test('uses only the visitor-backed client rather than a known broken automatic fallback',async()=>{
 const clients=[];const resolver=createResolver({makeSession:async()=>({session:{},getBasicInfo:async(_id,{client})=>{clients.push(client);if(client==='VISIONOS')throw Error('unavailable');return info([playable()])}})});
 await assert.rejects(resolver.resolve(id));
 assert.deepEqual(clients,['VISIONOS']);
});

test('never caches a failed extraction and retries only bounded client options',async()=>{
 let count=0;const resolver=createResolver({makeSession:async()=>({session:{},getBasicInfo:async()=>{count++;throw Error('blocked')}})});
 await assert.rejects(resolver.resolve(id));assert.equal(count,1);await assert.rejects(resolver.resolve(id));assert.equal(count,2);
 await assert.rejects(resolver.resolve('invalid'));assert.equal(count,2);
});

test('reports a required source login without including URLs in diagnostic messages',async()=>{
 const events=[];const resolver=createResolver({report:event=>events.push(event),makeProof:async()=>({mint:async()=>{throw Error('unavailable')}}),makeSession:async()=>({session:{},getBasicInfo:async()=>({...info([]),playability_status:{status:'LOGIN_REQUIRED',reason:'Sign in at https://example.com/private'}})})});
 await assert.rejects(resolver.resolve(id),error=>error.code==='SOURCE_VERIFICATION_REQUIRED');
 assert.equal(events.filter(event=>event.stage==='playability').length,1);assert.equal(events[0].stage,'playability');assert(!events[0].reason.includes('https:'));
});

test('binds an anonymous proof to the requested song and keeps it out of diagnostics',async()=>{
 const requests=[],events=[];let minters=0;
 const resolver=createResolver({report:event=>events.push(event),makeProof:async()=>{minters++;return {mint:async videoId=>{assert.equal(videoId,id);return 'proof_for_this_song_only'}}},makeSession:async()=>({session:{},getBasicInfo:async(_id,options)=>{
  requests.push(options);return options.client==='VISIONOS'?{...info([]),playability_status:{status:'UNPLAYABLE',reason:'Sign in to confirm you are not a bot'}}:info([playable()]);
 }})});
 const result=await resolver.resolve(id);
 assert.equal(new URL(result.url).searchParams.get('pot'),'proof_for_this_song_only');
 assert.equal(requests[1].client,'YTMUSIC');assert.equal(requests[1].po_token,undefined);assert.equal(minters,1);
 assert(!JSON.stringify(events).includes('proof_for_this_song_only'));
});

test('reads and decodes bounded real visitor data and fails closed on blocked or absent sessions',async()=>{
 const value='Cgtest_visitor-123%3D';
 assert.equal(await readWatchVisitor(new Response('ytcfg.set({"VISITOR_DATA":'+JSON.stringify(value)+'})')),value);
 let version;
 assert.equal(await readWatchVisitor(new Response('ytcfg.set({"INNERTUBE_CLIENT_VERSION":"1.20261109.01.00","VISITOR_DATA":'+JSON.stringify(value)+'})'),{onVersion:value=>version=value}),value);
 assert.equal(version,'1.20261109.01.00');
 await assert.rejects(readWatchVisitor(new Response('blocked',{status:403})),error=>error.code==='SOURCE_BLOCKED');
 await assert.rejects(readWatchVisitor(new Response('no session')));
 await assert.rejects(readWatchVisitor(new Response('"VISITOR_DATA":"https://private.example/"')));
});

test('rejects live content and unsafe or expired stream addresses',async()=>{
 for(const result of [{...info([playable()]),basic_info:{is_live:true}},info([playable({decipher:async()=>'https://127.0.0.1/videoplayback'})]),info([playable({decipher:async()=>'https://r1.googlevideo.com/videoplayback?expire=1'})])]){
  const resolver=createResolver({makeSession:async()=>({session:{},getBasicInfo:async()=>result})});await assert.rejects(resolver.resolve(id));
 }
});

test('player script evaluation has no Node environment or network access',async()=>{
 const value=await evaluatePlayer({output:'({n: "valid", processType: typeof process, fetchType: typeof fetch, requireType: typeof require})'});
 assert.deepEqual(value,{n:'valid',processType:'undefined',fetchType:'undefined',requireType:'undefined'});
 await assert.rejects(evaluatePlayer({output:'throw Error("failed")'}));
 await assert.rejects(evaluatePlayer({output:'while (true) {}'}));
});

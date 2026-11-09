import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResolver, selectAudio, evaluatePlayer } from '../services/audio-gateway/resolver.mjs';

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

test('falls back to a second client when format extraction fails',async()=>{
 const clients=[];const resolver=createResolver({makeSession:async()=>({session:{},getBasicInfo:async(_id,{client})=>{clients.push(client);if(client==='VISIONOS')throw Error('unavailable');return info([playable()])}})});
 assert((await resolver.resolve(id)).url.includes('.googlevideo.com'));
 assert.deepEqual(clients,['VISIONOS','ANDROID_VR']);
});

test('never caches a failed extraction and retries only bounded client options',async()=>{
 let count=0;const resolver=createResolver({makeSession:async()=>({session:{},getBasicInfo:async()=>{count++;throw Error('blocked')}})});
 await assert.rejects(resolver.resolve(id));assert.equal(count,2);await assert.rejects(resolver.resolve(id));assert.equal(count,4);
 await assert.rejects(resolver.resolve('invalid'));assert.equal(count,4);
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

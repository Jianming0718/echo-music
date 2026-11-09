import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEdgeProbe} from '../services/audio-gateway/edge-probe.mjs';
const url='https://echo.test/api/audio/edge-probe?v=c6ASQOwKkhk';
test('rejects non-test songs, arbitrary proxy input and writes before requesting a source',async()=>{
 let calls=0;const probe=createEdgeProbe({fetcher:async()=>{calls++;throw Error()}});
 for(const value of [url+'&url=https://example.com',url.replace('c6ASQOwKkhk','aaaaaaaaaaa'),url+'&profile=constructor',url+'&profile=ios&profile=visionos',url+'&v=gdZLi9oWNZg'])assert.equal((await probe(new Request(value))).status,400);
 assert.equal((await probe(new Request(url,{method:'POST'}))).status,405);assert.equal(calls,0);
});
test('reports an upstream verification requirement without leaking visitor data or links',async()=>{
 let calls=0;const probe=createEdgeProbe({fetcher:async()=>++calls===1?new Response('"VISITOR_DATA":"private-visitor"'):Response.json({playabilityStatus:{status:'LOGIN_REQUIRED',reason:'Verify at https://example.com/private'}})});
 const response=await probe(new Request(url)),data=await response.json();
 assert.equal(data.sourceStatus,'LOGIN_REQUIRED');assert.equal(data.sourceReason,'Verify at [url]');assert(!JSON.stringify(data).includes('private-visitor'));assert.equal(data.playbackVerified,false);
});
test('checks real byte/range response shape and coalesces public test requests',async()=>{
 let calls=0;const probe=createEdgeProbe({fetcher:async(input,options)=>{
  calls++;
  if(calls===1)return new Response('"VISITOR_DATA":"visitor-data"');
  if(calls===2)return Response.json({playabilityStatus:{status:'OK'},streamingData:{adaptiveFormats:[{mimeType:'audio/mp4',url:'https://r1.googlevideo.com/videoplayback?secret=signed'}]}});
  assert.equal(options.headers.Range,'bytes=0-4095');const bytes=new Uint8Array(64);bytes.set(new TextEncoder().encode('ftyp'),4);
  return new Response(bytes,{status:206,headers:{'Content-Type':'audio/mp4','Content-Range':'bytes 0-63/100'}});
 }});
 const replies=await Promise.all([probe(new Request(url)),probe(new Request(url))]);
 for(const response of replies){const data=await response.json();assert(data.validAudioRange);assert.equal(data.playbackVerified,false);assert(!JSON.stringify(data).includes('signed'))}
 assert.equal(calls,3);
});
test('isolates profile caches and sends embedded and device contexts to fixed upstreams',async()=>{
 const requests=[];const probe=createEdgeProbe({fetcher:async(input,options)=>{
  if(!options.method)return new Response('"VISITOR_DATA":"private-visitor","STS":20450');
  requests.push({url:input,headers:options.headers,body:JSON.parse(options.body)});
  return Response.json({playabilityStatus:{status:'UNPLAYABLE',reason:'Sign in to confirm you are not a bot'}});
 }});
 const expected=[['web-embedded','56','WEB_EMBEDDED_PLAYER'],['tv-embedded','85','TVHTML5_SIMPLY_EMBEDDED_PLAYER'],['ios','5','iOS'],['visionos-current','101','VISIONOS']];
 for(const [profile,id,name] of expected){
  for(let retry=0;retry<2;retry++){
   const data=await(await probe(new Request(url+'&profile='+profile))).json();assert.equal(data.probeVersion,2);assert.equal(data.profile,profile);assert.equal(data.playbackVerified,false);
  }
  const request=requests.at(-1);assert.equal(request.headers['X-Youtube-Client-Name'],id);assert.equal(request.body.context.client.clientName,name);assert.equal(request.body.playbackContext.contentPlaybackContext.signatureTimestamp,20450);
  assert.equal(new URL(request.url).hostname,profile==='visionos-current'?'music.youtube.com':'www.youtube.com');
  if(profile.endsWith('embedded')){assert.equal(request.body.context.client.clientScreen,'EMBED');assert(request.body.context.thirdParty.embedUrl.startsWith('https://'))}
 }
 assert.equal(requests.length,4);
});

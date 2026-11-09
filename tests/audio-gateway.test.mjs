import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudioHandler } from '../services/audio-gateway/handler.mjs';
import { AudioError } from '../services/audio-gateway/errors.mjs';

const origin='https://jianming0718.github.io', endpoint='https://echo.netlify.app/api/audio?v=c6ASQOwKkhk';
const media='https://r1---sn-test.googlevideo.com/videoplayback?expire=9999999999';
const stream=(body='music',status=200,headers={})=>new Response(body,{status,headers:{'Content-Type':'audio/mp4',...headers}});
function fixture({fetcher=async()=>stream(),resolve=async()=>({url:media}),...options}={}){
 const calls=[],resolves=[];
 const handle=createAudioHandler({origins:[origin],resolver:{resolve:async(...args)=>{resolves.push(args);return resolve(...args)}},fetcher:async(...args)=>{calls.push(args);return fetcher(...args)},...options});
 return {calls,resolves,handle,request:(headers={},url=endpoint,method='GET')=>handle(new Request(url,{method,headers:{Origin:origin,...headers}}))};
}

test('forwards actual audio bytes and CORS without upstream cookies or cache',async()=>{
 const f=fixture({fetcher:async()=>stream('music',200,{'Set-Cookie':'private=x','Content-Length':'5'})});
 const response=await f.request({Cookie:'account=private',Authorization:'Bearer private'});
 assert.equal(response.status,200);assert.equal(await response.text(),'music');
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
 assert.equal(response.headers.get('Content-Length'),'5');assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.equal(response.headers.get('Set-Cookie'),null);
 assert.equal(f.calls[0][1].headers.get('Cookie'),null);assert.equal(f.calls[0][1].headers.get('Authorization'),null);
 assert.equal(f.calls[0][1].headers.get('Range'),'bytes=0-');
});

test('preserves partial content for Safari seeking and suffix ranges',async()=>{
 const f=fixture({fetcher:async()=>stream('ic',206,{'Content-Range':'bytes 3-4/5','Content-Length':'2'})});
 for(const range of ['bytes=3-4','bytes=-2']){
  const response=await f.request({Range:range});assert.equal(response.status,206);
  assert.equal(response.headers.get('Content-Range'),'bytes 3-4/5');assert.equal(await response.text(),'ic');
  assert.equal(f.calls.at(-1)[1].headers.get('Range'),range);
 }
});

test('converts a complete upstream range into a valid full response',async()=>{
 const f=fixture({fetcher:async()=>stream('music',206,{'Content-Range':'bytes 0-4/5','Content-Length':'5'})});
 const response=await f.request();assert.equal(response.status,200);assert.equal(response.headers.get('Content-Range'),null);assert.equal(await response.text(),'music');
});

test('rejects silently truncated full requests and ignored seek ranges',async()=>{
 const f=fixture({fetcher:async()=>stream('mu',206,{'Content-Range':'bytes 0-1/5'})});
 assert.equal((await f.request()).status,502);
 const g=fixture();assert.equal((await g.request({Range:'bytes=3-4'})).status,502);
});

test('rejects arbitrary URLs, invalid identifiers, formats and ranges before resolving',async()=>{
 const f=fixture();
 for(const query of ['v=short','v=c6ASQOwKkhk&url=https://example.com','v=c6ASQOwKkhk&format=html'])assert.equal((await f.request({},'https://echo.netlify.app/api/audio?'+query)).status,400);
 for(const range of ['bytes=2-1','bytes=-0','bytes=0-1,3-4','bytes=9007199254740992-','bytes=-','items=0-1'])assert.equal((await f.request({Range:range})).status,416);
 assert.equal(f.resolves.length,0);assert.equal(f.calls.length,0);
});

test('rejects untrusted origins and supports the real media preflight',async()=>{
 const f=fixture();assert.equal((await f.request({Origin:'https://other.test'})).status,403);
 const response=await f.request({},endpoint,'OPTIONS');assert.equal(response.status,204);
 assert.equal(response.headers.get('Access-Control-Allow-Headers'),'Range');assert.equal(f.resolves.length,0);
 assert.equal((await f.request({},endpoint,'POST')).status,405);
});

test('does not fetch arbitrary media hosts or a redirect to a private network',async()=>{
 for(const url of ['https://127.0.0.1/videoplayback','https://googlevideo.com.evil.test/videoplayback','http://r1.googlevideo.com/videoplayback','https://r1.googlevideo.com:123/videoplayback']){
  const f=fixture({resolve:async()=>({url})});assert.equal((await f.request()).status,502);assert.equal(f.calls.length,0);
 }
 const f=fixture({fetcher:async()=>new Response(null,{status:302,headers:{Location:'https://169.254.169.254/latest/meta-data/'}})});
 assert.equal((await f.request()).status,502);assert.equal(f.calls.length,1);
});

test('follows only validated media redirects and terminates redirect loops',async()=>{
 let count=0;const f=fixture({fetcher:async()=>++count===1?new Response(null,{status:302,headers:{Location:media+'&next=1'}}):stream()});
 assert.equal((await f.request()).status,200);assert.equal(count,2);
 const loop=fixture({fetcher:async()=>new Response(null,{status:302,headers:{Location:media}})});
 assert.equal((await loop.request()).status,502);assert.equal(loop.calls.length,4);
});

test('refreshes an expired or blocked URL once, and fails without an iframe fallback',async()=>{
 let count=0;const f=fixture({fetcher:async()=>++count===1?new Response('blocked',{status:403}):stream()});
 assert.equal((await f.request()).status,200);assert.equal(f.resolves.length,2);assert(f.resolves[1][2].fresh);
 const blocked=fixture({fetcher:async()=>new Response('secret upstream details',{status:403})});
 const response=await blocked.request();assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'SOURCE_BLOCKED'});assert.equal(blocked.calls.length,2);
});

test('rejects HTML, wrong audio formats and malformed partial responses',async()=>{
 for(const headers of [{'Content-Type':'text/html'},{'Content-Type':'video/mp4'},{'Content-Type':'audio/webm'}]){
  const f=fixture({fetcher:async()=>new Response('not music',{headers})});assert.equal((await f.request()).status,502);
 }
 const f=fixture({fetcher:async()=>stream('music',206)});assert.equal((await f.request({Range:'bytes=0-1'})).status,502);
});

test('preserves upstream unsatisfiable range totals',async()=>{
 const f=fixture({fetcher:async()=>new Response(null,{status:416,headers:{'Content-Range':'bytes */5'}})});
 const response=await f.request({Range:'bytes=10-20'});assert.equal(response.status,416);assert.equal(response.headers.get('Content-Range'),'bytes */5');
});

test('HEAD checks carry range metadata and have no body',async()=>{
 const f=fixture({fetcher:async()=>new Response(null,{status:206,headers:{'Content-Type':'audio/mp4','Content-Range':'bytes 0-1/5','Content-Length':'2'}})});
 const response=await f.request({Range:'bytes=0-1'},endpoint,'HEAD');assert.equal(response.status,206);assert.equal(await response.text(),'');assert.equal(f.calls[0][1].method,'HEAD');
});

test('health is service readiness and never reports playback as verified',async()=>{
 const f=fixture();const response=await f.request({},'https://echo.netlify.app/api/audio/health');
 assert.equal((await response.json()).playbackVerified,false);assert.equal(f.resolves.length,0);
});

test('rate limits active clients and reopens the budget next minute',async()=>{
 let time=60000;const f=fixture({now:()=>time});
 for(let i=0;i<120;i++)assert.equal((await f.request()).status,200);
 const denied=await f.request();assert.equal(denied.status,429);assert.equal(denied.headers.get('Retry-After'),'60');
 time+=60000;assert.equal((await f.request()).status,200);
});

test('forwards client cancellation and sanitizes internal failures',async()=>{
 const controller=new AbortController();let upstreamSignal;
 const f=fixture({fetcher:async(_url,options)=>{upstreamSignal=options.signal;controller.abort();throw Object.assign(Error('cancelled'),{name:'AbortError'})}});
 assert.equal((await f.handle(new Request(endpoint,{signal:controller.signal}))).status,504);assert(upstreamSignal.aborted);
 const g=fixture({resolve:async()=>{throw Error('private details')}});assert.deepEqual(await (await g.request()).json(),{error:'SOURCE_UNAVAILABLE'});
 const h=fixture({resolve:async()=>{throw new AudioError('AUDIO_FORMAT_UNAVAILABLE',422)}});assert.equal((await h.request()).status,422);
});

test('times out stalled extraction without returning an advertising player',async()=>{
 const f=fixture({resolve:()=>new Promise(()=>{}),resolveTimeoutMs:10});
 const response=await f.request();assert.equal(response.status,504);assert.deepEqual(await response.json(),{error:'AUDIO_TIMEOUT'});assert.equal(f.calls.length,0);
});

test('rejects a response above the hosting streaming size limit',async()=>{
 const f=fixture({fetcher:async()=>stream('music',200,{'Content-Length':String(21*1024*1024)})});
 const response=await f.request();assert.equal(response.status,413);assert.deepEqual(await response.json(),{error:'AUDIO_RESPONSE_TOO_LARGE'});
});

test('returns bounded public source reasons while excluding credentials and internal details',async()=>{
 const f=fixture({resolve:async()=>{throw new AudioError('SOURCE_VERIFICATION_REQUIRED',503,{
  sourceStatus:'LOGIN_REQUIRED',sourceReason:'Open https://example.test/private to verify',
  verificationError:'SOURCE_PROOF_CHALLENGE_FAILED',token:'private-token',stack:'private-stack'
 })}});
 const response=await f.request(),body=await response.json();
 assert.equal(response.status,503);assert.equal(body.sourceStatus,'LOGIN_REQUIRED');
 assert.equal(body.sourceReason,'Open [url] to verify');assert.equal(body.verificationError,'SOURCE_PROOF_CHALLENGE_FAILED');
 assert(!JSON.stringify(body).includes('private-token'));assert(!JSON.stringify(body).includes('private-stack'));
});

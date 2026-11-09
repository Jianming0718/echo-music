const SONGS=new Set(['c6ASQOwKkhk','gdZLi9oWNZg']);
const AGENT='Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
async function readLimited(response,limit){
  const reader=response.body?.getReader();if(!reader)return new Uint8Array();
  const parts=[];let length=0;
  try{
    while(length<limit){const {done,value}=await reader.read();if(done)break;const part=value.subarray(0,limit-length);parts.push(part);length+=part.length;}
  }finally{await reader.cancel().catch(()=>{})}
  const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}return bytes;
}
export function createEdgeProbe({fetcher=fetch,now=Date.now}={}){
  const cache=new Map(),pending=new Map();
  const get=(url,options={})=>fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(10000)});
  async function run(id){
    const watch=await get('https://music.youtube.com/watch?v='+id,{headers:{'User-Agent':AGENT,'Accept-Language':'en-US,en;q=0.9'}});
    if(!watch.ok){await watch.body?.cancel();return {stage:'watch',upstreamStatus:watch.status,playbackVerified:false}}
    const html=new TextDecoder().decode(await readLimited(watch,1024*1024));
    const visitor=/"VISITOR_DATA"\s*:\s*("(?:[^"\\]|\\.)+")/.exec(html);
    if(!visitor)return {stage:'session',error:'NO_VISITOR',playbackVerified:false};
    const response=await get('https://music.youtube.com/youtubei/v1/player?prettyPrint=false',{
      method:'POST',headers:{'Content-Type':'application/json','User-Agent':AGENT,'Origin':'https://music.youtube.com','Referer':'https://music.youtube.com/','X-Youtube-Client-Name':'101','X-Youtube-Client-Version':'0.1'},
      body:JSON.stringify({videoId:id,context:{client:{clientName:'VISIONOS',clientVersion:'0.1',deviceMake:'Apple',deviceModel:'RealityDevice14,1',osName:'VISION_OS',osVersion:'1.3',hl:'en',gl:'US',visitorData:JSON.parse(visitor[1]),userAgent:AGENT,platform:'MOBILE'}},contentCheckOk:true,racyCheckOk:true})
    });
    if(!response.ok){await response.body?.cancel();return {stage:'player',upstreamStatus:response.status,playbackVerified:false}}
    const bytes=await readLimited(response,1024*1024);
    let data;try{data=JSON.parse(new TextDecoder().decode(bytes))}catch{return {stage:'player',error:'INVALID_RESPONSE',playbackVerified:false}}
    const status=data.playabilityStatus?.status,reason=String(data.playabilityStatus?.reason||'').slice(0,200).replace(/https?:\/\/\S+/g,'[url]');
    if(status!=='OK')return {stage:'player',sourceStatus:status||'UNKNOWN',sourceReason:reason,playbackVerified:false};
    const formats=(data.streamingData?.adaptiveFormats||[]).filter(format=>typeof format.mimeType==='string'&&format.mimeType.startsWith('audio/mp4'));
    const selected=formats.find(format=>typeof format.url==='string');
    if(!selected)return {stage:'format',audioFormats:formats.length,directAudio:false,playbackVerified:false};
    let url;try{url=new URL(selected.url)}catch{return {stage:'format',error:'INVALID_URL',playbackVerified:false}}
    if(url.protocol!=='https:'||!url.hostname.endsWith('.googlevideo.com')||url.port||url.username||url.password||url.pathname!=='/videoplayback')return {stage:'format',error:'INVALID_HOST',playbackVerified:false};
    const media=await get(url.href,{headers:{Range:'bytes=0-4095','User-Agent':AGENT}});
    const type=media.headers.get('Content-Type')||'',range=media.headers.get('Content-Range')||'';
    const sample=await readLimited(media,4096);
    const valid=media.status===206&&type.startsWith('audio/mp4')&&sample.length>32&&new TextDecoder().decode(sample.subarray(0,64)).includes('ftyp')&&/^bytes 0-\d+\/\d+$/.test(range);
    return {stage:'media',upstreamStatus:media.status,contentType:type,bytes:sample.length,validAudioRange:valid,playbackVerified:false};
  }
  return async request=>{
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
    if(request.method!=='GET')return new Response(JSON.stringify({error:'METHOD_NOT_ALLOWED'}),{status:405,headers});
    const url=new URL(request.url),id=url.searchParams.get('v');
    if(!SONGS.has(id)||[...url.searchParams.keys()].some(key=>key!=='v'))return new Response(JSON.stringify({error:'INVALID_TEST_SONG'}),{status:400,headers});
    try{
      let hit=cache.get(id);
      if(!hit||hit.expiresAt<=now()){
        let work=pending.get(id);if(!work){work=run(id).then(value=>{const item={value,expiresAt:now()+30000};cache.set(id,item);return item}).finally(()=>pending.delete(id));pending.set(id,work)}
        hit=await work;
      }
      return new Response(JSON.stringify({service:'echo-edge-probe',...hit.value}),{headers});
    }catch(error){return new Response(JSON.stringify({error:error.name==='TimeoutError'?'UPSTREAM_TIMEOUT':'PROBE_UNAVAILABLE',playbackVerified:false}),{status:503,headers})}
  };
}

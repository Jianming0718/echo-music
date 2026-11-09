import { createResolver } from '../services/audio-gateway/resolver.mjs';
import { createAudioHandler } from '../services/audio-gateway/handler.mjs';

const target=process.argv[2];
if(!target)throw Error('Usage: npm run audio:probe -- https://YOUR-NETLIFY-SITE.netlify.app or --local');
const local=target==='--local';
const handler=local?createAudioHandler({resolver:createResolver()}):null;
const base=local?'https://local.invalid/api/audio':new URL('/api/audio',target).href;
let failures=0;
for(const id of ['c6ASQOwKkhk','gdZLi9oWNZg']){
 const start=Date.now();
 try{
  const url=new URL(base);url.searchParams.set('v',id);url.searchParams.set('format','mp4');
  const request=new Request(url,{headers:{Range:'bytes=0-4095'},signal:AbortSignal.timeout(45000)});
  const response=local?await handler(request):await fetch(request);
  const type=response.headers.get('Content-Type')||'';
  if(response.status!==206||!type.startsWith('audio/mp4')){
   const error=await response.json().catch(()=>({error:'INVALID_AUDIO_RESPONSE'}));
   console.log(JSON.stringify({id,ok:false,status:response.status,code:error.error||'INVALID_AUDIO_RESPONSE',ms:Date.now()-start}));failures++;continue;
  }
  const data=new Uint8Array(await response.arrayBuffer());
  const marker=new TextDecoder('latin1').decode(data.slice(0,64));
  const ok=data.length>32&&data.length<=4096&&/ftyp/.test(marker)&&/^bytes 0-\d+\/\d+$/.test(response.headers.get('Content-Range')||'');
  console.log(JSON.stringify({id,ok,status:response.status,bytes:data.length,type,ms:Date.now()-start}));
  if(!ok)failures++;
 }catch(error){console.log(JSON.stringify({id,ok:false,code:error.name,ms:Date.now()-start}));failures++;}
}
process.exitCode=failures?1:0;

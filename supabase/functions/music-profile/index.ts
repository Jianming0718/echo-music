import {searchMusic} from '../youtube-search/music.mjs';
import {artistIdPattern,releaseIdPattern,parseArtist,parseRelease,normalize,sameArtist,browse,enrichDates} from './profile.mjs';
const origins=new Set(['https://jianming0718.github.io','https://echo-music-free-player.stablepeace1.chatgpt.site','http://localhost:8000','http://127.0.0.1:8000']);
const cache=new Map<string,{until:number,data:unknown}>(),keys=new Map<string,number>(),limits=new Map<string,{until:number,count:number}>();
function limited(id:string,max:number){const now=Date.now();if(limits.size>1500)for(const [key,value]of limits)if(value.until<now)limits.delete(key);let bucket=limits.get(id);if(!bucket||bucket.until<now){bucket={until:now+60000,count:0};limits.set(id,bucket)}return ++bucket.count>max}
async function validKey(key:string){if(!key.startsWith('sb_publishable_')||key.length>300)return false;if((keys.get(key)||0)>Date.now())return true;const url=Deno.env.get('SUPABASE_URL');if(!url)return false;const response=await fetch(url+'/auth/v1/settings',{headers:{apikey:key},signal:AbortSignal.timeout(4000)});await response.body?.cancel();if(!response.ok)return false;if(keys.size>8)keys.clear();keys.set(key,Date.now()+1800000);return true}
Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'',headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origins.has(origin)?origin:'null','Access-Control-Allow-Headers':'apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(!origins.has(origin))return reply({error:'ORIGIN_NOT_ALLOWED'},403);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 const ip=request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';if(limited('all',100)||limited(ip,24))return reply({error:'RATE_LIMITED'},429);
 try{
  if(!await validKey(request.headers.get('apikey')||''))return reply({error:'INVALID_CLIENT_KEY'},401);
  const raw=await request.text();if(raw.length>1400)return reply({error:'INVALID_REQUEST'},400);let input;try{input=JSON.parse(raw)}catch{return reply({error:'INVALID_REQUEST'},400)}
  if(!input||Array.isArray(input)||Object.keys(input).some(key=>!['action','artistId','artist','title','releaseId'].includes(key)))return reply({error:'INVALID_REQUEST'},400);
  const artist=typeof input.artist==='string'?input.artist.trim():'',title=typeof input.title==='string'?input.title.trim():'';
  if(artist.length>120||title.length>300||/[\u0000-\u001f]/.test(artist+title))return reply({error:'INVALID_REQUEST'},400);
  if(!['artist','release'].includes(input.action))return reply({error:'INVALID_REQUEST'},400);
  if(input.action==='release'&&!releaseIdPattern.test(input.releaseId||''))return reply({error:'INVALID_RELEASE'},400);
  if(input.action==='artist'&&(!artist&&!input.artistId||input.artistId&&!artistIdPattern.test(input.artistId)))return reply({error:'INVALID_ARTIST'},400);
  const key=JSON.stringify(input),cached=cache.get(key);if(cached&&cached.until>Date.now())return reply(cached.data);
  let profile;
  if(input.action==='artist'){
   let id=input.artistId;
   if(!id){const result=await searchMusic({q:(artist+' '+title).trim().slice(0,160)});const exact=title?result.items.filter((song:any)=>normalize(song.title)===normalize(title)):[];const candidates=exact.length?exact:result.items;const ids=[...new Set(candidates.flatMap((song:any)=>(song.artists||[]).filter((value:any)=>sameArtist(value.name,artist)).map((value:any)=>value.id)))];if(ids.length!==1)return reply({error:'ARTIST_NOT_FOUND'},404);id=ids[0]}
   profile=parseArtist(await browse(id),id);if(!profile.name)return reply({error:'ARTIST_NOT_FOUND'},404);profile=await enrichDates(profile,{artist:profile.name,title});
  }else{profile=parseRelease(await browse(input.releaseId),input.releaseId);if(!profile.title)return reply({error:'RELEASE_NOT_FOUND'},404);profile=await enrichDates(profile,{artist:profile.artist||artist,title:profile.tracks[0]?.title||title})}
  const result={ok:true,profile};if(cache.size>120)cache.delete(cache.keys().next().value!);cache.set(key,{data:result,until:Date.now()+3600000});return reply(result);
 }catch(error){const timedOut=error instanceof Error&&['AbortError','TimeoutError'].includes(error.name);return reply({error:timedOut?'PROFILE_TIMEOUT':'PROFILE_UNAVAILABLE'},timedOut?504:502)}
});

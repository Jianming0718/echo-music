const target=process.argv[2];
if(!target)throw Error('Usage: node scripts/probe-edge-audio.mjs https://YOUR-NETLIFY-SITE.netlify.app');
const base=new URL('/api/audio/edge-probe',target);
if(base.protocol!=='https:')throw Error('HTTPS test deployment required');
let verifiedRanges=0,failures=0;
for(const profile of ['visionos','visionos-current','ios','web-embedded','tv-embedded']){
 for(const id of ['c6ASQOwKkhk','gdZLi9oWNZg']){
  const url=new URL(base);url.searchParams.set('v',id);url.searchParams.set('profile',profile);const start=Date.now();
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(35000),redirect:'error'});
   const data=await response.json();
   const result={id,profile,httpStatus:response.status,ms:Date.now()-start};
   for(const key of ['probeVersion','stage','sourceStatus','sourceReason','upstreamStatus','error','audioFormats','directAudio','validAudioRange','bytes','contentType'])if(Object.hasOwn(data,key))result[key]=data[key];
   result.playbackVerified=false;
   console.log(JSON.stringify(result));
   if(response.ok&&data.probeVersion===2&&data.profile===profile&&data.validAudioRange===true)verifiedRanges++;else failures++;
  }catch(error){console.log(JSON.stringify({id,profile,error:error.name,ms:Date.now()-start,playbackVerified:false}));failures++}
 }
}
console.log(JSON.stringify({verifiedRanges,failures,fullPlaybackVerified:false}));
process.exitCode=verifiedRanges?0:1;

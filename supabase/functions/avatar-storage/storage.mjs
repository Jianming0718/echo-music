const pathPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i,uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0}
export function createAvatarHandler(config,fetcher=fetch){return async request=>{
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 if(!config.url||!config.serviceKey||!config.hookKey||config.hookKey.length<32)return reply({error:'SERVER_NOT_CONFIGURED'},503);
 if(!equal(request.headers.get('x-echo-admin-key'),config.hookKey))return reply({error:'UNAUTHORIZED'},401);
 try{
  const raw=await request.text();if(raw.length>1500000)return reply({error:'INVALID_REQUEST'},413);let body;try{body=JSON.parse(raw)}catch{return reply({error:'INVALID_REQUEST'},400)}if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'INVALID_REQUEST'},400);
  const fields={upload:['action','path','image'],remove:['action','path'],copy:['action','source','path'],sign:['action','paths'],purge:['action','user_id']};if(!fields[body.action]||Object.keys(body).some(key=>!fields[body.action].includes(key)))return reply({error:'INVALID_REQUEST'},400);
  const call=async(path,options={})=>{const result=await fetcher(config.url+'/storage/v1/'+path,{...options,headers:{apikey:config.serviceKey,Authorization:'Bearer '+config.serviceKey,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});if(!result.ok)throw Error('STORAGE_FAILED');return result.json()};
  if(body.action==='sign'){if(!Array.isArray(body.paths)||body.paths.length>50||body.paths.some(path=>!pathPattern.test(path)))return reply({error:'INVALID_REQUEST'},400);if(!body.paths.length)return reply({ok:true,urls:[]});const rows=await call('object/sign/echo-avatars',{method:'POST',body:JSON.stringify({paths:body.paths,expiresIn:3600})});return reply({ok:true,urls:rows.map(row=>({path:row.path,signedUrl:row.signedURL?config.url+'/storage/v1'+row.signedURL:null}))})}
  if(body.action==='purge'){if(!uuid.test(body.user_id||''))return reply({error:'INVALID_REQUEST'},400);let batch;do{batch=await call('object/list/echo-avatars',{method:'POST',body:JSON.stringify({prefix:body.user_id+'/',limit:100,offset:0})});const paths=batch.map(row=>body.user_id+'/'+row.name);if(paths.some(path=>!pathPattern.test(path)))throw Error('UNEXPECTED_PATH');if(paths.length)await call('object/echo-avatars',{method:'DELETE',body:JSON.stringify({prefixes:paths})})}while(batch.length===100);return reply({ok:true})}
  if(!pathPattern.test(body.path||''))return reply({error:'INVALID_REQUEST'},400);
  if(body.action==='copy'){if(!pathPattern.test(body.source||''))return reply({error:'INVALID_REQUEST'},400);await call('object/copy',{method:'POST',body:JSON.stringify({bucketId:'echo-avatars',sourceKey:body.source,destinationKey:body.path})})}
  if(body.action==='remove')await call('object/echo-avatars',{method:'DELETE',body:JSON.stringify({prefixes:[body.path]})});
  if(body.action==='upload'){if(typeof body.image!=='string'||body.image.length>1400000||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.image))return reply({error:'INVALID_REQUEST'},400);const bytes=Uint8Array.from(atob(body.image),ch=>ch.charCodeAt(0));if(bytes.length>1048576||bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)return reply({error:'INVALID_IMAGE'},400);await call('object/echo-avatars/'+body.path,{method:'POST',headers:{'Content-Type':'image/jpeg','x-upsert':'false','cache-control':'3600'},body:bytes})}
  return reply({ok:true});
 }catch{return reply({error:'STORAGE_UNAVAILABLE'},502)}
}}

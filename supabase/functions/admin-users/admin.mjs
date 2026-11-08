const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const avatarPath=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i;
const origins=new Set(['https://jianming0718.github.io','https://echo-music-free-player.stablepeace1.chatgpt.site','http://localhost:8000','http://127.0.0.1:8000']);
export function createAdminHandler(config,fetcher=fetch){
 const limits=new Map();
 return async request=>{
  const origin=request.headers.get('origin')||'',headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origins.has(origin)?origin:'null','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(!origins.has(origin))return reply({error:'ORIGIN_NOT_ALLOWED'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
  if(!config.url||!config.anonKey||!config.serviceKey)return reply({error:'SERVER_NOT_CONFIGURED'},503);
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer ')||authorization.length>16000)return reply({error:'UNAUTHORIZED'},401);
  const adminHeaders={apikey:config.serviceKey,Authorization:'Bearer '+config.serviceKey,'Content-Type':'application/json'};
  const call=(path,options={})=>fetcher(config.url+path,{...options,headers:{...adminHeaders,...options.headers},signal:AbortSignal.timeout(10000)});
  const remove=async path=>{try{await call('/storage/v1/object/echo-avatars',{method:'DELETE',body:JSON.stringify({prefixes:[path]})})}catch{}};
  try{
   const auth=await fetcher(config.url+'/auth/v1/user',{headers:{apikey:config.anonKey,Authorization:authorization},signal:AbortSignal.timeout(8000)});
   if(!auth.ok)return reply({error:'UNAUTHORIZED'},401);const user=await auth.json();if(!uuid.test(user.id||''))return reply({error:'UNAUTHORIZED'},401);
   const membership=await call('/rest/v1/echo_admins?user_id=eq.'+user.id+'&select=user_id');if(!membership.ok)throw Error('ADMIN_LOOKUP_FAILED');
   if(!(await membership.json()).some(row=>row.user_id===user.id))return reply({error:'ADMIN_REQUIRED'},403);
   const entitlement=await call('/rest/v1/account_entitlements?user_id=eq.'+user.id+'&select=account_status');if(!entitlement.ok)throw Error('STATUS_LOOKUP_FAILED');if((await entitlement.json()).some(row=>row.account_status!=='active'))return reply({error:'ADMIN_REQUIRED'},403);
   const now=Date.now();if(limits.size>100)for(const [key,item]of limits)if(item.until<now)limits.delete(key);let bucket=limits.get(user.id);if(!bucket||bucket.until<now){bucket={count:0,until:now+60000};limits.set(user.id,bucket)}if(++bucket.count>60)return reply({error:'RATE_LIMITED'},429);
   const raw=await request.text();if(raw.length>4000)return reply({error:'REQUEST_TOO_LARGE'},413);let body;try{body=JSON.parse(raw)}catch{return reply({error:'INVALID_REQUEST'},400)}
   if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'INVALID_REQUEST'},400);
   if(body.action==='list'){
    if(Object.keys(body).some(key=>!['action','offset'].includes(key)))return reply({error:'INVALID_REQUEST'},400);
    const offset=body.offset??0;if(!Number.isInteger(offset)||offset<0||offset>100000)return reply({error:'INVALID_REQUEST'},400);
    const result=await call('/rest/v1/profiles?select=id,handle,display_name,avatar_path&order=id.asc&limit=30&offset='+offset);if(!result.ok)throw Error('READ_FAILED');const users=await result.json();return reply({ok:true,users,offset,hasMore:users.length===30});
   }
   if(body.action!=='update'||Object.keys(body).some(key=>!['action','id','handle','display_name','avatar'].includes(key)))return reply({error:'INVALID_REQUEST'},400);
   if(!uuid.test(body.id||'')||typeof body.handle!=='string'||!/^[a-z0-9_]{3,24}$/.test(body.handle)||typeof body.display_name!=='string'||!body.display_name.trim()||body.display_name.trim().length>40)return reply({error:'INVALID_PROFILE'},400);
   const avatar=body.avatar||{mode:'keep'};if(!avatar||typeof avatar!=='object'||Array.isArray(avatar)||Object.keys(avatar).some(key=>!['mode','path'].includes(key))||!['keep','copy','remove'].includes(avatar.mode)||avatar.mode==='copy'&&!avatarPath.test(avatar.path||''))return reply({error:'INVALID_AVATAR'},400);
   const selected=await call('/rest/v1/profiles?id=eq.'+body.id+'&select=id,handle,display_name,avatar_path');if(!selected.ok)throw Error('READ_FAILED');const target=(await selected.json())[0];if(!target)return reply({error:'USER_NOT_FOUND'},404);
   let path=target.avatar_path,created=null;
   if(avatar.mode==='remove')path=null;
   else if(avatar.mode==='copy'){
    path=body.id+'/'+crypto.randomUUID()+'.jpg';
    const copied=await call('/storage/v1/object/copy',{method:'POST',body:JSON.stringify({bucketId:'echo-avatars',sourceKey:avatar.path,destinationKey:path})});
    if(!copied.ok)return reply({error:'AVATAR_COPY_FAILED'},502);created=path;
   }
   let updated;
   try{
    const result=await call('/rest/v1/profiles?id=eq.'+body.id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({handle:body.handle,display_name:body.display_name.trim(),avatar_path:path})});
    if(!result.ok){if(created)await remove(created);return reply({error:result.status===409?'HANDLE_TAKEN':'PROFILE_UPDATE_FAILED'},result.status===409?409:502)}
    updated=(await result.json())[0];if(!updated){if(created)await remove(created);return reply({error:'USER_NOT_FOUND'},404)}
   }catch(error){throw error}
   if(target.avatar_path&&target.avatar_path!==path&&target.avatar_path.startsWith(body.id+'/'))await remove(target.avatar_path);
   return reply({ok:true,profile:updated});
  }catch{return reply({error:'ADMIN_SERVICE_UNAVAILABLE'},502)}
 };
}

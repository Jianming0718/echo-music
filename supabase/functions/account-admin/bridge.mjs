const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const origins=new Set(['https://jianming0718.github.io','https://echo-music-free-player.stablepeace1.chatgpt.site','http://localhost:8000','http://127.0.0.1:8000']);
export function normalizedAccount(value,userId){
 if(!value||!uuid.test(userId)||!['active','suspended','disabled'].includes(value.account_status)||!['free','premium'].includes(value.tier))throw Error('INVALID_ACCOUNT');
 const until=value.premium_until?new Date(value.premium_until):null;if(until&&!Number.isFinite(until.getTime()))throw Error('INVALID_EXPIRY');
 return{user_id:userId,account_status:value.account_status,tier:value.tier,premium_until:until?until.toISOString():null,updated_at:new Date().toISOString()};
}
function membership(value,userId){const row=value||{user_id:userId,account_status:'active',tier:'free',premium_until:null};return{...row,tier:row.tier==='premium'&&(!row.premium_until||Date.parse(row.premium_until)>Date.now())?'premium':'free'}}
function equal(a,b){if(!a||!b||a.length!==b.length||a.length>300)return false;let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0}
export function createHandler(config,fetcher=fetch){
 return async request=>{
  const origin=request.headers.get('origin')||'',headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origins.has(origin)?origin:'null','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-echo-admin-key','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!origins.has(origin))return json({error:'ORIGIN_NOT_ALLOWED'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
   const raw=await request.text();if(raw.length>20000)return json({error:'REQUEST_TOO_LARGE'},413);
   let body;try{body=JSON.parse(raw)}catch{return json({error:'INVALID_REQUEST'},400)}
   if(!body||typeof body!=='object')return json({error:'INVALID_REQUEST'},400);
   if(!config.url||!config.serviceKey)return json({error:'SERVER_NOT_CONFIGURED'},503);
   const adminHeaders={apikey:config.serviceKey,Authorization:'Bearer '+config.serviceKey,'Content-Type':'application/json'};
   const read=async userId=>{const response=await fetcher(config.url+'/rest/v1/account_entitlements?user_id=eq.'+userId+'&select=user_id,account_status,tier,premium_until,updated_at',{headers:adminHeaders,signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('READ_FAILED');const rows=await response.json();return rows[0]};
   const save=async(account,insertOnly=false)=>{const response=await fetcher(config.url+'/rest/v1/account_entitlements?on_conflict=user_id',{method:'POST',headers:{...adminHeaders,Prefer:(insertOnly?'resolution=ignore-duplicates':'resolution=merge-duplicates')+',return=representation'},body:JSON.stringify(account),signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('WRITE_FAILED');return account};
   if(body.action==='admin_update'){
    const expectedKey=config.hookKey;
    if(typeof expectedKey!=='string'||expectedKey.length<32)return json({error:'ADMIN_HOOK_NOT_CONFIGURED'},503);
    const suppliedKey=request.headers.get('x-echo-admin-key');
    if(!suppliedKey||!equal(suppliedKey,expectedKey))return json({error:'UNAUTHORIZED'},401);
    const account=normalizedAccount(body.account,body.account?.user_id||'');await save(account);return json({ok:true,account:membership(account,account.user_id)});
   }
   if(body.action!=='sync'||Object.keys(body).some(key=>key!=='action'))return json({error:'INVALID_REQUEST'},400);
   const authorization=request.headers.get('authorization')||'';if(!authorization.startsWith('Bearer ')||authorization.length>16000)return json({error:'UNAUTHORIZED'},401);
   const auth=await fetcher(config.url+'/auth/v1/user',{headers:{apikey:config.anonKey,Authorization:authorization},signal:AbortSignal.timeout(8000)});if(!auth.ok)return json({error:'UNAUTHORIZED'},401);
   const user=await auth.json();if(!uuid.test(user.id||''))return json({error:'UNAUTHORIZED'},401);
   if(!config.appsScriptUrl){
    const response=await fetcher(config.url+'/rest/v1/account_entitlements?user_id=eq.'+user.id+'&select=user_id,account_status,tier,premium_until,updated_at',{headers:adminHeaders,signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('READ_FAILED');const records=await response.json();return json({ok:true,connected:false,account:membership(records[0],user.id)});
   }
   if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.appsScriptUrl))throw Error('INVALID_CONFIG');
   const response=await fetcher(config.appsScriptUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sync',access_token:authorization.slice(7)}),signal:AbortSignal.timeout(18000)});
   if(!response.ok)throw Error('SCRIPT_FAILED');const result=await response.json();if(!result.ok||result.version!=='2'||result.account?.user_id!==user.id)throw Error('INVALID_SCRIPT_RESPONSE');
   const account=normalizedAccount(result.account,user.id);await save(account,true);return json({ok:true,connected:true,account:membership(await read(user.id),user.id)});
  }catch{return json({error:'ACCOUNT_SYNC_UNAVAILABLE'},502)}
 };
}

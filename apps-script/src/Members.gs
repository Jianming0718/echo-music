function echoMemberVersion_(row,auth){return echoDigest_(JSON.stringify([row.user_id,row.email,row.handle,row.display_name,row.avatar_path,row.account_status,row.tier,row.premium_until,row.role,auth?.email,auth?.email_verified]))}
function echoMember_(row,cache){const auth=echoTable_('Auth',cache).rows.find(item=>item.user_id===row.user_id);return {...echoProfile_(row),email:row.email,account_status:row.account_status,tier:row.tier,premium_until:row.premium_until||null,role:row.role,email_verified:auth?.email_verified===true,synced_at:row.synced_at,version:echoMemberVersion_(row,auth)}}
function echoAdminPut_(row){const values=ECHO_TABLES.Users.map(key=>echoText_(row[key]));echoBook_().getSheetByName('Users').getRange(row._row,1,1,values.length).setValues([values])}
function echoMemberAdminAction_(body,actor,cache){
 if(actor.role!=='admin'||actor.account_status!=='active')echoFailure_('ADMIN_REQUIRED');
 const users=echoTable_('Users',cache),action=body.action;
 if(action==='admin.list'){
  echoFields_(body,['offset']);const offset=body.offset??0;if(!Number.isInteger(offset)||offset<0||offset>100000)echoFailure_('INVALID_REQUEST');
  const list=users.rows.slice().sort((a,b)=>a.user_id.localeCompare(b.user_id)).slice(offset,offset+30);
  return {users:list.map(row=>echoMember_(row,cache)),offset,hasMore:offset+list.length<users.rows.length,capabilities:['member_admin','redemption_admin']};
 }
 if(action.startsWith('admin.codes.'))return echoRedemptionAdmin_(body,actor,cache);
 const target=users.rows.find(row=>row.user_id===body.id);if(!target)echoFailure_('USER_NOT_FOUND');
 const auth=echoTable_('Auth',cache).rows.find(row=>row.user_id===target.user_id);if(!auth)echoFailure_('USER_NOT_FOUND');
 if(action==='admin.reset-password'){
  echoFields_(body,['id']);echoThrottle_('global-mail',80,86400000);echoThrottle_('admin-reset:'+actor.user_id,8,3600000);echoSendRecovery_(auth,'reset',null,cache);return {sent:true};
 }
 if(action!=='admin.update')echoFailure_('INVALID_REQUEST');
 echoFields_(body,['id','handle','display_name','avatar','email','account_status','tier','premium_until','role','version']);
 const extended=['email','account_status','tier','premium_until','role'].some(key=>Object.prototype.hasOwnProperty.call(body,key));
 if(extended&&!body.version)echoFailure_('INVALID_REQUEST');
 if(body.version&&body.version!==echoMemberVersion_(target,auth))echoFailure_('USER_CHANGED');
 const candidate={...target};echoUpdateName_(body,candidate,users);
 if(Object.prototype.hasOwnProperty.call(body,'email')){candidate.email=echoEmail_(body.email);if(users.rows.some(row=>row.user_id!==candidate.user_id&&String(row.email).toLowerCase()===candidate.email)||echoTable_('Auth',cache).rows.some(row=>row.user_id!==candidate.user_id&&String(row.email).toLowerCase()===candidate.email))echoFailure_('EMAIL_TAKEN')}
 if(Object.prototype.hasOwnProperty.call(body,'account_status'))candidate.account_status=body.account_status;
 if(Object.prototype.hasOwnProperty.call(body,'tier'))candidate.tier=body.tier;
 if(Object.prototype.hasOwnProperty.call(body,'role'))candidate.role=body.role;
 if(Object.prototype.hasOwnProperty.call(body,'premium_until')){if(body.premium_until!==null&&(typeof body.premium_until!=='string'||body.premium_until.length>40||!Number.isFinite(Date.parse(body.premium_until))))echoFailure_('INVALID_MEMBERSHIP');candidate.premium_until=body.premium_until?new Date(body.premium_until).toISOString():''}
 if(!['active','suspended','disabled'].includes(candidate.account_status)||!['free','premium'].includes(candidate.tier)||!['member','admin'].includes(candidate.role))echoFailure_('INVALID_MEMBERSHIP');
 if(!users.rows.some(row=>{const value=row.user_id===candidate.user_id?candidate:row;return value.role==='admin'&&value.account_status==='active'}))echoFailure_('LAST_ADMIN');
 const avatar=body.avatar||{mode:'keep'},allowed={keep:['mode'],remove:['mode'],copy:['mode','path'],upload:['mode','image']}[avatar?.mode];
 if(!allowed||Object.keys(avatar).some(key=>!allowed.includes(key)))echoFailure_('INVALID_AVATAR');
 if(avatar.mode==='copy'&&(!echoAvatarPath_(avatar.path)||!users.rows.some(row=>row.avatar_path===avatar.path)))echoFailure_('INVALID_AVATAR');
 if(avatar.mode==='upload'&&(typeof avatar.image!=='string'||avatar.image.length>1400000||!/^[A-Za-z0-9+/]+={0,2}$/.test(avatar.image)))echoFailure_('INVALID_AVATAR');
 let freshPath=null,committed=false;
 try{
  if(avatar.mode==='copy'||avatar.mode==='upload'){freshPath=candidate.user_id+'/'+Utilities.getUuid()+'.jpg';echoAvatarCall_(avatar.mode==='copy'?{action:'copy',source:avatar.path,path:freshPath}:{action:'upload',image:avatar.image,path:freshPath});candidate.avatar_path=freshPath}else if(avatar.mode==='remove')candidate.avatar_path='';
  const currentCache={},currentUsers=echoTable_('Users',currentCache),current=currentUsers.rows.find(row=>row.user_id===target.user_id),currentAuth=echoTable_('Auth',currentCache).rows.find(row=>row.user_id===target.user_id),currentActor=currentUsers.rows.find(row=>row.user_id===actor.user_id);
  if(currentActor?.role!=='admin'||currentActor?.account_status!=='active')echoFailure_('ADMIN_REQUIRED');
  if(!current||!currentAuth||echoMemberVersion_(current,currentAuth)!==echoMemberVersion_(target,auth))echoFailure_('USER_CHANGED');
  if(!currentUsers.rows.some(row=>{const value=row.user_id===candidate.user_id?candidate:row;return value.role==='admin'&&value.account_status==='active'}))echoFailure_('LAST_ADMIN');
  const emailChanged=String(currentAuth.email).toLowerCase()!==String(candidate.email).toLowerCase();
  const previousAuth={...currentAuth};
  if(emailChanged){currentAuth.email=candidate.email;currentAuth.email_verified=false;currentAuth.failed_attempts=0;currentAuth.locked_until='';echoTable_('Auth',currentCache).put(currentAuth)}
  candidate._row=current._row;candidate.created_at=current.created_at;candidate.synced_at=echoTime_();
  try{echoAdminPut_(candidate);committed=true}catch(error){if(emailChanged)echoTable_('Auth',currentCache).put(previousAuth);throw error}
  if(emailChanged||candidate.account_status!=='active'){echoTable_('Sessions',currentCache).remove(row=>row.user_id===candidate.user_id);if(emailChanged)echoTable_('Recovery',currentCache).remove(row=>row.user_id===candidate.user_id)}
  const old=current.avatar_path;if(old&&old!==candidate.avatar_path)try{echoAvatarCall_({action:'remove',path:old})}catch{}
  return {profile:echoMember_(candidate,currentCache),emailChanged,sessionRevoked:emailChanged||candidate.account_status!=='active'};
 }catch(error){if(freshPath&&!committed)try{echoAvatarCall_({action:'remove',path:freshPath})}catch{}throw error}
}

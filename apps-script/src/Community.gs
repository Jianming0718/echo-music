function echoSocialAudience_(cache, user) {
 const users=echoTable_('Users',cache).rows, ids=new Set([user.user_id]);
 for(const row of echoTable_('Friendships',cache).rows) if(row.status==='accepted') {
  if(row.requester_id===user.user_id) ids.add(row.addressee_id);
  if(row.addressee_id===user.user_id) ids.add(row.requester_id);
 }
 return new Set(users.filter(row=>ids.has(row.user_id)&&row.account_status==='active').map(row=>row.user_id));
}
function echoSocialText_(value,max,empty) {
 if(typeof value!=='string'||value.length>max||(!empty&&!value.trim())) echoFailure_('INVALID_SOCIAL_CONTENT');
 return value.trim();
}
function echoSocialTrack_(value) {
 const track=echoTrack_(value);
 if(!['sanctuary','hiraeth','childhood','moonlight'].includes(track.id)&&!/^youtube-[A-Za-z0-9_-]{11}$/.test(track.id)&&!/^audius-[a-zA-Z0-9]+$/.test(track.id)) echoFailure_('INVALID_TRACK');
 return track;
}
function echoSocialPerson_(cache,id) {
 const row=echoTable_('Users',cache).rows.find(user=>user.user_id===id);
 return row?echoProfile_(row):null;
}
function echoSocialPage_(rows,cursor,limit) {
 if(cursor&&(!echoId_(cursor.id)||!Number.isFinite(Date.parse(cursor.created_at)))) echoFailure_('INVALID_CURSOR');
 const found=rows.filter(row=>!cursor||echoMessageOrder_(row,cursor)<0).sort(echoMessageOrder_).reverse();
 return {items:found.slice(0,limit),hasMore:found.length>limit};
}
function echoSocialExisting_(table,id,uid,fields) {
 if(!echoId_(id))echoFailure_('INVALID_REQUEST');
 const row=table.rows.find(item=>item.id===id);
 if(row&&(row.user_id!==uid||Object.entries(fields).some(([key,value])=>JSON.stringify(row[key])!==JSON.stringify(value)))) echoFailure_('CONTENT_CONFLICT');
 return row;
}
function echoSocialLimit_(table,uid,max) {
 if(table.rows.filter(row=>row.user_id===uid).length>=max)echoFailure_('SOCIAL_LIMIT');
 echoThrottle_('social-write:'+uid,45,60000);
}
function echoPostVisibility_(post){return post.visibility==='public'?'public':'friends'}
function echoPostAccess_(post,uid,audience,activeUsers){return activeUsers.has(post.user_id)&&(echoPostVisibility_(post)==='public'||audience.has(post.user_id))}
function echoPostRow_(row){const copy=echoPublicRow_(row);copy.visibility=echoPostVisibility_(row);delete copy.image_digest;return copy}
function echoDeletePost_(cache,id){
 const post=echoTable_('Posts',cache).rows.find(row=>row.id===id);
 if(post?.image_path)echoAvatarCall_({action:'remove',path:post.image_path});
 echoTable_('PostComments',cache).remove(row=>row.post_id===id);
 echoTable_('PostReactions',cache).remove(row=>row.post_id===id);
 echoTable_('Posts',cache).remove(row=>row.id===id);
}
function echoRoomAccess_(cache,uid,id) {
 const room=echoTable_('Rooms',cache).rows.find(row=>row.id===id),host=room&&echoTable_('Users',cache).rows.find(row=>row.user_id===room.host_id);
 if(!room||room.closed||Date.parse(room.expires_at)<=Date.now()||host?.account_status!=='active')echoFailure_('ROOM_UNAVAILABLE');
 if(room.host_id!==uid&&(!(room.members||[]).includes(uid)||!echoFriend_(cache,uid,room.host_id)))echoFailure_('FORBIDDEN');
 return room;
}
function echoRoomPublic_(cache,room) {
 const copy=echoPublicRow_(room);
 copy.host=echoSocialPerson_(cache,room.host_id);
 copy.members=(room.members||[]).filter(id=>echoFriend_(cache,id,room.host_id)).map(id=>echoSocialPerson_(cache,id)).filter(Boolean);
 return copy;
}
function echoCommunityAction_(body,user,cache) {
 const uid=user.user_id,action=body.action,audience=echoSocialAudience_(cache,user),activeUsers=new Set(echoTable_('Users',cache).rows.filter(row=>row.account_status==='active').map(row=>row.user_id));
 if(action==='social.status') {
  echoFields_(body,[]);
  for(const name of ['Posts','PostComments','PostReactions','Danmaku','Rooms','RoomMessages'])echoTable_(name,cache);
  return {capabilities:['feed','square','post_images','danmaku','rooms'],server_time:echoTime_()};
 }
 if(action==='social.feed'){
  echoFields_(body,['cursor','scope']);const scope=body.scope||'all';if(!['all','friends','mine'].includes(scope))echoFailure_('INVALID_REQUEST');
  const page=echoSocialPage_(echoTable_('Posts',cache).rows.filter(row=>echoPostAccess_(row,uid,audience,activeUsers)&&(scope==='mine'?row.user_id===uid:scope==='friends'?audience.has(row.user_id):true)),body.cursor,20);
  const reactions=echoTable_('PostReactions',cache).rows,comments=echoTable_('PostComments',cache).rows;
  const paths=[...new Set(page.items.map(row=>row.image_path).filter(Boolean))];let urls=[];
  if(paths.length)urls=echoAvatarCall_({action:'sign',paths}).urls||[];
  return {posts:page.items.map(row=>{const participants=echoPostVisibility_(row)==='public'?activeUsers:audience;return {...echoPostRow_(row),image_url:urls.find(image=>image.path===row.image_path)?.signedUrl||null,person:echoSocialPerson_(cache,row.user_id),likes:reactions.filter(item=>item.post_id===row.id&&participants.has(item.user_id)).length,liked:reactions.some(item=>item.post_id===row.id&&item.user_id===uid),comments:comments.filter(item=>item.post_id===row.id&&participants.has(item.user_id)).length}}),hasMore:page.hasMore};
 }
 if(action==='social.post'){
  echoFields_(body,['id','body','track','visibility','image']);
  const text=echoSocialText_(body.body,1000,true),track=body.track?echoSocialTrack_(body.track):null,visibility=body.visibility??'friends',image=body.image??null;
  if(!['public','friends'].includes(visibility))echoFailure_('INVALID_REQUEST');
  if(image!==null&&(typeof image!=='string'||image.length>1400000||!/^[A-Za-z0-9+/]+={0,2}$/.test(image)))echoFailure_('INVALID_POST_IMAGE');
  if(!text&&!track&&!image)echoFailure_('INVALID_SOCIAL_CONTENT');
  if(!echoId_(body.id))echoFailure_('INVALID_REQUEST');
  const table=echoTable_('Posts',cache),digest=image?echoDigest_(image):'',existing=table.rows.find(row=>row.id===body.id);
  if(existing){if(existing.user_id!==uid||existing.body!==text||JSON.stringify(existing.track)!==JSON.stringify(track)||echoPostVisibility_(existing)!==visibility||(existing.image_digest||'')!==digest)echoFailure_('CONTENT_CONFLICT');return {post:echoPostRow_(existing)}}
  echoSocialLimit_(table,uid,200);let path='';
  if(image){path=uid+'/'+Utilities.getUuid()+'.jpg';echoAvatarCall_({action:'upload',path,image})}
  try{return {post:echoPostRow_(table.put({id:body.id,user_id:uid,body:text,track,created_at:echoTime_(),visibility,image_path:path,image_digest:digest}))}}
  catch(error){if(path)try{echoAvatarCall_({action:'remove',path})}catch{}throw error}
 }
 if(['social.delete','social.react','social.comments','social.comment','social.comment.delete'].includes(action)) {
  const post=echoTable_('Posts',cache).rows.find(row=>row.id===body.post_id);
  if(!post||(!echoPostAccess_(post,uid,audience,activeUsers)&&!(user.role==='admin'&&action==='social.delete')))echoFailure_('FORBIDDEN');
  if(action==='social.delete') {
   echoFields_(body,['post_id']);if(post.user_id!==uid&&user.role!=='admin')echoFailure_('FORBIDDEN');echoDeletePost_(cache,post.id);return {};
  }
  if(action==='social.react') {
   echoFields_(body,['post_id','liked']);if(typeof body.liked!=='boolean')echoFailure_('INVALID_REQUEST');
   const table=echoTable_('PostReactions',cache),row=table.rows.find(item=>item.post_id===post.id&&item.user_id===uid);
   if(body.liked&&!row){echoSocialLimit_(table,uid,2000);table.put({id:Utilities.getUuid(),post_id:post.id,user_id:uid,created_at:echoTime_()})}
   if(!body.liked&&row)table.remove(item=>item===row);
   return {liked:body.liked};
  }
  const table=echoTable_('PostComments',cache);
  if(action==='social.comments') {
   echoFields_(body,['post_id','cursor']);const page=echoSocialPage_(table.rows.filter(row=>row.post_id===post.id&&(echoPostVisibility_(post)==='public'?activeUsers:audience).has(row.user_id)),body.cursor,30);
   return {comments:page.items.map(row=>({...echoPublicRow_(row),person:echoSocialPerson_(cache,row.user_id)})),hasMore:page.hasMore};
  }
  if(action==='social.comment.delete') {
   echoFields_(body,['post_id','id']);const row=table.rows.find(item=>item.post_id===post.id&&item.id===body.id);
   if(!row||(row.user_id!==uid&&post.user_id!==uid&&user.role!=='admin'))echoFailure_('FORBIDDEN');table.remove(item=>item===row);return {};
  }
  echoFields_(body,['post_id','id','body']);const text=echoSocialText_(body.body,500,false),existing=echoSocialExisting_(table,body.id,uid,{post_id:post.id,body:text});
  if(existing)return {comment:echoPublicRow_(existing)};
  echoSocialLimit_(table,uid,1000);return {comment:echoPublicRow_(table.put({id:body.id,post_id:post.id,user_id:uid,body:text,created_at:echoTime_()}))};
 }
 if(action.startsWith('danmaku.')) {
  if(typeof body.track_id!=='string'||body.track_id.length>100||!body.track_id)echoFailure_('INVALID_TRACK');
  const table=echoTable_('Danmaku',cache);
  if(action==='danmaku.read') {
   echoFields_(body,['track_id']);return {messages:table.rows.filter(row=>row.track_id===body.track_id&&audience.has(row.user_id)).sort(echoMessageOrder_).slice(-150).map(row=>({...echoPublicRow_(row),person:echoSocialPerson_(cache,row.user_id)}))};
  }
  if(action==='danmaku.delete') {
   echoFields_(body,['track_id','id']);const row=table.rows.find(item=>item.id===body.id&&item.track_id===body.track_id);
   if(!row||(row.user_id!==uid&&user.role!=='admin'))echoFailure_('FORBIDDEN');table.remove(item=>item===row);return {};
  }
  if(action!=='danmaku.send')echoFailure_('INVALID_REQUEST');
  echoFields_(body,['track_id','id','body','position']);const text=echoSocialText_(body.body,100,false);
  if(typeof body.position!=='number'||!Number.isFinite(body.position)||body.position<0||body.position>43200)echoFailure_('INVALID_REQUEST');
  const fields={track_id:body.track_id,body:text,position:Math.round(body.position*10)/10},existing=echoSocialExisting_(table,body.id,uid,fields);
  if(existing)return {message:echoPublicRow_(existing)};
  echoSocialLimit_(table,uid,500);return {message:echoPublicRow_(table.put({id:body.id,user_id:uid,...fields,created_at:echoTime_()}))};
 }
 if(action==='rooms.list') {
  echoFields_(body,[]);return {rooms:echoTable_('Rooms',cache).rows.filter(row=>!row.closed&&Date.parse(row.expires_at)>Date.now()&&(row.host_id===uid||(row.members||[]).includes(uid)&&audience.has(row.host_id))).map(row=>echoRoomPublic_(cache,row))};
 }
 if(action==='rooms.create') {
  echoFields_(body,['id','name','members','track','position','playing']);
  if(!echoId_(body.id)||!Array.isArray(body.members)||!body.members.length||body.members.length>12||new Set(body.members).size!==body.members.length||body.members.some(id=>!echoFriend_(cache,uid,id)||!audience.has(id)))echoFailure_('FRIENDS_REQUIRED');
  const name=echoSocialText_(body.name,60,false),track=echoSocialTrack_(body.track);
  if(typeof body.position!=='number'||!Number.isFinite(body.position)||body.position<0||body.position>43200||typeof body.playing!=='boolean')echoFailure_('INVALID_REQUEST');
  const table=echoTable_('Rooms',cache),existing=table.rows.find(row=>row.id===body.id);
  if(existing){if(existing.host_id!==uid)echoFailure_('CONTENT_CONFLICT');return {room:echoRoomPublic_(cache,echoRoomAccess_(cache,uid,existing.id)),server_time:echoTime_()}}
  const expired=table.rows.filter(row=>Date.parse(row.expires_at)<=Date.now()).map(row=>row.id);echoTable_('RoomMessages',cache).remove(row=>expired.includes(row.room_id));table.remove(row=>expired.includes(row.id));
  if(table.rows.filter(row=>row.host_id===uid&&!row.closed).length>=3)echoFailure_('SOCIAL_LIMIT');echoThrottle_('rooms-create:'+uid,5,60000);
  const time=echoTime_(),room=table.put({id:body.id,host_id:uid,name,members:body.members,track,position:body.position,playing:body.playing,revision:1,updated_at:time,created_at:time,expires_at:new Date(Date.now()+86400000).toISOString(),closed:false});
  return {room:echoRoomPublic_(cache,room),server_time:echoTime_()};
 }
 if(action.startsWith('rooms.')) {
  const room=echoRoomAccess_(cache,uid,body.id),table=echoTable_('Rooms',cache);
  if(action==='rooms.read') {
   echoFields_(body,['id']);return {room:echoRoomPublic_(cache,room),messages:echoTable_('RoomMessages',cache).rows.filter(row=>row.room_id===room.id&&(row.user_id===room.host_id||(room.members||[]).includes(row.user_id)&&echoFriend_(cache,row.user_id,room.host_id))).sort(echoMessageOrder_).slice(-40).map(row=>({...echoPublicRow_(row),person:echoSocialPerson_(cache,row.user_id)})),server_time:echoTime_()};
  }
  if(action==='rooms.leave') {
   echoFields_(body,['id']);if(uid===room.host_id){room.closed=true;echoTable_('RoomMessages',cache).remove(row=>row.room_id===room.id)}else room.members=room.members.filter(id=>id!==uid);table.put(room);return {};
  }
  if(action==='rooms.update') {
   echoFields_(body,['id','revision','track','position','playing']);if(uid!==room.host_id)echoFailure_('FORBIDDEN');
   if(body.revision!==room.revision)echoFailure_('ROOM_STALE');
   if(typeof body.position!=='number'||!Number.isFinite(body.position)||body.position<0||body.position>43200||typeof body.playing!=='boolean')echoFailure_('INVALID_REQUEST');
   room.track=echoSocialTrack_(body.track);room.position=body.position;room.playing=body.playing;room.updated_at=echoTime_();room.revision++;table.put(room);return {room:echoRoomPublic_(cache,room),server_time:echoTime_()};
  }
  if(action==='rooms.message') {
   echoFields_(body,['id','message_id','body']);const text=echoSocialText_(body.body,500,false),messages=echoTable_('RoomMessages',cache),existing=echoSocialExisting_(messages,body.message_id,uid,{room_id:room.id,body:text});
   if(existing)return {message:echoPublicRow_(existing)};
   echoThrottle_('room-message:'+uid,30,60000);
   const rows=messages.rows.filter(row=>row.room_id===room.id).sort(echoMessageOrder_);if(rows.length>=200)messages.remove(row=>row===rows[0]);
   return {message:echoPublicRow_(messages.put({id:body.message_id,room_id:room.id,user_id:uid,body:text,created_at:echoTime_()}))};
  }
 }
 echoFailure_('INVALID_REQUEST');
}
function echoCommunityDeleteUser_(cache,uid) {
 for(const post of echoTable_('Posts',cache).rows.filter(row=>row.user_id===uid))echoDeletePost_(cache,post.id);
 for(const name of ['PostComments','PostReactions','Danmaku'])echoTable_(name,cache).remove(row=>row.user_id===uid);
 const rooms=echoTable_('Rooms',cache),owned=rooms.rows.filter(row=>row.host_id===uid).map(row=>row.id);
 echoTable_('RoomMessages',cache).remove(row=>row.user_id===uid||owned.includes(row.room_id));rooms.remove(row=>owned.includes(row.id));
 for(const room of rooms.rows)if((room.members||[]).includes(uid)){room.members=room.members.filter(id=>id!==uid);rooms.put(room)}
}

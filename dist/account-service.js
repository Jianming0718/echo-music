'use strict';
class EchoAccountService extends EventTarget {
  constructor(config={},factory=globalThis.EchoSupabase?.createClient){super();this.config=config;this.factory=factory;this.client=null;this.session=null;this.profile=null;this.flushing=false;this.lastSyncError=null;this.entitlement=null;this.adminConnected=false;this.avatarCache=new Map();this.avatarUploading=false}
  get configured(){try{return new URL(this.config.supabaseUrl).protocol==='https:'&&Boolean(this.config.supabaseAnonKey)&&Boolean(this.factory)}catch{return false}}
  get user(){return this.session?.user||null}
  async init(){if(!this.configured)return;this.client=this.factory(this.config.supabaseUrl,this.config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});this.client.auth.onAuthStateChange((event,session)=>{const previous=this.session?.user?.id;this.session=session;if(previous!==session?.user?.id){this.profile=null;this.entitlement=null;this.avatarCache.clear()}setTimeout(()=>{this.dispatchEvent(new CustomEvent('session',{detail:{event,user:session?.user||null}}));if(session)this.flush()},0)});const {data,error}=await this.client.auth.getSession();if(error)throw error;this.session=data.session}
  requireUser(){if(!this.client||!this.user)throw new Error('请先登录账号。');return this.user.id}
  redirectURL(){return location.origin+location.pathname}
  async signUp(email,password){const {data,error}=await this.client.auth.signUp({email,password,options:{emailRedirectTo:this.redirectURL()}});if(error)throw error;return data}
  async signIn(email,password){const {data,error}=await this.client.auth.signInWithPassword({email,password});if(error)throw error;return data}
  async signOut(){const {error}=await this.client.auth.signOut();if(error)throw error}
  async resetPassword(email){const {error}=await this.client.auth.resetPasswordForEmail(email,{redirectTo:this.redirectURL()});if(error)throw error}
  async updatePassword(password,currentPassword){this.requireUser();if(password.length<12)throw new Error('新密码至少需要 12 个字符。');const {error}=await this.client.auth.updateUser({password,...(currentPassword?{current_password:currentPassword}:{})});if(error)throw error}
  async ensureProfile(){const id=this.requireUser();let {data,error}=await this.client.from('profiles').select('*').eq('id',id).maybeSingle();if(error)throw error;if(!data){const result=await this.client.from('profiles').insert({id,handle:'u_'+id.replaceAll('-','').slice(0,12),display_name:'听友'}).select().single();if(result.error)throw result.error;data=result.data}if(this.user?.id===id){this.profile=data;await this.attachAvatars([data])}return data}
  async updateProfile(handle,name){const id=this.requireUser();if(!/^[a-z0-9_]{3,24}$/.test(handle))throw new Error('用户名需为 3–24 位小写字母、数字或下划线。');if(!name.trim()||name.length>40)throw new Error('昵称需为 1–40 个字符。');const {data,error}=await this.client.from('profiles').update({handle,display_name:name.trim()}).eq('id',id).select().single();if(error)throw new Error(error.code==='23505'?'这个用户名已被使用。':error.message);if(this.user?.id===id){this.profile=data;await this.attachAvatars([data]);this.syncAdmin().catch(()=>{})}return data}
  async library(){const id=this.requireUser();const [likes,playlists]=await Promise.all([this.client.from('likes').select('track_id,track').eq('user_id',id),this.client.from('playlists').select('*,playlist_items(*)').eq('user_id',id).order('created_at')]);if(likes.error)throw likes.error;if(playlists.error)throw playlists.error;return {likes:likes.data||[],playlists:(playlists.data||[]).map(p=>({...p,playlist_items:(p.playlist_items||[]).sort((a,b)=>a.position-b.position)}))}}
  pending(id=this.user?.id){try{return JSON.parse(localStorage.getItem('echo-cloud-outbox-'+id)||'{}')}catch{return {}}}
  savePending(id,value){localStorage.setItem('echo-cloud-outbox-'+id,JSON.stringify(value));if(this.user?.id===id)this.dispatchEvent(new CustomEvent('sync',{detail:{pending:Object.keys(value).length,error:this.lastSyncError}}))}
  queue(operation){const id=this.requireUser(),pending=this.pending(id);const key=operation.type==='like'?'like:'+operation.track.id:'playlist:'+operation.id;pending[key]={...operation,sequence:crypto.randomUUID()};this.savePending(id,pending);this.flush()}
  async flush(){if(!this.user||!this.client||this.flushing)return;this.flushing=true;const id=this.user.id;try{while(this.user?.id===id){const pending=this.pending(id),entry=Object.entries(pending)[0];if(!entry)break;const [key,op]=entry;let result;if(op.type==='like')result=op.liked?await this.client.from('likes').upsert({user_id:id,track_id:op.track.id,track:op.track},{onConflict:'user_id,track_id'}):await this.client.from('likes').delete().eq('user_id',id).eq('track_id',op.track.id);else if(op.type==='playlist')result=await this.client.rpc('save_playlist',{playlist_id:op.id,playlist_name:op.name,playlist_cover:op.cover||'',playlist_visibility:op.visibility||'private',tracks:op.tracks});else result=await this.client.from('playlists').delete().eq('user_id',id).eq('id',op.id);if(result.error)throw result.error;const latest=this.pending(id);if(latest[key]?.sequence===op.sequence)delete latest[key];this.lastSyncError=null;this.savePending(id,latest)}}catch(error){if(this.user?.id===id)this.lastSyncError=error.message;this.dispatchEvent(new CustomEvent('sync',{detail:{pending:Object.keys(this.pending(id)).length,error:error.message}}))}finally{this.flushing=false;if(this.user&&this.user.id!==id)this.flush()}}
  async searchPeople(query){this.requireUser();if(query.length<3)return [];const {data,error}=await this.client.from('profiles').select('id,handle,display_name,avatar_path').ilike('handle',query.toLowerCase()+'%').neq('id',this.user.id).limit(20);if(error)throw error;await this.attachAvatars(data||[]);return data||[]}
  async friends(){this.requireUser();const {data,error}=await this.client.from('friendships').select('*').order('created_at',{ascending:false});if(error)throw error;const ids=[...new Set((data||[]).flatMap(x=>[x.requester_id,x.addressee_id]))];let people=[];if(ids.length){const result=await this.client.from('profiles').select('id,handle,display_name,avatar_path').in('id',ids);if(result.error)throw result.error;people=result.data||[];await this.attachAvatars(people)}return(data||[]).map(row=>({...row,person:people.find(p=>p.id===(row.requester_id===this.user.id?row.addressee_id:row.requester_id))}))}
  async requestFriend(personId){const id=this.requireUser();const {error}=await this.client.from('friendships').insert({requester_id:id,addressee_id:personId,status:'pending'});if(error)throw new Error(error.code==='23505'?'已有好友关系或好友申请。':error.message)}
  async acceptFriend(id){this.requireUser();const {error}=await this.client.from('friendships').update({status:'accepted'}).eq('id',id);if(error)throw error}
  async removeFriend(id){this.requireUser();const {error}=await this.client.from('friendships').delete().eq('id',id);if(error)throw error}
  async sharedPlaylists(personId){this.requireUser();const {data,error}=await this.client.from('playlists').select('*,playlist_items(*)').eq('user_id',personId).eq('visibility','friends');if(error)throw error;return data||[]}
  async syncAdmin(){
    const id=this.requireUser();let account;
    if(this.client.functions){const result=await this.client.functions.invoke('account-admin',{body:{action:'sync'}});if(!result.error&&result.data?.ok){account=result.data.account;if(this.user?.id===id)this.adminConnected=Boolean(result.data.connected)}}
    if(!account){const result=await this.client.from('account_entitlements').select('*').eq('user_id',id).maybeSingle();if(result.error)throw result.error;account=result.data||{user_id:id,account_status:'active',tier:'free',premium_until:null}}
    if(account.tier==='premium'&&account.premium_until&&Date.parse(account.premium_until)<=Date.now())account={...account,tier:'free'};if(this.user?.id===id)this.entitlement=account;return account;
  }
  async attachAvatars(people){
    if(!this.client?.storage)return people;const uid=this.user?.id,paths=[...new Set(people.map(p=>p.avatar_path).filter(Boolean))],missing=paths.filter(path=>!this.avatarCache.has(path)||this.avatarCache.get(path).expires<Date.now());
    if(missing.length){const result=await this.client.storage.from('echo-avatars').createSignedUrls(missing,3600);if(this.user?.id!==uid)return people;for(const item of result.data||[])if(item.signedUrl)this.avatarCache.set(item.path,{url:item.signedUrl,expires:Date.now()+3500000})}
    if(this.user?.id===uid)for(const person of people)person.avatar_url=this.avatarCache.get(person.avatar_path)?.url||null;return people;
  }
  async uploadAvatar(blob){
    const uid=this.requireUser();if(this.avatarUploading)throw Error('照片正在上传，请稍候。');if(blob?.type!=='image/jpeg'||blob.size>1048576)throw Error('请选择已处理的 JPEG 照片。');
    this.avatarUploading=true;const path=uid+'/'+crypto.randomUUID()+'.jpg',previous=this.profile?.avatar_path,bucket=this.client.storage.from('echo-avatars');
    try{
      const uploaded=await bucket.upload(path,blob,{contentType:'image/jpeg',upsert:false,cacheControl:'3600'});if(uploaded.error)throw uploaded.error;if(this.user?.id!==uid)throw Error('登录状态已改变。');
      const result=await this.client.from('profiles').update({avatar_path:path}).eq('id',uid).select().single();if(result.error){await bucket.remove([path]);throw result.error}if(this.user?.id!==uid)throw Error('登录状态已改变。');
      this.profile=result.data;await this.attachAvatars([this.profile]);if(previous&&previous!==path)await bucket.remove([previous]);this.syncAdmin().catch(()=>{});return this.profile;
    }finally{this.avatarUploading=false}
  }
  async removeAvatar(){
    const uid=this.requireUser(),previous=this.profile?.avatar_path;const result=await this.client.from('profiles').update({avatar_path:null}).eq('id',uid).select().single();if(result.error)throw result.error;if(this.user?.id!==uid)throw Error('登录状态已改变。');this.profile=result.data;if(previous)await this.client.storage.from('echo-avatars').remove([previous]);this.syncAdmin().catch(()=>{});return this.profile;
  }
  async messages(personId,cursor=null){
    const uid=this.requireUser();
    const {data,error}=await this.client.rpc('read_friend_messages',{other_user:personId,before_time:cursor?.created_at||null,before_id:cursor?.id||null});
    if(error)throw new Error(error.code==='42501'?'好友关系已结束，无法读取聊天。':error.message);
    if(this.user?.id!==uid)throw new Error('登录状态已改变。');
    return data||[];
  }
  async sendMessage(personId,body='',track=null,messageId=crypto.randomUUID()){
    const uid=this.requireUser(),text=String(body).trim(),music=track?EchoMusicLibrary.share(track):null;
    if(text.length>2000||(!text&&!music))throw new Error('请输入消息或选择歌曲。');
    if(track&&!music)throw new Error('这首歌曲暂不支持直接分享。');
    const row={id:messageId,sender_id:uid,recipient_id:personId,body:text,track:music};
    let {data,error}=await this.client.from('messages').insert(row).select().single();
    if(error?.code==='23505'){
      const existing=await this.client.from('messages').select('*').eq('id',messageId).eq('sender_id',uid).eq('recipient_id',personId).single();
      if(!existing.error){data=existing.data;error=null}
    }
    if(error)throw new Error(error.code==='42501'?'双方确认好友后才能发送消息。':error.message);
    if(this.user?.id!==uid)throw new Error('登录状态已改变。');
    return data;
  }
  async deleteAccount(){const id=this.requireUser();if(this.client.storage){const bucket=this.client.storage.from('echo-avatars'),files=await bucket.list(id,{limit:1000});if(files.error)throw files.error;if(files.data?.length){const removed=await bucket.remove(files.data.map(file=>id+'/'+file.name));if(removed.error)throw removed.error}}if(this.user?.id!==id)throw Error('登录状态已改变。');const {error}=await this.client.rpc('delete_my_account',{expected_user:id});if(error)throw error;this.dispatchEvent(new CustomEvent('deleted',{detail:{id}}));await this.client.auth.signOut({scope:'local'})}
}
globalThis.EchoAccountService=EchoAccountService;

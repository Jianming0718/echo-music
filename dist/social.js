'use strict';
let chatContext=null,chatGeneration=0,shareGeneration=0,friendShare=null;
const chatPeople=new Map();
function stopChat(){chatGeneration++;if(chatContext)clearTimeout(chatContext.timer);chatContext=null}
function sharedMusic(track){return track?.provider==='youtube'?null:EchoMusicLibrary.share(track)}
function musicCard(track,action='play'){
 const t=sharedMusic(track)||(track?.provider==='youtube'?{...EchoMusicLibrary.share(track),unavailable:true}:null);if(!t)return '';
 return `<div class="music-message"><img src="${esc(t.cover)}" alt="${esc(t.album||t.title)} 专辑封面"><div><strong>${esc(t.title)}</strong><span>${esc(t.artist)}</span><small>${esc(t.category)}</small></div>${t.unavailable?'<small>来源已停用</small>':action==='play'?`<button class="icon-btn" data-message-play="${esc(t.id)}" aria-label="播放 ${esc(t.title)}">${icon('play')}</button>`:action==='remove'?'<button type="button" class="icon-btn" id="remove-chat-track" aria-label="移除歌曲">'+icon('close')+'</button>':''}</div>`;
}
function displayMessage(row,uid){
 const time=new Date(row.created_at),valid=Number.isFinite(time.getTime());
 return `<li class="chat-message ${row.sender_id===uid?'outgoing':'incoming'}" data-message="${row.id}">${row.body?`<p>${esc(row.body)}</p>`:''}${musicCard(row.track)}<time ${valid?`datetime="${time.toISOString()}"`:''}>${valid?esc(time.toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})):''}</time></li>`;
}
function renderChatMessages(context,keepPosition=false){
 if(chatContext!==context||view!=='chat'||cloud.user?.id!==context.uid)return;
 const area=$('#chat-scroll');if(!area)return;
 const height=area.scrollHeight,top=area.scrollTop,atEnd=height-top-area.clientHeight<80;
 const signature=context.items.map(row=>row.id).join(',');
 if(context.signature!==signature){
  context.signature=signature;
  $('#chat-messages').innerHTML=context.items.length?context.items.map(row=>displayMessage(row,context.uid)).join(''):'<li class="chat-empty">还没有消息</li>';
  if(keepPosition)area.scrollTop=top+(area.scrollHeight-height);
  else if(atEnd||!context.rendered)area.scrollTop=area.scrollHeight;
  context.rendered=true;
 }
 $('#chat-older').hidden=!context.hasMore;
}
function mergeChatMessages(context,rows){const all=new Map(context.items.map(row=>[row.id,row]));for(const row of rows)all.set(row.id,row);context.items=[...all.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))}
async function refreshChat(older=false){
 const context=chatContext;if(!context||context.loading||document.hidden)return;
 const generation=chatGeneration;context.loading=true;const button=$('#chat-older');if(older&&button)button.disabled=true;
 try{
  const cursor=older?context.items[0]:null,rows=await cloud.messages(context.person.id,cursor);
  if(generation!==chatGeneration||chatContext!==context||cloud.user?.id!==context.uid)return;
  if(!older&&context.items.length&&rows.length===40&&!rows.some(row=>context.items.some(item=>item.id===row.id))){context.items=[];context.hasMore=true;context.rendered=false}
  if(older||!context.loaded)context.hasMore=rows.length===40;
  mergeChatMessages(context,rows);renderChatMessages(context,older);context.loaded=true;
  $('#chat-status').textContent='';$('#chat-form').hidden=false;$('#chat-form button[type="submit"]').disabled=!$('#chat-body').value.trim()&&!context.track;
 }catch(error){
  if(chatContext!==context||cloud.user?.id!==context.uid)return;
  $('#chat-status').textContent=error.message||'消息暂时无法加载，请重试。';
  if(error.message.includes('好友关系')){context.items=[];renderChatMessages(context);$('#chat-form').hidden=true}
 }finally{
  context.loading=false;if(button?.isConnected)button.disabled=false;
  if(chatContext===context){clearTimeout(context.timer);context.timer=setTimeout(()=>refreshChat(),12000)}
 }
}
function openChat(person){
 if(!cloud.user){accountPanel();return}
 if(!person?.id||person.id===cloud.user.id)return;
 stopChat();cancelCatalog();sheet.close();if(now.open)now.close();view='chat';
 const context={uid:cloud.user.id,person,items:[],track:null,draftId:null,signature:null,loaded:false,hasMore:false,loading:false,timer:null};chatContext=context;chatPeople.set(person.id,person);
 main.innerHTML=`<section class="chat-shell" aria-label="与 ${esc(person.display_name||'好友')} 聊天"><header class="chat-heading"><button class="icon-btn" id="chat-back" aria-label="返回好友">${icon('prev')}</button><div><h1>${esc(person.display_name||'好友')}</h1><span>${person.handle?'@'+esc(person.handle):''}</span></div><button class="icon-btn" id="chat-refresh" aria-label="刷新消息">${icon('repeat')}</button></header><div class="chat-scroll" id="chat-scroll"><button class="text-button" id="chat-older" hidden>更早的消息</button><ol id="chat-messages" role="log" aria-label="聊天消息" aria-live="polite" aria-relevant="additions"></ol></div><p id="chat-status" class="chat-status" role="status">正在加载…</p><div id="chat-attachment"></div><form id="chat-form" class="chat-form"><label for="chat-body">消息</label><textarea id="chat-body" name="body" maxlength="2000" rows="2" aria-label="消息"></textarea><div><button type="button" class="text-button" id="attach-current-song">${icon('disc')} 分享正在播放</button><button class="primary-btn" type="submit" disabled>发送</button></div></form></section>`;
 $$('[data-view]').forEach(button=>{button.classList.remove('active');button.removeAttribute('aria-current')});
 refreshChat();
}
function renderChatAttachment(){if(!chatContext)return;$('#chat-attachment').innerHTML=chatContext.track?musicCard(chatContext.track,'remove'):'';$('#chat-form button[type="submit"]').disabled=!$('#chat-body').value.trim()&&!chatContext.track}
async function chooseMusicFriend(id){
 const track=sharedMusic(getTrack(id));if(!track){toast('该曲目暂不支持直接分享。');return}
 if(!cloud.user){accountPanel();return}
 const generation=++shareGeneration,uid=cloud.user.id;friendShare={uid,track,ids:new Map()};
 openSheet('分享音乐',`<h2>分享给好友</h2>${musicCard(track,'preview')}<div id="share-friends">正在加载…</div>`);sheet.dataset.panel='share';
 try{
  const list=(await cloud.friends()).filter(row=>row.status==='accepted'&&row.person?.id);
  if(generation!==shareGeneration||cloud.user?.id!==uid||!sheet.open||sheet.dataset.panel!=='share')return;
  for(const row of list){chatPeople.set(row.person.id,row.person);friendShare.ids.set(row.person.id,crypto.randomUUID())}
  $('#share-friends').innerHTML=list.length?list.map(row=>`<div class="person-row"><span class="person-avatar">${avatarMarkup(row.person)}</span><div><strong>${esc(row.person.display_name||'好友')}</strong><small>@${esc(row.person.handle||'')}</small></div><button class="secondary-btn" data-send-music="${row.person.id}">发送</button></div>`).join(''):'<p>还没有好友。先在好友页添加对方。</p><button class="secondary-btn" id="share-open-friends">添加好友</button>';
 }catch{if(generation===shareGeneration&&sheet.open&&sheet.dataset.panel==='share')$('#share-friends').innerHTML='<p>好友暂时无法加载。</p><button class="secondary-btn" data-share-friend="'+esc(id)+'">重试</button>'}
}
function playMessageTrack(id){
 const row=chatContext?.items.find(item=>item.track?.id===id),t=sharedMusic(row?.track);if(!t)return;
 let track=getTrack(t.id);
 if(!track){if(t.provider==='Audius')track={...t,src:CATALOG_API+'/tracks/'+t.id.slice(7)+'/stream?app_name=Echo',remote:true,mood:'',permalink:'https://audius.co'};if(track)tracks.push(track)}
 if(track){if(!bundled.some(item=>item.id===track.id))Object.assign(track,{title:t.title,artist:t.artist,album:t.album,cover:t.cover,category:t.category,duration:t.duration||track.duration});playTrack(track.id,[track.id]);rememberOnline()}
}
document.addEventListener('click',async event=>{
 const target=event.target.closest('button');if(!target)return;const data=target.dataset;
 try{
  if(data.chatPerson){const person=chatPeople.get(data.chatPerson)||{id:data.chatPerson,display_name:data.personName||'好友',handle:data.personHandle||''};openChat(person)}
  if(data.shareFriend)await chooseMusicFriend(data.shareFriend);
  if(data.messagePlay)playMessageTrack(data.messagePlay);
  if(target.id==='chat-back')setView('friends');
  if(target.id==='chat-refresh')refreshChat();
  if(target.id==='chat-older')refreshChat(true);
  if(target.id==='attach-current-song'&&chatContext&&!chatContext.sending){const track=sharedMusic(activeTrack());if(!track){toast('本机文件不能直接分享。');return}chatContext.track=track;chatContext.draftId=null;renderChatAttachment()}
  if(target.id==='remove-chat-track'&&chatContext&&!chatContext.sending){chatContext.track=null;chatContext.draftId=null;renderChatAttachment()}
  if(target.id==='share-open-friends'){sheet.close();setView('friends')}
  if(data.sendMusic){
   const share=friendShare,uid=cloud.user?.id;if(!share||share.uid!==uid||!share.ids.has(data.sendMusic))return;
   target.disabled=true;await cloud.sendMessage(data.sendMusic,'',share.track,share.ids.get(data.sendMusic));
   if(cloud.user?.id!==uid||friendShare!==share)return;
   sheet.close();toast('歌曲已分享');openChat(chatPeople.get(data.sendMusic));
  }
 }catch(error){if(target.isConnected)target.disabled=false;toast(error.message||'操作失败，请重试。')}
});
document.addEventListener('input',event=>{if(event.target.id==='chat-body'&&chatContext){chatContext.draftId=null;$('#chat-form button[type="submit"]').disabled=!event.target.value.trim()&&!chatContext.track}});
document.addEventListener('submit',async event=>{
 if(event.target.id!=='chat-form')return;event.preventDefault();const context=chatContext,form=event.target;if(!context||context.sending)return;
 const body=$('#chat-body').value.trim();if(!body&&!context.track)return;context.sending=true;
 const input=$('#chat-body'),button=$('button[type="submit"]',form);button.disabled=true;input.disabled=true;context.draftId ||= crypto.randomUUID();
 try{
  const row=await cloud.sendMessage(context.person.id,body,context.track,context.draftId);
  if(chatContext!==context||cloud.user?.id!==context.uid)return;
  mergeChatMessages(context,[row]);renderChatMessages(context);$('#chat-scroll').scrollTop=$('#chat-scroll').scrollHeight;
  input.value='';context.track=null;context.draftId=null;$('#chat-attachment').innerHTML='';$('#chat-status').textContent='';
 }catch(error){if(chatContext===context)$('#chat-status').textContent=(error.message||'发送失败')+'，内容已保留，可重试。'}
 finally{context.sending=false;if(chatContext===context){input.disabled=false;button.disabled=!input.value.trim()&&!context.track}}
});
cloud.addEventListener('session',()=>{if(chatContext&&cloud.user?.id!==chatContext.uid){stopChat();setView('friends')}if(friendShare&&cloud.user?.id!==friendShare.uid){friendShare=null;shareGeneration++;if(sheet.dataset.panel==='share')sheet.close()}});
document.addEventListener('visibilitychange',()=>{if(chatContext){clearTimeout(chatContext.timer);if(!document.hidden)refreshChat()}});
window.addEventListener('pagehide',()=>{if(chatContext)clearTimeout(chatContext.timer)});

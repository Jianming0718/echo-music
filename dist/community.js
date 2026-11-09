'use strict';
globalThis.EchoCommunity=(() => {
 const defaults={feed:true,danmaku:true,rooms:true,chat:true},prefs={...defaults,...read('social-preferences',{})};
 let generation=0,mode='feed',posts=[],more=false,loading=false,serviceUid=null,serviceReady=false;
 let room=null,roomTimer=null,roomBusy=false,following=false,roomMessages=[],roomSignature='',roomGeneration=0,roomOpening=null;
 let danTrack=null,danRows=[],danSeen=new Set(),danPosition=-1,danTimer=null,danBusy=false,danGeneration=0,lane=0;
 let panelGeneration=0,feedTrack=null,feedScope='all',squareReady=false,feedPhoto=null,photoEpoch=0,photoBusy=false;
 const label={feed:'广场',danmaku:'歌曲弹幕',rooms:'一起听歌房',chat:'好友聊天'};
 const active=key=>prefs[key]!==false;
 const alive=(epoch,uid)=>epoch===generation&&cloud.user?.id===uid&&view==='community';
 const personHTML=person=>`<span class="person-avatar">${avatarMarkup(person||{})}</span><div><strong translate="no">${esc(person?.display_name||'听友')}</strong><small translate="no">@${esc(person?.handle||'')}</small></div>`;
 const stamp=value=>{const time=new Date(value);return Number.isFinite(time.getTime())?time.toLocaleString(EchoI18n.locale,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):''};
 function settingsMarkup(){return `<fieldset class="social-settings"><legend>社交与互动</legend>${Object.keys(defaults).map(key=>`<div class="setting-row"><label for="social-${key}">${label[key]}</label><input id="social-${key}" data-social-setting="${key}" type="checkbox" ${active(key)?'checked':''}></div>`).join('')}<p class="muted-line">关闭后隐藏入口并停止刷新；已有动态和消息不会删除。</p></fieldset>`}
 function friendMarkup(){return `<div class="social-shortcuts">${active('feed')?`<button class="secondary-btn" data-community-mode="feed">${icon('cloud')} 广场</button>`:''}${active('rooms')?`<button class="secondary-btn" data-community-mode="rooms">${icon('friends')} 一起听歌房</button>`:''}${room&&active('rooms')?`<button class="text-button" data-room-open="${room.id}">返回听歌房</button>`:''}</div>`}
 function syncEntrances(){
  document.documentElement.dataset.socialChat=active('chat')?'on':'off';$$('[data-community-entry]').forEach(button=>{button.hidden=!active('feed')});
  const button=$('#danmaku-open');if(button)button.hidden=!active('danmaku');
 }
 function failHTML(error){const upgrade=['INVALID_REQUEST','SCHEMA_NOT_READY'].includes(error?.code);return `<div class="community-status" role="status"><p>${upgrade?'社交服务需要更新至版本 6，请联系管理员。':esc(error?.message||'连接失败，请重试。')}</p><button class="secondary-btn" data-community-retry>重试</button>${upgrade&&cloud.isAdmin?'<a class="text-button" href="https://drive.google.com/file/d/1A4IvlGQENgKVpCxwhYr2GYuWUDuF75Zv/view" target="_blank" rel="noopener">下载后端更新包</a>':''}</div>`}
 async function api(action,body={}) {
  if(!cloud.sheetMode)throw Error('互动功能需要连接 Google Sheets 账号服务。');
  const uid=cloud.user?.id;
  if(!serviceReady||serviceUid!==uid){const status=await cloud.request('social.status');if(cloud.user?.id!==uid)throw Error('登录状态已改变。');serviceUid=uid;serviceReady=true;squareReady=status.capabilities?.includes('square')===true;syncSquareControls()}
  const feature=action.startsWith('social.')&&action!=='social.status'?'feed':action.startsWith('danmaku.')?'danmaku':action.startsWith('rooms.')?'rooms':null;if(feature&&!active(feature))throw Error('互动功能已关闭。');
  const sentAt=Date.now();try{const result=await cloud.request(action,body);if(result.server_time)result.clockOffset=Date.parse(result.server_time)-(sentAt+Date.now())/2;return result}catch(error){if(error.code==='UNAUTHORIZED'){serviceReady=false;serviceUid=null}throw error}
 }
 function open(next='feed') {mode=next;if(!active(mode))return;if(!cloud.user){accountPanel();return}setView('community')}
 function render(){
  const epoch=++generation,uid=cloud.user?.id;loading=false;
  if(!active(mode))mode=active('feed')?'feed':'rooms';
  $('#page-title').textContent='广场';
  main.innerHTML=`<section class="community-page"><nav class="community-tabs" aria-label="广场"><button class="text-button" data-view="friends">${icon('prev')} 好友</button>${['feed','rooms'].filter(active).map(key=>`<button class="${mode===key?'active':''}" data-community-mode="${key}" aria-pressed="${mode===key}">${label[key]}</button>`).join('')}</nav><div id="community-content"></div></section>`;
  const area=$('#community-content');
  if(!uid){area.innerHTML=empty('登录后逛广场','分享日常、发现新朋友，也可以只与好友分享。','<button class="primary-btn" id="account-btn-inline">登录</button>');return}
  if(!active(mode)){area.innerHTML=empty('互动功能已关闭','可在设置中重新开启。');return}
  if(mode==='feed'){
   feedTrack=null;clearPhoto();posts=[];more=false;
   area.innerHTML=`<div class="community-list-heading feed-heading"><div class="feed-scopes" role="group" aria-label="动态范围"><button data-feed-scope="all" class="${feedScope==='all'?'active':''}" aria-pressed="${feedScope==='all'}">广场</button><button data-feed-scope="friends" class="${feedScope==='friends'?'active':''}" aria-pressed="${feedScope==='friends'}">好友</button><button data-feed-scope="mine" class="${feedScope==='mine'?'active':''}" aria-pressed="${feedScope==='mine'}">我的</button></div><div class="feed-toolbar-actions"><button type="button" class="icon-btn feed-compose-toggle" id="feed-compose-toggle" aria-label="发布动态" title="发布动态" aria-controls="feed-form" aria-expanded="false">${icon('plus')}</button><button class="icon-btn" id="feed-refresh" aria-label="刷新动态">${icon('repeat')}</button></div></div><form id="feed-form" class="community-composer" hidden><div class="composer-person">${personHTML(cloud.profile)}<label class="feed-audience" for="feed-visibility"><span>谁可以看到</span><select id="feed-visibility" name="visibility"><option value="friends">仅好友可见</option><option value="public" ${squareReady?'':'disabled'}>所有用户可见</option></select></label></div><label for="feed-body">分享你的日常</label><textarea id="feed-body" name="body" maxlength="1000" rows="3"></textarea><div id="feed-photo-preview"></div><div id="feed-track"></div><div class="composer-actions"><input id="feed-photo-file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden><button class="text-button" type="button" id="feed-photo-add" ${squareReady?'':'disabled'}>${icon('plus')} 照片</button><button class="text-button" type="button" id="feed-attach" aria-pressed="false">${icon('disc')} 音乐</button><span class="composer-limit" aria-hidden="true"><span id="feed-length">0</span>/1000</span><button class="primary-btn" type="submit">发布</button></div><p id="feed-form-status" role="status"></p><p id="square-upgrade" class="muted-line" ${squareReady?'hidden':''}>公开动态与照片需要管理员更新账号服务；现在仍可发布好友可见的文字。</p></form><div id="community-status" role="status">正在加载…</div><div id="feed-list"></div><button class="secondary-btn" id="feed-more" hidden>加载更多</button>`;
   loadFeed(false,epoch,uid);
  }else{
   area.innerHTML=`<div id="room-stage" tabindex="-1"></div><div class="community-list-heading"><h2>一起听歌房</h2><button class="primary-btn" id="room-create">${icon('plus')} 创建听歌房</button></div><p class="muted-line">邀请好友一起听歌、聊天。每人使用自己的播放连接，播放进度定期同步。</p><div id="community-status" role="status">正在加载…</div><div id="room-list"></div>`;
   loadRooms(epoch,uid);if(roomOpening)paintRoomOpening();else if(room)renderRoom();
  }
 }
 function setComposerOpen(open,{focus=true}={}){
  const form=$('#feed-form'),button=$('#feed-compose-toggle');if(!form||!button)return;
  form.hidden=!open;button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',EchoI18n.t(open?'收起编辑器':'发布动态'));button.title=EchoI18n.t(open?'收起编辑器':'发布动态');button.classList.toggle('expanded',open);
  if(focus)(open?$('#feed-body'):button).focus({preventScroll:true});
 }
 function syncSquareControls(){const form=$('#feed-form');if(form?.dataset.busy==='true')return;const select=$('#feed-visibility');if(select){const option=$('option[value=public]',select);if(option.disabled===squareReady)option.disabled=!squareReady;if(!squareReady&&select.value!=='friends')select.value='friends'}const photo=$('#feed-photo-add');if(photo&&photo.disabled===squareReady)photo.disabled=!squareReady;const upgrade=$('#square-upgrade');if(upgrade&&upgrade.hidden!==squareReady)upgrade.hidden=squareReady;$$('[data-feed-scope]').forEach(button=>{const disabled=!squareReady&&button.dataset.feedScope!=='all';if(button.disabled!==disabled)button.disabled=disabled})}

 function clearPhoto(){photoEpoch++;photoBusy=false;if(feedPhoto?.url)URL.revokeObjectURL(feedPhoto.url);feedPhoto=null;$('#feed-photo-preview')?.replaceChildren()}
 function postPhotoURL(value){try{const url=new URL(value),origin=new URL(window.ECHO_CONFIG.supabaseUrl);return url.protocol==='https:'&&url.origin===origin.origin&&/^\/storage\/v1\/object\/sign\/echo-avatars\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg$/i.test(url.pathname)?url.href:null}catch{return null}}
 async function choosePhoto(file){const uid=cloud.user?.id,form=$('#feed-form');clearPhoto();const token=photoEpoch,status=$('#feed-form-status');if(!file||!squareReady||!form)return;photoBusy=true;status.textContent='正在处理照片…';try{const blob=await EchoPostPhoto.prepare(file),image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('无法读取照片。'));reader.readAsDataURL(blob)});if(cloud.user?.id!==uid||!form.isConnected||token!==photoEpoch||!active('feed'))return;feedPhoto={image,url:URL.createObjectURL(blob)};$('#feed-photo-preview').innerHTML=`<div class="feed-photo-draft"><img src="${esc(feedPhoto.url)}" alt="待发布的照片"><button class="icon-btn" type="button" id="feed-photo-remove" aria-label="移除照片">${icon('close')}</button></div>`;form._id=null;status.textContent=''}catch(error){if(cloud.user?.id===uid&&form.isConnected&&token===photoEpoch)status.textContent=error.message}finally{if(token===photoEpoch)photoBusy=false}}
 function postHTML(post){return `<article class="feed-card" data-post="${esc(post.id)}"><span class="person-avatar feed-avatar">${avatarMarkup(post.person||{})}</span><div class="feed-content"><header class="feed-author"><strong translate="no">${esc(post.person?.display_name||'听友')}</strong></header>${post.body?`<p class="feed-body" translate="no">${esc(post.body)}</p>`:''}${postPhotoURL(post.image_url)?`<img class="feed-photo" src="${esc(postPhotoURL(post.image_url))}" alt="动态照片" loading="lazy" decoding="async">`:post.image_path?'<p class="muted-line">照片暂不可用，请刷新重试。</p>':''}${post.track?`<div class="feed-music-attachment">${musicCard(post.track)}</div>`:''}<footer class="feed-footer"><div class="feed-post-meta"><time datetime="${esc(post.created_at)}">${esc(stamp(post.created_at))}</time><small class="post-visibility">${post.visibility==='public'?'所有用户可见':'仅好友可见'}</small></div><div class="feed-actions"><button type="button" data-post-like="${esc(post.id)}" aria-label="点赞" aria-pressed="${Boolean(post.liked)}" class="${post.liked?'liked':''}">${icon('heart')} <span>${post.likes||0}</span></button><button type="button" data-post-comments="${esc(post.id)}" aria-label="评论" aria-expanded="false">${icon('lyrics')} <span>${post.comments||0}</span></button><button type="button" class="feed-more-button" data-post-options="${esc(post.id)}" aria-label="更多操作">${icon('more')}</button></div></footer><div class="post-comments" id="comments-${esc(post.id)}" hidden></div></div></article>`}
 function postOptions(id){const post=posts.find(row=>row.id===id);if(!post)return;const photo=postPhotoURL(post.image_url);openSheet('动态',`<h2 translate="no">${esc(post.person?.display_name||'听友')}</h2><p class="muted-line">${post.visibility==='public'?'所有用户可见':'仅好友可见'}</p><div class="action-menu">${post.body?`<button data-post-copy="${esc(id)}">${icon('lyrics')} 复制文字</button>`:''}${post.track?`<button data-share-friend="${esc(post.track.id)}">${icon('friends')} 分享给好友</button>`:''}${photo?`<a class="secondary-btn" href="${esc(photo)}" target="_blank" rel="noopener">查看照片 ${icon('arrow')}</a>`:''}${post.user_id===cloud.user?.id||cloud.isAdmin?`<button class="danger" data-post-delete="${esc(id)}">${icon('close')} 删除动态</button>`:''}</div>`);sheet.dataset.panel='post-options';sheet.dataset.postId=id}

 async function feedSnapshot(scope){let rows=[],hasMore=true,cursor=null;const count=view==='community'&&mode==='feed'&&scope===feedScope?Math.max(20,posts.length):20;do{const result=await api('social.feed',{...(cursor?{cursor}:{}),...(squareReady?{scope}:{})});rows.push(...(result.posts||[]));hasMore=result.hasMore;if(!hasMore||!result.posts?.length)break;const last=result.posts.at(-1);cursor={id:last.id,created_at:last.created_at}}while(rows.length<count);await cloud.attachAvatars(rows.map(post=>post.person).filter(Boolean));return {posts:rows,hasMore}}
 function paintFeed(result){if(view!=='community'||mode!=='feed'||!$('#feed-list'))return;const rows=result.posts||[],area=$('#feed-list'),focus=document.activeElement,selection=focus?.matches('input,textarea')?[focus.selectionStart,focus.selectionEnd]:null,anchor=window.scrollY>100?[...area.children].find(node=>node.getBoundingClientRect().bottom>100):null,top=anchor?.getBoundingClientRect().top;
  const previous=new Map([...area.querySelectorAll(':scope>.feed-card')].map(node=>[node.dataset.post,node]));posts=rows;more=result.hasMore;
  rows.forEach(post=>{if(post.track)registerCloudTrack(sharedMusic(post.track));let node=previous.get(post.id);const core=EchoDataSignature({...post,likes:undefined,liked:undefined,comments:undefined}),signature=EchoDataSignature(post);
   if(!node||node.dataset.core!==core){const panel=node?.querySelector('.post-comments'),template=document.createElement('template');template.innerHTML=postHTML(post);const next=template.content.firstElementChild;next.dataset.core=core;next.dataset.signature=signature;if(panel?.childElementCount){next.querySelector('.post-comments').replaceWith(panel);next.querySelector('[data-post-comments]').setAttribute('aria-expanded',String(!panel.hidden))}if(node)node.replaceWith(next);node=next}
   else if(node.dataset.signature!==signature){const like=node.querySelector('[data-post-like]'),count=like.querySelector('span'),comments=node.querySelector('[data-post-comments] span');if(count.textContent!==String(post.likes||0))count.textContent=post.likes||0;if(comments.textContent!==String(post.comments||0))comments.textContent=post.comments||0;like.setAttribute('aria-pressed',String(Boolean(post.liked)));like.classList.toggle('liked',Boolean(post.liked));node.dataset.signature=signature}
   const url=postPhotoURL(post.image_url),photo=node.querySelector('.feed-photo');if(photo&&url&&photo.getAttribute('src')!==url)photo.src=url;
   previous.delete(post.id);const index=rows.indexOf(post);if(area.children[index]!==node)area.insertBefore(node,area.children[index]||null);
  });for(const node of previous.values())node.remove();if(rows.length){for(const node of area.querySelectorAll(':scope>.community-empty'))node.remove()}else if(!area.querySelector('.community-empty'))area.innerHTML='<p class="community-empty">这里还没有动态。分享你的第一段日常吧。</p>';
  syncSquareControls();if($('#community-status').textContent)$('#community-status').textContent='';if($('#feed-more').hidden===more)$('#feed-more').hidden=!more;
  if(focus?.isConnected&&document.activeElement!==focus){focus.focus({preventScroll:true});if(selection)focus.setSelectionRange(...selection)}if(anchor?.isConnected&&Number.isFinite(top)){const delta=anchor.getBoundingClientRect().top-top;if(Math.abs(delta)>1)window.scrollBy({top:delta,behavior:'instant'})}
 }
 for(const scope of ['all','friends','mine']){const key='feed:'+scope;EchoLiveData.register(key,()=>feedSnapshot(scope),{allowed:()=>active('feed')&&(scope==='all'||squareReady),warm:scope==='all'});EchoLiveData.watch(key,()=>view==='community'&&mode==='feed'&&feedScope===scope&&Boolean($('#feed-list')),value=>paintFeed(value))}
 EchoLiveData.addEventListener('denied',event=>{if(event.detail.key==='feed:'+feedScope&&view==='community'&&mode==='feed'){posts=[];$('#feed-list')?.replaceChildren();if($('#community-status'))$('#community-status').innerHTML=failHTML(event.detail.error)}});
 async function loadFeed(append=false,epoch=generation,uid=cloud.user?.id){
  if(loading||!alive(epoch,uid)||mode!=='feed'||append&&!posts.length)return;loading=true;const button=$('#feed-more');if(button)button.disabled=true;
  try{let result;if(append){const last=posts.at(-1),page=await api('social.feed',{cursor:{id:last.id,created_at:last.created_at},...(squareReady?{scope:feedScope}:{})});await cloud.attachAvatars((page.posts||[]).map(row=>row.person).filter(Boolean));result={posts:[...new Map([...posts,...page.posts].map(row=>[row.id,row])).values()],hasMore:page.hasMore};EchoLiveData.seed('feed:'+feedScope,result)}else result=await EchoLiveData.read('feed:'+feedScope);if(alive(epoch,uid)&&mode==='feed')paintFeed(result)}catch(error){if(alive(epoch,uid)&&mode==='feed'){$('#community-status').innerHTML=failHTML(error)}}finally{if(alive(epoch,uid)){loading=false;if(button?.isConnected)button.disabled=false}}
 }
 async function commentSnapshot(id){const area=$('#comments-'+CSS.escape(id)),target=Math.max(30,area?._rows?.length||0);let rows=[],hasMore=true,cursor=null;do{const result=await api('social.comments',{post_id:id,...(cursor?{cursor}:{})});rows.push(...result.comments);hasMore=result.hasMore;if(!hasMore||!result.comments.length)break;const last=result.comments.at(-1);cursor={id:last.id,created_at:last.created_at}}while(rows.length<target);return {comments:rows,hasMore}}
 function paintComments(id,result){const area=$('#comments-'+CSS.escape(id));if(!area||view!=='community'||mode!=='feed')return;area._rows=result.comments;const rows=result.comments.slice().reverse();if(!area.querySelector('.comment-form'))area.innerHTML=`<ol class="comment-list"></ol><button class="text-button" data-comments-more="${esc(id)}" hidden>更早的评论</button><form class="comment-form" data-post-id="${esc(id)}"><label for="comment-${esc(id)}">评论</label><input id="comment-${esc(id)}" name="body" maxlength="500" required autocomplete="off"><button class="secondary-btn" type="submit">发送</button><p class="form-message" role="status"></p></form>`;
  EchoPatchRows(area.querySelector('.comment-list'),rows,row=>row.id,row=>`<li class="feed-comment"><div class="comment-copy"><strong class="comment-author" translate="no">${esc(row.person?.display_name||'听友')}</strong><span class="comment-colon" aria-hidden="true">: </span><p class="comment-body" translate="no">${esc(row.body)}</p></div><time class="comment-time" datetime="${esc(row.created_at)}">${esc(stamp(row.created_at))}</time>${row.user_id===cloud.user?.id||posts.find(post=>post.id===id)?.user_id===cloud.user?.id||cloud.isAdmin?`<button type="button" class="icon-btn comment-delete" data-comment-delete="${esc(row.id)}" data-post-id="${esc(id)}" aria-label="删除评论" title="删除评论">${icon('close')}</button>`:''}</li>`);const more=area.querySelector('[data-comments-more]');if(more.hidden===Boolean(result.hasMore))more.hidden=!result.hasMore;if(area.dataset.loaded!=='true')area.dataset.loaded='true';
 }
 async function comments(id,append=false){const area=$('#comments-'+CSS.escape(id)),uid=cloud.user?.id,epoch=generation;if(!area||area.dataset.busy==='true')return;area.hidden=false;area.dataset.busy='true';const key='comments:'+id;if(!EchoLiveData.tasks.has(key)){EchoLiveData.register(key,()=>commentSnapshot(id),{allowed:()=>active('feed'),warm:false});EchoLiveData.watch(key,()=>view==='community'&&mode==='feed'&&Boolean($('#comments-'+CSS.escape(id))&&!$('#comments-'+CSS.escape(id)).hidden),(result)=>paintComments(id,result))}
  try{let result;if(append){const last=area._rows.at(-1),page=await api('social.comments',{post_id:id,cursor:{id:last.id,created_at:last.created_at}});result={comments:[...new Map([...area._rows,...page.comments].map(row=>[row.id,row])).values()],hasMore:page.hasMore};EchoLiveData.seed(key,result)}else result=await EchoLiveData.read(key,{fresh:Boolean(area.querySelector('.comment-form'))});if(alive(epoch,uid)&&area.isConnected)paintComments(id,result)}catch(error){if(alive(epoch,uid)&&area.isConnected){if(area.querySelector('.form-message'))area.querySelector('.form-message').textContent=error.message;else area.innerHTML=`<p role="status">${esc(error.message)}</p><button class="text-button" data-post-comments="${esc(id)}">重试</button>`}}finally{area.dataset.busy='false'}}
 async function loadRooms(epoch=generation,uid=cloud.user?.id){
  try{const result=await api('rooms.list');if(!alive(epoch,uid)||mode!=='rooms')return;
   $('#community-status').textContent='';$('#room-list').innerHTML=result.rooms.length?result.rooms.map(item=>`<button class="room-card" data-room-open="${esc(item.id)}"><span class="room-disc">${icon('disc')}</span><span><strong translate="no">${esc(item.name)}</strong><small translate="no">${esc(item.host?.display_name||'听友')} · ${esc(item.track?.title||'')}</small></span>${icon('arrow')}</button>`).join(''):'<p class="community-empty">还没有听歌房。邀请好友一起听歌吧。</p>';syncRoomButtons();
  }catch(error){if(alive(epoch,uid)&&mode==='rooms')$('#community-status').innerHTML=failHTML(error)}
 }
 async function createRoomPanel(){
  const track=sharedMusic(activeTrack());if(!track){toast('本机文件不能直接分享。');return}
  const uid=cloud.user?.id,epoch=++panelGeneration;
  openSheet('一起听歌房','<h2>邀请好友</h2><p>正在加载…</p>');sheet.dataset.panel='create-room';
  try{await api('social.status');const friends=(await cloud.friends()).filter(row=>row.status==='accepted'&&row.person?.id);if(epoch!==panelGeneration||cloud.user?.id!==uid||!sheet.open||sheet.dataset.panel!=='create-room')return;
   $('#sheet-content').innerHTML=`<h2>邀请好友</h2>${musicCard(track,'preview')}<form id="room-create-form"><label class="form-field">房间名称<input name="name" maxlength="60" required value="一起听歌"></label><fieldset class="room-invite-list"><legend>选择好友（最多 12 位）</legend>${friends.map(row=>`<label><input type="checkbox" name="members" value="${esc(row.person.id)}"><span translate="no">${esc(row.person.display_name||row.person.handle)}</span></label>`).join('')||'<p>还没有好友。</p>'}</fieldset><button class="primary-btn" type="submit" ${friends.length?'':'disabled'}>创建听歌房</button><p class="form-message" role="status"></p></form>`;
   $('#room-create-form')._track=track;
  }catch(error){if(epoch===panelGeneration&&cloud.user?.id===uid&&sheet.dataset.panel==='create-room'&&sheet.open)$('#sheet-content').innerHTML=failHTML(error)}
 }
 function stopRoom(){roomOpening=null;const badge=$('#room-indicator');if(badge)badge.hidden=true;roomGeneration++;clearTimeout(roomTimer);roomTimer=null;room=null;following=false;roomBusy=false;roomMessages=[];roomSignature=''}
 function syncRoomButtons(){for(const button of $$('[data-room-open]')){const busy=Boolean(roomOpening&&button.dataset.roomOpen===roomOpening.id);button.disabled=busy;if(busy)button.setAttribute('aria-busy','true');else button.removeAttribute('aria-busy');if(room?.id===button.dataset.roomOpen)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current')}}
 function revealRoom(){const area=$('#room-stage');if(!area)return;area.focus({preventScroll:true});area.scrollIntoView?.({block:'start',behavior:'auto'})}
 function paintRoomOpening(){const area=$('#room-stage');if(!area||!roomOpening)return;area.innerHTML='<section class="room-entry-state" role="status" aria-live="polite" aria-busy="true"><span class="operation-spinner" aria-hidden="true"></span><h2>正在进入听歌房…</h2><button class="secondary-btn" id="room-join-cancel">取消</button></section>';syncRoomButtons()}
 function cancelRoomOpening(){if(!roomOpening)return;roomOpening=null;roomGeneration++;if(!room)$('#room-stage')?.replaceChildren();syncRoomButtons()}
 function paintRoomError(id,error){const area=$('#room-stage');if(!area)return;const text=error.code==='FORBIDDEN'?'这间听歌房仅限受邀好友。':error.code==='ROOM_UNAVAILABLE'?'听歌房已结束或已过期。':error.message||'暂时无法进入听歌房，请重试。';area.innerHTML=`<section class="room-entry-state" role="alert"><h2>无法进入听歌房</h2><p>${esc(text)}</p><div><button class="primary-btn" data-room-open="${esc(id)}">重试</button><button class="secondary-btn" id="room-join-back">返回房间列表</button></div></section>`;revealRoom()}
 function openRoom(id){
  if(!active('rooms'))return Promise.resolve();if(!cloud.user){accountPanel();return Promise.resolve()}const uid=cloud.user.id,session=cloud.session?.token;
  if(roomOpening?.id===id&&roomOpening.uid===uid&&roomOpening.session===session)return roomOpening.promise;
  if(room?.id===id&&room.uid===uid){if(view!=='community'||mode!=='rooms'){mode='rooms';setView('community')}if(!$('#room-stage .listening-room'))renderRoom();else paintRoom();revealRoom();return Promise.resolve()}
  stopRoom();if(view!=='community'||mode!=='rooms'){mode='rooms';setView('community')}const pending={id,uid,session,epoch:roomGeneration,promise:null};roomOpening=pending;paintRoomOpening();revealRoom();
  const current=()=>roomOpening===pending&&pending.epoch===roomGeneration&&cloud.user?.id===uid&&cloud.session?.token===session&&active('rooms')&&view==='community'&&mode==='rooms';
  pending.promise=(async()=>{try{const result=await api('rooms.read',{id});if(!current())return;room={...result.room,uid,offset:result.clockOffset||0};roomMessages=result.messages||[];following=room.host_id===uid;roomOpening=null;renderRoom();scheduleRoom();revealRoom()}catch(error){if(current()){roomOpening=null;paintRoomError(id,error);if(['FORBIDDEN','ROOM_UNAVAILABLE'].includes(error.code))loadRooms()}}finally{if(roomOpening===pending)roomOpening=null;syncRoomButtons()}})();return pending.promise;
 }
 function renderRoom(){
  const area=$('#room-stage');if(!area||!room||mode!=='rooms')return;
  area.innerHTML=`<section class="listening-room"><header class="community-list-heading"><div><small>正在听歌</small><h2 translate="no">${esc(room.name)}</h2></div><button class="text-button" id="room-leave">${room.host_id===room.uid?'结束听歌房':'离开听歌房'}</button></header><div id="room-music"></div><p id="room-sync-status" class="muted-line" role="status"></p><div class="room-controls"><button class="primary-btn" id="room-follow" ${room.host_id===room.uid?'hidden':''}>${following?'停止跟随':'开始跟随'}</button><button class="secondary-btn" id="room-refresh">立即同步</button></div><div id="room-chat-scroll" class="room-chat-scroll"><ol id="room-messages" role="log" aria-live="polite" aria-relevant="additions"></ol></div><form id="room-message-form" class="comment-form"><label for="room-message-body">房间消息</label><input id="room-message-body" name="body" maxlength="500" required autocomplete="off"><button class="secondary-btn" type="submit">发送</button><p class="form-message" role="status"></p></form></section>`;roomSignature='';paintRoom();syncRoomButtons();
 }
 function paintRoom(){
  const badge=$('#room-indicator');if(badge){badge.hidden=!room;badge.classList.toggle('following',Boolean(room&&following));badge.setAttribute('aria-label',room&&following?'返回听歌房，正在跟随':'返回听歌房')}
  if(!room||view!=='community'||mode!=='rooms'||!$('#room-stage'))return;
  const music=$('#room-music');if(!music)return;
  if(music.dataset.track!==room.track?.id){music.innerHTML=musicCard(room.track);music.dataset.track=room.track?.id||''}
  $('#room-sync-status').textContent=room.host_id===room.uid?(sharedMusic(activeTrack())?'你是房主，播放操作会同步给好友。':'本机音乐无法同步，请选择音乐库歌曲。'):following?'正在跟随房主，播放进度定期同步。':'点击开始跟随，允许此设备播放。';
  $('#room-follow').textContent=following?'停止跟随':'开始跟随';
  const signature=roomMessages.map(row=>row.id).join(',');if(roomSignature===signature)return;roomSignature=signature;
  const area=$('#room-chat-scroll'),atEnd=area.scrollHeight-area.scrollTop-area.clientHeight<80;
  $('#room-messages').innerHTML=roomMessages.map(row=>`<li class="${row.user_id===room.uid?'own':''}"><strong translate="no">${esc(row.person?.display_name||'听友')}</strong><p translate="no">${esc(row.body)}</p><time>${esc(stamp(row.created_at))}</time></li>`).join('');if(atEnd)area.scrollTop=area.scrollHeight;
 }
 function roomPosition(){const elapsed=room.playing?Math.max(0,(Date.now()+room.offset-Date.parse(room.updated_at))/1000):0;return Math.min(Number(room.track?.duration)||43200,Math.max(0,Number(room.position)||0)+elapsed)}
 function applyRoom(){
  if(!room||!following||room.host_id===room.uid||document.hidden)return;
  const track=sharedMusic(room.track);if(!track){following=false;return}registerCloudTrack(track);
  const state=player.getSnapshot(),position=roomPosition();
  if(state.currentId!==track.id){player.select(track.id,{autoplay:room.playing});player.seek(position)}
  else {if(Math.abs(state.position-position)>4)player.seek(position);if(!room.playing&&state.playing)player.pause();else if(room.playing&&!state.playing&&!['loading','buffering','blocked','error'].includes(state.status))player.play()}
 }
 function scheduleRoom(){clearTimeout(roomTimer);if(room&&active('rooms')&&!document.hidden)roomTimer=setTimeout(pollRoom,4000)}
 async function pollRoom(){
  if(!room||roomBusy||document.hidden||!active('rooms'))return;
  const context=room,epoch=roomGeneration,uid=cloud.user?.id;roomBusy=true;
  try{
   if(context.host_id===uid){const state=player.getSnapshot(),shared=sharedMusic(activeTrack()),track=shared||context.track;if(track){const result=await api('rooms.update',{id:context.id,revision:context.revision,track,position:shared?state.position||0:context.position,playing:Boolean(shared&&state.playing)});if(epoch!==roomGeneration||cloud.user?.id!==uid)return;Object.assign(context,result.room,{offset:result.clockOffset||0})}}
   const result=await api('rooms.read',{id:context.id});if(epoch!==roomGeneration||cloud.user?.id!==uid||!active('rooms'))return;
   Object.assign(context,result.room,{offset:result.clockOffset||0});roomMessages=result.messages||[];applyRoom();paintRoom();
  }catch(error){if(epoch!==roomGeneration||cloud.user?.id!==uid)return;
   if(['FORBIDDEN','ROOM_UNAVAILABLE','UNAUTHORIZED','ACCOUNT_INACTIVE'].includes(error.code)){stopRoom();$('#room-stage')?.replaceChildren();toast(error.message)}
   else if(error.code==='ROOM_STALE'){try{const result=await api('rooms.read',{id:context.id});if(epoch===roomGeneration&&cloud.user?.id===uid)Object.assign(context,result.room)}catch{}}
   else if($('#room-sync-status'))$('#room-sync-status').textContent=error.message;
  }finally{if(epoch===roomGeneration){roomBusy=false;scheduleRoom()}}
 }
 function resetDanmaku(){danGeneration++;clearTimeout(danTimer);danTimer=null;danRows=[];danSeen.clear();danTrack=null;danPosition=-1;danBusy=false;$('#danmaku-layer')?.replaceChildren()}
 async function readDanmaku(){
  if(!active('danmaku')||!cloud.user||!now.open||document.hidden||!sharedMusic(activeTrack()))return;
  const track=activeTrack().id,uid=cloud.user.id;if(danTrack!==track){resetDanmaku();danTrack=track}
  if(danBusy)return;danBusy=true;const epoch=danGeneration;
  try{const result=await api('danmaku.read',{track_id:track});if(epoch!==danGeneration||uid!==cloud.user?.id||!active('danmaku'))return;danRows=result.messages||[];tickDanmaku()}
  catch{}finally{if(epoch===danGeneration){danBusy=false;clearTimeout(danTimer);if(active('danmaku')&&now.open&&!document.hidden)danTimer=setTimeout(readDanmaku,30000)}}
 }
 function tickDanmaku(){
  const state=player.getSnapshot();if(!active('danmaku')||!cloud.user||!now.open||document.hidden||!state.playing||EchoAppearance.reducedMotion)return;
  if(danTrack!==state.currentId){readDanmaku();return}
  const position=state.position||0;if(danPosition>=0&&(position<danPosition-.7||position-danPosition>4)){danSeen.clear();$('#danmaku-layer')?.replaceChildren()}
  const start=danPosition<0||Math.abs(position-danPosition)>4?position-.8:danPosition;danPosition=position;
  const rows=danRows.filter(row=>!danSeen.has(row.id)&&row.position>=start&&row.position<=position+.2).slice(0,3),layer=$('#danmaku-layer');if(!layer)return;
  for(const row of rows){danSeen.add(row.id);if(layer.childElementCount>=6)continue;const item=document.createElement('span');item.className='danmaku-item';item.textContent=row.body;item.style.top=(lane++%3)*31+'px';item.addEventListener('animationend',()=>item.remove(),{once:true});layer.append(item)}
 }
 async function danmakuPanel(){
  if(!active('danmaku'))return;if(!cloud.user){accountPanel();return}if(!sharedMusic(activeTrack())){toast('本机文件不能直接分享。');return}
  const uid=cloud.user.id,track=activeTrack().id,epoch=++panelGeneration;
  openSheet('歌曲弹幕','<h2>歌曲弹幕</h2><p>正在加载…</p>');sheet.dataset.panel='danmaku';
  try{const result=await api('danmaku.read',{track_id:track});if(uid!==cloud.user?.id||epoch!==panelGeneration||!sheet.open||sheet.dataset.panel!=='danmaku')return;
   $('#sheet-content').innerHTML=`<h2>歌曲弹幕</h2><p class="muted-line">仅好友可见，在对应的歌曲进度显示。</p><form id="danmaku-form" data-track="${esc(track)}" class="comment-form"><label for="danmaku-body">弹幕内容</label><input id="danmaku-body" name="body" maxlength="100" required autocomplete="off"><button class="primary-btn" type="submit">发送</button><p class="form-message" role="status"></p></form><ol class="comment-list">${result.messages.slice().sort((a,b)=>a.position-b.position).map(row=>`<li><strong translate="no">${esc(row.person?.display_name||'听友')}</strong><small>${format(row.position)}</small><p translate="no">${esc(row.body)}</p>${row.user_id===uid||cloud.isAdmin?`<button class="text-button" data-danmaku-delete="${esc(row.id)}" data-track="${esc(track)}">删除</button>`:''}</li>`).join('')}</ol>`;
  }catch(error){if(uid===cloud.user?.id&&epoch===panelGeneration&&sheet.open&&sheet.dataset.panel==='danmaku')$('#sheet-content').innerHTML=failHTML(error)}
 }
 async function submit(event){
  const form=event.target,id=form.id;if(!['feed-form','room-create-form','room-message-form','danmaku-form'].includes(id)&&!form.matches('.comment-form[data-post-id]'))return;
  event.preventDefault();if(form.dataset.busy==='true')return;
  if((id==='feed-form'||form.dataset.postId)&&!active('feed')||id.startsWith('room-')&&!active('rooms')||id==='danmaku-form'&&!active('danmaku'))return;
  const uid=cloud.user?.id,epoch=generation,panel=panelGeneration,context=room,data=new FormData(form),publishButton=id==='feed-form'?$('button[type=submit]',form):null,publishLabel=publishButton?.innerHTML,status=$('.form-message',form)||$('#feed-form-status');
  form.dataset.busy='true';const composerToggle=id==='feed-form'?$('#feed-compose-toggle'):null;if(composerToggle)composerToggle.disabled=true;const controls=[...form.querySelectorAll('button,input,textarea,select')];controls.forEach(node=>node.disabled=true);form._id ||=crypto.randomUUID();
  try{
   if(id==='feed-form'){if(photoBusy)throw Error('照片正在处理中，请稍候。');const text=String(data.get('body')||'');if(!text.trim()&&!feedTrack&&!feedPhoto)throw Error('写点什么，或添加一张照片。');status.textContent='正在发布…';form.setAttribute('aria-busy','true');publishButton.innerHTML='<span class="operation-spinner feed-publish-spinner" aria-hidden="true"></span><span>发布中</span>';await api('social.post',{id:form._id,body:text,track:feedTrack,...(squareReady?{visibility:String(data.get('visibility')||'friends'),image:feedPhoto?.image||null}:{})});if(cloud.user?.id===uid&&form.isConnected&&view==='community'&&mode==='feed'){form.reset();form._id=null;feedTrack=null;clearPhoto();$('#feed-track').replaceChildren();$('#feed-attach').setAttribute('aria-pressed','false');$('#feed-length').textContent='0';status.textContent='已发布';setComposerOpen(false);toast('已发布');await EchoLiveData.refresh('feed:'+feedScope,{force:true});await loadFeed()}}
   else if(id==='room-create-form'){
    const members=data.getAll('members');if(!members.length||members.length>12)throw Error('请选择 1–12 位好友。');const state=player.getSnapshot();
    const result=await api('rooms.create',{id:form._id,name:String(data.get('name')),members,track:form._track,position:form._track.id===state.currentId?state.position:0,playing:form._track.id===state.currentId&&state.playing});
    if(uid===cloud.user?.id&&panel===panelGeneration&&sheet.open&&sheet.dataset.panel==='create-room'&&active('rooms')){sheet.close();await openRoom(result.room.id)}
   }else if(id==='room-message-form'){
    if(!context)throw Error('听歌房已关闭。');const result=await api('rooms.message',{id:context.id,message_id:form._id,body:String(data.get('body'))});
    if(room===context&&cloud.user?.id===uid&&form.isConnected){form.reset();form._id=null;roomMessages=[...new Map([...roomMessages,{...result.message,person:cloud.profile}].map(row=>[row.id,row])).values()];paintRoom()}
   }else if(id==='danmaku-form'){
    if(form.dataset.track!==activeTrack().id)throw Error('歌曲已切换，请重新打开弹幕。');
    form._position ??=player.getSnapshot().position||0;await api('danmaku.send',{id:form._id,track_id:form.dataset.track,body:String(data.get('body')),position:form._position});
    if(uid===cloud.user?.id&&panel===panelGeneration&&form.isConnected){await danmakuPanel();readDanmaku()}
   }else{
    await api('social.comment',{post_id:form.dataset.postId,id:form._id,body:String(data.get('body'))});
    if(alive(epoch,uid)&&form.isConnected){form.reset();form._id=null;await comments(form.dataset.postId);const post=posts.find(row=>row.id===form.dataset.postId);if(post){post.comments++;const count=$(`[data-post-comments="${CSS.escape(post.id)}"] span`);if(count)count.textContent=post.comments}}
   }
  }catch(error){if(cloud.user?.id===uid&&form.isConnected&&status)status.textContent=error.message||'操作失败，请重试。'}
  finally{form.dataset.busy='false';form.removeAttribute('aria-busy');if(composerToggle?.isConnected)composerToggle.disabled=false;if(publishButton?.isConnected)publishButton.innerHTML=publishLabel;controls.forEach(node=>{if(node.isConnected)node.disabled=false})}
 }
 document.addEventListener('submit',submit);
 document.addEventListener('input',event=>{if(event.target.id==='feed-body')$('#feed-length').textContent=event.target.value.length;const form=event.target.form;if(form&&form.dataset.busy!=='true'){form._id=null;form._position=null}});
 document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;const d=button.dataset,uid=cloud.user?.id,epoch=generation;
  try{
   if(button.id==='feed-compose-toggle'&&active('feed')){const form=$('#feed-form');if(form&&form.dataset.busy!=='true')setComposerOpen(form.hidden)}
   if(d.communityMode)open(d.communityMode);if(d.feedScope&&squareReady){feedScope=d.feedScope;generation++;loading=false;posts=[];more=false;$('#feed-more').hidden=true;$$('[data-feed-scope]').forEach(item=>{item.classList.toggle('active',item.dataset.feedScope===feedScope);item.setAttribute('aria-pressed',item.dataset.feedScope===feedScope)});$('#feed-list').replaceChildren();loadFeed()}if(button.id==='feed-photo-add'&&squareReady)$('#feed-photo-file').click();if(button.id==='feed-photo-remove'){clearPhoto();$('#feed-form')._id=null}
   if(d.communityRetry!==undefined){if(sheet.dataset.panel==='danmaku'&&sheet.open)danmakuPanel();else if(sheet.dataset.panel==='create-room'&&sheet.open)createRoomPanel();else render()}
   if(button.id==='feed-more')loadFeed(true);if(button.id==='feed-refresh'){serviceReady=false;await EchoLiveData.refresh('feed:'+feedScope,{force:true});loadFeed()}
   if(button.id==='feed-attach'&&active('feed')){const track=sharedMusic(activeTrack());if(!track){toast('本机文件不能直接分享。');return}feedTrack=feedTrack?null:track;$('#feed-track').innerHTML=feedTrack?musicCard(feedTrack,'preview'):'';$('#feed-form')._id=null;button.setAttribute('aria-pressed',Boolean(feedTrack))}
   if(d.postOptions&&active('feed'))postOptions(d.postOptions);if(d.postCopy&&active('feed')){const post=posts.find(row=>row.id===d.postCopy);if(post?.body){try{await navigator.clipboard.writeText(post.body);if(cloud.user?.id===uid)toast('文字已复制')}catch{if(cloud.user?.id===uid){openSheet('复制文字',`<h2>复制文字</h2><label class="form-field">动态文字<textarea id="post-copy-text" readonly rows="5" translate="no">${esc(post.body)}</textarea></label>`);sheet.dataset.panel='post-options';$('#post-copy-text').select()}}}}
   if(d.postLike&&active('feed')){const post=posts.find(row=>row.id===d.postLike);if(!post)return;button.disabled=true;await api('social.react',{post_id:post.id,liked:!post.liked});if(alive(epoch,uid)&&button.isConnected){post.likes=Math.max(0,post.likes+(post.liked?-1:1));post.liked=!post.liked;button.setAttribute('aria-pressed',post.liked);button.classList.toggle('liked',post.liked);$('span',button).textContent=post.likes}}
   if(d.postComments&&active('feed')){const area=$('#comments-'+CSS.escape(d.postComments));if(area&&area.dataset.loaded==='true'&&!area.hidden){area.hidden=true;button.setAttribute('aria-expanded','false')}else{await comments(d.postComments);if(area)if(area.dataset.loaded!=='true')area.dataset.loaded='true';button.setAttribute('aria-expanded','true')}}
   if(d.commentsMore)comments(d.commentsMore,true);
   if(d.postDelete&&active('feed')){button.disabled=true;await api('social.delete',{post_id:d.postDelete});if(alive(epoch,uid)){posts=posts.filter(row=>row.id!==d.postDelete);$(`[data-post="${CSS.escape(d.postDelete)}"]`)?.remove();if(sheet.open&&sheet.dataset.panel==='post-options'&&sheet.dataset.postId===d.postDelete)sheet.close()}}
   if(d.commentDelete&&active('feed')){button.disabled=true;await api('social.comment.delete',{post_id:d.postId,id:d.commentDelete});if(alive(epoch,uid)){await comments(d.postId);const post=posts.find(row=>row.id===d.postId);if(post){post.comments=Math.max(0,post.comments-1);const count=$(`[data-post-comments="${CSS.escape(post.id)}"] span`);if(count)count.textContent=post.comments}}}
   if(button.id==='room-indicator'&&room)await openRoom(room.id)
   if(button.id==='room-create')createRoomPanel();if(d.roomOpen)await openRoom(d.roomOpen);if(button.id==='room-join-cancel')cancelRoomOpening();if(button.id==='room-join-back'){$('#room-stage')?.replaceChildren();syncRoomButtons()}
   if(button.id==='room-follow'&&room&&active('rooms')){following=!following;if(following){const track=sharedMusic(room.track);if(track){registerCloudTrack(track);player.select(track.id,{autoplay:room.playing});player.seek(roomPosition())}}paintRoom()}
   if(button.id==='room-refresh'){applyRoom();pollRoom()}
   if(button.id==='room-leave'&&room){const context=room;button.disabled=true;await api('rooms.leave',{id:context.id});if(room===context&&uid===cloud.user?.id){stopRoom();$('#room-stage')?.replaceChildren();loadRooms()}}
   if(d.messagePlay&&button.closest('.community-page')){const track=sharedMusic(getTrack(d.messagePlay));if(track){registerCloudTrack(track);playTrack(track.id,[track.id])}}
   if(button.id==='danmaku-open')danmakuPanel();
   if(d.danmakuDelete&&active('danmaku')){button.disabled=true;await api('danmaku.delete',{id:d.danmakuDelete,track_id:d.track});if(uid===cloud.user?.id){button.closest('li')?.remove();danRows=danRows.filter(row=>row.id!==d.danmakuDelete)}}
  }catch(error){if(uid===cloud.user?.id)toast(error.message||'操作失败，请重试。')}finally{if(button.dataset.roomOpen)syncRoomButtons();else if(button.isConnected)button.disabled=false}
 });
 document.addEventListener('change',event=>{if(event.target.id==='feed-photo-file'){choosePhoto(event.target.files?.[0]);event.target.value='';return}if(event.target.id==='feed-visibility'){const form=$('#feed-form');if(form)form._id=null;return}const key=event.target.dataset.socialSetting;if(!Object.hasOwn(defaults,key))return;prefs[key]=event.target.checked;save('social-preferences',prefs);syncEntrances();
  generation++;panelGeneration++;if(!active('rooms')){stopRoom();$('#room-stage')?.replaceChildren();if(sheet.dataset.panel==='create-room')sheet.close()}
  if(!active('danmaku')){resetDanmaku();if(sheet.dataset.panel==='danmaku')sheet.close()}
  if(!active('chat')&&chatContext){stopChat();setView('friends')}
  if(view==='friends')renderFriends();else if(view==='community')render();
 });
 const badge=document.createElement('button');badge.id='room-indicator';badge.className='icon-btn room-indicator';badge.type='button';badge.hidden=true;badge.setAttribute('aria-label','返回听歌房');badge.innerHTML=icon('friends');$('.top-actions').prepend(badge);
 const layer=document.createElement('div');layer.id='danmaku-layer';layer.setAttribute('aria-hidden','true');now.append(layer);
 const danButton=document.createElement('button');danButton.id='danmaku-open';danButton.className='np-danmaku-button';danButton.type='button';danButton.textContent='弹幕';$('.np-top-tools').prepend(danButton);
 player.addEventListener('timeupdate',tickDanmaku);
 let lastHostState='';player.addEventListener('statechange',event=>{const state=event.detail,signature=state.currentId+':'+state.playing;if(room?.host_id===cloud.user?.id&&signature!==lastHostState){clearTimeout(roomTimer);roomTimer=setTimeout(pollRoom,800)}lastHostState=signature});
 player.addEventListener('trackchange',()=>{resetDanmaku();if(now.open)readDanmaku();if(room?.host_id===cloud.user?.id){clearTimeout(roomTimer);roomTimer=setTimeout(pollRoom,1000)}});
 const observeNow=new MutationObserver(()=>{if(now.open)readDanmaku();else resetDanmaku()});observeNow.observe(now,{attributes:true,attributeFilter:['open']});
 cloud.addEventListener('session',()=>{if(roomOpening&&(roomOpening.uid!==cloud.user?.id||roomOpening.session!==cloud.session?.token))cancelRoomOpening();if(serviceUid!==cloud.user?.id){generation++;panelGeneration++;serviceReady=false;squareReady=false;serviceUid=null;posts=[];feedTrack=null;clearPhoto();stopRoom();resetDanmaku();if(['danmaku','create-room','post-options'].includes(sheet.dataset.panel))sheet.close();if(view==='community')render()}});
 function wake(){if(!document.hidden){if(room)pollRoom();if(now.open)readDanmaku()}else{clearTimeout(roomTimer);clearTimeout(danTimer);$('#danmaku-layer').replaceChildren()}}
 document.addEventListener('visibilitychange',wake);window.addEventListener('pagehide',()=>{clearTimeout(roomTimer);clearTimeout(danTimer)});window.addEventListener('pageshow',wake);
 document.addEventListener('echo:languagechange',()=>{if(room){roomSignature='';paintRoom()}});
 syncEntrances();
 return Object.freeze({active,settingsMarkup,friendMarkup,open,render,leaveView(name){generation++;if(roomOpening&&(name!=='community'||mode!=='rooms'))cancelRoomOpening();if(name!=='community'){posts=[];feedTrack=null;clearPhoto()}},stopRoom});
})();

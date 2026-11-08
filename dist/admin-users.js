'use strict';
(() => {
 let epoch=0,owner=null,users=[],offset=0,more=false,advanced=false,hooks,root=null;
 const $=selector=>document.querySelector(selector),esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const localDate=value=>{const date=new Date(value);if(!value||!Number.isFinite(date.getTime()))return '';const pad=n=>String(n).padStart(2,'0');return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+'T'+pad(date.getHours())+':'+pad(date.getMinutes())+':'+pad(date.getSeconds())};
 function active(token){return token===epoch&&hooks.account.user?.id===owner&&hooks.account.isAdmin&&root?.isConnected&&EchoAdminPage.isActive('members')}
 function panel(title,html){if(root){EchoFeedback.discard(root);root.innerHTML=html}}
 function list(){panel('用户管理','<h2>用户管理</h2><p class="admin-note">'+(advanced?'可编辑邮箱、会员、账号状态、角色和头像。系统编号及注册时间只读。':'更新账号服务至版本 5 后可编辑会员和邮箱。')+'</p>'+'<div>'+users.map(user=>'<button class="admin-user-row" data-admin-user="'+esc(user.id)+'"><span><strong translate="no">'+esc(user.display_name)+'</strong><small translate="no">@'+esc(user.handle)+(advanced?' · '+esc(user.email):'')+'</small></span>'+(advanced?'<span class="admin-plan">'+(user.tier==='premium'?'Premium':'免费账号')+'</span>':'')+'<span>编辑</span></button>').join('')+'</div>'+(more?'<button class="secondary-btn" id="admin-users-more">加载更多</button>':''))}
 function select(name,label,values,current){return '<label class="form-field">'+label+'<select name="'+name+'">'+values.map(([value,text])=>'<option value="'+esc(value)+'" '+(current===value?'selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>'}
 function edit(id){
  const user=users.find(row=>row.id===id);if(!user)return;
  panel('编辑用户','<button class="text-button" id="admin-users-back">返回用户列表</button><h2 translate="no">'+esc(user.display_name)+'</h2><dl class="admin-system"><dt>用户编号</dt><dd translate="no">'+esc(user.id)+'</dd>'+(advanced?'<dt>注册时间</dt><dd translate="no">'+esc(user.created_at)+'</dd>':'')+'</dl><form id="admin-user-form" data-user-id="'+esc(user.id)+'"><label class="form-field">昵称<input name="display_name" value="'+esc(user.display_name)+'" required maxlength="40"></label><label class="form-field">用户名<input name="handle" value="'+esc(user.handle)+'" pattern="[a-z0-9_]{3,24}" required maxlength="24"></label>'+(advanced?'<label class="form-field">邮箱<input type="email" name="email" value="'+esc(user.email)+'" required maxlength="254" autocomplete="off"></label><p class="admin-note" id="admin-email-status">'+(user.email_verified?'邮箱已验证':'邮箱待验证')+'</p><p class="admin-note">修改邮箱会退出该用户的现有登录；用户需使用新邮箱重设密码后登录。</p>'+select('account_status','账号状态',[['active','正常'],['suspended','暂停'],['disabled','停用']],user.account_status)+select('tier','会员等级',[['free','免费账号'],['premium','Premium']],user.tier)+'<label class="form-field">会员到期时间（本地时区）<input type="datetime-local" step="1" name="premium_until" value="'+esc(localDate(user.premium_until))+'"></label><p class="admin-note">Premium 未填写到期时间表示不设到期日。</p>'+select('role','账号角色',[['member','普通成员'],['admin','管理员']],user.role):'')+select('avatar_source','头像',[['keep','保留当前头像'],['remove','移除头像'],...(advanced?[['upload','上传新头像']]:[]),...users.filter(row=>row.avatar_path).map(row=>[row.avatar_path,row.display_name+' · @'+row.handle])],'keep')+'<label class="form-field" id="admin-photo-field" hidden>选择头像<input type="file" name="avatar_file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"></label><p class="admin-note">选择现有头像时，服务器会复制到目标账号目录，不会修改来源用户的照片。</p><button class="primary-btn" type="submit">保存用户资料</button><p class="form-message" role="status"></p>'+(advanced?'<div class="account-actions"><button class="text-button" type="button" id="admin-reset-password">发送重设密码邮件</button></div>':'')+'</form>');
 }
 async function load(append=false){const token=++epoch;owner=hooks.account.user?.id;if(!owner||!hooks.account.isAdmin){hooks.toast('仅管理员可操作。');return}panel('用户管理','<h2>用户管理</h2><p>正在加载…</p>');try{const result=await hooks.account.adminRequest({action:'list',offset:append?offset:0});if(!active(token))return;users=append?[...users,...result.users]:result.users;offset=result.offset+result.users.length;more=result.hasMore;advanced=result.capabilities?.includes('member_admin')===true;list()}catch(error){if(active(token))panel('用户管理','<h2>用户管理暂不可用</h2><p>'+esc(error.message)+'</p><button class="secondary-btn" id="admin-users-retry">重试</button>')}}
 async function photo(file){const blob=await EchoProfilePhoto.prepare(file);return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob)})}
 function init(value){hooks=value;
  document.addEventListener('click',async event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.id==='manage-users')EchoAdminPage.open('members');if(button.id==='admin-users-retry')load();if(button.id==='admin-users-more')load(true);if(button.id==='admin-users-back')list();if(button.dataset.adminUser)edit(button.dataset.adminUser);
   if(button.id==='admin-reset-password'){
    const form=$('#admin-user-form'),user=users.find(row=>row.id===form?.dataset.userId),token=epoch,message=form?.querySelector('.form-message');if(!user||!active(token))return;
    if(form.elements.email.value.trim().toLowerCase()!==user.email){message.textContent='请先保存邮箱修改。';return}
    if(button.dataset.confirm!=='true'){button.dataset.confirm='true';button.textContent='确认发送重设密码邮件';return}
    const operation=EchoFeedback.start({root,message:'正在发送重设邮件…',guard:()=>active(token)});button.disabled=true;try{await hooks.account.adminRequest({action:'reset-password',id:user.id});operation.success({title:'重设邮件已发送',message:'请让该用户检查邮箱并按链接重设密码。',actionLabel:'继续管理',onDone:()=>edit(user.id)});}catch(error){operation.failure({title:'发送未完成',message:error.message})}finally{button.disabled=false;button.dataset.confirm='';button.textContent='发送重设密码邮件'}
   }
  });
  document.addEventListener('change',event=>{if(event.target.name==='avatar_source'&&$('#admin-photo-field'))$('#admin-photo-field').hidden=event.target.value!=='upload'});
  document.addEventListener('submit',async event=>{
   if(event.target.id!=='admin-user-form')return;event.preventDefault();const form=event.target;if(form.dataset.busy==='true')return;
   const data=new FormData(form),message=form.querySelector('.form-message'),source=String(data.get('avatar_source')),token=epoch,id=form.dataset.userId,user=users.find(row=>row.id===id);if(!user||!active(token))return;
   const operation=EchoFeedback.start({root,message:'正在保存用户资料…',guard:()=>active(token)});const controls=[...form.querySelectorAll('input,select,button')];controls.forEach(node=>node.disabled=true);form.dataset.busy='true';message.textContent='';
   try{
    const avatar=source==='upload'?{mode:'upload',image:await photo(data.get('avatar_file'))}:source==='keep'||source==='remove'?{mode:source}:{mode:'copy',path:source};if(!active(token)||!operation.current())return;
    const body={action:'update',id,handle:String(data.get('handle')).trim().toLowerCase(),display_name:String(data.get('display_name')).trim(),avatar};
    if(advanced){const date=String(data.get('premium_until'));Object.assign(body,{email:String(data.get('email')).trim().toLowerCase(),account_status:String(data.get('account_status')),tier:String(data.get('tier')),role:String(data.get('role')),premium_until:date===localDate(user.premium_until)?user.premium_until||null:date?new Date(date).toISOString():null,version:user.version})}
    const result=await hooks.account.adminRequest(body);if(!active(token)||!operation.current())return;const index=users.findIndex(row=>row.id===id);if(index>=0)users[index]=result.profile;
    if(id===hooks.account.user.id){
     if(result.sessionRevoked){hooks.account.applySession(null,'SIGNED_OUT');hooks.exitAdmin();hooks.toast(result.emailChanged?'邮箱已更新，请使用新邮箱重设密码后登录。':'账号已更新，请重新登录。');return}
     await hooks.account.ensureProfile();hooks.updateBadge();
     if(advanced){await hooks.account.syncAdmin();if(!hooks.account.isAdmin){hooks.exitAdmin();hooks.toast('用户资料已保存。');return}}
     if(!active(token))return;
    }
    form.elements.avatar_source.value='keep';form.elements.avatar_file.value='';form.querySelector('#admin-photo-field').hidden=true;
    if(advanced)form.querySelector('#admin-email-status').textContent=result.profile.email_verified?'邮箱已验证':'邮箱待验证';
    operation.success({title:'用户资料已保存',message:result.emailChanged?'新邮箱需通过重设密码完成验证。':'会员和账号资料已更新。',actionLabel:'继续管理',onDone:()=>edit(id)});
   }catch(error){if(active(token))operation.failure({title:'保存未完成',message:error.message})}finally{form.dataset.busy='false';controls.forEach(node=>node.disabled=false)}
  });
  hooks.account.addEventListener('session',()=>{if(owner&&owner!==hooks.account.user?.id)unmount()});
 }
 function unmount(){epoch++;users=[];owner=null;if(root)EchoFeedback.discard(root);root=null}
 globalThis.EchoAdminUsers=Object.freeze({init,mount(node){unmount();root=node;load()},unmount});
})();

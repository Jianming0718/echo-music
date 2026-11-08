'use strict';
(() => {
 let hooks,epoch=0,owner=null,currentPanel=null,codes=[],hasMore=false,ready=false,created=[];
 const $=selector=>document.querySelector(selector),esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const date=value=>value?new Date(value).toLocaleString(EchoI18n.locale,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}):EchoI18n.t('无截止日期');
 function active(token,panel=currentPanel){return token===epoch&&owner===hooks.account.user?.id&&$('#sheet').open&&$('#sheet').dataset.panel===panel&&(panel!=='codes'||hooks.account.isAdmin)}
 function status(error){return ['INVALID_REQUEST','SCHEMA_NOT_READY'].includes(error.code)?'兑换服务需要更新至版本 5，请联系管理员。':error.message||'操作失败，请重试。'}
 function panel(name,title,html){epoch++;owner=hooks.account.user?.id;currentPanel=name;ready=false;hooks.openSheet(title,html);$('#sheet').dataset.panel=name;return epoch}
 function codeRow(row){return `<article class="redemption-code-row"><div><strong translate="no">${esc(row.label||'Premium')}</strong><small translate="no">…${esc(row.code_hint)}</small></div><dl><dt>Premium 天数</dt><dd>${esc(row.days)}</dd><dt>已用 / 可用次数</dt><dd>${esc(row.uses)} / ${esc(row.max_uses)}</dd><dt>兑换截止</dt><dd translate="no">${esc(date(row.expires_at))}</dd></dl><button class="secondary-btn" data-code-toggle="${esc(row.id)}" data-enabled="${row.enabled?'false':'true'}">${row.enabled?'停用兑换码':'启用兑换码'}</button></article>`}
 async function loadCodes(append=false){const token=epoch;if(!active(token,'codes'))return;const button=$('#codes-more');if(button)button.disabled=true;
  try{const result=await hooks.account.adminRequest({action:'codes.list',...(append?{cursor:codes.at(-1)}:{})});if(!active(token,'codes'))return;codes=append?[...new Map([...codes,...result.codes].map(row=>[row.id,row])).values()]:result.codes;hasMore=result.hasMore;ready=true;$('#codes-list').innerHTML=codes.map(codeRow).join('')||'<p>还没有兑换码。</p>';$('#codes-more').hidden=!hasMore;$('#codes-status').textContent='';$('#code-create-form [type=submit]').disabled=false}
  catch(error){if(active(token,'codes'))$('#codes-status').textContent=status(error)}finally{if(button?.isConnected)button.disabled=false}
 }
 function openAdmin(){if(!hooks.account.user||!hooks.account.isAdmin){hooks.toast('仅管理员可操作。');return}codes=[];created=[];panel('codes','兑换码管理',`<h2>兑换码管理</h2><p class="admin-note">每个账号对同一码仅能兑换一次。可用次数设为 1 即为单人单次码。</p><form id="code-create-form"><label class="form-field">备注<input name="label" maxlength="60" autocomplete="off"></label><div class="redemption-form-grid"><label class="form-field">Premium 天数<input type="number" name="days" min="1" max="3650" step="1" required value="30"></label><label class="form-field">每码可用次数<input type="number" name="max_uses" min="1" max="10000" step="1" required value="1"></label><label class="form-field">生成数量<input type="number" name="quantity" min="1" max="20" step="1" required value="1"></label></div><label class="form-field">兑换截止（本地时区）<input type="datetime-local" name="expires_at" step="1"></label><p class="admin-note">兑换截止限制何时可以使用兑换码；Premium 天数从当前有效会员到期日顺延，或从兑换时起计算。</p><button class="primary-btn" type="submit" disabled>生成兑换码</button><p class="form-message" role="status"></p></form><div id="created-codes"></div><div class="section-heading"><h2>已创建的兑换码</h2><button class="text-button" id="codes-refresh">刷新</button></div><p id="codes-status" role="status">正在加载…</p><div id="codes-list"></div><button class="secondary-btn" id="codes-more" hidden>加载更多</button>`);loadCodes()}
 function paintCreated(){if(!$('#created-codes'))return;$('#created-codes').innerHTML=created.length?`<section class="created-codes"><h3>请保存本次兑换码</h3><p class="admin-note">完整兑换码仅在本次生成后显示，关闭页面后无法重新查看。</p><div>${created.map(row=>`<code translate="no">${esc(row.code)}</code>`).join('')}</div><div class="account-actions"><button class="secondary-btn" id="copy-created-codes">复制兑换码</button><button class="text-button" id="download-created-codes">下载兑换码</button></div></section>`:''}
 async function history(){const token=epoch;if(!active(token,'redeem'))return;
  try{const result=await hooks.account.request('redemption.history');if(!active(token,'redeem'))return;hooks.account.entitlement=result.account;ready=true;$('#redemption-membership').innerHTML=hooks.membershipCard(result.account);$('#redeem-form [type=submit]').disabled=false;$('#redemption-status').textContent='';$('#redemption-history').innerHTML=result.redemptions.length?'<h3>兑换记录</h3><ol class="redemption-history">'+result.redemptions.map(row=>`<li><strong>${esc(row.days)} <span>天 Premium</span></strong><time translate="no">${esc(date(row.created_at))}</time><small><span>会员到期</span> <time translate="no">${esc(date(row.premium_until))}</time></small></li>`).join('')+'</ol>':''}
  catch(error){if(active(token,'redeem'))$('#redemption-status').textContent=status(error)}
 }
 function open(){if(!hooks.account.user){hooks.openAccount();return}panel('redeem','兑换中心',`<h2>兑换中心</h2><div id="redemption-membership">${hooks.membershipCard(hooks.account.entitlement)}</div><form id="redeem-form"><label class="form-field">兑换码<input id="redemption-code" name="code" required maxlength="80" autocomplete="off" autocapitalize="characters" spellcheck="false"></label><button class="primary-btn" type="submit" disabled>兑换 Premium</button><p class="form-message" role="status"></p></form><p class="admin-note">每个账号对同一码仅能兑换一次。已有有效 Premium 会顺延到期时间。</p><p id="redemption-status" role="status">正在加载…</p><button class="text-button" id="redemption-refresh">刷新兑换记录</button><div id="redemption-history"></div>`);history()}
 function generateCode(){const bytes=crypto.getRandomValues(new Uint8Array(16)),hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('').toUpperCase();return {id:crypto.randomUUID(),code:'ECHO-'+hex.match(/.{8}/g).join('-')}}
 function init(value){hooks=value;
  document.addEventListener('click',async event=>{const button=event.target.closest('button');if(!button)return;const token=epoch;
   if(button.id==='redeem-membership')open();if(button.id==='manage-redemptions')openAdmin();if(button.id==='codes-refresh')await loadCodes();if(button.id==='codes-more')await loadCodes(true);if(button.id==='redemption-refresh')await history();
   try{
    if(button.dataset.codeToggle&&active(token,'codes')){button.disabled=true;const result=await hooks.account.adminRequest({action:'codes.set',id:button.dataset.codeToggle,enabled:button.dataset.enabled==='true'});if(active(token,'codes')){codes=codes.map(row=>row.id===result.code.id?result.code:row);$('#codes-list').innerHTML=codes.map(codeRow).join('')}}
    if(button.id==='copy-created-codes'&&active(token,'codes')){if(!navigator.clipboard?.writeText)throw Error('无法复制，请下载兑换码。');await navigator.clipboard.writeText(created.map(row=>row.code).join('\n'));if(active(token,'codes'))hooks.toast('兑换码已复制。')}
    if(button.id==='download-created-codes'&&active(token,'codes')){const url=URL.createObjectURL(new Blob([created.map(row=>row.code).join('\n')],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='echo-redemption-codes.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
   }catch(error){if(active(token))hooks.toast(status(error))}finally{if(button.isConnected)button.disabled=false}
  });
  document.addEventListener('input',event=>{if(event.target.form?.id==='code-create-form'&&event.target.form.dataset.busy!=='true')event.target.form._batch=null});
  document.addEventListener('submit',async event=>{
   const form=event.target;if(!['redeem-form','code-create-form'].includes(form.id))return;event.preventDefault();const token=epoch;if(!ready||!active(token)||form.dataset.busy==='true')return;
   const data=new FormData(form),message=form.querySelector('.form-message'),controls=[...form.querySelectorAll('input,button')];form.dataset.busy='true';controls.forEach(node=>node.disabled=true);message.textContent='';
   try{
    if(form.id==='redeem-form'){
     const result=await hooks.account.request('redemption.redeem',{code:String(data.get('code'))});if(!active(token,'redeem'))return;hooks.account.entitlement=result.account;form.reset();await history();if(active(token,'redeem'))message.textContent=result.alreadyRedeemed?'此码已兑换过，未重复增加天数。':'兑换成功，会员已更新。';
    }else{
     const quantity=Number(data.get('quantity'));if(!Number.isInteger(quantity)||quantity<1||quantity>20)throw Error('每次可生成 1–20 个兑换码。');form._batch ||=Array.from({length:quantity},generateCode);
     const result=await hooks.account.adminRequest({action:'codes.create',codes:form._batch,label:String(data.get('label')).trim(),days:Number(data.get('days')),max_uses:Number(data.get('max_uses')),expires_at:data.get('expires_at')?new Date(String(data.get('expires_at'))).toISOString():null});
     if(!active(token,'codes'))return;created=result.codes;form._batch=null;paintCreated();message.textContent='兑换码已生成，请保存。';await loadCodes();
    }
   }catch(error){if(active(token)&&form.isConnected)message.textContent=status(error)}finally{form.dataset.busy='false';controls.forEach(node=>{if(node.isConnected)node.disabled=false})}
  });
  function clear(){epoch++;owner=null;codes=[];created=[];ready=false;const form=$('#code-create-form');if(form)form._batch=null}
  const observer=new MutationObserver(()=>{if(owner&&['codes','redeem'].includes(currentPanel)&&$('#sheet').dataset.panel!==currentPanel)clear()});observer.observe($('#sheet'),{attributes:true,attributeFilter:['data-panel']});
  $('#sheet').addEventListener('close',()=>{if(['codes','redeem'].includes($('#sheet').dataset.panel))clear()});
  hooks.account.addEventListener('session',()=>{if(owner!==hooks.account.user?.id){const openPanel=['codes','redeem'].includes($('#sheet').dataset.panel);clear();if(openPanel&&$('#sheet').open)$('#sheet').close()}});
  document.addEventListener('echo:languagechange',()=>{if(currentPanel==='codes'&&$('#sheet').dataset.panel==='codes'&&$('#sheet').open)$('#codes-list').innerHTML=codes.map(codeRow).join('')});
 }
 globalThis.EchoRedemption=Object.freeze({init,open,openAdmin});
})();

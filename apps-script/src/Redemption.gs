function echoCode_(value){if(typeof value!=='string'||value.length>80)echoFailure_('INVALID_CODE');const code=value.trim().toUpperCase().replace(/[\s-]/g,'');if(!/^ECHO[0-9A-F]{32}$/.test(code))echoFailure_('INVALID_CODE');return code}
function echoCodePublic_(row,cache){const count=echoTable_('Redemptions',cache).rows.filter(item=>item.code_id===row.id&&item.state!=='cancelled').length;return {id:row.id,code_hint:row.code_hint,label:row.label,days:row.days,max_uses:row.max_uses,uses:count,expires_at:row.expires_at||null,enabled:row.enabled===true,created_at:row.created_at}}
function echoRedemptionAdmin_(body,actor,cache){
 if(actor.role!=='admin'||actor.account_status!=='active')echoFailure_('ADMIN_REQUIRED');
 const table=echoTable_('RedemptionCodes',cache);
 if(body.action==='admin.codes.list'){
  echoFields_(body,['cursor']);const page=echoSocialPage_(table.rows,body.cursor,30);return {codes:page.items.map(row=>echoCodePublic_(row,cache)),hasMore:page.hasMore};
 }
 if(body.action==='admin.codes.set'){
  echoFields_(body,['id','enabled']);const row=table.rows.find(item=>item.id===body.id);if(!row||typeof body.enabled!=='boolean')echoFailure_('INVALID_REQUEST');row.enabled=body.enabled;table.put(row);return {code:echoCodePublic_(row,cache)};
 }
 if(body.action!=='admin.codes.create')echoFailure_('INVALID_REQUEST');
 echoFields_(body,['codes','label','days','max_uses','expires_at']);
 if(!Array.isArray(body.codes)||body.codes.length<1||body.codes.length>20||typeof body.label!=='string'||body.label.length>60||!Number.isInteger(body.days)||body.days<1||body.days>3650||!Number.isInteger(body.max_uses)||body.max_uses<1||body.max_uses>10000)echoFailure_('INVALID_CODE_SETTINGS');
 if(body.expires_at!==null&&(typeof body.expires_at!=='string'||body.expires_at.length>40||!Number.isFinite(Date.parse(body.expires_at))))echoFailure_('INVALID_CODE_SETTINGS');
 const expires=body.expires_at?new Date(body.expires_at).toISOString():'';if(expires&&Date.parse(expires)<=Date.now())echoFailure_('INVALID_CODE_SETTINGS');
 const prepared=body.codes.map(item=>{if(!item||Object.keys(item).some(key=>!['id','code'].includes(key))||!echoId_(item.id))echoFailure_('INVALID_REQUEST');const code=echoCode_(item.code);return {id:item.id,code,hash:echoDigest_(code)}});
 if(new Set(prepared.map(row=>row.id)).size!==prepared.length||new Set(prepared.map(row=>row.hash)).size!==prepared.length)echoFailure_('INVALID_REQUEST');
 for(const item of prepared){const existing=table.rows.find(row=>row.id===item.id||row.code_hash===item.hash);if(existing&&(existing.id!==item.id||existing.code_hash!==item.hash||existing.created_by!==actor.user_id||existing.days!==body.days||existing.max_uses!==body.max_uses||existing.expires_at!==expires||existing.label!==body.label.trim()))echoFailure_('CONTENT_CONFLICT')}
 echoThrottle_('code-create:'+actor.user_id,20,3600000);
 const result=[];
 for(const item of prepared){let row=table.rows.find(value=>value.id===item.id);if(!row)row=table.put({id:item.id,code_hash:item.hash,code_hint:item.code.slice(-6),label:body.label.trim(),days:body.days,max_uses:body.max_uses,expires_at:expires,enabled:true,created_by:actor.user_id,created_at:echoTime_()});result.push({...echoCodePublic_(row,cache),code:'ECHO-'+item.code.slice(4).match(/.{8}/g).join('-')})}
 return {codes:result};
}
function echoApplyRedemption_(receipt,user,cache){
 const sheet=echoBook_().getSheetByName('Users'),controls=sheet.getRange(user._row,6,1,3).getValues()[0],tier=String(controls[1]),until=controls[2] instanceof Date?controls[2].toISOString():String(controls[2]||'');
 const alreadyApplied=tier==='premium'&&Number.isFinite(Date.parse(until))&&Date.parse(until)>=Date.parse(receipt.premium_until),unchanged=tier===receipt.previous_tier&&until===receipt.previous_until;
 if(controls[0]!=='active'||(!alreadyApplied&&!unchanged)){receipt.state='cancelled';echoTable_('Redemptions',cache).put(receipt);echoFailure_('REDEMPTION_CHANGED')}
 if(!alreadyApplied)sheet.getRange(user._row,7,1,2).setValues([['premium',receipt.premium_until]]);
 user.tier='premium';user.premium_until=alreadyApplied?until:receipt.premium_until;receipt.state='applied';receipt.applied_at=echoTime_();echoTable_('Redemptions',cache).put(receipt);
}
function echoRedemptionAction_(body,user,cache){
 const uid=user.user_id,receipts=echoTable_('Redemptions',cache);
 if(body.action==='redemption.history'){
  echoFields_(body,[]);for(const receipt of receipts.rows.filter(row=>row.user_id===uid&&row.state==='pending')){try{echoApplyRedemption_(receipt,user,cache)}catch(error){if(error.message!=='REDEMPTION_CHANGED')throw error}}return {redemptions:receipts.rows.filter(row=>row.user_id===uid&&row.state==='applied').sort(echoMessageOrder_).reverse().slice(0,30).map(row=>({id:row.id,days:row.days,created_at:row.created_at,premium_until:row.premium_until})),account:echoAccount_(user)};
 }
 if(body.action!=='redemption.redeem')echoFailure_('INVALID_REQUEST');
 echoFields_(body,['code']);echoThrottle_('redeem:'+uid,10,600000);
 const hash=echoDigest_(echoCode_(body.code)),code=echoTable_('RedemptionCodes',cache).rows.find(row=>row.code_hash===hash);if(!code)echoFailure_('CODE_UNAVAILABLE');
 const existing=receipts.rows.find(row=>row.user_id===uid&&row.code_id===code.id);
 if(existing){if(existing.state==='cancelled')echoFailure_('REDEMPTION_CHANGED');if(existing.state==='pending')echoApplyRedemption_(existing,user,cache);return {account:echoAccount_(user),alreadyRedeemed:true,redemption:{id:existing.id,days:existing.days,premium_until:existing.premium_until}}}
 if(code.enabled!==true||code.expires_at&&Date.parse(code.expires_at)<=Date.now()||receipts.rows.filter(row=>row.code_id===code.id&&row.state!=='cancelled').length>=code.max_uses)echoFailure_('CODE_UNAVAILABLE');
 if(!Number.isInteger(code.days)||code.days<1||code.days>3650||!Number.isInteger(code.max_uses)||code.max_uses<1||code.max_uses>10000||code.expires_at&&!Number.isFinite(Date.parse(code.expires_at)))echoFailure_('CODE_UNAVAILABLE');
 if(user.tier==='premium'&&!user.premium_until)echoFailure_('MEMBERSHIP_NO_EXPIRY');
 const oldUntil=user.premium_until||'',start=user.tier==='premium'?Math.max(Date.now(),Date.parse(oldUntil)||0):Date.now(),expiry=new Date(start+code.days*86400000).toISOString();
 const receipt=receipts.put({id:Utilities.getUuid(),code_id:code.id,user_id:uid,days:code.days,previous_tier:user.tier,previous_until:oldUntil,premium_until:expiry,state:'pending',created_at:echoTime_(),applied_at:''});
 echoApplyRedemption_(receipt,user,cache);return {account:echoAccount_(user),alreadyRedeemed:false,redemption:{id:receipt.id,days:receipt.days,premium_until:receipt.premium_until}};
}
function echoRedemptionDeleteUser_(cache,uid){const receipts=echoTable_('Redemptions',cache);for(const row of receipts.rows.filter(item=>item.user_id===uid)){row.user_id='';row.previous_until='';row.previous_tier='';if(row.state==='pending')row.state='cancelled';receipts.put(row)}const codes=echoTable_('RedemptionCodes',cache);for(const row of codes.rows.filter(item=>item.created_by===uid)){row.created_by='';codes.put(row)}}

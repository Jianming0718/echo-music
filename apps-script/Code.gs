const ECHO_USER_HEADERS=['user_id','email','display_name','handle','avatar_path','account_status','tier','premium_until','created_at','synced_at'];
function onOpen(){SpreadsheetApp.getUi().createMenu('Echo 管理').addItem('初始化连接配置','configureEcho').addItem('安装账号状态同步触发器','installEchoStatusTrigger').addItem('向选中用户发送欢迎邮件','sendWelcomeToSelectedUser').addToUi()}
function echoConfig_(){const p=PropertiesService.getScriptProperties();const config={sheetId:p.getProperty('ECHO_SHEET_ID'),url:p.getProperty('ECHO_SUPABASE_URL'),key:p.getProperty('ECHO_SUPABASE_PUBLISHABLE_KEY')};if(!config.sheetId||!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.url||'')||!config.key)throw Error('NOT_CONFIGURED');return config}
function echoBook_(){return SpreadsheetApp.openById(echoConfig_().sheetId)}
function echoJson_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON)}
function doGet(){let configured=false;try{echoConfig_();configured=true}catch{}return echoJson_({name:'Echo account admin',version:'2',configured})}
function doPost(event){
 try{
  const raw=event?.postData?.contents||'';if(raw.length>20000)return echoJson_({ok:false,error:'INVALID_REQUEST'});
  const body=JSON.parse(raw);if(body.action!=='sync'||typeof body.access_token!=='string'||body.access_token.length>16000)return echoJson_({ok:false,error:'INVALID_REQUEST'});
  const config=echoConfig_(),headers={apikey:config.key,Authorization:'Bearer '+body.access_token};
  const response=UrlFetchApp.fetch(config.url+'/auth/v1/user',{headers,muteHttpExceptions:true});if(response.getResponseCode()!==200)return echoJson_({ok:false,error:'UNAUTHORIZED'});
  const user=JSON.parse(response.getContentText());if(!/^[0-9a-f-]{36}$/i.test(user.id||''))return echoJson_({ok:false,error:'UNAUTHORIZED'});
  const profileResponse=UrlFetchApp.fetch(config.url+'/rest/v1/profiles?id=eq.'+encodeURIComponent(user.id)+'&select=id,handle,display_name,avatar_path,created_at',{headers,muteHttpExceptions:true});
  const profiles=profileResponse.getResponseCode()===200?JSON.parse(profileResponse.getContentText()):[],profile=profiles[0]||{};
  return echoJson_({ok:true,version:'2',account:syncEchoUser_(user,profile)});
 }catch{return echoJson_({ok:false,error:'SYNC_FAILED'})}
}
function echoText_(value){const text=String(value??'').slice(0,2000);return /^\s*[=+@-]/.test(text)?"'"+text:text}
function syncEchoUser_(user,profile){
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const sheet=echoBook_().getSheetByName('Users');if(!sheet)throw Error('MISSING_USERS_SHEET');
  const data=sheet.getDataRange().getValues();let index=data.findIndex((row,i)=>i>0&&String(row[0])===user.id);
  const previous=index>0?data[index]:[],status=previous[5]||'active',tier=previous[6]||'free',until=previous[7] instanceof Date?previous[7].toISOString():String(previous[7]||'');
  if(!['active','suspended','disabled'].includes(status)||!['free','premium'].includes(tier)||(until&&!Number.isFinite(Date.parse(until))))throw Error('INVALID_ADMIN_VALUES');
  const values=[user.id,user.email||'',profile.display_name||previous[2]||'听友',profile.handle||previous[3]||'',profile.avatar_path||'',status,tier,until,previous[8]||profile.created_at||new Date().toISOString(),new Date().toISOString()];
  const target=index>0?index+1:Math.max(2,sheet.getLastRow()+1);
  if(index>0){sheet.getRange(target,1,1,5).setValues([values.slice(0,5).map(echoText_)]);sheet.getRange(target,9,1,2).setValues([values.slice(8,10).map(echoText_)])}
  else sheet.getRange(target,1,1,values.length).setValues([values.map(echoText_)]);
  const controls=sheet.getRange(target,6,1,3).getValues()[0],currentUntil=controls[2] instanceof Date?controls[2].toISOString():String(controls[2]||'');
  return{user_id:user.id,account_status:String(controls[0]||'active'),tier:String(controls[1]||'free'),premium_until:currentUntil||null};
 }finally{lock.releaseLock()}
}
function installEchoStatusTrigger(){
 const p=PropertiesService.getScriptProperties();if(!p.getProperty('ECHO_ADMIN_HOOK_KEY'))throw Error('Run configureEcho first');
 for(const trigger of ScriptApp.getProjectTriggers())if(trigger.getHandlerFunction()==='pushEchoAccountEdit')ScriptApp.deleteTrigger(trigger);
 ScriptApp.newTrigger('pushEchoAccountEdit').forSpreadsheet(echoBook_()).onEdit().create();
}
function pushEchoAccountEdit(event){
 const range=event?.range;if(!range||range.getSheet().getName()!=='Users'||range.getRow()<2||range.getLastColumn()<6||range.getColumn()>8)return;
 const p=PropertiesService.getScriptProperties(),config=echoConfig_();
 for(let row=range.getRow();row<=range.getLastRow();row++){
  const values=range.getSheet().getRange(row,1,1,10).getValues()[0],until=values[7] instanceof Date?values[7].toISOString():String(values[7]||'');
  const payload={action:'admin_update',account:{user_id:String(values[0]),account_status:String(values[5]),tier:String(values[6]),premium_until:until||null}};
  const response=UrlFetchApp.fetch(config.url+'/functions/v1/account-admin',{method:'post',contentType:'application/json',headers:{apikey:config.key,'x-echo-admin-key':p.getProperty('ECHO_ADMIN_HOOK_KEY')},payload:JSON.stringify(payload),muteHttpExceptions:true});
  echoBook_().getSheetByName('Events').appendRow([new Date().toISOString(),echoText_(values[0]),'account_update',response.getResponseCode()===200?'ok':'failed']);
 }
}
function echoEscape_(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function sendWelcomeToSelectedUser(){
 const book=echoBook_(),active=book.getActiveRange();if(active.getSheet().getName()!=='Users'||active.getRow()<2)throw Error('Select a user row in Users first');
 const user=active.getSheet().getRange(active.getRow(),1,1,10).getValues()[0],templates=book.getSheetByName('EmailTemplates').getDataRange().getValues(),template=templates.find((row,i)=>i>0&&row[0]==='welcome');
 if(!template||template[4]!==true)throw Error('Enable the welcome template before sending');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(user[1])))throw Error('Invalid email');
 const ui=SpreadsheetApp.getUi();if(ui.alert('发送欢迎邮件','收件人：'+user[1],ui.ButtonSet.YES_NO)!==ui.Button.YES)return;
 const subject=String(template[1]).replace(/[\r\n]/g,' '),html=String(template[2]).replace(/\{\{display_name\}\}/g,echoEscape_(user[2]));
 const message={to:String(user[1]),subject,body:'欢迎使用 Echo',htmlBody:html,name:'Echo'};
 if(template[3]){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(template[3])))throw Error('Invalid reply address');message.replyTo=String(template[3])}
 MailApp.sendEmail(message);book.getSheetByName('Events').appendRow([new Date().toISOString(),echoText_(user[0]),'welcome_email','sent']);
}

'use strict';
(() => {
 const artistPattern=/^UC[A-Za-z0-9_-]{22}$/,releasePattern=/^MPRE[A-Za-z0-9_-]{8,180}$/;
 function date(value,precision,locale=globalThis.EchoI18n?.locale||'zh-CN'){
  if(typeof value!=='string'||!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value))return null;
  const parts=value.split('-').map(Number),[year,month=1,day=1]=parts,object=new Date(0);object.setUTCFullYear(year,month-1,day);object.setUTCHours(12,0,0,0);
  if(object.getUTCFullYear()!==year||object.getUTCMonth()!==month-1||object.getUTCDate()!==day)return null;
  const actual=Math.min(parts.length,precision==='year'?1:precision==='month'?2:3);
  return actual===1?String(year):new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',...(actual===3?{day:'numeric'}:{}),timeZone:'UTC'}).format(object);
 }
 class EchoArtistService{
  constructor(config={},fetcher=(...args)=>fetch(...args)){this.config=config;this.fetcher=fetcher;this.cache=new Map()}
  async request(body,signal){
   const key=JSON.stringify(body),cached=this.cache.get(key);if(cached&&cached.until>Date.now())return cached.value;
   if(!this.config.supabaseUrl||!this.config.supabaseAnonKey)throw Error('歌手资料服务尚未连接。');
   const controller=new AbortController();let timedOut=false;const abort=()=>controller.abort();if(signal?.aborted)throw new DOMException('Aborted','AbortError');signal?.addEventListener('abort',abort,{once:true});const timeout=setTimeout(()=>{timedOut=true;controller.abort()},25000);try{const response=await this.fetcher(this.config.supabaseUrl+'/functions/v1/music-profile',{method:'POST',headers:{'Content-Type':'application/json',apikey:this.config.supabaseAnonKey},body:JSON.stringify(body),credentials:'omit',signal:controller.signal});
   const result=await response.json();if(!response.ok||!result.ok||!result.profile)throw Error(response.status===404?'暂未找到这位歌手的资料。':response.status===429?'请求较多，请稍后重试。':'歌手资料暂时不可用，请重试。');
   const profile=result.profile;if(body.action==='artist'&&(!artistPattern.test(profile.id||'')||typeof profile.name!=='string'))throw Error('歌手资料格式异常。');if(body.action==='release'&&profile.id!==body.releaseId)throw Error('发行作品资料不匹配。');
   if(this.cache.size>=40)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,{until:Date.now()+1800000,value:profile});return profile;}catch(error){if(timedOut)throw Error('歌手资料加载超时，请重试。');throw error}finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort)}
  }
  artist(track,{signal}={}){const name=String(track.artist||'').split(/\s+(?:\/|feat\.?|featuring)\s+/i)[0].trim().slice(0,120);return this.request({action:'artist',artist:name,title:String(track.title||'').slice(0,300),...(artistPattern.test(track.artistId||'')?{artistId:track.artistId}:{})},signal)}
  release(id,{signal}={}){if(!releasePattern.test(id||''))return Promise.reject(Error('无效的发行作品。'));return this.request({action:'release',releaseId:id},signal)}
 }
 globalThis.EchoArtistService=EchoArtistService;globalThis.EchoReleaseDate=date;
})();

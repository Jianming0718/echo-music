import { Script } from 'node:vm';
import { AudioError } from './errors.mjs';

const REQUEST_KEY='O43z0dpjhgX20SCx4KAo';

export function adaptMinterOutput(output){
  if(typeof output?.[0]!=='function')throw new AudioError('SOURCE_PROOF_MINTER_FAILED',503);
  return [async bytes=>{
    const callback=await output[0](bytes);
    if(typeof callback!=='function')throw new AudioError('SOURCE_PROOF_MINTER_FAILED',503);
    return async input=>{
      const result=await callback(input);
      if(!ArrayBuffer.isView(result)||result.BYTES_PER_ELEMENT!==1||result.byteLength<1||result.byteLength>4096){
        throw new AudioError('SOURCE_PROOF_MINTER_FAILED',503);
      }
      return new Uint8Array(result);
    };
  }];
}

export function createProofProvider({fetcher=fetch,now=Date.now}={}) {
  let cached=null,pending=null;
  const boundedFetch=(url,options={})=>fetcher(url,{...options,
    signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)});
  async function initialize(){
    let JSDOM,VirtualConsole,BotGuardClient,getChallenge,WebPoMinter,buildURL,getHeaders,USER_AGENT;
    try{
      const [domModule,bgModule,poModule,utilsModule]=await Promise.all([
        import('jsdom-proof'),import('bgutils-js/botguard'),import('bgutils-js/webpo'),import('bgutils-js/utils')
      ]);
      ({JSDOM,VirtualConsole}=domModule);({BotGuardClient,getChallenge}=bgModule);
      ({WebPoMinter}=poModule);({buildURL,getHeaders,USER_AGENT}=utilsModule);
    }catch{throw new AudioError('SOURCE_PROOF_RUNTIME_UNAVAILABLE',503)}
    let challenge;
    try{challenge=await getChallenge({fetchFunction:boundedFetch,requestKey:REQUEST_KEY,useYouTubeAPI:true})}
    catch{throw new AudioError('SOURCE_PROOF_CHALLENGE_FAILED',503)}
    const code=challenge.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue;
    if(typeof code!=='string'||code.length>2*1024*1024||typeof challenge.program!=='string'||typeof challenge.globalName!=='string'){
      throw new AudioError('SOURCE_VERIFICATION_UNAVAILABLE',503);
    }
    const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>',{
      url:'https://www.youtube.com/',referrer:'https://www.youtube.com/',
      runScripts:'outside-only',virtualConsole:new VirtualConsole()
    });
    let phase='INTERPRETER';
    try{
      Object.defineProperty(dom.window.navigator,'userAgent',{value:USER_AGENT});
      new Script(code).runInContext(dom.getInternalVMContext(),{timeout:1500});
      phase='SNAPSHOT';
      const client=await BotGuardClient.create({program:challenge.program,globalName:challenge.globalName,globalObject:dom.window});
      const output=[];
      const snapshot=await client.snapshot({webPoSignalOutput:output});
      phase='INTEGRITY';
      const response=await boundedFetch(buildURL('GenerateIT',true),{
        method:'POST',headers:getHeaders(),body:JSON.stringify([REQUEST_KEY,snapshot])
      });
      if(!response.ok)throw new AudioError('SOURCE_VERIFICATION_UNAVAILABLE',503);
      const [integrityToken,estimatedTtlSecs,mintRefreshThreshold,websafeFallbackToken]=await response.json();
      if(typeof integrityToken!=='string'||!integrityToken)throw new AudioError('SOURCE_VERIFICATION_UNAVAILABLE',503);
      phase='MINTER';
      const minter=await WebPoMinter.create({integrityToken,estimatedTtlSecs,mintRefreshThreshold,websafeFallbackToken},adaptMinterOutput(output));
      const ttl=Math.max(30,Math.min(600,Number(estimatedTtlSecs)||120));
      return {dom,minter,expiresAt:now()+(ttl-15)*1000};
    }catch{dom.window.close();throw new AudioError('SOURCE_PROOF_'+phase+'_FAILED',503)}
  }
  async function get(){
    if(cached?.expiresAt>now())return cached;
    if(pending)return pending;
    cached?.dom.window.close();cached=null;
    pending=initialize().then(value=>{cached=value;return value}).finally(()=>{pending=null});
    return pending;
  }
  return {
    async mint(id){
      if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw new AudioError('INVALID_AUDIO_REQUEST',400);
      const {minter}=await get();
      const token=await minter.mintAsWebsafeString(id);
      if(typeof token!=='string'||token.length<20||token.length>4096)throw new AudioError('SOURCE_VERIFICATION_UNAVAILABLE',503);
      return token;
    }
  };
}

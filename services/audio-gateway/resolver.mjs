import { Innertube, Constants, Platform } from 'youtubei.js';
import { getQuickJS } from 'quickjs-emscripten';
import { AudioError, mediaURL } from './errors.mjs';

export async function evaluatePlayer(data) {
  if (typeof data?.output !== 'string' || data.output.length > 2_000_000) {
    throw new AudioError('INVALID_PLAYER_SCRIPT', 502);
  }
  const runtime = (await getQuickJS()).newRuntime();
  runtime.setMemoryLimit(32 * 1024 * 1024);
  runtime.setMaxStackSize(512 * 1024);
  const deadline = Date.now() + 1500;
  runtime.setInterruptHandler(() => Date.now() > deadline);
  const context = runtime.newContext();
  let result;
  try {
    result = context.evalCode(data.output);
    if (result.error) throw new AudioError('PLAYER_EVALUATION_FAILED', 502);
    const value = context.dump(result.value);
    if (!value || typeof value !== 'object') throw new AudioError('INVALID_PLAYER_RESULT', 502);
    return value;
  } finally {
    result?.value?.dispose();
    result?.error?.dispose();
    context.dispose();
    runtime.dispose();
  }
}

Platform.shim.eval = evaluatePlayer;
Object.assign(Constants.CLIENTS.VISIONOS, {
  VERSION:'0.1', OS_NAME:'VISION_OS', OS_VERSION:'1.3', DEVICE_MAKE:'Apple', DEVICE_MODEL:'RealityDevice14,1',
  USER_AGENT:'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
});

export async function readWatchVisitor(response,{onVersion=()=>{}}={}) {
  if(!response.ok)throw new AudioError('SOURCE_BLOCKED',503);
  const reader=response.body?.getReader();
  if(!reader)throw new AudioError('SOURCE_SESSION_UNAVAILABLE',503);
  const decoder=new TextDecoder();let text='',bytes=0;
  try{
    while(bytes<2*1024*1024){
      const {done,value}=await reader.read();if(done)break;
      bytes+=value.byteLength;text+=decoder.decode(value,{stream:true});
      const version=/"INNERTUBE_(?:CONTEXT_)?CLIENT_VERSION"\s*:\s*"(1\.\d{8}\.\d{2}\.\d{2})"/.exec(text);
      if(version)onVersion(version[1]);
      const match=/"VISITOR_DATA"\s*:\s*("(?:[^"\\]|\\.)+")/.exec(text);
      if(match){
        const visitor=JSON.parse(match[1]);
        if(typeof visitor==='string'&&visitor.length>=10&&visitor.length<=2048&&/^[A-Za-z0-9_%=-]+$/.test(visitor))return visitor;
      }
    }
    throw new AudioError('SOURCE_SESSION_UNAVAILABLE',503);
  }finally{await reader.cancel().catch(()=>{})}
}

export function selectAudio(formats, container) {
  const candidates = (formats || []).filter(format => format.has_audio && !format.has_video &&
    !format.drm_families?.length && !format.drm_track_type && !format.is_type_otf &&
    !format.is_dubbed && !format.is_auto_dubbed && !format.is_descriptive &&
    format.mime_type?.startsWith('audio/' + container) &&
    (format.url || format.signature_cipher || format.cipher));
  candidates.sort((a, b) => Number(b.is_original === true) - Number(a.is_original === true) ||
    Math.abs((a.bitrate || 0) - 160000) - Math.abs((b.bitrate || 0) - 160000));
  if (!candidates.length) throw new AudioError('AUDIO_FORMAT_UNAVAILABLE', 422);
  return candidates[0];
}

export function createResolver({ fetcher = fetch, now = Date.now, makeSession, makeProof, report = () => {} } = {}) {
  const cache = new Map(), pending = new Map();
  let sessionPromise,proofPromise;
  const getProof=()=>proofPromise||=(makeProof?makeProof():import('./proof.mjs').then(module=>module.createProofProvider({fetcher,now}))).catch(error=>{proofPromise=null;throw error});
  const boundedFetch = async (input, options = {}) => {
    const endpoint=new URL(input instanceof Request?input.url:String(input));
    if(endpoint.hostname==='www.youtube.com'&&endpoint.pathname==='/youtubei/v1/player'){
      endpoint.hostname='music.youtube.com';input=input instanceof Request?new Request(endpoint,input):endpoint;
    }
    try{
      const response=await fetcher(input, {
        ...options,
        signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(16000)]) : AbortSignal.timeout(16000)
      });
      if(!response.ok)report({stage:'http',host:endpoint.hostname,status:response.status});
      return response;
    }catch(error){report({stage:'network',host:endpoint.hostname,kind:error.name});throw error}
  };
  const session = id => sessionPromise ||= (async()=>{
    if(makeSession)return makeSession();
    const response=await boundedFetch('https://music.youtube.com/watch?v='+encodeURIComponent(id),{
      headers:{'User-Agent':Constants.CLIENTS.VISIONOS.USER_AGENT,'Accept-Language':'en-US,en;q=0.9'}
    });
    const visitor=await readWatchVisitor(response,{onVersion:version=>{Constants.CLIENTS.YTMUSIC.VERSION=version}});
    return Innertube.create({
      lang: 'en', location: 'US', generate_session_locally: true, visitor_data:visitor,
      retrieve_innertube_config:false, retrieve_player: true, fetch: boundedFetch
    });
  })().catch(error => { sessionPromise = null;report({stage:'session',kind:error.name,code:error.code||'SESSION_FAILED'});throw error; });

  async function extract(id, container) {
    const yt = await session(id);
    let lastError;
    for (const client of ['VISIONOS','YTMUSIC']) {
      try {
        let proof=null;
        if(client==='YTMUSIC'){
          if(!/bot|sign in/i.test(lastError?.details?.sourceReason||''))break;
          try{proof=await(await getProof()).mint(id)}catch(error){
            report({stage:'verification',kind:error.name,code:error.code||'VERIFICATION_FAILED'});
            throw new AudioError('SOURCE_VERIFICATION_REQUIRED',503,{...(lastError?.details||{}),verificationError:error.code||error.name});
          }
        }
        const info = await yt.getBasicInfo(id, { client });
        if (info.basic_info?.is_live || info.basic_info?.is_live_content) {
          throw new AudioError('LIVE_AUDIO_UNSUPPORTED', 422);
        }
        const status = info.playability_status?.status;
        if (status && status !== 'OK') {
          const reason=String(info.playability_status?.reason||'').slice(0,240).replace(/https?:\/\/\S+/g,'[url]');
          report({stage:'playability',client,status,reason});
          throw new AudioError(status==='LOGIN_REQUIRED'?'SOURCE_LOGIN_REQUIRED':'AUDIO_UNAVAILABLE',422,{sourceStatus:status,sourceReason:reason});
        }
        const format = selectAudio(info.streaming_data?.adaptive_formats, container);
        const url = mediaURL(await format.decipher(yt.session.player));
        if(proof)url.searchParams.set('pot',proof);
        const upstreamExpiry = Number(url.searchParams.get('expire')) * 1000;
        const expiresAt = Math.min(now() + 120000, upstreamExpiry > 0 ? upstreamExpiry - 60000 : now() + 120000);
        if (expiresAt <= now()) throw new AudioError('EXPIRED_MEDIA_URL', 502);
        return {
          url: url.href, expiresAt, mime: format.mime_type,
          headers: { 'User-Agent': Constants.CLIENTS[client].USER_AGENT||yt.session.context?.client?.userAgent||Constants.CLIENTS.VISIONOS.USER_AGENT,
            'Origin': 'https://www.youtube.com', 'Referer': 'https://www.youtube.com/' }
        };
      } catch (error) {
        lastError = error;
        report({stage:'extract',client,kind:error.name,code:error.code||'EXTRACTION_FAILED',status:error.info?.status||null});
        if (error.code === 'LIVE_AUDIO_UNSUPPORTED') break;
      }
    }
    throw lastError instanceof AudioError ? lastError : new AudioError('SOURCE_UNAVAILABLE', 503);
  }

  function resolve(id, container = 'mp4', { fresh = false } = {}) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id) || !['mp4', 'webm'].includes(container)) {
      return Promise.reject(new AudioError('INVALID_AUDIO_REQUEST', 400));
    }
    const key = id + ':' + container;
    if (fresh) cache.delete(key);
    const hit = cache.get(key);
    if (hit?.expiresAt > now()) return Promise.resolve(hit);
    if (pending.has(key)) return pending.get(key);
    const work = extract(id, container).then(result => {
      cache.set(key, result);
      while (cache.size > 128) cache.delete(cache.keys().next().value);
      return result;
    }).finally(() => pending.delete(key));
    pending.set(key, work);
    return work;
  }
  return { resolve };
}

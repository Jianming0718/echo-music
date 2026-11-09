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

export function createResolver({ fetcher = fetch, now = Date.now, makeSession } = {}) {
  const cache = new Map(), pending = new Map();
  let sessionPromise;
  const boundedFetch = (url, options = {}) => fetcher(url, {
    ...options,
    signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(16000)]) : AbortSignal.timeout(16000)
  });
  const session = () => sessionPromise ||= (makeSession ? makeSession() : Innertube.create({
    lang: 'en', location: 'US', generate_session_locally: true,
    retrieve_player: true, fetch: boundedFetch
  })).catch(error => { sessionPromise = null; throw error; });

  async function extract(id, container) {
    const yt = await session();
    let lastError;
    for (const client of ['VISIONOS', 'ANDROID_VR']) {
      try {
        const info = await yt.getBasicInfo(id, { client });
        if (info.basic_info?.is_live || info.basic_info?.is_live_content) {
          throw new AudioError('LIVE_AUDIO_UNSUPPORTED', 422);
        }
        const status = info.playability_status?.status;
        if (status && status !== 'OK') throw new AudioError('AUDIO_UNAVAILABLE', 422);
        const format = selectAudio(info.streaming_data?.adaptive_formats, container);
        const url = mediaURL(await format.decipher(yt.session.player));
        const upstreamExpiry = Number(url.searchParams.get('expire')) * 1000;
        const expiresAt = Math.min(now() + 120000, upstreamExpiry > 0 ? upstreamExpiry - 60000 : now() + 120000);
        if (expiresAt <= now()) throw new AudioError('EXPIRED_MEDIA_URL', 502);
        return {
          url: url.href, expiresAt, mime: format.mime_type,
          headers: { 'User-Agent': Constants.CLIENTS[client].USER_AGENT,
            'Origin': 'https://www.youtube.com', 'Referer': 'https://www.youtube.com/' }
        };
      } catch (error) {
        lastError = error;
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

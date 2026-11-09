import { AudioError, mediaURL } from './errors.mjs';

const safeRange = value => {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || !match[1] && !match[2]) throw new AudioError('INVALID_RANGE', 416);
  const start = match[1] ? Number(match[1]) : null, end = match[2] ? Number(match[2]) : null;
  if ([start, end].some(n => n !== null && (!Number.isSafeInteger(n) || n < 0)) ||
      start !== null && end !== null && start > end || start === null && end === 0) {
    throw new AudioError('INVALID_RANGE', 416);
  }
  return value;
};

export function createAudioHandler({ resolver, fetcher = fetch, origins = [], now = Date.now, resolveTimeoutMs = 20000 } = {}) {
  const allowed = new Set(origins.filter(Boolean).map(value => new URL(value).origin));
  const requests = new Map();

  return async (request, { clientIP = 'unknown' } = {}) => {
    const deadline = Date.now() + 45000;
    const url = new URL(request.url), origin = request.headers.get('Origin');
    const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'Vary': 'Origin' });
    if (origin && allowed.has(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    }
    function failure(code, status, details = {}) {
      headers.set('Content-Type', 'application/json; charset=utf-8');
      if (status === 429) headers.set('Retry-After', '60');
      const sourceStatus=typeof details.sourceStatus==='string'?details.sourceStatus.slice(0,40):null;
      const sourceReason=typeof details.sourceReason==='string'?details.sourceReason.slice(0,240).replace(/https?:\/\/\S+/g,'[url]'):null;
      const verificationError=typeof details.verificationError==='string'&&/^[A-Za-z0-9_]{1,80}$/.test(details.verificationError)?details.verificationError:null;
      return new Response(request.method === 'HEAD' ? null : JSON.stringify({ error: code,...(sourceStatus?{sourceStatus}:{}),...(sourceReason?{sourceReason}:{}),...(verificationError?{verificationError}:{}) }), { status, headers });
    }
    try {
      if (origin && !allowed.has(origin)) throw new AudioError('ORIGIN_NOT_ALLOWED', 403);
      if (request.method === 'OPTIONS') {
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Range');
        headers.set('Access-Control-Max-Age', '600');
        return new Response(null, { status: 204, headers });
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        headers.set('Allow', 'GET, HEAD, OPTIONS');
        throw new AudioError('METHOD_NOT_ALLOWED', 405);
      }
      if (url.pathname.endsWith('/health')) {
        headers.set('Content-Type', 'application/json');
        return new Response(request.method === 'HEAD' ? null : JSON.stringify({
          service: 'echo-audio', version: 6, transport: 'audio-only',
          playbackVerified: false
        }), { headers });
      }
      const id = url.searchParams.get('v'), format = url.searchParams.get('format') || 'mp4';
      if (!/^[A-Za-z0-9_-]{11}$/.test(id || '') || !['mp4', 'webm'].includes(format) ||
          [...url.searchParams.keys()].some(key => !['v', 'format'].includes(key))) {
        throw new AudioError('INVALID_AUDIO_REQUEST', 400);
      }
      const range = safeRange(request.headers.get('Range'));
      const minute = Math.floor(now() / 60000), key = clientIP + ':' + minute;
      if ((requests.get(key) || 0) >= 120) throw new AudioError('RATE_LIMITED', 429);
      requests.set(key, (requests.get(key) || 0) + 1);
      for (const key of requests.keys()) if (!key.endsWith(':' + minute)) requests.delete(key);
      if (requests.size > 4096) throw new AudioError('SERVER_BUSY', 503);

      let result, source;
      for (let attempt = 0; attempt < 2; attempt++) {
        let timer;
        try {
          source = await Promise.race([
            resolver.resolve(id, format, { fresh: attempt > 0 }),
            new Promise((_resolve, reject) => {
              timer = setTimeout(() => reject(new AudioError('AUDIO_TIMEOUT', 504)), Math.max(1, Math.min(resolveTimeoutMs, deadline - Date.now())));
            })
          ]);
        } finally { clearTimeout(timer); }
        if(request.signal.aborted) throw new AudioError('AUDIO_CANCELLED', 499);
        let target = mediaURL(source.url);
        for (let redirects = 0; redirects < 4; redirects++) {
          const timeout = new AbortController();
          const timer = setTimeout(() => timeout.abort(), Math.max(1, Math.min(25000, deadline - Date.now())));
          const signal = AbortSignal.any([request.signal, timeout.signal]);
          const mediaHeaders = new Headers({ 'Accept-Encoding': 'identity', 'Range': range || 'bytes=0-' });
          for (const name of ['User-Agent', 'Origin', 'Referer']) {
            if (source.headers?.[name]) mediaHeaders.set(name, source.headers[name]);
          }
          try {
            result = await fetcher(target.href, { method: request.method, headers: mediaHeaders,
              redirect: 'manual', signal });
          } finally { clearTimeout(timer); }
          if (![301, 302, 303, 307, 308].includes(result.status)) break;
          await result.body?.cancel();
          target = mediaURL(new URL(result.headers.get('Location'), target).href);
          result = null;
        }
        if (!result) throw new AudioError('MEDIA_REDIRECT_FAILED', 502);
        if (![403, 410].includes(result.status) || attempt > 0) break;
        await result.body?.cancel();
      }
      if (result.status === 416) {
        const value = result.headers.get('Content-Range');
        if (value && /^bytes \*\/\d+$/.test(value)) headers.set('Content-Range', value);
        await result.body?.cancel();
        return failure('RANGE_NOT_SATISFIABLE', 416);
      }
      if (![200, 206].includes(result.status)) {
        await result.body?.cancel();
        throw new AudioError([403, 429].includes(result.status) ? 'SOURCE_BLOCKED' : 'SOURCE_UNAVAILABLE', 503);
      }
      const mime = result.headers.get('Content-Type') || '';
      if (!mime.toLowerCase().startsWith('audio/' + format)) {
        await result.body?.cancel();
        throw new AudioError('INVALID_AUDIO_RESPONSE', 502);
      }
      headers.set('Content-Type', mime);
      headers.set('Accept-Ranges', 'bytes');
      let status = result.status;
      if (result.status === 206) {
        const contentRange = result.headers.get('Content-Range');
        if (!/^bytes \d+-\d+\/\d+$/.test(contentRange || '')) {
          await result.body?.cancel();
          throw new AudioError('INVALID_AUDIO_RANGE', 502);
        }
        if (range) headers.set('Content-Range', contentRange);
        else {
          const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange);
          if (Number(match[1]) !== 0 || Number(match[2]) + 1 !== Number(match[3])) {
            await result.body?.cancel();
            throw new AudioError('INCOMPLETE_AUDIO_RESPONSE', 502);
          }
          status = 200;
        }
      } else if (range) {
        await result.body?.cancel();
        throw new AudioError('RANGE_UNSUPPORTED', 502);
      }
      const length = result.headers.get('Content-Length');
      if (length && Number(length) > 20 * 1024 * 1024) {
        await result.body?.cancel();
        throw new AudioError('AUDIO_RESPONSE_TOO_LARGE', 413);
      }
      if (length && /^\d+$/.test(length)) headers.set('Content-Length', length);
      return new Response(request.method === 'HEAD' ? null : result.body, { status, headers });
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') return failure('AUDIO_TIMEOUT', 504);
      return failure(error instanceof AudioError ? error.code : 'SOURCE_UNAVAILABLE', error instanceof AudioError ? error.status : 503,error instanceof AudioError?error.details:{});
    }
  };
}

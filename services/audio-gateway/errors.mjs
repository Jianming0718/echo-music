export class AudioError extends Error {
  constructor(code, status = 503) {
    super(code);
    this.name = 'AudioError';
    this.code = code;
    this.status = status;
  }
}

export function mediaURL(value) {
  let url;
  try { url = new URL(value); } catch { throw new AudioError('INVALID_MEDIA_URL', 502); }
  if (url.protocol !== 'https:' || url.port || url.username || url.password ||
      !url.hostname.endsWith('.googlevideo.com') || url.pathname !== '/videoplayback') {
    throw new AudioError('INVALID_MEDIA_URL', 502);
  }
  return url;
}

import { createResolver } from '../../services/audio-gateway/resolver.mjs';
import { createAudioHandler } from '../../services/audio-gateway/handler.mjs';

const handle = createAudioHandler({
  resolver: createResolver(),
  origins: ['https://jianming0718.github.io', process.env.URL, process.env.DEPLOY_PRIME_URL,
    ...(process.env.ECHO_AUDIO_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)]
});

export default (request, context) => handle(request, { clientIP: context.ip });
export const config = { path: ['/api/audio', '/api/audio/health'] };

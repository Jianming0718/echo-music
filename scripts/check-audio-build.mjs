import { evaluatePlayer } from '../services/audio-gateway/resolver.mjs';
const result=await evaluatePlayer({output:'({n:"ready"})'});
if(result.n!=='ready')throw Error('Audio runtime failed its build check.');
console.log('Audio runtime and isolated JavaScript interpreter are ready. Live playback still requires verification.');

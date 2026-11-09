import {readFile,writeFile} from 'node:fs/promises';
let existing={};
try{const source=await readFile(new URL('../dist/config.js',import.meta.url),'utf8');existing=JSON.parse(source.split('Object.freeze(',2)[1].split(');',1)[0])}catch{}
const supabaseUrl=(process.env.ECHO_SUPABASE_URL||existing.supabaseUrl||'').trim();
const supabaseAnonKey=(process.env.ECHO_SUPABASE_ANON_KEY||existing.supabaseAnonKey||'').trim();
if(Boolean(supabaseUrl)!==Boolean(supabaseAnonKey))throw new Error('Set both public Supabase URL and publishable/anon key.');
if(supabaseUrl&&new URL(supabaseUrl).protocol!=='https:')throw new Error('Supabase URL must use HTTPS.');
if(supabaseAnonKey.startsWith('sb_secret_'))throw new Error('A Supabase secret key must never be put in the browser.');
if(supabaseAnonKey&&!supabaseAnonKey.startsWith('sb_publishable_')){
 let claims;
 try{claims=JSON.parse(Buffer.from(supabaseAnonKey.split('.')[1]||'','base64url'))}catch{throw new Error('Use a Supabase publishable or legacy anon key.');}
 if(claims.role!=='anon')throw new Error('Only a publishable or anon key may be put in the browser.');
}
const accountBackend=process.env.ECHO_ACCOUNT_BACKEND||existing.accountBackend||'supabase';
if(!['supabase','sheets'].includes(accountBackend))throw Error('Unknown account backend.');
const appsScriptUrl=(process.env.ECHO_APPS_SCRIPT_URL||existing.appsScriptUrl||'').trim();
if(appsScriptUrl&&!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(appsScriptUrl))throw Error('Use the Apps Script /exec deployment URL.');
if(accountBackend==='sheets'&&!appsScriptUrl)throw Error('The Sheets backend requires its Apps Script URL.');
const playbackMode=process.env.ECHO_PLAYBACK_MODE||existing.playbackMode||'youtube-embed';
if(!['youtube-embed','audio-only'].includes(playbackMode))throw Error('Unknown playback mode.');
const netlifyOrigin=process.env.NETLIFY==='true'?(process.env.DEPLOY_PRIME_URL||process.env.URL||''):'';
const audioGatewayUrl=(process.env.ECHO_AUDIO_GATEWAY_URL||(netlifyOrigin?new URL('/api/audio',netlifyOrigin).href:'')||existing.audioGatewayUrl||'').trim();
if(audioGatewayUrl){const url=new URL(audioGatewayUrl);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Use an HTTPS audio endpoint without credentials or query parameters.');}
if(playbackMode==='audio-only'&&!audioGatewayUrl)throw Error('Audio-only playback requires ECHO_AUDIO_GATEWAY_URL or a Netlify deployment URL.');
await writeFile(new URL('../dist/config.js',import.meta.url),"'use strict';\nwindow.ECHO_CONFIG=Object.freeze("+JSON.stringify({supabaseUrl,supabaseAnonKey,accountBackend,appsScriptUrl,playbackMode,...(audioGatewayUrl?{audioGatewayUrl}:{})})+");\n");
console.log('Public browser configuration written. Playback: '+playbackMode+'.');

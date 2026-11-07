import {readFile,writeFile} from 'node:fs/promises';
let existing={};
try{const source=await readFile(new URL('../dist/config.js',import.meta.url),'utf8');existing=JSON.parse(source.split('Object.freeze(',2)[1].split(');',1)[0])}catch{}
const supabaseUrl=(process.env.ECHO_SUPABASE_URL||existing.supabaseUrl||'').trim();
const supabaseAnonKey=(process.env.ECHO_SUPABASE_ANON_KEY||existing.supabaseAnonKey||'').trim();
const youtubeApiKey=(process.env.ECHO_YOUTUBE_API_KEY||existing.youtubeApiKey||'').trim();
if(Boolean(supabaseUrl)!==Boolean(supabaseAnonKey))throw new Error('Set both public Supabase URL and publishable/anon key.');
if(supabaseUrl&&new URL(supabaseUrl).protocol!=='https:')throw new Error('Supabase URL must use HTTPS.');
if(supabaseAnonKey.startsWith('sb_secret_'))throw new Error('A Supabase secret key must never be put in the browser.');
if(supabaseAnonKey&&!supabaseAnonKey.startsWith('sb_publishable_')){
 let claims;
 try{claims=JSON.parse(Buffer.from(supabaseAnonKey.split('.')[1]||'','base64url'))}catch{throw new Error('Use a Supabase publishable or legacy anon key.');}
 if(claims.role!=='anon')throw new Error('Only a publishable or anon key may be put in the browser.');
}
await writeFile(new URL('../dist/config.js',import.meta.url),"'use strict';\nwindow.ECHO_CONFIG=Object.freeze("+JSON.stringify({supabaseUrl,supabaseAnonKey,youtubeApiKey})+");\n");
console.log('Public browser configuration written. Accounts: '+Boolean(supabaseUrl)+'. Music search backend configured: '+Boolean(supabaseUrl)+'. Optional YouTube Data API: '+Boolean(youtubeApiKey)+'.');

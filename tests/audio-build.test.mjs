import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

async function build(env){
 const root=await mkdtemp(join(tmpdir(),'echo-audio-config-'));
 try{
  await mkdir(join(root,'scripts'));await mkdir(join(root,'dist'));
  await writeFile(join(root,'scripts/write-config.mjs'),await readFile(new URL('../scripts/write-config.mjs',import.meta.url)));
  const original={accountBackend:'sheets',appsScriptUrl:'https://script.google.com/macros/s/test/exec',supabaseUrl:'',supabaseAnonKey:''};
  await writeFile(join(root,'dist/config.js'),'window.ECHO_CONFIG=Object.freeze('+JSON.stringify(original)+');');
  const result=spawnSync(process.execPath,['scripts/write-config.mjs'],{cwd:root,env:{PATH:process.env.PATH,...env},encoding:'utf8'});
  const source=await readFile(join(root,'dist/config.js'),'utf8');
  const config=JSON.parse(source.split('Object.freeze(')[1].split(');')[0]);
  return {result,config};
 }finally{await rm(root,{recursive:true,force:true})}
}

test('does not silently switch the existing playback mode or account backend',async()=>{
 const {result,config}=await build({});assert.equal(result.status,0);assert.equal(config.playbackMode,'youtube-embed');assert.equal(config.accountBackend,'sheets');assert(config.appsScriptUrl.endsWith('/exec'));
});
test('requires a real endpoint before enabling audio-only playback',async()=>{
 const {result}=await build({ECHO_PLAYBACK_MODE:'audio-only'});assert.notEqual(result.status,0);
});
test('generates a same-site Netlify audio endpoint without changing accounts',async()=>{
 const {result,config}=await build({NETLIFY:'true',DEPLOY_PRIME_URL:'https://echo-test.netlify.app',ECHO_PLAYBACK_MODE:'audio-only'});
 assert.equal(result.status,0);assert.equal(config.audioGatewayUrl,'https://echo-test.netlify.app/api/audio');assert.equal(config.playbackMode,'audio-only');assert.equal(config.accountBackend,'sheets');
});
test('accepts the verified gateway for GitHub Pages and refuses embedded credentials',async()=>{
 const {result,config}=await build({ECHO_PLAYBACK_MODE:'audio-only',ECHO_AUDIO_GATEWAY_URL:'https://echo-test.netlify.app/api/audio'});
 assert.equal(result.status,0);assert.equal(config.audioGatewayUrl,'https://echo-test.netlify.app/api/audio');
 for(const url of ['http://example.test/api/audio','https://user:password@example.test/api/audio','https://example.test/api/audio?token=private']){
  assert.notEqual((await build({ECHO_PLAYBACK_MODE:'audio-only',ECHO_AUDIO_GATEWAY_URL:url})).result.status,0);
 }
});

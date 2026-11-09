import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom-proof';
import {WebPoMinter} from 'bgutils-js/webpo';
import {adaptMinterOutput} from '../services/audio-gateway/proof.mjs';

test('adapts browser-realm proof callbacks and bytes to the actual library without exposing Node globals',async()=>{
 const dom=new JSDOM('',{runScripts:'outside-only'});
 try{
  const minterFactory=dom.window.eval('(function(){ return function(){return new Uint8Array([1,2,3,4]);} })');
  assert.equal(dom.window.eval('typeof process'),'undefined');
  assert(!(minterFactory instanceof Function));
  await assert.rejects(WebPoMinter.create({integrityToken:'YWJj'},[minterFactory]));
  const minter=await WebPoMinter.create({integrityToken:'YWJj'},adaptMinterOutput([minterFactory]));
  assert.equal(await minter.mintAsWebsafeString('c6ASQOwKkhk'),'AQIDBA==');
 }finally{dom.window.close()}
});

test('rejects missing callbacks, non-byte results and oversized proofs',async()=>{
 assert.throws(()=>adaptMinterOutput([]));
 for(const result of [null,'unsafe',new Uint8Array(4097)]){
  const minter=await WebPoMinter.create({integrityToken:'YWJj'},adaptMinterOutput([async()=>async()=>result]));
  await assert.rejects(minter.mint('c6ASQOwKkhk'));
 }
});

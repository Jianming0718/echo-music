const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'../dist'),version=require('../package.json').version;
(async()=>{
 const html=fs.readFileSync(root+'/index.html','utf8');assert(html.includes('data-echo-release="'+version+'"'));
 const assets=[...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^" ]+)?)"/g)].map(match=>new URL(match[1],'https://echo.test/echo/'));
 assert(assets.length>8);for(const url of assets){assert.equal(url.searchParams.get('v'),version);assert(fs.existsSync(path.join(root,url.pathname.replace(/^\/echo\//,''))))}
 const handlers={},cached=[],scope='https://echo.test/echo/',responses=[];
 const cache={addAll:async requests=>cached.push(...requests),put:async()=>{}},caches={open:async()=>cache,keys:async()=>[],match:async()=>undefined};
 const sandbox={URL,Promise,Response,Request:class extends Request{constructor(url,options){super(new URL(url,scope),options)}},caches,self:{registration:{scope},location:{origin:'https://echo.test'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},fetch:async(request,options)=>{responses.push(options);return new Response('current source')}};
 vm.runInNewContext(fs.readFileSync(root+'/sw.js','utf8'),sandbox);
 let work;handlers.install({waitUntil:promise=>work=promise});await work;
 assert(cached.some(request=>request.url.endsWith('media-transport.js?v='+version)));assert(cached.every(request=>request.cache==='reload'));
 let result;handlers.fetch({request:new Request(scope+'app.js?v='+version),respondWith:promise=>result=promise});assert.equal(await (await result).text(),'current source');assert.equal(responses[0].cache,'no-cache');
 sandbox.fetch=async()=>{throw Error('offline')};let matchOptions;caches.match=async(request,options)=>{matchOptions=options;return new Response('offline shell')};handlers.fetch({request:new Request(scope+'media-transport.js?v='+version),respondWith:promise=>result=promise});assert.equal(await (await result).text(),'offline shell');assert.equal(matchOptions.ignoreSearch,true);
 let scriptIntercepted=false;handlers.fetch({request:new Request(scope+'echo-ad-skip.user.js'),respondWith:()=>{scriptIntercepted=true}});assert.equal(scriptIntercepted,false);
 console.log('PASS all script/style versions agree, installation reloads stale assets, runtime revalidates, and versioned offline assets remain available');
})().catch(error=>{console.error(error);process.exit(1)});

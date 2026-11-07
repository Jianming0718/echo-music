import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(path.join(root,'dist/vendor'),{recursive:true});
const result=await build({entryPoints:[path.join(root,'scripts/supabase-entry.mjs')],bundle:true,minify:true,legalComments:'none',format:'iife',globalName:'EchoSupabase',platform:'browser',target:'es2020',metafile:true,outfile:path.join(root,'dist/vendor/supabase.js')});
const packages=new Set();
for(const input of Object.keys(result.metafile.inputs)){const normalized=input.replaceAll('\\','/');const match=normalized.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);if(match)packages.add(match[1])}
const licenses=[];
for(const name of packages){for(const file of ['LICENSE','LICENSE.md','LICENSE.txt','LICENSE-MIT']){try{licenses.push(name+'\n\n'+await readFile(path.join(root,'node_modules',name,file),'utf8'));break}catch{}}}
await writeFile(path.join(root,'dist/vendor/ThirdParty-LICENSES.txt'),licenses.join('\n\n====================\n\n'));
console.log('Supabase browser SDK and third-party licenses rebuilt.');

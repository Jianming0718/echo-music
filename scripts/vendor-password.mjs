import {build} from 'esbuild';
import {copyFile} from 'node:fs/promises';
await build({entryPoints:['node_modules/bcryptjs/index.js'],bundle:true,format:'iife',globalName:'EchoBcrypt',platform:'browser',target:'es2019',inject:['scripts/gas-password-runtime.mjs'],outfile:'apps-script/vendor/Bcrypt.gs',plugins:[{name:'gas-random',setup(builder){builder.onResolve({filter:/^crypto$/},()=>({path:'crypto',namespace:'gas'}));builder.onLoad({filter:/.*/,namespace:'gas'},()=>({contents:'export default {};',loader:'js'}))}}]});
await copyFile('node_modules/bcryptjs/LICENSE','apps-script/vendor/BCRYPT-LICENSE.txt');

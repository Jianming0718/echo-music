import {readFile,writeFile} from 'node:fs/promises';
const names=['vendor/Bcrypt.gs','src/Router.gs','src/Sheets.gs','src/Auth.gs','src/Avatars.gs','src/Community.gs'];
const source=(await Promise.all(names.map(name=>readFile(new URL('../apps-script/'+name,import.meta.url),'utf8')))).join('\n');
await writeFile(new URL('../apps-script/Code.gs',import.meta.url),source);
console.log('Complete Apps Script Code.gs assembled from versioned sources. No runtime credentials included.');

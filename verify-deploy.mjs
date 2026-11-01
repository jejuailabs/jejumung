import {readdir,readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
const forbidden=/firebase-adminsdk|service.?account|\.(mov|pem|key)$|^\.env/i;
async function scan(dir){for(const item of await readdir(dir,{withFileTypes:true})){
 if(['.git','.vercel','node_modules'].includes(item.name))continue;
 if(forbidden.test(item.name))throw Error('Credential/source file must not be deployed: '+item.name);
 const path=join(dir,item.name);
 if(item.isDirectory()){await scan(path);continue;}
 if((await stat(path)).size>25*1024*1024)throw Error('Unexpected large asset: '+path);
 if(/\.(js|mjs|json|html|md)$/.test(item.name)&&!item.name.startsWith('verify-')){
  const text=await readFile(path,'utf8');
  if(/-----BEGIN [A-Z ]*PRIVATE KEY-----|"private_key"\s*:/.test(text))throw Error('Private key found: '+path);
 }
}}
await scan(new URL('.',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const conf=JSON.parse(await readFile(new URL('vercel.json',import.meta.url),'utf8'));
if(conf.framework!==null||conf.outputDirectory!=='dist')throw Error('Static Vercel settings changed');
console.log('Deployment file safety and Vercel static configuration: OK');

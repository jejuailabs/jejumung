import {readFile,stat,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {CLIPS} from './dist/clips.js';
import {TRAVELERS} from './dist/traveler-assets.js';
const root=new URL('./dist/',import.meta.url),fail=message=>{throw Error(message)};
const files=[];
async function walk(url){for(const entry of await readdir(url,{withFileTypes:true})){const child=new URL(entry.name+(entry.isDirectory()?'/':''),url);if(entry.isDirectory())await walk(child);else files.push({url:child,size:(await stat(child)).size});}}
await walk(root);
for(const f of files){if(f.size>=25*1024*1024)fail('Asset exceeds 25 MiB: '+f.url);if(/\.(mov|log)$/i.test(f.url.pathname))fail('Private/source file in public assets');}
const engine=await readFile(new URL('engine.html',root),'utf8');
if(/assets\/|prototype-v1|\/lab\/api|[A-Z]:[\\/]/.test(engine))fail('Internal or missing asset reference in public engine');
for(const clip of CLIPS){
 const url=new URL('.'+clip.src,root),playlist=await readFile(url,'utf8');
 if(!playlist.includes('#EXT-X-ENDLIST'))fail('Incomplete HLS playlist: '+clip.id);
 const durations=[...playlist.matchAll(/#EXTINF:([\d.]+)/g)].map(m=>Number(m[1]));
 const duration=durations.reduce((a,b)=>a+b,0);
 if(Math.abs(duration-clip.duration)>.2)fail('HLS duration no longer matches calibrated path: '+clip.id);
 for(const name of playlist.split(/\r?\n/).filter(line=>line&&!line.startsWith('#'))){if(name.includes('..')||name.includes('://'))fail('Unexpected segment reference');await stat(new URL(name,url));}
 await stat(new URL('.'+clip.poster,root));if(clip.path)await stat(new URL('.'+clip.path,root));
 console.log(`${clip.id}: ${duration.toFixed(3)} sec, ${durations.length} segments, references OK`);
}
console.log(`Public assets: ${files.length} files, ${(files.reduce((a,b)=>a+b.size,0)/1024/1024).toFixed(1)} MiB; all assets below 25 MiB.`);
let frameCount=0;
for(const[gender,traveler]of Object.entries(TRAVELERS))for(const[clip,group]of Object.entries(traveler.groups)){
 const image=await readFile(new URL(group.image,root));
 if(image.readUInt32BE(16)!==group.size[0]||image.readUInt32BE(20)!==group.size[1])fail('Sprite atlas dimension mismatch');
 if(group.frames.length!==8)fail('Incomplete animation loop');
 for(const frame of group.frames){const[x,y,w,h]=frame.rect;if(![...frame.rect,...frame.head,...frame.feet,...frame.anchor].every(Number.isFinite)||x<0||y<0||w<=0||h<=0||x+w>group.size[0]||y+h>group.size[1])fail('Invalid sprite frame: '+gender+'/'+clip);frameCount++;}
}
console.log(`Traveler sprite metadata: ${frameCount} valid frames, PNG sizes and all asset references verified.`);

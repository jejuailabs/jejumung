import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.m3u8':'application/vnd.apple.mpegurl','.ts':'video/mp2t','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.m4a':'audio/mp4','.mp3':'audio/mpeg','.svg':'image/svg+xml'};
createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let path=resolve(root,'.'+pathname);
 if(path!==resolve(root)&&!path.startsWith(resolve(root)+sep))throw Error('outside root');
 if(pathname.endsWith('/'))path=resolve(path,'index.html');
 else if(!extname(path))path+='.html';
 const info=await stat(path);if(!info.isFile())throw Error('not file');
 const type=types[extname(path)]||'application/octet-stream',range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range||'');
 // Byte ranges, so <audio>/<video> can seek like they do on Vercel.
 if(range&&(range[1]||range[2])){const start=range[1]?Number(range[1]):Math.max(0,info.size-Number(range[2])),end=range[1]&&range[2]?Math.min(Number(range[2]),info.size-1):info.size-1;
  res.writeHead(206,{'Content-Type':type,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${info.size}`,'Accept-Ranges':'bytes'});
  if(req.method==='HEAD')res.end();else res.end((await readFile(path)).subarray(start,end+1));return;}
 res.writeHead(200,{'Content-Type':type,'Content-Length':info.size,'Accept-Ranges':'bytes'});
 if(req.method==='HEAD')res.end();else res.end(await readFile(path));
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(4176,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4176/'));

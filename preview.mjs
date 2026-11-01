import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.m3u8':'application/vnd.apple.mpegurl','.ts':'video/mp2t','.jpg':'image/jpeg','.png':'image/png'};
createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let path=resolve(root,'.'+pathname);
 if(path!==resolve(root)&&!path.startsWith(resolve(root)+sep))throw Error('outside root');
 if(pathname.endsWith('/'))path=resolve(path,'index.html');
 else if(!extname(path))path+='.html';
 const info=await stat(path);if(!info.isFile())throw Error('not file');
 res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Content-Length':info.size});
 if(req.method==='HEAD')res.end();else res.end(await readFile(path));
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(4176,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4176/'));

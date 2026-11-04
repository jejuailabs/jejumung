// Visitor counts for the admin dashboard (/admin). Plain REST calls with an anonymous account kept in
// this browser: no open socket, so the Spark plan's 100 simultaneous connections stay with the lounge.
// It never blocks the page: every failure is swallowed. localStorage['jejumong-stats']='off' opts out.
import {LOUNGE_FIREBASE as conf} from './lounge-config.js';

const STORE='jejumong-stats-auth',ROOT=conf.databaseURL+'/stats/v1',BEAT=60000;
const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
const write=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
const off=read('jejumong-stats')==='off'||new URLSearchParams(location.search).has('loungePreview');
// Days follow Korean time, whatever the visitor's clock zone is.
export const dayKey=(at=Date.now())=>new Date(at+9*3600e3).toISOString().slice(0,10);
const inc={'.sv':{increment:1}};
let session=null,pending=null,page=location.pathname.startsWith('/engine')?'walk':'home',beat=null,since=0;
const clip=new URLSearchParams(location.search).get('clip');

async function token(){
 if(session&&session.exp>Date.now()+60000)return session;
 if(pending)return pending;
 pending=(async()=>{
  const saved=session||JSON.parse(read(STORE)||'null');
  let r,v;
  if(saved?.refresh){
   r=await fetch('https://securetoken.googleapis.com/v1/token?key='+conf.apiKey,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(saved.refresh)});
   v=await r.json();
   if(r.ok)session={uid:v.user_id,id:v.id_token,refresh:v.refresh_token,exp:Date.now()+v.expires_in*1000};
  }
  if(!session||!r?.ok){
   r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+conf.apiKey,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
   v=await r.json();if(!r.ok)throw Error('stats sign-up failed');
   session={uid:v.localId,id:v.idToken,refresh:v.refreshToken,exp:Date.now()+v.expiresIn*1000};
  }
  write(STORE,JSON.stringify({refresh:session.refresh}));
  return session;
 })().finally(()=>{pending=null;});
 return pending;
}
async function send(path,method,body,keepalive=false){
 const s=await token();
 return fetch(`${ROOT}/${path.replace('$uid',s.uid)}.json?auth=${encodeURIComponent(s.id)}`,{method,keepalive,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
}
const count=(field,keepalive)=>send(`days/${dayKey()}/$uid`,'PATCH',{[field]:inc},keepalive).catch(()=>{});
const alive=()=>send('live/$uid','PUT',{at:{'.sv':'timestamp'},page,...(clip&&/^[A-Z0-9_]{1,24}$/.test(clip)?{clip}:{})}).catch(()=>{});
// Dwell time `s`: seconds the page is in front, added once a minute and once more on leaving. The rules
// take at most 90 at a time, so a laptop waking from sleep cannot add the hours it was shut.
function dwell(keepalive){
 const sec=Math.min(90,Math.round((Date.now()-since)/1000));since=Date.now();
 if(sec>=1)send(`days/${dayKey()}/$uid`,'PATCH',{s:{'.sv':{increment:sec}}},keepalive).catch(()=>{});
}
function gone(){
 if(!beat)return;clearInterval(beat);beat=null;dwell(true);
 if(session)send('live/$uid','DELETE',undefined,true).catch(()=>{});
}
function show(){if(beat)return;alive();since=Date.now();beat=setInterval(()=>{alive();dwell();},BEAT);}

if(!off){
 count('v');
 if(document.visibilityState==='visible')show();
 document.addEventListener('visibilitychange',()=>document.visibilityState==='visible'?show():gone());
 addEventListener('pagehide',gone);
 // engine.js reports what the visitor does: {type:'play'|'lounge'|'walk'}.
 addEventListener('jejumong:stat',({detail})=>{
  if(detail?.type==='play'&&clip&&/^[A-Z0-9_]{1,24}$/.test(clip))count('p/'+clip);
  if(detail?.type==='lounge'){count('l');page='lounge';}
  if(detail?.type==='walk')page='walk';
  if(beat)alive();
 });
}

// Admin visitor dashboard. Reads stats/v1 (written by stats.js); the database rules let only accounts
// under stats/admins read it, so this page holds no secret. ?preview=1 draws sample data offline.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getDatabase,ref,query,orderByKey,startAt,onValue,remove} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js';
import {LOUNGE_FIREBASE} from './lounge-config.js';
import {CLIPS} from './clips.js';

const $=id=>document.getElementById(id),LIVE_WINDOW=150000,STALE=1800000;
const dayKey=(at=Date.now())=>new Date(at+9*3600e3).toISOString().slice(0,10);
const fmt=n=>n.toLocaleString('ko-KR');
const title=id=>CLIPS.find(c=>c.id===id)?.title||id;
let span=14,days={},live={},offset=0,stop=[],watchDays=()=>{};
const preview=new URLSearchParams(location.search).has('preview');

try{$('optOut').checked=localStorage.getItem('jejumong-stats')==='off';}catch{}
$('optOut').addEventListener('change',e=>{try{e.target.checked?localStorage.setItem('jejumong-stats','off'):localStorage.removeItem('jejumong-stats');}catch{}});
for(const b of document.querySelectorAll('[data-days]'))b.addEventListener('click',()=>{
 span=Number(b.dataset.days);document.querySelectorAll('[data-days]').forEach(o=>o.setAttribute('aria-pressed',String(o===b)));
 preview?render():watchDays();
});

// One day node is {uid:{v,l,p:{clip:n}}}; fold it into totals and the set of visitors.
function summarize(node={}){
 const s={visitors:0,views:0,plays:0,players:0,lounge:0,courses:{},uids:new Set()};
 for(const[uid,u]of Object.entries(node)){
  s.uids.add(uid);if(u.v)s.visitors++;s.views+=u.v||0;s.lounge+=u.l||0;
  const p=Object.entries(u.p||{});if(p.length)s.players++;
  for(const[clip,n]of p){const c=s.courses[clip]||={plays:0,people:0};c.plays+=n;c.people++;s.plays+=n;}
 }
 return s;
}
const range=()=>Array.from({length:span},(_,i)=>dayKey(Date.now()-(span-1-i)*864e5));

function render(){
 const keys=range(),rows=keys.map(k=>({key:k,...summarize(days[k])})),today=rows.at(-1),yesterday=rows.at(-2);
 const tile=(id,yid,field)=>{$(id).textContent=fmt(today[field]);$(yid).textContent=`어제 ${fmt(yesterday[field])}`;};
 tile('todayVisitors','yVisitors','visitors');tile('todayViews','yViews','views');tile('todayPlays','yPlays','plays');tile('todayLounge','yLounge','lounge');
 const all=new Set(rows.flatMap(r=>[...r.uids]));
 $('rangeSummary').textContent=`${span}일 동안 다녀간 브라우저 ${fmt(all.size)} · 페이지뷰 ${fmt(rows.reduce((a,r)=>a+r.views,0))}`;
 chart(rows);
 const courses={};for(const r of rows)for(const[id,c]of Object.entries(r.courses)){const t=courses[id]||={plays:0,people:new Set()};t.plays+=c.plays;}
 // People per course over the range: distinct visitors who played it on any day.
 for(const k of keys)for(const[uid,u]of Object.entries(days[k]||{}))for(const id of Object.keys(u.p||{}))courses[id].people.add(uid);
 const order=Object.entries(courses).sort((a,b)=>b[1].plays-a[1].plays);
 $('courses').innerHTML=order.length?order.map(([id,c])=>`<tr><td>${esc(title(id))}</td><td>${fmt(c.plays)}</td><td>${fmt(c.people.size)}</td></tr>`).join(''):'<tr><td colspan="3" class="empty">아직 재생 기록이 없어요</td></tr>';
 $('days').innerHTML=rows.slice().reverse().map(r=>`<tr><td>${r.key.slice(5).replace('-','/')}</td><td>${fmt(r.visitors)}</td><td>${fmt(r.views)}</td><td>${fmt(r.plays)}</td><td>${fmt(r.lounge)}</td></tr>`).join('');
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Single-series bar chart: one hue, baseline-anchored bars with rounded data ends, recessive grid.
function chart(rows){
 const W=Math.max(240,$('chart').clientWidth),H=220,L=34,R=8,T=12,B=26,max=Math.max(4,...rows.map(r=>r.visitors));
 const step=niceStep(max),top=Math.ceil(max/step)*step,band=(W-L-R)/rows.length,bar=Math.max(3,Math.min(28,band-2));
 const y=v=>T+(H-T-B)*(1-v/top),every=Math.max(1,Math.ceil(rows.length/Math.floor((W-L-R)/44)));
 let svg=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="일별 방문자 수 막대 그래프">`;
 for(let v=0;v<=top;v+=step)svg+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="${v?'grid':'base'}"/><text x="${L-6}" y="${y(v)+4}" class="axis" text-anchor="end">${fmt(v)}</text>`;
 rows.forEach((r,i)=>{
  const x=L+band*i+(band-bar)/2,h=H-B-y(r.visitors),rad=Math.min(4,h/2,bar/2);
  if(r.visitors)svg+=`<path class="bar${i===rows.length-1?' today':''}" d="M${x},${H-B}v${-(h-rad)}q0,${-rad} ${rad},${-rad}h${bar-2*rad}q${rad},0 ${rad},${rad}v${h-rad}z"/>`;
  // Thin the date labels to what fits, and never crowd the last (today) label.
  if((i%every===0&&rows.length-1-i>=every)||i===rows.length-1)svg+=`<text x="${L+band*i+band/2}" y="${H-8}" class="axis" text-anchor="middle">${Number(r.key.slice(5,7))}/${Number(r.key.slice(8))}</text>`;
  svg+=`<rect class="hit" data-i="${i}" x="${L+band*i}" y="${T}" width="${band}" height="${H-T-B}"/>`;
 });
 $('chart').innerHTML=svg+'</svg>';
 const tip=$('tip');
 for(const hit of $('chart').querySelectorAll('.hit')){
  const show=()=>{const r=rows[hit.dataset.i];tip.innerHTML=`<b>${r.key.slice(5).replace('-','월 ')}일</b><span>방문자 ${fmt(r.visitors)}</span><span>페이지뷰 ${fmt(r.views)} · 재생 ${fmt(r.plays)} · 쉼터 ${fmt(r.lounge)}</span>`;tip.hidden=false;
   const box=hit.getBoundingClientRect(),host=$('chart').getBoundingClientRect();tip.style.left=Math.min(host.width-tip.offsetWidth,Math.max(0,box.left-host.left+box.width/2-tip.offsetWidth/2))+'px';hit.classList.add('on');};
  const hide=()=>{tip.hidden=true;hit.classList.remove('on');};
  hit.addEventListener('pointerenter',show);hit.addEventListener('pointerleave',hide);hit.addEventListener('click',show);
 }
}
function niceStep(max){const raw=max/4,mag=10**Math.floor(Math.log10(raw)),n=raw/mag;return Math.max(1,(n<=1?1:n<=2?2:n<=5?5:10)*mag);}
addEventListener('resize',()=>{if(!$('board').hidden)render();});

function renderLive(){
 const now=Date.now()+offset,on=Object.values(live).filter(v=>now-v.at<LIVE_WINDOW);
 const by=page=>on.filter(v=>v.page===page).length;
 $('liveCount').textContent=fmt(on.length);
 $('liveSplit').textContent=`홈 ${by('home')} · 걷는 중 ${by('walk')} · 쉼터 ${by('lounge')}`;
}
setInterval(()=>{if(!$('board').hidden)renderLive();},15000);

function showGate(text,error,uid){
 $('board').hidden=true;$('gate').hidden=false;$('gateText').textContent=text;
 $('gateError').hidden=!error;$('gateError').textContent=error||'';
 $('uidBox').hidden=!uid;$('uid').textContent=uid||'';$('signIn').hidden=!!uid;
}
function showBoard(){$('gate').hidden=true;$('board').hidden=false;render();renderLive();}

if(preview){
 // Sample shape only, for checking the layout without signing in.
 const ids=CLIPS.map(c=>c.id);let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let i=0;i<30;i++){const k=dayKey(Date.now()-i*864e5),node={};const n=Math.round(6+rnd()*30+(i<7?10:0));
  for(let u=0;u<n;u++){const p={};if(rnd()<.7)p[ids[Math.floor(rnd()*ids.length)]]=1+Math.floor(rnd()*2);node['u'+i+'_'+u]={v:1+Math.floor(rnd()*3),...(rnd()<.3?{l:1}:{}),...(Object.keys(p).length?{p}:{})};}
  days[k]=node;}
 live={a:{at:Date.now(),page:'walk'},b:{at:Date.now(),page:'walk'},c:{at:Date.now(),page:'lounge'},d:{at:Date.now(),page:'home'}};
 $('previewBanner').hidden=false;showBoard();
}else{
 const app=initializeApp(LOUNGE_FIREBASE,'admin'),auth=getAuth(app),db=getDatabase(app);
 onValue(ref(db,'.info/serverTimeOffset'),s=>{offset=s.val()||0;});
 watchDays=()=>{
  stop.filter(Boolean).forEach(f=>f());stop=[];
  stop.push(onValue(query(ref(db,'stats/v1/days'),orderByKey(),startAt(range()[0])),s=>{days=s.val()||{};showBoard();},denied));
  stop.push(onValue(ref(db,'stats/v1/live'),s=>{
   live=s.val()||{};renderLive();
   // Tabs that closed without saying goodbye: clear them so the node stays small.
   const now=Date.now()+offset;for(const[uid,v]of Object.entries(live))if(now-v.at>STALE)remove(ref(db,'stats/v1/live/'+uid)).catch(()=>{});
  },()=>{}));
 };
 function denied(){stop.forEach(f=>f());stop=[];showGate('이 계정은 아직 관리자로 등록되지 않았어요.','',auth.currentUser?.uid);}
 onAuthStateChanged(auth,user=>{
  $('signOut').hidden=!user;
  if(!user){stop.forEach(f=>f());stop=[];showGate('관리자로 등록된 Google 계정으로 로그인해 주세요.');return;}
  watchDays();
 });
 $('signIn').addEventListener('click',async()=>{
  const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  try{await signInWithPopup(auth,provider);}
  catch(e){
   if(e.code==='auth/popup-blocked')return signInWithRedirect(auth,provider);
   if(e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request')return;
   const reason={'auth/operation-not-allowed':'Firebase 콘솔에서 Google 로그인이 아직 꺼져 있어요.','auth/unauthorized-domain':'이 주소가 Firebase 승인된 도메인에 없어요.'}[e.code]||'로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
   showGate('관리자로 등록된 Google 계정으로 로그인해 주세요.',reason);
  }
 });
 $('signOut').addEventListener('click',()=>signOut(auth));
 $('copyUid').addEventListener('click',()=>navigator.clipboard?.writeText($('uid').textContent).then(()=>{$('copyUid').textContent='복사됨';}));
}

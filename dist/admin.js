// Admin visitor dashboard. Reads stats/v1 (written by stats.js); the database rules let only accounts
// under stats/admins read it, so this page holds no secret. ?preview=1 draws sample data offline.
// The 펀제주 tab asks funjeju.com for its own counts with this account's ID token; funjeju checks the
// token by reading stats/admins here, so the same admin list guards both.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getDatabase,ref,query,orderByKey,startAt,onValue,remove,set} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js';
import {LOUNGE_FIREBASE} from './lounge-config.js';
import {CLIPS,SCENIC} from './clips.js';
import {youtubeId,YOUTUBE_PATH} from './scenic-youtube.js';

const $=id=>document.getElementById(id),LIVE_WINDOW=150000,STALE=1800000;
const dayKey=(at=Date.now())=>new Date(at+9*3600e3).toISOString().slice(0,10);
const fmt=n=>n.toLocaleString('ko-KR');
const title=id=>CLIPS.find(c=>c.id===id)?.title||id;
let span=14,days={},live={},offset=0,stop=[],watchDays=()=>{};
const params=new URLSearchParams(location.search),preview=params.has('preview');
// A local funjeju dev server can stand in while testing on this machine only.
const FUNJEJU=(location.hostname==='127.0.0.1'||location.hostname==='localhost')&&params.get('funjeju')||'https://funjeju.com';
const SITES={funjeju:{label:'펀제주',cls:'fj'},jejumung:{label:'제주멍',cls:'jm'}};
// Dwell minutes (u.m) are recorded from this day on; earlier days show a dash, not zero.
const DWELL_FROM='2026-11-04';
let tab='all';try{tab=localStorage.getItem('jejumong-admin-tab')||'all';}catch{}
// Average time in front per visitor: seconds -> "40초", "3.4분", "1시간 5분"; null -> "—".
function dur(sec){
 if(sec==null||!isFinite(sec))return '—';
 if(sec<60)return `${Math.round(sec)}초`;
 const m=sec/60;if(m<10)return `${m.toFixed(1)}분`;if(m<60)return `${Math.round(m)}분`;
 return `${Math.floor(m/60)}시간 ${Math.round(m%60)}분`;
}
const avg=(sec,people)=>sec==null?null:people?sec/people:null;

// Scenic YouTube links: one row per spot; `save(spot, id|null)` writes or clears it.
let ytLinks={},ytSave=null;
function renderYoutube(){
 $('ytList').innerHTML=SCENIC.map(s=>{const id=ytLinks[s.id]||'';return`<li data-spot="${s.id}"><img src="${s.poster}" alt=""><div><b>${s.title}</b><small>${s.place}</small></div>
  <input type="url" inputmode="url" placeholder="https://youtu.be/…" value="${id?'https://youtu.be/'+id:''}" aria-label="${s.title} 유튜브 주소">
  <button type="button">저장</button><span class="yt-state">${id?`<a href="https://youtu.be/${id}" target="_blank" rel="noopener">연결됨</a>`:'원래 영상'}</span></li>`;}).join('');
}
$('ytList').addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;const li=b.closest('li'),input=li.querySelector('input'),state=li.querySelector('.yt-state');
 const text=input.value.trim(),id=text?youtubeId(text):null;
 if(text&&!id){state.textContent='유튜브 주소가 아니에요';return;}
 if(!ytSave){state.textContent='예시 화면이라 저장하지 않아요';return;}
 b.disabled=true;state.textContent='저장 중…';
 try{await ytSave(li.dataset.spot,id);}catch{state.textContent='저장하지 못했어요';}finally{b.disabled=false;}
});
renderYoutube();
try{$('optOut').checked=localStorage.getItem('jejumong-stats')==='off';}catch{}
$('optOut').addEventListener('change',e=>{try{e.target.checked?localStorage.setItem('jejumong-stats','off'):localStorage.removeItem('jejumong-stats');}catch{}});
for(const b of document.querySelectorAll('[data-days]'))b.addEventListener('click',()=>{
 span=Number(b.dataset.days);document.querySelectorAll('[data-days]').forEach(o=>o.setAttribute('aria-pressed',String(o===b)));
 preview?render():watchDays();loadFunjeju();
});
const tabs=[...document.querySelectorAll('[data-site]')];
function selectTab(name,focus){
 if(!tabs.some(t=>t.dataset.site===name))name='all';tab=name;try{localStorage.setItem('jejumong-admin-tab',name);}catch{}
 for(const t of tabs){const on=t.dataset.site===name;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;$('panel-'+t.dataset.site).hidden=!on;if(on&&focus)t.focus();}
 if(!$('board').hidden)render();
}
for(const t of tabs){
 t.addEventListener('click',()=>selectTab(t.dataset.site));
 t.addEventListener('keydown',e=>{const d={ArrowRight:1,ArrowLeft:-1}[e.key];if(!d)return;e.preventDefault();selectTab(tabs[(tabs.indexOf(t)+d+tabs.length)%tabs.length].dataset.site,true);});
}
selectTab(tab);

// funjeju.com counts: {days:[{date,views,visitors,dwellSec,sections:{key:{views,visitors,dwellSec}}}],
// sections:{key:label}, recentVisitors}. Fetched on demand (it costs funjeju reads), kept per range length.
let fj={byDays:{},state:'idle',error:''},fjToken=null;
async function loadFunjeju(force){
 const want=span;if(!force&&fj.byDays[want])return render();
 if(preview){fj.byDays[want]=sampleFunjeju(want);fj.state='ok';return render();}
 if(!fjToken)return;
 fj.state='loading';render();
 try{
  const res=await fetch(`${FUNJEJU}/api/partner/jejumung-stats?days=${want}`,{headers:{Authorization:'Bearer '+await fjToken()}});
  if(!res.ok)throw new Error(res.status===401?'펀제주 서버가 이 계정을 관리자로 확인하지 못했어요.':`펀제주 서버 오류 (${res.status})`);
  fj.byDays[want]=await res.json();fj.state='ok';fj.error='';
 }catch(e){fj.state='error';fj.error=e instanceof TypeError?'펀제주 서버에 연결하지 못했어요.':e.message;}
 render();
}
$('fjReload').addEventListener('click',()=>loadFunjeju(true));
const fjData=()=>fj.byDays[span];

// One day node is {uid:{v,l,p:{clip:n}}}; fold it into totals and the set of visitors.
function summarize(node={},key){
 const s={visitors:0,views:0,plays:0,players:0,lounge:0,dwellSec:key<DWELL_FROM?null:0,courses:{},uids:new Set()};
 for(const[uid,u]of Object.entries(node)){
  s.uids.add(uid);if(u.v)s.visitors++;s.views+=u.v||0;s.lounge+=u.l||0;if(u.m)s.dwellSec=(s.dwellSec||0)+u.m*60;
  const p=Object.entries(u.p||{});if(p.length)s.players++;
  for(const[clip,n]of p){const c=s.courses[clip]||={plays:0,people:0};c.plays+=n;c.people++;s.plays+=n;}
 }
 return s;
}
const range=()=>Array.from({length:span},(_,i)=>dayKey(Date.now()-(span-1-i)*864e5));

function render(){
 renderFjStatus();
 if(tab==='funjeju')renderFunjeju();else if(tab==='jejumung')renderJejumung();else renderAll();
}
function renderFjStatus(){
 const text=fj.state==='loading'&&!fjData()?'펀제주 집계를 불러오는 중이에요…':fj.state==='error'?fj.error+' 잠시 뒤 ‘다시 집계’를 눌러 주세요.':'';
 for(const id of['fjStatus','fjStatusAll']){$(id).hidden=!text;$(id).textContent=text;}
 const d=fjData();$('fjUpdated').textContent=d?`펀제주 기록 ${new Date(d.generatedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})} 기준`:'';
 $('fjReload').disabled=fj.state==='loading';
}
const sum=(rows,f)=>rows.reduce((a,r)=>a+(r[f]||0),0);
const fjRows=()=>(fjData()?.days||[]).map(d=>({key:d.date,visitors:d.visitors,views:d.views,dwellSec:d.dwellSec??null,sections:d.sections}));
const md=k=>k.slice(5).replace('-','/');

function renderAll(){
 const fjBy=Object.fromEntries(fjRows().map(r=>[r.key,r]));
 const rows=range().map(k=>{const j=summarize(days[k],k),f=fjBy[k]||{};
  return{key:k,jm:j.visitors,fj:f.visitors||0,jmViews:j.views,fjViews:f.views||0,jmDwell:j.dwellSec,fjDwell:f.dwellSec??null};});
 const t=rows.at(-1),jmLive=liveNow().length,fjLive=fjData()?.recentVisitors;
 $('allLive').textContent=fmt(jmLive+(fjLive||0));
 $('allLiveSplit').textContent=`제주멍 ${fmt(jmLive)} · 펀제주 ${fjLive==null?'—':fmt(fjLive)}`;
 const pair=(id,a,b)=>{$(id).textContent=fmt(a+b);$(id+'Split').textContent=`펀제주 ${fmt(b)} · 제주멍 ${fmt(a)}`;};
 pair('allTodayVisitors',t.jm,t.fj);pair('allTodayViews',t.jmViews,t.fjViews);
 pair('allRangeVisitors',sum(rows,'jm'),sum(rows,'fj'));
 // Both sites' time over both sites' visitors, counting only the sites that recorded time that day.
 const both=r=>{const parts=[[r.fjDwell,r.fj],[r.jmDwell,r.jm]].filter(([d])=>d!=null);return parts.length?avg(parts.reduce((a,[d])=>a+d,0),parts.reduce((a,[,n])=>a+n,0)):null;};
 $('allTodayDwell').textContent=dur(both(t));
 $('allTodayDwellSplit').textContent=`펀제주 ${dur(avg(t.fjDwell,t.fj))} · 제주멍 ${dur(avg(t.jmDwell,t.jm))}`;
 $('rangeSummary').textContent=`${span}일 동안 방문자(일별 합) ${fmt(sum(rows,'jm')+sum(rows,'fj'))} · 페이지뷰 ${fmt(sum(rows,'jmViews')+sum(rows,'fjViews'))}`;
 chart($('chartAll'),rows,[{key:'fj',...SITES.funjeju},{key:'jm',...SITES.jejumung}],
  r=>`<span><i class="dot fj"></i>펀제주 방문자 ${fmt(r.fj)} · 평균 ${dur(avg(r.fjDwell,r.fj))}</span><span><i class="dot jm"></i>제주멍 방문자 ${fmt(r.jm)} · 평균 ${dur(avg(r.jmDwell,r.jm))}</span>`);
 $('allDays').innerHTML=rows.slice().reverse().map(r=>`<tr><td>${md(r.key)}</td><td>${fmt(r.fj)}</td><td>${fmt(r.jm)}</td><td>${fmt(r.fj+r.jm)}</td><td>${fmt(r.fjViews+r.jmViews)}</td><td>${dur(both(r))}</td></tr>`).join('');
}

function renderFunjeju(){
 const d=fjData(),rows=fjRows(),labels=d?.sections||{};
 const t=rows.at(-1)||{},y=rows.at(-2)||{};
 $('fjLive').textContent=d?.recentVisitors==null?'—':fmt(d.recentVisitors);
 $('fjTodayVisitors').textContent=fmt(t.visitors||0);$('fjYVisitors').textContent=`어제 ${fmt(y.visitors||0)}`;
 $('fjTodayViews').textContent=fmt(t.views||0);$('fjYViews').textContent=`어제 ${fmt(y.views||0)}`;
 $('fjTodayDwell').textContent=dur(avg(t.dwellSec,t.visitors));$('fjYDwell').textContent=`어제 ${dur(avg(y.dwellSec,y.visitors))}`;
 $('fjRangeVisitors').textContent=fmt(sum(rows,'visitors'));$('fjRangeViews').textContent=fmt(sum(rows,'views'));
 const sec={};for(const r of rows)for(const[k,v]of Object.entries(r.sections||{})){const s=sec[k]||={views:0,visitors:0,dwellSec:0};s.views+=v.views;s.visitors+=v.visitors;s.dwellSec+=v.dwellSec||0;}
 const order=Object.entries(sec).sort((a,b)=>b[1].views-a[1].views),name=k=>labels[k]||k;
 // Section averages only over the days that recorded time, so older days do not dilute them.
 const timed={};for(const r of rows)if(r.dwellSec!=null)for(const[k,v]of Object.entries(r.sections||{}))timed[k]=(timed[k]||0)+v.visitors;
 $('fjTopSection').textContent=order.length?`가장 많이 본 곳 · ${name(order[0][0])}`:'';
 $('rangeSummary').textContent=`${span}일 동안 펀제주 방문자(일별 합) ${fmt(sum(rows,'visitors'))} · 페이지뷰 ${fmt(sum(rows,'views'))}`;
 chart($('chartFj'),rows,[{key:'visitors',...SITES.funjeju}],r=>`<span>방문자 ${fmt(r.visitors)} · 평균 ${dur(avg(r.dwellSec,r.visitors))}</span><span>페이지뷰 ${fmt(r.views)}</span>`);
 const empty=n=>`<tr><td colspan="${n}" class="empty">${fj.state==='ok'?'아직 기록이 없어요':'불러오는 중이에요'}</td></tr>`;
 $('fjSections').innerHTML=order.length?order.map(([k,v])=>`<tr><td>${esc(name(k))}</td><td>${fmt(v.views)}</td><td>${fmt(v.visitors)}</td><td>${dur(timed[k]?v.dwellSec/timed[k]:null)}</td></tr>`).join(''):empty(4);
 $('fjDays').innerHTML=rows.length?rows.slice().reverse().map(r=>`<tr><td>${md(r.key)}</td><td>${fmt(r.visitors)}</td><td>${fmt(r.views)}</td><td>${dur(avg(r.dwellSec,r.visitors))}</td></tr>`).join(''):empty(4);
}

function renderJejumung(){
 renderLive();
 const keys=range(),rows=keys.map(k=>({key:k,...summarize(days[k],k)})),today=rows.at(-1),yesterday=rows.at(-2);
 const tile=(id,yid,field)=>{$(id).textContent=fmt(today[field]);$(yid).textContent=`어제 ${fmt(yesterday[field])}`;};
 tile('todayVisitors','yVisitors','visitors');tile('todayViews','yViews','views');tile('todayPlays','yPlays','plays');tile('todayLounge','yLounge','lounge');
 $('todayDwell').textContent=dur(avg(today.dwellSec,today.visitors));$('yDwell').textContent=`어제 ${dur(avg(yesterday.dwellSec,yesterday.visitors))}`;
 const all=new Set(rows.flatMap(r=>[...r.uids]));
 $('rangeSummary').textContent=`${span}일 동안 다녀간 브라우저 ${fmt(all.size)} · 페이지뷰 ${fmt(rows.reduce((a,r)=>a+r.views,0))}`;
 chart($('chart'),rows,[{key:'visitors',...SITES.jejumung}],r=>`<span>방문자 ${fmt(r.visitors)} · 평균 ${dur(avg(r.dwellSec,r.visitors))}</span><span>페이지뷰 ${fmt(r.views)} · 재생 ${fmt(r.plays)} · 쉼터 ${fmt(r.lounge)}</span>`);
 const courses={};for(const r of rows)for(const[id,c]of Object.entries(r.courses)){const t=courses[id]||={plays:0,people:new Set()};t.plays+=c.plays;}
 // People per course over the range: distinct visitors who played it on any day.
 for(const k of keys)for(const[uid,u]of Object.entries(days[k]||{}))for(const id of Object.keys(u.p||{}))courses[id].people.add(uid);
 const order=Object.entries(courses).sort((a,b)=>b[1].plays-a[1].plays);
 $('courses').innerHTML=order.length?order.map(([id,c])=>`<tr><td>${esc(title(id))}</td><td>${fmt(c.plays)}</td><td>${fmt(c.people.size)}</td></tr>`).join(''):'<tr><td colspan="3" class="empty">아직 재생 기록이 없어요</td></tr>';
 $('days').innerHTML=rows.slice().reverse().map(r=>`<tr><td>${md(r.key)}</td><td>${fmt(r.visitors)}</td><td>${fmt(r.views)}</td><td>${fmt(r.plays)}</td><td>${fmt(r.lounge)}</td><td>${dur(avg(r.dwellSec,r.visitors))}</td></tr>`).join('');
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Bar chart, one bar per day; several series stack from the baseline in the given order with a 2px
// gap between segments. Rounded data end on the top segment only; recessive grid; hover tooltip.
function chart(host,rows,series,tipLines){
 const total=r=>series.reduce((a,s)=>a+(r[s.key]||0),0);
 const W=Math.max(240,host.clientWidth),H=220,L=34,R=8,T=12,B=26,max=Math.max(4,...rows.map(total));
 const step=niceStep(max),top=Math.ceil(max/step)*step,band=(W-L-R)/Math.max(1,rows.length),bar=Math.max(3,Math.min(28,band-2));
 const y=v=>T+(H-T-B)*(1-v/top),every=Math.max(1,Math.ceil(rows.length/Math.floor((W-L-R)/44)));
 let svg=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${host.closest('figure').querySelector('figcaption').firstChild.textContent} 막대 그래프">`;
 for(let v=0;v<=top;v+=step)svg+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="${v?'grid':'base'}"/><text x="${L-6}" y="${y(v)+4}" class="axis" text-anchor="end">${fmt(v)}</text>`;
 rows.forEach((r,i)=>{
  const x=L+band*i+(band-bar)/2,parts=series.filter(s=>r[s.key]>0);let base=H-B,acc=0;
  parts.forEach((s,n)=>{
   acc+=r[s.key];const yt=y(acc),yb=base-(n?2:0),h=yb-yt;base=yt;if(h<=0)return;
   const rad=n===parts.length-1?Math.min(4,h/2,bar/2):0;
   svg+=`<path class="bar ${s.cls}${i===rows.length-1?' today':''}" d="M${x},${yb}v${-(h-rad)}q0,${-rad} ${rad},${-rad}h${bar-2*rad}q${rad},0 ${rad},${rad}v${h-rad}z"/>`;
  });
  // Thin the date labels to what fits, and never crowd the last (today) label.
  if((i%every===0&&rows.length-1-i>=every)||i===rows.length-1)svg+=`<text x="${L+band*i+band/2}" y="${H-8}" class="axis" text-anchor="middle">${Number(r.key.slice(5,7))}/${Number(r.key.slice(8))}</text>`;
  svg+=`<rect class="hit" data-i="${i}" x="${L+band*i}" y="${T}" width="${band}" height="${H-T-B}"/>`;
 });
 host.innerHTML=svg+'</svg>';
 const tip=host.parentElement.querySelector('.tip');tip.hidden=true;
 for(const hit of host.querySelectorAll('.hit')){
  const show=()=>{const r=rows[hit.dataset.i];tip.innerHTML=`<b>${r.key.slice(5).replace('-','월 ')}일</b>${tipLines(r)}`;tip.hidden=false;
   const box=hit.getBoundingClientRect(),area=host.getBoundingClientRect();tip.style.left=Math.min(area.width-tip.offsetWidth,Math.max(0,box.left-area.left+box.width/2-tip.offsetWidth/2))+'px';hit.classList.add('on');};
  const hide=()=>{tip.hidden=true;hit.classList.remove('on');};
  hit.addEventListener('pointerenter',show);hit.addEventListener('pointerleave',hide);hit.addEventListener('click',show);
 }
}
function niceStep(max){const raw=max/4,mag=10**Math.floor(Math.log10(raw)),n=raw/mag;return Math.max(1,(n<=1?1:n<=2?2:n<=5?5:10)*mag);}
addEventListener('resize',()=>{if(!$('board').hidden)render();});

// Sample funjeju shape for ?preview=1 (UTC dates, like funjeju's own records; time from the last 2 days).
function sampleFunjeju(n){
 let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647,keys=['home','cctv','watch','promo','etc'],weight=[1,.6,.45,.08,.05];
 const out=[];for(let i=n-1;i>=0;i--){const date=new Date(Date.now()-i*864e5).toISOString().slice(0,10),sections={};let views=0,visitors=0,dwell=0;
  keys.forEach((k,j)=>{const v=Math.round((120+rnd()*160)*weight[j]),p=Math.round(v*(.35+rnd()*.2)),d=Math.round(p*(40+rnd()*200));if(!v)return;sections[k]={views:v,visitors:p,dwellSec:i<2?d:0};views+=v;visitors=Math.max(visitors,p);dwell+=d;});
  out.push({date,views,visitors:Math.round(visitors*1.4),dwellSec:i<2?dwell:null,sections});}
 return{generatedAt:Date.now(),sections:{home:'홈',cctv:'실시간 CCTV',watch:'CCTV 영상 창',promo:'업소 홍보',etc:'기타'},recentVisitors:7,days:out};
}

const liveNow=()=>{const now=Date.now()+offset;return Object.values(live).filter(v=>now-v.at<LIVE_WINDOW);};
function renderLive(){
 const on=liveNow();
 const by=page=>on.filter(v=>v.page===page).length;
 $('liveCount').textContent=fmt(on.length);
 $('liveSplit').textContent=`홈 ${by('home')} · 걷는 중 ${by('walk')} · 쉼터 ${by('lounge')}`;
}
setInterval(()=>{if(!$('board').hidden&&tab!=='funjeju')render();},15000);

function showGate(text,error,uid){
 $('board').hidden=true;$('gate').hidden=false;$('gateText').textContent=text;
 $('gateError').hidden=!error;$('gateError').textContent=error||'';
 $('uidBox').hidden=!uid;$('uid').textContent=uid||'';$('signIn').hidden=!!uid;
}
function showBoard(){const first=$('board').hidden;$('gate').hidden=true;$('board').hidden=false;render();if(first)loadFunjeju();}

if(preview){
 // Sample shape only, for checking the layout without signing in.
 const ids=CLIPS.map(c=>c.id);let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let i=0;i<30;i++){const k=dayKey(Date.now()-i*864e5),node={};const n=Math.round(6+rnd()*30+(i<7?10:0));
  for(let u=0;u<n;u++){const p={};if(rnd()<.7)p[ids[Math.floor(rnd()*ids.length)]]=1+Math.floor(rnd()*2);node['u'+i+'_'+u]={v:1+Math.floor(rnd()*3),...(i<2?{m:Math.floor(rnd()*14)}:{}),...(rnd()<.3?{l:1}:{}),...(Object.keys(p).length?{p}:{})};}
  days[k]=node;}
 live={a:{at:Date.now(),page:'walk'},b:{at:Date.now(),page:'walk'},c:{at:Date.now(),page:'lounge'},d:{at:Date.now(),page:'home'}};
 $('previewBanner').hidden=false;showBoard();
}else{
 const app=initializeApp(LOUNGE_FIREBASE,'admin'),auth=getAuth(app),db=getDatabase(app);
 fjToken=()=>auth.currentUser.getIdToken();
 onValue(ref(db,'.info/serverTimeOffset'),s=>{offset=s.val()||0;});
 watchDays=()=>{
  stop.filter(Boolean).forEach(f=>f());stop=[];
  stop.push(onValue(query(ref(db,'stats/v1/days'),orderByKey(),startAt(range()[0])),s=>{days=s.val()||{};showBoard();},denied));
  stop.push(onValue(ref(db,'stats/v1/live'),s=>{
   live=s.val()||{};if(!$('board').hidden)render();
   // Tabs that closed without saying goodbye: clear them so the node stays small.
   const now=Date.now()+offset;for(const[uid,v]of Object.entries(live))if(now-v.at>STALE)remove(ref(db,'stats/v1/live/'+uid)).catch(()=>{});
  },()=>{}));
  stop.push(onValue(ref(db,YOUTUBE_PATH),s=>{ytLinks=s.val()||{};renderYoutube();},()=>{}));
 };
 ytSave=(spot,id)=>id?set(ref(db,`${YOUTUBE_PATH}/${spot}`),id):remove(ref(db,`${YOUTUBE_PATH}/${spot}`));
 function denied(){stop.forEach(f=>f());stop=[];showGate('이 계정은 아직 관리자로 등록되지 않았어요.','',auth.currentUser?.uid);}
 onAuthStateChanged(auth,user=>{
  $('signOut').hidden=!user;fj={byDays:{},state:'idle',error:''};
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

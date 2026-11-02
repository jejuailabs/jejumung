// Background music: a minimised player docked at the bottom of the screen with a track list.
// Tracks and credits come from /lab/bgm/tracks.json (prepared by test-lab/05-tools/prepare_bgm.py).
// The choice, position and level survive course changes through localStorage.
const KEY='jejumong-bgm';
const ICON={
 play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
 pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
 prev:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM19 5.5v13L9.5 12z" fill="currentColor"/></svg>',
 next:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM5 5.5v13l9.5-6.5z" fill="currentColor"/></svg>',
 list:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h11M4 12h11M4 17h7M18 14v-9l3 1.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="16.5" cy="16.5" r="2.5" fill="currentColor"/></svg>',
 close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
};
export const NOTE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5V6l10-2v11.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="2.5" fill="currentColor"/><circle cx="16.5" cy="15.5" r="2.5" fill="currentColor"/></svg>';
const clock=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return{};}}

export function createBgm(audio){
 const saved=load();
 let tracks=[],index=Number.isInteger(saved.i)?saved.i:0,on=Boolean(saved.on),listOpen=false,manifest=null;
 const el=new Audio();el.preload='none';el.crossOrigin='anonymous';
 const dock=document.createElement('div');dock.className='bgm-dock';dock.hidden=true;dock.setAttribute('role','region');dock.setAttribute('aria-label','배경 음악');
 dock.innerHTML=`<div class="bgm-list" hidden><div class="bgm-list-head"><strong>음악 고르기</strong><label>음악 크기<input type="range" min="0" max="1" step="0.05" aria-label="음악 크기"></label></div><ol></ol><p class="bgm-credit"></p></div>
 <div class="bgm-bar"><span class="bgm-eq" aria-hidden="true"><i></i><i></i><i></i></span><button type="button" class="bgm-title" aria-label="음악 목록 열기"><b></b><small></small></button>
 <button type="button" class="bgm-btn" data-act="prev" aria-label="이전 곡">${ICON.prev}</button><button type="button" class="bgm-btn bgm-toggle" data-act="toggle" aria-label="재생">${ICON.play}</button><button type="button" class="bgm-btn" data-act="next" aria-label="다음 곡">${ICON.next}</button><button type="button" class="bgm-btn" data-act="list" aria-label="음악 목록" aria-expanded="false">${ICON.list}</button><button type="button" class="bgm-btn" data-act="close" aria-label="음악 끄고 닫기">${ICON.close}</button></div>`;
 document.body.append(dock);
 const $=s=>dock.querySelector(s),list=$('.bgm-list'),level=$('.bgm-list input');
 level.value=String(saved.level&&saved.level!==.55?saved.level:audio.musicLevel);audio.setMusicLevel(Number(level.value));
 const listeners=new Set();
 function save(extra={}){try{localStorage.setItem(KEY,JSON.stringify({on,playing:!el.paused,i:index,t:el.currentTime||0,level:Number(level.value),...extra}));}catch{}}
 function paint(){
  const track=tracks[index],playing=!el.paused;
  dock.classList.toggle('playing',playing);document.body.classList.toggle('bgm-on',!dock.hidden);
  $('.bgm-title b').textContent=track?.title||'음악 불러오는 중';$('.bgm-title small').textContent=track?.artist||'';
  const toggle=$('.bgm-toggle');toggle.innerHTML=playing?ICON.pause:ICON.play;toggle.setAttribute('aria-label',playing?'일시정지':'재생');
  list.hidden=!listOpen;$('[data-act=list]').setAttribute('aria-expanded',String(listOpen));
  dock.querySelectorAll('.bgm-list li button').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));
  listeners.forEach(fn=>fn({on,playing}));
 }
 async function ready(){
  if(manifest)return manifest;
  manifest=fetch('/lab/bgm/tracks.json').then(r=>r.json()).then(data=>{
   tracks=data.tracks||[];if(index>=tracks.length)index=0;
   $('.bgm-list ol').innerHTML=tracks.map((t,i)=>`<li><button type="button" data-i="${i}"><span>${t.title}</span><small>${t.artist} · ${clock(t.duration)}</small></button></li>`).join('');
   $('.bgm-credit').textContent=`음악: ${data.source||''} · 곡명과 작곡가는 목록에 표시`;
   paint();return data;
  }).catch(()=>{manifest=null;throw Error('bgm');});
  return manifest;
 }
 async function play(i=index,at=0){
  await ready();if(!tracks.length)return;
  // Asking for music is asking for sound: a muted app would otherwise show a playing, silent player.
  if(!audio.enabled)audio.setEnabled(true);
  index=(i+tracks.length)%tracks.length;audio.unlock();audio.attachMusic(el);
  const src=new URL(tracks[index].file,location.href).href;
  if(el.src!==src){el.src=src;if(at)el.addEventListener('loadedmetadata',()=>{el.currentTime=Math.min(at,(el.duration||at+1)-1);},{once:true});}
  try{await el.play();}catch{}
  save();paint();
 }
 function show(){on=true;dock.hidden=false;save();paint();}
 function close(){on=false;listOpen=false;el.pause();dock.hidden=true;save();paint();}
 dock.addEventListener('click',e=>{
  const pick=e.target.closest('[data-i]');if(pick){play(Number(pick.dataset.i));return;}
  const act=e.target.closest('[data-act]')?.dataset.act;
  if(act==='toggle'){if(el.paused)play(index,el.src?el.currentTime:saved.t||0);else{el.pause();save();paint();}}
  else if(act==='prev')play(el.currentTime>4?index:index-1);
  else if(act==='next')play(index+1);
  else if(act==='list'){listOpen=!listOpen;paint();}
  else if(act==='close')close();
  else if(e.target.closest('.bgm-title')){listOpen=!listOpen;paint();}
 });
 level.addEventListener('input',()=>{audio.setMusicLevel(Number(level.value));save();});
 el.addEventListener('ended',()=>play(index+1));
 for(const type of['play','pause'])el.addEventListener(type,paint);
 setInterval(()=>{if(!el.paused)save();},5000);
 addEventListener('pagehide',()=>{if(on)save();});
 document.addEventListener('keydown',e=>{if(e.code==='Escape'&&listOpen){listOpen=false;paint();}});
 // Was playing on the previous page (another course, the lounge): show the dock and resume on
 // the first gesture, since browsers block audible autoplay.
 if(on){dock.hidden=false;ready().then(paint).catch(()=>{});const resume=e=>{document.removeEventListener('pointerdown',resume,true);document.removeEventListener('keydown',resume,true);if(e.target.closest?.('.bgm-dock,[data-bgm-button]'))return;if(on&&saved.playing!==false&&el.paused)play(index,saved.t||0);};document.addEventListener('pointerdown',resume,true);document.addEventListener('keydown',resume,true);}
 return{
  // The music button: open the dock and start playing; when already open, play/pause.
  toggle(){if(dock.hidden){show();play();}else if(el.paused)play();else{el.pause();save();paint();}},
  close,onChange(fn){listeners.add(fn);fn({on,playing:!el.paused});return()=>listeners.delete(fn);},
  debug(){return{on,index,title:tracks[index]?.title||null,paused:el.paused,time:el.currentTime,level:Number(level.value),listOpen};}
 };
}

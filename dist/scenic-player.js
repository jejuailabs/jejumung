import {SCENIC,mediaUrl} from './clips.js';
import {attachMedia} from './media-player.js';
import {characterFor} from './characters.js';
import {youtubeId,youtubeLinks,youtubeFrame} from './scenic-youtube.js';

// Scenic spots (clips.js SCENIC): a looping landscape clip over the walk stage or the whole page,
// with the place, a line from the companion and a button back. Videos are short and silent; the
// background music keeps playing if it is on. By default the clip plays in the scenery theater
// (theater.js) with the companion watching; the viewer can switch to the bare video, and that
// choice is remembered.
let hlsScript=null;
function loadHls(){
 // The home page does not ship hls.js; Safari plays HLS natively and never needs it.
 if(window.Hls||document.createElement('video').canPlayType('application/vnd.apple.mpegurl'))return Promise.resolve();
 hlsScript??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/vendor/hls.min.js';s.onload=resolve;s.onerror=()=>{hlsScript=null;reject(Error('hls'));};document.head.append(s);});
 return hlsScript;
}
let css=null;
function loadCss(){
 css??=new Promise(resolve=>{const l=document.createElement('link');l.rel='stylesheet';l.href='/scenic.css?v=scenic-8';l.onload=l.onerror=resolve;document.head.append(l);});
 return css;
}
export const scenicSpot=id=>SCENIC.find(s=>s.id===id);
// What the companion can do in the theater (theater.js ACTIONS).
const ACTS=[['eat','🍿','팝콘'],['drink','🥤','콜라'],['clap','👏','박수'],['wave','👋','인사'],['recline','😌','눕기']];

// root: the element to cover (the walk stage, so it shows in fullscreen) or document.body.
// back: the close button's text; character: the companion who watches (the stored pick if
// none). Resolves when the viewer closes.
export async function openScenic(id,{root=document.body,back='닫기',character=null}={}){
 const spot=scenicSpot(id);if(!spot)return;
 // A YouTube video set for the spot (admin page, else clips.js) plays instead of our HLS; the
 // list is read once per page, and a slow answer falls back to our own copy.
 const [,links]=await Promise.all([loadCss(),Promise.race([youtubeLinks(),new Promise(r=>setTimeout(()=>r({}),1500))])]);
 const yt=youtubeId(links[spot.id])||youtubeId(spot.youtube);
 const el=document.createElement('div');
 el.className='scenic';el.style.setProperty('--poster',`url('${spot.poster}')`);el.setAttribute('role','dialog');el.setAttribute('aria-label',`${spot.title} 풍경`);
 el.innerHTML=`<video muted playsinline loop autoplay preload="auto" crossorigin="anonymous" poster="${spot.poster}" aria-hidden="true"></video>
  <div class="scenic-top"><p><small>${spot.place}</small><b>${spot.title}</b></p><button type="button" class="scenic-mode"></button><button type="button" class="scenic-back">${back}</button></div>
  <p class="scenic-line" hidden>${spot.line}</p>
  <nav class="scenic-acts" aria-label="친구와 함께 하기">${ACTS.map(([id,icon,label])=>`<button type="button" data-act="${id}" aria-pressed="false"><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}</nav><p class="scenic-error" hidden>풍경 영상을 불러오지 못했어요.</p>`;
 root.append(el);
 // Over the whole page the page underneath stops scrolling while the view is up.
 const lock=root===document.body;if(lock)document.documentElement.style.overflow='hidden';
 let video=el.querySelector('video');const button=el.querySelector('.scenic-back');
 if(yt){const frame=youtubeFrame(yt);video.replaceWith(frame);video=frame;}
 requestAnimationFrame(()=>el.classList.add('on'));
 button.focus({preventScroll:true});
 const lineTimer=setTimeout(()=>{el.querySelector('.scenic-line').hidden=false;},1800);
 let player=null;
 const play=()=>{if(!yt)video.play().catch(()=>{});};
 if(!yt)loadHls().then(()=>{player=attachMedia(video,mediaUrl(spot.src),()=>{el.querySelector('.scenic-error').hidden=false;});play();})
  .catch(()=>{el.querySelector('.scenic-error').hidden=false;});
 let theater=null,stored='theater';try{stored=localStorage.getItem('jejumong-scenic-view')||'theater';}catch{}
 if(!character){try{character=localStorage.getItem('jejumong-character');}catch{}}
 const mode=el.querySelector('.scenic-mode');
 async function setView(view){
  el.classList.toggle('theater',view==='theater');mode.textContent=view==='theater'?'화면 가득 보기':'극장에서 보기';
  if(view==='theater'&&!theater){
   const box=document.createElement('div');box.className='scenic-theater';el.insertBefore(box,el.querySelector('.scenic-top'));
   const {createTheater}=await import('./theater.js?v=theater-17');
   theater=createTheater(box,video,{character:characterFor(character).id,poster:spot.poster});
  }else if(view!=='theater'&&theater){theater.dispose();el.querySelector('.scenic-theater').remove();theater=null;el.prepend(video);}
  play();
 }
 // Action buttons: the line in the bubble follows what the companion does.
 const line=el.querySelector('.scenic-line'),acts=[...el.querySelectorAll('[data-act]')];
 const syncActs=()=>{for(const b of acts)b.setAttribute('aria-pressed',String(theater?.action===b.dataset.act));};
 el.querySelector('.scenic-acts').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b||!theater)return;
  const said=theater.act(b.dataset.act);line.textContent=said||spot.line;line.hidden=false;
  line.style.animation='none';void line.offsetWidth;line.style.animation='';syncActs();
 });
 const actsTimer=setInterval(syncActs,500);
 mode.addEventListener('click',()=>{const view=theater?'full':'theater';try{localStorage.setItem('jejumong-scenic-view',view);}catch{}setView(view);});
 setView(stored==='full'?'full':'theater');
 return new Promise(resolve=>{
  let closed=false;
  const close=()=>{
   if(closed)return;closed=true;
   clearTimeout(lineTimer);clearInterval(actsTimer);removeEventListener('keydown',onKey,true);
   theater?.dispose();player?.destroy();
   if(yt)video.remove();else{video.pause();video.removeAttribute('src');video.load();}
   if(lock)document.documentElement.style.overflow='';
   el.classList.remove('on');setTimeout(()=>el.remove(),350);resolve();
  };
  // Keys stay with the viewer (Space must not start the walk underneath); Enter/Space still press the button.
  const onKey=e=>{e.stopPropagation();if(e.key==='Escape')close();};
  addEventListener('keydown',onKey,true);
  button.addEventListener('click',close,{once:true});
 });
}

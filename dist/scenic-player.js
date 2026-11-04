import {SCENIC,mediaUrl} from './clips.js';
import {attachMedia} from './media-player.js';

// Scenic spots (clips.js SCENIC): a looping landscape clip over the walk stage or the whole page,
// with the place, a line from the companion and a button back. Videos are short and silent; the
// background music keeps playing if it is on.
let hlsScript=null;
function loadHls(){
 // The home page does not ship hls.js; Safari plays HLS natively and never needs it.
 if(window.Hls||document.createElement('video').canPlayType('application/vnd.apple.mpegurl'))return Promise.resolve();
 hlsScript??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/vendor/hls.min.js';s.onload=resolve;s.onerror=()=>{hlsScript=null;reject(Error('hls'));};document.head.append(s);});
 return hlsScript;
}
let css=null;
function loadCss(){
 css??=new Promise(resolve=>{const l=document.createElement('link');l.rel='stylesheet';l.href='/scenic.css?v=scenic-3';l.onload=l.onerror=resolve;document.head.append(l);});
 return css;
}
export const scenicSpot=id=>SCENIC.find(s=>s.id===id);

// root: the element to cover (the walk stage, so it shows in fullscreen) or document.body.
// back: the close button's text. Resolves when the viewer closes.
export async function openScenic(id,{root=document.body,back='닫기'}={}){
 const spot=scenicSpot(id);if(!spot)return;
 await loadCss();
 const el=document.createElement('div');
 el.className='scenic';el.style.setProperty('--poster',`url('${spot.poster}')`);el.setAttribute('role','dialog');el.setAttribute('aria-label',`${spot.title} 풍경`);
 el.innerHTML=`<video muted playsinline loop autoplay preload="auto" poster="${spot.poster}" aria-hidden="true"></video>
  <div class="scenic-top"><p><small>${spot.place}</small><b>${spot.title}</b></p><button type="button" class="scenic-back">${back}</button></div>
  <p class="scenic-line" hidden>${spot.line}</p><p class="scenic-error" hidden>풍경 영상을 불러오지 못했어요.</p>`;
 root.append(el);
 // Over the whole page the page underneath stops scrolling while the view is up.
 const lock=root===document.body;if(lock)document.documentElement.style.overflow='hidden';
 const video=el.querySelector('video'),button=el.querySelector('.scenic-back');
 requestAnimationFrame(()=>el.classList.add('on'));
 button.focus({preventScroll:true});
 const lineTimer=setTimeout(()=>{el.querySelector('.scenic-line').hidden=false;},1800);
 let player=null;
 loadHls().then(()=>{player=attachMedia(video,mediaUrl(spot.src),()=>{el.querySelector('.scenic-error').hidden=false;});video.play().catch(()=>{});})
  .catch(()=>{el.querySelector('.scenic-error').hidden=false;});
 return new Promise(resolve=>{
  let closed=false;
  const close=()=>{
   if(closed)return;closed=true;
   clearTimeout(lineTimer);removeEventListener('keydown',onKey,true);
   player?.destroy();video.pause();video.removeAttribute('src');video.load();
   if(lock)document.documentElement.style.overflow='';
   el.classList.remove('on');setTimeout(()=>el.remove(),350);resolve();
  };
  // Keys stay with the viewer (Space must not start the walk underneath); Enter/Space still press the button.
  const onKey=e=>{e.stopPropagation();if(e.key==='Escape')close();};
  addEventListener('keydown',onKey,true);
  button.addEventListener('click',close,{once:true});
 });
}

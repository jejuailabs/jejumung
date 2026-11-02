import {CLIPS} from './clips.js';

// Jeju course map: Leaflet over our own basemap tiles (/lab/map/{z}/{x}/{y}.webp), rendered
// offline from OpenStreetMap coastline, forests and roads plus AWS Terrain Tiles relief by
// test-lab/05-tools/map_*.py. Pins sit on the clips' shooting GPS; each course card hangs off
// its pin by a leader line, offset in screen pixels (clips.js map.dx/dy) so it reads at any zoom.
const TILE_BOUNDS=[[33.064,126.080],[33.651,127.001]];
// The island plus room for the cards that hang below the south coast and above the north.
const ISLAND=[[33.11,126.14],[33.61,126.98]];
const TOWNS=[['제주시',126.5314,33.4998,1],['서귀포시',126.5610,33.2528,1],['한경',126.2107,33.3305],['대정',126.2496,33.2330],['한림',126.2668,33.3934],['안덕',126.3492,33.2769],['애월',126.3752,33.4508],['조천',126.6630,33.5089],['남원',126.6907,33.3077],['구좌',126.8106,33.5166],['표선',126.7940,33.3505],['성산',126.8815,33.4181],['우도',126.9557,33.5067]];
const PEAKS=[['한라산',126.5294,33.3614,1947],['성산일출봉',126.9408,33.4589,182],['산방산',126.3133,33.2416,395],['새별오름',126.3577,33.3663,519],['어승생악',126.4893,33.3966,1169],['용눈이오름',126.8325,33.4599,248],['물영아리',126.6921,33.3684,508],['송악산',126.2898,33.1991,104]];
const minutes=seconds=>seconds<90?`${Math.round(seconds)}초`:`${Math.round(seconds/60)}분`;
let leaflet=null;
function loadLeaflet(){
 // Script and both stylesheets must be in before the map measures its container.
 leaflet??=Promise.all([
  ...['/vendor/leaflet.css','/course-map.css?v=map-2'].map(href=>new Promise(resolve=>{const css=document.createElement('link');css.rel='stylesheet';css.href=href;css.onload=css.onerror=resolve;document.head.append(css);})),
  window.L?Promise.resolve():new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/leaflet.js';script.onload=resolve;script.onerror=()=>reject(Error('leaflet'));document.head.append(script);})
 ]).then(()=>window.L).catch(e=>{leaflet=null;throw e;});
 return leaflet;
}
function pinHtml(c,current,scale){
 const dx=Math.round((c.map.dx??0)*scale),dy=Math.round((c.map.dy??-110)*scale);
 return`<div class="cm-pin${current?' current':''}" data-dx="${dx}" data-dy="${dy}" style="--dx:${dx}px;--dy:${dy}px">
  <svg class="cm-leader" aria-hidden="true"><line x1="0" y1="0" x2="${dx}" y2="${dy}"/></svg>
  <span class="cm-dot" data-clip="${c.id}" aria-hidden="true"></span>
  <button type="button" class="cm-card" data-clip="${c.id}" aria-label="${c.title} 걷기, ${minutes(c.duration)}${current?', 지금 걷는 길':''}">
   <img src="${c.poster}" alt="" decoding="async"><b>${c.title}</b><small>${minutes(c.duration)} · ${c.map.place||''}</small>${current?'<em>지금 여기</em>':''}
  </button></div>`;
}

// `modal`: the map owns the gestures (walk overlay). On the home page it stays out of the way
// of page scrolling until clicked, and touch devices pan with two fingers.
export function createCourseMap(container,{currentId=null,onPick=null,modal=false}={}){
 const courses=CLIPS.filter(c=>c.map);
 container.classList.add('jeju-map');
 container.innerHTML='<div class="jeju-map-canvas" role="group" aria-label="제주 코스 지도"></div><p class="jeju-map-hint" hidden>두 손가락으로 지도를 움직여요</p>';
 const canvas=container.querySelector('.jeju-map-canvas');
 const handle={courses,map:null,refresh(){if(!handle.map)return;handle.map.invalidateSize();if(!fitted)fit();}};
 let fitted=false;
 const fit=()=>{if(!canvas.clientWidth||!handle.map)return;handle.map.fitBounds(ISLAND,{padding:[24,24],animate:false});fitted=true;};
 const pick=id=>{if(onPick)onPick(id);else location.href=`/engine?clip=${id}`;};
 canvas.addEventListener('click',e=>{const card=e.target.closest('[data-clip]');if(card){e.preventDefault();pick(card.dataset.clip);}});
 loadLeaflet().then(L=>{
  const touch=L.Browser.mobile&&L.Browser.touch,compact=canvas.clientWidth<560||canvas.clientHeight<420,hd=window.devicePixelRatio>1.4;
  const map=L.map(canvas,{zoomSnap:.25,zoomDelta:.5,minZoom:8.5,maxZoom:13,maxBounds:TILE_BOUNDS,maxBoundsViscosity:1,
   scrollWheelZoom:modal,dragging:modal||!touch,tapHold:false,attributionControl:true,zoomControl:true,fadeAnimation:true});
  handle.map=map;
  map.attributionControl.setPrefix(false).addAttribution('지도 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> 기여자 · 지형 AWS Terrain Tiles');
  // On high-density screens draw each tile at half size from the next zoom level, so the
  // basemap stays sharp; the deepest level (13) is shown 1:1.
  L.tileLayer('/lab/map/{z}/{x}/{y}.webp',hd?{tileSize:128,zoomOffset:1,minNativeZoom:7,maxNativeZoom:12,bounds:TILE_BOUNDS}:{minNativeZoom:8,maxNativeZoom:13,bounds:TILE_BOUNDS}).addTo(map);
  for(const[name,lon,lat,major]of TOWNS)L.marker([lat,lon],{interactive:false,keyboard:false,icon:L.divIcon({className:`cm-town${major?' major':''}`,html:`<span>${name}</span>`,iconSize:[0,0]})}).addTo(map);
  for(const[name,lon,lat,ele]of PEAKS)L.marker([lat,lon],{interactive:false,keyboard:false,icon:L.divIcon({className:`cm-peak${ele>1900?' major':''}`,html:`<i></i><span>${name}${ele>1900?` <small>${ele}m</small>`:''}</span>`,iconSize:[0,0]})}).addTo(map);
  const scale=compact?.62:1;
  for(const c of courses){
   const current=c.id===currentId;
   L.marker([c.map.lat,c.map.lon],{keyboard:false,zIndexOffset:current?1000:0,icon:L.divIcon({className:'cm-marker',html:pinHtml(c,current,scale),iconSize:[0,0]})}).addTo(map);
  }
  const zoomClass=()=>{const z=map.getZoom();canvas.dataset.zoom=z>=11?'near':z>=9.75?'mid':'far';};
  // A card that would leave the map slides back inside it; the leader line follows.
  const layoutCards=()=>{
   const W=canvas.clientWidth,H=canvas.clientHeight;
   for(const pin of canvas.querySelectorAll('.cm-pin')){
    const card=pin.querySelector('.cm-card'),line=pin.querySelector('line'),p=map.layerPointToContainerPoint(L.DomUtil.getPosition(pin.parentElement));
    const w=card.offsetWidth/2+6,h=card.offsetHeight/2+6;let dx=Number(pin.dataset.dx),dy=Number(pin.dataset.dy);
    dx=Math.round(Math.min(W-w,Math.max(w,p.x+dx))-p.x);dy=Math.round(Math.min(H-h,Math.max(h,p.y+dy))-p.y);
    pin.style.setProperty('--dx',dx+'px');pin.style.setProperty('--dy',dy+'px');line.setAttribute('x2',dx);line.setAttribute('y2',dy);
   }
  };
  map.on('zoomend',zoomClass);map.on('moveend zoomend resize',layoutCards);
  container.classList.toggle('compact',compact);
  if(!modal){
   canvas.addEventListener('click',()=>map.scrollWheelZoom.enable(),{once:true});
   if(touch){const hint=container.querySelector('.jeju-map-hint');let timer;canvas.addEventListener('touchstart',e=>{if(e.touches.length===1){hint.hidden=false;clearTimeout(timer);timer=setTimeout(()=>hint.hidden=true,1400);}else hint.hidden=true;},{passive:true});}
  }
  fit();zoomClass();layoutCards();
 }).catch(()=>{canvas.innerHTML='<p class="jeju-map-error">지도를 불러오지 못했어요. 새로고침해 주세요.</p>';});
 return handle;
}
export function nextCourse(currentId){const others=CLIPS.filter(c=>c.map&&c.id!==currentId);return others[Math.floor(Math.random()*others.length)]||CLIPS[0];}

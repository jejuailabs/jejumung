import {CLIPS,SCENIC} from './clips.js';

// Jeju course map: Leaflet over our own basemap tiles (/lab/map/{z}/{x}/{y}.webp), rendered
// offline from OpenStreetMap coastline, forests and roads plus AWS Terrain Tiles relief by
// test-lab/05-tools/map_*.py. Pins sit on the clips' shooting GPS; each course card hangs off
// its pin by a leader line, offset in screen pixels (clips.js map.dx/dy) so it reads at any zoom.
// Scenic spots (clips.js SCENIC) are small square photo pins that play their view when pressed.
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
  ...['/vendor/leaflet.css','/course-map.css?v=map-8'].map(href=>new Promise(resolve=>{const css=document.createElement('link');css.rel='stylesheet';css.href=href;css.onload=css.onerror=resolve;document.head.append(css);})),
  window.L?Promise.resolve():new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/leaflet.js';script.onload=resolve;script.onerror=()=>reject(Error('leaflet'));document.head.append(script);})
 ]).then(()=>window.L).catch(e=>{leaflet=null;throw e;});
 return leaflet;
}
// On phones the dot is the button (it opens the card); elsewhere the card is.
function pinHtml(c,current,scale,compact){
 const dx=Math.round((c.map.dx??0)*scale),dy=Math.round((c.map.dy??-110)*scale);
 return`<div class="cm-pin${current?' current':''}" data-dx="${dx}" data-dy="${dy}" style="--dx:${dx}px;--dy:${dy}px">
  <svg class="cm-leader" aria-hidden="true"><line x1="0" y1="0" x2="${dx}" y2="${dy}"/></svg>
  <button type="button" class="cm-dot" data-clip="${c.id}" ${compact?`aria-label="${c.title} 보기" style="--thumb:url('${c.poster}')"`:'tabindex="-1" aria-hidden="true"'}></button>
  <button type="button" class="cm-card" data-clip="${c.id}" aria-label="${c.title} 걷기, ${minutes(c.duration)}${current?', 지금 걷는 길':''}">
   <img src="${c.poster}" alt="" decoding="async"><b>${c.title}</b><small>${minutes(c.duration)} · ${c.map.place||''}</small>${current?'<em>지금 여기</em>':''}
  </button></div>`;
}

// `modal`: the map owns the gestures (walk overlay). On the home page it stays out of the way
// of page scrolling until clicked, and touch devices pan with two fingers.
export function createCourseMap(container,{currentId=null,onPick=null,onScenic=null,modal=false}={}){
 const courses=CLIPS.filter(c=>c.map);
 container.classList.add('jeju-map');
 container.innerHTML='<div class="jeju-map-canvas" role="group" aria-label="제주 코스 지도"></div><p class="jeju-map-hint" hidden>두 손가락으로 지도를 움직여요</p><p class="jeju-map-tip">둥근 핀은 걷는 길, 네모 핀은 풍경이에요</p>';
 const canvas=container.querySelector('.jeju-map-canvas');
 // highlight(id): lifts one pin above the others (home cards point at their place on the map).
 const handle={courses,map:null,refresh(){if(!handle.map)return;handle.map.invalidateSize();if(!fitted)fit();},
  highlight(id){for(const[cid,marker]of Object.entries(markers)){marker.getElement()?.querySelector('.cm-pin')?.classList.toggle('hl',cid===id);marker.setZIndexOffset(cid===id?2e4:cid===currentId?1000:0);}}};
 const markers={};
 let fitted=false;
 const fit=()=>{if(!canvas.clientWidth||!handle.map)return;handle.map.fitBounds(ISLAND,{padding:[24,24],animate:false});fitted=true;};
 const pick=id=>{if(onPick)onPick(id);else location.href=`/engine?clip=${id}`;};
 let open=null;
 canvas.addEventListener('click',e=>{
  const spot=e.target.closest('[data-scenic]');
  if(spot){e.preventDefault();if(onScenic)onScenic(spot.dataset.scenic);else import('./scenic-player.js?v=scenic-3').then(m=>m.openScenic(spot.dataset.scenic));return;}
  const dot=open&&e.target.closest('.cm-dot');if(dot){e.preventDefault();open(dot.dataset.clip);return;}
  const card=e.target.closest('[data-clip]');if(card){e.preventDefault();pick(card.dataset.clip);}
 });
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
  for(const s of SCENIC.filter(s=>s.map))L.marker([s.map.lat,s.map.lon],{keyboard:false,zIndexOffset:-500,icon:L.divIcon({className:'cm-marker cm-scenic-marker',
   html:`<button type="button" class="cm-scenic" data-scenic="${s.id}" aria-label="${s.title} 풍경 보기, ${s.place}" style="--thumb:url('${s.poster}')"><span>${s.place}</span></button>`,iconSize:[0,0]})}).addTo(map);
  const scale=compact?.62:1;
  for(const c of courses){
   const current=c.id===currentId;
   markers[c.id]=L.marker([c.map.lat,c.map.lon],{keyboard:false,zIndexOffset:current?1000:0,icon:L.divIcon({className:'cm-marker',html:pinHtml(c,current,scale,compact),iconSize:[0,0]})}).addTo(map);
  }
  // Phone maps show photo pins only. Pins closer than a photo merge into one with a count (the
  // walk's own course on top); a tap opens the cards of its group, tapping it again or the map
  // closes them.
  let groups=new Map(),merge=()=>{};
  if(compact){
   const pinOf=id=>markers[id].getElement().querySelector('.cm-pin');
   merge=()=>{
    if(!markers[courses[0].id].getElement())return; // markers join the map after its first view
    const heads=[];groups=new Map();
    for(const c of[...courses].sort((a,b)=>(b.id===currentId)-(a.id===currentId))){
     const p=map.latLngToContainerPoint(markers[c.id].getLatLng()),head=heads.find(h=>h.p.distanceTo(p)<30);
     if(head)head.ids.push(c.id);else heads.push({p,ids:[c.id]});
    }
    for(const{ids}of heads){
     ids.forEach((id,i)=>{groups.set(id,ids);pinOf(id).classList.toggle('stacked',i>0);});
     const dot=pinOf(ids[0]).querySelector('.cm-dot'),title=courses.find(c=>c.id===ids[0]).title;
     dot.innerHTML=ids.length>1?`<i>${ids.length}</i>`:'';
     dot.setAttribute('aria-label',ids.length>1?`${title} 외 ${ids.length-1}곳 보기`:`${title} 보기`);
    }
   };
   open=(id,solo=false)=>{
    if(id&&pinOf(id).classList.contains('open'))id=null;
    const ids=!id?[]:solo?[id]:groups.get(id);
    // Too many cards for a phone: zoom in until the group splits.
    if(ids.length>3&&map.getZoom()<map.getMaxZoom()){map.flyToBounds(L.latLngBounds(ids.map(i=>markers[i].getLatLng())),{padding:[70,70],maxZoom:map.getMaxZoom(),duration:.6});return;}
    for(const[cid,marker]of Object.entries(markers)){
     const show=ids.includes(cid);
     pinOf(cid).classList.toggle('open',show);marker.setZIndexOffset(show?2e4:cid===currentId?1000:0);
    }
    container.classList.toggle('has-open',!!id);
    layoutCards();
   };
   map.on('click',e=>{if(container.classList.contains('has-open')&&!e.originalEvent.target.closest('.cm-marker'))open(null);});
   map.on('zoomend',()=>merge());
  }
  const zoomClass=()=>{const z=map.getZoom();canvas.dataset.zoom=z>=11?'near':z>=9.75?'mid':'far';};
  // Cards are placed one by one in clips.js order. A card keeps its hand-set offset (slid back
  // inside the map) when that spot is clear; otherwise it takes the nearest spot on rings around
  // its pin that covers no placed card or pin and whose leader runs under no card.
  const layoutCards=()=>{
   const W=canvas.clientWidth,H=canvas.clientHeight,PIN=compact?18:10,GAP=compact?2:6,S=compact?.62:1,CROSS=compact?60:2000;
   const pins=[...canvas.querySelectorAll('.cm-pin')].map(pin=>({pin,p:map.layerPointToContainerPoint(L.DomUtil.getPosition(pin.parentElement))}));
   const spots=[...canvas.querySelectorAll('.cm-scenic-marker')].map(el=>map.layerPointToContainerPoint(L.DomUtil.getPosition(el)));
   // Phone maps lay out only the cards a tap opened; every pin stays uncovered.
   const items=pins.filter(({pin})=>!compact||pin.classList.contains('open')).map(a=>{
    const card=a.pin.querySelector('.cm-card');
    return {...a,w:card.offsetWidth/2+GAP,h:card.offsetHeight/2+GAP};
   });
   const overlap=(a,b)=>Math.max(0,a.w+b.w-Math.abs(a.x-b.x))*Math.max(0,a.h+b.h-Math.abs(a.y-b.y));
   // The zoom buttons, the map credit and the pin legend stay uncovered, like the pins.
   const box=canvas.getBoundingClientRect(),controls=[...container.querySelectorAll('.leaflet-control-zoom,.leaflet-control-attribution,.jeju-map-tip')].filter(el=>el.offsetWidth).map(el=>{
    const r=el.getBoundingClientRect();return {x:r.left-box.left+r.width/2,y:r.top-box.top+r.height/2,w:r.width/2,h:r.height/2};
   });
   // Liang-Barsky: does the segment p→q pass through box b?
   const crosses=(p,q,b)=>{
    let t0=0,t1=1;const dx=q.x-p.x,dy=q.y-p.y;
    for(const[d,r]of[[-dx,p.x-b.x+b.w],[dx,b.x+b.w-p.x],[-dy,p.y-b.y+b.h],[dy,b.y+b.h-p.y]]){
     if(!d){if(r<0)return false;continue;}
     const t=r/d;if(d<0){if(t>t1)return false;t0=Math.max(t0,t);}else{if(t<t0)return false;t1=Math.min(t1,t);}
    }
    return true;
   };
   const place=(a,others)=>{
    const hx=a.p.x+Number(a.pin.dataset.dx),hy=a.p.y+Number(a.pin.dataset.dy);
    let best=null;
    const consider=(x,y)=>{
     const c={x:Math.min(W-a.w,Math.max(a.w,x)),y:Math.min(H-a.h,Math.max(a.h,y)),w:a.w,h:a.h};
     let cost=Math.hypot(c.x-hx,c.y-hy)*.5;
     for(const b of others){cost+=overlap(c,b)*4;if(crosses(a.p,c,b)||crosses(b.p,b,c))cost+=CROSS;}
     for(const{p}of pins)cost+=overlap(c,{x:p.x,y:compact?p.y-21:p.y,w:PIN,h:compact?21:PIN})*20; // phone photo pins stand above their spot
     for(const p of spots)cost+=overlap(c,{x:p.x,y:p.y,w:15,h:15})*20;
     for(const b of controls)cost+=overlap(c,b)*20;
     if(!best||cost<best.cost)best={...c,cost};
    };
    consider(hx,hy);
    if(best.cost>1)for(let r=50;r<=440;r+=15)for(let k=0;k<36;k++)consider(a.p.x+Math.cos(k*Math.PI/18)*r*S,a.p.y+Math.sin(k*Math.PI/18)*r*S);
    a.x=best.x;a.y=best.y;
   };
   // First pass against the cards placed so far, second against all of them, so a card placed
   // early can still make room for a later one.
   items.forEach((a,i)=>place(a,items.slice(0,i)));
   for(let k=0;k<3;k++)for(const a of items)place(a,items.filter(b=>b!==a));
   for(const{pin,p,x,y}of items){
    const dx=Math.round(x-p.x),dy=Math.round(y-p.y),line=pin.querySelector('line');
    pin.style.setProperty('--dx',dx+'px');pin.style.setProperty('--dy',dy+'px');line.setAttribute('x2',dx);line.setAttribute('y2',dy);
   }
  };
  map.on('zoomend',zoomClass);map.on('moveend zoomend resize',layoutCards);
  container.classList.toggle('compact',compact);
  if(!modal){
   canvas.addEventListener('click',()=>map.scrollWheelZoom.enable(),{once:true});
   if(touch){const hint=container.querySelector('.jeju-map-hint');let timer;canvas.addEventListener('touchstart',e=>{if(e.touches.length===1){hint.hidden=false;clearTimeout(timer);timer=setTimeout(()=>hint.hidden=true,1400);}else hint.hidden=true;},{passive:true});}
  }
  fit();zoomClass();merge();
  // The walk's own course starts open, so the phone map shows where you are.
  if(open&&currentId)open(currentId,true);else layoutCards();
 }).catch(e=>{console.error(e);canvas.innerHTML='<p class="jeju-map-error">지도를 불러오지 못했어요. 새로고침해 주세요.</p>';});
 return handle;
}
export function nextCourse(currentId){const others=CLIPS.filter(c=>c.map&&c.id!==currentId);return others[Math.floor(Math.random()*others.length)]||CLIPS[0];}

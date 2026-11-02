import {CLIPS} from './clips.js';

// A stylised Jeju map with one pin per course. The outline is a smoothed trace of the
// island's shape (lon 126.16–126.95, lat 33.18–33.57); pins use the clips' real GPS.
const OUTLINE=[[126.165,33.305],[126.20,33.36],[126.26,33.42],[126.33,33.47],[126.42,33.50],[126.52,33.525],[126.60,33.54],[126.68,33.55],[126.76,33.56],[126.84,33.53],[126.91,33.49],[126.95,33.44],[126.92,33.38],[126.86,33.33],[126.78,33.30],[126.70,33.27],[126.60,33.24],[126.50,33.235],[126.42,33.24],[126.33,33.22],[126.26,33.205],[126.20,33.23],[126.165,33.27]];
const BOUNDS={lonMin:126.10,lonMax:127.01,latMin:33.13,latMax:33.62};
export const W=1000,H=Math.round(W*(BOUNDS.latMax-BOUNDS.latMin)/(BOUNDS.lonMax-BOUNDS.lonMin)/Math.cos(33.4*Math.PI/180));
export function project([lon,lat]){return[(lon-BOUNDS.lonMin)/(BOUNDS.lonMax-BOUNDS.lonMin)*W,(1-(lat-BOUNDS.latMin)/(BOUNDS.latMax-BOUNDS.latMin))*H];}
function smoothPath(points){
 const p=points.map(project),n=p.length;let d='';
 for(let i=0;i<n;i++){const p0=p[(i-1+n)%n],p1=p[i],p2=p[(i+1)%n],p3=p[(i+2)%n];
  const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];
  d+=(i?'':`M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`)+`C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;}
 return d+'Z';
}
const minutes=seconds=>seconds<90?`${Math.round(seconds)}초`:`${Math.round(seconds/60)}분`;
export function createCourseMap(container,{currentId=null,onPick=null,compact=false}={}){
 const courses=CLIPS.filter(c=>c.map);
 const halla=project([126.532,33.362]);
 container.innerHTML=`<svg class="course-map" viewBox="0 0 ${W} ${H}" role="group" aria-label="제주 코스 지도">
  <defs><radialGradient id="mapSea" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#1b4d55"/><stop offset="1" stop-color="#0b2a30"/></radialGradient>
  <filter id="mapGlow"><feGaussianBlur stdDeviation="6"/></filter></defs>
  <rect width="${W}" height="${H}" fill="url(#mapSea)" rx="24"/>
  <path d="${smoothPath(OUTLINE)}" fill="#0a1f1c" opacity=".7" filter="url(#mapGlow)" transform="translate(0 10)"/>
  <path d="${smoothPath(OUTLINE)}" fill="#355d47" stroke="#9fd0b8" stroke-width="2.5"/>
  <path d="${smoothPath(OUTLINE)}" fill="none" stroke="#e5f3e8" stroke-width="1" opacity=".35" transform="translate(-6 -6)"/>
  <g transform="translate(${halla[0]} ${halla[1]})"><path d="M-48 26L0 -34L48 26Z" fill="#5f8f6a"/><path d="M-14 -16L0 -34L14 -16Z" fill="#e9f1e4"/><text y="48" text-anchor="middle" font-size="22" fill="#d9ead8" opacity=".85">한라산</text></g>
  ${courses.map(c=>{const [x,y]=project([c.map.lon,c.map.lat]),current=c.id===currentId;return`<g class="course-pin${current?' current':''}" data-clip="${c.id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" tabindex="0" role="button" aria-label="${c.title} 걷기, ${minutes(c.duration)}">
   <circle r="30" fill="#f4d072" opacity="${current?.35:0}"><animate attributeName="r" values="22;38;22" dur="2.4s" repeatCount="indefinite"/></circle>
   <circle r="13" fill="${current?'#f4d072':'#eef3ea'}" stroke="#102527" stroke-width="3"/>
   <image href="${c.poster}" x="${c.map.dx??-150}" y="${(c.map.dy??-128)}" width="140" height="79" clip-path="inset(0 round 10)" preserveAspectRatio="xMidYMid slice"/>
   <rect x="${c.map.dx??-150}" y="${(c.map.dy??-128)+79}" width="140" height="46" rx="10" fill="#102527ee"/>
   <text x="${(c.map.dx??-150)+70}" y="${(c.map.dy??-128)+98}" text-anchor="middle" font-size="17" fill="#eef3ea">${c.title}</text>
   <text x="${(c.map.dx??-150)+70}" y="${(c.map.dy??-128)+118}" text-anchor="middle" font-size="14" fill="#b7ded6">${minutes(c.duration)} · ${c.map.place||''}</text>
  </g>`;}).join('')}
 </svg>`;
 for(const pin of container.querySelectorAll('.course-pin')){
  const pick=()=>{const id=pin.dataset.clip;if(onPick)onPick(id);else location.href=`/engine?clip=${id}`;};
  pin.addEventListener('click',pick);pin.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}});
 }
 return{courses};
}
export function nextCourse(currentId){const others=CLIPS.filter(c=>c.map&&c.id!==currentId);return others[Math.floor(Math.random()*others.length)]||CLIPS[0];}

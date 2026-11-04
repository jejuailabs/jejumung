// 제주멍 → 펀제주(funjeju.com) 연결. 걷는 동안에는 아무것도 띄우지 않고, 멈춘 순간에만 실시간 CCTV를 권한다.
//  - 첫 화면: 코스 지도 아래 한 줄
//  - 코스 도착 화면: 걸은 길에서 가장 가까운 바다 CCTV 카드
//  - 걷기 메뉴: '실시간 제주 CCTV'
//  - 쉼터 툴바: '지금 진짜 제주 하늘'
// 링크는 모두 새 탭(산책 자리 유지) + utm 꼬리표. 실패해도 산책 엔진에 영향을 주지 않는다.
import {CLIPS} from './clips.js';

const FUNJEJU='https://funjeju.com';
// [id, 이름, 위도, 경도] — 썸네일이 있고 원본이 살아 있는 펀제주 카메라(2026-11-04)
const CAMS=[["panpo","판포해변",33.352,126.178],["hyeopjae","협재해변",33.394,126.239],["gwakji","곽지해변",33.46,126.338],["hagwi","하귀가문동",33.479,126.388],["sechon","세천포구",33.499,126.444],["iho","이호해변",33.498,126.453],["dodu","도두항",33.513,126.475],["donghandugi","동한두기",33.514,126.508],["tapdong","탑동서부두",33.514,126.521],["samyang","삼양해변",33.524,126.582],["hamdeok","함덕해변",33.543,126.669],["gimnyeong","김녕해변",33.553,126.757],["woljeong","월정해변",33.558,126.796],["pyeongdae","평대해변",33.543,126.83],["udo_haumoktong","우도하우목동",33.497,126.941],["udo_cheonjin","우도천진항",33.506,126.951],["jeju_airport","제주공항",33.511,126.493],["mosulpo","모슬포항",33.214,126.252],["hamo_beach","하모해변",33.217,126.255],["daejeong_hamo","대정하모",33.218,126.257],["sindo","신도포구",33.226,126.183],["nonjitmul","논짓물",33.233,126.488],["daepo","대포포구",33.234,126.428],["bomok","보목포구",33.236,126.582],["hwasun","화순해변",33.239,126.318],["seogwipo_hang2","서귀포항2",33.241,126.563],["saeyeongyo","새연교",33.242,126.562],["cheonjiyeon","천지연",33.245,126.559],["namwon_taeheung","남원태흥포구",33.27,126.7],["pyoseon","표선항",33.324,126.838],["seopjikoji","섭지코지",33.428,126.93],["seongsan","성산일출봉",33.458,126.942],["seongsan_suma","성산수마포구",33.461,126.921],["seongsan_hang","성산항",33.469,126.929],["halla_1100","한라산 1100도로",33.3592,126.4639],["halla_eoseungsaeng","한라산 어승생악",33.3897,126.4836],["halla_witse","한라산 윗세오름",33.3556,126.4869],["halla_baengnokdam","한라산 백록담",33.3617,126.5333],["halla_wanggwanneung","한라산 왕관릉",33.37,126.543]];

const utm=(medium,content)=>`utm_source=jejumung&utm_medium=${medium}${content?'&utm_content='+encodeURIComponent(content):''}`;
const homeUrl=(medium)=>`${FUNJEJU}/?${utm(medium)}`;
const watchUrl=(id,medium,content)=>`${FUNJEJU}/watch/${encodeURIComponent(id)}?${utm(medium,content)}`;

function km(a,b,c,d){return Math.hypot((a-c)*111,(b-d)*111*Math.cos(33.4*Math.PI/180));}
function nearestCam(clip){
 if(!clip?.map)return null;let best=null,bd=1e9;
 for(const c of CAMS){const d=km(clip.map.lat,clip.map.lon,c[2],c[3]);if(d<bd){bd=d;best=c;}}
 return best&&{id:best[0],name:best[1],km:bd};
}
function currentClip(){const id=new URLSearchParams(location.search).get('clip');return CLIPS.find(c=>c.id===id)||CLIPS[0];}
function link(href,cls,html){const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener';a.className=cls;a.innerHTML=html;return a;}
const josa=(n)=>{const c=n.charCodeAt(n.length-1)-0xAC00;return c>=0&&c<11172&&c%28?'은':'는';};

function home(){
 const map=document.querySelector('.map-section');if(!map||document.querySelector('.fj-home'))return;
 const p=document.createElement('p');p.className='fj-home';
 p.append(link(homeUrl('home'),'fj-home-link','<span class="fj-dot"></span>지금 제주 날씨가 궁금하면 · <b>실시간 제주 CCTV 53곳</b> 보기 ↗'));
 map.after(p);
}

function arrivalCard(){
 const box=document.getElementById('arrival');if(!box)return;
 const show=()=>{
  if(box.hidden)return;box.querySelector('.fj-arrival')?.remove();
  const clip=currentClip(),cam=nearestCam(clip);if(!cam)return;
  const dist=cam.km<1?'바로 옆':cam.km.toFixed(1)+'km 떨어진';
  const card=link(watchUrl(cam.id,'arrival',clip.id),'fj-arrival',
   `<img src="${FUNJEJU}/sky/cams/${cam.id}.jpg" alt="${cam.name} 실시간 CCTV" loading="lazy">`+
   `<span class="fj-arrival-text"><span class="fj-live">● LIVE · ${dist} 바다</span>`+
   `<strong>이 길 근처, 지금 ${cam.name}${josa(cam.name)}?</strong><span class="fj-sub">펀제주 실시간 CCTV로 보기 ↗</span></span>`);
  box.querySelector('.arrival-actions')?.after(card);
 };
 new MutationObserver(show).observe(box,{attributes:true,attributeFilter:['hidden']});show();
}

function menuLink(){
 const main=document.querySelector('.hud-pop-link[href="/"]');if(!main||document.querySelector('.fj-menu'))return;
 const a=link(homeUrl('menu'),'hud-pop-link fj-menu','실시간 제주 CCTV ↗');a.setAttribute('role','menuitem');main.after(a);
}

function loungeLink(){
 const lounge=document.getElementById('lounge');if(!lounge)return;
 const add=()=>{const bar=lounge.querySelector('.lounge-toolbar');if(!bar||bar.querySelector('.fj-lounge'))return;
  const cam=nearestCam(currentClip());
  bar.append(link(cam?watchUrl(cam.id,'lounge',currentClip().id):homeUrl('lounge'),'fj-lounge','지금 진짜 제주 하늘 ↗'));};
 new MutationObserver(add).observe(lounge,{childList:true,subtree:true});add();
}

try{
 if(document.querySelector('.map-section'))home();
 if(document.getElementById('arrival')){arrivalCard();menuLink();loungeLink();}
}catch{/* 연결 실패는 산책을 막지 않는다 */}

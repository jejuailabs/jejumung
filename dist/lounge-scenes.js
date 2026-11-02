import {REST_SCENES} from './rest-scenes.js';
export const SEATS=5;
export const LOUNGE_NAMESPACE='jejumungV6';
export const KINDS={sunbed:'바다 데크',hammock:'나무 그늘',bench:'벤치 쉼터',paddle:'물 위에서'};
export function parseRoom(value,fallback='coast_hammock_001'){
 const m=/^(coast_(?:sunbed|hammock|bench|paddle)|forest_(?:hammock|bench))_(\d{3})$/.exec(value||'');
 if(!m||+m[2]<1)return parseRoom(fallback);
 const[area,kind]=m[1].split('_');return{id:value,area,kind,index:+m[2]};
}
export function roomId(area,kind,index){return`${area}_${kind}_${String(Math.max(1,Math.min(999,index))).padStart(3,'0')}`;}
const lie=(name,head,feet,button,mask)=>({name,pose:'lie',head,feet,button,mask});
const sit=(name,anchor,scale,button,yaw=0)=>({name,pose:'sit',anchor,scale,button,yaw});
export function sceneFor(room){
 let image,width,height,seats,title;
 if(room.area==='forest'){
  const source=REST_SCENES.forest;({image,width,height}=source);title='곶자왈 숲속 쉼터';
  seats=[lie('나무 사이 해먹',[175,405],[304,445],[.17,.48],source.spots['hammock-left'].mask),lie('초록 해먹',[582,387],[651,414],[.43,.44],source.spots['hammock-middle'].mask),lie('주황 해먹',[920,393],[1015,421],[.68,.45],source.spots['hammock-orange'].mask),sit('앞쪽 벤치',[395,780],99,[.29,.78],-.08),sit('숲길 의자',[1164,603],58,[.81,.60],-.5)];
 }else if(room.kind==='hammock'){
  const source=REST_SCENES.coastHammocks;({image,width,height}=source);title='바닷가 나무 그늘';
  seats=[lie('앞쪽 바다 해먹',[315,241],[390,258],[.56,.84],source.spots['sea-hammock-front'].mask),lie('나무 그늘 해먹',[144,186],[200,201],[.27,.64],source.spots['sea-hammock-shade'].mask),lie('소나무 아래 해먹',[35,173],[69,181],[.085,.57],[[19,164],[36,180],[58,184],[80,168],[77,183],[56,193],[31,184]]),lie('안쪽 작은 해먹',[35,149],[61,157],[.09,.46],[[22,148],[38,157],[59,157],[74,145],[66,159],[40,164]])];
 }else if(room.kind==='paddle'){
  ({image,width,height}=REST_SCENES.coastPaddles);title='에메랄드빛 바다 위';
  seats=[lie('흰색 보드',[426,365],[533,437],[.40,.68]),lie('주황 보드',[355,461],[460,574],[.33,.87]),lie('노란 보드',[728,293],[823,331],[.63,.52]),lie('하늘색 보드',[1018,348],[1156,401],[.88,.61]),lie('가운데 보드',[646,350],[726,403],[.57,.63])];
 }else{
  ({image,width,height}=REST_SCENES.coastLounge);title=room.kind==='bench'?'바다를 보는 벤치':'파도 앞 선베드';
  seats=[lie('앞쪽 선베드',[370,235],[450,261],[.66,.83]),lie('가운데 선베드',[270,208],[328,231],[.45,.73]),lie('안쪽 선베드',[207,189],[250,210],[.34,.62]),lie('오른쪽 데이베드',[529,285],[474,298],[.82,.94]),sit('바다 벤치',[511,222],26,[.83,.72],-.15)];
 }
 const source=room.area==='forest'?REST_SCENES.forest:room.kind==='hammock'?REST_SCENES.coastHammocks:room.kind==='paddle'?REST_SCENES.coastPaddles:REST_SCENES.coastLounge;
 return{background:image,width,height,layers:source.layers,dressing:source.dressing,profile:room.area==='forest'?'forest':room.kind==='hammock'?'coastHammocks':room.kind==='paddle'?'coastPaddles':'coastLounge',title:`${title} · ${String(room.index).padStart(2,'0')}구역`,seats:seats.map((s,i)=>({...s,fit:room.area==='forest'?.84:room.kind==='hammock'?.72:room.kind==='paddle'?.80:.66,id:'s'+String(i).padStart(2,'0'),x:s.button[0]*100,y:s.button[1]*100}))};
}

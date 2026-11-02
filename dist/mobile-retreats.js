// Portrait photos are authored for ten guests. Coordinates refer to the full 1086×1448 image.
export const SEATS=10,LOUNGE_NAMESPACE='jejumungV7';
const s=(name,x,y,scale=56,yaw=0)=>({name,pose:'sit',anchor:[x,y],scale,yaw,button:[x/1086,(y+45)/1448]});
const l=(name,hx,hy,fx,fy,scale=56)=>({name,pose:'lie',head:[hx,hy],feet:[fx,fy],fit:scale*1.16/Math.hypot(hx-fx,hy-fy),button:[(hx+fx)/2/1086,((hy+fy)/2+48)/1448]});
const scenes=[
 {id:'grove',name:'곶자왈 햇살 마당',area:'forest',kind:'hammock',seats:[l('햇살 앞 해먹',858,1062,724,1115,65),l('나무 아래 해먹',245,275,165,292,50),l('초록 그늘 해먹',510,282,463,300,48),l('오른쪽 잎새 해먹',917,353,986,375,50),l('왼쪽 선베드',197,450,308,510,56),l('길가 선베드',680,430,603,481,54),s('앞 벤치 왼쪽',151,854,64),s('앞 벤치 오른쪽',307,824,64),s('돌담 벤치 왼쪽',801,660,58),s('돌담 벤치 오른쪽',924,680,58)]},
 {id:'cedar',name:'삼나무 고요 쉼터',area:'forest',kind:'bench',seats:[s('안쪽 벤치 왼쪽',556,450,46),s('안쪽 벤치 오른쪽',623,450,46),s('중간 벤치 왼쪽',743,671,56),s('중간 벤치 오른쪽',846,685,56),s('앞 벤치 왼쪽',163,930,66),s('앞 벤치 오른쪽',314,900,66),s('그늘 의자 왼쪽',282,575,50),s('그늘 의자 오른쪽',356,558,50),s('앞 의자 왼쪽',811,1010,65),s('앞 의자 오른쪽',952,1094,66)]},
 {id:'pine',name:'소나무 아래 바다',area:'coast',kind:'hammock',seats:[l('소나무 해먹',290,463,194,479,53),l('파도 해먹',864,616,944,638,55),l('돌담 해먹',273,914,167,930,62),l('수국 해먹',892,980,966,1011,62),l('안쪽 선베드',693,688,606,741,56),l('바다 선베드',896,717,796,775,59),s('그늘 벤치 왼쪽',214,695,55),s('그늘 벤치 오른쪽',308,682,55),s('앞 벤치 왼쪽',480,1193,65),s('앞 벤치 오른쪽',614,1215,65)]},
 {id:'tide',name:'에메랄드 데크',area:'coast',kind:'sunbed',seats:[l('파라솔 선베드 왼쪽',206,438,268,483,51),l('파라솔 선베드 오른쪽',335,427,390,466,51),l('바다 선베드 왼쪽',835,551,770,584,53),l('바다 선베드 오른쪽',945,566,875,623,55),s('중간 벤치 왼쪽',215,717,60),s('중간 벤치 오른쪽',345,681,60),s('오른쪽 벤치 왼쪽',755,851,63),s('오른쪽 벤치 오른쪽',896,878,63),s('둥근 의자 왼쪽',415,996,69),s('둥근 의자 오른쪽',763,1114,72)]},
 {id:'oreum',name:'오름 바람 정원',area:'forest',kind:'bench',seats:[l('억새 해먹',496,440,587,454,51),l('꽃밭 앞 해먹',916,1004,720,1061,65),s('위 벤치 왼쪽',190,546,50),s('위 벤치 오른쪽',282,535,50),s('오른쪽 위 벤치 왼쪽',759,539,50),s('오른쪽 위 벤치 오른쪽',847,543,50),s('중간 벤치 왼쪽',739,753,58),s('중간 벤치 오른쪽',828,768,58),s('앞 바람 의자',142,854,65),s('안쪽 바람 의자',294,785,60)]},
 {id:'camellia',name:'동백 돌담 뜰',area:'forest',kind:'bench',seats:[l('동백 해먹',276,422,143,450,55),l('문 옆 해먹',926,535,1008,573,55),s('안쪽 벤치 왼쪽',375,555,52),s('안쪽 벤치 오른쪽',488,543,52),s('오른쪽 벤치 왼쪽',810,735,58),s('오른쪽 벤치 오른쪽',973,758,58),s('앞 벤치 왼쪽',178,1026,66),s('앞 벤치 오른쪽',345,994,66),s('등나무 의자 왼쪽',735,925,64),s('등나무 의자 오른쪽',977,1068,69)]},
 {id:'lagoon',name:'얕은 바다에 둥실',area:'coast',kind:'paddle',seats:[l('위 흰 보드',199,398,259,475,57),l('위 하늘 보드',321,371,379,442,57),l('위 나무 보드',442,351,501,412,57),l('가운데 파란 보드',668,571,604,652,59),l('가운데 흰 보드',801,594,727,684,60),l('오른쪽 민트 보드',961,652,883,746,61),l('왼쪽 나무 보드',220,784,140,875,61),l('왼쪽 민트 보드',370,818,282,930,63),l('앞 흰 보드',495,901,393,1028,65),l('앞 파란 보드',855,958,739,1041,65)]},
 {id:'sunset',name:'노을 머무는 해안',area:'coast',kind:'sunbed',seats:[l('소나무 노을 해먹',946,430,837,454,53),l('억새 노을 해먹',171,640,118,654,55),l('안쪽 선베드 왼쪽',426,491,369,521,52),l('안쪽 선베드 오른쪽',601,486,543,531,52),l('앞 선베드 왼쪽',819,866,658,929,64),l('앞 선베드 오른쪽',980,946,775,1031,68),s('왼쪽 벤치 왼쪽',142,850,60),s('왼쪽 벤치 오른쪽',273,838,60),s('오른쪽 벤치 왼쪽',815,659,56),s('오른쪽 벤치 오른쪽',920,666,56)]},
 {id:'fern',name:'양치 숲 옹달 쉼터',area:'forest',kind:'hammock',seats:[l('왼쪽 흰 해먹',213,489,136,506,52),l('안쪽 초록 해먹',464,421,516,440,49),l('오른쪽 흰 해먹',865,489,950,504,52),l('오른쪽 초록 해먹',864,648,947,672,57),l('안쪽 숲 선베드',626,509,560,545,52),l('앞 숲 선베드',166,752,300,827,62),s('왼쪽 벤치 왼쪽',205,628,53),s('왼쪽 벤치 오른쪽',285,620,53),s('오른쪽 벤치 왼쪽',794,865,62),s('오른쪽 벤치 오른쪽',921,877,62)]},
 {id:'moon',name:'달빛 아래 돌담',area:'coast',kind:'bench',seats:[l('달빛 왼쪽 해먹',266,456,167,465,53),l('달빛 오른쪽 해먹',891,560,956,587,55),l('등불 옆 선베드',953,687,850,761,58),l('앞 달빛 선베드',965,962,846,1089,67),s('돌담 벤치 왼쪽',476,548,52),s('돌담 벤치 오른쪽',575,548,52),s('중간 벤치 왼쪽',124,705,58),s('중간 벤치 오른쪽',253,688,58),s('앞 벤치 왼쪽',243,1011,66),s('앞 벤치 오른쪽',433,1005,66)]}
];
export const MOBILE_RETREATS=scenes.map(scene=>({...scene,width:1086,height:1448,background:`/assets/mobile-retreats-v7/${scene.id}.webp`,seats:scene.seats.map((seat,i)=>({...seat,id:'s'+String(i).padStart(2,'0'),x:seat.button[0]*100,y:seat.button[1]*100}))}));
const byId=new Map(MOBILE_RETREATS.map(s=>[s.id,s]));
export const KINDS={sunbed:'선베드',hammock:'해먹',bench:'벤치',paddle:'패들보드'};
export function roomId(sceneOrArea,kind,index=1){const scene=byId.has(sceneOrArea)?sceneOrArea:sceneOrArea==='coast'?(kind==='paddle'?'lagoon':kind==='sunbed'||kind==='bench'?'tide':'pine'):(kind==='bench'?'cedar':'grove');return`${scene}_${String(Math.max(1,Math.min(999,Number(index)||1))).padStart(3,'0')}`;}
export function parseRoom(value,fallback='pine_001'){
 const match=/^([a-z]+)_(\d{3})$/.exec(value||'');
 if(match&&byId.has(match[1])&&+match[2]>0){const scene=byId.get(match[1]);return{id:value,scene:scene.id,area:scene.area,kind:scene.kind,index:+match[2]};}
 const legacy=/^(coast|forest)_(hammock|sunbed|bench|paddle)_(\d{3})$/.exec(value||'');
 if(legacy&&+legacy[3]>0)return parseRoom(roomId(legacy[1],legacy[2],+legacy[3]));
 return parseRoom(fallback==='pine_001'?'pine_001':fallback,'pine_001');
}
export function sceneFor(room){
 const scene=byId.get(room.scene)||byId.get(parseRoom(room.id).scene);
 return{...scene,fit:'contain',profile:scene.area==='forest'?'forest':scene.kind==='paddle'?'coastPaddles':scene.kind==='hammock'?'coastHammocks':'coastLounge',title:`${scene.name} · ${String(room.index).padStart(2,'0')}구역`,dressing:{entryMode:'fade',entry:{x:543,y:1330,scale:60},sun:[.4,1,.8],sunIntensity:scene.id==='moon'?1.1:1.9,hemiIntensity:scene.id==='moon'?1.5:2.2,envIntensity:.5,shadowOpacity:.23,groundTilt:1.15,drift:0,zoom:0,water:0,swayAmount:0,dapple:0}};
}

export const SEATS=15;
export const KINDS={sunbed:'선베드',hammock:'해먹',bench:'벤치',paddle:'패들보드'};
export function parseRoom(value,fallback='coast_sunbed_001'){
 const m=/^(coast_(?:sunbed|hammock|bench|paddle)|forest_(?:hammock|bench))_(\d{3})$/.exec(value||'');
 if(!m||+m[2]<1)return parseRoom(fallback);
 const [area,kind]=m[1].split('_');return{id:value,area,kind,index:+m[2]};
}
export function roomId(area,kind,index){return `${area}_${kind}_${String(Math.max(1,Math.min(999,index))).padStart(3,'0')}`;}
export function sceneFor(room){
 const alternate=room.index%2===0;
 const background=room.kind==='paddle'?'water':room.area==='forest'?(alternate?'forestB':'forestA'):(alternate?'coastB':'coastA');
 return{background:`/assets/lounge-v5/${background}.png`,title:`${room.area==='forest'?'곶자왈':'바다'} ${KINDS[room.kind]} · ${String(room.index).padStart(2,'0')}구역`,
  seats:Array.from({length:SEATS},(_,i)=>{const row=Math.floor(i/5),col=i%5;return{id:'s'+String(i).padStart(2,'0'),x:10+col*20+(alternate?(row%2?1:-1):0),y:[54,74,94][row],width:['paddle','bench'].includes(room.kind)?18:20,z:row+1};})};
}

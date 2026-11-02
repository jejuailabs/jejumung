import assert from 'node:assert/strict';
import {stat,readFile} from 'node:fs/promises';
import {MOBILE_RETREATS,parseRoom,roomId,sceneFor,SEATS} from '../dist/mobile-retreats.js';
import {roomView,spreadMarkers} from '../dist/mobile-retreat-layout.js';
assert.equal(MOBILE_RETREATS.length,10);assert.equal(SEATS,10);
const phones=[[320,414],[360,480],[390,520],[430,573],[844,390]];
for(const s of MOBILE_RETREATS){
 const room=parseRoom(roomId(s.id,null,1)),scene=sceneFor(room);assert.equal(room.scene,s.id);assert.equal(scene.seats.length,10);assert.equal(new Set(scene.seats.map(x=>x.id)).size,10);
 assert.equal(scene.fit,'contain');assert.equal(scene.dressing.drift,0);assert.equal(scene.dressing.zoom,0);
 const file=new URL('../dist'+scene.background,import.meta.url);assert((await stat(file)).size<1024*1024);
 for(const[vw,vh]of phones){
  const frustum=roomView(scene.width,scene.height,vw,vh,'contain');
  assert(frustum.vw>=scene.width-.01&&frustum.vh>=scene.height-.01,'Whole photo stays in the frustum');
  const targets=[];
  for(const seat of scene.seats){
   const points=seat.pose==='lie'?[seat.head,seat.feet]:[seat.anchor];
   for(const[x,y]of points){assert(x>0&&x<scene.width&&y>0&&y<scene.height,'Furniture contact lies inside photo');}
   const[x,y]=points[0],px=((x-scene.width/2)/frustum.vw+.5)*100,py=(.5-(y-scene.height/2)/frustum.vh)*100;
   assert(px>0&&px<100&&py>0&&py<100,'All ten avatar anchors remain on screen');
   targets.push({id:seat.id,x:px,y:py});
  }
  const placed=[...spreadMarkers(targets,vw,vh).values()];
  for(const p of placed)assert(p.x*vw/100>=15&&p.x*vw/100<=vw-15&&p.y*vh/100>=15&&p.y*vh/100<=vh-15,'Touch target fits the phone');
  for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++)assert(Math.hypot((placed[i].x-placed[j].x)*vw/100,(placed[i].y-placed[j].y)*vh/100)>29,'Numbered targets remain separately touchable');
 }
}
assert.equal(parseRoom('forest_hammock_001').id,'grove_001');assert.equal(parseRoom('coast_paddle_011').id,'lagoon_011');assert.equal(parseRoom('coast_sunbed_003').id,'tide_003');assert.equal(parseRoom('bad').id,'pine_001');
const rules=JSON.parse(await readFile(new URL('../database.rules.json',import.meta.url),'utf8'));assert(rules.rules.jejumungV5&&rules.rules.jejumungV6&&rules.rules.jejumungV7);
console.log('10 portrait photos, 100 furniture contacts, five viewport shapes, separated touch targets, legacy links and namespace preservation: OK.');

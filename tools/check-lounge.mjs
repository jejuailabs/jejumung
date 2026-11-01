import assert from 'node:assert/strict';
import{readFile}from'node:fs/promises';
import{parseRoom,roomId,sceneFor,SEATS}from'../dist/lounge-scenes.js';
import * as THREE from '../dist/vendor/three.module.js';
import{createCompanion}from'../dist/companion.js';
import{CHARACTERS}from'../dist/characters.js';
assert.equal(SEATS,5);
for(const area of['coast','forest'])for(const kind of area==='coast'?['sunbed','hammock','bench','paddle']:['hammock','bench']){
 for(const index of[1,2,999]){
  const id=roomId(area,kind,index),room=parseRoom(id),scene=sceneFor(room);
  const capacity=area==='coast'&&kind==='hammock'?4:5;
  assert.equal(room.id,id);assert.equal(scene.seats.length,capacity);assert.equal(new Set(scene.seats.map(s=>s.id)).size,capacity);
  assert(scene.seats.every(s=>s.x>0&&s.x<100&&s.y<100));
  for(const s of scene.seats){if(s.pose==='lie')assert(Math.hypot(s.head[0]-s.feet[0],s.head[1]-s.feet[1])>20);else assert(s.scale>0);}
  await readFile(new URL('../dist'+scene.background,import.meta.url));
 }
}
assert.equal(parseRoom('coast_sunbed_000').id,'coast_hammock_001');
assert.equal(parseRoom('invalid').id,'coast_hammock_001');
for(const c of CHARACTERS){
 const model=createCompanion(THREE,{character:c.id});assert.equal(model.root.userData.character,c.id);
 for(const pose of['walk','sit','lie']){
  for(let i=0;i<240;i++)model.update({dt:1/60,time:0,walkTime:i/60,walking:pose==='walk',pose,profile:'coastHammocks'});
  model.root.traverse(o=>assert([...o.position.toArray(),...o.rotation.toArray().slice(0,3),...o.scale.toArray()].every(Number.isFinite)));
  assert(model.root.userData.poseSettled||pose==='walk');
 }
 for(let i=0;i<240;i++)model.update({dt:1/60,time:0,walkTime:2,walking:false,pose:'walk'});
 assert(Math.abs(model.root.getObjectByName('left-hip').rotation.x)<.01,'Stopping returns legs to idle');
 model.setCharacter('cloud');assert.equal(model.root.userData.character,'cloud');
}
const html=await readFile(new URL('../dist/engine.html',import.meta.url),'utf8');
assert(html.includes('id="lounge"')&&html.includes('id="walkPanel"'));
console.log('Natural scenes: 4–5 furniture anchors each. Four 3D characters: walk, idle, sit, lie, stop convergence and finite transforms OK.');

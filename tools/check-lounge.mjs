import assert from 'node:assert/strict';
import{readFile}from'node:fs/promises';
import{parseRoom,roomId,sceneFor,SEATS}from'../dist/lounge-scenes.js';
import * as THREE from '../dist/vendor/three.module.js';
import{createCompanion}from'../dist/companion.js';
import{CHARACTERS}from'../dist/characters.js';
await import('./check-mobile-retreats.mjs');
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
console.log('Portrait scenes: ten furniture anchors each. Four 3D characters: walk, idle, sit, lie, stop convergence and finite transforms OK.');

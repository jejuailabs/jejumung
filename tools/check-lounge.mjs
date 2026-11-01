import assert from 'node:assert/strict';
import{readFile}from'node:fs/promises';
import{parseRoom,roomId,sceneFor,SEATS}from'../dist/lounge-scenes.js';
assert.equal(SEATS,15);
for(const area of['coast','forest'])for(const kind of area==='coast'?['sunbed','hammock','bench','paddle']:['hammock','bench']){
 for(const index of[1,2,999]){
  const id=roomId(area,kind,index),room=parseRoom(id),scene=sceneFor(room);
  assert.equal(room.id,id);assert.equal(scene.seats.length,15);assert.equal(new Set(scene.seats.map(s=>s.id)).size,15);
  assert(scene.seats.every(s=>s.x>=9&&s.x<=91&&s.y<=94));
  await readFile(new URL('../dist'+scene.background,import.meta.url));
 }
 for(const variant of['empty','male','female']){
  const png=await readFile(new URL(`../dist/assets/lounge-v5/${kind}-${variant}.png`,import.meta.url));
  assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),384);assert.equal(png[25],6);
 }
}
assert.equal(parseRoom('coast_sunbed_000').id,'coast_sunbed_001');
assert.equal(parseRoom('invalid').id,'coast_sunbed_001');
const html=await readFile(new URL('../dist/engine.html',import.meta.url),'utf8');
assert(html.includes('id="lounge"')&&html.includes('id="walkPanel"'));
console.log('Lounge: 6 environments, 15 unique seats each, neighboring variants, 12 RGBA furniture/person composites, entry integration OK.');

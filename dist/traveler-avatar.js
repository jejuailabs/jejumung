import {TRAVELERS} from './traveler-assets.js?v=slow-walk-4';

// Each frame is a generated drawing, not a deformation of one still image.
export function createTravelerAvatar(T,{gender='male',onError=()=>{}}={}){
 const root=new T.Group();root.name='traveler-sprite';
 const material=new T.SpriteMaterial({transparent:true,alphaTest:.15,depthWrite:false,toneMapped:false});
 const sprite=new T.Sprite(material);root.add(sprite);
 const idleMaterial=material.clone(),idleSprite=new T.Sprite(idleMaterial);root.add(idleSprite);idleSprite.visible=false;
 const loader=new T.TextureLoader(),textures=new Map();
 let selected=TRAVELERS[gender]?gender:'male',frame=null,group=null,loaded=false,currentPose='walk';
 let greeting=false,walkBlend=0;
 function textureFor(path){
  if(textures.has(path))return textures.get(path);
  const entry={ready:false,texture:null};textures.set(path,entry);
  entry.texture=loader.load(path,()=>{entry.ready=true;},undefined,()=>onError('여행자 이미지를 불러오지 못했습니다. 새로고침해주세요.'));
  entry.texture.colorSpace=T.SRGBColorSpace;entry.texture.minFilter=T.LinearFilter;entry.texture.magFilter=T.LinearFilter;entry.texture.generateMipmaps=false;
  return entry;
 }
 function applyFrame(mirror=false){
  if(!frame||!group)return;
  const entry=textureFor(group.image),[x,y,w,h]=frame.rect,[iw,ih]=group.size;
  loaded=entry.ready;sprite.visible=loaded;material.map=entry.texture;
  entry.texture.repeat.set((mirror?-1:1)*w/iw,h/ih);entry.texture.offset.set((mirror?x+w:x)/iw,1-(y+h)/ih);
  material.needsUpdate=!material.userData.hasMap;material.userData.hasMap=true;
  root.userData.ready=loaded;root.userData.poseSettled=loaded;root.userData.traveler=selected;
 }
 function centerAt(point,mirror=false){const[, ,w,h]=frame.rect;sprite.center.set(mirror?1-point[0]/w:point[0]/w,1-point[1]/h);}
 function update({dt=1/60,time,walkTime=0,walking=false,pose='walk',profile='forest',view,wave=false}){
  currentPose=pose;greeting=wave;
  walkBlend=pose==='walk'?T.MathUtils.damp(walkBlend,walking?1:0,14,dt):0;
  const type=pose==='lie'?(view||({coastLounge:'sunbed',coastPaddles:'overhead'}[profile])||'hammock'):pose==='sit'?'sit':pose==='walk'&&(walking||walkBlend>.015)?'walk':'idle';
  group=TRAVELERS[selected].groups[type];
  const clock=type==='walk'?walkTime:time,idx=Math.floor(clock*group.fps)%group.frames.length;
  frame=group.frames[idx];root.userData.frame=idx;root.userData.clip=type;
  applyFrame();centerAt(frame.anchor);
  const[, ,w,h]=frame.rect;sprite.scale.set(w*group.pixelScale,h*group.pixelScale,1);material.rotation=0;
  // Briefly blend only walk <-> idle, never ghost successive walking poses.
  material.opacity=type==='walk'?walkBlend:1;idleSprite.visible=false;
  if(pose==='walk'&&type==='walk'&&walkBlend<.985){
   const idle=TRAVELERS[selected].groups.idle,f=idle.frames[Math.floor(time*idle.fps)%idle.frames.length];
   const entry=textureFor(idle.image),[x,y,iw,ih]=f.rect;
   entry.texture.repeat.set(iw/idle.size[0],ih/idle.size[1]);entry.texture.offset.set(x/idle.size[0],1-(y+ih)/idle.size[1]);
   idleMaterial.map=entry.texture;idleMaterial.needsUpdate=!idleMaterial.userData.hasMap;idleMaterial.userData.hasMap=true;idleMaterial.opacity=1-walkBlend;
   idleSprite.center.set(f.anchor[0]/iw,1-f.anchor[1]/ih);idleSprite.scale.set(iw*idle.pixelScale,ih*idle.pixelScale,1);idleSprite.visible=entry.ready;
  }
 }
 function alignRest({pose,spot,width,height}){
  if(!frame)return;
  const mirror=Boolean(spot.sprite?.mirror);applyFrame(mirror);
  if(pose!=='lie'){
   centerAt(frame.anchor,mirror);root.userData.contact=null;
   // Greeting is intentionally a speech/nod interaction; no unprovided wave frame.
   if(greeting&&pose==='sit')material.rotation=Math.sin(performance.now()*.008)*.012;
   return;
  }
  const[, ,w,h]=frame.rect;
  const head=frame.head,feet=frame.feet;
  const sourceHead=[mirror?w-head[0]:head[0],head[1]],sourceFeet=[mirror?w-feet[0]:feet[0],feet[1]];
  const target=spot.sprite||{},targetFeet=target.feet||[spot.x,spot.y];
  const targetHead=target.head||[spot.x-Math.sin(spot.roll??1.3)*spot.scale*1.45,spot.y-Math.cos(spot.roll??1.3)*spot.scale*1.45];
  const sx=sourceHead[0]-sourceFeet[0],sy=sourceFeet[1]-sourceHead[1];
  const tx=targetHead[0]-targetFeet[0],ty=targetFeet[1]-targetHead[1];
  const pixels=Math.hypot(tx,ty)/Math.max(1,Math.hypot(sx,sy));
  root.position.set(targetFeet[0]-width/2,height/2-targetFeet[1],0);root.scale.setScalar(1);
  centerAt(feet,mirror);sprite.scale.set(w*pixels,h*pixels,1);
  material.rotation=Math.atan2(ty,tx)-Math.atan2(sy,sx);
  root.userData.contact={x:(targetFeet[0]+targetHead[0])/2-width/2,y:height/2-(targetFeet[1]+targetHead[1])/2,length:Math.hypot(tx,ty),angle:Math.atan2(-ty,-tx)};
 }
 function setTraveler(value){if(TRAVELERS[value]){selected=value;loaded=false;root.userData.ready=false;textureFor(TRAVELERS[value].groups.idle.image);}}
 textureFor(TRAVELERS[selected].groups.idle.image);
 return{root,update,alignRest,setTraveler,kind:'sprite',seatHeight:0,get ready(){return loaded;},get gender(){return selected;}};
}

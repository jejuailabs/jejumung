import * as THREE from './vendor/three.module.js';
import {createCompanion} from './companion.js?v=nature-12';

// Scenery theater: the scenic loop plays on the screen of an open-air cinema photo
// (assets/theater, generated stills) while the walker's companion sits on a cushion in front
// of it, back to us. Each photo has its screen rectangle and seat measured in image pixels;
// the photo covers the viewer, and the video and the 3D layer follow the same mapping.
const LAYOUTS={
 wide:{image:'/assets/theater/wide.webp',w:1536,h:1024,screen:[291,180,1247,609],seat:[784,870],seated:240},
 tall:{image:'/assets/theater/tall.webp',w:1086,h:1448,screen:[203,336,882,688],seat:[575,1204],seated:270}
};

// `screen` reaches a pixel or two past the green (tall) or the baked picture (wide) so no edge of
// it shows; `seat` is where the companion's seat touches the cushion, `seated` its height there.
export function createTheater(container,video,{character='stone'}={}){
 const stage=document.createElement('div');stage.className='theater-stage';
 const photo=document.createElement('img');photo.className='theater-photo';photo.alt='';photo.decoding='async';
 const screen=document.createElement('div');screen.className='theater-screen';
 const glow=document.createElement('div');glow.className='theater-glow';
 stage.append(photo,glow,screen);screen.append(video);container.append(stage);

 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
 renderer.domElement.className='theater-3d';stage.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.05,30);
 // Dusk sky above, warm deck below; the lanterns stand left of the deck; the screen's own
 // colour comes from the front and edges the companion's outline.
 scene.add(new THREE.HemisphereLight(0x7d95d8,0x4a3420,1.25));
 const lantern=new THREE.PointLight(0xffb36b,5,6,1.6);lantern.position.set(-1.6,.5,1.1);scene.add(lantern);
 const screenLight=new THREE.DirectionalLight(0xcfe0ff,2.4);screenLight.position.set(0,2.2,-4);scene.add(screenLight);
 const fill=new THREE.DirectionalLight(0xffd9b0,.55);fill.position.set(1.2,2,3);scene.add(fill);
 // Soft contact shadow on the cushion.
 const blob=document.createElement('canvas');blob.width=blob.height=64;{const g=blob.getContext('2d'),r=g.createRadialGradient(32,32,2,32,32,32);r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);}
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.9,.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(blob),transparent:true,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.003;scene.add(shadow);
 const companion=createCompanion(THREE,{character});companion.setEnvIntensity(.4);
 companion.root.rotation.y=Math.PI;scene.add(companion.root);

 // Props for the actions, built here: a striped popcorn bucket that stands by the right hip while
 // eating (a kernel rides up in the right hand) and a cola cup held in the right hand. They live
 // in the companion's own frame (it faces +z) and appear only during their action.
 const stripes=document.createElement('canvas');stripes.width=64;stripes.height=8;
 {const g=stripes.getContext('2d');for(let i=0;i<8;i++){g.fillStyle=i%2?'#f6f1e6':'#d8322f';g.fillRect(i*8,0,8,8);}}
 const mat=(o)=>new THREE.MeshStandardMaterial({roughness:.7,metalness:0,...o});
 const props=new THREE.Group();companion.root.add(props);
 const bucket=new THREE.Group();props.add(bucket);
 {const wall=new THREE.Mesh(new THREE.CylinderGeometry(.088,.066,.15,24,1,true),mat({map:new THREE.CanvasTexture(stripes),side:THREE.DoubleSide}));bucket.add(wall);
  const base=new THREE.Mesh(new THREE.CircleGeometry(.066,24),mat({color:0xd8322f}));base.rotation.x=-Math.PI/2;base.position.y=-.075;bucket.add(base);
  const kernel=mat({color:0xfff3c8,roughness:.95}),bump=new THREE.IcosahedronGeometry(.026,0);
  for(let i=0;i<16;i++){const a=i*2.4,r=.055*Math.sqrt((i+.5)/16),k=new THREE.Mesh(bump,kernel);k.position.set(Math.cos(a)*r,.068+Math.random()*.03,Math.sin(a)*r);k.rotation.set(a,a*1.7,0);bucket.add(k);}}
 bucket.position.set(.31,.34,.12);bucket.scale.setScalar(1.5);
 const piece=new THREE.Mesh(new THREE.IcosahedronGeometry(.024,0),mat({color:0xfff3c8,roughness:.95}));props.add(piece);
 const cup=new THREE.Group();props.add(cup);
 {const body=new THREE.Mesh(new THREE.CylinderGeometry(.046,.036,.14,20),mat({color:0xc8202a}));cup.add(body);
  const band=new THREE.Mesh(new THREE.CylinderGeometry(.0465,.0435,.035,20,1,true),mat({color:0xf6f1e6}));cup.add(band);
  const lid=new THREE.Mesh(new THREE.CylinderGeometry(.049,.049,.012,20),mat({color:0xf3efe6}));lid.position.y=.075;cup.add(lid);
  const straw=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.12,8),mat({color:0xf0f0f0}));straw.position.set(.012,.13,0);straw.rotation.z=-.25;cup.add(straw);}
 for(const p of[bucket,piece,cup])p.visible=false;

 // Actions: popcorn, cola, clapping and waving run for a few seconds; leaning back stays until
 // another button. `cycle` matches the timing of the arm poses in companion.js.
 // `turn` swings the body round toward the viewer (radians) so the hands and the props show:
 // the companion looks back at you while it eats, drinks, claps or waves.
 const ACTIONS={eat:{len:6,turn:1.9,line:'냠냠, 팝콘 맛있다!'},drink:{len:6.4,turn:1.9,line:'캬, 시원하다!'},clap:{len:3,turn:1.5,line:'와, 멋지다!'},wave:{len:3,turn:2.3,line:'안녕! 같이 보자.'},recline:{len:Infinity,turn:0,line:'아, 편하다.'}};
 let action=null,actionAt=0;
 const handPoint=new THREE.Vector3(),cupLift=new THREE.Vector3(0,.03,.07); // the cup sits in front of the fist
 function holdProps(t){
  const name=action?.name;
  bucket.visible=name==='eat';cup.visible=name==='drink';piece.visible=false;
  if(name==='eat'){const c=(t%2)/2;piece.visible=c>.15&&c<.6;}
  if(name==='eat'||name==='drink'){
   companion.root.updateMatrixWorld(true);
   companion.hands[1].localToWorld(handPoint.set(0,-.235,.05));companion.root.worldToLocal(handPoint);
   if(piece.visible)piece.position.copy(handPoint);
   if(name==='drink'){const c=(t%3.2)/3.2,up=c<.25?c/.25:c<.75?1:1-(c-.75)/.25;cup.position.copy(handPoint).add(cupLift);cup.rotation.set(-.7*up,0,.15);}
  }
 }

 // The companion's sitting size is measured once its pose has settled (and again when its
 // glTF parts arrive): its seat goes to y=0 and the camera distance follows its height.
 let size={height:1.45,bottom:.25},measured=0,settled=0;
 const box=new THREE.Box3();
 function measure(){
  const shown=props.visible;props.visible=false;
  companion.root.position.y=0;companion.root.updateMatrixWorld(true);box.makeEmpty();
  // Visible meshes only: the procedural stand-ins stay in the tree, hidden, once the glTF parts arrive.
  companion.root.traverseVisible(o=>{if(!o.isMesh)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});
  size={height:box.max.y-box.min.y,bottom:box.min.y};companion.root.position.y=-size.bottom;props.visible=shown;fit();}
 let layout=null,scale=1,frame=0,last=performance.now(),alive=true;
 function fit(){
  const W=container.clientWidth,H=container.clientHeight;if(!W||!H)return;
  const next=W/H>1.05?LAYOUTS.wide:LAYOUTS.tall;
  if(next!==layout){layout=next;photo.src=layout.image;}
  // The photo covers the viewer, centred; everything below is in photo pixels times `scale`.
  scale=Math.max(W/layout.w,H/layout.h);
  const w=layout.w*scale,h=layout.h*scale;
  Object.assign(stage.style,{width:w+'px',height:h+'px',left:(W-w)/2+'px',top:(H-h)/2+'px'});
  const[x0,y0,x1,y1]=layout.screen;
  for(const el of[screen,glow])Object.assign(el.style,{left:x0*scale+'px',top:y0*scale+'px',width:(x1-x0)*scale+'px',height:(y1-y0)*scale+'px'});
  renderer.setSize(w,h,false);
  // Camera behind and a little above the cushion, far enough that the seated companion is
  // `seated` photo pixels tall; the view is then shifted so the seat lands on its pixel.
  const px=layout.seated*scale,place=dist=>{camera.position.set(0,dist*.32,dist);camera.lookAt(0,.35,0);camera.updateMatrixWorld();};
  let dist=size.height*h/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*px);
  camera.aspect=w/h;camera.clearViewOffset();camera.updateProjectionMatrix();place(dist);
  // One correction for the slant and the off-axis seat: scale the distance by the measured size.
  const y=v=>(1-v.project(camera).y)/2*h;
  dist*=(y(new THREE.Vector3())-y(new THREE.Vector3(0,size.height,0)))/px;place(dist);
  const p=new THREE.Vector3(0,0,0).project(camera),sx=(p.x+1)/2*w,sy=(1-p.y)/2*h;
  camera.setViewOffset(w,h,sx-layout.seat[0]*scale,sy-layout.seat[1]*scale,w,h);
  // Where a speech bubble goes: just above the companion's head, in viewer pixels.
  const W0=parseFloat(stage.style.left),H0=parseFloat(stage.style.top);
  container.parentElement?.style.setProperty('--speech-x',W0+layout.seat[0]*scale+'px');
  container.parentElement?.style.setProperty('--speech-y',H0+(layout.seat[1]-layout.seated*1.08)*scale+'px');
 }
 const observer=new ResizeObserver(fit);observer.observe(container);fit();

 // Sample the screen a few times a second for the light it throws on the companion.
 const probe=document.createElement('canvas');probe.width=probe.height=4;const pg=probe.getContext('2d',{willReadFrequently:true});
 let probeAt=0;const tint=new THREE.Color(0xcfe0ff);
 function sample(now){
  if(now<probeAt||video.readyState<2)return;probeAt=now+400;
  try{pg.drawImage(video,0,0,4,4);const d=pg.getImageData(0,0,4,4).data;let r=0,g=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}
   tint.setRGB(r/16/255,g/16/255,b/16/255,THREE.SRGBColorSpace);
   glow.style.setProperty('--glow',`rgb(${Math.round(r/16)},${Math.round(g/16)},${Math.round(b/16)})`);
  }catch{} // a tainted frame (no CORS) keeps the last colour
 }
 function tick(now){
  if(!alive)return;
  const dt=Math.min(.05,(now-last)/1000);last=now;
  sample(now);screenLight.color.lerp(tint,1-Math.exp(-dt*3));
  if(action&&now/1000-actionAt>ACTIONS[action.name].len)action=null;
  const t=action?now/1000-actionAt:0;
  companion.root.rotation.y=THREE.MathUtils.damp(companion.root.rotation.y,Math.PI+(action?ACTIONS[action.name].turn:0),4,dt);
  companion.update({dt,time:now/1000,pose:'sit',profile:'floor',act:action&&action.name!=='wave'?{name:action.name,t}:null,wave:action?.name==='wave'});
  holdProps(t);
  settled+=dt;const assets=companion.root.userData.assets?2:1;
  if(settled>.8&&measured<assets){measured=assets;settled=0;measure();}
  renderer.render(scene,camera);frame=requestAnimationFrame(tick);
 }
 frame=requestAnimationFrame(tick);
 return{
  stage,
  // Start an action (pressing the one already running stops it); returns its line for the
  // speech bubble, or null when nothing runs now.
  act(name){
   if(!ACTIONS[name])return null;
   if(action?.name===name){action=null;return null;}
   action={name};actionAt=performance.now()/1000;return ACTIONS[name].line;
  },
  get action(){return action?.name||null;},
  dispose(){alive=false;cancelAnimationFrame(frame);observer.disconnect();renderer.dispose();stage.remove();}
 };
}

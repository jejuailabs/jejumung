import * as THREE from './vendor/three.module.js';
import {createCompanion} from './companion.js?v=nature-14';
import {CHARACTERS} from './characters.js';

// The four companions in a row on the home page, all in one renderer. Each idles and looks
// around on its own clock; the one under the pointer (or the chosen one) turns to the viewer
// and waves. Frames are drawn only while the row is on screen.
// HEIGHT covers the crown (head top is about 1.7 with the leaf) plus the shadow below the feet.
const SPAN=4.3,HEIGHT=2.0,CENTER_Y=.82;
export function createCharacterLineup(container,{selected}={}){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(26,2.5,.1,30);
 scene.add(new THREE.HemisphereLight(0xe8f1e6,0x3f5a4c,2.1));
 const key=new THREE.DirectionalLight(0xfff0d8,2.4);key.position.set(1.6,3,2.2);key.castShadow=true;key.shadow.mapSize.set(2048,1024);
 Object.assign(key.shadow.camera,{left:-2.6,right:2.6,bottom:-1.2,top:1.2,near:.5,far:10});key.shadow.radius=4;key.shadow.normalBias=.02;scene.add(key);
 const rim=new THREE.DirectionalLight(0xdbe9ff,1.1);rim.position.set(-1.5,2.2,-2.5);scene.add(rim);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(SPAN+1,2.4),new THREE.ShadowMaterial({opacity:.28}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.36,.42,48),new THREE.MeshBasicMaterial({color:0xf4d072,transparent:true,opacity:.75}));ring.rotation.x=-Math.PI/2;ring.position.y=.003;scene.add(ring);
 const step=SPAN/CHARACTERS.length;
 const crew=CHARACTERS.map((c,i)=>{const companion=createCompanion(THREE,{character:c.id});companion.setEnvIntensity(.5);companion.root.position.x=-SPAN/2+step*(i+.5);scene.add(companion.root);
  return{id:c.id,companion,phase:i*1.7,turn:0,nextWave:4+i*3+Math.random()*4,waveUntil:0};});
 let focus=null,chosen=selected,active=false,visible=false,frame,last=performance.now();
 const place=()=>{const hit=crew.find(m=>m.id===chosen);ring.visible=Boolean(hit);if(hit)ring.position.x=hit.companion.root.position.x;};place();
 const resize=()=>{const r=container.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;
  // fit the whole row: width decides on a wide strip, height on a narrow one
  const half=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),d=Math.max(SPAN/camera.aspect,HEIGHT)/(2*half);
  camera.position.set(0,CENTER_Y+.12,d);camera.lookAt(0,CENTER_Y,0);camera.updateProjectionMatrix();};
 const observer=new ResizeObserver(resize);observer.observe(container);
 const seen=new IntersectionObserver(([e])=>{visible=e.isIntersecting;run();});seen.observe(container);
 const onVisibility=()=>run();document.addEventListener('visibilitychange',onVisibility);
 function run(){const want=visible&&!document.hidden;if(want&&!active){active=true;last=performance.now();frame=requestAnimationFrame(tick);}else if(!want&&active){active=false;cancelAnimationFrame(frame);}}
 function tick(now){
  if(!active)return;const dt=Math.min(.05,(now-last)/1000);last=now;const time=now/1000;
  for(const m of crew){
   const facing=m.id===focus;
   if(facing&&m.waveUntil<time-1.5)m.waveUntil=time+2;
   if(time>m.nextWave){m.waveUntil=time+2.2;m.nextWave=time+9+Math.random()*9;}
   m.turn=THREE.MathUtils.damp(m.turn,facing?0:Math.sin(time*.27+m.phase)*.6,facing?6:1.4,dt);m.companion.root.rotation.y=m.turn;
   m.companion.update({dt,time,walking:false,pose:'walk',wave:time<m.waveUntil});
  }
  renderer.render(scene,camera);frame=requestAnimationFrame(tick);
 }
 return{
  // column under a horizontal position (0..1 across the strip): the row spans the full width
  idAt:x=>CHARACTERS[Math.min(CHARACTERS.length-1,Math.max(0,Math.floor(x*CHARACTERS.length)))].id,
  setFocus(id){focus=id;},
  setSelected(id){chosen=id;place();},
  dispose(){active=false;cancelAnimationFrame(frame);observer.disconnect();seen.disconnect();document.removeEventListener('visibilitychange',onVisibility);renderer.dispose();renderer.domElement.remove();}
 };
}

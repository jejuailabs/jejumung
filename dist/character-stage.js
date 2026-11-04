import * as THREE from './vendor/three.module.js';
import {createCompanion} from './companion.js?v=nature-12';

// A small turntable for the character picker: the live model idles, glances around,
// waves now and then, and turns slowly so the back-view details read too.
export function createCharacterStage(container,{character='stone'}={}){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.1,20);camera.position.set(0,.98,3.7);camera.lookAt(0,.82,0);
 scene.add(new THREE.HemisphereLight(0xe8f1e6,0x3f5a4c,2.1));
 const key=new THREE.DirectionalLight(0xfff0d8,2.4);key.position.set(1.6,3,2.2);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=key.shadow.camera.bottom=-1.2;key.shadow.camera.right=key.shadow.camera.top=1.2;key.shadow.camera.near=.5;key.shadow.camera.far=10;key.shadow.radius=4;key.shadow.normalBias=.02;scene.add(key);
 const rim=new THREE.DirectionalLight(0xdbe9ff,1.1);rim.position.set(-1.5,2.2,-2.5);scene.add(rim);
 const ground=new THREE.Mesh(new THREE.CircleGeometry(1.1,48),new THREE.ShadowMaterial({opacity:.28}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const disc=new THREE.Mesh(new THREE.CircleGeometry(.72,48),new THREE.MeshBasicMaterial({color:0x0b1f1c,transparent:true,opacity:.35}));disc.rotation.x=-Math.PI/2;disc.position.y=-.002;scene.add(disc);
 const companion=createCompanion(THREE,{character});companion.setEnvIntensity(.5);scene.add(companion.root);
 let active=false,frame,last=performance.now(),nextWave=3+Math.random()*4,waveUntil=0,turn=0;
 const observer=new ResizeObserver(()=>{const r=container.getBoundingClientRect();if(r.width&&r.height){renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}});observer.observe(container);
 function tick(now){
  if(!active)return;const dt=Math.min(.05,(now-last)/1000);last=now;const time=now/1000;
  if(time>nextWave){waveUntil=time+2.2;nextWave=time+7+Math.random()*7;}
  turn=THREE.MathUtils.damp(turn,Math.sin(time*.28)*.55,1.5,dt);companion.root.rotation.y=turn;
  companion.update({dt,time,walking:false,pose:'walk',wave:time<waveUntil});
  renderer.render(scene,camera);frame=requestAnimationFrame(tick);
 }
 return{
  setCharacter(id){companion.setCharacter(id);},
  start(){if(active)return;active=true;last=performance.now();frame=requestAnimationFrame(tick);},
  stop(){active=false;cancelAnimationFrame(frame);},
  dispose(){this.stop();observer.disconnect();renderer.dispose();renderer.domElement.remove();}
 };
}

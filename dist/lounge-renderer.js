import * as T from './vendor/three.module.js';
import {createCompanion} from './companion.js?v=nature-6';
import {characterFor} from './characters.js';
export function createLoungeRenderer(field){
 const surface=document.createElement('div');surface.className='nature-characters';surface.setAttribute('aria-hidden','true');field.append(surface);
 const foreground=document.createElement('div');foreground.className='nature-foreground';foreground.setAttribute('aria-hidden','true');field.append(foreground);
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0,0);surface.append(renderer.domElement);
 const world=new T.Scene();world.add(new T.HemisphereLight(0xf3f4dc,0x4b6752,2.6));const light=new T.DirectionalLight(0xffe5ba,2.4);light.position.set(-3,5,6);world.add(light);
 const camera=new T.OrthographicCamera(),models=new Map();camera.position.z=2000;camera.near=.1;camera.far=4000;
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,31);gradient.addColorStop(0,'rgba(7,24,16,.38)');gradient.addColorStop(.5,'rgba(7,24,16,.16)');gradient.addColorStop(1,'rgba(7,24,16,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const shadowMap=new T.CanvasTexture(shadowCanvas);
 let description,active=false,frame,last=performance.now();
 const observer=new ResizeObserver(()=>{const r=field.getBoundingClientRect();if(r.width&&r.height)renderer.setSize(r.width,r.height,false);});observer.observe(field);
 function position(model,slot){
  const {root}=model;if(slot.pose==='lie'){
   const [hx,hy]=slot.head,[fx,fy]=slot.feet,dx=hx-fx,dy=fy-hy;
   const scale=Math.hypot(dx,dy)/1.16*slot.fit,angle=Math.atan2(dy,dx)-Math.PI/2;
   root.scale.setScalar(scale);root.rotation.set(0,0,angle);
   const head=new T.Vector3(0,1.18,0).applyEuler(root.rotation).multiplyScalar(scale);
   root.position.set(hx-description.width/2-head.x,description.height/2-hy-head.y,5);
   model.contact.position.set(hx+(fx-hx)*slot.fit*.43-description.width/2,description.height/2-hy-(fy-hy)*slot.fit*.43-3,1);model.contact.rotation.z=angle;model.contact.scale.set(scale*.55,scale*1.45,1);
  }else{root.scale.setScalar(slot.scale);root.rotation.set(0,slot.yaw||0,0);root.position.set(slot.anchor[0]-description.width/2,description.height/2-slot.anchor[1]-.365*slot.scale,5);model.contact.position.set(slot.anchor[0]-description.width/2,description.height/2-slot.anchor[1]-3,1);model.contact.rotation.z=0;model.contact.scale.set(slot.scale*.8,slot.scale*.17,1);}
 }
 function tick(now){
  if(!active)return;if(now-last<1000/30){frame=requestAnimationFrame(tick);return;}const dt=Math.min(.05,(now-last)/1000);last=now;
  for(const[id,model]of models){const slot=description.seats.find(s=>s.id===id);if(!slot)continue;model.update({dt,time:now/1000+description.seats.indexOf(slot)*.9,pose:slot.pose,profile:description.profile});position(model,slot);}
  renderer.render(world,camera);frame=requestAnimationFrame(tick);
 }
 return{
  scene(value){description=value;camera.left=-value.width/2;camera.right=value.width/2;camera.top=value.height/2;camera.bottom=-value.height/2;camera.updateProjectionMatrix();foreground.replaceChildren();},
  occupants(occupants){
   if(!description)return;
   for(const[id,model]of models)if(!occupants[id]){world.remove(model.root,model.contact);model.contact.geometry.dispose();model.contact.material.dispose();model.root.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});models.delete(id);}
   foreground.replaceChildren();
   for(const slot of description.seats){const guest=occupants[slot.id];if(!guest)continue;
    let model=models.get(slot.id);if(!model){model=createCompanion(T,{character:characterFor(guest.character).id});model.contact=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}));models.set(slot.id,model);world.add(model.root,model.contact);for(let i=0;i<90;i++)model.update({dt:1/30,time:0,pose:slot.pose,profile:description.profile});}else model.setCharacter(guest.character);
    position(model,slot);
    if(slot.mask){const image=document.createElement('img');image.src=description.background;image.alt='';image.style.clipPath=`polygon(${slot.mask.map(([x,y])=>`${x/description.width*100}% ${y/description.height*100}%`).join(',')})`;foreground.append(image);}
   }
  },
  start(){if(active)return;active=true;last=performance.now();frame=requestAnimationFrame(tick);},
  stop(){active=false;cancelAnimationFrame(frame);}
 };
}

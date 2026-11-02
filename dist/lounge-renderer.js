import * as T from './vendor/three.module.js';
import {createCompanion,preloadCompanionAssets} from './companion.js?v=nature-8';
import {characterFor} from './characters.js';

// Layered, living rest scenes. The still photo is split by depth into far/mid/near planes that
// drift with parallax; water ripples and sparkles, foliage sways and light dapples through
// motion masks; characters walk in from the path, settle into their seat, and are lit and
// shadowed by a per-scene sun matched to the photo. Everything is composited with the same
// grain and vignette as the walking stage.

const LAYER_VERT='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const LAYER_FRAG=`precision highp float;uniform sampler2D map,motion;uniform float time,water,sway,dapple,swayTop,swayBottom,hasMotion;uniform vec2 texel;varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
 vec3 m=texture2D(motion,vUv).rgb*hasMotion;
 vec2 uv=vUv;
 float w=m.r*water;
 vec2 ripple=vec2(noise(uv*vec2(60.,140.)+vec2(time*.25,time*.6)),noise(uv*vec2(90.,120.)-vec2(time*.2,time*.5)))-.5;
 uv+=ripple*texel*2.4*w;
 float g=m.g*sway*mix(swayBottom,swayTop,vUv.y);
 float gust=sin(time*.9+vUv.x*9.+noise(vUv*6.+time*.15)*4.)*.5+noise(vUv*25.+vec2(time*.35,time*.5))-.5;
 uv+=vec2(gust,gust*.35)*texel*1.7*g;
 vec4 c=texture2D(map,uv);
 // Glints: sparse, clustered where a slow large-scale field peaks, so the sea twinkles instead of snowing.
 float cluster=noise(vUv*vec2(9.,14.)+vec2(time*.05,time*.04));cluster=smoothstep(.55,.9,cluster);
 float sp=noise(vUv*vec2(420.,900.)+vec2(time*1.3,-time*.9));
 sp=smoothstep(.88,.98,sp)*cluster*(.6+.4*sin(time*6.+vUv.x*300.));
 c.rgb+=sp*w*.45*vec3(1.,.98,.9);
 c.rgb*=1.+w*.045*sin(vUv.y*40.-time*1.1+noise(vUv*8.)*3.);
 float dap=noise(vUv*vec2(14.,10.)+vec2(time*.12,time*.08));
 c.rgb*=1.+(dap-.5)*dapple*m.g;
 gl_FragColor=c;
}`;
const POST_VERT='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const POST_FRAG=`precision highp float;uniform sampler2D layer;uniform vec2 resolution;uniform float time,grain,vignette,contrast,saturation;varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 vec3 col=texture2D(layer,vUv).rgb;
 col=(col-.5)*contrast+.5;
 float luma=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(luma),col,saturation);
 vec2 d=(vUv-.5)*vec2(resolution.x/resolution.y,1.)*1.2;col*=1.-vignette*smoothstep(.4,1.3,length(d));
 float n=hash(floor(vUv*resolution*.5)+fract(time*7.3)*113.)-.5;col+=n*grain*(1.-luma*.6);
 gl_FragColor=vec4(max(col,0.),1.);
 #include <colorspace_fragment>
}`;
const BAND_Z={far:6,mid:16,near:26},LAYER_Z={far:0,mid:10,near:20};
const smoothstep=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

export function createLoungeRenderer(field,{audio=null,onOverlay=null}={}){
 const surface=document.createElement('div');surface.className='nature-characters';surface.setAttribute('aria-hidden','true');field.append(surface);
 const foreground=document.createElement('div');foreground.className='nature-foreground';foreground.setAttribute('aria-hidden','true');field.append(foreground);
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0,0);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.domElement.style.visibility='hidden';surface.append(renderer.domElement);
 const world=new T.Scene();
 const hemi=new T.HemisphereLight(0xf3f4dc,0x4b6752,2.2);world.add(hemi);
 const sun=new T.DirectionalLight(0xffe5ba,2.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0008;sun.shadow.normalBias=.4;sun.shadow.radius=4;world.add(sun,sun.target);
 const fill=new T.DirectionalLight(0xdfe9f5,.5);fill.position.set(-600,300,1500);world.add(fill);
 const rim=new T.DirectionalLight(0xeaf2ff,.8);rim.position.set(300,900,-1200);world.add(rim);
 const camera=new T.OrthographicCamera();camera.position.z=2000;camera.near=.1;camera.far=4000;
 const loader=new T.TextureLoader(),pmrem=new T.PMREMGenerator(renderer);
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;{const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,31);gradient.addColorStop(0,'rgba(7,24,16,.34)');gradient.addColorStop(.5,'rgba(7,24,16,.14)');gradient.addColorStop(1,'rgba(7,24,16,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);}
 const contactMap=new T.CanvasTexture(shadowCanvas);
 // Post composite (grain, vignette, grade) shared with the walking stage.
 const size=new T.Vector2();renderer.getDrawingBufferSize(size);
 const target=new T.WebGLRenderTarget(Math.max(2,size.x),Math.max(2,size.y),{samples:4,depthBuffer:true});
 const post=new T.ShaderMaterial({depthTest:false,depthWrite:false,vertexShader:POST_VERT,fragmentShader:POST_FRAG,uniforms:{layer:{value:target.texture},resolution:{value:new T.Vector2(size.x,size.y)},time:{value:0},grain:{value:.028},vignette:{value:.16},contrast:{value:1.02},saturation:{value:1.03}}});
 const postScene=new T.Scene();postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post));const postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
 let description,active=false,frame,last=performance.now(),generation=0,sceneReady=false,environment=null;
 const layers=[],models=new Map(),leaving=[];
 let depthSampler=null,meta=null,dressing={};
 preloadCompanionAssets(T);
 function fitCamera(){if(!description)return;const r=field.getBoundingClientRect();if(!r.width||!r.height)return;const {width,height}=description,fieldAspect=r.width/r.height,imageAspect=width/height;let vw=width,vh=height;if(fieldAspect<imageAspect)vw=height*fieldAspect;else vh=width/fieldAspect;camera.left=-vw/2;camera.right=vw/2;camera.top=vh/2;camera.bottom=-vh/2;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(()=>{const r=field.getBoundingClientRect();if(r.width&&r.height){renderer.setSize(r.width,r.height,false);renderer.getDrawingBufferSize(size);target.setSize(Math.max(2,size.x),Math.max(2,size.y));post.uniforms.resolution.value.set(size.x,size.y);fitCamera();}});observer.observe(field);

 function disposeLayers(){for(const l of layers){world.remove(l.mesh);l.mesh.geometry.dispose();l.mesh.material.uniforms.map.value?.dispose();}layers.length=0;}
 function disposeModel(model){world.remove(model.group);model.group.traverse(o=>{o.geometry?.dispose();if(o.material&&o!==model.cutout)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});model.cutout?.material.map?.dispose();}
 function loadTexture(url){return new Promise((resolve,reject)=>loader.load(url,t=>{t.colorSpace=T.SRGBColorSpace;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());resolve(t);},undefined,reject));}
 function makeLayer(texture,band,motionTexture){
  const {width,height}=description,p=meta?.parallax||[1,1,1],sw=meta?.sway||[0,0];
  const material=new T.ShaderMaterial({vertexShader:LAYER_VERT,fragmentShader:LAYER_FRAG,transparent:band!=='far',depthWrite:band==='far',uniforms:{map:{value:texture},motion:{value:motionTexture||contactMap},hasMotion:{value:motionTexture?1:0},time:{value:0},texel:{value:new T.Vector2(1/(texture.image?.width||width),1/(texture.image?.height||height))},water:{value:dressing.water??1},sway:{value:dressing.swayAmount??1},dapple:{value:dressing.dapple??.05},swayTop:{value:sw[0]},swayBottom:{value:sw[1]}}});
  const mesh=new T.Mesh(new T.PlaneGeometry(width,height),material);mesh.position.z=LAYER_Z[band];mesh.renderOrder=LAYER_Z[band];world.add(mesh);
  layers.push({mesh,band,parallax:p[band==='near'?0:band==='mid'?1:2]});
 }
 // Lights and reflections follow the photo: sky and ground colours from its top and bottom bands.
 function matchLighting(image){
  const w=32,h=18,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  try{ctx.drawImage(image,0,0,w,h);}catch{return;}
  const data=ctx.getImageData(0,0,w,h).data,avg=(y0,y1)=>{let r=0,g=0,b=0,n=0;for(let y=y0;y<y1;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;r+=data[i];g+=data[i+1];b+=data[i+2];n++;}return[r/n/255,g/n/255,b/n/255];};
  const top=avg(0,6),bottom=avg(12,18),mid=avg(5,13),hsl={};
  hemi.color.setRGB(top[0],top[1],top[2],T.SRGBColorSpace);hemi.color.getHSL(hsl);hemi.color.setHSL(hsl.h,Math.min(1,hsl.s*1.1),Math.min(1,hsl.l*1.05+.1));
  hemi.groundColor.setRGB(bottom[0],bottom[1],bottom[2],T.SRGBColorSpace);hemi.groundColor.getHSL(hsl);hemi.groundColor.setHSL(hsl.h,Math.min(1,hsl.s*1.05),Math.min(1,hsl.l*.95+.06));
  const lum=.2126*mid[0]+.7152*mid[1]+.0722*mid[2];hemi.intensity=(dressing.hemiIntensity??2.2)*T.MathUtils.clamp(.6+lum*.8,.7,1.3);
  const env=document.createElement('canvas');env.width=64;env.height=32;const ectx=env.getContext('2d');ectx.filter='blur(2px)';ectx.drawImage(image,0,0,64,32);ectx.filter='none';
  const envTexture=new T.CanvasTexture(env);envTexture.colorSpace=T.SRGBColorSpace;envTexture.mapping=T.EquirectangularReflectionMapping;
  if(environment)environment.dispose();environment=pmrem.fromEquirectangular(envTexture);world.environment=environment.texture;envTexture.dispose();
 }
 async function buildScene(value,attempt){
  const {width,height}=value;
  let far,mid,near,motion,depth;
  if(value.layers){
   try{
    const response=await fetch(value.layers+'meta.json');if(!response.ok)throw Error('meta');meta=await response.json();
    [far,mid,near,motion]=await Promise.all([loadTexture(value.layers+'far.jpg'),loadTexture(value.layers+'mid.webp'),loadTexture(value.layers+'near.webp'),loadTexture(value.layers+'motion.png')]);
    motion.colorSpace=T.NoColorSpace;
    depth=await new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=value.layers+'depth.png';});
   }catch(error){console.warn('쉼터 레이어를 불러오지 못해 단일 배경으로 표시합니다.',error);meta=null;far=mid=near=motion=null;}
  }
  if(attempt!==generation)return;
  if(!far){far=await loadTexture(value.background);if(attempt!==generation)return;meta=null;}
  disposeLayers();
  makeLayer(far,'far',motion);if(mid)makeLayer(mid,'mid',motion);if(near)makeLayer(near,'near',motion);
  if(depth){const c=document.createElement('canvas');c.width=depth.width;c.height=depth.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(depth,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;depthSampler=(x,y)=>{const px=T.MathUtils.clamp(Math.round(x/width*(c.width-1)),0,c.width-1),py=T.MathUtils.clamp(Math.round(y/height*(c.height-1)),0,c.height-1);return data[(py*c.width+px)*4]/255;};}
  else depthSampler=null;
  matchLighting(far.image);
  const dir=new T.Vector3(...(dressing.sun||[.5,1,.8])).normalize();sun.position.copy(dir).multiplyScalar(2500);sun.target.position.set(0,0,0);sun.color.set(dressing.sunColor||'#ffe5ba');sun.intensity=dressing.sunIntensity??2.2;
  const s=sun.shadow.camera;s.left=-width*.55;s.right=width*.55;s.top=height*.55;s.bottom=-height*.55;s.near=100;s.far=5000;s.updateProjectionMatrix();
  field.style.backgroundImage='none';renderer.domElement.style.visibility='';sceneReady=true;
  // Models created before the scene finished loading need their band and cutouts now.
  for(const model of models.values())placeModel(model);
 }
 function bandFor(slot){
  if(!depthSampler||!meta)return'far';
  const [x,y]=slot.pose==='lie'?[(slot.head[0]+slot.feet[0])/2,(slot.head[1]+slot.feet[1])/2]:slot.anchor;
  const v=depthSampler(x,y);return v>=meta.bands[0]?'near':v>=meta.bands[1]?'mid':'far';
 }
 // Standing placement at a seat: feet on the furniture's contact point, facing the camera a little.
 function standing(slot){
  if(slot.pose==='lie'){const [hx,hy]=slot.head,[fx,fy]=slot.feet;const scale=Math.hypot(hx-fx,fy-hy)/1.16*slot.fit;return{x:fx,y:fy,scale,yaw:(hx<fx?.35:-.35)};}
  return{x:slot.anchor[0],y:slot.anchor[1],scale:slot.scale,yaw:slot.yaw||0};
 }
 // Final placement: lying models are laid along the head→feet line, sitting models sit on the anchor.
 function placement(slot){
  const {width,height}=description;
  if(slot.pose==='lie'){
   const [hx,hy]=slot.head,[fx,fy]=slot.feet,dx=hx-fx,dy=fy-hy;
   const scale=Math.hypot(dx,dy)/1.16*slot.fit,angle=Math.atan2(dy,dx)-Math.PI/2;
   const head=new T.Vector3(0,1.18,0).applyEuler(new T.Euler(0,0,angle)).multiplyScalar(scale);
   return{position:new T.Vector3(hx-width/2-head.x,height/2-hy-head.y,0),quaternion:new T.Quaternion().setFromEuler(new T.Euler(0,0,angle)),scale,contact:{x:hx+(fx-hx)*slot.fit*.43-width/2,y:height/2-hy-(fy-hy)*slot.fit*.43-3,angle,sx:scale*.55,sy:scale*1.45}};
  }
  return{position:new T.Vector3(slot.anchor[0]-width/2,height/2-slot.anchor[1]-.365*slot.scale,0),quaternion:new T.Quaternion().setFromEuler(new T.Euler(0,slot.yaw||0,0)),scale:slot.scale,contact:{x:slot.anchor[0]-width/2,y:height/2-slot.anchor[1]-3,angle:0,sx:slot.scale*.8,sy:slot.scale*.17}};
 }
 function toWorld(x,y){return new T.Vector3(x-description.width/2,description.height/2-y,0);}
 function placeModel(model){
  const slot=model.slot,band=bandFor(slot);model.band=band;model.parallax=(meta?.parallax||[1,1,1])[band==='near'?0:band==='mid'?1:2];
  const within=slot.pose==='lie'?(slot.head[1]+slot.feet[1])/2:slot.anchor[1];
  model.z=BAND_Z[band]+within/description.height*3;
  // Hammock cloth in front of the body: a cut-out of the layer that holds the seat.
  if(model.cutout){model.group.remove(model.cutout);model.cutout.geometry.dispose();model.cutout.material.dispose();model.cutout=null;}
  if(slot.mask){
   const layer=layers.find(l=>l.band===band)||layers[0];
   if(layer){
    const {width,height}=description,c=document.createElement('canvas');c.width=256;c.height=Math.round(256*height/width);const ctx=c.getContext('2d');
    ctx.fillStyle='#000';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.beginPath();slot.mask.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x/width*c.width,y/height*c.height));ctx.closePath();ctx.filter='blur(.6px)';ctx.fill();
    const alpha=new T.CanvasTexture(c);alpha.colorSpace=T.NoColorSpace;
    const material=new T.MeshBasicMaterial({map:layer.mesh.material.uniforms.map.value,alphaMap:alpha,transparent:true,depthWrite:false});
    model.cutout=new T.Mesh(new T.PlaneGeometry(width,height),material);model.cutout.position.z=model.z+1.5;model.cutout.renderOrder=model.z+1.5;model.group.add(model.cutout);
   }
  }
 }
 function createModel(slot,guest,mode){
  const model={slot,guest,group:new T.Group(),mode:'seated',distance:0,enterAt:0,t0:0};
  model.companion=createCompanion(T,{character:characterFor(guest.character).id});model.root=model.companion.root;model.group.add(model.root);model.companion.setEnvIntensity(dressing.envIntensity??.6);
  model.contact=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:contactMap,transparent:true,depthWrite:false}));model.group.add(model.contact);
  model.ground=new T.Mesh(new T.PlaneGeometry(3,3),new T.ShadowMaterial({opacity:dressing.shadowOpacity??.3,depthWrite:false}));model.ground.receiveShadow=true;model.group.add(model.ground);
  world.add(model.group);placeModel(model);
  for(let i=0;i<60;i++)model.companion.update({dt:1/30,time:i/30,pose:mode==='walk'?'walk':slot.pose,walking:false,profile:description.profile});
  return model;
 }
 function entryPoint(){const e=dressing.entry||{x:description.width/2,y:description.height-10,scale:80};return e;}
 function setTransform(model,x,y,scale,yaw,z){
  model.root.position.copy(toWorld(x,y));model.root.position.z=z;model.root.scale.setScalar(scale);model.root.quaternion.setFromEuler(new T.Euler(0,yaw,0));
  model.contact.position.set(model.root.position.x,model.root.position.y-3,z-1);model.contact.rotation.z=0;model.contact.scale.set(scale*.8,scale*.17,1);
  model.ground.position.set(model.root.position.x,model.root.position.y,z-.5);model.ground.rotation.set(-(dressing.groundTilt??1.15),0,0);model.ground.scale.setScalar(scale);
 }
 function applyPlacement(model,blend){
  const final=placement(model.slot),slot=model.slot,z=model.z;
  if(blend<1){
   const s=standing(slot),w=toWorld(s.x,s.y),q=new T.Quaternion().setFromEuler(new T.Euler(0,s.yaw,0)),u=smoothstep(0,1,blend);
   model.root.position.lerpVectors(w,final.position,u);model.root.position.z=z;model.root.scale.setScalar(T.MathUtils.lerp(s.scale,final.scale,u));model.root.quaternion.slerpQuaternions(q,final.quaternion,u);
  }else{model.root.position.copy(final.position);model.root.position.z=z;model.root.scale.setScalar(final.scale);model.root.quaternion.copy(final.quaternion);}
  const c=final.contact;model.contact.position.set(c.x,c.y,z-1);model.contact.rotation.z=c.angle;model.contact.scale.set(c.sx,c.sy,1);
  model.ground.position.set(c.x,c.y,z-.5);model.ground.rotation.set(-(dressing.groundTilt??1.15),0,0);model.ground.scale.setScalar(final.scale);
 }
 function beginEnter(model,now,delay=0){
  const s=standing(model.slot),e=entryPoint();
  if((dressing.entryMode||'walk')==='fade'){model.mode='fade';model.t0=now+delay;model.duration=700;return;}
  const distance=Math.hypot(s.x-e.x,s.y-e.y);
  model.mode='walk';model.t0=now+delay;model.from={x:e.x,y:e.y,scale:e.scale};model.to={x:s.x,y:s.y,scale:s.scale,yaw:s.yaw};model.duration=Math.max(900,distance/(1.25*(e.scale+s.scale)/2)*1000);model.yaw=Math.atan2(s.x-e.x,s.y-e.y);model.distance=0;model.lastXY=[e.x,e.y];
 }
 function beginLeave(model,now){
  const s=standing(model.slot),e=entryPoint();
  if((dressing.entryMode||'walk')==='fade'){model.mode='fadeOut';model.t0=now;model.duration=600;return;}
  model.mode='unsettle';model.t0=now;model.duration=650;model.from={x:s.x,y:s.y,scale:s.scale};model.to={x:e.x,y:e.y,scale:e.scale};model.walkDuration=Math.max(900,Math.hypot(s.x-e.x,s.y-e.y)/(1.25*(e.scale+s.scale)/2)*1000);model.yaw=Math.atan2(e.x-s.x,e.y-s.y);model.distance=0;model.lastXY=[s.x,s.y];
 }
 const surfaceFor=()=>description.profile==='forest'?'dirt':description.profile==='coastLounge'?'wood':'stone';
 const panFor=model=>(model.root.position.x/description.width)*1.4;
 function drainSteps(model){for(const event of model.companion.root.userData.events.splice(0))if(event.type==='footfall'&&audio)audio.footstep(surfaceFor(),{gain:.25+.4*event.strength,pan:panFor(model),rate:1.02+Math.random()*.1});}
 function advance(model,now,dt,time){
  const slot=model.slot,profile=description.profile;
  const idleTime=time+description.seats.indexOf(slot)*.9;
  if(model.mode==='walk'||model.mode==='walkOut'){
   if(now<model.t0){model.root.visible=model.contact.visible=model.ground.visible=false;model.companion.update({dt,time:idleTime,pose:'walk',walking:false,profile});return false;}
   model.root.visible=model.contact.visible=model.ground.visible=true;
   const u=T.MathUtils.clamp((now-model.t0)/model.duration,0,1),e=u<.15?u/.15:u>.85?(1-u)/.15:1;
   const x=T.MathUtils.lerp(model.from.x,model.to.x,u),y=T.MathUtils.lerp(model.from.y,model.to.y,u),scale=T.MathUtils.lerp(model.from.scale,model.to.scale,u);
   const step=Math.hypot(x-model.lastXY[0],y-model.lastXY[1]);model.lastXY=[x,y];model.distance+=step/scale;
   const yaw=u>.92&&model.mode==='walk'?T.MathUtils.lerp(model.yaw,model.to.yaw,(u-.92)/.08):model.yaw;
   setTransform(model,x,y,scale,yaw,model.z);
   model.companion.update({dt,time:idleTime,pose:'walk',walking:u<1,distance:model.distance,speed:dt>0?step/scale/dt*e:0,profile});drainSteps(model);
   if(u>=1){if(model.mode==='walk'){model.mode='settle';model.t0=now;model.duration=slot.pose==='lie'?900:550;audio?.foley(slot.pose==='lie'?'hammock':'rustle',{pan:panFor(model)});}else return true;}
   return false;
  }
  if(model.mode==='settle'){
   const u=T.MathUtils.clamp((now-model.t0)/model.duration,0,1);
   model.companion.update({dt,time:idleTime,pose:slot.pose,walking:false,profile});applyPlacement(model,u);
   if(u>=1){model.mode='seated';model.nextCreak=now+6000+Math.random()*9000;}return false;
  }
  if(model.mode==='unsettle'){
   const u=T.MathUtils.clamp((now-model.t0)/model.duration,0,1);if(!model.rustled){model.rustled=true;audio?.foley('rustle',{pan:panFor(model),gain:.8});}
   model.companion.update({dt,time:idleTime,pose:'walk',walking:false,profile});applyPlacement(model,1-u);
   if(u>=1){model.mode='walkOut';model.t0=now;model.duration=model.walkDuration;}return false;
  }
  if(model.mode==='fade'||model.mode==='fadeOut'){
   const u=T.MathUtils.clamp((now-model.t0)/model.duration,0,1),k=model.mode==='fade'?u:1-u,pop=k<1?1-Math.pow(1-k,3):1;
   model.companion.update({dt,time:idleTime,pose:slot.pose,walking:false,profile});applyPlacement(model,1);
   model.root.visible=model.contact.visible=model.ground.visible=k>.02;model.root.scale.multiplyScalar(Math.max(.01,pop));model.root.position.y+=(1-pop)*model.root.scale.x*.6;
   if(u>=1){if(model.mode==='fade'){model.mode='seated';model.nextCreak=now+6000+Math.random()*9000;audio?.foley('splash',{pan:panFor(model),gain:.7});}else return true;}return false;
  }
  model.companion.update({dt,time:idleTime,pose:slot.pose,walking:false,profile});applyPlacement(model,1);model.companion.root.userData.events.length=0;
  if(slot.pose==='lie'&&model.nextCreak&&now>model.nextCreak&&description.profile!=='coastPaddles'){model.nextCreak=now+9000+Math.random()*12000;audio?.foley('creak',{pan:panFor(model),gain:.6});}
  return false;
 }
 function tick(now){
  if(!active)return;const dt=Math.min(.05,(now-last)/1000);last=now;const time=now/1000;
  if(sceneReady&&description){
   const {width}=description,A=(dressing.drift??.006)*width;
   const dx=Math.sin(time*2*Math.PI/27)*A,dy=Math.cos(time*2*Math.PI/41)*A*.6,zoom=1+(dressing.zoom??.012)*(.5+.5*Math.sin(time*2*Math.PI/53));
   camera.position.x=dx;camera.position.y=dy;camera.zoom=zoom;camera.updateProjectionMatrix();
   for(const l of layers){l.mesh.material.uniforms.time.value=time;l.mesh.position.x=dx*(1-l.parallax);l.mesh.position.y=dy*(1-l.parallax);const s=1+(zoom-1)*(l.parallax-1);l.mesh.scale.set(s,s,1);}
   for(const model of models.values()){advance(model,now,dt,time);const p=model.parallax??1,s=1+(zoom-1)*(p-1);model.group.position.set(dx*(1-p),dy*(1-p),0);model.group.scale.set(s,s,1);}
   for(let i=leaving.length-1;i>=0;i--){const model=leaving[i];if(advance(model,now,dt,time)){disposeModel(model);leaving.splice(i,1);}else{const p=model.parallax??1,s=1+(zoom-1)*(p-1);model.group.position.set(dx*(1-p),dy*(1-p),0);model.group.scale.set(s,s,1);}}
   if(onOverlay){const positions=new Map(),v=new T.Vector3();for(const[id,model]of models){if(!model.root.visible){positions.set(id,{x:0,y:0,scale:1,visible:false});continue;}const lift=model.slot.pose==='lie'&&model.mode==='seated'?.75:1.32;v.copy(model.root.position);v.y+=model.root.scale.x*lift;v.multiply(model.group.scale).add(model.group.position);v.project(camera);positions.set(id,{x:(v.x+1)*50,y:(1-v.y)*50,scale:T.MathUtils.clamp(.55+model.root.scale.x/150,.85,1.15),visible:true});}onOverlay(positions);}
   post.uniforms.time.value=time;
   renderer.setRenderTarget(target);renderer.setClearColor(0,0);renderer.clear();renderer.render(world,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
  }
  frame=requestAnimationFrame(tick);
 }
 return{
  scene(value){
   description=value;dressing=value.dressing||{};generation++;sceneReady=false;renderer.domElement.style.visibility='hidden';field.style.backgroundImage=`url("${value.background}")`;
   fitCamera();foreground.replaceChildren();
   for(const model of models.values())disposeModel(model);models.clear();for(const model of leaving)disposeModel(model);leaving.length=0;
   this.fresh=true;buildScene(value,generation).catch(error=>console.warn('쉼터 장면 준비 실패',error));
  },
  occupants(occupants,{self=null,stagger=false}={}){
   if(!description)return;const now=performance.now();let order=0;
   for(const[id,model]of models)if(!occupants[id]){models.delete(id);if(this.fresh||!sceneReady){disposeModel(model);}else{beginLeave(model,now);leaving.push(model);}}
   for(const slot of description.seats){const guest=occupants[slot.id];if(!guest)continue;
    let model=models.get(slot.id);
    if(!model){
     const arriving=!this.fresh||guest.uid===self||stagger;
     model=createModel(slot,guest,arriving?'walk':'seat');models.set(slot.id,model);
     if(arriving)beginEnter(model,now,stagger?order++*700:0);else applyPlacement(model,1);
    }else if(model.companion.root.userData.character!==characterFor(guest.character).id)model.companion.setCharacter(guest.character);
    model.guest=guest;
   }
   this.fresh=false;
  },
  project(x,y){if(!description)return null;const v=new T.Vector3(x-description.width/2,description.height/2-y,0).project(camera);return{x:(v.x+1)*50,y:(1-v.y)*50};},
  start(){if(active)return;active=true;last=performance.now();frame=requestAnimationFrame(tick);},
  stop(){active=false;cancelAnimationFrame(frame);}
 };
}

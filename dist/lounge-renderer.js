import * as T from './vendor/three.module.js';
import {createCompanion,preloadCompanionAssets} from './companion.js?v=nature-14';
import {characterFor} from './characters.js';
import {roomView} from './mobile-retreat-layout.js';

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
 // Water: a slow swell (large, travelling) plus finer ripples, both as UV displacement.
 float swell=sin(vUv.y*18.-time*.9+noise(vUv*vec2(3.,5.))*2.5);
 vec2 ripple=vec2(noise(uv*vec2(40.,90.)+vec2(time*.3,time*.7)),noise(uv*vec2(70.,100.)-vec2(time*.25,time*.6)))-.5;
 uv+=(ripple*5.5+vec2(0.,swell*2.2))*texel*w;
 // Foliage: gusts travel across the canopy; displacement grows toward the top of the image.
 float g=m.g*sway*mix(swayBottom,swayTop,vUv.y);
 float gust=sin(time*.8+vUv.x*7.+noise(vUv*4.+time*.12)*5.)*.6+(noise(vUv*18.+vec2(time*.5,time*.7))-.5)*1.2;
 uv+=vec2(gust,gust*.45)*texel*4.5*g;
 vec4 c=texture2D(map,uv);
 // Glints: sparse, clustered where a slow large-scale field peaks, so the sea twinkles instead of snowing.
 float cluster=noise(vUv*vec2(9.,14.)+vec2(time*.05,time*.04));cluster=smoothstep(.55,.9,cluster);
 float sp=noise(vUv*vec2(420.,900.)+vec2(time*1.3,-time*.9));
 sp=smoothstep(.88,.98,sp)*cluster*(.6+.4*sin(time*6.+vUv.x*300.));
 c.rgb+=sp*w*.45*vec3(1.,.98,.9);
 c.rgb*=1.+w*.10*(swell*.6+.4*sin(vUv.y*42.-time*1.3+noise(vUv*9.)*3.));
 float dap=noise(vUv*vec2(14.,10.)+vec2(time*.12,time*.08));
 c.rgb*=1.+(dap-.5)*dapple*m.g+gust*.025*g;
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
// Bands sit far apart in z so a body turned into the scene never cuts through a photo layer.
const BAND_Z={far:120,mid:320,near:520},LAYER_Z={far:0,mid:200,near:400},CUTOUT_Z=110;
const X_AXIS=new T.Vector3(1,0,0),Y_AXIS=new T.Vector3(0,1,0);
// Lying seats, per scene: how far the back is raised and how much the chest turns to the camera.
const RECLINE={forest:.2,coastHammocks:.2,coastLounge:.42,coastPaddles:0},ROLL={forest:.5,coastHammocks:.5,coastLounge:.3,coastPaddles:.15};
const DEBUG=new URLSearchParams(location.search).has('loungeDebug');
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
 function fitCamera(){if(!description)return;const r=field.getBoundingClientRect();if(!r.width||!r.height)return;const{vw,vh}=roomView(description.width,description.height,r.width,r.height,description.fit||'cover');camera.left=-vw/2;camera.right=vw/2;camera.top=vh/2;camera.bottom=-vh/2;camera.updateProjectionMatrix();}
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
 function bandAt(x,y){if(!depthSampler||!meta)return'far';const v=depthSampler(x,y);return v>=meta.bands[0]?'near':v>=meta.bands[1]?'mid':'far';}
 function bandFor(slot){return bandAt(...(slot.pose==='lie'?[(slot.head[0]+slot.feet[0])/2,(slot.head[1]+slot.feet[1])/2]:slot.anchor));}
 // While walking, the depth under the feet decides which photo layers pass in front of the guest.
 const zAt=(x,y)=>BAND_Z[bandAt(x,y)]+y/description.height*40;
 // ---- Seat geometry ---------------------------------------------------------------------
 // Furniture faces every which way from photo to photo, so poses live in a ground frame
 // (y = ground normal, -z = away from the camera) tilted by the photo's look-down angle.
 // A lying seat is just its head and feet points in the photo: the body's true length and its
 // heading into the scene are solved so the reclined, foreshortened body spans that line.
 const elevation=()=>dressing.elevation??(Math.PI/2-(dressing.groundTilt??1.15));
 const upright=yaw=>new T.Quaternion().setFromAxisAngle(X_AXIS,elevation()).multiply(new T.Quaternion().setFromAxisAngle(Y_AXIS,yaw));
 function lieFrame(slot){
  const e=elevation();if(slot._frame?.e===e&&slot._frame.profile===description.profile)return slot._frame;
  const [hx,hy]=slot.head,[fx,fy]=slot.feet,sx=hx-fx,sy=fy-hy,p=Math.hypot(sx,sy),se=Math.max(.2,Math.sin(e)),ce=Math.cos(e);
  let rho=slot.recline??RECLINE[description.profile]??.2,L=null;
  for(let tries=0;tries<6&&L===null;tries++){
   const c=Math.cos(rho),s=Math.sin(rho),f=len=>(sx/(len*c))**2+((sy/len-s*ce)/(c*se))**2-1;let lo=p*.5,hi=p*8;
   if(f(lo)>0&&f(hi)<0){for(let i=0;i<48;i++){const m=(lo+hi)/2;if(f(m)>0)lo=m;else hi=m;}L=(lo+hi)/2;}else rho*=.5;
  }
  if(L===null){rho=0;L=Math.hypot(sx,sy/se);}
  const c=Math.cos(rho),s=Math.sin(rho),ca=T.MathUtils.clamp(sx/(L*c),-1,1),sa=T.MathUtils.clamp((sy/L-s*ce)/(c*se),-1,1);
  const d=new T.Vector3(c*ca,s,-c*sa).normalize(),n0=new T.Vector3(0,1,0).addScaledVector(d,-d.y).normalize();
  // Roll the chest a little toward the camera, as people lie in a hammock or on a lounger.
  const side=new T.Vector3().crossVectors(d,n0),roll=(slot.roll??ROLL[description.profile]??.4)*(Math.sign(side.dot(new T.Vector3(0,Math.sin(e),Math.cos(e))))||1);
  const n=n0.clone().multiplyScalar(Math.cos(roll)).addScaledVector(side,Math.sin(roll)).normalize(),x=new T.Vector3().crossVectors(d,n);
  const quaternion=new T.Quaternion().setFromAxisAngle(X_AXIS,e).multiply(new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,d,n)));
  return slot._frame={e,profile:description.profile,quaternion,scale:slot.scale??L/1.16*slot.fit,recline:rho,heading:Math.atan2(sa,ca),projected:p};
 }
 const key=(x,y,scale,quaternion)=>({position:toWorld(x,y),scale,quaternion});
 function finalKey(slot){
  if(slot.pose==='lie'){
   const f=lieFrame(slot),centre=slot.align==='center',[hx,hy]=slot.head,[fx,fy]=slot.feet;
   const at=centre?toWorld((hx+fx)/2,(hy+fy)/2):toWorld(hx,hy),offset=new T.Vector3(0,centre?.59:1.18,0).applyQuaternion(f.quaternion).multiplyScalar(f.scale);
   return{position:at.sub(offset).setZ(0),quaternion:f.quaternion,scale:f.scale};
  }
  return key(slot.anchor[0],slot.anchor[1]+.365*slot.scale,slot.scale,upright(slot.yaw||0));
 }
 // A lying seat is entered by sitting on its middle first, turned a little toward the feet end.
 function perchKey(slot){
  const f=lieFrame(slot),[hx,hy]=slot.head,[fx,fy]=slot.feet,mx=fx+(hx-fx)*.45,my=fy+(hy-fy)*.45;
  return key(mx,my+.365*f.scale,f.scale,upright(Math.sign(fx-hx||1)*.4));
 }
 // Where the guest stops walking: just in front of a chair, or beside the middle of a bed/hammock.
 function standKey(slot){
  if(slot.stand)return key(slot.stand[0],slot.stand[1],slot.stand[2]??(slot.pose==='lie'?lieFrame(slot).scale:slot.scale),upright(slot.stand[3]??0));
  const base=slot.pose==='lie'?perchKey(slot):finalKey(slot);
  return{position:base.position.clone().add(new T.Vector3(0,-.16*base.scale,0)),scale:base.scale,quaternion:base.quaternion};
 }
 const keyYaw=k=>new T.Euler().setFromQuaternion(new T.Quaternion().setFromAxisAngle(X_AXIS,-elevation()).multiply(k.quaternion),'YXZ').y;
 function headPoint(slot){const k=finalKey(slot);return k.position.clone().add(new T.Vector3(0,1.18,0).applyQuaternion(k.quaternion).multiplyScalar(k.scale));}
 function contactFor(slot,scale){
  const {width,height}=description;
  if(slot.pose==='lie'){const [hx,hy]=slot.head,[fx,fy]=slot.feet,f=lieFrame(slot);return{x:hx+(fx-hx)*slot.fit*.43-width/2,y:height/2-hy-(fy-hy)*slot.fit*.43-3,angle:Math.atan2(fy-hy,hx-fx)-Math.PI/2,sx:f.scale*.55,sy:f.projected*slot.fit*1.25};}
  return{x:slot.anchor[0]-width/2,y:height/2-slot.anchor[1]-3,angle:0,sx:scale*.8,sy:scale*.17};
 }
 function toWorld(x,y){return new T.Vector3(x-description.width/2,description.height/2-y,0);}
 function placeModel(model){
  const slot=model.slot,band=bandFor(slot);model.band=band;model.parallax=(meta?.parallax||[1,1,1])[band==='near'?0:band==='mid'?1:2];
  const within=slot.pose==='lie'?(slot.head[1]+slot.feet[1])/2:slot.anchor[1];
  model.z=model.seatZ=BAND_Z[band]+within/description.height*40;
  // Hammock cloth in front of the body: a cut-out of the layer that holds the seat.
  if(model.cutout){model.group.remove(model.cutout);model.cutout.geometry.dispose();model.cutout.material.dispose();model.cutout=null;}
  if(slot.mask){
   const layer=layers.find(l=>l.band===band)||layers[0];
   if(layer){
    const {width,height}=description,c=document.createElement('canvas');c.width=256;c.height=Math.round(256*height/width);const ctx=c.getContext('2d');
    ctx.fillStyle='#000';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.beginPath();slot.mask.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x/width*c.width,y/height*c.height));ctx.closePath();ctx.filter='blur(.6px)';ctx.fill();
    const alpha=new T.CanvasTexture(c);alpha.colorSpace=T.NoColorSpace;
    const material=new T.MeshBasicMaterial({map:layer.mesh.material.uniforms.map.value,alphaMap:alpha,transparent:true,depthWrite:false});
    model.cutout=new T.Mesh(new T.PlaneGeometry(width,height),material);model.cutout.position.z=model.z+CUTOUT_Z;model.cutout.renderOrder=model.z+CUTOUT_Z;model.group.add(model.cutout);
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
 // Shadows under the feet while walking, standing or turning.
 function footShadows(model,scale){
  const z=model.z,p=model.root.position;
  model.contact.position.set(p.x,p.y-3,z-1);model.contact.rotation.z=0;model.contact.scale.set(scale*.8,scale*.17,1);
  model.ground.position.set(p.x,p.y,z-.5);model.ground.rotation.set(-(dressing.groundTilt??1.15),0,0);model.ground.scale.setScalar(scale);
 }
 function setTransform(model,x,y,scale,yaw){
  model.z=zAt(x,y);model.root.position.copy(toWorld(x,y));model.root.position.z=model.z;model.root.scale.setScalar(scale);model.root.quaternion.copy(upright(yaw));footShadows(model,scale);
 }
 function applyKey(model,k){model.root.position.set(k.position.x,k.position.y,model.z);model.root.scale.setScalar(k.scale);model.root.quaternion.copy(k.quaternion);}
 function blendKeys(a,b,u){return{position:a.position.clone().lerp(b.position,u),scale:T.MathUtils.lerp(a.scale,b.scale,u),quaternion:a.quaternion.clone().slerp(b.quaternion,u)};}
 // At rest: the final pose plus the contact shadow under the furniture.
 function applyPlacement(model){
  const final=finalKey(model.slot);applyKey(model,final);
  const c=contactFor(model.slot,final.scale),z=model.z;model.contact.position.set(c.x,c.y,z-1);model.contact.rotation.z=c.angle;model.contact.scale.set(c.sx,c.sy,1);
  model.ground.position.set(c.x,c.y,z-.5);model.ground.rotation.set(-(dressing.groundTilt??1.15),0,0);model.ground.scale.setScalar(final.scale);
 }
 // The furniture's contact shadow takes over from the foot shadow during the last settle step.
 function blendShadows(model,u){
  const final=finalKey(model.slot),c=contactFor(model.slot,final.scale),z=model.z,p=model.root.position,k=smoothstep(0,1,u),s=model.root.scale.x;
  model.contact.position.set(T.MathUtils.lerp(p.x,c.x,k),T.MathUtils.lerp(p.y-3,c.y,k),z-1);model.contact.rotation.z=c.angle*k;model.contact.scale.set(T.MathUtils.lerp(s*.8,c.sx,k),T.MathUtils.lerp(s*.17,c.sy,k),1);
  model.ground.position.set(T.MathUtils.lerp(p.x,c.x,k),T.MathUtils.lerp(p.y,c.y,k),z-.5);model.ground.rotation.set(-(dressing.groundTilt??1.15),0,0);model.ground.scale.setScalar(final.scale);
 }
 // Settling is a short chain of key poses, with the companion's pose driving the limbs:
 // chair: stand -> sit. Hammock, lounger, board: stand -> perch on the middle -> lie back.
 function settleSegments(slot){
  const stand=standKey(slot),final=finalKey(slot);
  if(slot.pose!=='lie')return[{from:stand,to:final,duration:650,pose:'sit'}];
  const perch=perchKey(slot);return[{from:stand,to:perch,duration:600,pose:'sit'},{from:perch,to:final,duration:1000,pose:'lie'}];
 }
 // Walking route: entry -> optional approach waypoints (photo px) -> the stand point.
 function routeOf(slot,e){
  const s=standKey(slot),end=[s.position.x+description.width/2,description.height/2-s.position.y],trail=dressing.trail;
  if(slot.approach||!trail)return[[e.x,e.y],...(slot.approach||[]),end];
  let best={d:Infinity,i:0,p:trail[0]};
  for(let i=1;i<trail.length;i++){
   const a=trail[i-1],b=trail[i],dx=b[0]-a[0],dy=b[1]-a[1],t=T.MathUtils.clamp(((end[0]-a[0])*dx+(end[1]-a[1])*dy)/(dx*dx+dy*dy||1),0,1),p=[a[0]+dx*t,a[1]+dy*t],d=Math.hypot(end[0]-p[0],end[1]-p[1]);
   if(d<best.d)best={d,i,p};
  }
  return[...trail.slice(0,best.i),best.p,end];
 }
 function routeLength(points){let total=0;for(let i=1;i<points.length;i++)total+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);return total;}
 function alongRoute(points,u){
  let left=u*routeLength(points);
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(left<=len||i===points.length-1){const t=len?Math.min(1,left/len):1;return{x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,yaw:Math.atan2(b[0]-a[0],b[1]-a[1])};}left-=len;}
  return{x:points[0][0],y:points[0][1],yaw:0};
 }
 // Scale follows perspective: interpolate by depth (image y) when the route has any.
 function routeScale(model,y,u){const a=model.from,b=model.to,span=b.y-a.y;return Math.abs(span)>description.height*.04?T.MathUtils.lerp(a.scale,b.scale,T.MathUtils.clamp((y-a.y)/span,0,1)):T.MathUtils.lerp(a.scale,b.scale,u);}
 const walkTime=(route,a,b)=>Math.max(900,routeLength(route)/(1.25*(a+b)/2)*1000);
 function beginEnter(model,now,delay=0){
  const e=entryPoint();
  if((dressing.entryMode||'walk')==='fade'){model.mode='fade';model.t0=now+delay;model.duration=700;return;}
  const s=standKey(model.slot),route=routeOf(model.slot,e),end=route[route.length-1];
  model.mode='walk';model.t0=now+delay;model.route=route;model.from={x:e.x,y:e.y,scale:e.scale};model.to={x:end[0],y:end[1],scale:s.scale,yaw:keyYaw(s)};
  model.duration=walkTime(route,e.scale,s.scale);model.yaw=alongRoute(route,0).yaw;model.distance=0;model.lastXY=[e.x,e.y];
 }
 function beginLeave(model,now){
  const e=entryPoint();
  if((dressing.entryMode||'walk')==='fade'){model.mode='fadeOut';model.t0=now;model.duration=600;return;}
  const s=standKey(model.slot),route=routeOf(model.slot,e).reverse(),start=route[0];
  model.segments=settleSegments(model.slot).reverse().map(seg=>({from:seg.to,to:seg.from,duration:seg.duration*.85,pose:seg.pose==='lie'?'sit':'walk'}));model.segment=0;
  model.mode='unsettle';model.t0=now;model.route=route;model.from={x:start[0],y:start[1],scale:s.scale};model.to={x:e.x,y:e.y,scale:e.scale};
  model.walkDuration=walkTime(route,s.scale,e.scale);model.distance=0;model.lastXY=[start[0],start[1]];
 }
 const surfaceFor=()=>description.profile==='forest'?'dirt':description.profile==='coastLounge'?'wood':'stone';
 const panFor=model=>(model.root.position.x/description.width)*1.4;
 function drainSteps(model){for(const event of model.companion.root.userData.events.splice(0))if(event.type==='footfall'&&audio)audio.footstep(surfaceFor(),{gain:.25+.4*event.strength,pan:panFor(model),rate:1.02+Math.random()*.1});}
 const turnBy=(from,to)=>{let d=(to-from)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d;};
 const turnTime=(a,b)=>Math.max(250,Math.abs(turnBy(a,b))/Math.PI*900);
 function advance(model,now,dt,time){
  const slot=model.slot,profile=description.profile;
  const idleTime=time+description.seats.indexOf(slot)*.9;
  if(model.mode==='walk'||model.mode==='walkOut'){
   if(now<model.t0){model.root.visible=model.contact.visible=model.ground.visible=false;model.companion.update({dt,time:idleTime,pose:'walk',walking:false,profile});return false;}
   model.root.visible=model.contact.visible=model.ground.visible=true;
   const u=T.MathUtils.clamp((now-model.t0)/model.duration,0,1),e=u<.15?u/.15:u>.85?(1-u)/.15:1;
   const at=alongRoute(model.route,u),scale=routeScale(model,at.y,u);
   const step=Math.hypot(at.x-model.lastXY[0],at.y-model.lastXY[1]);model.lastXY=[at.x,at.y];model.distance+=step/scale;
   // The heading eases into each leg of the route instead of snapping at the corners.
   model.yaw+=turnBy(model.yaw,at.yaw)*Math.min(1,dt*7);
   setTransform(model,at.x,at.y,scale,model.yaw);
   model.companion.update({dt,time:idleTime,pose:'walk',walking:u<1,distance:model.distance,speed:dt>0?step/scale/dt*e:0,profile});drainSteps(model);
   if(u>=1){if(model.mode==='walk'){model.mode='turn';model.t0=now;model.turnFrom=model.yaw;model.turnTo=model.to.yaw;model.duration=turnTime(model.yaw,model.to.yaw);}else return true;}
   return false;
  }
  if(model.mode==='turn'||model.mode==='turnOut'){
   // Turning on the spot with small steps, to put the back to the seat (or face the way out).
   const u=T.MathUtils.clamp((now-model.t0)/model.duration,0,1),yaw=model.turnFrom+turnBy(model.turnFrom,model.turnTo)*smoothstep(0,1,u);
   const p=model.mode==='turn'?model.to:model.from;setTransform(model,p.x,p.y,p.scale,yaw);model.yaw=yaw;
   model.distance+=Math.abs(turnBy(model.turnFrom,model.turnTo))*dt/(model.duration/1000)*.25;
   model.companion.update({dt,time:idleTime,pose:'walk',walking:u<1,distance:model.distance,speed:.35,profile});drainSteps(model);
   if(u>=1){
    if(model.mode==='turn'){model.mode='settle';model.z=model.seatZ;model.segments=settleSegments(slot);model.segment=0;model.t0=now;audio?.foley(slot.pose==='lie'?'hammock':'rustle',{pan:panFor(model)});}
    else{model.mode='walkOut';model.t0=now;model.duration=model.walkDuration;}
   }
   return false;
  }
  if(model.mode==='settle'||model.mode==='unsettle'){
   const seg=model.segments[model.segment],u=T.MathUtils.clamp((now-model.t0)/seg.duration,0,1);
   if(model.mode==='unsettle'&&!model.rustled){model.rustled=true;audio?.foley('rustle',{pan:panFor(model),gain:.8});}
   model.companion.update({dt,time:idleTime,pose:seg.pose,walking:false,profile});
   applyKey(model,blendKeys(seg.from,seg.to,smoothstep(0,1,u)));
   const last=model.segments.length-1;
   if(model.mode==='settle'&&model.segment===last)blendShadows(model,u);else if(model.mode==='unsettle'&&model.segment===0)blendShadows(model,1-u);else footShadows(model,model.root.scale.x);
   if(u>=1){
    model.segment++;model.t0=now;
    if(model.segment>last){
     if(model.mode==='settle'){model.mode='seated';model.nextCreak=now+6000+Math.random()*9000;}
     else{model.mode='turnOut';model.turnFrom=keyYaw(standKey(slot));model.turnTo=alongRoute(model.route,0).yaw;model.duration=turnTime(model.turnFrom,model.turnTo);model.yaw=model.turnFrom;}
    }
   }
   return false;
  }
  if(model.mode==='fade'||model.mode==='fadeOut'){
   const u=T.MathUtils.clamp((now-model.t0)/model.duration,0,1),k=model.mode==='fade'?u:1-u,pop=k<1?1-Math.pow(1-k,3):1;
   model.companion.update({dt,time:idleTime,pose:slot.pose,walking:false,profile});applyPlacement(model);
   model.root.visible=model.contact.visible=model.ground.visible=k>.02;model.root.scale.multiplyScalar(Math.max(.01,pop));model.root.position.y+=(1-pop)*model.root.scale.x*.6;
   if(u>=1){if(model.mode==='fade'){model.mode='seated';model.nextCreak=now+6000+Math.random()*9000;audio?.foley(description.profile==='coastPaddles'?'splash':'rustle',{pan:panFor(model),gain:.7});}else return true;}return false;
  }
  model.companion.update({dt,time:idleTime,pose:slot.pose,walking:false,profile});applyPlacement(model);model.companion.root.userData.events.length=0;
  if(slot.pose==='lie'&&model.nextCreak&&now>model.nextCreak&&description.profile!=='coastPaddles'){model.nextCreak=now+9000+Math.random()*12000;audio?.foley('creak',{pan:panFor(model),gain:.6});}
  return false;
 }
 // Seat review (?loungeDebug=1): every seat's geometry drawn over the photo, camera drift off.
 // red = head, blue = feet, green = chair anchor, yellow = stand point, dashed = walking route.
 let debugSvg=null,debugAt=0;
 function drawDebug(){
  if(!description)return;const r=field.getBoundingClientRect(),ns='http://www.w3.org/2000/svg';
  if(!debugSvg){debugSvg=document.createElementNS(ns,'svg');debugSvg.setAttribute('class','lounge-debug');debugSvg.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:6;pointer-events:none;overflow:visible';field.append(debugSvg);}
  debugSvg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);
  const at=(x,y)=>{const v=new T.Vector3(x-description.width/2,description.height/2-y,0).project(camera);return[(v.x+1)/2*r.width,(1-v.y)/2*r.height];};
  const dot=(x,y,c,l='')=>{const[a,b]=at(x,y);return`<circle cx="${a}" cy="${b}" r="4" fill="${c}" stroke="#000" stroke-width="1"/>${l?`<text x="${a+6}" y="${b-6}" fill="#fff" font-size="11" stroke="#000" stroke-width="2.5" paint-order="stroke">${l}</text>`:''}`;};
  const path=pts=>`<polyline points="${pts.map(p=>at(...p).join(',')).join(' ')}" fill="none" stroke="#ffe066" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  const e=entryPoint();let svg=dot(e.x,e.y,'#fff','입구');
  for(const slot of description.seats){
   const s=standKey(slot),stand=[s.position.x+description.width/2,description.height/2-s.position.y];
   if((dressing.entryMode||'walk')!=='fade')svg+=path(routeOf(slot,e));
   svg+=dot(...stand,'#ffe066');
   if(slot.pose==='lie'){const f=lieFrame(slot),[a,b]=at(...slot.head),[c,d]=at(...slot.feet);svg+=`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#fff" stroke-width="2"/>`+dot(...slot.head,'#ff5a5a',`${slot.id} ${slot.name} · 깊이 ${Math.round(f.heading*57.3)}° · 등 ${Math.round(f.recline*57.3)}°`)+dot(...slot.feet,'#5aa0ff');}
   else svg+=dot(...slot.anchor,'#5aff8a',`${slot.id} ${slot.name} · 방향 ${Math.round((slot.yaw||0)*57.3)}°`);
  }
  debugSvg.innerHTML=svg;
  window.__loungeRaw={models,world,camera,layers,renderer,tick};window.__lounge={elevation:elevation()*57.3,camera:[camera.left,camera.right,camera.top,camera.bottom].map(Math.round),layers:layers.map(l=>l.band+':'+l.mesh.position.z),models:[...models.values()].map(m=>({seat:m.slot.id,mode:m.mode,segment:m.segment,pose:m.slot.pose,scale:Math.round(m.root.scale.x),z:Math.round(m.z),at:[Math.round(m.root.position.x),Math.round(m.root.position.y),Math.round(m.root.position.z)],visible:m.root.visible,group:[m.group.position.z,m.group.scale.z]}))};
 }
 function tick(now){
  if(!active)return;const dt=Math.min(.05,(now-last)/1000);last=now;const time=now/1000;
  if(sceneReady&&description){
   const {width}=description,A=DEBUG?0:(dressing.drift??.006)*width;
   const dx=Math.sin(time*2*Math.PI/27)*A,dy=Math.cos(time*2*Math.PI/41)*A*.6,zoom=1+(dressing.zoom??.012)*(.5+.5*Math.sin(time*2*Math.PI/53));
   camera.position.x=dx;camera.position.y=dy;camera.zoom=zoom;camera.updateProjectionMatrix();
   for(const l of layers){l.mesh.material.uniforms.time.value=time;l.mesh.position.x=dx*(1-l.parallax);l.mesh.position.y=dy*(1-l.parallax);const s=1+(zoom-1)*(l.parallax-1);l.mesh.scale.set(s,s,1);}
   for(const model of models.values()){advance(model,now,dt,time);const p=model.parallax??1,s=1+(zoom-1)*(p-1);model.group.position.set(dx*(1-p),dy*(1-p),0);model.group.scale.set(s,s,1);}
   for(let i=leaving.length-1;i>=0;i--){const model=leaving[i];if(advance(model,now,dt,time)){disposeModel(model);leaving.splice(i,1);}else{const p=model.parallax??1,s=1+(zoom-1)*(p-1);model.group.position.set(dx*(1-p),dy*(1-p),0);model.group.scale.set(s,s,1);}}
   if(onOverlay){const positions=new Map(),v=new T.Vector3();for(const[id,model]of models){if(!model.root.visible){positions.set(id,{x:0,y:0,scale:1,visible:false});continue;}if(model.slot.pose==='lie'&&model.mode==='seated'){v.copy(headPoint(model.slot));v.y+=model.root.scale.x*.42;}else{v.copy(model.root.position);v.y+=model.root.scale.x*1.32;}if(description.fit==='contain')v.y+=camera.top*2/Math.max(1,field.clientHeight)*17;v.multiply(model.group.scale).add(model.group.position);v.project(camera);positions.set(id,{x:(v.x+1)*50,y:(1-v.y)*50,scale:T.MathUtils.clamp(.55+model.root.scale.x/150,.85,1.15),visible:true});}onOverlay(positions);}
   if(DEBUG&&now-(debugAt||0)>400){debugAt=now;drawDebug();}
   post.uniforms.time.value=time;
   renderer.setRenderTarget(target);renderer.setClearColor(0,0);renderer.clear();renderer.render(world,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);field.dataset.renderedScene=description.id||description.title;
  }
  frame=requestAnimationFrame(tick);
 }
 return{
  scene(value){
   description=value;delete field.dataset.renderedScene;dressing=value.dressing||{};generation++;sceneReady=false;renderer.domElement.style.visibility='hidden';field.style.backgroundImage=`url("${value.background}")`;
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
     if(arriving)beginEnter(model,now,stagger?order++*700:0);else applyPlacement(model);
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

import { createLounge } from './lounge.js?v=ui-12';
import { attachMedia } from './media-player.js';
import * as THREE from './vendor/three.module.js';
import { CLIPS } from './clips.js';
import { REST_SCENES, COAST_REST_IDS } from './rest-scenes.js';
import {createCompanion,preloadCompanionAssets} from './companion.js?v=nature-8';
import {characterFor,characterIcon,mountCharacterPicker} from './characters.js';
import {createAudio} from './audio.js?v=ui-12';
import {createBgm,NOTE_ICON} from './bgm.js?v=ui-12';
import {createCharacterStage} from './character-stage.js?v=ui-9';
import {createCourseMap,nextCourse} from './course-map.js?v=map-2';

const $ = id => document.getElementById(id), video = $('source');
const PLAY_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',PAUSE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
const audio=createAudio(),bgm=createBgm(audio);
const activeClip=CLIPS.find(clip=>clip.id===new URLSearchParams(location.search).get('clip'))||CLIPS[0];
const isCoast=activeClip.id==='IMG_0575';
// Clips marked `slow` were re-timed to 0.72x offline (every frame real, audio tempo matched),
// so they play at 1x. Older clips still slow down in the browser.
const WALK_RATE=.72,BASE_RATE=activeClip.slow?1:WALK_RATE;
video.defaultPlaybackRate=BASE_RATE;video.playbackRate=BASE_RATE;video.preservesPitch=true;
let selectedCharacter='stone';try{selectedCharacter=characterFor(localStorage.getItem('jejumong-character')).id;}catch{}
const restEntryLabel=isCoast?'바다로 쉬러 가기':'숲으로 쉬러 가기';
$('rest').textContent=$('stay').textContent=restEntryLabel;
let pathTrack=null;
if(activeClip.path){try{const response=await fetch(activeClip.path);if(!response.ok)throw Error('경로 파일 없음');pathTrack=await response.json();if(!Array.isArray(pathTrack.samples)||pathTrack.samples.length<2)throw Error('잘못된 경로 파일');}catch(error){pathTrack=null;showError('이 영상의 길 경로를 불러오지 못했습니다. 1인칭으로 표시합니다.');}}
// 30 fps path: hand anchors carried by the per-frame camera solve, plus ground speed at the feet.
let pathTrack30=null;
if(activeClip.path30){try{const response=await fetch(activeClip.path30);if(!response.ok)throw Error('30fps 경로 없음');pathTrack30=await response.json();if(!Array.isArray(pathTrack30.samples)||pathTrack30.samples.length<2||!pathTrack30.units)throw Error('잘못된 30fps 경로');}catch(error){pathTrack30=null;console.warn('30fps 경로를 불러오지 못해 앵커 경로로 표시합니다.',error);}}
const supportsCharacter=Boolean(activeClip.calibrated&&(pathTrack30||!activeClip.path||pathTrack));
const media=attachMedia(video,activeClip.src,message=>{mediaFailed=true;showMediaNotice(message);});video.poster=activeClip.poster;$('timeline').max=activeClip.duration;$('readout').textContent=`0.00 / ${activeClip.duration.toFixed(2)}초`;
$('stage').style.backgroundImage=`url("${activeClip.poster}")`;
$('stage').style.backgroundSize='cover';
$('sceneLabel').textContent=`${activeClip.file} · ${activeClip.title}`;
$('walkTitle').textContent=activeClip.title+(activeClip.id==='IMG_2207'?'를':'을')+' 걸어요.';
const walkHelp=supportsCharacter?'W / ↑ 전진 · A D / ← → 길 안에서 좌우 이동 · Space 걷기/멈춤':'W / ↑ 걷기 · Space 걷기/멈춤 · 촬영된 경로를 따라 이동';
$('help').textContent=walkHelp;
let renderer, scene, camera, restCamera, character, avatar, shadow,videoTexture;
let hemi,sun,sunDirection,groundShadow,lightProbe,composite,walkDistance=0,walkSpeed=0,frameInfo=null;
const foot2=new THREE.Vector3(),projection2=new THREE.Vector2();
let lastTextureTime=-1;
let entered=false, resting=false, firstPerson=false, comparing=false, held=false, waveUntil=0;
if(!supportsCharacter)firstPerson=true;
let restSceneId=isCoast?'coastLounge':'forest',restScene=REST_SCENES[restSceneId];
let restWidth=restScene.width,restHeight=restScene.height,spots=restScene.spots;
let restPose='stand',restSpot=restScene.entrySpot,savedWalkTime=0;
let restImageReady=true;
let lane=0, laneTarget=0, lastFrame=performance.now(),lastPaintAt=-Infinity;
let restTransition=null,walkStartedAt=-Infinity;
let mediaFailed=false,mediaWaiting=false,mediaWaitTimer,recoveryPosition=null;
function showMediaNotice(message){$('mediaMessage').textContent=message;$('mediaNotice').hidden=resting;}
function clearMediaNotice(){clearTimeout(mediaWaitTimer);mediaFailed=false;mediaWaiting=false;$('mediaNotice').hidden=true;}
function queueMediaNotice(){clearTimeout(mediaWaitTimer);mediaWaitTimer=setTimeout(()=>{if(!resting&&(video.readyState<3||video.seeking)){mediaWaiting=true;showMediaNotice('영상을 불러오는 중입니다. 계속 보이지 않으면 다시 불러오세요.');}},1800);}
function reloadMedia(){
 recoveryPosition=recoveryPosition??(Number.isFinite(video.currentTime)?video.currentTime:0);
 clearMediaNotice();showMediaNotice('멈춘 위치의 영상을 다시 불러오는 중입니다.');video.pause();media.reload();queueMediaNotice();
}
const keys=new Set(), ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const ray=new THREE.Raycaster(), foot=new THREE.Vector3(), projection=new THREE.Vector2();
// Hand-fitted bridge center / horizon from this clip. This is not an automatic camera solve.
const framing=[[0,.515,.525],[1,.555,.535],[2,.560,.550],[3,.490,.535],[4,.505,.550],[5,.515,.545],[6,.490,.550],[7,.550,.535],[8,.520,.550],[9,.520,.555],[10,.535,.555],[11.56,.530,.550]];
function sample(time){let n=0;while(n<framing.length-2&&time>framing[n+1][0])n++;const a=framing[n],b=framing[n+1],p=THREE.MathUtils.clamp((time-a[0])/(b[0]-a[0]),0,1);return[THREE.MathUtils.lerp(a[1],b[1],p),THREE.MathUtils.lerp(a[2],b[2],p)];}
function samplePath(time){
 if(pathTrack30){
  const rows=pathTrack30.samples,u=pathTrack30.units,f=THREE.MathUtils.clamp(time*pathTrack30.fps,0,rows.length-1),i=Math.floor(f),j=Math.min(rows.length-1,i+1),p=f-i,a=rows[i],b=rows[j];
  const mix=(k,scale)=>THREE.MathUtils.lerp(a[k],b[k],p)/scale;
  return{x:mix(0,u.x),y:mix(1,u.y),visibility:mix(2,u.v),speed:mix(3,u.speed),scale:pathTrack30.scale,laneWidth:pathTrack30.laneWidth,refined:true};
 }
 if(!pathTrack)return null;
 // Anchor paths are keyed in the original clip's seconds.
 const t=activeClip.slow?time*WALK_RATE:time;
 const rows=pathTrack.samples,n=Math.max(0,Math.min(rows.length-2,Math.floor(t*pathTrack.fps))),a=rows[n],b=rows[n+1],p=THREE.MathUtils.clamp((t-a[0])/(b[0]-a[0]),0,1);
 return{x:THREE.MathUtils.lerp(a[1],b[1],p),y:THREE.MathUtils.lerp(a[2],b[2],p),visibility:THREE.MathUtils.lerp(a[3],b[3],p),speed:null,scale:pathTrack.scale,laneWidth:pathTrack.laneWidth,refined:false};
}
// Precise media time: the presented frame's time plus the elapsed wall clock since it was presented.
if('requestVideoFrameCallback' in video){const onFrame=(now,meta)=>{frameInfo={mediaTime:meta.mediaTime,at:now};video.requestVideoFrameCallback(onFrame);};video.requestVideoFrameCallback(onFrame);}
function mediaTime(now){
 if(frameInfo&&!video.paused&&!video.seeking&&!video.ended&&Math.abs(frameInfo.mediaTime-video.currentTime)<.3)return Math.min(frameInfo.mediaTime+Math.max(0,now-frameInfo.at)/1000*video.playbackRate,Number.isFinite(video.duration)?video.duration:Infinity);
 return video.currentTime;
}
// Samples the footage to light the character: sky and ground colours feed the hemisphere light,
// the frame's overall tone tints the sun, and a blurred copy becomes the reflection environment.
function createLightProbe(){
 const w=32,h=18,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const env=document.createElement('canvas');env.width=64;env.height=32;const ectx=env.getContext('2d');
 const envTexture=new THREE.CanvasTexture(env);envTexture.colorSpace=THREE.SRGBColorSpace;envTexture.mapping=THREE.EquirectangularReflectionMapping;
 const pmrem=new THREE.PMREMGenerator(renderer);let target=null,lastSample=-1,lastEnv=-1;
 const sky=new THREE.Color(),ground=new THREE.Color(),tint=new THREE.Color(),hsl={h:0,s:0,l:0};
 const baseSun=sun.color.clone(),baseSunIntensity=sun.intensity,baseHemi=hemi.intensity;
 const lum=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
 return{update(now){
  if(video.readyState<2||now-lastSample<100)return;lastSample=now;
  let data;try{ctx.drawImage(video,0,0,w,h);data=ctx.getImageData(0,0,w,h).data;}catch{return;}
  const avg=(y0,y1)=>{let r=0,g=0,b=0,n=0;for(let y=y0;y<y1;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;r+=data[i];g+=data[i+1];b+=data[i+2];n++;}return[r/n/255,g/n/255,b/n/255];};
  const top=avg(0,Math.floor(h*.35)),bottom=avg(Math.floor(h*.65),h),mid=avg(Math.floor(h*.3),Math.floor(h*.7));
  sky.setRGB(top[0],top[1],top[2],THREE.SRGBColorSpace);ground.setRGB(bottom[0],bottom[1],bottom[2],THREE.SRGBColorSpace);
  sky.getHSL(hsl);sky.setHSL(hsl.h,Math.min(1,hsl.s*1.15),Math.min(1,hsl.l*1.05+.08));
  ground.getHSL(hsl);ground.setHSL(hsl.h,Math.min(1,hsl.s*1.1),Math.min(1,hsl.l*.95+.06));
  hemi.color.copy(sky);hemi.groundColor.copy(ground);
  const exposure=THREE.MathUtils.clamp(.55+lum(mid)*.9,.6,1.35);
  hemi.intensity=baseHemi*exposure;
  tint.setRGB(mid[0],mid[1],mid[2],THREE.SRGBColorSpace);tint.getHSL(hsl);tint.setHSL(hsl.h,Math.min(.5,hsl.s*.6),.78);
  sun.color.copy(baseSun).lerp(tint,.35);sun.intensity=baseSunIntensity*exposure;
  if(now-lastEnv>400){
   lastEnv=now;ectx.filter='blur(2px)';ectx.drawImage(video,0,0,64,32);ectx.filter='none';
   ectx.fillStyle=`rgba(${Math.round(top[0]*255)},${Math.round(top[1]*255)},${Math.round(top[2]*255)},.6)`;ectx.fillRect(0,0,64,8);
   ectx.fillStyle=`rgba(${Math.round(bottom[0]*255)},${Math.round(bottom[1]*255)},${Math.round(bottom[2]*255)},.6)`;ectx.fillRect(0,24,64,8);
   envTexture.needsUpdate=true;const next=pmrem.fromEquirectangular(envTexture);if(target)target.dispose();target=next;scene.environment=target.texture;
  }
 }};
}
// Final composite: footage + character layer. The layer is softened to the footage's sharpness,
// scene colour wraps into its edges, and grain, vignette and a light grade are shared by both.
function createComposite(look){
 const size=new THREE.Vector2();renderer.getDrawingBufferSize(size);
 const target=new THREE.WebGLRenderTarget(Math.max(2,size.x),Math.max(2,size.y),{samples:4,depthBuffer:true});
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{video:{value:videoTexture},layer:{value:target.texture},resolution:{value:new THREE.Vector2(size.x,size.y)},time:{value:0},softness:{value:look.softness??.8},grain:{value:look.grain??.035},vignette:{value:look.vignette??.22},contrast:{value:look.contrast??1.03},saturation:{value:look.saturation??1.04},lift:{value:look.lift??0},wrap:{value:look.wrap??.5},sharpen:{value:look.sharpen??.55},fit:{value:new THREE.Vector4(1,1,0,0)},showLayer:{value:1}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`precision highp float;uniform sampler2D video,layer;uniform vec2 resolution;uniform float time,softness,grain,vignette,contrast,saturation,lift,wrap,showLayer,sharpen;uniform vec4 fit;varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  // three.js uploads video textures without hardware sRGB decoding, so decode here before mixing in linear light.
  vec3 srgbToLinear(vec3 c){return mix(pow((c+.055)/1.055,vec3(2.4)),c/12.92,vec3(lessThanEqual(c,vec3(.04045))));}
  vec3 videoAt(vec2 p){return srgbToLinear(texture2D(video,clamp(p,0.,1.)).rgb);}
  void main(){
   vec2 uv=vUv,px=1./resolution,vuv=clamp(uv*fit.xy+fit.zw,0.,1.);
   vec3 bg=videoAt(vuv);
   // Unsharp mask on the footage: the 720p stream is softer than the screen it fills.
   vec2 u1=px*vec2(1.,1.)*fit.xy;
   vec3 near=(videoAt(vuv+vec2(u1.x,0.))+videoAt(vuv-vec2(u1.x,0.))+videoAt(vuv+vec2(0.,u1.y))+videoAt(vuv-vec2(0.,u1.y)))*.25;
   bg=max(bg+(bg-near)*sharpen,0.);
   vec2 s=px*softness;
   vec4 fg=texture2D(layer,uv)*.36+(texture2D(layer,uv+vec2(s.x,0.))+texture2D(layer,uv-vec2(s.x,0.))+texture2D(layer,uv+vec2(0.,s.y))+texture2D(layer,uv-vec2(0.,s.y)))*.16;
   fg*=showLayer;
   vec2 w=px*3.*fit.xy;
   vec3 bgBlur=(videoAt(vuv+vec2(w.x,0.))+videoAt(vuv-vec2(w.x,0.))+videoAt(vuv+vec2(0.,w.y))+videoAt(vuv-vec2(0.,w.y)))*.25;
   float edge=clamp(fg.a*(1.-fg.a)*4.,0.,1.);
   vec3 fgColor=fg.rgb+bgBlur*fg.a*edge*wrap*.6;
   vec3 col=bg*(1.-fg.a)+fgColor;
   col=(col-.5)*contrast+.5+lift;
   float luma=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(luma),col,saturation);
   vec2 d=(uv-.5)*vec2(resolution.x/resolution.y,1.)*1.2;col*=1.-vignette*smoothstep(.35,1.25,length(d));
   float n=hash(floor(uv*resolution*.5)+fract(time*7.3)*113.)-.5;col+=n*grain*(1.-luma*.6);
   gl_FragColor=vec4(max(col,0.),1.);
   #include <colorspace_fragment>
  }`});
 const postScene=new THREE.Scene();postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));const postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 return{
  resize(){renderer.getDrawingBufferSize(size);target.setSize(Math.max(2,size.x),Math.max(2,size.y));material.uniforms.resolution.value.set(size.x,size.y);
   const vw=video.videoWidth||16,vh=video.videoHeight||9,canvasAspect=size.x/size.y,videoAspect=vw/vh,f=material.uniforms.fit.value;
   if(canvasAspect>videoAspect)f.set(1,videoAspect/canvasAspect,0,(1-videoAspect/canvasAspect)/2);else f.set(canvasAspect/videoAspect,1,(1-canvasAspect/videoAspect)/2,0);},
  get fit(){return material.uniforms.fit.value;},
  render(now,layerVisible){material.uniforms.time.value=now/1000;material.uniforms.showLayer.value=layerVisible?1:0;
   renderer.setRenderTarget(target);renderer.setClearColor(0,0);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}
 };
}
function initialize3D(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
 $('render').append(renderer.domElement);renderer.domElement.setAttribute('aria-label','제주 친구 캐릭터');$('wave').textContent='인사하기';
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(50,16/9,.05,150);
 const look=activeClip.light||{};
 hemi=new THREE.HemisphereLight(0xe6efe3,0x243b39,2.2);scene.add(hemi);
 // Draw the decoded footage in the same WebGL surface as the avatar. A native
 // video surface behind a transparent canvas can disappear in embedded browsers.
 videoTexture=new THREE.VideoTexture(video);videoTexture.colorSpace=THREE.SRGBColorSpace;
 sunDirection=new THREE.Vector3(...(look.sun||[-3,6,-4])).normalize();
 sun=new THREE.DirectionalLight(look.sunColor||0xffd7a2,look.sunIntensity??2.1);sun.position.copy(sunDirection).multiplyScalar(6);
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.near=.1;sun.shadow.camera.far=20;sun.shadow.camera.left=sun.shadow.camera.bottom=-1.3;sun.shadow.camera.right=sun.shadow.camera.top=1.3;sun.shadow.bias=-.0006;sun.shadow.normalBias=.015;sun.shadow.radius=look.shadowRadius??3;scene.add(sun,sun.target);
 const fill=new THREE.DirectionalLight(look.fillColor||0xf3f1df,look.fillIntensity??.6);fill.position.set(...(look.fill||[2,3,5]));scene.add(fill);
 // Rim light from behind-above separates the character from the footage, as a backlight would on set.
 const rim=new THREE.DirectionalLight(look.rimColor||0xeaf2ff,look.rimIntensity??.9);rim.position.set(.6,2.2,-3);scene.add(rim);
 groundShadow=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.ShadowMaterial({opacity:look.shadowOpacity??.38,depthWrite:false}));groundShadow.rotation.x=-Math.PI/2;groundShadow.receiveShadow=true;scene.add(groundShadow);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 avatar=createCompanion(THREE,{character:selectedCharacter});character=avatar.root;scene.add(character);
 character.traverse(o=>{if(o.material&&'envMapIntensity' in o.material)o.material.envMapIntensity=look.envIntensity??.55;});
 avatar.setEnvIntensity(look.envIntensity??.55);preloadCompanionAssets(THREE);
 lightProbe=createLightProbe();composite=createComposite(look);
 restCamera=new THREE.OrthographicCamera(-restWidth/2,restWidth/2,restHeight/2,-restHeight/2,.1,4000);restCamera.position.z=2000;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,3,64,64,62);gradient.addColorStop(0,'rgba(0,0,0,.6)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.75),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
 const observer=new ResizeObserver(()=>{const r=$('stage').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();composite?.resize();});observer.observe($('stage'));
 video.addEventListener('loadedmetadata',()=>composite?.resize());
 document.body.classList.add('webgl-video');$('stage').dataset.compositor='webgl-video';
 $('renderStatus').textContent=supportsCharacter?'길 경로에 맞춘 여행자':'1인칭 시험 · 경로 불러오기 실패';
}
function render(now){
 const interval=1000/(resting?4:entered?240:10);if(now-lastPaintAt<interval){requestAnimationFrame(render);return;}lastPaintAt=now;
 const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
 if(entered&&!resting){if(keys.has('KeyA')||keys.has('ArrowLeft'))laneTarget=Math.max(-1,laneTarget-dt*1.7);if(keys.has('KeyD')||keys.has('ArrowRight'))laneTarget=Math.min(1,laneTarget+dt*1.7);}
 lane=THREE.MathUtils.damp(lane,laneTarget,9,dt);
 if(renderer&&!resting){
  const t=mediaTime(now),path=samplePath(t),[oldCenter,oldHorizon]=sample(t),center=path?path.x:oldCenter,horizon=path ? .52 : oldHorizon;
  const hasVideoFrame=video.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA;
  if(hasVideoFrame&&t!==lastTextureTime){videoTexture.needsUpdate=true;lastTextureTime=t;}
  scene.background=comparing&&hasVideoFrame?videoTexture:null;
  const moving=!video.paused&&!video.ended&&!resting&&!video.seeking;
  const characterScale=path?path.scale:1;let lookAt=0;
  if(!resting){
   camera.position.set(0,1.5,-t*.65);camera.rotation.set((horizon-.5)*.9,0,0);camera.updateMatrixWorld();
   // Path points are normalised to the video frame; the canvas may crop it (portrait phones).
   const fit=composite?composite.fit:null,vx=center+lane*(path?path.laneWidth:.065),vy=path?path.y:.865;
   const cx=fit?(vx-fit.z)/fit.x:vx,cy=fit?(vy-fit.w)/fit.y:vy;
   projection.set(cx*2-1,1-cy*2);ray.setFromCamera(projection,camera);ray.ray.intersectPlane(ground,foot);
   character.position.copy(foot);character.scale.setScalar(characterScale);character.rotation.set(0,Math.PI+(path?THREE.MathUtils.clamp((center-.5)*1.3,-.42,.42):0)+lane*.12,0);
   // Contact shadow under the feet; the sun casts the real one onto the ground plane.
   shadow.material.opacity=.3;shadow.position.set(foot.x,.006,foot.z);shadow.scale.setScalar(characterScale*.62);shadow.rotation.set(-Math.PI/2,0,0);
   groundShadow.position.set(foot.x,0,foot.z);sun.position.copy(foot).addScaledVector(sunDirection,6);sun.target.position.copy(foot);sun.target.updateMatrixWorld();
   // Ground distance: the tracked flow at the feet, unprojected onto the ground plane. This
   // drives the gait so the planted foot moves with the deck instead of sliding over it.
   if(moving&&dt>0){
    let groundSpeed;
    if(path&&path.speed!==null&&path.speed!==undefined){
     const dy=path.speed*video.playbackRate*dt/(fit?fit.y:1);projection2.set(projection.x,projection.y-dy*2);ray.setFromCamera(projection2,camera);
     groundSpeed=ray.ray.intersectPlane(ground,foot2)?foot2.distanceTo(foot)/dt:0;
    }else groundSpeed=.221*characterScale*video.playbackRate;
    walkSpeed=groundSpeed;walkDistance+=groundSpeed*dt;
   }else walkSpeed=0;
   const ahead=path?samplePath(t+1.2):null;if(ahead&&path)lookAt=THREE.MathUtils.clamp((ahead.x-path.x)*3,-.5,.5);
   if(!$('footMarker').hidden){$('footMarker').style.left=`${(center+lane*(path?path.laneWidth:.065))*100}%`;$('footMarker').style.top=`${(path?path.y:.865)*100}%`;}
   lightProbe?.update(now);
  }
  if(moving){const rate=THREE.MathUtils.lerp(BASE_RATE*.62,BASE_RATE,THREE.MathUtils.smoothstep((now-walkStartedAt)/550,0,1));if(video.playbackRate!==rate)video.playbackRate=rate;}
  avatar.update({dt,time:now/1000,walkTime:t/WALK_RATE,walking:moving,distance:walkDistance/characterScale,speed:walkSpeed/characterScale,lookAt,pose:resting?restPose:'walk',profile:restSceneId,view:resting?resolvedSpot().sprite?.view:undefined,wave:now<waveUntil});
  for(const event of avatar.root.userData.events.splice(0))if(event.type==='footfall'&&!resting&&character.visible&&moving)audio.footstep(activeClip.surface||'wood',{gain:.35+.65*event.strength,pan:(center-.5)*1.4,rate:.94+Math.random()*.12});
  if(resting){
   const spot=resolvedSpot();
   if(restPose==='stand'){
    const place=restScene.standing;
    character.scale.setScalar(place.scale);character.position.set(place.x-restWidth/2,restHeight/2-place.y,0);character.rotation.set(0,place.yaw||0,0);
    shadow.position.set(character.position.x,character.position.y,-1);shadow.rotation.set(0,0,0);shadow.scale.set(place.scale*1.15,place.scale*.58,1);
   }else if(restPose==='sit'){
    character.scale.setScalar(spot.scale);character.position.set(spot.x-restWidth/2,restHeight/2-spot.y-avatar.seatHeight*spot.scale,0);character.rotation.set(spot.pitch||0,spot.yaw||0,0);
   }else{
    character.scale.setScalar(spot.scale);character.position.set(spot.x-restWidth/2,restHeight/2-spot.y,0);character.rotation.set(spot.pitch??.07,spot.yaw??.10,spot.roll??1.30);
   }
   if(restTransition){
    const blend=THREE.MathUtils.smoothstep((now-restTransition.start)/750,0,1);
    const targetPosition=character.position.clone(),targetScale=character.scale.clone(),targetRotation=character.quaternion.clone();
    character.position.lerpVectors(restTransition.position,targetPosition,blend);character.scale.lerpVectors(restTransition.scale,targetScale,blend);character.quaternion.slerpQuaternions(restTransition.rotation,targetRotation,blend);
    if(blend===1)restTransition=null;
   }
   avatar.alignRest?.({pose:restPose,spot,width:restWidth,height:restHeight});
   if(restPose!=='stand'){
    const contact=restPose==='sit'?new THREE.Vector3(spot.x-restWidth/2,restHeight/2-spot.y,0):new THREE.Vector3(0,.73*spot.scale,0).applyQuaternion(character.quaternion).add(character.position);
    shadow.position.set(contact.x,contact.y,-3);shadow.rotation.set(0,0,restPose==='lie'?character.rotation.z+Math.PI/2:0);
    shadow.scale.set(spot.scale*(restPose==='lie'?1.12:.60),spot.scale*(restPose==='lie'?.48:.16),1);shadow.material.opacity=restSceneId==='coastHammocks'||restSceneId==='forest'?.30:.43;
    if(avatar.root.userData.contact){const c=avatar.root.userData.contact;shadow.position.set(c.x,c.y,-3);shadow.rotation.z=c.angle;shadow.scale.set(c.length*.78,c.length*.28,1);}
   }else shadow.material.opacity=.65;
  }
  const inFrame=resting||!path||path.visibility>.3;
  character.visible=entered&&(resting||(supportsCharacter&&!firstPerson))&&!comparing&&inFrame&&(resting?restImageReady:!video.seeking)&&avatar.ready!==false;shadow.visible=character.visible;groundShadow.visible=character.visible&&!resting;
  if(!resting&&!comparing&&hasVideoFrame&&composite)composite.render(now,character.visible);
  else{renderer.setRenderTarget(null);renderer.render(scene,resting?restCamera:camera);}
  $('stage').dataset.videoFrame=resting?'rest':hasVideoFrame?String(t):'loading';
  $('stage').dataset.poseReady=String(resting&&avatar.root.userData.poseSettled&&!restTransition);
  $('stage').dataset.travelerFrame=String(avatar.root.userData.frame);
  $('stage').dataset.travelerClip=avatar.root.userData.clip;
  $('renderStatus').textContent=!avatar.ready?'친구 준비 중…':!resting&&!inFrame?'바다를 바라보는 구간 · 여행자는 시야 밖':`${characterFor(selectedCharacter).name} · ${resting?'잠깐 쉬어가기':moving?'여유롭게 걷기':'멈춰서 멍때리기'}`;
 }
 const duration=Number.isFinite(video.duration)?video.duration:activeClip.duration;
 const displayTime=recoveryPosition??video.currentTime;
 $('readout').textContent=resting?`돌아갈 산책 위치 ${savedWalkTime.toFixed(2)}초`:`${displayTime.toFixed(2)} / ${duration.toFixed(2)}초`;if(document.activeElement!==$('timeline'))$('timeline').value=displayTime;
 if(!resting){$('playingState').textContent=mediaFailed?'영상 연결 오류 · 다시 불러오기':mediaWaiting?'영상 불러오는 중':!entered?'입장 전 · 영상 정지':video.paused?'멈춤 · W 또는 걷기 시작':`걷는 중 · 실제 영상 ${video.currentTime.toFixed(1)}초`;}
 const playState=video.paused?'paused':'playing';if($('play').dataset.state!==playState){$('play').dataset.state=playState;$('play').innerHTML=video.paused?PLAY_ICON+'<span>걷기</span>':PAUSE_ICON+'<span>멈춤</span>';}requestAnimationFrame(render);
}
function showError(text){$('error').hidden=false;$('error').textContent=text;}
async function start(){audio.unlock();audio.attachVideo(video);if(!entered){entered=true;$('gate').hidden=true;gateStage?.stop();preloadLounge();}if(resting){const wasHeld=held;await setRest(false);held=wasHeld;}$('arrival').hidden=true;if(video.ended||video.currentTime>=video.duration-.03)video.currentTime=0;if(video.paused){walkStartedAt=performance.now();video.playbackRate=BASE_RATE*.62;}try{await video.play();}catch(e){if(e.name==='NotAllowedError'){video.muted=true;try{await video.play();}catch{}const unmute=()=>{if(audio.enabled)video.muted=false;document.removeEventListener('pointerdown',unmute);document.removeEventListener('keydown',unmute);};document.addEventListener('pointerdown',unmute);document.addEventListener('keydown',unmute);}else if(e.name!=='AbortError')showError('영상 재생에 실패했어요. 화면을 한 번 누른 뒤 다시 시도해 주세요.');}}
function pause(){held=false;video.pause();}
function resolvedSpot(){const spot=spots[restSpot];return{...spot,...spot.poses?.[restPose]};}
function setRestScene(sceneId){
 if(!REST_SCENES[sceneId]||(!isCoast&&sceneId!=='forest')||(isCoast&&!COAST_REST_IDS.includes(sceneId)))return;
 restTransition=null;restSceneId=sceneId;restScene=REST_SCENES[sceneId];restWidth=restScene.width;restHeight=restScene.height;spots=restScene.spots;restSpot=restScene.entrySpot;
 const image=$('forest');restImageReady=false;image.dataset.ready='false';
 image.onload=()=>{restImageReady=true;image.dataset.ready='true';};image.onerror=()=>showError('쉼터 이미지를 불러오지 못했습니다. 새로고침해주세요.');
 image.src=$('hammockFront').src=restScene.image;image.alt=restScene.alt;
 if(image.complete&&image.naturalWidth>0){restImageReady=true;image.dataset.ready='true';}
 $('stage').style.aspectRatio=`${restWidth} / ${restHeight}`;$('stage').style.setProperty('--forest-ratio',String(restWidth/restHeight));
 if(restCamera){restCamera.left=-restWidth/2;restCamera.right=restWidth/2;restCamera.top=restHeight/2;restCamera.bottom=-restHeight/2;restCamera.updateProjectionMatrix();}
 const container=$('forestSpots');container.replaceChildren();container.setAttribute('aria-label',restScene.title+' 자리 선택');
 for(const[id,spot]of Object.entries(spots)){
  const button=document.createElement('button');button.type='button';button.className='spot';button.dataset.spot=id;button.textContent=spot.label;button.setAttribute('aria-label',spot.name+'에서 쉬기');button.style.setProperty('--x',`${spot.button[0]*100}%`);button.style.setProperty('--y',`${spot.button[1]*100}%`);container.append(button);
 }
 document.querySelectorAll('[data-rest-scene]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.restScene===sceneId)));
 $('stand').hidden=!restScene.allowStand;
 $('sit').hidden=Boolean(restScene.allowedPoses&&!restScene.allowedPoses.includes('sit'));
 $('modeLabel').textContent=restScene.title;$('sceneLabel').textContent=restScene.title+' · 제공한 이미지';
 setPose(restScene.entryPose);
}
function setPose(pose,spotId){
 if(pose==='stand'&&!restScene.allowStand)return;
 if(restScene.allowedPoses&&!restScene.allowedPoses.includes(pose))return;
 $('stage').dataset.poseReady='false';
 const previousSpot=restSpot,previousPose=restPose;
 if(spotId&&spots[spotId])restSpot=spotId;
 if(pose!=='stand'&&!(spots[restSpot].allowed||[spots[restSpot].pose]).includes(pose))restSpot=Object.keys(spots).find(id=>(spots[id].allowed||[spots[id].pose]).includes(pose));
 if(!restSpot)return;restPose=pose;
 restTransition=avatar?.kind!=='sprite'&&restImageReady&&character&&previousSpot===restSpot&&previousPose!==pose&&previousPose!=='stand'&&pose!=='stand'?{start:performance.now(),position:character.position.clone(),scale:character.scale.clone(),rotation:character.quaternion.clone()}:null;
 const spot=resolvedSpot();
 $('sit').setAttribute('aria-pressed',String(pose==='sit'));$('lie').setAttribute('aria-pressed',String(pose==='lie'));$('stand').setAttribute('aria-pressed',String(pose==='stand'));
 document.querySelectorAll('.spot').forEach(button=>button.setAttribute('aria-pressed',String(pose!=='stand'&&button.dataset.spot===restSpot)));
 const masked=Boolean(spot.mask&&(spot.maskWhen||['lie']).includes(pose));$('hammockFront').hidden=!masked;
 if(masked)$('hammockFront').style.clipPath=`polygon(${spot.mask.map(([x,y])=>`${x/restWidth*100}% ${y/restHeight*100}%`).join(',')})`;
 $('wave').hidden=pose==='lie';$('speech').hidden=true;waveUntil=0;
 $('playingState').textContent=pose==='stand'?restScene.title+' · 잠깐 쉬어가요':pose==='sit'?`${spot.name}에 앉아 쉬는 중`:`${spot.name}에 누워 쉬는 중`;
 $('help').textContent=isCoast?(restScene.allowedPoses?.length===1?'사진 속 자리 표시를 골라 편하게 누워보세요. Esc로 다시 걷기.':'해먹에 앉거나 누워보세요. 다른 자리 표시를 눌러 옮길 수 있어요. Esc로 다시 걷기.'):pose==='lie'?'해먹에서 잠깐 눈을 감아도 좋아요. 다른 해먹의 표시를 눌러 옮길 수 있어요.':'앉기·눕기를 누르거나 사진 속 자리 표시를 골라보세요. Esc로 다시 걷기.';
 const speechPlace=pose==='stand'?restScene.standing:spot;$('speech').style.left=`${speechPlace.x/restWidth*100}%`;$('speech').style.bottom=`${Math.min(90,100-(speechPlace.y-speechPlace.scale*1.9)/restHeight*100)}%`;
}
const pickerUpdates=[];
function chooseCharacter(id){selectedCharacter=characterFor(id).id;$('charButton').innerHTML=characterIcon(selectedCharacter);closeMenus();avatar?.setCharacter(selectedCharacter);gateStage?.setCharacter(selectedCharacter);try{localStorage.setItem('jejumong-character',selectedCharacter);}catch{}pickerUpdates.forEach(update=>update(selectedCharacter));}
pickerUpdates.push(mountCharacterPicker($('travelerChoices'),selectedCharacter,chooseCharacter));
pickerUpdates.push(mountCharacterPicker($('gateCharacters'),selectedCharacter,chooseCharacter));
const lounge=createLounge($('lounge'),{onReturn:()=>start(),onCharacter:chooseCharacter,audio});
const requestedRoom=new URLSearchParams(location.search).get('room');
let fading=false;
// Cross-fade between the walk and the lounge instead of swapping sections abruptly.
function setRest(value){
 if(value===resting||fading)return Promise.resolve();
 if(value){savedWalkTime=video.currentTime;pause();}
 audio.setVideoLevel(value?0:1,value?.5:.9);
 fading=true;const fade=$('fade');fade.classList.add('on');
 return new Promise(resolve=>setTimeout(()=>{try{applyRest(value);}finally{fading=false;setTimeout(()=>fade.classList.remove('on'),40);resolve();}},460));
}
function applyRest(value){
 if(value===resting)return;
 resting=value;pause();keys.clear();comparing=false;document.body.classList.remove('compare','forest-mode');document.body.classList.toggle('lounge-mode',value);
 $('stage').hidden=value;$('walkPanel').hidden=value;$('lounge').hidden=!value;$('arrival').hidden=true;
 $('compare').setAttribute('aria-pressed','false');$('compare').textContent='원본과 비교';
 if(value){$('mediaNotice').hidden=true;lounge.enter({area:isCoast?'coast':'forest',traveler:selectedCharacter,requestedRoom:new URLSearchParams(location.search).get('room')});}
 else{lounge.leave();video.currentTime=savedWalkTime;$('help').textContent=walkHelp;}
}

function toggle(){if(video.paused)start();else pause();}
$('enter').addEventListener('click',()=>{audio.unlock();audio.attachVideo(video);if(requestedRoom||new URLSearchParams(location.search).get('loungePreview')){entered=true;$('gate').hidden=true;gateStage?.stop();setRest(true);}else start();});
$('retryMedia').addEventListener('click',reloadMedia);$('reloadMedia').addEventListener('click',reloadMedia);
$('rest').addEventListener('click',()=>{if(!entered)return;if(resting)start();else setRest(true);});
$('sit').addEventListener('click',()=>setPose('sit'));
$('lie').addEventListener('click',()=>setPose('lie'));
$('stand').addEventListener('click',()=>setPose('stand'));
$('forestSpots').addEventListener('click',event=>{const button=event.target.closest('[data-spot]');if(button&&resting){const spot=spots[button.dataset.spot];setPose((spot.allowed||[spot.pose]).includes(restPose)?restPose:spot.pose,button.dataset.spot);}});
document.querySelectorAll('[data-rest-scene]').forEach(button=>button.addEventListener('click',()=>{if(resting)setRestScene(button.dataset.restScene);}));
// One walk button: a tap toggles walking, pressing and holding walks only while held.
let pressAt=0,pressStarted=false;
$('play').addEventListener('pointerdown',event=>{if(event.button)return;$('play').setPointerCapture(event.pointerId);pressAt=performance.now();pressStarted=video.paused||resting;if(pressStarted)start();});
$('play').addEventListener('pointerup',()=>{if(!pressAt)return;const long=performance.now()-pressAt>450;pressAt=0;if(!pressStarted||long)pause();});
$('play').addEventListener('pointercancel',()=>{pressAt=0;});
$('play').addEventListener('click',event=>{if(event.detail===0)toggle();});
$('play').addEventListener('contextmenu',event=>event.preventDefault());
// Compact HUD: the character chip and the menu open small panels above the bar.
function openMenu(id,button){const open=$(id).hidden;closeMenus();if(open){$(id).hidden=false;$(button).setAttribute('aria-expanded','true');}}
function closeMenus(){for(const[id,button]of[['charMenu','charButton'],['hudMenu','menuButton']]){$(id).hidden=true;$(button).setAttribute('aria-expanded','false');}}
$('charButton').addEventListener('click',()=>openMenu('charMenu','charButton'));
$('menuButton').addEventListener('click',()=>openMenu('hudMenu','menuButton'));
document.addEventListener('pointerdown',event=>{if(!event.target.closest('.hud-pop,#charButton,#menuButton'))closeMenus();});
document.addEventListener('keydown',event=>{if(event.code==='Escape')closeMenus();});
$('hudMenu').addEventListener('click',event=>{if(event.target.closest('#rest,#openMap,a'))closeMenus();});
$('charButton').innerHTML=characterIcon(selectedCharacter);
$('bgmButton').innerHTML=NOTE_ICON;$('bgmButton').addEventListener('click',()=>bgm.toggle());
bgm.onChange(({on,playing})=>{$('bgmButton').setAttribute('aria-pressed',String(on&&playing));});
document.addEventListener('jejumong:bgm',()=>bgm.toggle());
$('steps').addEventListener('click',()=>audio.setSteps(!audio.steps));
$('first').addEventListener('click',()=>{firstPerson=!firstPerson;$('first').setAttribute('aria-pressed',String(firstPerson));$('first').textContent=firstPerson?'캐릭터 보기':'1인칭 보기';});
$('compare').addEventListener('click',()=>{comparing=!comparing;document.body.classList.toggle('compare',comparing);$('compare').setAttribute('aria-pressed',String(comparing));$('compare').textContent=comparing?'합성 화면으로 돌아가기':'원본과 비교';$('sceneLabel').textContent=comparing?'웹용 영상만 표시 · 영상 재생 상태는 유지':`${activeClip.file} · ${activeClip.title}`;});
$('sound').addEventListener('click',()=>audio.setEnabled(!audio.enabled));
$('volume').addEventListener('input',()=>audio.setVolume(Number($('volume').value)));
audio.onChange(({enabled,volume,steps})=>{$('steps').setAttribute('aria-pressed',String(steps));$('steps').textContent=steps?'발소리 켬':'발소리 끔';$('sound').setAttribute('aria-pressed',String(enabled));$('sound').textContent=enabled?'소리 켬':'소리 끔';$('volume').value=String(volume);$('volume').disabled=!enabled;});
$('timeline').addEventListener('input',()=>{video.currentTime=Number($('timeline').value);$('arrival').hidden=true;});
$('wave').addEventListener('click',()=>{waveUntil=performance.now()+2300;$('speech').hidden=false;$('speech').textContent='반가워요. 잠깐 쉬다 가요.';setTimeout(()=>$('speech').hidden=true,2300);});
$('again').addEventListener('click',()=>{video.currentTime=0;start();});$('stay').addEventListener('click',()=>setRest(true));
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,[contenteditable=true]'))return;if(resting){if(e.code==='Escape'){e.preventDefault();start();}return;}if(['KeyW','ArrowUp','KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();if(!keys.has(e.code)){keys.add(e.code);if(['KeyW','ArrowUp'].includes(e.code))start();}}if(e.code==='Space'&&!e.repeat&&!e.target.matches('button,a')){e.preventDefault();toggle();}});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(['KeyW','ArrowUp'].includes(e.code))pause();});
window.addEventListener('blur',()=>{keys.clear();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();pause();}});
let arrivalTimer=null,arrivalTarget=null;
function cancelArrival(){clearInterval(arrivalTimer);arrivalTimer=null;$('arrivalNext').textContent='';}
function goToCourse(id,auto){location.href=`/engine?clip=${encodeURIComponent(id)}${auto?'&auto=1':''}`;}
video.addEventListener('ended',()=>{
 $('arrival').hidden=false;arrivalTarget=nextCourse(activeClip.id);let left=8;
 const tick=()=>{$('arrivalNext').textContent=`${left}초 뒤 ${arrivalTarget.title}으로 이어 걸어요. 다른 걸 고르면 멈춰요.`;if(left--<=0){cancelArrival();goToCourse(arrivalTarget.id,true);}};
 cancelArrival();tick();arrivalTimer=setInterval(tick,1000);
});
$('nextCourse').addEventListener('click',()=>{cancelArrival();goToCourse((arrivalTarget||nextCourse(activeClip.id)).id,true);});
for(const id of['again','stay','pickCourse'])$(id).addEventListener('click',cancelArrival);
let courseMap=null;
function openMap(){cancelArrival();closeMenus();$('courseMap').hidden=false;if(!courseMap)courseMap=createCourseMap($('courseMapCanvas'),{currentId:activeClip.id,modal:true,onPick:id=>{if(id===activeClip.id){closeMap();return;}goToCourse(id,entered);}});else courseMap.refresh();if(entered&&!resting)pause();}
function closeMap(){$('courseMap').hidden=true;}
$('openMap').addEventListener('click',openMap);$('pickCourse').addEventListener('click',openMap);$('closeMap').addEventListener('click',closeMap);
$('courseMap').addEventListener('click',e=>{if(e.target===$('courseMap'))closeMap();});
document.addEventListener('keydown',e=>{if(e.code==='Escape'&&!$('courseMap').hidden){e.preventDefault();closeMap();}});
video.addEventListener('playing',()=>{walkStartedAt=performance.now();});
video.addEventListener('loadedmetadata',()=>{
 $('timeline').max=video.duration;
 if(recoveryPosition!==null){const target=recoveryPosition;recoveryPosition=null;video.currentTime=Math.min(target,video.duration);if(entered&&!resting)start();}
});
for(const event of['loadeddata','canplay','playing','seeked'])video.addEventListener(event,clearMediaNotice);
for(const event of['waiting','stalled','seeking'])video.addEventListener(event,queueMediaNotice);
video.addEventListener('error',()=>{clearTimeout(mediaWaitTimer);mediaFailed=true;showMediaNotice('영상을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 불러오세요.');});
let gateStage=null;
try{initialize3D();try{gateStage=createCharacterStage($('gateStage'),{character:selectedCharacter});gateStage.start();}catch(e){console.warn('캐릭터 미리보기 사용 불가',e);}}catch(e){renderer=null;$('renderStatus').textContent='3D 사용 불가';showError('WebGL 3D를 시작할 수 없습니다. 영상 조작만 가능합니다. 오류: '+e.message);$('first').disabled=true;}
for(const id of['enter','play','rest'])$(id).disabled=false;$('enter').textContent=requestedRoom?'함께 쉬는 구역으로 들어가기 →':'영상 속 길로 들어가기 →';
if(requestedRoom){$('walkTitle').textContent='제주에서 잠깐, 함께 쉬어요.';$('gate').querySelectorAll('p')[1].textContent='입장하면 링크의 쉼터 구역으로 연결됩니다.';}
requestAnimationFrame(render);
if(!supportsCharacter){$('first').disabled=true;$('first').textContent='캐릭터 경로 없음';$('compare').hidden=true;}
else $('truth').textContent='실제 산책 영상 + 길 위치 보정 · 제주 친구 캐릭터';
const DEBUG=new URLSearchParams(location.search).get('debug')==='1';
if(new URLSearchParams(location.search).get('auto')==='1'&&!requestedRoom){history.replaceState(null,'',location.pathname+'?clip='+encodeURIComponent(activeClip.id));setTimeout(()=>{if(!entered)start();},400);}
$('pathDebug').hidden=!DEBUG;$('labTools').hidden=!DEBUG;if(DEBUG)document.body.classList.add('lab-mode');
// The HUD fades while the walk plays and nothing is touched; any pointer brings it back.
let hudTimer;const wakeHud=()=>{$('stage').classList.remove('hud-idle');clearTimeout(hudTimer);hudTimer=setTimeout(()=>{if(entered&&!resting&&!video.paused&&$('hudMenu').hidden&&$('charMenu').hidden)$('stage').classList.add('hud-idle');},3500);};
for(const type of['pointermove','pointerdown','keydown','touchstart'])document.addEventListener(type,wakeHud,{passive:true});video.addEventListener('play',wakeHud);video.addEventListener('pause',()=>$('stage').classList.remove('hud-idle'));
// Warm the lounge assets for this clip's area while the walk plays.
let loungePreloaded=false;function preloadLounge(){if(loungePreloaded)return;loungePreloaded=true;const scenes=isCoast?['coastHammocks','coastLounge','coastPaddles']:['forest'];
 for(const scene of scenes)for(const file of['meta.json','far.jpg','mid.webp','near.webp','motion.png','depth.png'])fetch(`/lab/scenes/${scene}/${file}`).catch(()=>{});
 audio.load(`/lab/audio/${isCoast?'coast':'forest'}.m4a`).catch(()=>{});}
// Read-only inspection hook for local verification (foot planting, speed, lighting).
window.__jejumong={
 get audio(){return audio.debug();},get bgm(){return bgm.debug();},
 get audioApi(){return audio;},
 get state(){const t=video.currentTime,path=samplePath(t);return{clip:activeClip.id,time:t,rate:video.playbackRate,slow:Boolean(activeClip.slow),refinedPath:Boolean(pathTrack30),path,distance:walkDistance,speed:walkSpeed,gait:avatar?.root.userData.gait,phase:avatar?.root.userData.phase,feet:avatar?.root.userData.feet,sunIntensity:sun?.intensity,hemiIntensity:hemi?.intensity};},
 ankleScreen(side){if(!character||!renderer)return null;character.updateMatrixWorld(true);const ankle=character.getObjectByName(side==='left'?'left-hip':'right-hip').getObjectByName('knee').getObjectByName('ankle'),v=new THREE.Vector3();ankle.getWorldPosition(v);v.project(camera);return{x:(v.x+1)/2,y:(1-v.y)/2,world:ankle.getWorldPosition(new THREE.Vector3()).toArray()};}
};
$('jump').addEventListener('click',()=>{pause();const target=THREE.MathUtils.clamp(Number($('jumpTime').value)||0,0,Number.isFinite(video.duration)?video.duration:activeClip.duration);if(Math.abs(video.currentTime-target)>.001){video.dataset.seeking='true';video.currentTime=target;}});
video.dataset.seeking='false';video.addEventListener('seeking',()=>video.dataset.seeking='true');video.addEventListener('seeked',()=>video.dataset.seeking='false');
$('showFoot').addEventListener('change',()=>$('footMarker').hidden=!$('showFoot').checked||resting);

import { attachMedia } from './media-player.js';
import * as THREE from './vendor/three.module.js';
import { CLIPS } from './clips.js';
import { REST_SCENES, COAST_REST_IDS } from './rest-scenes.js';
import { createTravelerAvatar } from './traveler-avatar.js?v=slow-walk-4';

const $ = id => document.getElementById(id), video = $('source');
const activeClip=CLIPS.find(clip=>clip.id===new URLSearchParams(location.search).get('clip'))||CLIPS[0];
const isCoast=activeClip.id==='IMG_0575';
const WALK_RATE=.72;
video.defaultPlaybackRate=WALK_RATE;video.playbackRate=WALK_RATE;video.preservesPitch=true;
let travelerGender='male';try{travelerGender=localStorage.getItem('jejumong-traveler')==='female'?'female':'male';}catch{}
const restEntryLabel=isCoast?'바다로 쉬러 가기':'숲으로 쉬러 가기';
$('rest').textContent=$('stay').textContent=restEntryLabel;
let pathTrack=null;
if(activeClip.path){try{const response=await fetch(activeClip.path);if(!response.ok)throw Error('경로 파일 없음');pathTrack=await response.json();if(!Array.isArray(pathTrack.samples)||pathTrack.samples.length<2)throw Error('잘못된 경로 파일');}catch(error){pathTrack=null;showError('이 영상의 길 경로를 불러오지 못했습니다. 1인칭으로 표시합니다.');}}
const supportsCharacter=Boolean(activeClip.calibrated&&(!activeClip.path||pathTrack));
const media=attachMedia(video,activeClip.src,message=>{mediaFailed=true;showMediaNotice(message);});video.poster=activeClip.poster;$('timeline').max=activeClip.duration;$('readout').textContent=`0.00 / ${activeClip.duration.toFixed(2)}초`;
$('stage').style.backgroundImage=`url("${activeClip.poster}")`;
$('stage').style.backgroundSize='cover';
$('sceneLabel').textContent=`${activeClip.file} · ${activeClip.title}`;
$('walkTitle').textContent=activeClip.title+(activeClip.id==='IMG_2207'?'를':'을')+' 걸어요.';
const walkHelp=supportsCharacter?'W / ↑ 전진 · A D / ← → 길 안에서 좌우 이동 · Space 걷기/멈춤':'W / ↑ 걷기 · Space 걷기/멈춤 · 촬영된 경로를 따라 이동';
$('help').textContent=walkHelp;
let renderer, scene, camera, restCamera, character, avatar, shadow,videoTexture;
let lastTextureTime=-1;
let entered=false, resting=false, firstPerson=false, comparing=false, held=false, waveUntil=0;
if(!supportsCharacter)firstPerson=true;
let restSceneId=isCoast?'coastLounge':'forest',restScene=REST_SCENES[restSceneId];
let restWidth=restScene.width,restHeight=restScene.height,spots=restScene.spots;
let restPose='stand',restSpot=restScene.entrySpot,savedWalkTime=0;
let restImageReady=true;
let lane=0, laneTarget=0, lastFrame=performance.now();
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
 if(!pathTrack)return null;
 const rows=pathTrack.samples,n=Math.max(0,Math.min(rows.length-2,Math.floor(time*pathTrack.fps))),a=rows[n],b=rows[n+1],p=THREE.MathUtils.clamp((time-a[0])/(b[0]-a[0]),0,1);
 return{x:THREE.MathUtils.lerp(a[1],b[1],p),y:THREE.MathUtils.lerp(a[2],b[2],p),visibility:THREE.MathUtils.lerp(a[3],b[3],p),scale:pathTrack.scale,laneWidth:pathTrack.laneWidth};
}
function initialize3D(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
 $('render').append(renderer.domElement);renderer.domElement.setAttribute('aria-label','이미지 프레임으로 움직이는 여행자');$('wave').textContent='인사하기';
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(50,16/9,.05,150);scene.add(new THREE.HemisphereLight(0xe6efe3,0x243b39,2.7));
 // Draw the decoded footage in the same WebGL surface as the avatar. A native
 // video surface behind a transparent canvas can disappear in embedded browsers.
 videoTexture=new THREE.VideoTexture(video);videoTexture.colorSpace=THREE.SRGBColorSpace;
 const sun=new THREE.DirectionalLight(0xffd7a2,2.1);sun.position.set(-3,6,-4);scene.add(sun);
 const fill=new THREE.DirectionalLight(0xf3f1df,.7);fill.position.set(2,3,5);scene.add(fill);
 avatar=createTravelerAvatar(THREE,{gender:travelerGender,onError:showError});character=avatar.root;scene.add(character);
 restCamera=new THREE.OrthographicCamera(-restWidth/2,restWidth/2,restHeight/2,-restHeight/2,.1,4000);restCamera.position.z=2000;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,3,64,64,62);gradient.addColorStop(0,'rgba(0,0,0,.6)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.75),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
 const observer=new ResizeObserver(()=>{const r=$('stage').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();});observer.observe($('stage'));
 document.body.classList.add('webgl-video');$('stage').dataset.compositor='webgl-video';
 $('renderStatus').textContent=supportsCharacter?'길 경로에 맞춘 여행자':'1인칭 시험 · 경로 불러오기 실패';
}
function render(now){
 const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
 if(entered&&!resting){if(keys.has('KeyA')||keys.has('ArrowLeft'))laneTarget=Math.max(-1,laneTarget-dt*1.7);if(keys.has('KeyD')||keys.has('ArrowRight'))laneTarget=Math.min(1,laneTarget+dt*1.7);}
 lane=THREE.MathUtils.damp(lane,laneTarget,9,dt);
 if(renderer){
  const t=video.currentTime,path=samplePath(t),[oldCenter,oldHorizon]=sample(t),center=path?path.x:oldCenter,horizon=path ? .52 : oldHorizon;
  const hasVideoFrame=video.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA;
  if(hasVideoFrame&&t!==lastTextureTime){videoTexture.needsUpdate=true;lastTextureTime=t;}
  scene.background=resting||!hasVideoFrame?null:videoTexture;
  if(!resting){
   shadow.material.opacity=1;
   camera.position.set(0,1.5,-t*.65);camera.rotation.set((horizon-.5)*.9,0,0);camera.updateMatrixWorld();
   projection.set((center+lane*(path?path.laneWidth:.065))*2-1,1-(path?path.y:.865)*2);ray.setFromCamera(projection,camera);ray.ray.intersectPlane(ground,foot);
   character.position.copy(foot);character.scale.setScalar(path?path.scale:1);character.rotation.set(0,Math.PI+(path?THREE.MathUtils.clamp((center-.5)*1.3,-.42,.42):0)+lane*.12,0);
   shadow.position.set(foot.x,.008,foot.z);shadow.scale.setScalar(path?path.scale:1);shadow.rotation.set(-Math.PI/2,0,0);
   if(!$('footMarker').hidden){$('footMarker').style.left=`${(center+lane*(path?path.laneWidth:.065))*100}%`;$('footMarker').style.top=`${(path?path.y:.865)*100}%`;}
  }
  const moving=!video.paused&&!video.ended&&!resting;
  if(moving){const rate=THREE.MathUtils.lerp(WALK_RATE*.62,WALK_RATE,THREE.MathUtils.smoothstep((now-walkStartedAt)/550,0,1));if(video.playbackRate!==rate)video.playbackRate=rate;}
  avatar.update({dt,time:now/1000,walkTime:t/WALK_RATE,walking:moving,pose:resting?restPose:'walk',profile:restSceneId,view:resting?resolvedSpot().sprite?.view:undefined,wave:now<waveUntil});
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
  character.visible=entered&&(resting||(supportsCharacter&&!firstPerson))&&!comparing&&inFrame&&(resting?restImageReady:!video.seeking)&&avatar.ready!==false;shadow.visible=character.visible;renderer.render(scene,resting?restCamera:camera);
  $('stage').dataset.videoFrame=resting?'rest':hasVideoFrame?String(t):'loading';
  $('stage').dataset.poseReady=String(resting&&avatar.root.userData.poseSettled&&!restTransition);
  $('stage').dataset.travelerFrame=String(avatar.root.userData.frame);
  $('stage').dataset.travelerClip=avatar.root.userData.clip;
  $('renderStatus').textContent=!avatar.ready?'여행자 이미지 준비 중…':!resting&&!inFrame?'바다를 바라보는 구간 · 여행자는 시야 밖':`${travelerGender==='female'?'여성':'남성'} 여행자 · ${resting?'잠깐 쉬어가기':moving?'여유롭게 걷기':'멈춰서 멍때리기'}`;
 }
 const duration=Number.isFinite(video.duration)?video.duration:activeClip.duration;
 const displayTime=recoveryPosition??video.currentTime;
 $('readout').textContent=resting?`돌아갈 산책 위치 ${savedWalkTime.toFixed(2)}초`:`${displayTime.toFixed(2)} / ${duration.toFixed(2)}초`;if(document.activeElement!==$('timeline'))$('timeline').value=displayTime;
 if(!resting){$('playingState').textContent=mediaFailed?'영상 연결 오류 · 다시 불러오기':mediaWaiting?'영상 불러오는 중':!entered?'입장 전 · 영상 정지':video.paused?'멈춤 · W 또는 걷기 시작':`걷는 중 · 실제 영상 ${video.currentTime.toFixed(1)}초`;}
 $('play').textContent=video.paused?'걷기 시작':'걷기 멈춤';requestAnimationFrame(render);
}
function showError(text){$('error').hidden=false;$('error').textContent=text;}
async function start(){if(!entered){entered=true;$('gate').hidden=true;}if(resting){const wasHeld=held;setRest(false);held=wasHeld;}$('arrival').hidden=true;if(video.ended||video.currentTime>=video.duration-.03)video.currentTime=0;if(video.paused){walkStartedAt=performance.now();video.playbackRate=WALK_RATE*.62;}try{await video.play();}catch(e){if(e.name!=='AbortError')showError('영상 재생에 실패했어요. 원본 비교를 눌러 재생 상태를 확인해주세요.');}}
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
function setRest(value){
 if(value===resting)return;
 if(value)savedWalkTime=video.currentTime;
 resting=value;pause();keys.clear();comparing=false;document.body.classList.remove('compare');document.body.classList.toggle('forest-mode',value);
 $('compare').setAttribute('aria-pressed','false');$('compare').textContent='원본과 비교';
 $('forest').hidden=!value;$('source').hidden=value;$('forestSpots').hidden=!value;
 $('seaScenes').hidden=!(value&&isCoast);
 $('footMarker').hidden=value||!$('showFoot').checked;
 for(const id of['sit','lie','stand'])$(id).hidden=!value;
 for(const id of['play','hold','first','compare','sound','reloadMedia','timeline'])$(id).hidden=value;
 if(value)$('mediaNotice').hidden=true;
 if(!value&&!supportsCharacter)$('compare').hidden=true;
 $('rest').textContent=value?'← 다시 걷기':restEntryLabel;$('rest').classList.toggle('primary',value);
 $('modeLabel').textContent=value?restScene.title:'촬영된 경로를 따라 걷기';
 $('sceneLabel').textContent=value?restScene.title+' · 제공한 이미지':`${activeClip.file} · ${activeClip.title}`;
 $('renderStatus').textContent=value||supportsCharacter?'길 경로에 맞춘 여행자':'1인칭 시험 · 경로 불러오기 실패';
 $('truth').textContent=value?'풍경 속 자리에서 잠깐 쉬어가는 여행자':supportsCharacter?'촬영된 길을 따라 걷는 이미지 애니메이션':'캐릭터 경로를 불러오지 못해 1인칭으로 표시 중';
 if(value)setRestScene(restSceneId);
 else{
  $('stage').style.removeProperty('aspect-ratio');
  video.currentTime=savedWalkTime;$('hammockFront').hidden=true;$('wave').hidden=true;$('speech').hidden=true;
  $('help').textContent=walkHelp;$('playingState').textContent='멈춤 · W 또는 걷기 시작';
 }
 $('arrival').hidden=true;
}
function toggle(){if(video.paused)start();else pause();}
$('enter').addEventListener('click',start);$('play').addEventListener('click',toggle);
$('retryMedia').addEventListener('click',reloadMedia);$('reloadMedia').addEventListener('click',reloadMedia);
document.querySelectorAll('[data-traveler]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.traveler===travelerGender));button.addEventListener('click',()=>{travelerGender=button.dataset.traveler;avatar?.setTraveler(travelerGender);try{localStorage.setItem('jejumong-traveler',travelerGender);}catch{}document.querySelectorAll('[data-traveler]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.traveler===travelerGender)));});});
$('rest').addEventListener('click',()=>{if(!entered)return;if(resting)start();else setRest(true);});
$('sit').addEventListener('click',()=>setPose('sit'));
$('lie').addEventListener('click',()=>setPose('lie'));
$('stand').addEventListener('click',()=>setPose('stand'));
$('forestSpots').addEventListener('click',event=>{const button=event.target.closest('[data-spot]');if(button&&resting){const spot=spots[button.dataset.spot];setPose((spot.allowed||[spot.pose]).includes(restPose)?restPose:spot.pose,button.dataset.spot);}});
document.querySelectorAll('[data-rest-scene]').forEach(button=>button.addEventListener('click',()=>{if(resting)setRestScene(button.dataset.restScene);}));
$('hold').addEventListener('pointerdown',event=>{event.preventDefault();$('hold').setPointerCapture(event.pointerId);held=true;start();});
for(const event of['pointerup','pointercancel','lostpointercapture'])$('hold').addEventListener(event,()=>{if(held)pause();});
$('hold').addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();if(!e.repeat){held=true;start();}}});
$('hold').addEventListener('keyup',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();pause();}});
$('first').addEventListener('click',()=>{firstPerson=!firstPerson;$('first').setAttribute('aria-pressed',String(firstPerson));$('first').textContent=firstPerson?'캐릭터 보기':'1인칭 보기';});
$('compare').addEventListener('click',()=>{comparing=!comparing;document.body.classList.toggle('compare',comparing);$('compare').setAttribute('aria-pressed',String(comparing));$('compare').textContent=comparing?'합성 화면으로 돌아가기':'원본과 비교';$('sceneLabel').textContent=comparing?'웹용 영상만 표시 · 영상 재생 상태는 유지':`${activeClip.file} · ${activeClip.title}`;});
$('sound').addEventListener('click',()=>{video.muted=!video.muted;$('sound').setAttribute('aria-pressed',String(!video.muted));$('sound').textContent=video.muted?'원본 소리 끔':'원본 소리 켬';});
$('timeline').addEventListener('input',()=>{video.currentTime=Number($('timeline').value);$('arrival').hidden=true;});
$('wave').addEventListener('click',()=>{waveUntil=performance.now()+2300;$('speech').hidden=false;$('speech').textContent='반가워요. 잠깐 쉬다 가요.';setTimeout(()=>$('speech').hidden=true,2300);});
$('again').addEventListener('click',()=>{video.currentTime=0;start();});$('stay').addEventListener('click',()=>setRest(true));
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,[contenteditable=true]'))return;if(resting){if(e.code==='Escape'){e.preventDefault();start();}return;}if(['KeyW','ArrowUp','KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();if(!keys.has(e.code)){keys.add(e.code);if(['KeyW','ArrowUp'].includes(e.code))start();}}if(e.code==='Space'&&!e.repeat&&!e.target.matches('button,a')){e.preventDefault();toggle();}});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(['KeyW','ArrowUp'].includes(e.code))pause();});
window.addEventListener('blur',()=>{keys.clear();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();pause();}});
video.addEventListener('ended',()=>{$('arrival').hidden=false;});
video.addEventListener('playing',()=>{walkStartedAt=performance.now();});
video.addEventListener('loadedmetadata',()=>{
 $('timeline').max=video.duration;
 if(recoveryPosition!==null){const target=recoveryPosition;recoveryPosition=null;video.currentTime=Math.min(target,video.duration);if(entered&&!resting)start();}
});
for(const event of['loadeddata','canplay','playing','seeked'])video.addEventListener(event,clearMediaNotice);
for(const event of['waiting','stalled','seeking'])video.addEventListener(event,queueMediaNotice);
video.addEventListener('error',()=>{clearTimeout(mediaWaitTimer);mediaFailed=true;showMediaNotice('영상을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 불러오세요.');});
try{initialize3D();}catch(e){renderer=null;$('renderStatus').textContent='3D 사용 불가';showError('WebGL 3D를 시작할 수 없습니다. 영상 조작만 가능합니다. 오류: '+e.message);$('first').disabled=true;}
for(const id of['enter','play','hold','rest'])$(id).disabled=false;$('enter').textContent='영상 속 길로 들어가기 →';requestAnimationFrame(render);
if(!supportsCharacter){$('first').disabled=true;$('first').textContent='캐릭터 경로 없음';$('compare').hidden=true;}
else $('truth').textContent='영상별 길 경로 + 프레임 움직임 보정 · 가림·바닥 정밀도 시험 중';
$('pathDebug').hidden=new URLSearchParams(location.search).get('debug')!=='1';
$('jump').addEventListener('click',()=>{pause();const target=THREE.MathUtils.clamp(Number($('jumpTime').value)||0,0,Number.isFinite(video.duration)?video.duration:activeClip.duration);if(Math.abs(video.currentTime-target)>.001){video.dataset.seeking='true';video.currentTime=target;}});
video.dataset.seeking='false';video.addEventListener('seeking',()=>video.dataset.seeking='true');video.addEventListener('seeked',()=>video.dataset.seeking='false');
$('showFoot').addEventListener('change',()=>$('footMarker').hidden=!$('showFoot').checked||resting);

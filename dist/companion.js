// A small, articulated Jeju companion. Geometry and animation are local.
// Walking is driven by ground distance, not time: the stance foot is solved
// with a two-bone IK so it stays planted while the body passes over it.
// The joints carry simple procedural meshes as a fallback; once the Blender-built
// glTF parts (assets/characters/<id>.glb) load, they replace them joint by joint.
const ASSET_CACHE=new Map();
function loadAssets(T,id){
 if(typeof document==='undefined')return Promise.reject(Error('no DOM'));
 if(!ASSET_CACHE.has(id))ASSET_CACHE.set(id,import('./vendor/GLTFLoader.js').then(({GLTFLoader})=>new GLTFLoader().loadAsync(`/assets/characters/${id}.glb?v=8`)).then(gltf=>{
  const parts=new Map();gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=!/glint/i.test(o.name);o.receiveShadow=false;parts.set(o.name.replace(/[^A-Za-z]/g,''),o);}});return parts;
 }).catch(error=>{ASSET_CACHE.delete(id);throw error;}));
 return ASSET_CACHE.get(id);
}
export function preloadCompanionAssets(T,ids=['stone','citrus','cloud','sprout']){return Promise.all(ids.map(id=>loadAssets(T,id).catch(()=>null)));}
export function createCompanion(T,{character='stone'}={}){
 const root=new T.Group(),sphere=new T.SphereGeometry(1,28,18);
 root.name='jeju-stone-companion';
 const material=(color,roughness=.9)=>new T.MeshStandardMaterial({color,roughness,metalness:0});
 const stone=material('#535e56'),face=material('#a8b19c'),ink=material('#34443b');
 const cloth=material('#c2d3b5'),rib=material('#9db598'),sole=material('#ded8bd'),boot=material('#637263');
 const leather=material('#bd9169'),leatherDark=material('#946b4d'),citrus=material('#eeaa4f'),leaf=material('#79985c');
 const mesh=(parent,geometry,mat,xyz,scale=[1,1,1])=>{const m=new T.Mesh(geometry,mat);m.position.set(...xyz);m.scale.set(...scale);m.castShadow=true;m.userData.procedural=true;parent.add(m);return m;};
 const ball=(p,m,xyz,s)=>mesh(p,sphere,m,xyz,s);
 const joint=(parent,name,xyz)=>{const g=new T.Group();g.name=name;g.position.set(...xyz);parent.add(g);return g;};
 const curve=(parent,points,mat,radius=.008)=>mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),18,radius,6,false),mat,[0,0,0]);
 const PELVIS_Y=.50,CHEST_Y=.20,L1=.20,L2=.20,FOOT=.10,HIP_X=.125;
 const pelvis=joint(root,'pelvis',[0,PELVIS_Y,0]),chest=joint(pelvis,'chest',[0,CHEST_Y,0]);
 mesh(chest,new T.CapsuleGeometry(.235,.20,8,24),cloth,[0,0,0],[1,1,.93]);
 mesh(chest,new T.TorusGeometry(.18,.035,8,24),rib,[0,-.245,0]).rotation.x=Math.PI/2;
 mesh(chest,new T.TorusGeometry(.15,.043,8,24),cloth,[0,.25,-.02],[1,1,.85]).rotation.x=Math.PI/2;
 ball(chest,rib,[0,-.095,.211],[.16,.078,.045]);
 curve(chest,[[-.075,.215,.15],[-.065,.13,.225],[-.07,.045,.232]],sole,.009);
 curve(chest,[[.075,.215,.15],[.065,.13,.225],[.08,.075,.232]],sole,.009);
 for(const side of[-1,1]){
  curve(chest,[[side*.17,.24,-.17],[side*.20,.20,.12],[side*.18,-.01,.215],[side*.15,-.19,.17]],leather,.018);
 }
 // A layered canvas backpack remains readable from the walking camera. It hangs
 // from its own pivot so it can swing a little as the body moves.
 const pack=joint(chest,'pack',[0,.17,-.20]);
 mesh(pack,new T.CapsuleGeometry(.143,.12,8,20),leather,[0,-.175,-.03],[1,1,.66]);
 mesh(pack,new T.CapsuleGeometry(.108,.035,6,20),leatherDark,[0,-.275,-.127],[1,.8,.30]);
 mesh(pack,new T.TorusGeometry(.053,.013,6,16),leatherDark,[0,.02,-.035]);
 ball(pack,sole,[0,-.135,-.131],[.037,.037,.014]);
 const badge=ball(pack,leaf,[.013,-.095,-.131],[.025,.009,.008]);badge.rotation.z=.4;
 const neck=joint(chest,'neck',[0,.48,0]);
 const rockGeometry=new T.SphereGeometry(1,32,20),positions=rockGeometry.attributes.position;
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
  const irregular=1+.019*Math.sin(x*7+z*5)*Math.cos(y*8-z*3);
  positions.setXYZ(i,x*irregular,y*irregular,z*irregular);
 }
 rockGeometry.computeVertexNormals();
 mesh(neck,rockGeometry,stone,[0,0,0],[.355,.335,.315]);
 ball(neck,face,[0,-.025,.277],[.265,.196,.058]);
 const poreMat=material('#424e46');
 for(let i=0;i<12;i++){
  const a=i*2.399963,y=-.19+(i%4)*.125,z=Math.sin(a)*.29,x=Math.cos(a)*Math.sqrt(Math.max(.01,.32*.32-y*y));
  if(z>.19&&Math.abs(x)<.22)continue;
  ball(neck,poreMat,[x,y,z],[.012+(i%3)*.003,.008,.009]);
 }
 const clouds=[];
 for(const [x,y,scale] of [[-.24,.13,.19],[.23,.13,.19],[0,.24,.21]])clouds.push(ball(neck,stone,[x,y,-.05],[scale,scale*.9,scale*.83]));
 const openEyes=[],closedEyes=[],pupils=[];
 const glint=new T.MeshBasicMaterial({color:'#ffffff'});
 for(const side of[-1,1]){
  const eye=joint(neck,'eye',[side*.105,.035,.334]);
  ball(eye,ink,[0,0,.015],[.022,.030,.012]);
  const pupil=ball(eye,glint,[side*.007,.011,.026],[.006,.007,.004]);pupil.castShadow=false;pupils.push(pupil);
  openEyes.push(eye);
  const closed=curve(neck,[[side*.105-.040,.026,.351],[side*.105,.011,.358],[side*.105+.040,.026,.351]],ink,.009);closed.visible=false;closedEyes.push(closed);
  curve(neck,[[side*.105-.040,.111,.326],[side*.105,.121,.334],[side*.105+.038,.108,.326]],stone,.008);
  ball(neck,material('#b9aa91'),[side*.177,-.053,.315],[.043,.022,.009]);
 }
 ball(neck,stone,[0,-.032,.348],[.038,.028,.021]);
 curve(neck,[[-.047,-.092,.337],[0,-.108,.347],[.047,-.092,.337]],ink,.008);
 // The leaf and sprout pieces hang from a pivot so they can bob with the steps.
 const crown=joint(neck,'crown',[0,.33,-.007]);
 ball(crown,citrus,[0,.028,0],[.115,.096,.112]);
 mesh(crown,new T.CylinderGeometry(.012,.016,.047,8),leatherDark,[.005,.136,0]);
 const citrusLeaf=ball(crown,leaf,[.075,.145,.002],[.076,.018,.036]);citrusLeaf.rotation.z=.37;
 const secondLeaf=ball(crown,leaf,[-.033,.153,-.011],[.045,.013,.027]);secondLeaf.rotation.z=-.5;
 const arms=[],legs=[];
 for(const side of[-1,1]){
  const shoulder=joint(chest,side<0?'left-shoulder':'right-shoulder',[side*.29,.12,0]);
  mesh(shoulder,new T.CapsuleGeometry(.075,.075,6,16),cloth,[0,-.093,0]);
  const elbow=joint(shoulder,'elbow',[0,-.19,0]);
  mesh(elbow,new T.CapsuleGeometry(.065,.08,6,16),cloth,[0,-.092,0]);
  ball(elbow,rib,[0,-.175,0],[.071,.035,.070]);
  ball(elbow,stone,[0,-.225,.008],[.076,.077,.071]);
  ball(elbow,stone,[-side*.052,-.205,.030],[.032,.044,.034]);
  arms.push({shoulder,elbow});
  const hip=joint(pelvis,side<0?'left-hip':'right-hip',[side*HIP_X,0,0]);
  mesh(hip,new T.CapsuleGeometry(.078,.07,6,18),rib,[0,-.098,0]);
  const knee=joint(hip,'knee',[0,-L1,0]);
  mesh(knee,new T.CapsuleGeometry(.066,.085,6,18),rib,[0,-.095,0]);
  const ankle=joint(knee,'ankle',[0,-L2,0]);
  ball(ankle,boot,[0,-.040,.048],[.102,.056,.150]);
  ball(ankle,sole,[0,-.082,.050],[.105,.018,.151]);
  ball(ankle,boot,[0,.027,0],[.079,.051,.079]);
  legs.push({hip,knee,ankle});
 }
 let poseError=0;
 const clamp=T.MathUtils.clamp,damp=T.MathUtils.damp;
 const rotate=(g,v,dt,speed=8)=>{g.rotation.x=damp(g.rotation.x,v[0],speed,dt);g.rotation.y=damp(g.rotation.y,v[1],speed,dt);g.rotation.z=damp(g.rotation.z,v[2],speed,dt);poseError=Math.max(poseError,Math.abs(g.rotation.x-v[0]),Math.abs(g.rotation.y-v[1]),Math.abs(g.rotation.z-v[2]));};
 // Fold both legs across the board surface. Solve the two bone directions so
 // the ankles stay above the board instead of dangling through it.
 const down=new T.Vector3(0,-1,0),boardLegs=[-1,1].map(side=>{
  const upper=new T.Quaternion().setFromUnitVectors(down,new T.Vector3(side*.12,-.018,.158).normalize());
  const lower=new T.Quaternion().setFromUnitVectors(down,new T.Vector3(-side*.19,-.005,.035).normalize());
  const foot=new T.Quaternion().setFromEuler(new T.Euler(0,-side*Math.PI/2,0));
  const angles=q=>{const e=new T.Euler().setFromQuaternion(q);return[e.x,e.y,e.z];};
  return{hip:angles(upper),knee:angles(upper.clone().invert().multiply(lower)),ankle:angles(lower.clone().invert().multiply(foot))};
 });
 // Two-bone leg IK. `target` is the ankle position relative to the hip joint in
 // pelvis space (x sideways, y up, z forward). Returns joint Euler angles.
 function legIK(target,footPitch){
  let tx=target.x,ty=target.y,tz=target.z;
  const reach=L1+L2,length=Math.hypot(tx,ty,tz);
  if(length>reach){const s=reach/length;tx*=s;ty*=s;tz*=s;}
  const d=Math.max(.05,Math.hypot(tx,ty,tz)),planar=Math.max(.02,Math.hypot(ty,tz));
  const alpha=Math.atan2(tz,-ty);
  const beta=Math.acos(clamp((L1*L1+d*d-L2*L2)/(2*L1*d),-1,1));
  const flex=Math.PI-Math.acos(clamp((L1*L1+L2*L2-d*d)/(2*L1*L2),-1,1));
  const hipX=-(alpha+beta),hipZ=Math.atan2(tx,planar);
  return{hip:[hipX,0,hipZ],knee:[flex,0,0],ankle:[-hipX-flex+footPitch,0,-hipZ]};
 }
 // Gait constants in model units (the model is about 1.0 tall).
 const CYCLE=.42,STANCE=.6,LIFT=.052,NOMINAL_SPEED=CYCLE/1.9,MAX_CADENCE=2.3;
 let gait=0,phase=0,lastDistance=null,speedSmooth=0,lean=0,settleTarget=null;
 let lookYaw=0,lookPitch=0,lookTargetYaw=0,lookTargetPitch=0,nextLook=2+Math.random()*4;
 let nextBlink=1.5+Math.random()*3,blinkAt=-1,blinkTwice=false,lastTime=null;
 let variation='look',variationStart=-1,variationDuration=3,variationDir=1,nextVariation=6+Math.random()*8;
 const assetLids=[null,null],events=[];root.userData.events=events;
 const swayPhase=Math.random()*Math.PI*2;
 const feet=[{z:0,y:FOOT,lift:0},{z:0,y:FOOT,lift:0}];
 function footTrajectory(cycle,amplitude){
  // Stance: the foot slides back under the body at ground speed. Swing: it arcs forward.
  if(cycle<STANCE){const s=cycle/STANCE;return{z:amplitude*(1-2*s),y:FOOT,pitch:0};}
  const s=(cycle-STANCE)/(1-STANCE),ease=s*s*(3-2*s);
  return{z:amplitude*(-1+2*ease),y:FOOT+LIFT*Math.sin(Math.PI*s),pitch:.35*Math.sin(Math.PI*s)*(1-s)-.12*s*s*s};
 }
 function update({dt,time,walkTime=0,walking=false,pose='walk',profile='forest',wave=false,act=null,distance,speed,lookAt=0}){
  poseError=0;dt=Math.max(1e-4,dt);
  if(lastTime===null)lastTime=time;
  const resting=pose!=='walk',lying=pose==='lie',sitting=pose==='sit';
  for(const child of chest.children)if(child===pack||child.material===leather||child.material===leatherDark)child.visible=!resting;
  // Distance travelled in model units. Callers without ground tracking fall back to time.
  if(distance===undefined)distance=walkTime*NOMINAL_SPEED;
  if(lastDistance===null)lastDistance=distance;
  let delta=Math.max(0,distance-lastDistance);lastDistance=distance;
  if(speed===undefined)speed=walking?delta/dt:0;
  if(!walking)speed=0;
  speedSmooth=damp(speedSmooth,speed,6,dt);
  const ratio=speedSmooth/NOMINAL_SPEED;
  gait=damp(gait,clamp(ratio/.25,0,1),5,dt);
  lean=damp(lean,clamp((speed-speedSmooth)*.9,-.06,.12),4,dt);
  // Short legs: the stride lengthens with speed up to a lively trot, and the cadence is capped so
  // a fast camera never turns the walk into a blur (a little slide is better than a scramble).
  const stride=CYCLE*clamp(.55+.3*ratio,.55,1.6),cadence=Math.min(speedSmooth/stride,MAX_CADENCE);
  const previousPhase=phase;
  if(walking&&ratio>.03){phase=(phase+Math.min(delta/stride,MAX_CADENCE*dt))%1;settleTarget=null;}
  // Footfalls: the left foot lands as the cycle wraps, the right as it passes the half.
  if(walking&&gait>.15){
   if(phase<previousPhase)events.push({type:'footfall',side:0,strength:gait});
   else if(previousPhase<.5&&phase>=.5)events.push({type:'footfall',side:1,strength:gait});
  }
  else{
   // Finish the current step at a modest rate so the feet come together in double support.
   if(settleTarget===null){const nearest=Math.round(phase*2)/2;settleTarget=(nearest-phase<-.1?nearest+.5:nearest);}
   if(phase<settleTarget-1e-6)phase=Math.min(settleTarget,phase+dt*1.6);
   else if(settleTarget>=1){phase=0;settleTarget=0;}
  }
  const breath=Math.sin(time*1.45),phi=phase*Math.PI*2;
  const walkAmp=.28*stride;
  let chestAngles=[0,0,0],neckAngles=[.01,0,0],pelvisAngles=[0,0,0];
  let shoulders=[[0,0,-.10],[0,0,.10]],elbows=[[-.16,0,0],[-.16,0,0]];
  let hips=[[0,0,0],[0,0,0]],knees=[[0,0,0],[0,0,0]],ankles=[[0,0,0],[0,0,0]];
  let pelvisPos=[0,PELVIS_Y,0];
  if(!resting){
   // Idle look-around and blinking happen in both idle and walk.
   // Now and then the companion glances back over its shoulder at the viewer.
   if(time>nextLook){const glance=gait>.5&&Math.random()<.18;lookTargetYaw=glance?(Math.random()<.5?-1:1)*.85:(Math.random()-.5)*.6;lookTargetPitch=glance?.06:(Math.random()-.5)*.16;nextLook=time+(glance?1.6:2.5+Math.random()*4.5);}
   lookYaw=damp(lookYaw,clamp(lookAt,-.6,.6)*gait+lookTargetYaw*(1-gait*.3),2.5,dt);
   lookPitch=damp(lookPitch,lookTargetPitch*(1-gait*.6)-.03*gait,2.5,dt);
   const idle=1-gait;
   // Pelvis: lower while walking, bob twice per cycle, sway toward the stance leg.
   const calm=clamp(1.3/Math.max(.5,cadence),.45,1),bob=-.009*calm*Math.cos(2*phi),sway=-.013*calm*Math.sin(phi);
   pelvisPos=[sway*gait+idle*.005*Math.sin(time*.8+swayPhase),PELVIS_Y-.012*gait+bob*gait+idle*breath*.002,0];
   pelvisAngles=[0,.08*gait*Math.cos(phi),-.035*gait*Math.sin(phi)];
   chestAngles=[.05*gait+lean+breath*.006*idle+Math.abs(Math.sin(phi))*.012*gait,-.5*pelvisAngles[1],-.5*pelvisAngles[2]+Math.sin(time*.43)*.008*idle];
   neckAngles=[.02+lookPitch-.4*chestAngles[0]+breath*.006*idle,lookYaw-.5*chestAngles[1],-.3*chestAngles[2]];
   const armSwing=.42*gait*Math.cos(phi);
   shoulders=[[armSwing,0,-.10-.04*gait],[-armSwing,0,.10+.04*gait]];
   elbows=[[-.22-.22*Math.max(0,-armSwing),0,0],[-.22-.22*Math.max(0,armSwing),0,0]];
   for(let i=0;i<2;i++){
    const cycle=(phase+(i?.5:0))%1,track=footTrajectory(cycle,walkAmp);
    const foot=feet[i],idleZ=0;
    const targetZ=track.z*gait+idleZ*idle,targetY=FOOT+(track.y-FOOT)*gait;
    // When the gait blend changes the feet reposition; lift them a little so it reads as a shuffle, not a slide.
    const moved=Math.abs(targetZ-foot.z);
    foot.lift=damp(foot.lift,clamp(moved/dt*.25,0,LIFT*.5)*(1-gait),12,dt);
    foot.z=targetZ;foot.y=targetY+foot.lift;
    const target={x:-pelvisPos[0],y:foot.y-pelvisPos[1],z:foot.z};
    const solved=legIK(target,track.pitch*gait);
    hips[i]=solved.hip;knees[i]=solved.knee;ankles[i]=solved.ankle;
   }
  }
  if(resting){
   chestAngles=[.015+breath*.006,0,Math.sin(time*.43)*.009];
   neckAngles=[.045+breath*.007,Math.sin(time*.24)*.08,.025];
   shoulders=[[.02,0,-.10],[.02,0,.10]];
   lastDistance=distance;gait=0;phase=0;settleTarget=null;
  }
  // Resting idle variations: every so often look around, stretch, nod or shift weight.
  let variationEnv=0;
  if(resting&&!wave){
   if(time>nextVariation){variation=['look','look','stretch','nod','shift'][Math.floor(Math.random()*5)];variationStart=time;variationDuration=2.4+Math.random()*2.2;variationDir=Math.random()<.5?-1:1;nextVariation=time+variationDuration+7+Math.random()*11;}
   const u=variationStart>=0?clamp((time-variationStart)/variationDuration,0,1):0;variationEnv=Math.sin(Math.PI*u);
  }
  if(sitting){
   const board=profile==='coastPaddles';
   chestAngles=[board?.08:profile==='coastLounge'?-.12:.09,0,-.025];
   neckAngles=[.09+breath*.008,.20+Math.sin(time*.21)*.035,-.065];
   shoulders=[[-.10,0,.35],[-.13,0,-.35]];elbows=[[-.80,0,.08],[-.75,0,-.08]];
   hips=[[-1.50,0,-.03],[-1.48,0,.03]];knees=[[1.52,0,0],[1.50,0,0]];ankles=[[0,0,0],[0,0,0]];
   // On a floor cushion the legs stretch out in front instead of hanging over a seat edge.
   if(profile==='floor'){chestAngles=[.05,0,-.02];knees=[[.06,0,0],[.02,0,0]];ankles=[[-.45,0,0],[-.40,0,0]];hips=[[-1.56,0,-.12],[-1.54,0,.12]];}
   if(board){
    hips=boardLegs.map(leg=>leg.hip);knees=boardLegs.map(leg=>leg.knee);ankles=boardLegs.map(leg=>leg.ankle);
    shoulders=[[-.22,0,.12],[-.22,0,-.12]];elbows=[[-.90,0,.08],[-.90,0,-.08]];
   }
  }
  if(lying){
   chestAngles=[-.035+breath*.006,0,.015];neckAngles=[.10,-.10,.10];
   shoulders=[[-.35,0,.48],[-.30,0,-.48]];elbows=[[-1.55,0,.22],[-1.45,0,-.22]];
   hips=[[-.12,0,-.045],[-.18,0,.06]];knees=[[.24,0,0],[.34,0,0]];ankles=[[-.08,0,-.06],[-.12,0,.05]];
   if(profile==='coastHammocks'||profile==='forest'){
    shoulders[0]=[-2.48,0,-.40];elbows[0]=[-1.30,0,-.15];
    neckAngles=[.07,-.12,.13];hips[0]=[-.20,0,-.04];knees[0]=[.42,0,0];
   }
   if(profile==='coastPaddles'){neckAngles=[.08,.16,-.10];shoulders[1]=[-2.48,0,.40];elbows[1]=[-1.30,0,.15];}
  }
  if(variationEnv>0){
   const e=variationEnv;
   if(variation==='look'){neckAngles=[neckAngles[0]-.03*e,neckAngles[1]+variationDir*.42*e,neckAngles[2]+variationDir*.05*e];}
   else if(variation==='nod'){neckAngles=[neckAngles[0]+.09*Math.sin(((time-variationStart)/variationDuration)*Math.PI*3)*e,neckAngles[1],neckAngles[2]];}
   else if(variation==='shift'){chestAngles=[chestAngles[0]-.03*e,chestAngles[1]+variationDir*.08*e,chestAngles[2]+variationDir*.05*e];}
   else if(variation==='stretch'&&sitting){shoulders=[[shoulders[0][0]-2.1*e,0,shoulders[0][2]-.35*e],[shoulders[1][0]-2.1*e,0,shoulders[1][2]+.35*e]];elbows=[[elbows[0][0]*(1-e)-.15*e,0,0],[elbows[1][0]*(1-e)-.15*e,0,0]];chestAngles=[chestAngles[0]-.14*e,chestAngles[1],chestAngles[2]];neckAngles=[neckAngles[0]-.12*e,neckAngles[1],neckAngles[2]];}
   else if(variation==='stretch'&&lying){neckAngles=[neckAngles[0]-.05*e,neckAngles[1]+variationDir*.25*e,neckAngles[2]];knees[1]=[knees[1][0]+.35*e,0,0];hips[1]=[hips[1][0]-.25*e,0,hips[1][2]];}
  }
  // Theater actions (theater.js), over the floor sit: `act` is {name, t} with t seconds since it began.
  if(act&&sitting){
   const t=act.t,ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
   const mix=(a,b,k)=>a.map((v,n)=>v+(b[n]-v)*k);
   if(act.name==='eat'){
    // Seen from behind: the right hand reaches out to the bucket by the hip, then comes up in
    // front of the face; the head bobs a little while chewing.
    const c=(t%2.2)/2.2,up=c<.3?ease(c/.3):c<.72?1:1-ease((c-.72)/.28),chew=c>.3&&c<.8?Math.sin((c-.3)*44)*.035:0;
    shoulders[0]=[-.55,0,.25];elbows[0]=[-.95,0,.35];
    shoulders[1]=mix([-.10,0,.55],[-1.95,0,.30],up);elbows[1]=mix([-.35,0,0],[-1.70,0,-.35],up);
    neckAngles=[neckAngles[0]+.04*up+chew,neckAngles[1]*.3,neckAngles[2]*.3];
   }else if(act.name==='drink'){
    // Cup up to the mouth, a few small sips (the head nods with each), then down in front again.
    const c=(t%3.4)/3.4,up=c<.22?ease(c/.22):c<.78?1:1-ease((c-.78)/.22),sip=c>.22&&c<.78?Math.max(0,Math.sin((c-.22)*48))*.05:0;
    shoulders[1]=mix([-.55,0,.20],[-1.90,0,.22],up);elbows[1]=mix([-.90,0,0],[-1.65,0,-.30],up);
    shoulders[0]=[-.12,0,.32];elbows[0]=[-.75,0,.06];
    neckAngles=[neckAngles[0]-.10*up+sip,neckAngles[1]*.3,neckAngles[2]*.3];chestAngles=[chestAngles[0]-.04*up,chestAngles[1],chestAngles[2]];
   }else if(act.name==='clap'){
    const k=Math.abs(Math.sin(t*9))*.18;
    shoulders=[[-1.05,0,.50-k],[-1.05,0,-.50+k]];elbows=[[-.85,0,0],[-.85,0,0]];
    neckAngles=[neckAngles[0]+.04*Math.sin(t*9),neckAngles[1]*.3,neckAngles[2]];
   }else if(act.name==='recline'){
    // Leaning back on both hands to watch.
    chestAngles=[-.42,0,0];neckAngles=[.30,neckAngles[1]*.5,0];
    shoulders=[[.95,0,.42],[.95,0,-.42]];elbows=[[-.10,0,0],[-.10,0,0]];
   }
  }
  if(wave&&!lying){shoulders[1]=[-.1,0,2.25+Math.sin(time*12)*.12];elbows[1]=[-.25,0,.38+Math.sin(time*12)*.20];neckAngles=[-.04,-.10,-.04];}
  const quick=resting?8:40,legSpeed=resting?10:60;
  rotate(pelvis,pelvisAngles,dt,quick);rotate(chest,chestAngles,dt,resting?8:20);rotate(neck,neckAngles,dt,resting?4:12);
  pelvis.position.x=damp(pelvis.position.x,pelvisPos[0],quick,dt);pelvis.position.y=damp(pelvis.position.y,pelvisPos[1],quick,dt);
  chest.position.y=CHEST_Y+(resting?breath*.004:0);
  chest.scale.set(1+(resting?breath*.005:0),1+(resting?breath*.009:0),1);
  for(let i=0;i<2;i++){rotate(arms[i].shoulder,shoulders[i],dt,resting?9:24);rotate(arms[i].elbow,elbows[i],dt,resting?9:24);rotate(legs[i].hip,hips[i],dt,legSpeed);rotate(legs[i].knee,knees[i],dt,legSpeed);rotate(legs[i].ankle,ankles[i],dt,legSpeed);}
  // Secondary motion: the backpack and the leaf lag behind the body's acceleration.
  const chestSwing=Math.sin(phi)*gait;
  pack.rotation.x=damp(pack.rotation.x,-.06*gait-lean*.8+Math.abs(Math.sin(phi))*.03*gait,5,dt);
  pack.rotation.z=damp(pack.rotation.z,-chestSwing*.05,5,dt);
  crown.rotation.x=damp(crown.rotation.x,-lean*.9-Math.abs(Math.sin(phi))*.06*gait,6,dt);
  crown.rotation.z=damp(crown.rotation.z,chestSwing*.07,6,dt);
  // Blinks come at random intervals, sometimes twice.
  if(blinkAt<0&&time>nextBlink){blinkAt=time;blinkTwice=Math.random()<.22;}
  let blink=0;
  if(blinkAt>=0){const since=time-blinkAt;if(since<.16)blink=Math.sin(since/.16*Math.PI);else if(blinkTwice&&since<.34)blink=Math.sin((since-.18)/.16*Math.PI);else{blinkAt=-1;nextBlink=time+1.8+Math.random()*4.2;}}
  const closure=wave?Math.max(0,blink):lying?.98:sitting?.69+.07*Math.sin(time*.6):Math.max(0,blink);
  for(let i=0;i<2;i++){openEyes[i].scale.y=Math.max(.06,1-closure);openEyes[i].visible=closure<.60;closedEyes[i].visible=closure>=.60&&!assetLids[i];if(assetLids[i])assetLids[i].visible=closure>=.60;openEyes[i].rotation.y=resting?0:lookYaw*.35;}
  root.userData.poseSettled=poseError<.025;
  root.userData.frame=Math.floor(phase*8)%8;root.userData.clip=walking&&gait>.2?'walk':'idle';
  root.userData.gait=gait;root.userData.phase=phase;root.userData.feet=feet.map(f=>({z:f.z,y:f.y}));
  lastTime=time;
 }
 function setCharacter(id){
  character=['stone','citrus','cloud','sprout'].includes(id)?id:'stone';
  const palettes={stone:['#65736a','#cdd5b7','#b7cba6','#8ca17e'],citrus:['#eaa04e','#ffdda0','#f3dfb4','#b7bd83'],cloud:['#e9e6dc','#fff9e5','#cadbdb','#9fb6b4'],sprout:['#8dab7a','#e3eac3','#d4ddb4','#8eaa7e']};
  const colors=palettes[character];stone.color.set(colors[0]);face.color.set(colors[1]);cloth.color.set(colors[2]);rib.color.set(colors[3]);
  poreMat.visible=character==='stone';poreMat.transparent=true;poreMat.opacity=character==='stone'?1:0;
  clouds.forEach(m=>m.visible=character==='cloud');
  crown.children.filter(m=>m.material===citrus).forEach(m=>m.visible=character==='stone');
  citrusLeaf.visible=secondLeaf.visible=character!=='cloud';
  citrusLeaf.scale.set(character==='sprout'?.16:character==='citrus'?.13:.076,.018,character==='sprout'?.055:.036);
  secondLeaf.scale.set(character==='sprout'?.13:.045,.013,character==='sprout'?.045:.027);
  citrusLeaf.position.y=character==='stone'?.145:.05;secondLeaf.position.y=character==='stone'?.153:.07;
  crown.children.filter(m=>m.geometry?.type==='CylinderGeometry').forEach(m=>m.visible=character==='stone');
  root.userData.character=character;
  if(root.userData.assets)hideProcedural();
  attachAssets(character);
 }
 // glTF parts: cloned per companion (geometry and materials stay shared), hung on the joints.
 const assetMeshes=[];let assetGeneration=0,envIntensity=1;
 const jointFor={body:chest,head:neck,crown,pack,armUpperL:arms[0].shoulder,armLowerL:arms[0].elbow,armUpperR:arms[1].shoulder,armLowerR:arms[1].elbow,legUpperL:legs[0].hip,legLowerL:legs[0].knee,footL:legs[0].ankle,legUpperR:legs[1].hip,legLowerR:legs[1].knee,footR:legs[1].ankle};
 function hideProcedural(){root.traverse(o=>{if(o.userData.procedural)o.visible=false;});}
 function detachAssets(){for(const m of assetMeshes)m.parent?.remove(m);assetMeshes.length=0;assetLids[0]=assetLids[1]=null;root.traverse(o=>{if(o.userData.procedural)o.visible=true;});root.userData.assets=false;}
 function applyEnv(){for(const m of assetMeshes)if(m.material&&'envMapIntensity' in m.material)m.material.envMapIntensity=envIntensity;}
 function attachAssets(id){
  const generation=++assetGeneration;
  loadAssets(T,id).then(parts=>{
   if(generation!==assetGeneration)return;
   detachAssets();
   const place=(source,parent,position)=>{const m=source.clone();m.position.copy(position||new T.Vector3());m.rotation.set(0,0,0);m.scale.set(1,1,1);m.userData.asset=true;parent.add(m);assetMeshes.push(m);return m;};
   for(const[name,joint]of Object.entries(jointFor)){const part=parts.get(name);if(!part)continue;place(part,joint);}
   for(const[i,side]of[[0,'L'],[1,'R']]){
    const eye=parts.get('eye'+side),glint=parts.get('glint'+side),lid=parts.get('lid'+side);
    if(eye){openEyes[i].position.copy(eye.position);place(eye,openEyes[i]);if(glint)place(glint,openEyes[i],glint.position.clone().sub(eye.position));}
    if(lid){assetLids[i]=place(lid,neck,lid.position);}
   }
   hideProcedural();applyEnv();root.userData.assets=true;
  }).catch(()=>{});
 }
 setCharacter(character);
 return{root,update,setCharacter,setEnvIntensity(value){envIntensity=value;applyEnv();},ready:true,kind:'companion',seatHeight:.365,
  // Forearm joints, for props held in a hand (the hand sits at about y -.23 in the joint).
  hands:[arms[0].elbow,arms[1].elbow]};
}

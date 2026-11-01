// A small, articulated Jeju stone companion. Geometry and animation are local.
export function createCompanion(T,{character='stone'}={}){
 const root=new T.Group(),sphere=new T.SphereGeometry(1,28,18);
 root.name='jeju-stone-companion';
 const material=(color,roughness=.9)=>new T.MeshStandardMaterial({color,roughness,metalness:0});
 const stone=material('#535e56'),face=material('#a8b19c'),ink=material('#34443b');
 const cloth=material('#c2d3b5'),rib=material('#9db598'),sole=material('#ded8bd'),boot=material('#637263');
 const leather=material('#bd9169'),leatherDark=material('#946b4d'),citrus=material('#eeaa4f'),leaf=material('#79985c');
 const mesh=(parent,geometry,mat,xyz,scale=[1,1,1])=>{const m=new T.Mesh(geometry,mat);m.position.set(...xyz);m.scale.set(...scale);parent.add(m);return m;};
 const ball=(p,m,xyz,s)=>mesh(p,sphere,m,xyz,s);
 const joint=(parent,name,xyz)=>{const g=new T.Group();g.name=name;g.position.set(...xyz);parent.add(g);return g;};
 const curve=(parent,points,mat,radius=.008)=>mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),18,radius,6,false),mat,[0,0,0]);
 const pelvis=joint(root,'pelvis',[0,.50,0]),chest=joint(pelvis,'chest',[0,.20,0]);
 mesh(chest,new T.CapsuleGeometry(.235,.20,8,24),cloth,[0,0,0],[1,1,.93]);
 mesh(chest,new T.TorusGeometry(.18,.035,8,24),rib,[0,-.245,0]).rotation.x=Math.PI/2;
 mesh(chest,new T.TorusGeometry(.15,.043,8,24),cloth,[0,.25,-.02],[1,1,.85]).rotation.x=Math.PI/2;
 ball(chest,rib,[0,-.095,.211],[.16,.078,.045]);
 curve(chest,[[-.075,.215,.15],[-.065,.13,.225],[-.07,.045,.232]],sole,.009);
 curve(chest,[[.075,.215,.15],[.065,.13,.225],[.08,.075,.232]],sole,.009);
 for(const side of[-1,1]){
  curve(chest,[[side*.17,.24,-.17],[side*.20,.20,.12],[side*.18,-.01,.215],[side*.15,-.19,.17]],leather,.018);
 }
 // A layered canvas backpack remains readable from the walking camera.
 mesh(chest,new T.CapsuleGeometry(.143,.12,8,20),leather,[0,-.005,-.23],[1,1,.66]);
 mesh(chest,new T.CapsuleGeometry(.108,.035,6,20),leatherDark,[0,-.105,-.327],[1,.8,.30]);
 mesh(chest,new T.TorusGeometry(.053,.013,6,16),leatherDark,[0,.19,-.235]);
 ball(chest,sole,[0,.035,-.331],[.037,.037,.014]);
 const badge=ball(chest,leaf,[.013,.075,-.331],[.025,.009,.008]);badge.rotation.z=.4;
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
 const openEyes=[],closedEyes=[];
 for(const side of[-1,1]){
  const eye=joint(neck,'eye',[side*.105,.035,.334]);
  ball(eye,ink,[0,0,.015],[.022,.030,.012]);
  openEyes.push(eye);
  const closed=curve(neck,[[side*.105-.040,.026,.351],[side*.105,.011,.358],[side*.105+.040,.026,.351]],ink,.009);closed.visible=false;closedEyes.push(closed);
  curve(neck,[[side*.105-.040,.111,.326],[side*.105,.121,.334],[side*.105+.038,.108,.326]],stone,.008);
  ball(neck,material('#b9aa91'),[side*.177,-.053,.315],[.043,.022,.009]);
 }
 ball(neck,stone,[0,-.032,.348],[.038,.028,.021]);
 curve(neck,[[-.047,-.092,.337],[0,-.108,.347],[.047,-.092,.337]],ink,.008);
 ball(neck,citrus,[0,.358,-.007],[.115,.096,.112]);
 mesh(neck,new T.CylinderGeometry(.012,.016,.047,8),leatherDark,[.005,.466,-.007]);
 const citrusLeaf=ball(neck,leaf,[.075,.475,-.005],[.076,.018,.036]);citrusLeaf.rotation.z=.37;
 const secondLeaf=ball(neck,leaf,[-.033,.483,-.018],[.045,.013,.027]);secondLeaf.rotation.z=-.5;
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
  const hip=joint(pelvis,side<0?'left-hip':'right-hip',[side*.125,0,0]);
  mesh(hip,new T.CapsuleGeometry(.078,.07,6,18),rib,[0,-.098,0]);
  const knee=joint(hip,'knee',[0,-.20,0]);
  mesh(knee,new T.CapsuleGeometry(.066,.085,6,18),rib,[0,-.095,0]);
  const ankle=joint(knee,'ankle',[0,-.20,0]);
  ball(ankle,boot,[0,-.040,.048],[.102,.056,.150]);
  ball(ankle,sole,[0,-.082,.050],[.105,.018,.151]);
  ball(ankle,boot,[0,.027,0],[.079,.051,.079]);
  legs.push({hip,knee,ankle});
 }
 let poseError=0;
 const rotate=(g,v,dt,speed=8)=>{g.rotation.x=T.MathUtils.damp(g.rotation.x,v[0],speed,dt);g.rotation.y=T.MathUtils.damp(g.rotation.y,v[1],speed,dt);g.rotation.z=T.MathUtils.damp(g.rotation.z,v[2],speed,dt);poseError=Math.max(poseError,Math.abs(g.rotation.x-v[0]),Math.abs(g.rotation.y-v[1]),Math.abs(g.rotation.z-v[2]));};
 // Fold both legs across the board surface. Solve the two bone directions so
 // the ankles stay above the board instead of dangling through it.
 const down=new T.Vector3(0,-1,0),boardLegs=[-1,1].map(side=>{
  const upper=new T.Quaternion().setFromUnitVectors(down,new T.Vector3(side*.12,-.018,.158).normalize());
  const lower=new T.Quaternion().setFromUnitVectors(down,new T.Vector3(-side*.19,-.005,.035).normalize());
  const foot=new T.Quaternion().setFromEuler(new T.Euler(0,-side*Math.PI/2,0));
  const angles=q=>{const e=new T.Euler().setFromQuaternion(q);return[e.x,e.y,e.z];};
  return{hip:angles(upper),knee:angles(upper.clone().invert().multiply(lower)),ankle:angles(lower.clone().invert().multiply(foot))};
 });
 let gait=0;
 function update({dt,time,walkTime=0,walking=false,pose='walk',profile='forest',wave=false}){
  poseError=0;
  gait=T.MathUtils.damp(gait,walking?1:0,3.5,dt);
  const resting=pose!=='walk',lying=pose==='lie',sitting=pose==='sit';
  for(const child of chest.children)if(child.material===leather||child.material===leatherDark||child.position.z<-.2)child.visible=!resting;
  const breath=Math.sin(time*1.45),phase=walkTime*(Math.PI*2/1.9);
  let chestAngles=[0,0,Math.sin(phase)*.018*gait],neckAngles=[.01,0,0];
  let shoulders=[[-Math.sin(phase)*.16*gait,0,-.10],[Math.sin(phase)*.16*gait,0,.10]],elbows=[[-.16,0,0],[-.16,0,0]];
  let hips=[[Math.sin(phase)*.24*gait,0,0],[-Math.sin(phase)*.24*gait,0,0]],knees=[[Math.max(0,Math.sin(phase))*.30*gait,0,0],[Math.max(0,-Math.sin(phase))*.30*gait,0,0]];
  let ankles=[[-Math.sin(phase)*.16*gait,0,0],[Math.sin(phase)*.16*gait,0,0]];
  if(resting){
   chestAngles=[.015+breath*.006,0,Math.sin(time*.43)*.009];
   neckAngles=[.045+breath*.007,Math.sin(time*.24)*.08,.025];
   shoulders=[[.02,0,-.10],[.02,0,.10]];
  }
  if(sitting){
   const board=profile==='coastPaddles';
   chestAngles=[board?.08:profile==='coastLounge'?-.12:.09,0,-.025];
   neckAngles=[.09+breath*.008,.20+Math.sin(time*.21)*.035,-.065];
   shoulders=[[-.10,0,.35],[-.13,0,-.35]];elbows=[[-.80,0,.08],[-.75,0,-.08]];
   hips=[[-1.50,0,-.03],[-1.48,0,.03]];knees=[[1.52,0,0],[1.50,0,0]];ankles=[[0,0,0],[0,0,0]];
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
  if(wave&&!lying){shoulders[1]=[-.1,0,2.25+Math.sin(time*12)*.12];elbows[1]=[-.25,0,.38+Math.sin(time*12)*.20];neckAngles=[-.04,-.10,-.04];}
  rotate(chest,chestAngles,dt);rotate(neck,neckAngles,dt,4);
  chest.position.y=.20+(resting?breath*.004:Math.abs(Math.sin(phase))*.004*gait);
  chest.scale.set(1+(resting?breath*.005:0),1+(resting?breath*.009:0),1);
  for(let i=0;i<2;i++){rotate(arms[i].shoulder,shoulders[i],dt,9);rotate(arms[i].elbow,elbows[i],dt,9);rotate(legs[i].hip,hips[i],dt,10);rotate(legs[i].knee,knees[i],dt,10);rotate(legs[i].ankle,ankles[i],dt,10);}
  const blinkPhase=time%5.7,blink=blinkPhase>5.48?Math.sin((blinkPhase-5.48)/.22*Math.PI):0;
  const closure=wave?Math.max(0,blink):lying?.98:sitting?.69+.07*Math.sin(time*.6):Math.max(0,blink);
  for(let i=0;i<2;i++){openEyes[i].scale.y=Math.max(.06,1-closure);openEyes[i].visible=closure<.60;closedEyes[i].visible=closure>=.60;}
  root.userData.poseSettled=poseError<.025;
  root.userData.frame=Math.floor(phase/(Math.PI*2)*8)%8;root.userData.clip=walking?'walk':'idle';
 }
 function setCharacter(id){
  character=['stone','citrus','cloud','sprout'].includes(id)?id:'stone';
  const palettes={stone:['#65736a','#cdd5b7','#b7cba6','#8ca17e'],citrus:['#eaa04e','#ffdda0','#f3dfb4','#b7bd83'],cloud:['#e9e6dc','#fff9e5','#cadbdb','#9fb6b4'],sprout:['#8dab7a','#e3eac3','#d4ddb4','#8eaa7e']};
  const colors=palettes[character];stone.color.set(colors[0]);face.color.set(colors[1]);cloth.color.set(colors[2]);rib.color.set(colors[3]);
  poreMat.visible=character==='stone';poreMat.transparent=true;poreMat.opacity=character==='stone'?1:0;
  clouds.forEach(m=>m.visible=character==='cloud');
  neck.children.filter(m=>m.material===citrus).forEach(m=>m.visible=character==='stone');
  citrusLeaf.visible=secondLeaf.visible=character!=='cloud';
  citrusLeaf.scale.set(character==='sprout'?.16:character==='citrus'?.13:.076,.018,character==='sprout'?.055:.036);
  secondLeaf.scale.set(character==='sprout'?.13:.045,.013,character==='sprout'?.045:.027);
  citrusLeaf.position.y=character==='stone'?.475:.38;secondLeaf.position.y=character==='stone'?.483:.40;
  neck.children.filter(m=>m.geometry?.type==='CylinderGeometry').forEach(m=>m.visible=character==='stone');
  root.userData.character=character;
 }
 setCharacter(character);
 return{root,update,setCharacter,ready:true,kind:'companion',seatHeight:.365};
}

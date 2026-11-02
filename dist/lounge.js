import {parseRoom,roomId,sceneFor,KINDS} from './lounge-scenes.js';
import {createLoungeRenderer} from './lounge-renderer.js?v=ui-9';
import {CHARACTERS,characterFor,mountCharacterPicker} from './characters.js';

export function createLounge(host,{onReturn,onCharacter,audio=null}){
 const preview=new URLSearchParams(location.search).has('loungePreview');
 let room,selectedCharacter='stone',name='',client,state={seats:{},messages:[],connected:false},busy=false,active=false,clientPromise,visit=0;
 try{name=localStorage.getItem('jejumong-name')||'';}catch{}
 if(!name)name='여행자'+String(Math.floor(Math.random()*900)+100);
 host.innerHTML=`<div class="lounge-grid"><div class="lounge-view"><div class="lounge-field" id="loungeField" aria-label="풍경 속에서 함께 쉬는 공간"><span class="lounge-capacity" id="loungeCapacity">0 / 5명</span><span class="lounge-preview-label" id="loungePreviewLabel" hidden>쉼터 배치 미리보기 · 가상 인원</span><div id="loungeSeats"></div></div>
 <div class="lounge-heading"><div><p class="lounge-kicker">잠깐 머무는 제주</p><h1 id="loungeTitle">함께, 아무것도 하지 않아도 좋은 곳.</h1></div><button id="loungeReturn">← 산책 이어가기</button></div>
 <div class="lounge-toolbar"><div id="loungeKinds" role="group" aria-label="쉼터 종류"></div><div class="lounge-roomnav"><button id="loungePrev">← 옆 구역</button><span id="loungeRoomNumber"></span><button id="loungeNext">옆 구역 →</button><button id="loungeFind">빈 구역 찾기</button><button id="loungeSound" aria-pressed="true">소리 켬</button></div></div>
 <div class="lounge-caption"><span id="loungePose">빈자리를 골라 쉬어보세요.</span><span id="loungeConnection" class="lounge-connection" role="status">연결 준비</span></div>
 <aside class="lounge-chat" id="loungeChat" aria-label="같은 구역 대화"><h2>이곳에 머무는 사람들</h2><p class="chat-help">같은 구역에 있는 사람끼리 조용히 나눠요.</p><div id="loungeMessages" class="lounge-messages" role="log" aria-live="polite" aria-relevant="additions"></div><form id="loungeChatForm"><input id="loungeChatText" aria-label="같은 구역에 보낼 메시지" placeholder="가볍게 인사해 볼까요" maxlength="200" autocomplete="off"><button id="loungeSend" type="submit" disabled>보내기</button></form><p class="chat-help">1인 최근 5개 · 구역을 떠나면 내 대화는 사라져요.</p></aside></div></div>
 <div class="lounge-below"><form id="loungeProfile" class="lounge-profile"><label for="loungeName">불릴 이름</label><input id="loungeName" maxlength="16" autocomplete="nickname"><div id="loungeCharacterChoices"></div><button type="submit">이름 적용</button><button type="button" id="loungeShare">구역 링크 복사</button></form><p class="lounge-message" id="loungeMessage" role="status"></p><p class="lounge-fineprint">한 구역 4~5자리 · 다른 구역으로 자유롭게 옮겨요. 실시간 접속자는 무료 운영 한도 안에서 함께할 수 있어요.</p></div>`;
 const $=id=>host.querySelector('#'+id),say=text=>$('loungeMessage').textContent=text;
 $('loungeName').value=name;$('loungePreviewLabel').hidden=!preview;
 let painter;const bubbles=new Map();
 function placeOverlays(positions){for(const b of host.querySelectorAll('.nature-seat')){const p=positions.get(b.dataset.slot);if(p&&b.dataset.occupied==='true'){b.style.left=p.x+'%';b.style.top=p.y+'%';b.style.setProperty('--tag-scale',p.scale.toFixed(2));b.style.visibility=p.visible?'':'hidden';}else{const scene=sceneFor(room),slot=scene.seats.find(s=>s.id===b.dataset.slot);if(slot){const p=painter?.project(slot.button[0]*scene.width,slot.button[1]*scene.height);b.style.left=(p?p.x:slot.x)+'%';b.style.top=(p?p.y:slot.y)+'%';}b.style.removeProperty('--tag-scale');b.style.visibility='';}}
  for(const[id,el]of bubbles){const p=positions.get(id);if(p){el.style.left=p.x+'%';el.style.top=(p.y-5)+'%';el.style.setProperty('--tag-scale',p.scale.toFixed(2));}}}
 function showBubble(slotId,text){const old=bubbles.get(slotId);if(old){old.remove();clearTimeout(old.timer);}const el=document.createElement('div');el.className='nature-bubble';el.textContent=text;$('loungeSeats').append(el);bubbles.set(slotId,el);el.timer=setTimeout(()=>{el.classList.add('out');setTimeout(()=>{el.remove();if(bubbles.get(slotId)===el)bubbles.delete(slotId);},500);},6500);}
 function ensurePainter(){if(painter)return;try{painter=createLoungeRenderer($('loungeField'),{audio,onOverlay:placeOverlays});}catch{say('이 기기는 캐릭터 표시를 지원하지 않아요. 다른 브라우저에서 열어주세요.');}}
 const profile=()=>({name,character:selectedCharacter});
 const selectCharacter=async id=>{if(busy)return;selectedCharacter=id;onCharacter(id);applyCharacter(selectedCharacter);const own=Object.entries(state.seats).find(([,v])=>v.uid===state.uid);if(!preview&&own)await move(room.id,own[0]);else renderState();};
 const applyCharacter=mountCharacterPicker($('loungeCharacterChoices'),selectedCharacter,selectCharacter);
 function drawScene(){
  const scene=sceneFor(room);$('loungeTitle').textContent=scene.title;$('loungeRoomNumber').textContent=String(room.index).padStart(2,'0');
  $('loungeField').style.backgroundImage=`url("${scene.background}")`;
  $('loungeField').style.setProperty('--scene-ratio',String(scene.width/scene.height));painter?.scene(scene);
  $('loungeSeats').replaceChildren();
  for(const [i,slot] of scene.seats.entries()){
   const b=document.createElement('button');b.type='button';b.className='nature-seat';b.dataset.slot=slot.id;b.style.cssText=`left:${slot.x}%;top:${slot.y}%`;
   const label=document.createElement('span');b.append(label);b.addEventListener('click',()=>move(room.id,slot.id));b.dataset.number=String(i+1);$('loungeSeats').append(b);
  }
  const kinds=room.area==='forest'?['hammock']:['hammock','sunbed','paddle'];$('loungeKinds').replaceChildren();
  for(const kind of kinds){const b=document.createElement('button');b.type='button';b.textContent=room.area==='forest'?'숲속 쉼터':KINDS[kind];b.setAttribute('aria-pressed',String(room.kind===kind));b.onclick=()=>move(roomId(room.area,kind,room.index));$('loungeKinds').append(b);}
  $('loungePrev').disabled=room.index===1;$('loungeNext').disabled=room.index===999;
  audio?.playAmbience(room.area,'/lab/audio/'+room.area+'.m4a',{level:room.kind==='paddle'?.7:.8});if(room.kind==='paddle')audio?.startLaps();else audio?.stopLaps();
  renderState();
 }
 function renderState(){
  const description=sceneFor(room),capacity=description.seats.length;
  const seats=preview?Object.fromEntries(description.seats.map((slot,i)=>[slot.id,{uid:'preview'+i,name:CHARACTERS[i%4].name,character:CHARACTERS[i%4].id}])):Object.fromEntries(Object.entries(state.seats).filter(([id])=>description.seats.some(s=>s.id===id)));
  painter?.occupants(seats,{self:state.uid,stagger:preview});
  let own=null;
  for(const b of host.querySelectorAll('.nature-seat')){
   const occupant=seats[b.dataset.slot],self=Boolean(occupant&&occupant.uid===state.uid);
   b.dataset.occupied=String(Boolean(occupant));b.dataset.self=String(self);b.disabled=busy||preview||Boolean(occupant&&!self);
   const slot=description.seats.find(s=>s.id===b.dataset.slot);
   const label=occupant?(self?'나 · ':'')+occupant.name:'＋ '+slot.name;
   b.dataset.character=occupant?characterFor(occupant.character).id:'';
   b.querySelector('span').textContent=label;b.setAttribute('aria-label',occupant?`${b.dataset.number}번 ${label} · ${characterFor(occupant.character).name} 쉬는 중`:`${b.dataset.number}번 ${slot.name}에서 쉬기`);
   if(self)own=b.dataset.number;
  }
  $('loungeCapacity').textContent=`${Object.keys(seats).length} / ${capacity}명${preview?' · 배치 보기':''}`;
  $('loungePose').textContent=preview?'풍경 속 캐릭터 배치 미리보기':own?`${own}번 자리 · ${description.seats[Number(own)-1]?.pose==='sit'?'앉아서':'누워서'} 쉬는 중`:'연결 후 빈자리를 골라주세요.';
  $('loungeConnection').textContent=preview?'미리보기':state.connected?'실시간 연결됨':'연결 중…';$('loungeConnection').dataset.connected=String(state.connected&&!preview);
  $('loungeSend').disabled=busy||preview||!state.connected||!own;$('loungeChatText').disabled=preview;
  host.dataset.room=room.id;host.dataset.occupancy=String(Object.keys(seats).length);host.dataset.connected=String(state.connected);host.dataset.selfSeat=own||'';
  const messages=state.messages||[],key=JSON.stringify(messages);if($('loungeMessages').dataset.content!==key){
   const box=$('loungeMessages'),nearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<60;const previousCount=Number(box.dataset.count??-1);box.dataset.count=String(messages.length);if(previousCount>=0&&messages.length>previousCount){const last=messages[messages.length-1];if(last?.uid!==state.uid)audio?.foley('tok',{gain:.8});const seat=Object.entries(seats).find(([,v])=>v.uid===last?.uid);if(seat)showBubble(seat[0],last.text);}
   clearTimeout(host.quietTimer);$('loungeChat').classList.remove('quiet');host.quietTimer=setTimeout(()=>$('loungeChat').classList.add('quiet'),12000);box.dataset.content=key;box.replaceChildren();
   if(!messages.length){const p=document.createElement('p');p.className='empty-chat';p.textContent=preview?'여기는 배치 미리보기예요. 실제 대화는 일반 쉼터에서 가능해요.':'말없이 쉬어도 괜찮아요.\n인사하고 싶을 땐 편하게 남겨주세요.';box.append(p);}
   for(const m of messages){const p=document.createElement('p'),n=document.createElement('strong');n.textContent=m.name+(m.uid===state.uid?' · 나':'');p.append(n,document.createTextNode(m.text));if(m.uid===state.uid)p.className='self';box.append(p);}
   if(nearBottom)box.scrollTop=box.scrollHeight;
  }
 }
 async function backend(){
  if(!clientPromise)clientPromise=import('./lounge-client.js').then(m=>client=m.createLoungeClient(next=>{if(next.error){say(next.error);return;}state=next;if(active&&room)renderState();})).catch(e=>{clientPromise=null;throw e;});
  return clientPromise;
 }
 function updateURL(){const url=new URL(location.href);url.searchParams.set('room',room.id);history.replaceState(null,'',url);}
 async function move(id,slot,find=false){
  if(busy||!active)return;const attempt=visit;busy=true;say('빈자리를 확인하고 있어요…');renderState();
  const wanted=parseRoom(id);let next=wanted;
  try{
   if(!preview){const api=await backend();if(!active||attempt!==visit)return;
    for(let tries=0;;tries++){
     try{await api.join(next.id,profile(),slot);break;}
     catch(e){if(e.code==='room-full'&&!slot&&tries<11&&(find||tries===0)){next=parseRoom(roomId(next.area,next.kind,next.index===999?1:next.index+1));find=true;continue;}throw e;}
    }
   }
   if(!active||attempt!==visit)return;room=next;drawScene();updateURL();say(next.id!==wanted.id?'자리가 가득 차서 옆의 빈 구역으로 이동했어요.':'자리를 골라 편하게 쉬세요. 조용히 머물러도 좋아요.');
  }catch(e){if(!active||attempt!==visit||e.code==='join-cancelled')return;say(e.code==='room-full'?'자리가 찼어요. 옆 구역이나 빈 구역 찾기를 눌러주세요.':'연결하지 못했어요. 인터넷을 확인한 뒤 빈 구역 찾기로 다시 연결해 주세요.');console.warn('Lounge:',e.code||e.message);}
  finally{if(attempt===visit){busy=false;if(active)renderState();}}
 }
 $('loungePrev').onclick=()=>move(roomId(room.area,room.kind,room.index-1));$('loungeNext').onclick=()=>move(roomId(room.area,room.kind,room.index+1));
 $('loungeFind').onclick=()=>move(roomId(room.area,room.kind,room.index),undefined,true);
 $('loungeReturn').onclick=()=>onReturn();
 // Best effort when the tab closes or navigates away; onDisconnect on the server is the backstop.
 addEventListener('pagehide',()=>{if(active&&client)client.leave().catch(()=>{});});
 $('loungeSound').onclick=()=>audio?.setEnabled(!audio.enabled);audio?.onChange(({enabled})=>{$('loungeSound').setAttribute('aria-pressed',String(enabled));$('loungeSound').textContent=enabled?'소리 켬':'소리 끔';});
 $('loungeProfile').onsubmit=async e=>{e.preventDefault();if(busy)return;name=$('loungeName').value.trim().slice(0,16)||'여행자';$('loungeName').value=name;try{localStorage.setItem('jejumong-name',name);}catch{}const own=Object.entries(state.seats).find(([,v])=>v.uid===state.uid);if(!preview&&own)await move(room.id,own[0]);};
 let lastSent=0;
 $('loungeChatForm').onsubmit=async e=>{e.preventDefault();const input=$('loungeChatText'),text=input.value.trim();if(preview||busy||!client||!text)return;if(Date.now()-lastSent<1600){say('천천히 나눠요. 잠시 후 다시 보내주세요.');return;}lastSent=Date.now();$('loungeSend').disabled=true;try{await client.send(text);input.value='';say('');}catch{say('메시지를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');}finally{renderState();}};
 $('loungeShare').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);say('이 구역으로 오는 링크를 복사했어요.');}catch{say('주소창의 링크를 복사하면 같은 구역에서 만날 수 있어요.');}};
 return{
  enter({area,traveler,requestedRoom}){visit++;busy=false;active=true;selectedCharacter=characterFor(traveler).id;room=parseRoom(requestedRoom,roomId(area,'hammock',1));state={seats:{},messages:[],connected:false};ensurePainter();drawScene();applyCharacter(selectedCharacter);painter?.start();if(preview){updateURL();say('가상 캐릭터로 풍경 속 자리 배치를 확인하는 화면입니다.');}else move(room.id);},
  async leave(){painter?.stop();for(const[,el]of bubbles){clearTimeout(el.timer);el.remove();}bubbles.clear();audio?.stopAmbience(.9);audio?.stopLaps();visit++;busy=false;active=false;const url=new URL(location.href);url.searchParams.delete('room');url.searchParams.delete('loungePreview');history.replaceState(null,'',url);if(client)await client.leave().catch(()=>{});}
 };
}

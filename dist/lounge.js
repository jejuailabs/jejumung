import {parseRoom,roomId,sceneFor,KINDS,SEATS} from './lounge-scenes.js';

export function createLounge(host,{onReturn,onGender}){
 const preview=new URLSearchParams(location.search).get('loungePreview')==='15';
 let room,gender='male',name='',client,state={seats:{},messages:[],connected:false},busy=false,active=false,clientPromise,visit=0;
 try{name=localStorage.getItem('jejumong-name')||'';}catch{}
 if(!name)name='여행자'+String(Math.floor(Math.random()*900)+100);
 host.innerHTML=`<div class="lounge-heading"><div><p class="lounge-kicker">잠깐 머무는 제주</p><h1 id="loungeTitle">함께, 아무것도 하지 않아도 좋은 곳.</h1></div><button id="loungeReturn">← 산책 이어가기</button></div>
 <div class="lounge-toolbar"><div id="loungeKinds" role="group" aria-label="쉼터 종류"></div><div class="lounge-roomnav"><button id="loungePrev">← 옆 구역</button><span id="loungeRoomNumber"></span><button id="loungeNext">옆 구역 →</button><button id="loungeFind">빈 구역 찾기</button></div></div>
 <div class="lounge-grid"><div class="lounge-view"><div class="lounge-field" id="loungeField" aria-label="15명이 함께 쉬는 공간"><span class="lounge-capacity" id="loungeCapacity">0 / 15명</span><span class="lounge-preview-label" id="loungePreviewLabel" hidden>15인 배치 미리보기 · 가상 인원</span><div id="loungeSeats"></div></div><div class="lounge-caption"><span id="loungePose">빈자리를 골라 쉬어보세요.</span><span id="loungeConnection" class="lounge-connection" role="status">연결 준비</span></div></div>
 <aside class="lounge-chat" aria-label="같은 구역 대화"><h2>이곳에 머무는 사람들</h2><p class="chat-help">같은 구역에 있는 사람끼리 조용히 나눠요.</p><div id="loungeMessages" class="lounge-messages" role="log" aria-live="polite" aria-relevant="additions"></div><form id="loungeChatForm"><input id="loungeChatText" aria-label="같은 구역에 보낼 메시지" placeholder="가볍게 인사해 볼까요" maxlength="200" autocomplete="off"><button id="loungeSend" type="submit" disabled>보내기</button></form><p class="chat-help">1인 최근 5개 · 구역을 떠나면 내 대화는 사라져요.</p></aside></div>
 <form id="loungeProfile" class="lounge-profile"><label for="loungeName">불릴 이름</label><input id="loungeName" maxlength="16" autocomplete="nickname"><button type="button" data-lounge-gender="male">남성 여행자</button><button type="button" data-lounge-gender="female">여성 여행자</button><button type="submit">이름 적용</button><button type="button" id="loungeShare">구역 링크 복사</button></form><p class="lounge-message" id="loungeMessage" role="status"></p><p class="lounge-fineprint">한 구역 15석 · 다른 구역으로 자유롭게 옮겨요. 실시간 접속자는 무료 운영 한도 안에서 함께할 수 있어요.</p>`;
 const $=id=>host.querySelector('#'+id),say=text=>$('loungeMessage').textContent=text;
 $('loungeName').value=name;$('loungePreviewLabel').hidden=!preview;
 const profile=()=>({name,gender});
 function applyGender(){host.querySelectorAll('[data-lounge-gender]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.loungeGender===gender)));}
 function drawScene(){
  const scene=sceneFor(room);$('loungeTitle').textContent=scene.title;$('loungeRoomNumber').textContent=String(room.index).padStart(2,'0');
  $('loungeField').style.backgroundImage=`url("${scene.background}")`;
  $('loungeSeats').replaceChildren();
  for(const [i,slot] of scene.seats.entries()){
   const b=document.createElement('button');b.type='button';b.className='lounge-seat';b.dataset.slot=slot.id;b.style.cssText=`left:${slot.x}%;top:${slot.y}%;width:${slot.width}%;z-index:${slot.z}`;
   const img=document.createElement('img');img.alt='';img.draggable=false;
   const label=document.createElement('span');b.append(img,label);b.addEventListener('click',()=>move(room.id,slot.id));b.dataset.number=String(i+1);$('loungeSeats').append(b);
  }
  const kinds=room.area==='forest'?['hammock','bench']:['sunbed','hammock','bench','paddle'];$('loungeKinds').replaceChildren();
  for(const kind of kinds){const b=document.createElement('button');b.type='button';b.textContent=KINDS[kind];b.setAttribute('aria-pressed',String(room.kind===kind));b.onclick=()=>move(roomId(room.area,kind,room.index));$('loungeKinds').append(b);}
  $('loungePrev').disabled=room.index===1;$('loungeNext').disabled=room.index===999;
  renderState();
 }
 function renderState(){
  const seats=preview?Object.fromEntries(Array.from({length:SEATS},(_,i)=>['s'+String(i).padStart(2,'0'),{uid:'preview'+i,name:'여행자 '+(i+1),gender:i%2?'female':'male'}])):state.seats;
  let own=null;
  for(const b of host.querySelectorAll('.lounge-seat')){
   const occupant=seats[b.dataset.slot],self=Boolean(occupant&&occupant.uid===state.uid);
   b.dataset.occupied=String(Boolean(occupant));b.dataset.self=String(self);b.disabled=busy||preview||Boolean(occupant&&!self);
   const asset=`/assets/lounge-v5/${room.kind}-${occupant?.gender||'empty'}.png`;
   if(b.querySelector('img').getAttribute('src')!==asset)b.querySelector('img').src=asset;
   const label=occupant?(self?'나 · ':'')+occupant.name:'＋ '+b.dataset.number;
   b.querySelector('span').textContent=label;b.setAttribute('aria-label',occupant?`${b.dataset.number}번 ${label} 쉬는 중`:`${b.dataset.number}번 빈자리에서 쉬기`);
   if(self)own=b.dataset.number;
  }
  $('loungeCapacity').textContent=`${Object.keys(seats).length} / 15명${preview?' · 배치 보기':''}`;
  $('loungePose').textContent=preview?'15명이 함께 쉬는 배치 예시':own?`${own}번 자리 · ${room.kind==='bench'?'앉아서': '누워서'} 쉬는 중`:'연결 후 빈자리를 골라주세요.';
  $('loungeConnection').textContent=preview?'미리보기':state.connected?'실시간 연결됨':'연결 중…';$('loungeConnection').dataset.connected=String(state.connected&&!preview);
  $('loungeSend').disabled=busy||preview||!state.connected||!own;$('loungeChatText').disabled=preview;
  host.dataset.room=room.id;host.dataset.occupancy=String(Object.keys(seats).length);host.dataset.connected=String(state.connected);host.dataset.selfSeat=own||'';
  const messages=state.messages||[],key=JSON.stringify(messages);if($('loungeMessages').dataset.content!==key){
   const box=$('loungeMessages'),nearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<60;box.dataset.content=key;box.replaceChildren();
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
   if(!active||attempt!==visit)return;room=next;drawScene();updateURL();say(next.id!==wanted.id?'자리가 가득 차서 옆의 빈 구역으로 이동했어요.':'자리를 골라 편하게 쉬세요. 옆 구역에도 다른 풍경이 있어요.');
  }catch(e){if(!active||attempt!==visit||e.code==='join-cancelled')return;say(e.code==='room-full'?'자리가 찼어요. 옆 구역이나 빈 구역 찾기를 눌러주세요.':'연결하지 못했어요. 인터넷을 확인한 뒤 빈 구역 찾기로 다시 연결해 주세요.');console.warn('Lounge:',e.code||e.message);}
  finally{if(attempt===visit){busy=false;if(active)renderState();}}
 }
 $('loungePrev').onclick=()=>move(roomId(room.area,room.kind,room.index-1));$('loungeNext').onclick=()=>move(roomId(room.area,room.kind,room.index+1));
 $('loungeFind').onclick=()=>move(roomId(room.area,room.kind,room.index),undefined,true);
 $('loungeReturn').onclick=()=>onReturn();
 host.querySelectorAll('[data-lounge-gender]').forEach(b=>b.onclick=async()=>{if(busy)return;gender=b.dataset.loungeGender;onGender(gender);applyGender();const own=Object.entries(state.seats).find(([,v])=>v.uid===state.uid);if(!preview&&own)await move(room.id,own[0]);else renderState();});
 $('loungeProfile').onsubmit=async e=>{e.preventDefault();if(busy)return;name=$('loungeName').value.trim().slice(0,16)||'여행자';$('loungeName').value=name;try{localStorage.setItem('jejumong-name',name);}catch{}const own=Object.entries(state.seats).find(([,v])=>v.uid===state.uid);if(!preview&&own)await move(room.id,own[0]);};
 let lastSent=0;
 $('loungeChatForm').onsubmit=async e=>{e.preventDefault();const input=$('loungeChatText'),text=input.value.trim();if(preview||busy||!client||!text)return;if(Date.now()-lastSent<1600){say('천천히 나눠요. 잠시 후 다시 보내주세요.');return;}lastSent=Date.now();$('loungeSend').disabled=true;try{await client.send(text);input.value='';say('');}catch{say('메시지를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');}finally{renderState();}};
 $('loungeShare').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);say('이 구역으로 오는 링크를 복사했어요.');}catch{say('주소창의 링크를 복사하면 같은 구역에서 만날 수 있어요.');}};
 return{
  enter({area,traveler,requestedRoom}){visit++;busy=false;active=true;gender=traveler;room=parseRoom(requestedRoom,roomId(area,area==='forest'?'hammock':'sunbed',1));state={seats:{},messages:[],connected:false};drawScene();applyGender();if(preview){updateURL();say('가상 인원으로 15석 배치를 확인하는 화면입니다.');}else move(room.id);},
  async leave(){visit++;busy=false;active=false;const url=new URL(location.href);url.searchParams.delete('room');url.searchParams.delete('loungePreview');history.replaceState(null,'',url);if(client)await client.leave().catch(()=>{});}
 };
}

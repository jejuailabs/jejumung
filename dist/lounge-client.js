import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {initializeAuth,inMemoryPersistence,signInAnonymously} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getDatabase,ref,get,onValue,onDisconnect,runTransaction,remove,update,serverTimestamp,goOffline,goOnline} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js';
import {LOUNGE_FIREBASE} from './lounge-config.js';
import {sceneFor,parseRoom,LOUNGE_NAMESPACE} from './lounge-scenes.js?v=rest-3';

export function createLoungeClient(changed){
 const app=getApps().find(a=>a.name==='lounge')||initializeApp(LOUNGE_FIREBASE,'lounge');
 const auth=initializeAuth(app,{persistence:inMemoryPersistence}),db=getDatabase(app);
 const handlers=new Map();
 let uid,login,current=null,subscriptions=[],seats={},messages={},connected=false,reconnecting=false,closed=true,generation=0,heartbeat=null;
 const check=attempt=>{if(closed||attempt!==generation)throw Object.assign(Error('Join cancelled'),{code:'join-cancelled'});};
 const path=id=>`${LOUNGE_NAMESPACE}/rooms/${id}`;
 const emit=()=>changed({uid,room:current?.room,seats,messages:Object.entries(messages).filter(([owner])=>Object.values(seats).some(s=>s.uid===owner)).flatMap(([owner,v])=>Object.entries(v.slots||{}).map(([key,m])=>({...m,id:owner+key,uid:owner}))).sort((a,b)=>a.at-b.at).slice(-50),connected});
 const init=async()=>{goOnline(db);if(!login)login=signInAnonymously(auth).then(r=>uid=r.user.uid).catch(e=>{login=null;throw e;});await login;};
 async function dispose(item){
  if(!item)return;
  // Keep disconnect cleanup armed until server-side deletion has succeeded.
  await runTransaction(item.seat,value=>value===null||value?.lease===item.lease?null:undefined,{applyLocally:false});
  if(handlers.get(item.room+'/'+item.key)===item.lease)await item.disconnect.cancel();
  if(item.room!==current?.room&&handlers.get(item.room+'/chat')===item.lease){await remove(ref(db,path(item.room)+'/messages/'+uid));await item.chatDisconnect.cancel();}
 }
 async function claim(room,profile,preferred,attempt=generation){
  const snapshot=(await get(ref(db,path(room)+'/seats'))).val()||{};
  check(attempt);
  const available=sceneFor(parseRoom(room)).seats.map(s=>s.id);
  const keys=preferred&&available.includes(preferred)?[preferred]:available;
  for(const key of keys){
   if(snapshot[key]&&snapshot[key].uid!==uid)continue;
   const seat=ref(db,path(room)+'/seats/'+key),disconnect=onDisconnect(seat),lease=crypto.randomUUID();
   try{
    handlers.set(room+'/'+key,lease);
    await disconnect.remove();check(attempt);
    const result=await runTransaction(seat,value=>!closed&&attempt===generation&&(!value||value.uid===uid)?{...profile,uid,at:serverTimestamp(),lease}:undefined,{applyLocally:false});
    if(result.committed){const chatDisconnect=onDisconnect(ref(db,path(room)+'/messages/'+uid));handlers.set(room+'/chat',lease);await chatDisconnect.remove();return{room,key,seat,disconnect,chatDisconnect,lease,profile};}
    if(handlers.get(room+'/'+key)===lease)await disconnect.cancel();
   }catch(e){if(handlers.get(room+'/'+key)===lease)await disconnect.cancel().catch(()=>{});throw e;}
  }
  throw Object.assign(Error('이 구역의 자리가 모두 찼어요.'),{code:'room-full'});
 }
 function watch(){
  subscriptions.forEach(fn=>fn());subscriptions=[];
  subscriptions.push(onValue(ref(db,path(current.room)+'/seats'),snapshot=>{seats=snapshot.val()||{};emit();},()=>changed({error:'자리 정보를 읽지 못했어요. 다시 연결해 주세요.'})));
  subscriptions.push(onValue(ref(db,path(current.room)+'/messages'),snapshot=>{messages=snapshot.val()||{};emit();},()=>changed({error:'대화를 불러오지 못했어요.'})));
  subscriptions.push(onValue(ref(db,'.info/connected'),async snapshot=>{
   connected=snapshot.val()===true;emit();
   if(!connected||closed||!current||reconnecting)return;
   reconnecting=true;
   try{
    const item=current,value=(await get(item.seat)).val();
    if(closed||current!==item)return;
    if(!value){current=await claim(item.room,item.profile);}
    else if(value.uid===uid){await item.disconnect.remove();await item.chatDisconnect.remove();}
    emit();
   }catch{changed({error:'연결이 돌아왔지만 자리를 복구하지 못했어요. 빈 구역 찾기를 눌러주세요.'});}finally{reconnecting=false;}
  }));
 }
 return{
  async join(room,profile,preferred){
   const attempt=++generation;closed=false;await init();check(attempt);const previous=current;
   const next=await claim(room,profile,preferred,attempt);
   if(closed||attempt!==generation){await dispose(next);check(attempt);}
   current=next;
   // Heartbeat: refresh `at` so a seat whose client vanished can be told apart from a live one.
   clearInterval(heartbeat);heartbeat=setInterval(()=>{if(current&&!closed&&connected)update(current.seat,{at:serverTimestamp()}).catch(()=>{});},240000);
   if(previous&&(previous.room!==next.room||previous.key!==next.key))await dispose(previous);
   seats={};messages={};watch();emit();return next;
  },
  async send(text){
   if(!current||!connected)throw Error('연결 후 대화할 수 있어요.');
   const message=text.trim().slice(0,200);if(!message)return;
   const own=ref(db,path(current.room)+'/messages/'+uid);
   await runTransaction(own,value=>{const seq=(value?.seq||0)+1;return{seq,lastAt:serverTimestamp(),slots:{...(value?.slots||{}),['m'+((seq-1)%5)]:{text:message,name:current.profile.name,at:serverTimestamp()}}};},{applyLocally:false});
  },
  async leave(){
   const attempt=++generation;closed=true;clearInterval(heartbeat);subscriptions.forEach(fn=>fn());subscriptions=[];
   const old=current;current=null;seats={};messages={};connected=false;emit();
   try{await dispose(old);}finally{if(closed&&attempt===generation)goOffline(db);}
  }
 };
}

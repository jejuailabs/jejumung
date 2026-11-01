import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {initializeAuth,inMemoryPersistence,signInAnonymously} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getDatabase,ref,get,onValue,onDisconnect,runTransaction,remove,serverTimestamp,goOffline,goOnline} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js';
import {LOUNGE_FIREBASE} from './lounge-config.js';
import {SEATS} from './lounge-scenes.js';

export function createLoungeClient(changed){
 const app=getApps().find(a=>a.name==='lounge')||initializeApp(LOUNGE_FIREBASE,'lounge');
 const auth=initializeAuth(app,{persistence:inMemoryPersistence}),db=getDatabase(app);
 let uid,login,current=null,subscriptions=[],seats={},messages={},connected=false,reconnecting=false,closed=true;
 const path=id=>`jejumungV5/rooms/${id}`;
 const emit=()=>changed({uid,room:current?.room,seats,messages:Object.entries(messages).filter(([owner])=>Object.values(seats).some(s=>s.uid===owner)).flatMap(([owner,v])=>Object.entries(v.slots||{}).map(([key,m])=>({...m,id:owner+key,uid:owner}))).sort((a,b)=>a.at-b.at).slice(-50),connected});
 const init=async()=>{goOnline(db);if(!login)login=signInAnonymously(auth).then(r=>uid=r.user.uid).catch(e=>{login=null;throw e;});await login;};
 async function dispose(item){
  if(!item)return;
  // Keep disconnect cleanup armed until server-side deletion has succeeded.
  await remove(item.seat);await item.disconnect.cancel();
  if(item.room!==current?.room){await remove(ref(db,path(item.room)+'/messages/'+uid));await item.chatDisconnect.cancel();}
 }
 async function claim(room,profile,preferred){
  const snapshot=(await get(ref(db,path(room)+'/seats'))).val()||{};
  const keys=preferred?[preferred]:Array.from({length:SEATS},(_,i)=>'s'+String(i).padStart(2,'0'));
  for(const key of keys){
   if(snapshot[key]&&snapshot[key].uid!==uid)continue;
   const seat=ref(db,path(room)+'/seats/'+key),disconnect=onDisconnect(seat),lease=crypto.randomUUID();
   try{
    await disconnect.remove();
    const result=await runTransaction(seat,value=>!value||value.uid===uid?{...profile,uid,at:serverTimestamp(),lease}:undefined,{applyLocally:false});
    if(result.committed){const chatDisconnect=onDisconnect(ref(db,path(room)+'/messages/'+uid));await chatDisconnect.remove();return{room,key,seat,disconnect,chatDisconnect,lease,profile};}
    await disconnect.cancel();
   }catch(e){await disconnect.cancel().catch(()=>{});throw e;}
  }
  throw Object.assign(Error('이 구역의 15자리가 모두 찼어요.'),{code:'room-full'});
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
   closed=false;await init();const previous=current;
   const next=await claim(room,profile,preferred);
   if(closed){await dispose(next);return;}
   current=next;
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
   closed=true;subscriptions.forEach(fn=>fn());subscriptions=[];
   const old=current;current=null;seats={};messages={};connected=false;emit();
   try{await dispose(old);}finally{goOffline(db);}
  }
 };
}

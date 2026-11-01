// Disposable room 996 only, for verifying full-room routing. Never use a normal guest room.
import{LOUNGE_FIREBASE as c}from'../dist/lounge-config.js';
const signup=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+c.apiKey,{method:'POST',headers:{'content-type':'application/json'},body:'{"returnSecureToken":true}'});
const user=await signup.json();if(!signup.ok)throw Error(user.error?.message);
const endpoint=c.databaseURL+'/jejumungV5/rooms/coast_sunbed_996/seats/';
const keys=Array.from({length:15},(_,i)=>'s'+String(i).padStart(2,'0'));
try{
 for(const key of keys){const r=await fetch(endpoint+key+'.json?auth='+user.idToken,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({uid:user.localId,name:'배치 검증',gender:'male',at:{'.sv':'timestamp'},lease:'disposable-qa'})});if(!r.ok)throw Error('Fixture seat failed: '+r.status);}
 console.log('QA room 996 has 15 disposable seats. Press Enter to clean up.');
 await new Promise(resolve=>process.stdin.once('data',resolve));
}finally{
 for(const key of keys)await fetch(endpoint+key+'.json?auth='+user.idToken,{method:'DELETE'});
 await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key='+c.apiKey,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:user.idToken})});
 console.log('All fixture seats and test account removed.');
}

// Isolated disposable QA rooms only. Public SDK key; user tokens stay in memory.
import assert from 'node:assert/strict';
import {LOUNGE_FIREBASE as conf} from '../dist/lounge-config.js';
const root=conf.databaseURL+'/jejumungV5/rooms/coast_sunbed_998';
const users=[];let passed=[];
async function signup(){const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+conf.apiKey,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({returnSecureToken:true})});const v=await r.json();assert.equal(r.status,200,JSON.stringify(v.error));users.push(v);return v;}
async function request(path,user,method='GET',body,extra={}){return fetch(root+path+'.json'+(user?'?auth='+encodeURIComponent(user.idToken):''),{method,headers:{'content-type':'application/json',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});}
const profile=u=>({uid:u.localId,name:'검증 여행자',gender:'male',at:{'.sv':'timestamp'},lease:'isolated-test'});
try{
 const a=await signup(),b=await signup();
 assert.equal((await request('/seats',null)).status,401);passed.push('unauthenticated read denied');
 assert.equal((await request('/seats/s00',a,'PUT',profile(a))).status,200);
 assert.equal((await request('/seats/s00',b,'PUT',profile(b))).status,401);passed.push('another guest cannot overwrite seat');
 assert.equal((await request('/seats/s15',a,'PUT',profile(a))).status,401);passed.push('16th seat denied by server');
 assert.equal((await request('/seats/s01',b,'PUT',profile(b))).status,200);
 const message={seq:1,lastAt:{'.sv':'timestamp'},slots:{m0:{text:'검증 메시지',name:'검증 여행자',at:{'.sv':'timestamp'}}}};
 assert.equal((await request('/messages/'+a.localId,a,'PUT',message)).status,200);passed.push('seated guest can chat');
 assert.equal((await request('/messages/'+a.localId,b,'PUT',{...message,seq:2})).status,401);passed.push('message owner spoof denied');
 assert.equal((await request('/messages/'+a.localId,a,'PUT',{...message,seq:2})).status,401);passed.push('server chat rate limit enforced');
 const snap=await request('/seats/s02',a,'GET',undefined,{'X-Firebase-ETag':'true'}),etag=snap.headers.get('etag');
 const race=await Promise.all([request('/seats/s02',a,'PUT',profile(a),{'if-match':etag}),request('/seats/s02',b,'PUT',profile(b),{'if-match':etag})]);
 assert.equal(race.filter(r=>r.status===200).length,1);passed.push('competing atomic claims have exactly one winner');
 console.log(JSON.stringify({passed},null,2));
}finally{
 for(const u of users){
  for(const key of ['s00','s01','s02']){const r=await request('/seats/'+key,u);if(r.ok&&(await r.json())?.uid===u.localId)await request('/seats/'+key,u,'DELETE');}
  await request('/messages/'+u.localId,u,'DELETE');
  await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key='+conf.apiKey,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:u.idToken})});
 }
}

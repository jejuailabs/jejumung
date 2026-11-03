// Visitor-count rules against the local Database emulator only; nothing reaches the live project.
// Run: firebase emulators:exec --only database --project projecthub-97b64 "node tools/test-stats-rules.mjs"
import assert from 'node:assert/strict';
const host='http://'+(process.env.FIREBASE_DATABASE_EMULATOR_HOST||'127.0.0.1:9000'),project='projecthub-97b64',ns=project+'-default-rtdb';
// The emulator trusts unsigned tokens, so each test user is just a uid.
const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=uid=>b64({alg:'none',typ:'JWT'})+'.'+b64({sub:uid,user_id:uid,aud:project,iss:'https://securetoken.google.com/'+project,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'anonymous'}})+'.';
async function call(path,uid,method='GET',body){
 const headers={'content-type':'application/json',...(uid==='owner'?{authorization:'Bearer owner'}:{})};
 const auth=uid&&uid!=='owner'?'&auth='+token(uid):'';
 const r=await fetch(`${host}/${path}.json?ns=${ns}${auth}`,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:r.status,body:await r.json().catch(()=>null)};
}
const inc={'.sv':{increment:1}},day='2026-11-03',passed=[];
const ok=async(label,promise,status)=>{assert.equal((await promise).status,status,label);passed.push(label);};
await call('stats/admins/boss','owner','PUT',true);

await ok('signed-out visitor cannot read counts',call('stats/v1/days',null),401);
await ok('guest cannot read counts',call('stats/v1/days','guestA'),401);
await ok('guest cannot read who is online',call('stats/v1/live','guestA'),401);
await ok('guest cannot read the admin list',call('stats/admins','guestA'),401);
await ok('guest cannot add themself as admin',call('stats/admins/guestA','guestA','PUT',true),401);
await ok('guest counts a visit',call(`stats/v1/days/${day}/guestA`,'guestA','PATCH',{v:inc}),200);
await call(`stats/v1/days/${day}/guestA`,'guestA','PATCH',{v:inc});
assert.equal((await call(`stats/v1/days/${day}/guestA/v`,'owner')).body,2);passed.push('second visit adds one');
await ok('guest cannot jump a count',call(`stats/v1/days/${day}/guestA`,'guestA','PATCH',{v:50}),401);
await ok('guest cannot write another visitor',call(`stats/v1/days/${day}/guestB`,'guestA','PATCH',{v:inc}),401);
await ok('course play counted',call(`stats/v1/days/${day}/guestA`,'guestA','PATCH',{'p/IMG_0575':inc}),200);
await ok('lounge entry counted',call(`stats/v1/days/${day}/guestA`,'guestA','PATCH',{l:inc}),200);
await ok('odd course id denied',call(`stats/v1/days/${day}/guestA`,'guestA','PATCH',{'p/../x':inc}),400);
await ok('lower-case course id denied',call(`stats/v1/days/${day}/guestA`,'guestA','PATCH',{'p/abc':inc}),401);
await ok('unknown field denied',call(`stats/v1/days/${day}/guestA`,'guestA','PATCH',{x:inc}),401);
await ok('malformed day denied',call('stats/v1/days/2026-13-01/guestA','guestA','PATCH',{v:inc}),401);
await call(`stats/v1/days/${day}/guestC`,'owner','PUT',{v:500});
await ok('daily ceiling enforced',call(`stats/v1/days/${day}/guestC`,'guestC','PATCH',{v:inc}),401);
const beat=page=>({at:{'.sv':'timestamp'},page,clip:'CEDAR'});
await ok('guest heartbeat accepted',call('stats/v1/live/guestA','guestA','PUT',beat('walk')),200);
await ok('unknown page denied',call('stats/v1/live/guestA','guestA','PUT',beat('admin')),401);
await ok('client clock time denied',call('stats/v1/live/guestA','guestA','PUT',{at:Date.now(),page:'home'}),401);
await ok('guest cannot write another heartbeat',call('stats/v1/live/guestA','guestB','PUT',beat('home')),401);
await ok('guest can clear own heartbeat',call('stats/v1/live/guestB','guestB','DELETE'),200);
await ok('admin reads counts',call('stats/v1/days','boss'),200);
await ok('admin reads who is online',call('stats/v1/live','boss'),200);
await ok('admin cannot change counts',call(`stats/v1/days/${day}/guestA`,'boss','PATCH',{v:inc}),401);
await ok('admin can clear a stale heartbeat',call('stats/v1/live/guestA','boss','DELETE'),200);
await ok('lounge rooms still closed to signed-out reads',call('jejumungV7/rooms/grove_001',null),401);
console.log(`Stats rules: ${passed.length} checks passed.\n - `+passed.join('\n - '));

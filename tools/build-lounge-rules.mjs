import {writeFile} from 'node:fs/promises';
const slots=Array.from({length:15},(_,i)=>'s'+String(i).padStart(2,'0'));
const members=uid=>'('+slots.map(s=>`root.child('jejumungV5/rooms').child($room).child('seats/${s}/uid').val() == ${uid}`).join(' || ')+')';
const ownMember=members('auth.uid'),ownerMember=members('$uid');
const text=max=>({'.validate':`newData.isString() && newData.val().length > 0 && newData.val().length <= ${max}`});
const seat={
 '.write':"auth != null && (!data.exists() || data.child('uid').val() == auth.uid) && (!newData.exists() || newData.child('uid').val() == auth.uid)",
 '.validate':"$slot.matches(/^s(0[0-9]|1[0-4])$/) && newData.hasChildren(['uid','name','gender','at','lease'])",
 uid:{'.validate':'newData.val() == auth.uid'},name:text(16),gender:{'.validate':"newData.val() == 'male' || newData.val() == 'female'"},
 at:{'.validate':'newData.isNumber() && newData.val() > 0 && newData.val() <= now'},lease:text(64),'$other':{'.validate':false}
};
const message={'.validate':"newData.hasChildren(['text','name','at'])",text:text(200),name:text(16),at:{'.validate':'newData.isNumber() && newData.val() > 0 && newData.val() <= now'},'$other':{'.validate':false}};
const owner={
 '.write':`auth != null && ((auth.uid == $uid && (!newData.exists() || ${ownMember})) || (!newData.exists() && data.child('lastAt').val() < now - 10000 && !${ownerMember}))`,
 '.validate':"newData.hasChildren(['seq','lastAt','slots']) && newData.child('lastAt').val() == now && (!data.exists() || now >= data.child('lastAt').val() + 1500) && newData.child('seq').isNumber() && newData.child('seq').val() == (data.exists() ? data.child('seq').val() + 1 : 1)",
 seq:{'.validate':'newData.isNumber()'},lastAt:{'.validate':'newData.isNumber()'},
 slots:{'$message':{...message,'.validate':"$message.matches(/^m[0-4]$/) && newData.hasChildren(['text','name','at'])"}},'$other':{'.validate':false}
};
// The slot range is the server-enforced 15-person limit, not a client-only counter.
const rules={rules:{'.read':false,'.write':false,jejumungV5:{rooms:{'$room':{'.read':'auth != null','.validate':"$room.matches(/^(coast_(sunbed|hammock|bench|paddle)|forest_(hammock|bench))_[0-9]{3}$/)",seats:{'$slot':seat},messages:{'$uid':owner},'$other':{'.validate':false}}}}}};
await writeFile(new URL('../database.rules.json',import.meta.url),JSON.stringify(rules,null,2)+'\n');
console.log('Built isolated room rules: 15 seat keys, owner-only claims, five ephemeral messages per guest, 1.5s server rate limit.');

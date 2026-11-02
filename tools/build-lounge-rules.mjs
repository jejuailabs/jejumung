import {readFile,writeFile} from 'node:fs/promises';
import {MOBILE_RETREATS,LOUNGE_NAMESPACE,SEATS} from '../dist/mobile-retreats.js';
const previous=JSON.parse(await readFile(new URL('../database.rules.json',import.meta.url),'utf8'));
const slots=Array.from({length:SEATS},(_,i)=>'s'+String(i).padStart(2,'0'));
const members=uid=>'('+slots.map(s=>`root.child('${LOUNGE_NAMESPACE}/rooms').child($room).child('seats/${s}/uid').val() == ${uid}`).join(' || ')+')';
const ownMember=members('auth.uid'),ownerMember=members('$uid');
const text=max=>({'.validate':`newData.isString() && newData.val().length > 0 && newData.val().length <= ${max}`});
const seat={
// A seat whose heartbeat is older than 20 minutes is abandoned: anyone may clear or take it.
 '.write':"auth != null && (!data.exists() || data.child('uid').val() == auth.uid || data.child('at').val() < now - 1200000) && (!newData.exists() || newData.child('uid').val() == auth.uid)",
 '.validate':"$slot.matches(/^s0[0-9]$/) && newData.hasChildren(['uid','name','character','at','lease'])",
 uid:{'.validate':'newData.val() == auth.uid'},name:text(16),character:{'.validate':"newData.val() == 'stone' || newData.val() == 'citrus' || newData.val() == 'cloud' || newData.val() == 'sprout'"},
 at:{'.validate':'newData.isNumber() && newData.val() > 0 && newData.val() <= now'},lease:text(64),'$other':{'.validate':false}
};
const message={'.validate':"newData.hasChildren(['text','name','at'])",text:text(200),name:text(16),at:{'.validate':'newData.isNumber() && newData.val() > 0 && newData.val() <= now'},'$other':{'.validate':false}};
const owner={
 '.write':`auth != null && ((auth.uid == $uid && (!newData.exists() || ${ownMember})) || (!newData.exists() && data.child('lastAt').val() < now - 10000 && !${ownerMember}))`,
 '.validate':"newData.hasChildren(['seq','lastAt','slots']) && newData.child('lastAt').val() == now && (!data.exists() || now >= data.child('lastAt').val() + 1500) && newData.child('seq').isNumber() && newData.child('seq').val() == (data.exists() ? data.child('seq').val() + 1 : 1)",
 seq:{'.validate':'newData.isNumber()'},lastAt:{'.validate':'newData.isNumber()'},
 slots:{'$message':{...message,'.validate':"$message.matches(/^m[0-4]$/) && newData.hasChildren(['text','name','at'])"}},'$other':{'.validate':false}
};
// Add V7 while preserving every existing namespace and rule for already open tabs.
const names=MOBILE_RETREATS.map(s=>s.id).join('|');
const rules={rules:{...previous.rules,[LOUNGE_NAMESPACE]:{rooms:{'$room':{'.read':'auth != null','.validate':`$room.matches(/^(${names})_[0-9]{3}$/)`,seats:{'$slot':seat},messages:{'$uid':owner},'$other':{'.validate':false}}}}}};
await writeFile(new URL('../database.rules.json',import.meta.url),JSON.stringify(rules,null,2)+'\n');
console.log('Built V7: ten portrait scenes, ten server-enforced seats per room; existing namespaces preserved.');

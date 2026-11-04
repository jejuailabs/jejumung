// Adds the visitor-count rules (stats/v1) and the scenic YouTube links (scenic/v1) to
// database.rules.json, keeping every lounge namespace as is.
// Only accounts listed under stats/admins (set from the Firebase CLI, never from a browser) can read.
import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('../database.rules.json',import.meta.url);
const previous=JSON.parse(await readFile(file,'utf8'));
const admin="auth != null && root.child('stats/admins').child(auth.uid).val() == true";
// Each write adds exactly one; a per-day ceiling keeps a scripted visitor from inflating a day much.
const step=max=>({'.validate':`newData.isNumber() && newData.val() == (data.exists() ? data.val() : 0) + 1 && newData.val() <= ${max}`});
const stats={
 admins:{'.read':admin},
 v1:{
  days:{
   '.read':admin,
   '$day':{
    '.validate':"$day.matches(/^20[0-9][0-9]-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/)",
    '$uid':{
     '.write':'auth != null && auth.uid == $uid',
     v:step(500),l:step(200),
     p:{'$clip':{'.validate':"$clip.matches(/^[A-Z0-9_]{1,24}$/) && "+step(200)['.validate']}},
     '$other':{'.validate':false}
    }
   }
  },
  live:{
   '.read':admin,
   '$uid':{
    '.write':`auth != null && (auth.uid == $uid || (!newData.exists() && ${admin}))`,
    '.validate':"newData.hasChildren(['at','page'])",
    at:{'.validate':'newData.val() == now'},
    page:{'.validate':"newData.val() == 'home' || newData.val() == 'walk' || newData.val() == 'lounge'"},
    clip:{'.validate':'newData.isString() && newData.val().matches(/^[A-Z0-9_]{1,24}$/)'},
    '$other':{'.validate':false}
   }
  }
 }
};
// Scenic spots' YouTube videos (dist/scenic-youtube.js): public to read, written from /admin.
const scenic={v1:{youtube:{'.read':true,'$spot':{'.write':admin,'.validate':"$spot.matches(/^[A-Z0-9_]{1,24}$/) && newData.isString() && newData.val().matches(/^[A-Za-z0-9_-]{11}$/)"}}}};
await writeFile(file,JSON.stringify({rules:{...previous.rules,stats,scenic}},null,2)+'\n');
console.log('Stats rules: per-visitor daily counts and live heartbeat, admin-only reads; scenic YouTube links, admin writes; lounge rules untouched.');

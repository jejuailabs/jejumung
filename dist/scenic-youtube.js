import {LOUNGE_FIREBASE} from './lounge-config.js';

// Scenic spots can play from YouTube instead of our own media host (no traffic of ours). The
// admin page stores one video per spot at scenic/v1/youtube/<SPOT> (anyone may read, only admins
// write); a spot's `youtube` in clips.js is the fallback. The site reads the list once per page
// over REST, so it opens no realtime connection.
export const YOUTUBE_PATH='scenic/v1/youtube';

// A YouTube link or a bare 11-character id -> the id, or null.
export function youtubeId(text){
 const s=String(text||'').trim();
 if(/^[A-Za-z0-9_-]{11}$/.test(s))return s;
 try{
  const u=new URL(s);
  if(/(^|\.)youtu\.be$/.test(u.hostname))return check(u.pathname.slice(1));
  if(/(^|\.)youtube(-nocookie)?\.com$/.test(u.hostname)){
   const v=u.searchParams.get('v');if(v)return check(v);
   const m=u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);if(m)return check(m[1]);
  }
 }catch{}
 return null;
}
const check=id=>/^[A-Za-z0-9_-]{11}$/.test(id)?id:null;

let links=null;
export function youtubeLinks(){
 links??=fetch(`${LOUNGE_FIREBASE.databaseURL}/${YOUTUBE_PATH}.json`).then(r=>r.ok?r.json():{}).then(v=>v||{}).catch(()=>({}));
 return links;
}

// Muted, looping, without controls; the iframe takes no clicks so a tap never leaves the site.
export function youtubeFrame(id){
 const f=document.createElement('iframe');
 f.className='scenic-youtube';f.title='풍경 영상';f.setAttribute('aria-hidden','true');f.tabIndex=-1;
 f.allow='autoplay; encrypted-media; picture-in-picture';f.referrerPolicy='strict-origin-when-cross-origin';
 f.src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0`;
 return f;
}

import {CLIPS} from './clips.js';
import {createCourseMap} from './course-map.js?v=map-4';
import {CHARACTERS,characterFor,characterIcon} from './characters.js';

// Home: the map first, then the copy with the four companions, then every course as a card,
// the most recently added first. Cards come from clips.js, so a new course needs no edit here.
const $=id=>document.getElementById(id);
const map=createCourseMap($('homeMap'));

const length=s=>{const t=Math.max(5,Math.round(s/5)*5),m=Math.floor(t/60),r=t%60;return m?`약 ${m}분${r?` ${r}초`:''}`:`약 ${r}초`;};
const month=d=>d.slice(0,7).replace('-','.');
const courses=$('courses');
const order=c=>[c.added||'',CLIPS.indexOf(c)];
for(const c of CLIPS.filter(c=>c.card).sort((a,b)=>{const[x,i]=order(a),[y,j]=order(b);return y.localeCompare(x)||j-i;})){
 const a=document.createElement('a');a.className='course';a.href=`engine.html?clip=${c.id}`;a.dataset.clip=c.id;
 a.innerHTML=`<div class="photo"><img src="${c.poster}" alt="${c.card.alt}" loading="lazy" decoding="async"><span>${c.card.tag}</span><time datetime="${c.shot}">${month(c.shot)} 촬영</time></div>`+
  `<div class="description"><small>${length(c.duration)} · ${c.card.rest}</small><h2>${c.card.title} <b>↗</b></h2><p>${c.card.desc}</p></div>`;
 const on=()=>map.highlight?.(c.id),off=()=>map.highlight?.(null);
 a.addEventListener('pointerenter',on);a.addEventListener('pointerleave',off);a.addEventListener('focus',on);a.addEventListener('blur',off);
 courses.append(a);
}

// Companions: SVG at once, the live 3D row once it is near the screen. Choosing one carries
// over to the walk (the walk page reads the same localStorage key).
let chosen;try{chosen=characterFor(localStorage.getItem('jejumong-character')).id;}catch{chosen=CHARACTERS[0].id;}
const row=$('lineup'),stage=row.querySelector('.lineup-stage'),names=row.querySelector('.lineup-names');
let lineup=null;
const choose=id=>{chosen=id;try{localStorage.setItem('jejumong-character',id);}catch{}for(const b of names.children)b.setAttribute('aria-pressed',String(b.dataset.character===id));lineup?.setSelected(id);};
const fallback=document.createElement('div');fallback.className='lineup-fallback';fallback.innerHTML=CHARACTERS.map(c=>characterIcon(c.id)).join('');stage.append(fallback);
for(const c of CHARACTERS){
 const b=document.createElement('button');b.type='button';b.dataset.character=c.id;b.title=c.description;
 b.innerHTML=`<span>${c.name}</span><small>${c.description}</small>`;
 b.addEventListener('click',()=>choose(c.id));b.addEventListener('pointerenter',()=>lineup?.setFocus(c.id));b.addEventListener('pointerleave',()=>lineup?.setFocus(null));
 names.append(b);
}
choose(chosen);
stage.addEventListener('pointermove',e=>{if(!lineup)return;const r=stage.getBoundingClientRect();lineup.setFocus(lineup.idAt((e.clientX-r.left)/r.width));});
stage.addEventListener('pointerleave',()=>lineup?.setFocus(null));
stage.addEventListener('click',e=>{if(!lineup)return;const r=stage.getBoundingClientRect();choose(lineup.idAt((e.clientX-r.left)/r.width));});
new IntersectionObserver(([e],io)=>{if(!e.isIntersecting)return;io.disconnect();
 import('./character-lineup.js?v=fit-2').then(({createCharacterLineup})=>{lineup=createCharacterLineup(stage,{selected:chosen});row.classList.add('live');})
  .catch(err=>console.warn('캐릭터 3D 미리보기 사용 불가',err));
},{rootMargin:'240px'}).observe(row);

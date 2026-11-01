export const CHARACTERS=[
 {id:'stone',name:'돌멍이',description:'느긋한 제주 돌 친구',color:'#728075',face:'#d9dfc3'},
 {id:'citrus',name:'귤멍이',description:'따뜻한 귤빛 친구',color:'#efa34b',face:'#ffe1a6'},
 {id:'cloud',name:'구름이',description:'둥실둥실 조용한 친구',color:'#e9e6d9',face:'#fff9df'},
 {id:'sprout',name:'새싹이',description:'숲을 좋아하는 초록 친구',color:'#8bad7c',face:'#e3ebc4'}
];
export const characterFor=id=>CHARACTERS.find(c=>c.id===id)||CHARACTERS[0];
export function characterIcon(id){
 const c=characterFor(id),top=id==='cloud'?'<circle cx="28" cy="25" r="13"/><circle cx="52" cy="25" r="13"/><circle cx="40" cy="18" r="14"/>':id==='sprout'?'<path fill="#68935c" d="M40 20C15 20 20 3 24 4C42 6 40 20 40 20M40 20C62 20 60 3 55 4C40 7 40 20 40 20"/>':id==='citrus'?'<path fill="#699551" d="M39 20Q36 1 58 8Q53 20 39 20"/>':'<ellipse cx="40" cy="14" rx="8" ry="6" fill="#e8aa50"/><path fill="#789658" d="M43 9Q48 3 55 8Q50 12 43 9"/>';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 88" aria-hidden="true"><ellipse cx="40" cy="82" rx="22" ry="4" fill="#000" opacity=".12"/><g fill="${c.color}">${top}<rect x="23" y="54" width="34" height="26" rx="15"/><ellipse cx="40" cy="38" rx="25" ry="24"/></g><ellipse cx="40" cy="43" rx="19" ry="16" fill="${c.face}"/><circle cx="33" cy="41" r="2" fill="#30483b"/><circle cx="47" cy="41" r="2" fill="#30483b"/><path d="M36 49Q40 52 44 49" fill="none" stroke="#30483b" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="26" cy="48" rx="3" ry="1.6" fill="#d8a890" opacity=".55"/><ellipse cx="54" cy="48" rx="3" ry="1.6" fill="#d8a890" opacity=".55"/><path d="M31 78v4m18-4v4" stroke="#6e7e65" stroke-width="7" stroke-linecap="round"/></svg>`;
}
export function mountCharacterPicker(container,selected,onSelect){
 container.replaceChildren();container.classList.add('character-picker');container.setAttribute('aria-label','함께할 캐릭터 선택');
 for(const c of CHARACTERS){const b=document.createElement('button');b.type='button';b.dataset.character=c.id;b.innerHTML=characterIcon(c.id)+`<span>${c.name}</span><small>${c.description}</small>`;b.setAttribute('aria-pressed',String(c.id===selected));b.addEventListener('click',()=>onSelect(c.id));container.append(b);}
 return id=>container.querySelectorAll('[data-character]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.character===id)));
}

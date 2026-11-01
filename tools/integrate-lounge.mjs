import{readFile,writeFile}from'node:fs/promises';
const base=new URL('../dist/',import.meta.url);
let html=await readFile(new URL('engine.html',base),'utf8');
if(html.includes('id="lounge"')){console.log('Lounge already integrated.');process.exit(0);}
html=html.replace('href="engine.css?v=slow-walk-4"','href="engine.css?v=slow-walk-4"><link rel="stylesheet" href="lounge.css?v=rooms-5"');
html=html.replace('src="engine.js?v=slow-walk-4"','src="engine.js?v=rooms-5"');
html=html.replace('<section class="panel">','<section id="lounge" class="lounge" hidden aria-label="함께 쉬는 제주 쉼터"></section>\n<section class="panel" id="walkPanel">');
html=html.replace('체험판 · 각자 산책하는 공간입니다. 다른 접속자와의 만남·채팅은 아직 지원하지 않습니다.','산책 중 쉬러 가면 한 구역 최대 15명이 함께 머물러요. 같은 구역에서 인사하고, 자리가 차면 옆 구역으로 옮겨보세요.');
await writeFile(new URL('engine.html',base),html);
let js=await readFile(new URL('engine.js',base),'utf8');
js="import { createLounge } from './lounge.js?v=rooms-5';\n"+js;
js=js.replace('if(renderer){','if(renderer&&!resting){');
const from=js.indexOf('function setRest(value){'),to=js.indexOf('\nfunction toggle()',from);
if(from<0||to<0)throw Error('Rest integration boundary missing');
js=js.slice(0,from)+`const lounge=createLounge($('lounge'),{onReturn:()=>start(),onGender:value=>{
 travelerGender=value;avatar?.setTraveler(value);try{localStorage.setItem('jejumong-traveler',value);}catch{}
 document.querySelectorAll('[data-traveler]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.traveler===value)));
}});
const requestedRoom=new URLSearchParams(location.search).get('room');
function setRest(value){
 if(value===resting)return;
 if(value)savedWalkTime=video.currentTime;
 resting=value;pause();keys.clear();comparing=false;document.body.classList.remove('compare','forest-mode');document.body.classList.toggle('lounge-mode',value);
 $('stage').hidden=value;$('walkPanel').hidden=value;$('lounge').hidden=!value;$('arrival').hidden=true;
 $('compare').setAttribute('aria-pressed','false');$('compare').textContent='원본과 비교';
 if(value){$('mediaNotice').hidden=true;lounge.enter({area:isCoast?'coast':'forest',traveler:travelerGender,requestedRoom:new URLSearchParams(location.search).get('room')});}
 else{lounge.leave();video.currentTime=savedWalkTime;$('help').textContent=walkHelp;}
}
`+js.slice(to);
js=js.replace("$('enter').addEventListener('click',start)","$('enter').addEventListener('click',()=>{if(requestedRoom||new URLSearchParams(location.search).get('loungePreview')){entered=true;$('gate').hidden=true;setRest(true);}else start();})");
await writeFile(new URL('engine.js',base),js);
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
pkg.scripts.check='node --check dist/lounge.js && node --check dist/lounge-client.js && node --check dist/lounge-scenes.js && '+pkg.scripts.check;
await writeFile(new URL('../package.json',import.meta.url),JSON.stringify(pkg,null,2)+'\n');
console.log('Integrated 15-seat lounge without changing the walking video compositor.');

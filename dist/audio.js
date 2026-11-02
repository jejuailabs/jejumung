// Sound for the walk and the lounge. Everything is local: the walk hears the footage's own
// location audio, the lounge loops ambience cut from that footage, and footsteps, hammock
// creaks, water and chat blips are synthesised with Web Audio. No external services.
export function createAudio(){
 let ctx=null,master,compressor,analyser,buses={},noiseBuffer,elementSource=null,elementGain=null,videoElement=null,fallbackVolume=1;
 let enabled=true,volume=.8,ambience=null,lapTimer=null,ready=null;
 try{enabled=localStorage.getItem('jejumong-sound')!=='off';volume=Math.min(1,Math.max(0,parseFloat(localStorage.getItem('jejumong-volume')??'.8')));}catch{}
 const buffers=new Map(),listeners=new Set();
 const notify=()=>listeners.forEach(fn=>fn({enabled,volume}));
 function ensure(){
  if(ctx)return ctx;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  ctx=new AC();master=ctx.createGain();compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=3;compressor.knee.value=12;
  analyser=ctx.createAnalyser();analyser.fftSize=1024;
  for(const[name,level]of[['ambience',.9],['foley',.8],['ui',.6]]){const g=ctx.createGain();g.gain.value=level;g.connect(master);buses[name]=g;}
  master.connect(compressor);compressor.connect(analyser);analyser.connect(ctx.destination);
  noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  applyVolume(0);return ctx;
 }
 function applyVolume(ramp=.15){
  const target=enabled?volume:0;
  if(master){const t=ctx.currentTime;master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(master.gain.value,t);master.gain.linearRampToValueAtTime(target,t+ramp);}
  if(videoElement&&!elementSource){videoElement.muted=!enabled;videoElement.volume=volume*fallbackVolume;}
 }
 function unlock(){const c=ensure();if(c&&c.state!=='running')c.resume().catch(()=>{});if(videoElement&&!elementSource)attachVideo(videoElement);}
 // Route the walking footage's own audio through the graph so it can be faded with the lounge.
 function attachVideo(video){
  videoElement=video;const c=ensure();if(!c||elementSource)return;
  try{elementSource=c.createMediaElementSource(video);elementGain=c.createGain();elementGain.gain.value=fallbackVolume;elementSource.connect(elementGain);elementGain.connect(buses.ambience);video.muted=false;video.volume=1;}
  catch{elementSource=null;video.muted=!enabled;video.volume=volume*fallbackVolume;}
 }
 function setVideoLevel(level,seconds=.6){
  fallbackVolume=level;
  if(elementGain){const t=ctx.currentTime;elementGain.gain.cancelScheduledValues(t);elementGain.gain.setValueAtTime(elementGain.gain.value,t);elementGain.gain.linearRampToValueAtTime(level,t+seconds);}
  else if(videoElement)videoElement.volume=volume*level;
 }
 async function load(url){
  const c=ensure();if(!c)throw Error('no audio');
  if(!buffers.has(url))buffers.set(url,fetch(url).then(r=>{if(!r.ok)throw Error(url);return r.arrayBuffer();}).then(b=>c.decodeAudioData(b)).catch(e=>{buffers.delete(url);throw e;}));
  return buffers.get(url);
 }
 async function playAmbience(name,url,{fade=1.4,level=.8}={}){
  const c=ensure();if(!c)return;
  if(ambience&&ambience.name===name)return;
  stopAmbience(fade);
  const token={name};ambience=token;
  let buffer;try{buffer=await load(url);}catch{if(ambience===token)ambience=null;return;}
  if(ambience!==token)return;
  const source=c.createBufferSource();source.buffer=buffer;source.loop=true;const gain=c.createGain();gain.gain.value=0;source.connect(gain);gain.connect(buses.ambience);
  source.start(0,Math.random()*buffer.duration*.8);const t=c.currentTime;gain.gain.linearRampToValueAtTime(level,t+fade);
  Object.assign(token,{source,gain});
 }
 function stopAmbience(fade=1){
  if(!ambience)return;const old=ambience;ambience=null;
  if(old.source){const t=ctx.currentTime;old.gain.gain.cancelScheduledValues(t);old.gain.gain.setValueAtTime(old.gain.gain.value,t);old.gain.gain.linearRampToValueAtTime(0,t+fade);old.source.stop(t+fade+.05);}
 }
 function out(bus,gain,pan){const g=ctx.createGain();g.gain.value=gain;let node=g;if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p);node=p;}node.connect(buses[bus]);return g;}
 function noise(dest,{filter='bandpass',frequency=1000,q=1,attack=.005,hold=0,decay=.08,peak=.4,sweep=null,rate=1,start}){
  const t=start??ctx.currentTime,src=ctx.createBufferSource();src.buffer=noiseBuffer;src.playbackRate.value=rate;
  const f=ctx.createBiquadFilter();f.type=filter;f.frequency.setValueAtTime(frequency,t);f.Q.value=q;if(sweep)f.frequency.exponentialRampToValueAtTime(sweep[0],t+sweep[1]);
  const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+attack);if(hold)g.gain.setValueAtTime(peak,t+attack+hold);g.gain.exponentialRampToValueAtTime(.0005,t+attack+hold+decay);
  src.connect(f);f.connect(g);g.connect(dest);src.start(t,Math.random()*1.2);src.stop(t+attack+hold+decay+.05);
 }
 function tone(dest,{type='sine',from=440,to=null,duration=.1,peak=.3,start}){
  const t=start??ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(from,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+duration);
  g.gain.setValueAtTime(peak,t);g.gain.exponentialRampToValueAtTime(.0005,t+duration);o.connect(g);g.connect(dest);o.start(t);o.stop(t+duration+.02);
 }
 // A small creature's step: a soft thump, a surface texture, and for wood a hollow ring.
 function footstep(surface='wood',{gain=1,pan=0,rate=1}={}){
  if(!ctx||!enabled)return;const dest=out('foley',.55*gain,pan);
  const f0={wood:95,stone:150,dirt:70}[surface]||95;
  tone(dest,{from:f0*rate*1.6,to:f0*rate*.7,duration:.11,peak:surface==='dirt'?.22:.45});
  if(surface==='dirt'){noise(dest,{frequency:3000*rate,q:.8,decay:.10,peak:.32});noise(dest,{frequency:5200*rate,q:1.5,attack:.012,decay:.07,peak:.14,start:ctx.currentTime+.015});}
  else if(surface==='stone'){noise(dest,{frequency:2600*rate,q:1.1,decay:.045,peak:.38});}
  else{noise(dest,{frequency:1400*rate,q:1.2,decay:.05,peak:.4});noise(dest,{frequency:330*rate,q:9,decay:.16,peak:.26});}
 }
 function foley(kind,{pan=0,gain=1}={}){
  if(!ctx||!enabled)return;const dest=out('foley',gain,pan),t=ctx.currentTime;
  switch(kind){
   case'hammock':noise(dest,{frequency:640,q:7,sweep:[430,.28],attack:.03,decay:.26,peak:.13});noise(dest,{filter:'lowpass',frequency:1600,q:.7,attack:.04,hold:.08,decay:.32,peak:.16});break;
   case'creak':noise(dest,{frequency:560,q:8,sweep:[470,.22],attack:.05,decay:.2,peak:.07});break;
   case'rustle':noise(dest,{filter:'lowpass',frequency:2200,q:.7,attack:.03,hold:.06,decay:.28,peak:.18});break;
   case'lap':noise(dest,{filter:'lowpass',frequency:380,q:.8,sweep:[1300,.5],attack:.35,hold:.1,decay:.7,peak:.12});noise(dest,{filter:'bandpass',frequency:2400,q:.6,attack:.25,decay:.6,peak:.04,start:t+.2});break;
   case'splash':noise(dest,{frequency:1500,q:.8,attack:.004,decay:.14,peak:.3});noise(dest,{filter:'lowpass',frequency:500,q:.8,sweep:[1500,.4],attack:.2,decay:.6,peak:.14,start:t+.08});break;
   case'tok':tone(dest,{from:760,to:540,duration:.09,peak:.22});noise(dest,{frequency:1800,q:1.2,decay:.02,peak:.12});break;
   case'tick':tone(dest,{from:1200,duration:.03,peak:.08});break;
  }
 }
 function startLaps(){stopLaps();const next=()=>{lapTimer=setTimeout(()=>{foley('lap',{pan:Math.random()*1.2-.6,gain:.8+Math.random()*.4});next();},1800+Math.random()*2600);};next();}
 function stopLaps(){clearTimeout(lapTimer);lapTimer=null;}
 function level(){if(!analyser)return 0;const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);let s=0;for(const v of data)s+=v*v;return Math.sqrt(s/data.length);}
 return{
  unlock,attachVideo,setVideoLevel,playAmbience,stopAmbience,footstep,foley,startLaps,stopLaps,load,
  get enabled(){return enabled;},get volume(){return volume;},
  setEnabled(value){enabled=Boolean(value);try{localStorage.setItem('jejumong-sound',enabled?'on':'off');}catch{}if(ctx)applyVolume();else if(videoElement)videoElement.muted=!enabled;notify();},
  setVolume(value){volume=Math.min(1,Math.max(0,value));try{localStorage.setItem('jejumong-volume',String(volume));}catch{}if(ctx)applyVolume(.05);else if(videoElement)videoElement.volume=volume;notify();},
  onChange(fn){listeners.add(fn);fn({enabled,volume});return()=>listeners.delete(fn);},
  debug(){return{state:ctx?.state||'none',enabled,volume,level:level(),ambience:ambience?.name||null,ambiencePlaying:Boolean(ambience?.source),videoRouted:Boolean(elementSource),laps:Boolean(lapTimer)};}
 };
}

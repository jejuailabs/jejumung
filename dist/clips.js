// `slow` clips were re-timed to 0.72x offline from the 60 fps originals, so every frame is real.
// `path30` is the hand path carried by the per-frame camera solve, with ground speed at the feet.
// `light` is the per-clip sun/fill match and the composite look (sun = direction toward the sun).
export const CLIPS = [
 {id:'IMG_2207',title:'노을 다리',map:{lat:33.2712,lon:126.6610,place:'남쪽 해안',dx:30,dy:-135},surface:'wood',file:'IMG_2207.MOV',duration:16.041,slow:true,src:'/lab/media/IMG_2207/index.m3u8',poster:'/lab/media/IMG_2207.jpg',path30:'/lab/paths/IMG_2207-slow.json',calibrated:true,
  light:{sun:[-1.2,.9,-5],sunColor:'#ffb073',sunIntensity:1.6,fill:[0,-.6,1.5],fillColor:'#35cfd6',fillIntensity:.9,shadowOpacity:.3,shadowRadius:4,softness:.9,grain:.04,vignette:.25,contrast:1.03,saturation:1.04,sharpen:.5,envIntensity:.7}},
 {id:'IMG_0575',title:'해안 데크 산책',map:{lat:33.2419,lon:126.5675,place:'서귀포',dx:-265,dy:-160},surface:'wood',file:'IMG_0575.MOV',duration:81.5,slow:true,src:'/lab/media/IMG_0575/index.m3u8',poster:'/lab/media/IMG_0575.jpg',path:'/lab/paths/IMG_0575.json',path30:'/lab/paths/IMG_0575-slow.json',calibrated:true,
  light:{sun:[2.4,4.2,2.2],sunColor:'#ffe6c2',sunIntensity:2.5,fill:[-2,2,-4],fillColor:'#cfe3f5',fillIntensity:.5,shadowOpacity:.42,shadowRadius:2.5,softness:.8,grain:.03,vignette:.2,contrast:1.03,saturation:1.04,sharpen:.6,envIntensity:.55}},
 {id:'IMG_0965',title:'숲길 산책',map:{lat:33.4364,lon:126.6611,place:'교래 중산간',dx:20,dy:-150},surface:'dirt',file:'IMG_0965.MOV',duration:223.967,slow:true,src:'/lab/media/IMG_0965/index.m3u8',poster:'/lab/media/IMG_0965.jpg',path:'/lab/paths/IMG_0965.json',path30:'/lab/paths/IMG_0965-slow.json',calibrated:true,
  light:{sun:[.8,5,1.4],sunColor:'#f6f1d4',sunIntensity:1.5,fill:[-2,2,3],fillColor:'#d8ead0',fillIntensity:.6,shadowOpacity:.24,shadowRadius:5,softness:.9,grain:.035,vignette:.22,contrast:1.03,saturation:1.04,sharpen:.6,envIntensity:.6}},
 {id:'NOKKOME',title:'노꼬메 능선 산책',map:{lat:33.387,lon:126.411,place:'애월 중산간',dx:-250,dy:-70},surface:'dirt',file:'IMG_3596-3684.MOV',duration:126.333,slow:true,src:'/lab/media/NOKKOME/index.m3u8',poster:'/lab/media/NOKKOME.jpg',path30:'/lab/paths/NOKKOME-slow.json',calibrated:true,
  light:{sun:[.5,3,1.2],sunColor:'#e9eff1',sunIntensity:.9,fill:[-2,2,3],fillColor:'#dfe8e4',fillIntensity:.5,shadowOpacity:.14,shadowRadius:6,softness:1,grain:.04,vignette:.2,contrast:1.02,saturation:1.0,sharpen:.5,envIntensity:.6}},
 {id:'CEDAR',title:'삼나무숲 산책',map:{lat:33.458,lon:126.655,place:'조천 중산간',dx:-190,dy:-50},surface:'dirt',file:'IMG_9610-9648.MOV',duration:171.4,slow:true,src:'/lab/media/CEDAR/index.m3u8',poster:'/lab/media/CEDAR.jpg',path30:'/lab/paths/CEDAR-slow.json',calibrated:true,
  light:{sun:[-1.2,2.2,-4],sunColor:'#ffd9a6',sunIntensity:2.2,fill:[1.5,2,3],fillColor:'#d9e6d0',fillIntensity:.5,shadowOpacity:.35,shadowRadius:3,softness:.9,grain:.035,vignette:.22,contrast:1.04,saturation:1.05,sharpen:.6,envIntensity:.6}}
];

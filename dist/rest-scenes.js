export const REST_SCENES={
 forest:{
  layers:'/lab/scenes/forest/',dressing:{sun:[.35,1,.9],sunColor:'#f7f1d6',sunIntensity:1.5,hemiIntensity:2.3,shadowOpacity:.22,groundTilt:1.15,entry:{x:724,y:1070,scale:112},entryMode:'walk',water:0,swayAmount:1,dapple:.07,drift:.006,zoom:.012},
  title:'숲속 쉼터',width:1448,height:1086,image:'/lab/media/forest-rest.png',alt:'숲속 벤치와 해먹이 놓인 쉼터',entryPose:'stand',entrySpot:'bench-front',allowStand:true,standing:{x:798,y:865,scale:95,yaw:-.15},
  spots:{
   'bench-front':{pose:'sit',x:395,y:780,scale:115,yaw:-.12,name:'앞쪽 벤치',label:'벤치',button:[.29,.77]},
   'bench-right':{pose:'sit',x:1164,y:603,scale:66,yaw:-.7,name:'오른쪽 의자',label:'의자',button:[.80,.58],sprite:{mirror:true}},
   'hammock-left':{pose:'lie',x:282,y:435,scale:80,name:'왼쪽 해먹',label:'해먹',button:[.15,.46],sprite:{view:'hammock',head:[175,405],feet:[304,445]},mask:[[64,332],[116,389],[175,422],[232,436],[293,423],[340,390],[376,345],[360,404],[314,449],[258,468],[201,474],[146,456],[104,419],[78,380]]},
   'hammock-middle':{pose:'lie',x:652,y:410,scale:48,name:'가운데 해먹',label:'해먹',button:[.42,.43],sprite:{view:'hammock',head:[582,387],feet:[651,414]},mask:[[546,378],[573,405],[609,415],[642,409],[668,389],[682,365],[678,404],[655,429],[614,439],[576,431],[552,409]]},
   'hammock-orange':{pose:'lie',x:1002,y:419,scale:61,name:'주황색 해먹',label:'해먹',button:[.67,.44],sprite:{view:'hammock',head:[920,393],feet:[1015,421]},mask:[[855,367],[897,398],[940,414],[979,417],[1018,402],[1050,380],[1077,347],[1060,398],[1020,429],[975,441],[930,437],[892,418],[865,395]]}
  }
 },
 coastLounge:{
  layers:'/lab/scenes/coastLounge/',dressing:{sun:[.7,1,.6],sunColor:'#ffe6c2',sunIntensity:2.4,hemiIntensity:2.2,shadowOpacity:.34,groundTilt:1.2,entry:{x:150,y:346,scale:62},entryMode:'walk',water:1,swayAmount:.8,dapple:.03,drift:.005,zoom:.01},
  title:'바다 선베드',width:625,height:351,image:'/lab/media/coast-lounge.png',alt:'푸른 바다 앞 데크의 선베드와 파라솔',entryPose:'lie',entrySpot:'sunbed-front',allowStand:false,allowedPoses:['lie'],standing:{x:252,y:282,scale:49,yaw:-.25},
  spots:{
   'sunbed-front':{pose:'lie',allowed:['lie'],name:'앞쪽 선베드',label:'선베드',button:[.66,.84],sprite:{view:'sunbed',head:[370,235],feet:[450,261]},poses:{sit:{x:397,y:260,scale:44,yaw:-.4},lie:{x:432,y:264,scale:65,roll:1.18,yaw:.10,pitch:.10}}},
   'sunbed-middle':{pose:'lie',allowed:['lie'],name:'가운데 선베드',label:'선베드',button:[.43,.71],sprite:{view:'sunbed',head:[270,208],feet:[328,231]},poses:{sit:{x:276,y:224,scale:32,yaw:-.3},lie:{x:309,y:229,scale:44,roll:1.17,yaw:.10,pitch:.10}}},
   'daybed-right':{pose:'lie',allowed:['lie'],name:'오른쪽 데이베드',label:'데이베드',button:[.82,.95],sprite:{view:'overhead',head:[529,285],feet:[474,298]},poses:{sit:{x:499,y:305,scale:39,yaw:-.2},lie:{x:534,y:310,scale:47,roll:1.24,yaw:.10,pitch:.10}}}
  }
 },
 coastHammocks:{
  layers:'/lab/scenes/coastHammocks/',dressing:{sun:[.7,1,.5],sunColor:'#ffe6c2',sunIntensity:2.4,hemiIntensity:2.2,shadowOpacity:.3,groundTilt:1.2,entry:{x:215,y:346,scale:52},entryMode:'walk',water:1,swayAmount:1,dapple:.04,drift:.006,zoom:.012},
  title:'바닷가 해먹',width:624,height:350,image:'/lab/media/coast-hammocks.png',alt:'바다를 마주한 나무 그늘 아래의 해먹',entryPose:'lie',entrySpot:'sea-hammock-front',allowStand:true,standing:{x:204,y:291,scale:44,yaw:-.15},
  spots:{
   'sea-hammock-front':{pose:'lie',allowed:['sit','lie'],name:'앞쪽 바다 해먹',label:'해먹',button:[.56,.83],sprite:{view:'hammock',head:[315,241],feet:[390,258]},maskWhen:['sit','lie'],mask:[[277,235],[309,253],[345,263],[382,260],[412,242],[417,237],[410,258],[383,277],[344,282],[309,270],[286,251]],poses:{sit:{x:350,y:261,scale:31,yaw:.12},lie:{x:385,y:260,scale:47,roll:1.22,yaw:.10,pitch:.07}}},
   'sea-hammock-shade':{pose:'lie',allowed:['sit','lie'],name:'나무 그늘 해먹',label:'해먹',button:[.26,.64],sprite:{view:'hammock',head:[144,186],feet:[200,201]},maskWhen:['sit','lie'],mask:[[107,178],[136,193],[167,198],[193,193],[219,177],[213,195],[184,209],[154,212],[125,202]],poses:{sit:{x:164,y:199,scale:23,yaw:.12},lie:{x:195,y:201,scale:30,roll:1.30,yaw:.10,pitch:.07}}}
  }
 },
 coastPaddles:{
  layers:'/lab/scenes/coastPaddles/',dressing:{sun:[.6,1,.8],sunColor:'#fff2d8',sunIntensity:2.6,hemiIntensity:2.4,shadowOpacity:.28,groundTilt:.9,entry:{x:617,y:700,scale:60},entryMode:'fade',water:.7,swayAmount:.8,dapple:.02,drift:.005,zoom:.01},
  title:'에메랄드빛 바다 · 패들보드',width:1235,height:703,image:'/lab/media/coast-paddleboards.png',alt:'맑은 에메랄드빛 물 위에 떠 있는 여러 패들보드',entryPose:'lie',entrySpot:'paddle-white',allowStand:false,allowedPoses:['lie'],
  spots:{
   'paddle-white':{pose:'lie',allowed:['lie'],name:'흰색 패들보드',label:'보드',button:[.40,.69],sprite:{view:'overhead',head:[426,365],feet:[533,437]},poses:{sit:{x:477,y:422,scale:60,yaw:-.25},lie:{x:526,y:445,scale:62,roll:.92,yaw:.1,pitch:.12}}},
   'paddle-orange':{pose:'lie',allowed:['lie'],name:'주황색 패들보드',label:'보드',button:[.33,.88],sprite:{view:'overhead',head:[355,461],feet:[460,574]},poses:{sit:{x:410,y:521,scale:67,yaw:-.3},lie:{x:448,y:556,scale:79,roll:.73,yaw:.1,pitch:.12}}},
   'paddle-yellow':{pose:'lie',allowed:['lie'],name:'노란색 패들보드',label:'보드',button:[.63,.53],sprite:{view:'overhead',head:[728,293],feet:[823,331]},poses:{sit:{x:775,y:320,scale:40,yaw:-.25},lie:{x:819,y:335,scale:48,roll:1.15,yaw:.1,pitch:.12}}},
   'paddle-blue':{pose:'lie',allowed:['lie'],name:'하늘색 패들보드',label:'보드',button:[.87,.61],sprite:{view:'overhead',head:[1018,348],feet:[1156,401]},poses:{sit:{x:1087,y:380,scale:42,yaw:-.3},lie:{x:1130,y:396,scale:53,roll:1.10,yaw:.1,pitch:.12}}}
  }
 }
};
export const COAST_REST_IDS=['coastLounge','coastHammocks','coastPaddles'];

// Contain preserves every seat on portrait screens. Cover is retained for legacy scenes.
export function roomView(width,height,viewWidth,viewHeight,mode='contain'){
 const aspect=viewWidth/viewHeight,imageAspect=width/height;let vw=width,vh=height;
 if(mode==='contain'){if(aspect<imageAspect)vh=width/aspect;else vw=height*aspect;}
 else if(aspect<imageAspect)vw=height*aspect;else vh=width/aspect;
 return{vw,vh};
}
// Move the small numbered touch targets apart without changing the rendered furniture/avatars.
export function spreadMarkers(items,width,height,size=30){
 if(width<=0||height<=0)return new Map(items.map(item=>[item.id,item]));
 const pad=size/2+2,points=items.map(item=>({...item,x:Math.min(width-pad,Math.max(pad,item.x*width/100)),y:Math.min(height-pad,Math.max(pad,item.y*height/100))}));
 for(let pass=0;pass<10;pass++)for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
  const a=points[i],b=points[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=size+2)continue;
  if(d<.01){dx=1;dy=0;d=1;}const push=(size+2-d)/2;
  a.x-=dx/d*push;a.y-=dy/d*push;b.x+=dx/d*push;b.y+=dy/d*push;
  for(const p of[a,b]){p.x=Math.min(width-pad,Math.max(pad,p.x));p.y=Math.min(height-pad,Math.max(pad,p.y));}
 }
 return new Map(points.map(p=>[p.id,{...p,x:p.x/width*100,y:p.y/height*100}]));
}

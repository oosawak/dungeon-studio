// Original procedural map illustration. Editing data and gameplay stay independent.
const TAU=Math.PI*2;
const hash=(x,y,s=0)=>{const v=Math.sin(x*127.1+y*311.7+s*17.17)*43758.5453;return v-Math.floor(v);};
function polygon(ctx,points,fill,stroke,width=1){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function line(ctx,pts,color,width=1){ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
export function terrainContours(scene,predicate,cell=24){
 const edges=new Map(),has=(x,y)=>x>=0&&y>=0&&x<scene.width&&y<scene.height&&predicate(scene.cells[y][x]);
 const add=(ax,ay,bx,by)=>{const k=ax+','+ay;if(!edges.has(k))edges.set(k,[]);edges.get(k).push([bx,by]);};
 for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(has(x,y)){
  if(!has(x,y-1))add(x,y,x+1,y);if(!has(x+1,y))add(x+1,y,x+1,y+1);if(!has(x,y+1))add(x+1,y+1,x,y+1);if(!has(x-1,y))add(x,y+1,x,y);
 }
 const loops=[];
 while(edges.size){const first=edges.keys().next().value,start=first.split(',').map(Number),loop=[start];let key=first;
  for(let i=0;i<scene.width*scene.height*8;i++){
   const list=edges.get(key);if(!list?.length)break;const next=list.pop();if(!list.length)edges.delete(key);if(next[0]===start[0]&&next[1]===start[1])break;loop.push(next);key=next.join(',');
  }
  if(loop.length>2)loops.push(loop.map(([x,y])=>[x*cell,y*cell]));
 }
 return loops;
}
function contourPath(ctx,loops){ctx.beginPath();for(const points of loops){let prev=points.at(-1);ctx.moveTo((prev[0]+points[0][0])/2,(prev[1]+points[0][1])/2);for(let i=0;i<points.length;i++){const p=points[i],n=points[(i+1)%points.length];ctx.quadraticCurveTo(p[0],p[1],(p[0]+n[0])/2,(p[1]+n[1])/2);}ctx.closePath();}}
function tree(ctx,x,y,size=12,seed=0){
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#34463625';ctx.beginPath();ctx.ellipse(2,size*.35,size*.55,size*.2,0,0,TAU);ctx.fill();
 line(ctx,[[0,2],[0,-size*.45]],'#66583a',Math.max(1,size*.13));
 const green=seed>.55?'#617952':'#71895e';
 for(const [dx,dy,r]of [[-size*.22,-size*.45,size*.35],[size*.23,-size*.5,size*.34],[0,-size*.78,size*.38]]){ctx.beginPath();ctx.ellipse(dx,dy,r,r*.8,0,0,TAU);ctx.fillStyle=green;ctx.fill();ctx.strokeStyle='#3c5945';ctx.lineWidth=.8;ctx.stroke();}
 ctx.restore();
}
function pine(ctx,x,y,size=15){ctx.fillStyle='#354b392a';ctx.beginPath();ctx.ellipse(x+2,y+3,size*.4,size*.15,0,0,TAU);ctx.fill();line(ctx,[[x,y+2],[x,y-size*.8]],'#61563c',1.3);for(let i=0;i<3;i++)polygon(ctx,[[x,y-size*(1.05-i*.23)],[x+size*(.28+i*.08),y-size*(.4-i*.21)],[x-size*(.28+i*.08),y-size*(.4-i*.21)]],i%2?'#587257':'#47634c','#354f3c',.6);}
function mountain(ctx,x,y,size=24,seed=0){const peakX=x+size*(seed-.5)*.28,peakY=y-size;polygon(ctx,[[x-size*.6,y],[peakX,peakY],[x+size*.6,y]],'#c6b88e','#887c5d',1.1);polygon(ctx,[[peakX,peakY],[x+size*.6,y],[x+size*.05,y-size*.2]],'#a99c76',null);polygon(ctx,[[peakX,peakY],[peakX+size*.21,peakY+size*.4],[peakX+size*.02,peakY+size*.3],[peakX-size*.18,peakY+size*.4]],'#f4efd6',null);line(ctx,[[x-size*.39,y+2],[x-size*.1,y+4],[x+size*.5,y+2]],'#94865e60',.7);}
function label(ctx,text,x,y,size=18,color='#4f4a35',angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=size+'px DenkiChip, sans-serif';ctx.lineJoin='round';ctx.lineWidth=Math.max(3,size*.17);ctx.strokeStyle='#eee5c9df';ctx.strokeText(text,0,0);ctx.fillStyle=color;ctx.fillText(text,0,0);ctx.restore();}
function village(ctx,x,y,size=20,style='town'){
 ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);
 if(style==='dungeon'){polygon(ctx,[[-13,8],[-11,-5],[-7,-10],[-3,-7],[0,-14],[8,-6],[12,8]],'#aaa184','#6d6750');ctx.fillStyle='#4e5347';ctx.beginPath();ctx.ellipse(0,5,4.5,7,0,Math.PI,TAU);ctx.fill();line(ctx,[[-8,-1],[-6,6]],'#d2c7a3',1.5);}
 else{for(const [dx,dy,h]of [[-8,3,10],[4,4,15],[12,5,8]]){ctx.fillStyle='#d8c7a1';ctx.fillRect(dx-4,dy-h,8,h);ctx.strokeStyle='#695d43';ctx.strokeRect(dx-4,dy-h,8,h);polygon(ctx,[[dx-6,dy-h],[dx,dy-h-6],[dx+6,dy-h]],'#98714e','#695d43');ctx.fillStyle='#726749';ctx.fillRect(dx-1,dy-4,2,4);}}
 ctx.restore();
}
export function buildingBounds(building){const rotate=Math.abs(building.rotation||0)%180===90;return{x:building.x,y:building.y,w:rotate?building.h:building.w,h:rotate?building.w:building.h};}
export function drawBuilding(ctx,b,cell=24,selected=false){
 const box=buildingBounds(b),x=box.x*cell,y=box.y*cell,w=b.w*cell,h=b.h*cell,roof=({tile:['#b37a5c','#865340'],slate:['#71818a','#4e626d'],thatch:['#bdac75','#998957'],flat:['#9b9b86','#777f78']})[b.roof||'tile'];
 ctx.save();ctx.translate(x+box.w*cell/2,y+box.h*cell/2);ctx.rotate((b.rotation||0)*Math.PI/180);
 polygon(ctx,[[-w/2+7,-h/2+9],[w/2+9,-h/2+9],[w/2+12,h/2+12],[-w/2+7,h/2+11]],'#293b3932',null);
 ctx.fillStyle='#e8d3ac';ctx.fillRect(-w/2,-h/2+5,w,h);ctx.strokeStyle='#665641';ctx.lineWidth=1.3;ctx.strokeRect(-w/2,-h/2+5,w,h);
 // Front facade remains visible below an overhanging pitched roof.
 const eave=h*.32;
 polygon(ctx,[[-w/2-3,-h/2],[0,-h/2-eave*.35],[w/2+3,-h/2],[w/2+3,h/2-eave],[-w/2-3,h/2-eave]],roof[0],'#655746',1.5);
 polygon(ctx,[[0,-h/2-eave*.35],[w/2+3,-h/2],[w/2+3,h/2-eave],[0,h/2-eave*.7]],roof[1],null);
 line(ctx,[[0,-h/2-eave*.35],[0,h/2-eave*.7]],'#eed0a080',1.4);
 ctx.save();ctx.beginPath();ctx.rect(-w/2,-h/2,w,h-eave);ctx.clip();for(let yy=-h/2+7;yy<h/2-eave;yy+=7)line(ctx,[[-w/2,yy],[w/2,yy]],'#3e30241d',.9);ctx.restore();
 const windows=Math.max(1,Math.floor(w/27));for(let i=0;i<windows;i++){const wx=-w/2+(i+.5)*w/windows;ctx.fillStyle='#507881';ctx.fillRect(wx-4,h/2-eave+7,8,8);line(ctx,[[wx,h/2-eave+7],[wx,h/2-eave+15]],'#e0d0ab',1);}
 ctx.fillStyle='#6c5841';ctx.fillRect(-5,h/2-11,10,16);ctx.fillStyle='#e4c989';ctx.fillRect(1,h/2-3,1.5,1.5);
 ctx.fillStyle='#b3a183';ctx.fillRect(-8,h/2+5,16,4);
 if(b.kind==='shop'||b.kind==='inn'){for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#e9d8b4':'#9b5c45';ctx.fillRect(-w*.3+i*w*.1,h/2-eave+4,w*.1,6);}}
 if(b.kind==='temple'){polygon(ctx,[[-5,-h/2-1],[0,-h/2-15],[5,-h/2-1]],'#687d78','#526761');}
 ctx.fillStyle='#a4977e';ctx.fillRect(w*.22,-h*.3,7,11);ctx.strokeStyle='#72654c';ctx.strokeRect(w*.22,-h*.3,7,11);
 if(selected){ctx.strokeStyle='#d49e45';ctx.lineWidth=2.5;ctx.setLineDash([5,4]);ctx.strokeRect(-w/2-7,-h/2-9,w+14,h+24);ctx.setLineDash([]);}
 ctx.restore();
 if(b.name)label(ctx,b.name,x+box.w*cell/2,y+box.h*cell+17,Math.min(16,cell*.7),'#574731');
}
export function renderAtlas(ctx,scene,{cell=24,grid=false,selectedBuilding=null,showMarkers=true,frame=true}={}){
 const width=scene.width*cell,height=scene.height*cell,isWorld=scene.mapKind==='world',seed=scene.seed||42;
 ctx.save();ctx.clearRect(0,0,width,height);
 const sea=ctx.createLinearGradient(0,0,width,height);sea.addColorStop(0,'#8eafb1');sea.addColorStop(1,'#638f99');ctx.fillStyle=isWorld?sea:'#8eafb1';ctx.fillRect(0,0,width,height);
 if(isWorld){
  for(let y=18;y<height;y+=29)for(let x=12;x<width;x+=43){const j=hash(x,y,seed);ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+5,y-2-j*2,x+10,y);ctx.quadraticCurveTo(x+15,y+2+j*2,x+20,y);ctx.strokeStyle='#e0ede32c';ctx.lineWidth=.8;ctx.stroke();}
 }
 const land=terrainContours(scene,c=>c!=='~'&&c!=='#',cell);
 contourPath(ctx,land);ctx.strokeStyle='#dce0c064';ctx.lineWidth=12;ctx.stroke();ctx.strokeStyle='#536e6080';ctx.lineWidth=5;ctx.stroke();
 contourPath(ctx,land);const ground=ctx.createLinearGradient(0,0,width,height);ground.addColorStop(0,isWorld?'#e8dfb9':'#d2cdb0');ground.addColorStop(.6,isWorld?'#d8d1a8':'#c5c6a1');ground.addColorStop(1,'#ece3c1');ctx.fillStyle=ground;ctx.fill('evenodd');
 ctx.save();contourPath(ctx,land);ctx.clip('evenodd');
 for(let i=0;i<Math.min(width*height/100,18000);i++){const x=hash(i,1,seed)*width,y=hash(i,2,seed)*height;ctx.fillStyle=i%2?'#8674520b':'#fff8db18';ctx.fillRect(x,y,1.2,1.2);}
 const forest=terrainContours(scene,c=>c==='f',cell);contourPath(ctx,forest);ctx.fillStyle='#7e976329';ctx.fill('evenodd');
 const roads=terrainContours(scene,c=>c==='=',cell);contourPath(ctx,roads);ctx.strokeStyle='#af97664d';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#d4ba88';ctx.fill('evenodd');
 // Irregular paving marks, rather than a square gameplay grid.
 for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++)if(scene.cells[y][x]==='='&&hash(x,y,seed)>.5){line(ctx,[[x*cell+4,y*cell+cell*.35],[x*cell+cell*.64,y*cell+cell*.38]],'#8c765126',.8);}
 ctx.restore();
 for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++){
  const c=scene.cells[y][x],rnd=hash(x,y,seed),px=(x+.5)*cell,py=(y+.75)*cell;
  if(c==='f'){const count=isWorld?3:1;for(let i=0;i<count;i++){const tx=px+(hash(x+i,y,seed)-.5)*cell,ty=py+(hash(y+i,x,seed)-.5)*cell*.7;if(rnd>.25)tree(ctx,tx,ty,cell*(isWorld?.58:.78),rnd);else pine(ctx,tx,ty,cell*.7);}}
  if(c==='^')mountain(ctx,px,py,cell*(.9+rnd*.55),rnd);
  if(!isWorld&&c==='g'&&rnd>.9){ctx.fillStyle='#77936b';ctx.beginPath();ctx.ellipse(px,py,cell*.13,cell*.08,0,0,TAU);ctx.fill();}
 }
 for(const b of [...(scene.buildings||[])].sort((a,b)=>(a.y+a.h)-(b.y+b.h)))drawBuilding(ctx,b,cell,b.id===selectedBuilding);
 for(const e of scene.entities){
  const x=(e.x+.5)*cell,y=(e.y+.5)*cell;
  if(e.kind==='portal'){
   if(e.buildingId)continue;
   if(isWorld){village(ctx,x,y,cell*1.3,e.style);label(ctx,e.label,x,y+cell*.72,Math.max(16,cell*.75));}
   else{ctx.strokeStyle='#64533d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,cell*.33,Math.PI,0);ctx.lineTo(x+cell*.33,y+cell*.24);ctx.stroke();if(e.target==='$return')label(ctx,e.label,x,y+cell*.75,14);}
  }else if(showMarkers&&['spawn','exit','enemy','note','key'].includes(e.kind)){
   const symbol={spawn:'●',exit:'◆',enemy:'▲',note:'▤',key:'K'}[e.kind];ctx.font='15px DenkiChip';ctx.textAlign='center';ctx.fillStyle={spawn:'#2d7470',exit:'#415a89',enemy:'#a04b43',note:'#8a7040',key:'#ac8427'}[e.kind];ctx.fillText(symbol,x,y+5);
  }
 }
 for(const item of scene.labels||[])label(ctx,item.text,item.x*cell,item.y*cell,item.size||22,item.color||'#605940',(item.rotation||0)*Math.PI/180);
 if(grid){ctx.strokeStyle='#5e634327';ctx.lineWidth=.7;ctx.beginPath();for(let x=0;x<=scene.width;x++){ctx.moveTo(x*cell,0);ctx.lineTo(x*cell,height);}for(let y=0;y<=scene.height;y++){ctx.moveTo(0,y*cell);ctx.lineTo(width,y*cell);}ctx.stroke();}
 if(frame){
  ctx.strokeStyle='#e9e2c28a';ctx.lineWidth=2;ctx.strokeRect(13,13,width-26,height-26);ctx.strokeStyle='#e9e2c23f';ctx.lineWidth=1;ctx.strokeRect(20,20,width-40,height-40);
  label(ctx,scene.title,width*.23,cell*1.7,Math.max(25,cell*1.15),isWorld?'#f4ecd2':'#5b654b');
  ctx.save();ctx.translate(width-65,65);polygon(ctx,[[0,-26],[7,0],[0,26],[-7,0]],'#eee8cb','#536d69');polygon(ctx,[[-22,0],[0,-6],[22,0],[0,6]],'#eee8cb99','#536d69');label(ctx,'N',0,-35,15,'#ede8cd');ctx.restore();
  line(ctx,[[width-170,height-38],[width-55,height-38]],'#e9e3ca',2);for(const x of [width-170,width-112.5,width-55])line(ctx,[[x,height-43],[x,height-34]],'#e9e3ca',1);label(ctx,isWorld?'0       25       50 km':'0         50         100 m',width-112,height-23,12,'#e9e3ca');
 }
 ctx.restore();
}

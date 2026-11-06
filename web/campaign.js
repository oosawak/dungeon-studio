import {FORMAT,generateScene,validateScene} from './scene-format.js?v=atlas3';
import {townPlan,entranceForBuilding} from './settlements.js?v=townseed1';
const occupied=(f,x,y)=>f.entities.some(e=>e.x===x&&e.y===y);
export function placeEntrance(scene,target,label,style='gate'){
 const spawn=scene.entities.find(e=>e.kind==='spawn');
 const choices=[];
 for(let y=1;y<scene.height-1;y++)for(let x=1;x<scene.width-1;x++)if(['.','g','f','='].includes(scene.cells[y][x])&&!occupied(scene,x,y))choices.push({x,y,d:Math.abs(x-spawn.x)+Math.abs(y-spawn.y)});
 choices.sort((a,b)=>a.d-b.d);const p=choices[0];if(!p)throw Error('入口を置ける場所がありません。');
 const e={kind:'portal',x:p.x,y:p.y,target,label,style};scene.entities.push(e);return e;
}
const noise=(x,y,seed)=>{const v=Math.sin(x*12.9898+y*78.233+seed*9.19)*43758.5453;return v-Math.floor(v);};
function smoothNoise(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return (1-u)*(1-v)*noise(ix,iy,seed)+u*(1-v)*noise(ix+1,iy,seed)+(1-u)*v*noise(ix,iy+1,seed)+u*v*noise(ix+1,iy+1,seed);}
export function createPlace(kind='town',seed=42){
 if(kind==='dungeon')return generateScene(seed);
 const w=kind==='world'?80:kind==='town'?56:36,h=kind==='world'?52:kind==='town'?40:26,cx=Math.floor(w/2),cy=Math.floor(h/2);
 const grid=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x===0||y===0||x===w-1||y===h-1?'#':'g'));
 let buildings=[],labels=[];
 if(kind==='world'){
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const nx=(x-cx)/(w*.43),ny=(y-cy)/(h*.39),a=Math.atan2(ny,nx),r=Math.hypot(nx,ny),edge=1+.11*Math.sin(a*3+seed*.1)+.12*Math.cos(a*5)-.13*smoothNoise(x/5,y/5,seed);
   const islet=Math.hypot((x-w*.82)/(w*.1),(y-h*.82)/(h*.12))<.9;
   const ridge=Math.abs(x-cx-Math.sin(y*.22+seed*.03)*7);
   grid[y][x]=r>edge&&!islet?'~':ridge<1.7&&y>9&&y<h-12?'^':smoothNoise(x/7,y/5,seed)>.55?'f':'g';
  }
  for(let y=cy-2;y<=cy+2;y++)for(let x=cx-2;x<=cx+3;x++)grid[y][x]='g';
  labels=[{id:'sea',x:15,y:9,text:'蒼白の海',size:25,color:'#edf0d5',rotation:-8},{id:'range',x:42,y:17,text:'灰冠山脈',size:19,rotation:73},{id:'forest',x:21,y:33,text:'緑陰の森',size:24,rotation:-5},{id:'isles',x:66,y:46,text:'灯守りの島々',size:20,color:'#f3ecd1'}];
 }else if(kind==='town'){
  const plan=townPlan(seed);buildings=plan.buildings;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const river=plan.riverAt(y),woodland=plan.mirrored?x>45:x<10;
   grid[y][x]=Math.abs(x-plan.avenue)<1.5||Math.abs(y-plan.crossroad)<1.5?'=':
    Math.abs(x-river)<1.25?'~':woodland&&noise(x,y,seed)>.58?'f':'g';
  }
  for(const b of buildings){const door=entranceForBuilding(b);for(let x=Math.min(door.x,plan.avenue);x<=Math.max(door.x,plan.avenue);x++)grid[door.y][x]='=';}
  labels=[{id:'market',x:plan.avenue+3,y:plan.crossroad+1,text:'市の広場',size:21},
   {id:'river',x:plan.riverAt(26),y:26,text:'ルネ川',size:18,color:'#416c7a',rotation:-88},
   {id:'quarter',x:plan.mirrored?35:20,y:2,text:'職人街',size:20},
   {id:'garden',x:plan.mirrored?14:42,y:30,text:'南の住宅区',size:20}];
 }else{
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)grid[y][x]=(x<5||y<4||x>w-6||y>h-5)?'#':'.';
  for(let y=5;y<12;y++)grid[y][cx]='#';grid[9][cx]='+';
 }
 const names={world:'風渡りの大陸',town:'風見の町',interior:'小さな家'};
 const doc={format:FORMAT,version:1,mapKind:kind,title:names[kind],seed,width:w,height:h,cells:grid.map(row=>row.join('')),entities:[{kind:'spawn',x:cx,y:cy},{kind:'exit',x:cx+3,y:cy+2}],initialKeys:3,buildings,labels};
 return validateScene(doc);
}
function connectRoad(scene,from,to){
 const dist=new Map([[from.y*scene.width+from.x,0]]),prev=new Map(),queue=[{...from,cost:0}],target=to.y*scene.width+to.x;
 while(queue.length){queue.sort((a,b)=>a.cost-b.cost);const p=queue.shift(),key=p.y*scene.width+p.x;if(key===target)break;if(p.cost!==dist.get(key))continue;
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy,c=scene.cells[y]?.[x];if(!c||c==='#'||c==='~')continue;const k=y*scene.width+x,cost=p.cost+(c==='^'?8:c==='f'?2:1);if(cost<(dist.get(k)??Infinity)){dist.set(k,cost);prev.set(k,key);queue.push({x,y,cost});}}
 }
 if(!dist.has(target))return;let key=target;
 while(prev.has(key)){const y=Math.floor(key/scene.width),x=key%scene.width,row=[...scene.cells[y]];row[x]='=';scene.cells[y]=row.join('');key=prev.get(key);}
}
export function connectTownBuildings(project,town){
 for(const [index,b]of (town.buildings||[]).entries()){
  let portal=town.entities.find(e=>e.buildingId===b.id);if(portal)continue;
  const townId=project.linkedMaps.find(e=>e.scene===town)?.id||'town';
  const id=townId==='town'&&index===0?'house':townId==='town'&&index===1?'shop':'room-'+townId+'-'+b.id;
  let target=project.linkedMaps.find(e=>e.id===id);
  if(!target&&project.linkedMaps.length<31){const room=createPlace('interior',(town.seed||42)+index);room.title=b.name;room.entities=room.entities.filter(e=>e.kind!=='exit');placeEntrance(room,'$return','外へ出る','gate');target={id,scene:room};project.linkedMaps.push(target);}
  if(target){const at=entranceForBuilding(b);town.entities=town.entities.filter(e=>e.x!==at.x||e.y!==at.y);town.entities.push({kind:'portal',...at,target:target.id,label:b.name,style:'house',buildingId:b.id});}
 }
}
function portalAt(scene,x,y,target,label,style){
 scene.entities=scene.entities.filter(e=>e.x!==x||e.y!==y);
 const row=[...scene.cells[y]];row[x]='g';scene.cells[y]=row.join('');
 scene.entities.push({kind:'portal',x,y,target,label,style});
}
export function createCampaign(seed=42){
 const world=createPlace('world',seed),town=createPlace('town',seed+1),house=createPlace('interior',seed+2),shop=createPlace('interior',seed+3),a=generateScene(seed+4),b=generateScene(seed+5);
 world.title='風渡りの大陸';house.title='旅人の家';shop.title='道具屋';a.title='北の遺跡';b.title='森の洞窟';
 for(const scene of [world,town,house,shop,a,b])scene.entities=scene.entities.filter(e=>e.kind!=='exit');
 const sites=[[25,28,'town','風見の町','town'],[57,16,'ruins','北の遺跡','dungeon'],[58,36,'cave','森の洞窟','dungeon']];
 for(const [x,y,target,label,style]of sites){portalAt(world,x,y,target,label,style);connectRoad(world,{x:40,y:26},{x,y});}
 for(const scene of [town,house,shop,a,b])placeEntrance(scene,'$return','外へ出る','gate');
 world.linkedMaps=[{id:'town',scene:town},{id:'house',scene:house},{id:'shop',scene:shop},{id:'ruins',scene:a},{id:'cave',scene:b}];
 connectTownBuildings(world,town);
 return validateScene(world);
}
export function pathToPlace(project,target){
 const queue=[['root']],seen=new Set(['root']);
 for(let i=0;i<queue.length;i++){
  const path=queue[i],id=path.at(-1);if(id===target)return path;
  const scene=id==='root'?project:project.linkedMaps.find(e=>e.id===id)?.scene;
  for(const floor of scene?[scene,...scene.lowerFloors]:[])for(const e of floor.entities.filter(e=>e.kind==='portal'&&e.target!=='$return'))if(!seen.has(e.target)){seen.add(e.target);queue.push([...path,e.target]);}
 }
 return ['root',target];
}

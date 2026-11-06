import {FORMAT,generateScene,validateScene} from './scene-format.js';
const occupied=(f,x,y)=>f.entities.some(e=>e.x===x&&e.y===y);
export function placeEntrance(scene,target,label,style='gate'){
 const spawn=scene.entities.find(e=>e.kind==='spawn');
 const choices=[];
 for(let y=1;y<scene.height-1;y++)for(let x=1;x<scene.width-1;x++)if(['.','g','f','='].includes(scene.cells[y][x])&&!occupied(scene,x,y))choices.push({x,y,d:Math.abs(x-spawn.x)+Math.abs(y-spawn.y)});
 choices.sort((a,b)=>a.d-b.d);const p=choices[0];if(!p)throw Error('入口を置ける場所がありません。');
 const e={kind:'portal',x:p.x,y:p.y,target,label,style};scene.entities.push(e);return e;
}
export function createPlace(kind='town',seed=42){
 if(kind==='dungeon')return generateScene(seed);
 const w=kind==='world'?56:36,h=kind==='world'?36:26;
 const grid=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x===0||y===0||x===w-1||y===h-1?'#':'g'));
 const cx=Math.floor(w/2),cy=Math.floor(h/2);
 if(kind==='world'){
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const radius=((x-cx)/(w*.46))**2+((y-cy)/(h*.44))**2;
   grid[y][x]=radius>1?'~':Math.abs(x-cx)<2||Math.abs(y-cy)<2?'=':(x*31+y*17+seed)%13<3?'f':(x*7+y*29+seed)%29===0?'^':'g';
  }
 }else if(kind==='town'){
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(Math.abs(x-cx)<2||Math.abs(y-cy)<2)grid[y][x]='=';
 }else{
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)grid[y][x]=(x<5||y<4||x>w-6||y>h-5)?'#':'.';
  for(let y=5;y<12;y++)grid[y][cx]='#';grid[9][cx]='+';
 }
 const names={world:'緑の大陸',town:'風見の町',interior:'小さな家'};
 const doc={format:FORMAT,version:1,mapKind:kind,title:names[kind],seed,width:w,height:h,cells:grid.map(row=>row.join('')),entities:[{kind:'spawn',x:cx,y:cy},{kind:'exit',x:cx+3,y:cy+2}],initialKeys:3};
 return validateScene(doc);
}
function portalAt(scene,x,y,target,label,style){
 scene.entities=scene.entities.filter(e=>e.x!==x||e.y!==y);
 const row=[...scene.cells[y]];row[x]='g';scene.cells[y]=row.join('');
 scene.entities.push({kind:'portal',x,y,target,label,style});
}
export function createCampaign(seed=42){
 const world=createPlace('world',seed),town=createPlace('town',seed+1),house=createPlace('interior',seed+2),shop=createPlace('interior',seed+3),a=generateScene(seed+4),b=generateScene(seed+5);
 world.title='はじまりの世界';house.title='旅人の家';shop.title='道具屋';a.title='北の遺跡';b.title='森の洞窟';
 for(const scene of [world,town,house,shop,a,b])scene.entities=scene.entities.filter(e=>e.kind!=='exit');
 portalAt(world,world.width/2-4,world.height/2,'town','風見の町','town');
 portalAt(world,world.width/2+5,world.height/2,'ruins','北の遺跡','dungeon');
 portalAt(world,world.width/2,world.height/2+5,'cave','森の洞窟','dungeon');
 portalAt(town,Math.floor(town.width/2)-4,Math.floor(town.height/2),'house','旅人の家','house');
 portalAt(town,Math.floor(town.width/2)+4,Math.floor(town.height/2),'shop','道具屋','house');
 for(const scene of [town,house,shop,a,b])placeEntrance(scene,'$return','外へ出る','gate');
 world.linkedMaps=[{id:'town',scene:town},{id:'house',scene:house},{id:'shop',scene:shop},{id:'ruins',scene:a},{id:'cave',scene:b}];
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

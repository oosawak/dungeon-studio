// Independent settlement geometry and illustration metadata.
// A single seeded plan keeps terrain, streets and building plots in agreement.
export function townPlan(seed=42){
 let state=Number(seed)>>>0;
 const random=n=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)%n;};
 const mirrored=!!random(2),avenue=27+random(3),crossroad=19+random(3);
 const river=6+random(2),phase=random(628)/100,amplitude=1+random(9)/10;
 const buildings=[];let i=0;
 for(const row of [4,12,25,32])for(const col of [12,21,35,45]){
  const kind=i===1?'shop':i===5?'temple':i===10?'inn':'house';
  const w=kind==='temple'?5:3+random(3),h=3+random(2),x=col-1+random(3),y=row-1+random(3);
  buildings.push({id:'building-'+(++i),x:mirrored?56-x-w:x,y,w,h,rotation:0,
   roof:kind==='temple'?'slate':['tile','slate','thatch','flat'][random(4)],kind,
   elevation:3.6+random(6)*1.8,
   name:kind==='shop'?'道具屋':kind==='temple'?'鐘の礼拝堂':kind==='inn'?'旅籠・白梟':i===1?'旅人の家':'民家 '+i});
 }
 return {buildings,avenue:mirrored?55-avenue:avenue,crossroad,
  riverAt:y=>{const x=river+Math.sin(y*.17+phase)*amplitude;return mirrored?55-x:x;},mirrored};
}
export function townBuildings(seed=42){return townPlan(seed).buildings;}
export function entranceForBuilding(b){const rotation=b.rotation||0,rotated=rotation%180===90,w=rotated?b.h:b.w,h=rotated?b.w:b.h;return rotation===90?{x:b.x-1,y:Math.floor(b.y+h/2)}:rotation===180?{x:Math.floor(b.x+w/2),y:b.y-1}:rotation===270?{x:b.x+w,y:Math.floor(b.y+h/2)}:{x:Math.floor(b.x+w/2),y:b.y+h};}
export function buildingContains(b,x,y){const rotated=Math.abs(b.rotation||0)%180===90,w=rotated?b.h:b.w,h=rotated?b.w:b.h;return x>=b.x&&y>=b.y&&x<b.x+w&&y<b.y+h;}
export function canPlaceBuilding(scene,b,ignoreId=null){
 const rotated=Math.abs(b.rotation||0)%180===90,w=rotated?b.h:b.w,h=rotated?b.w:b.h;
 if(b.x<1||b.y<1||b.x+w>=scene.width-1||b.y+h>=scene.height-1)return false;
 for(let y=b.y;y<b.y+h;y++)for(let x=b.x;x<b.x+w;x++){
  if(['#','~','^'].includes(scene.cells[y][x]))return false;
  if(scene.entities.some(e=>e.kind!=='note'&&e.buildingId!==b.id&&e.x===x&&e.y===y))return false;
  if((scene.buildings||[]).some(other=>other.id!==ignoreId&&buildingContains(other,x,y)))return false;
 }
 const entrance=entranceForBuilding(b);
 return entrance.x>0&&entrance.y>0&&entrance.x<scene.width-1&&entrance.y<scene.height-1&&!scene.entities.some(e=>e.buildingId!==b.id&&e.x===entrance.x&&e.y===entrance.y)&&!['#','~','^'].includes(scene.cells[entrance.y]?.[entrance.x])&&!(scene.buildings||[]).some(other=>other.id!==ignoreId&&buildingContains(other,entrance.x,entrance.y));
}

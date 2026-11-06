// Independent settlement geometry and illustration metadata.
export function townBuildings(seed=42){
 const result=[];let i=0;
 for(const y of [4,12,25,32])for(const x of [12,21,35,45]){
  const kind=i===1?'shop':i===5?'temple':i===10?'inn':'house';
  const w=kind==='temple'?5:3+(i+seed)%2,h=kind==='temple'?4:3;
  result.push({id:'building-'+(++i),x,y,w,h,rotation:0,roof:kind==='temple'?'slate':i%4===0?'thatch':i%3===0?'slate':'tile',kind,elevation:3.6+((i+seed)%6)*1.8,name:kind==='shop'?'道具屋':kind==='temple'?'鐘の礼拝堂':kind==='inn'?'旅籠・白梟':i===1?'旅人の家':'民家 '+i});
 }
 return result;
}
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

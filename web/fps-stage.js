import {buildingBounds} from './cartography.js?v=atlas3';
export const STAGE_UNIT=3;
export function compileFpsStage(scene){
 const unit=STAGE_UNIT,point=(x,y)=>[(x+.5-scene.width/2)*unit,(y+.5-scene.height/2)*unit],start=scene.entities.find(e=>e.kind==='spawn');
 if(!start)throw Error('開始地点が必要です。');
 const out={title:scene.title,kind:scene.mapKind,width:scene.width*unit,depth:scene.height*unit,spawn:[...point(start.x,start.y)],buildings:[],floors:[],walls:[],portals:[]};
 for(const [index,e] of scene.entities.entries())if(e.kind==='portal'){const [x,z]=point(e.x,e.y);out.portals.push({id:'portal-'+index,target:e.target,label:e.label,x,z});}
 for(const b of scene.buildings||[]){const box=buildingBounds(b);out.buildings.push({id:b.id,name:b.name,x:(box.x+box.w/2-scene.width/2)*unit,z:(box.y+box.h/2-scene.height/2)*unit,w:box.w*unit,d:box.h*unit,h:b.elevation||6,roof:b.roof});}
 if(!['town','world'].includes(scene.mapKind))for(let y=0;y<scene.height;y++)for(let x=0;x<scene.width;x++){
  const c=scene.cells[y][x],[px,pz]=point(x,y),nearFloor=c==='#'&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const n=scene.cells[y+dy]?.[x+dx];return n&&n!=='#';});
  if(c==='#'){if(nearFloor)out.walls.push({x:px,z:pz,w:unit,d:unit,h:3.6});}
  else if(!['O','~'].includes(c))out.floors.push({x:px,z:pz,w:unit,d:unit});
 }
 return out;
}

import {locationScene,validateConnections} from './scene-format.js';
import {pathToPlace} from './campaign.js';
import {compileFpsStage,STAGE_UNIT} from './fps-stage.js';

// Navigation only. Combat and movement remain owned by the FPS runtime.
export function createFpsJourney(value){
 const project=validateConnections(value);
 let locationId=project.startLocation||(project.linkedMaps.some(e=>e.id==='town')?'town':'root');
 locationScene(project,locationId);
 const history=pathToPlace(project,locationId).slice(0,-1);
 const stages=new Map();
 const current=()=>{
  if(!stages.has(locationId))stages.set(locationId,compileFpsStage(locationScene(project,locationId)));
  return stages.get(locationId);
 };
 function nearby(position){
  if(position[1]<-.5||position[1]>2)return null;
  return current().portals.filter(e=>e.target!=='$return'||history.length)
   .map(e=>({...e,distance:Math.hypot(e.x-position[0],e.z-position[2])}))
   .filter(e=>e.distance<=STAGE_UNIT*1.25).sort((a,b)=>a.distance-b.distance)[0]||null;
 }
 function travel(portal){
  // Accept only an entrance from the current map, never an arbitrary target ID.
  const entrance=current().portals.find(e=>e.id===portal?.id);
  if(!entrance)throw Error('この場所に入口がありません。');
  const returning=entrance.target==='$return';
  if(returning&&!history.length)throw Error('入ってきた場所がありません。');
  const nextId=returning?history.at(-1):entrance.target;
  const next=compileFpsStage(locationScene(project,nextId));
  if(returning)history.pop();else history.push(locationId);
  locationId=nextId;stages.set(locationId,next);
  return next;
 }
 return {current,nearby,travel,get locationId(){return locationId;},get history(){return [...history];}};
}

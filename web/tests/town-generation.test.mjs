import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlace,createCampaign} from '../campaign.js';
import {entranceForBuilding} from '../settlements.js';
import {reachableCells,toRuntime,readScene,writeScene,validateConnections} from '../scene-format.js';

test('town seeds reproduce layouts and change buildings, rivers and roads',()=>{
 const signatures=new Set();
 for(const seed of [1,2,3,42,43,99,314,1000,4294967295]){
  const town=createPlace('town',seed);assert.deepEqual(town,createPlace('town',seed));
  signatures.add(JSON.stringify({cells:town.cells,buildings:town.buildings}));
  assert.deepEqual(readScene(writeScene(town)),town);
 }
 assert.equal(signatures.size,9);
 const a=createPlace('town',42),b=createPlace('town',43);
 assert.notDeepEqual(a.buildings.map(e=>[e.x,e.y]),b.buildings.map(e=>[e.x,e.y]));
 for(const type of ['~','='])assert.notDeepEqual(a.cells.map(r=>[...r].map(c=>c===type)),b.cells.map(r=>[...r].map(c=>c===type)));
});
test('generated towns keep every building entrance reachable across seeds',()=>{
 for(const seed of [...Array(200).keys(),0xffffffff,0x80000000]){
  const town=createPlace('town',seed),reachable=reachableCells(town);toRuntime(town);
  for(const b of town.buildings){const p=entranceForBuilding(b);assert.ok(reachable.has(p.y*town.width+p.x),'seed '+seed+' '+b.id);}
 }
});
test('randomizable campaigns keep valid town/room connections and runtime geometry',()=>{
 for(const seed of [11,42,52,99,314,4294967295]){
  const project=validateConnections(createCampaign(seed));assert.equal(project.linkedMaps.length,19);
  assert.deepEqual(readScene(writeScene(project)),project);toRuntime(project);
  for(const entry of project.linkedMaps)toRuntime(entry.scene);
 }
});

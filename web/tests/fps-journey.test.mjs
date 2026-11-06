import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,createPlace} from '../campaign.js';
import {createFpsJourney} from '../fps-journey.js';
import {compileFpsStage} from '../fps-stage.js';

test('FPS entrances use the same coordinate system as buildings and spawn',()=>{
 const project=createCampaign(42),town=project.linkedMaps.find(e=>e.id==='town').scene,stage=compileFpsStage(town);
 const entry=town.entities.find(e=>e.target==='house'),portal=stage.portals.find(e=>e.target==='house');
 assert.equal(portal.x,(entry.x+.5-town.width/2)*3);assert.equal(portal.z,(entry.y+.5-town.height/2)*3);
 assert.equal(portal.label,'旅人の家');
});
test('FPS journey supports nested entry and return without mutating the project',()=>{
 const project=createCampaign(42),before=structuredClone(project),journey=createFpsJourney(project);
 assert.equal(journey.locationId,'town');assert.deepEqual(journey.history,['root']);
 const home=journey.current().portals.find(e=>e.target==='house');
 assert.equal(journey.nearby([home.x,0,home.z]).target,'house');
 assert.equal(journey.nearby([home.x,4,home.z]),null);
 assert.equal(journey.nearby([1000,0,1000]),null);
 journey.travel(home);assert.equal(journey.locationId,'house');assert.deepEqual(journey.history,['root','town']);
 journey.travel(journey.current().portals.find(e=>e.target==='$return'));assert.equal(journey.locationId,'town');
 journey.travel(journey.current().portals.find(e=>e.target==='$return'));assert.equal(journey.locationId,'root');
 assert.deepEqual(journey.history,[]);assert.deepEqual(project,before);
 const old=journey.locationId;assert.throws(()=>journey.travel({id:'missing',target:'house'}));assert.equal(journey.locationId,old);
});
test('standalone FPS scenes start at root and cannot return without a source',()=>{
 const scene=createPlace('interior');scene.entities=scene.entities.filter(e=>e.kind!=='exit');
 scene.entities.push({kind:'portal',x:17,y:13,target:'$return',label:'外へ戻る'});
 const journey=createFpsJourney(scene),portal=journey.current().portals[0];
 assert.equal(journey.locationId,'root');assert.equal(journey.nearby([portal.x,0,portal.z]),null);
 assert.throws(()=>journey.travel(portal),/入ってきた場所/);assert.deepEqual(journey.history,[]);
});

import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createCampaign} from '../web/campaign.js';
const base=(process.env.DUNGEON_STUDIO_URL||'http://127.0.0.1:8769/').replace(/\/$/,'');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'dungeon-studio-fps-travel-'));console.log('QA artifacts:',output);
const makeMap=(kind,title)=>({format:'dungeon-studio-scene',version:1,mapKind:kind,title,width:16,height:16,cells:Array.from({length:16},(_,y)=>Array.from({length:16},(_,x)=>!x||!y||x===15||y===15?'#':kind==='town'?'g':'.').join('')),entities:[{kind:'spawn',x:8,y:10}],buildings:[],labels:[],lowerFloors:[],linkedMaps:[],initialKeys:3});
const town=makeMap('town','往復の町'),room=makeMap('interior','歩ける家');
town.buildings.push({id:'house',x:7,y:4,w:3,h:3,rotation:0,roof:'tile',kind:'house',name:'歩ける家',elevation:6});
town.entities.push({kind:'portal',x:8,y:7,target:'room',label:'歩ける家',buildingId:'house'});
room.entities.push({kind:'portal',x:8,y:11,target:'$return',label:'町へ戻る'});
town.linkedMaps.push({id:'room',scene:room});
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 const state=()=>page.evaluate(()=>fpsStudio.getState());
 const shot=name=>page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
 await page.goto(base+'/fps.html#scene='+encodeURIComponent(JSON.stringify(town)));await page.waitForFunction(()=>window.fpsStudio);
 assert.equal((await state()).locationId,'root');
 await page.locator('#play').click();await page.waitForFunction(()=>fpsStudio.getState().locked);
 await page.keyboard.press('f');assert.equal((await state()).locationId,'root','distant entrances cannot be used');
 await page.keyboard.down('w');await page.waitForFunction(()=>fpsStudio.getState().nearby?.target==='room');await page.keyboard.up('w');await page.waitForTimeout(400);
 await page.waitForFunction(()=>fpsStudio.getState().wave===1);
 await page.mouse.move(760,475);await page.mouse.down();await page.waitForTimeout(120);await page.mouse.up();
 await page.keyboard.press('v');const outside=await state();assert.ok(outside.ammo<30);assert.ok(outside.marks>0);
 await shot('town-entrance');
 await page.keyboard.press('f');await page.waitForFunction(()=>fpsStudio.getState().locationId==='room');
 let inside=await state();assert.equal(inside.kind,'interior');assert.equal(inside.ammo,outside.ammo);assert.equal(inside.hp,outside.hp);assert.equal(inside.mode,'tps');assert.equal(inside.locked,true);
 assert.equal(inside.marks,0);assert.equal(inside.enemies,0);
 // Release all previous movement on travel, then walk inside with real keyboard input.
 const entry=inside.position;await page.waitForTimeout(150);assert.deepEqual((await state()).position,entry);
 await page.keyboard.down('w');await page.waitForTimeout(300);await page.keyboard.up('w');await page.waitForTimeout(400);
 inside=await state();assert.ok(Math.hypot(inside.position[0]-entry[0],inside.position[2]-entry[2])>.5);await shot('interior-tps');
 await page.keyboard.press('v');assert.equal((await state()).mode,'fps');await shot('interior-fps');
 await page.keyboard.down('s');await page.waitForFunction(()=>fpsStudio.getState().nearby?.target==='$return');await page.keyboard.up('s');await page.waitForTimeout(250);
 const roomBeforeReturn=await state();await page.keyboard.press('f');await page.waitForFunction(()=>fpsStudio.getState().locationId==='root');
 const returned=await state();
 assert.ok(Math.hypot(...returned.position.map((v,i)=>v-outside.position[i]))<.02);assert.equal(returned.yaw,outside.yaw);assert.equal(returned.pitch,outside.pitch);
 assert.equal(returned.wave,outside.wave);assert.equal(returned.enemies,outside.enemies);assert.equal(returned.marks,outside.marks);
 assert.equal(returned.ammo,outside.ammo);assert.equal(returned.hp,outside.hp);await shot('town-returned');
 // Re-entering restores the interior visit and does not accumulate duplicate stage meshes.
 const solids=returned.solids;await page.keyboard.press('f');await page.waitForFunction(()=>fpsStudio.getState().locationId==='room');
 assert.ok(Math.hypot(...(await state()).position.map((v,i)=>v-roomBeforeReturn.position[i]))<.05);
 await page.keyboard.press('f');await page.waitForFunction(()=>fpsStudio.getState().locationId==='root');assert.equal((await state()).solids,solids);
 await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!fpsStudio.getState().locked);
 await page.keyboard.press('f');assert.equal((await state()).locationId,'root','paused F must not travel');
 // Returning to the editor must select the room currently being played.
 await page.locator('#play').click();await page.waitForFunction(()=>fpsStudio.getState().locked);
 await page.keyboard.press('f');await page.waitForFunction(()=>fpsStudio.getState().locationId==='room');
 await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!fpsStudio.getState().locked);
 await page.locator('#back-editor').click();await page.waitForFunction(()=>window.dungeonStudio);
 assert.equal(await page.evaluate(()=>dungeonStudio.getCurrentScene().title),'歩ける家');
 // Exercise the shipped 16-building town as well as the compact fixture.
 await page.goto(base+'/fps.html');await page.waitForFunction(()=>window.fpsStudio);
 await page.locator('#play').click();await page.waitForFunction(()=>fpsStudio.getState().locked);
 assert.equal((await state()).locationId,'town');assert.equal((await state()).buildings,16);
 const sampleTown=createCampaign(42).linkedMaps.find(e=>e.id==='town').scene,home=sampleTown.entities.find(e=>e.target==='house');
 // Cross below every building in the first row, then approach this entrance.
 const streetY=Math.max(...sampleTown.buildings.slice(0,4).map(b=>b.y+b.h))+1;
 const approachZ=(streetY+.5-sampleTown.height/2)*3;
 await page.keyboard.down('w');await page.waitForFunction(z=>fpsStudio.getState().position[2]<=z,approachZ);await page.keyboard.up('w');await page.waitForTimeout(400);
 const sideways=home.x>sampleTown.width/2?'d':'a';
 const targetX=(home.x+.5-sampleTown.width/2)*3;
 await page.keyboard.down(sideways);await page.waitForFunction(({targetX,right})=>right?fpsStudio.getState().position[0]>=targetX:fpsStudio.getState().position[0]<=targetX,{targetX,right:sideways==='d'});await page.keyboard.up(sideways);await page.waitForTimeout(400);
 await page.keyboard.down('w');await page.waitForFunction(()=>fpsStudio.getState().nearby?.target==='house');await page.keyboard.up('w');await page.waitForTimeout(400);
 await shot('sample-house-entrance');
 const sampleOutside=await state();await page.keyboard.press('f');await page.waitForFunction(()=>fpsStudio.getState().locationId==='house');
 await shot('sample-house-interior');assert.equal((await state()).kind,'interior');
 await page.keyboard.press('f');await page.waitForFunction(()=>fpsStudio.getState().locationId==='town');
 assert.ok(Math.hypot(...(await state()).position.map((v,i)=>v-sampleOutside.position[i]))<.02);
 await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!fpsStudio.getState().locked);
 assert.deepEqual(errors,[]);console.log('PASS: real keyboard entry/interior movement/return/re-entry, distance gating, position/view and FPS combat-state retention, pause, no duplicate geometry');
}finally{await browser.close();}

import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const output=fs.mkdtempSync(path.join(os.tmpdir(),'dungeon-studio-campaign-qa-'));console.log('QA artifacts:',output);
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 const base=(process.env.DUNGEON_STUDIO_URL||'http://127.0.0.1:8769/').replace(/\/$/,'');
 await page.goto(base+'/world.html');await page.waitForFunction(()=>window.dungeonStudio);await page.evaluate(()=>document.fonts.ready);
 const project=await page.evaluate(()=>dungeonStudio.getScene());assert.equal(project.linkedMaps.length,19);
 await page.screenshot({path:path.join(output,'world-editor.png'),fullPage:true});
 await page.locator('#play').click();await page.waitForFunction(()=>window.studioImportScene&&window.wasm&&wasm.map_width_roguelike()===80);
 const position=()=>page.evaluate(()=>[wasm.player_x_roguelike(),wasm.player_y_roguelike()]);
 // Find a walkable route to each entrance in the actual runtime, avoiding buildings.
 const walkToPortal=async(scene,target)=>{
  const portal=scene.entities.find(e=>e.kind==='portal'&&e.target===target);assert.ok(portal);
  const route=await page.evaluate(({x,y})=>{
   const w=wasm.map_width_roguelike(),h=wasm.map_height_roguelike(),tiles=wasm.map_data_roguelike();
   const start=[wasm.player_x_roguelike(),wasm.player_y_roguelike()],queue=[[...start,[]]],seen=new Set([start.join(',')]);
   for(let i=0;i<queue.length;i++){
    const [cx,cy,steps]=queue[i];if(Math.abs(cx-x)+Math.abs(cy-y)<=1)return steps;
    for(const [dx,dy,dir]of [[0,-1,0],[-1,0,1],[1,0,2],[0,1,3]]){
     const nx=cx+dx,ny=cy+dy,key=nx+','+ny;if(nx<0||ny<0||nx>=w||ny>=h||seen.has(key)||[1,5,12,13,16].includes(tiles[ny*w+nx]))continue;
     seen.add(key);queue.push([nx,ny,[...steps,dir]]);
    }
   }return null;
  },portal);
  assert.ok(route,'entrance is reachable: '+target);
  await page.evaluate(steps=>{for(const dir of steps)wasm.move_roguelike(dir);},route);
  const reached=await position();assert.ok(Math.abs(reached[0]-portal.x)+Math.abs(reached[1]-portal.y)<=1,JSON.stringify({target,route,reached,portal}));
  await page.waitForFunction(()=>!document.getElementById('studio-enter').hidden);
  return position();
 };
 const worldPosition=await walkToPortal(project,'town');await page.keyboard.press('KeyE');await page.waitForFunction(()=>wasm.map_width_roguelike()===56);
 const town=project.linkedMaps.find(e=>e.id==='town').scene;
 const townPosition=await walkToPortal(town,'house');await page.keyboard.press('KeyE');await page.waitForFunction(()=>wasm.map_width_roguelike()===36);
 assert.ok((await page.locator('#studio-status').textContent()).includes('旅人'));
 await page.screenshot({path:path.join(output,'interior.png'),fullPage:true});
 await page.locator('#studio-return').click();await page.waitForFunction(()=>wasm.map_width_roguelike()===56);assert.deepEqual(await position(),townPosition);
 assert.equal(await page.evaluate(()=>wasm.studio_keys()),3);
 // Buildings occupy walls in both visual modes; changing views retains progress.
 const building=town.buildings[0];assert.equal(await page.evaluate(({x,y})=>wasm.map_data_roguelike()[y*56+x],building),1);
 await page.locator('#view-toggle').click();assert.deepEqual(await position(),townPosition);await page.screenshot({path:path.join(output,'town-game.png'),fullPage:true});
 await page.locator('#studio-return').click();await page.waitForFunction(()=>wasm.map_width_roguelike()===80);assert.deepEqual(await position(),worldPosition);
 await page.screenshot({path:path.join(output,'world-game.png'),fullPage:true});
 for(const target of ['ruins','cave']){
  const at=await walkToPortal(project,target);await page.keyboard.press('KeyE');await page.waitForFunction(()=>wasm.map_width_roguelike()===48);
  await page.waitForFunction(title=>document.querySelector('#studio-status').textContent.includes(title),project.linkedMaps.find(e=>e.id===target).scene.title);
  await page.locator('#studio-return').click();await page.waitForFunction(()=>wasm.map_width_roguelike()===80);assert.deepEqual(await position(),at);
 }
 assert.deepEqual(errors,[]);console.log('PASS: world/town/house portals, return positions, building walls, 2D/3D, two independent dungeons');
}finally{await browser.close();}

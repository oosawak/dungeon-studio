import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';const output=fs.mkdtempSync(path.join(os.tmpdir(),'dungeon-studio-campaign-qa-'));console.log('QA artifacts:',output);
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
const base=(process.env.DUNGEON_STUDIO_URL||'http://127.0.0.1:8769/').replace(/\/$/,'');
await page.goto(base+'/world.html');await page.waitForFunction(()=>window.dungeonStudio);
assert.equal((await page.evaluate(()=>dungeonStudio.getScene())).linkedMaps.length,5);
await page.screenshot({path:path.join(output,'world-editor.png'),fullPage:true});
await page.locator('#play').click();await page.waitForFunction(()=>window.studioImportScene&&wasm.map_width_roguelike()===56);
await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');
await page.waitForFunction(()=>!document.getElementById('studio-enter').hidden);
assert.ok((await page.locator('#studio-enter').textContent()).includes('町'));
await page.keyboard.press('KeyE');await page.waitForFunction(()=>wasm.map_width_roguelike()===36);
assert.equal(await page.evaluate(()=>wasm.studio_keys()),3);
// The town was entered through an actual world portal. Walk to a house entrance.
await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');
await page.waitForFunction(()=>document.getElementById('studio-enter').textContent.includes('旅人'));
await page.keyboard.press('KeyE');await page.waitForTimeout(120);
assert.ok((await page.locator('#studio-status').textContent()).includes('旅人'));
await page.screenshot({path:path.join(output,'interior.png'),fullPage:true});
// Return from the room, then the town, restoring the exact prior player position.
await page.locator('#studio-return').click();await page.waitForTimeout(100);
assert.ok((await page.locator('#studio-status').textContent()).includes('風見'));
assert.equal(await page.evaluate(()=>wasm.player_x_roguelike()),15);
await page.locator('#studio-return').click();await page.waitForTimeout(100);
assert.equal(await page.evaluate(()=>wasm.map_width_roguelike()),56);
assert.equal(await page.evaluate(()=>wasm.player_x_roguelike()),25);
await page.screenshot({path:path.join(output,'world-game.png'),fullPage:true});
// Enter two independent dungeons and retain progress on returning.
await page.evaluate(()=>studioTravelTo('ruins'));await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>wasm.map_width_roguelike()),48);
await page.evaluate(()=>studioTravelTo('$return'));await page.evaluate(()=>studioTravelTo('cave'));await page.waitForTimeout(100);assert.ok((await page.locator('#studio-status').textContent()).includes('洞窟'));
await page.goto(base+'/town.html');await page.waitForFunction(()=>window.dungeonStudio);
assert.equal(await page.locator('#location').inputValue(),'town');
await page.locator('#add-house').click();assert.equal((await page.evaluate(()=>dungeonStudio.getScene())).linkedMaps.length,6);
await page.screenshot({path:path.join(output,'town-editor.png'),fullPage:true});
await browser.close();console.log({passed:['world editor','world portal to town','town portal to home','return home/town/world with position preservation','two separate dungeons','Town Studio creates connected rooms'],errors});assert.equal(errors.length,0);

import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const base=(process.env.DUNGEON_STUDIO_URL||'http://127.0.0.1:8769/').replace(/\/$/,'');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'dungeon-studio-generation-'));console.log('QA artifacts:',output);
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const current=()=>page.evaluate(()=>dungeonStudio.getCurrentScene());
 for(const kind of ['town','world','index']){
  await page.goto(base+'/'+kind+'.html');await page.waitForFunction(()=>window.dungeonStudio);await page.evaluate(()=>document.fonts.ready);
  await page.locator('.generation').evaluate(e=>e.open=true);
  const original=await current();assert.equal(Number(await page.locator('#seed').inputValue()),original.seed);
  await page.locator('#seed-random').click();const random=await current();
  assert.notEqual(random.seed,original.seed);assert.equal(random.seed,Number(await page.locator('#seed').inputValue()));
  assert.notDeepEqual(random.cells,original.cells);
  if(kind==='town'){assert.notDeepEqual(random.buildings,original.buildings);assert.ok(random.entities.some(e=>e.target==='$return'));}
  await page.locator('#undo').click();assert.deepEqual(await current(),original);assert.equal(Number(await page.locator('#seed').inputValue()),original.seed);
  await page.locator('#redo').click();assert.deepEqual(await current(),random);
  // An explicitly repeated seed recreates exactly the same current map.
  await page.locator('#generate').click();assert.deepEqual(await current(),random);
  if(kind==='town'){
   for(const seed of [42,99]){
    await page.locator('#seed').fill(String(seed));await page.locator('#generate').click();assert.equal((await current()).seed,seed);
    await page.screenshot({path:path.join(output,'town-seed-'+seed+'.png'),fullPage:true});
   }
   const save=page.waitForEvent('download');await page.locator('#save').click();await(await save).saveAs(path.join(output,'random-town.md'));
   assert.ok(fs.readFileSync(path.join(output,'random-town.md'),'utf8').includes('dungeon-scene'));
   await page.setViewportSize({width:390,height:844});await page.locator('#seed-random').click();
   assert.ok(await page.locator('#seed-random').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(output,'random-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:960});
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS: random generation in all 3 editors, visible seed, deterministic regeneration, undo/redo, town return link, Markdown, mobile generation controls');
}finally{await browser.close();}

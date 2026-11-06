import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateScene,readScene,writeScene,replaceSceneBlock,toRuntime} from '../scene-format.js';
test('generated scenes are deterministic, connected and valid',()=>{
 for(let seed=0;seed<150;seed++){
  const a=generateScene(seed);
  assert.deepEqual(a,generateScene(seed));
  assert.equal(toRuntime(a).tiles.length,a.width*a.height);
 }
 for(const size of [[12,12],[160,120]])toRuntime(generateScene(5,...size));
});
test('Markdown retains all scene data, unicode, backticks and surrounding prose',()=>{
 const a=generateScene(42);a.entities.find(e=>e.kind==='note').text='```\n</script>\n物語の続き';
 const md=writeScene(a)+'\n追記したシナリオ\n';
 assert.deepEqual(readScene(md),a);
 assert.deepEqual(readScene(md.replaceAll('\n','\r\n')),a);
 a.title='改題';const resaved=replaceSceneBlock(md,a);
 assert.ok(resaved.endsWith('追記したシナリオ\n'));
 assert.deepEqual(readScene(resaved),a);
 assert.throws(()=>readScene(md+md));
 assert.throws(()=>readScene('# データなし'));
});
test('invalid geometry, entities and disconnected exits are rejected',()=>{
 const a=generateScene(42);a.cells[0]='.'.repeat(a.width);assert.throws(()=>toRuntime(a));
 const b=generateScene(42);b.entities.push({...b.entities[0]});assert.throws(()=>toRuntime(b));
 const c=generateScene(42),exit=c.entities.find(e=>e.kind==='exit');
 for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const row=[...c.cells[exit.y+dy]];row[exit.x+dx]='#';c.cells[exit.y+dy]=row.join('');}
 c.entities=c.entities.filter(e=>e.kind==='spawn'||e.kind==='exit');assert.throws(()=>toRuntime(c),/到達/);
});

test('world/town/interior graph survives Markdown and has valid destinations',async()=>{
 const {createCampaign,createPlace,placeEntrance,pathToPlace}=await import('../campaign.js');
 const {validateConnections,locationScene}=await import('../scene-format.js');
 const world=validateConnections(createCampaign(42));
 assert.equal(world.mapKind,'world');assert.equal(world.linkedMaps.length,19);
 assert.deepEqual(readScene(writeScene(world)),world);
 for(const entry of world.linkedMaps)assert.ok(toRuntime(entry.scene).tiles.length>0);
 assert.deepEqual(pathToPlace(world,'house'),['root','town','house']);
 assert.equal(locationScene(world,'town').mapKind,'town');
 const town=createPlace('town');town.entities=town.entities.filter(e=>e.kind!=='exit');placeEntrance(town,'missing','未接続');assert.throws(()=>validateConnections(town),/移動先/);
});

test('older compatible scene documents migrate to the independent format',()=>{
 const d=generateScene(7);d.format='prototype-scene';
 const text='# 保存済みの冒険\n\n```prototype-scene\n'+JSON.stringify(d)+'\n```\n\n追記した説明\n';
 const next=readScene(text);assert.equal(next.format,'dungeon-studio-scene');
 const saved=replaceSceneBlock(text,next);assert.ok(saved.includes('```dungeon-scene'));assert.ok(saved.endsWith('追記した説明\n'));assert.deepEqual(readScene(saved),next);
});

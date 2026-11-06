import {generateScene,readScene,writeScene,replaceSceneBlock,toRuntime,reachableCells,getFloor,locationScene,validateConnections} from './scene-format.js?v=atlas3';
import {createCampaign,createPlace,placeEntrance,connectTownBuildings} from './campaign.js?v=townseed1';
import {renderAtlas,buildingBounds} from './cartography.js?v=atlas3';
import {buildingContains,canPlaceBuilding,entranceForBuilding} from './settlements.js?v=atlas3';
const $=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d'),CELL=24,pageKind=document.body.dataset.studio||'dungeon';
let doc=pageKind==='dungeon'?generateScene(42):createCampaign(42),source=null;
try{if(location.hash.startsWith('#scene='))doc=readScene(decodeURIComponent(location.hash.slice(7)));}catch(error){console.warn(error);}
let locationId=doc.startLocation==='root'||doc.linkedMaps.some(e=>e.id===doc.startLocation)?doc.startLocation:pageKind==='town'?(doc.linkedMaps.find(e=>e.scene.mapKind==='town')?.id||'root'):'root',floorIndex=0,tool=pageKind==='dungeon'?'floor':'select',selection=null,history=[],future=[],gesture=null,zoom=0,space=false;
const place=()=>locationScene(doc,locationId),floor=()=>getFloor(place(),floorIndex),isAtlas=()=>['world','town'].includes(place().mapKind);
const tools=[['select','↖ 選択・移動'],['pan','✥ 画面移動'],['grass','陸地・草地'],['forest','森・樹木'],['water','海・川'],['mountain','山脈'],['road','道を描く'],['building','建物を囲む'],['label','地名・ラベル'],['portal','町・入口'],['floor','床'],['wall','壁'],['door','鍵付き扉'],['pit','落とし穴'],['stairsDown','下り階段'],['stairsUp','上り階段'],['key','鍵'],['spawn','開始地点'],['exit','出口'],['enemy','敵'],['note','メモ'],['erase','消す']];
const terrain={floor:'.',wall:'#',door:'+',pit:'O',stairsDown:'>',stairsUp:'<',grass:'g',forest:'f',water:'~',mountain:'^',road:'='};
const uid=prefix=>prefix+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
for(const [id,text]of tools){const b=document.createElement('button');b.dataset.tool=id;b.textContent=text;b.onclick=()=>{tool=id;if(id==='portal')$('portal-settings').open=true;draw();};$('tools').append(b);}
function status(text){$('status').textContent=text;}
function syncSeed(){$('seed').value=place().seed??42;}
function checkpoint(){history.push(JSON.stringify({doc,source,locationId,floorIndex}));if(history.length>60)history.shift();future=[];}
function currentSelection(){if(!selection)return null;return selection.type==='building'?floor().buildings.find(e=>e.id===selection.id):selection.type==='label'?floor().labels.find(e=>e.id===selection.id):floor().entities.find(e=>(selection.id&&e.id===selection.id)||(e.x===selection.x&&e.y===selection.y));}
function selectedPortal(){const item=currentSelection();return selection?.type==='building'?floor().entities.find(e=>e.buildingId===item?.id):selection?.type==='portal'?item:null;}
function fillSelect(id,items,value){const select=$(id);select.replaceChildren();for(const [key,title]of items){const o=document.createElement('option');o.value=key;o.textContent=title;select.append(o);}select.value=value;}
function updateInspector(){
 const item=currentSelection(),b=selection?.type==='building'?item:null,l=selection?.type==='label'?item:null,p=selectedPortal();
 $('building-properties').hidden=!b;$('label-properties').hidden=!l;$('selection-empty').hidden=!!item;$('delete-selection').hidden=!item;
 $('selection-heading').textContent=b?'建物の詳細':l?'地名の詳細':p?'入口の詳細':'地図の詳細';
 if(b){$('building-name').value=b.name;$('building-width').value=b.w;$('building-height').value=b.h;$('building-roof').value=b.roof;$('building-kind').value=b.kind;if($('building-elevation'))$('building-elevation').value=b.elevation||6;}
 if(l){$('label-text').value=l.text;$('label-size').value=l.size||22;$('label-rotation').value=l.rotation||0;}
 const locations=[['root',doc.title],...doc.linkedMaps.map(e=>[e.id,e.scene.title])];
 fillSelect('location',locations,locationId);fillSelect('portal-target',[...locations,['$return','入ってきた場所へ戻る']],p?.target||doc.linkedMaps.find(e=>e.id!==locationId)?.id||'$return');
 if(p)$('portal-name').value=p.label;
 fillSelect('floor',Array.from({length:place().lowerFloors.length+1},(_,i)=>[String(i),i===0?'1F':'B'+i+'F']),String(floorIndex));
 $('title').value=place().title;$('initial-keys').value=doc.initialKeys;
}
function updateTools(){
 const kind=place().mapKind,relevant=kind==='world'?['select','pan','grass','forest','water','mountain','road','label','portal','spawn','note','erase']:kind==='town'?['select','pan','grass','forest','water','road','building','label','portal','wall','spawn','note','erase']:['select','pan','floor','wall','portal','door','pit','stairsDown','stairsUp','key','spawn','exit','enemy','note','erase'];
 if(!relevant.includes(tool))tool=relevant[0];
 for(const b of $('tools').children){b.hidden=!relevant.includes(b.dataset.tool);b.setAttribute('aria-pressed',b.dataset.tool===tool?'true':'false');}
 $('brush').disabled=!(tool in terrain);$('brush-value').textContent=$('brush').value;
 $('tool-heading').textContent=kind==='world'?'世界を描く':kind==='town'?'町をつくる':'迷宮を描く';
 $('generation-title').textContent=({world:'世界の地形を生成',town:'町を生成',interior:'部屋を生成',dungeon:'迷宮を生成'})[kind];
 $('generate').textContent='選択中のマップを生成';$('legend').textContent=isAtlas()?'建物・地名を選択して移動。ホイールで拡大 / Spaceで画面移動。':'床・壁・扉・階段・鍵を配置して、2D / 3Dで試遊できます。';
 canvas.style.cursor=tool==='pan'||space?'grab':tool==='select'?'default':'crosshair';
}
function drawDungeon(){
 const f=floor();for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){const c=f.cells[y][x];ctx.fillStyle=({'#':'#24383c','+':'#a17b50','O':'#060f13','>':'#9a9166','<':'#6c9b91'})[c]||'#bac8b9';ctx.fillRect(x*CELL,y*CELL,CELL,CELL);if($('show-grid').checked){ctx.strokeStyle='#879b8f66';ctx.strokeRect(x*CELL+.5,y*CELL+.5,CELL,CELL);}}
 ctx.font='16px DenkiChip';ctx.textAlign='center';ctx.textBaseline='middle';for(const e of f.entities){ctx.fillStyle=({spawn:'#24675d',exit:'#3a5b92',enemy:'#9a4139',note:'#7d663c',key:'#977717',portal:'#7d553d'})[e.kind];ctx.fillText(({spawn:'●',exit:'◆',enemy:'▲',note:'▤',key:'K',portal:'⌂'})[e.kind],(e.x+.5)*CELL,(e.y+.5)*CELL);}
}
function draw(){
 if(locationId!=='root'&&!doc.linkedMaps.some(e=>e.id===locationId))locationId='root';floorIndex=Math.min(floorIndex,place().lowerFloors.length);
 canvas.width=floor().width*CELL;canvas.height=floor().height*CELL;
 if(isAtlas())renderAtlas(ctx,floor(),{cell:CELL,grid:$('show-grid').checked,selectedBuilding:selection?.type==='building'?selection.id:null});else drawDungeon();
 if(gesture?.type==='building'){const a=gesture.start,b=gesture.latest;ctx.setLineDash([6,4]);ctx.strokeStyle='#fff4bf';ctx.lineWidth=2;ctx.strokeRect(Math.min(a.x,b.x)*CELL,Math.min(a.y,b.y)*CELL,(Math.abs(a.x-b.x)+1)*CELL,(Math.abs(a.y-b.y)+1)*CELL);ctx.setLineDash([]);}
 updateTools();updateInspector();$('size').textContent=floor().width+' × '+floor().height;$('undo').disabled=!history.length;$('redo').disabled=!future.length;applyZoom();
}
function applyZoom(){canvas.style.width=zoom?canvas.width*zoom+'px':'';canvas.style.maxWidth=zoom?'none':'100%';canvas.style.maxHeight=zoom?'none':'100%';$('zoom-value').textContent=zoom?Math.round(zoom*100)+'%':'Fit';}
function changeZoom(factor){if(!zoom)zoom=canvas.getBoundingClientRect().width/canvas.width;zoom=Math.max(.2,Math.min(2.5,zoom*factor));applyZoom();}
function point(event){const r=canvas.getBoundingClientRect();return{x:(event.clientX-r.left)/r.width*floor().width,y:(event.clientY-r.top)/r.height*floor().height};}
function hitAt(p){
 const f=floor(),label=[...f.labels].reverse().find(e=>Math.abs(e.x-p.x)<Math.max(1,e.text.length*(e.size||22)/CELL*.3)&&Math.abs(e.y-p.y)<1);
 if(label)return{type:'label',id:label.id};
 const building=[...f.buildings].reverse().find(e=>buildingContains(e,p.x,p.y));if(building)return{type:'building',id:building.id};
 const e=f.entities.find(e=>Math.abs(e.x+.5-p.x)<.8&&Math.abs(e.y+.5-p.y)<.8);if(!e)return null;
 if(e.buildingId)return{type:'building',id:e.buildingId};return{type:e.kind==='portal'?'portal':'entity',id:e.id,x:e.x,y:e.y};
}
function removeSelected(){const item=currentSelection();if(!item)return;
 if(selection.type==='building'){floor().buildings=floor().buildings.filter(e=>e.id!==item.id);floor().entities=floor().entities.filter(e=>e.buildingId!==item.id);}else if(selection.type==='label')floor().labels=floor().labels.filter(e=>e.id!==item.id);else floor().entities=floor().entities.filter(e=>e!==item);
 selection=null;
}
function changeBuilding(patch,record=true){const b=currentSelection();if(selection?.type!=='building'||!b)return false;const candidate={...b,...patch};if(!canPlaceBuilding(floor(),candidate,b.id)){status('建物が重なるか、入口が通れない場所に来ます。');return false;}if(record)checkpoint();Object.assign(b,candidate);const entry=selectedPortal();if(entry){Object.assign(entry,entranceForBuilding(b));entry.label=b.name;const linked=doc.linkedMaps.find(e=>e.id===entry.target);if(linked)linked.scene.title=b.name;}return true;}
function addBuilding(a,b){
 const rect={id:uid('building'),x:Math.floor(Math.min(a.x,b.x)),y:Math.floor(Math.min(a.y,b.y)),w:Math.max(2,Math.min(12,Math.floor(Math.abs(a.x-b.x))+1)),h:Math.max(2,Math.min(12,Math.floor(Math.abs(a.y-b.y))+1)),rotation:0,roof:'tile',kind:'house',name:'新しい家',elevation:6};
 if(!canPlaceBuilding(floor(),rect)){status('建物が重なるか、地図の外に出ています。');return;}
 if(doc.linkedMaps.length>=31){status('接続先は31件までです。');return;}
 const room=createPlace('interior',Number($('seed').value));room.title=rect.name;room.entities=room.entities.filter(e=>e.kind!=='exit');placeEntrance(room,'$return','町へ戻る','gate');const id=uid('room');doc.linkedMaps.push({id,scene:room});floor().buildings.push(rect);floor().entities.push({kind:'portal',...entranceForBuilding(rect),target:id,label:rect.name,style:'house',buildingId:rect.id});selection={type:'building',id:rect.id};status('建物と、入れる部屋を作りました。右側で大きさや屋根を変更できます。');
}
function paint(p){
 const x=Math.floor(p.x),y=Math.floor(p.y),f=floor();if(x<1||y<1||x>=f.width-1||y>=f.height-1)return;
 const key=x+','+y;if(gesture?.last===key)return;if(gesture)gesture.last=key;
 if(tool in terrain){const radius=isAtlas()?Math.floor(Number($('brush').value)/2):0;
  for(let yy=y-radius;yy<=y+radius;yy++)for(let xx=x-radius;xx<=x+radius;xx++){
   if(xx<1||yy<1||xx>=f.width-1||yy>=f.height-1||(xx-x)**2+(yy-y)**2>(radius+.5)**2||f.buildings.some(e=>buildingContains(e,xx,yy)))continue;
   if(f.entities.some(e=>e.x===xx&&e.y===yy)&&!['floor','grass','forest','road'].includes(tool))continue;
   const row=[...f.cells[yy]];row[xx]=terrain[tool];f.cells[yy]=row.join('');
  }
 }else if(tool==='erase'){selection=hitAt(p);removeSelected();}
 else if(tool==='label'){const label={id:uid('label'),x:p.x,y:p.y,text:'新しい地名',size:22,rotation:0};f.labels.push(label);selection={type:'label',id:label.id};tool='select';status('右側で地名を入力できます。ドラッグで移動できます。');}
 else{
  if(!['.','g','f','='].includes(f.cells[y][x])||f.buildings.some(e=>buildingContains(e,x,y))){status('通れる地形に置いてください。');return;}
  const existing=f.entities.find(e=>e.x===x&&e.y===y);
  if(existing&&((tool==='portal'&&existing.kind==='portal')||(tool==='note'&&existing.kind==='note'))){selection=hitAt(p);if(tool==='note')$('note').value=existing.text;return;}
  f.entities=f.entities.filter(e=>!(e.x===x&&e.y===y)&&!(['spawn','exit'].includes(tool)&&e.kind===tool));
  const entity={id:uid(tool),kind:tool,x,y};if(tool==='portal'){entity.target=$('portal-target').value;entity.label=$('portal-name').value||'入口';entity.style=place().mapKind==='town'?'house':'town';}if(tool==='note')entity.text=$('note').value||'メモ';f.entities.push(entity);selection={type:tool==='portal'?'portal':'entity',id:entity.id,x,y};
 }
}
canvas.addEventListener('pointerdown',event=>{
 if(event.button!==0&&event.button!==1)return;const p=point(event);canvas.setPointerCapture(event.pointerId);
 if(tool==='pan'||space||event.button===1){gesture={type:'pan',clientX:event.clientX,clientY:event.clientY,left:$('viewport').scrollLeft,top:$('viewport').scrollTop};return;}
 checkpoint();if(tool==='select'){selection=hitAt(p);const item=currentSelection();gesture=item?{type:'move',start:p,original:structuredClone(item)}:null;}else if(tool==='building')gesture={type:'building',start:p,latest:p};else{gesture={type:'paint',last:null};paint(p);}draw();
});
canvas.addEventListener('pointermove',event=>{
 if(!gesture)return;const p=point(event);
 if(gesture.type==='pan'){$('viewport').scrollLeft=gesture.left-(event.clientX-gesture.clientX);$('viewport').scrollTop=gesture.top-(event.clientY-gesture.clientY);return;}
 if(gesture.type==='building')gesture.latest=p;
 else if(gesture.type==='move'){const item=currentSelection();if(!item)return;const dx=p.x-gesture.start.x,dy=p.y-gesture.start.y,original=gesture.original;
  if(selection.type==='building')changeBuilding({x:Math.round(original.x+dx),y:Math.round(original.y+dy)},false);
  else if(selection.type==='label'){item.x=Math.max(0,Math.min(floor().width,original.x+dx));item.y=Math.max(0,Math.min(floor().height,original.y+dy));}
  else{const x=Math.round(original.x+dx),y=Math.round(original.y+dy);if(x>0&&y>0&&x<floor().width-1&&y<floor().height-1&&['.','g','f','='].includes(floor().cells[y][x])&&!floor().entities.some(e=>e!==item&&e.x===x&&e.y===y)&&!floor().buildings.some(e=>buildingContains(e,x,y))){item.x=x;item.y=y;selection.x=x;selection.y=y;}}
 }else if(tool in terrain||tool==='erase')paint(p);
 draw();
});
function finish(){if(gesture?.type==='building')addBuilding(gesture.start,gesture.latest);gesture=null;draw();}
canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',()=>{gesture=null;draw();});
canvas.addEventListener('wheel',event=>{event.preventDefault();changeZoom(event.deltaY<0?1.12:1/1.12);},{passive:false});
$('show-grid').checked=!isAtlas();$('show-grid').onchange=draw;$('brush').oninput=()=>{$('brush-value').textContent=$('brush').value;};
$('zoom-in').onclick=()=>changeZoom(1.25);$('zoom-out').onclick=()=>changeZoom(.8);$('zoom-fit').onclick=()=>{zoom=0;applyZoom();};
$('title').onchange=()=>{checkpoint();place().title=$('title').value;draw();};
for(const [id,prop,number]of [['building-name','name',false],['building-width','w',true],['building-height','h',true],['building-roof','roof',false],['building-kind','kind',false],['building-elevation','elevation',true]])if($(id))$(id).onchange=()=>{changeBuilding({[prop]:number?Number($(id).value):$(id).value});draw();};
$('building-rotate').onclick=()=>{changeBuilding({rotation:((currentSelection()?.rotation||0)+90)%360});draw();};
for(const [id,prop,number]of [['label-text','text',false],['label-size','size',true],['label-rotation','rotation',true]])$(id).onchange=()=>{const item=currentSelection();if(selection?.type==='label'&&item){checkpoint();item[prop]=number?Number($(id).value):$(id).value;draw();}};
$('delete-selection').onclick=()=>{checkpoint();removeSelected();draw();};
$('update-note').onclick=()=>{const item=currentSelection();if(item?.kind==='note'){checkpoint();item.text=$('note').value;status('メモを更新しました。');}};
function restore(from,to){if(!from.length)return;to.push(JSON.stringify({doc,source,locationId,floorIndex}));({doc,source,locationId,floorIndex}=JSON.parse(from.pop()));selection=null;syncSeed();draw();}
$('undo').onclick=()=>restore(history,future);$('redo').onclick=()=>restore(future,history);
$('location').onchange=()=>{locationId=$('location').value;floorIndex=0;selection=null;zoom=0;syncSeed();draw();};$('floor').onchange=()=>{floorIndex=Number($('floor').value);selection=null;zoom=0;draw();};
$('initial-keys').onchange=()=>{checkpoint();doc.initialKeys=Math.max(0,Math.min(99,Math.trunc(Number($('initial-keys').value)||0)));draw();};
function placeStair(f,code){const spawn=f.entities.find(e=>e.kind==='spawn'),points=[];for(let y=1;y<f.height-1;y++)for(let x=1;x<f.width-1;x++)if(f.cells[y][x]==='.'&&!f.entities.some(e=>e.x===x&&e.y===y))points.push({x,y,d:Math.abs(x-spawn.x)+Math.abs(y-spawn.y)});points.sort((a,b)=>a.d-b.d);const p=points[0];if(p){const row=[...f.cells[p.y]];row[p.x]=code;f.cells[p.y]=row.join('');}}
$('add-floor').onclick=()=>{if(place().lowerFloors.length>=9)return;checkpoint();const previous=getFloor(place(),place().lowerFloors.length),next=generateScene(Number($('seed').value)+place().lowerFloors.length+1);placeStair(previous,'>');placeStair(next,'<');place().lowerFloors.push(next);floorIndex=place().lowerFloors.length;selection=null;draw();};
$('update-portal').onclick=()=>{const portal=selectedPortal();if(!portal)return status('入口か建物を選択してください。');checkpoint();portal.target=$('portal-target').value;portal.label=$('portal-name').value||'入口';draw();};
function addPlace(kind){if(doc.linkedMaps.length>=31)return;checkpoint();const scene=createPlace(kind,Number($('seed').value)+doc.linkedMaps.length+1),id=uid(kind);placeEntrance(floor(),id,scene.title,kind==='interior'?'house':kind==='town'?'town':'dungeon');scene.entities=scene.entities.filter(e=>e.kind!=='exit');placeEntrance(scene,'$return','外へ出る','gate');doc.linkedMaps.push({id,scene});if(kind==='town')connectTownBuildings(doc,scene);locationId=id;floorIndex=0;selection=null;zoom=0;syncSeed();draw();}
$('add-town').onclick=()=>addPlace('town');$('add-dungeon').onclick=()=>addPlace('dungeon');$('add-house').onclick=()=>{if(place().mapKind==='town'){tool='building';draw();status('地図上をドラッグして、建物の敷地を囲んでください。');}else addPlace('interior');};
$('campaign-demo').onclick=()=>{checkpoint();doc=createCampaign(Number($('seed').value));locationId=pageKind==='town'?'town':'root';floorIndex=0;selection=null;syncSeed();draw();};
$('generate').onclick=()=>{checkpoint();const old=place(),next=createPlace(old.mapKind,Number($('seed').value));next.lowerFloors=old.lowerFloors;if(locationId==='root'){next.linkedMaps=doc.linkedMaps;next.initialKeys=doc.initialKeys;doc=next;}else doc.linkedMaps.find(e=>e.id===locationId).scene=next;if(old.entities.some(e=>e.kind==='portal'&&e.target==='$return')){next.entities=next.entities.filter(e=>e.kind!=='exit');placeEntrance(next,'$return','外へ出る','gate');}if(next.mapKind==='town')connectTownBuildings(doc,next);selection=null;draw();status('新しい地形を生成しました。元に戻すこともできます。');};
$('seed-random').onclick=()=>{const previous=Number($('seed').value)>>>0;let seed;do{seed=crypto.getRandomValues(new Uint32Array(1))[0];}while(!seed||seed===previous);$('seed').value=seed;$('generate').click();};
$('open').onclick=()=>$('file').click();$('file').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>2_000_000)throw Error('2MB以内のファイルを選んでください。');const text=await file.text(),next=readScene(text);checkpoint();doc=next;source=text;selection=null;syncSeed();draw();status('読み込みました。追記した文章は保存時にも残します。');}catch(error){status(error.message);}};
function syncTitle(){if(place().title!==$('title').value){checkpoint();place().title=$('title').value;}}
$('save').onclick=()=>{try{syncTitle();const text=source?replaceSceneBlock(source,doc):writeScene(doc),url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=(doc.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,80)||'scene')+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);source=text;status('Markdownを保存しました。');}catch(error){status(error.message);}};
$('export-png').onclick=()=>{const selected=selection;selection=null;draw();canvas.toBlob(blob=>{if(blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='map.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}selection=selected;draw();},'image/png');};
$('play-fps').onclick=()=>{try{syncTitle();validateConnections(doc);toRuntime(place());doc.startLocation=locationId;location.href='fps.html#scene='+encodeURIComponent(JSON.stringify(doc));}catch(error){status(error.message);}};
$('play').onclick=()=>{try{syncTitle();validateConnections(doc);toRuntime(place());doc.startLocation=locationId;location.href='play.html#scene='+encodeURIComponent(JSON.stringify(doc));}catch(error){status(error.message);}};
window.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();$('save').click();return;}if(['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;if(event.code==='Space'){event.preventDefault();space=true;updateTools();}if(event.key==='Delete'){checkpoint();removeSelected();draw();}});window.addEventListener('keyup',event=>{if(event.code==='Space'){space=false;updateTools();}});window.addEventListener('blur',()=>{space=false;gesture=null;});
window.dungeonStudio={getScene:()=>structuredClone(doc),getCurrentScene:()=>structuredClone(floor()),reachable:()=>reachableCells(floor()).size};
$('floor-settings').open=pageKind==='dungeon';syncSeed();draw();status('選択して移動。建物はドラッグで敷地を作り、地名はラベル道具で配置できます。');

document.fonts.ready.then(draw);

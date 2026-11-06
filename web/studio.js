import {generateScene,readScene,writeScene,replaceSceneBlock,toRuntime,reachableCells,getFloor} from './scene-format.js';
const $=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d'),CELL=18;
let doc=generateScene(42);
try{if(location.hash.startsWith('#scene='))doc=readScene(decodeURIComponent(location.hash.slice(7)));}catch(error){console.warn(error);}
let floorIndex=0;const floor=()=>getFloor(doc,floorIndex);
let tool='floor',history=[],future=[],source=null,selectedNote=null,stroke=null;
const tools=[['floor','床'],['wall','壁'],['door','＋ 鍵付き扉'],['pit','○ 落とし穴'],['stairsDown','↓ 下り階段'],['stairsUp','↑ 上り階段'],['key','K 鍵'],['spawn','● 開始'],['exit','◆ 出口'],['enemy','▲ 敵'],['note','▤ メモ'],['erase','配置を消す']];
for(const [id,label]of tools){const b=document.createElement('button');b.textContent=label;b.dataset.tool=id;b.onclick=()=>{tool=id;updateTools();};$('tools').append(b);}
function updateTools(){for(const b of $('tools').children)b.setAttribute('aria-pressed',b.dataset.tool===tool?'true':'false');}
function checkpoint(){history.push(JSON.stringify({doc,source}));if(history.length>60)history.shift();future=[];}
function status(text){$('status').textContent=text;}
function draw(){
 floorIndex=Math.min(floorIndex,(doc.lowerFloors||[]).length);
 $('floor').replaceChildren();
 for(let i=0;i<=doc.lowerFloors.length;i++){const option=document.createElement('option');option.value=i;option.textContent=i===0?'1F':'B'+i+'F';$('floor').append(option);}
 $('floor').value=String(floorIndex);$('initial-keys').value=doc.initialKeys;
 canvas.width=floor().width*CELL;canvas.height=floor().height*CELL;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 15px sans-serif';
 for(let y=0;y<floor().height;y++)for(let x=0;x<floor().width;x++){
  const c=floor().cells[y][x];ctx.fillStyle=c==='#'?'#23343d':c==='+'?'#94764e':'#b4c4b5';ctx.fillRect(x*CELL,y*CELL,CELL,CELL);ctx.strokeStyle=c==='#'?'#2a3e47':'#9aad9f';ctx.strokeRect(x*CELL+.5,y*CELL+.5,CELL,CELL);
  if(c==='O'){ctx.fillStyle='#020608';ctx.beginPath();ctx.arc((x+.5)*CELL,(y+.5)*CELL,CELL*.38,0,Math.PI*2);ctx.fill();}
  if(c==='>'||c==='<'){ctx.fillStyle='#daaf68';ctx.font='bold 16px sans-serif';ctx.fillText(c==='>'?'↓':'↑',(x+.5)*CELL,(y+.65)*CELL);}
  if(c==='+'){ctx.fillStyle='#f5db9a';ctx.fillRect(x*CELL+3,y*CELL+7,CELL-6,4);}
 }
 const colors={spawn:'#175459',exit:'#2644a4',enemy:'#a23843',note:'#785226',key:'#a47c10'},symbols={spawn:'●',exit:'◆',enemy:'▲',note:'▤',key:'K'};
 ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 for(const e of floor().entities){ctx.fillStyle=colors[e.kind];ctx.fillText(symbols[e.kind],(e.x+.5)*CELL,(e.y+.5)*CELL);}
 if(selectedNote){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(selectedNote.x*CELL+1,selectedNote.y*CELL+1,CELL-2,CELL-2);ctx.lineWidth=1;}
 $('title').value=doc.title;$('size').textContent=floor().width+' × '+floor().height;$('undo').disabled=!history.length;$('redo').disabled=!future.length;
}
function paint(event){
 const r=canvas.getBoundingClientRect(),x=Math.floor((event.clientX-r.left)/r.width*floor().width),y=Math.floor((event.clientY-r.top)/r.height*floor().height);
 if(x<1||y<1||x>=floor().width-1||y>=floor().height-1)return;
 const key=x+','+y;if(stroke?.last===key)return;if(stroke)stroke.last=key;
 const current=floor().entities.find(e=>e.x===x&&e.y===y);
 if(['floor','wall','door','pit','stairsDown','stairsUp'].includes(tool)){
  const row=[...floor().cells[y]];row[x]=({wall:'#',door:'+',pit:'O',stairsDown:'>',stairsUp:'<'})[tool]||'.';floor().cells[y]=row.join('');
  if(tool!=='floor')floor().entities=floor().entities.filter(e=>e.x!==x||e.y!==y);
 }else if(tool==='erase'){floor().entities=floor().entities.filter(e=>e.x!==x||e.y!==y);}else{
  if(floor().cells[y][x]!=='.'){status('配置物は床に置いてください。');return;}
  if(tool==='note'&&current?.kind==='note'){selectedNote=current;$('note').value=current.text;draw();return;}
  floor().entities=floor().entities.filter(e=>!(e.x===x&&e.y===y)&&!(['spawn','exit'].includes(tool)&&e.kind===tool));
  const entity={kind:tool,x,y};if(tool==='note'){entity.text=$('note').value||'新しいメモ';selectedNote=entity;$('note').value=entity.text;}
  floor().entities.push(entity);
 }
 draw();status('編集中 — 保存するか「2D / 3D で遊ぶ」で試せます。');
}
canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;checkpoint();stroke={last:null};canvas.setPointerCapture(event.pointerId);paint(event);});
canvas.addEventListener('pointermove',event=>{if(stroke&&['floor','wall','door','pit','stairsDown','stairsUp','erase'].includes(tool))paint(event);});
const finish=()=>{stroke=null;};canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
$('title').onchange=()=>{checkpoint();doc.title=$('title').value;draw();};
$('update-note').onclick=()=>{if(!selectedNote)return status('メモ道具で既存のメモを選択してください。');checkpoint();const note=floor().entities.find(e=>e.kind==='note'&&e.x===selectedNote.x&&e.y===selectedNote.y);if(note)note.text=$('note').value;status('メモを更新しました。');};
$('undo').onclick=()=>{if(!history.length)return;future.push(JSON.stringify({doc,source}));({doc,source}=JSON.parse(history.pop()));selectedNote=null;draw();};
$('redo').onclick=()=>{if(!future.length)return;history.push(JSON.stringify({doc,source}));({doc,source}=JSON.parse(future.pop()));selectedNote=null;draw();};
$('generate').onclick=()=>{checkpoint();const next=generateScene(Number($('seed').value));if(floorIndex===0){next.lowerFloors=doc.lowerFloors;next.initialKeys=doc.initialKeys;doc=next;}else doc.lowerFloors[floorIndex-1]=next;selectedNote=null;draw();status('選択中の階を生成しました。接続階段は必要に応じて配置してください。');};
$('floor').onchange=()=>{floorIndex=Number($('floor').value);selectedNote=null;draw();};
$('initial-keys').onchange=()=>{checkpoint();doc.initialKeys=Math.max(0,Math.min(99,Math.trunc(Number($('initial-keys').value)||0)));draw();};
function placeStair(f,code){
 const spawn=f.entities.find(e=>e.kind==='spawn');
 const candidates=[];
 for(let y=1;y<f.height-1;y++)for(let x=1;x<f.width-1;x++)if(f.cells[y][x]==='.'&&!f.entities.some(e=>e.x===x&&e.y===y))candidates.push({x,y,d:Math.abs(x-spawn.x)+Math.abs(y-spawn.y)});
 candidates.sort((a,b)=>a.d-b.d);const p=candidates[0];if(!p)return;
 const row=[...f.cells[p.y]];row[p.x]=code;f.cells[p.y]=row.join('');
}
$('add-floor').onclick=()=>{
 if(doc.lowerFloors.length>=9)return status('フロアは合計10階までです。');
 checkpoint();const previous=getFloor(doc,doc.lowerFloors.length),next=generateScene(Number($('seed').value)+doc.lowerFloors.length+1);
 placeStair(previous,'>');placeStair(next,'<');doc.lowerFloors.push(next);floorIndex=doc.lowerFloors.length;selectedNote=null;draw();status('下の階と接続階段を追加しました。落とし穴は下の階へ、最下階ではゲームオーバーです。');
};
$('open').onclick=()=>$('file').click();$('file').onchange=async event=>{
 const file=event.target.files[0];event.target.value='';if(!file)return;
 try{if(file.size>2_000_000)throw Error('2MB以内のファイルを選んでください。');const text=await file.text(),next=readScene(text);checkpoint();doc=next;source=text;selectedNote=null;draw();status('読み込みました。コードブロック外の文章は再保存時にも保持します。');}catch(e){status(e.message);}
};
function syncTitle(){if(doc.title!==$('title').value){checkpoint();doc.title=$('title').value;}}
$('save').onclick=()=>{try{syncTitle();const text=source?replaceSceneBlock(source,doc):writeScene(doc),url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=(doc.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,80)||'scene')+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);source=text;status('Markdown を保存しました。必要に応じて Vault に移動してください。');}catch(e){status(e.message);}};
$('play').onclick=()=>{try{syncTitle();toRuntime(doc);location.href='play.html#scene='+encodeURIComponent(JSON.stringify(doc));}catch(e){status(e.message);}};
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();$('save').click();}});
window.dungeonStudio={getScene:()=>structuredClone(doc),reachable:()=>reachableCells(floor()).size};
updateTools();draw();status('床・壁・開始地点・出口を編集し、2D / 3D で試遊できます。');

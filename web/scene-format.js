// Original MindZJ scene format. No third-party editor code or schema.
export const FORMAT = 'mindzj-dungeon-scene';
export function validateScene(value, nested=false) {
  const d = structuredClone(value);
  if (!d || d.format !== FORMAT || d.version !== 1) throw Error('MindZJ Dungeon Scene v1 のファイルを選んでください。');
  if (!Number.isInteger(d.width) || !Number.isInteger(d.height) || d.width < 5 || d.width > 160 || d.height < 5 || d.height > 120) throw Error('サイズは5〜160列、5〜120行です。');
  if (typeof d.title !== 'string' || d.title.length > 120 || !Array.isArray(d.cells) || d.cells.length !== d.height || d.cells.some(r => typeof r !== 'string' || r.length !== d.width || /[^#.+O<>]/.test(r))) throw Error('タイトルかマップのデータが不正です。');
  if (!Array.isArray(d.entities) || d.entities.length > 256) throw Error('配置物が多すぎます。');
  d.initialKeys ??= 3;
  if(!Number.isInteger(d.initialKeys)||d.initialKeys<0||d.initialKeys>99)throw Error('開始時の鍵は0〜99個です。');
  d.lowerFloors ??= [];
  if(!Array.isArray(d.lowerFloors)||d.lowerFloors.length>9||(nested&&d.lowerFloors.length))throw Error('フロアは合計10階までです。');
  d.lowerFloors=d.lowerFloors.map(f=>validateScene(f,true));
  const occupied = new Set();
  for (const e of d.entities) {
    if (!e || !['spawn','exit','enemy','note','key'].includes(e.kind) || !Number.isInteger(e.x) || !Number.isInteger(e.y) || e.x < 1 || e.y < 1 || e.x >= d.width-1 || e.y >= d.height-1 || d.cells[e.y][e.x] !== '.') throw Error('配置物は外周以外の床に置いてください。');
    const key=e.x+','+e.y;
    if(occupied.has(key)) throw Error('同じマスに複数の配置物があります。');
    occupied.add(key);
    if (e.kind === 'note' && (typeof e.text !== 'string' || e.text.length > 2000)) throw Error('メモは2000文字以内です。');
  }
  if (d.entities.filter(e=>e.kind==='spawn').length !== 1 || d.entities.filter(e=>e.kind==='exit').length !== 1) throw Error('開始地点と出口を1つずつ置いてください。');
  if (d.entities.filter(e=>e.kind==='enemy').length > 64) throw Error('敵は64体までです。');
  for (let y=0;y<d.height;y++)for(let x=0;x<d.width;x++)if((x===0||y===0||x===d.width-1||y===d.height-1)&&d.cells[y][x]!=='#')throw Error('外周は壁にしてください。');
  return d;
}
export function writeScene(value) {
  const d=validateScene(value),json=JSON.stringify(d,null,2);
  const fence='`'.repeat(Math.max(3,...(json.match(/`+/g)||[]).map(s=>s.length+1)));
  return '# '+d.title.replace(/[\r\n]/g,' ')+'\n\n## シナリオ\n\nここに冒険の説明を書けます。下のデータには配置した敵やメモも含まれます。\n\n'+fence+'mindzj-scene\n'+json+'\n'+fence+'\n';
}
export function readScene(text) {
  if(typeof text!=='string'||text.length>2_000_000)throw Error('シーンは2MB以内です。');
  if(text.trimStart().startsWith('{'))return validateScene(JSON.parse(text));
  const lines=text.split(/\r?\n/),blocks=[];
  for(let i=0;i<lines.length;i++){
    const start=/^(`{3,})mindzj-scene\s*$/.exec(lines[i]);if(!start)continue;
    const first=++i;while(i<lines.length&&lines[i]!==start[1])i++;
    if(i===lines.length)throw Error('データのコードブロックが閉じられていません。');
    blocks.push(lines.slice(first,i).join('\n'));
  }
  if(blocks.length!==1)throw Error('mindzj-scene ブロックが1つ必要です。');
  return validateScene(JSON.parse(blocks[0]));
}
export function reachableCells(d) {
  const spawn=d.entities.find(e=>e.kind==='spawn');if(!spawn)return new Set();
  const seen=new Set([spawn.y*d.width+spawn.x]),queue=[[spawn.x,spawn.y]];
  for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const x=queue[i][0]+dx,y=queue[i][1]+dy,key=y*d.width+x;
    if(x>=0&&y>=0&&x<d.width&&y<d.height&&d.cells[y][x]!=='#'&&d.cells[y][x]!=='O'&&!seen.has(key)){seen.add(key);queue.push([x,y]);}
  }
  return seen;
}
export function toRuntime(value) {
  const d=validateScene(value);
  const convert=f=>{
    const spawn=f.entities.find(e=>e.kind==='spawn'),exit=f.entities.find(e=>e.kind==='exit');
    if(!reachableCells(f).has(exit.y*f.width+exit.x))throw Error(f.title+'：開始地点から出口に到達できません。');
    const codes={'#':1,'.':0,'+':7,'O':5,'>':3,'<':4};
    const tiles=f.cells.join('').split('').map(c=>codes[c]);
    tiles[exit.y*f.width+exit.x]=6;
    for(const e of f.entities.filter(e=>e.kind==='key'))tiles[e.y*f.width+e.x]=9;
    return {width:f.width,height:f.height,tiles,spawn:[spawn.x,spawn.y],enemies:f.entities.filter(e=>e.kind==='enemy').map(e=>[e.x,e.y])};
  };
  return {...convert(d),initial_keys:d.initialKeys,lower_floors:d.lowerFloors.map(convert)};
}
export function getFloor(project,index=0){return index===0?project:project.lowerFloors[index-1];}
export function generateScene(seed=42,width=48,height=32) {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<12||height<12||width>160||height>120)throw Error('生成サイズが不正です。');
  let state=(Number(seed)>>>0)||1;
  const rand=n=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)%n;};
  const grid=Array.from({length:height},()=>Array(width).fill('#')),rooms=[];
  const carve=(x,y)=>{if(x>0&&y>0&&x<width-1&&y<height-1)grid[y][x]='.';};
  for(let i=0;i<100;i++){
    const w=3+rand(Math.min(7,width-5)),h=3+rand(Math.min(5,height-5)),x=1+rand(width-w-2),y=1+rand(height-h-2);
    if(rooms.some(r=>x<r.x+r.w+1&&x+w+1>r.x&&y<r.y+r.h+1&&y+h+1>r.y))continue;
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)carve(xx,yy);
    const room={x,y,w,h,cx:x+Math.floor(w/2),cy:y+Math.floor(h/2)};
    if(rooms.length){const prev=rooms.at(-1);for(let xx=Math.min(prev.cx,room.cx);xx<=Math.max(prev.cx,room.cx);xx++)carve(xx,prev.cy);for(let yy=Math.min(prev.cy,room.cy);yy<=Math.max(prev.cy,room.cy);yy++)carve(room.cx,yy);}
    rooms.push(room);if(rooms.length>=12)break;
  }
  const first=rooms[0],last=rooms.at(-1),entities=[{kind:'spawn',x:first.cx,y:first.cy},{kind:'exit',x:last.cx,y:last.cy}];
  if(first===last){entities[1].x=first.x;entities[1].y=first.y;}
  for(const r of rooms.slice(1,-1))entities.push({kind:'enemy',x:r.cx,y:r.cy});
  const note={kind:'note',x:first.x,y:first.y,text:'古い石碑：「奥の青い出口を探せ。Z で攻撃、X で跳躍。」'};
  if(!entities.some(e=>e.x===note.x&&e.y===note.y))entities.push(note);
  let doorCount=0;
  for(let y=2;y<height-2&&doorCount<3;y++)for(let x=2;x<width-2&&doorCount<3;x++){
    if(grid[y][x]!=='.'||entities.some(e=>e.x===x&&e.y===y))continue;
    const narrow=(grid[y-1][x]==='#'&&grid[y+1][x]==='#'&&grid[y][x-1]==='.'&&grid[y][x+1]==='.')||(grid[y][x-1]==='#'&&grid[y][x+1]==='#'&&grid[y-1][x]==='.'&&grid[y+1][x]==='.');
    if(narrow){grid[y][x]='+';doorCount++;}
  }
  const k={kind:'key',x:first.x+1,y:first.y};if(!entities.some(e=>e.x===k.x&&e.y===k.y))entities.push(k);
  const pit=[last.x,last.y];if(!entities.some(e=>e.x===pit[0]&&e.y===pit[1]))grid[pit[1]][pit[0]]='O';
  const result=validateScene({format:FORMAT,version:1,title:'地下書庫 '+seed,seed:Number(seed)>>>0,width,height,cells:grid.map(r=>r.join('')),entities});
  if(!reachableCells(result).has(entities[1].y*width+entities[1].x)){const row=[...result.cells[pit[1]]];row[pit[0]]='.';result.cells[pit[1]]=row.join('');}
  return result;
}
export function replaceSceneBlock(original,doc) {
  readScene(original);
  if(original.trimStart().startsWith('{'))return writeScene(doc);
  const lines=original.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    const open=/^(`{3,})mindzj-scene\s*$/.exec(lines[i]);if(!open)continue;
    let end=i+1;while(end<lines.length&&lines[end]!==open[1])end++;
    const fresh=writeScene(doc),start=fresh.indexOf('\n```')+1;
    lines.splice(i,end-i+1,...fresh.slice(start).trimEnd().split('\n'));
    return lines.join('\n');
  }
  throw Error('シーンブロックがありません。');
}

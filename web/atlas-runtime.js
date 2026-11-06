import {renderAtlas,buildingBounds} from './cartography.js?v=atlas3';
const cache=new WeakMap();
export function renderAtlasGame(canvas,floor,wasm,width,height){
 if(!cache.has(floor)){const art=document.createElement('canvas');art.width=floor.width*24;art.height=floor.height*24;renderAtlas(art.getContext('2d'),floor,{cell:24,showMarkers:false,frame:false});cache.set(floor,art);}
 const art=cache.get(floor),ctx=canvas.getContext('2d');if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
 const playerX=wasm.player_x_roguelike(),playerY=wasm.player_y_roguelike(),viewW=Math.min(floor.width,floor.mapKind==='world'?27:20),viewH=Math.min(floor.height,viewW*height/width),sx=Math.max(0,Math.min(floor.width-viewW,playerX-viewW/2)),sy=Math.max(0,Math.min(floor.height-viewH,playerY-viewH/2)),scale=width/viewW;
 ctx.fillStyle='#73999c';ctx.fillRect(0,0,width,height);ctx.drawImage(art,sx*24,sy*24,viewW*24,viewH*24,0,0,width,height);
 const actor=(x,y,image,color)=>{const px=(x+.5-sx)*scale,py=(y+.5-sy)*scale,size=scale*.85;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(px,py+size*.25,size*.38,size*.16,0,0,Math.PI*2);ctx.fill();if(image?.complete&&image.naturalWidth)ctx.drawImage(image,px-size/2,py-size*.7,size,size);else{ctx.fillStyle=color;ctx.beginPath();ctx.arc(px,py,size*.22,0,Math.PI*2);ctx.fill();}};
 actor(playerX,playerY,document.getElementById('player-icon'),'#2d726f');
 for(let i=0;i<wasm.enemy_count_roguelike();i++){const enemy=wasm.enemy_data_roguelike(i);actor(enemy[0],enemy[1],document.getElementById('enemy-'+enemy[4]),'#9d5344');}
 ctx.fillStyle='#f0ead8df';ctx.fillRect(10,10,150,48);ctx.fillStyle='#31504b';ctx.font='14px DenkiChip';ctx.fillText('HP '+wasm.hp_roguelike()+'/'+wasm.max_hp_roguelike(),20,30);ctx.fillText('鍵 '+wasm.studio_keys()+' / F'+wasm.depth_roguelike(),20,48);
}
export function addTownBuildings(THREE,scene,objects,floor,bounds){
 const mesh=(geo,color,x,y,z)=>{const object=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color}));object.position.set(x,y,z);scene.add(object);objects.push(object);return object;};
 for(const b of floor.buildings||[]){const box=buildingBounds(b);if(box.x>bounds.maxX||box.y>bounds.maxY||box.x+box.w<bounds.minX||box.y+box.h<bounds.minY)continue;
  const x=box.x+(box.w-1)/2,z=box.y+(box.h-1)/2,w=box.w*.96,d=box.h*.96,h=Math.max(2,(b.elevation||6)/2),color=({tile:0x9e5742,slate:0x607a87,thatch:0xb2a170,flat:0x7e8d80})[b.roof];
  mesh(new THREE.BoxGeometry(w,h,d),0xdac7a3,x,h/2,z);
  if(b.roof==='flat'){mesh(new THREE.BoxGeometry(w+.15,.18,d+.15),color,x,h+.09,z);}else{const roof=mesh(new THREE.ConeGeometry(Math.max(w,d)*.72,.9,4),color,x,h+.45,z);roof.rotation.y=Math.PI/4;roof.scale.x=w/Math.max(w,d);roof.scale.z=d/Math.max(w,d);}
  mesh(new THREE.BoxGeometry(.35,.6,.35),0x8c8979,x+w*.2,h+.7,z);
  for(let i=0;i<Math.floor(w);i++)mesh(new THREE.BoxGeometry(.28,.4,.04),0x517884,x-w/2+.6+i,h*.55,z+d/2+.03);
  const portal=floor.entities.find(e=>e.buildingId===b.id);if(portal)mesh(new THREE.BoxGeometry(.4,.9,.08),0x67533c,portal.x,.45,portal.y-.45);
 }
}

use crate::{state, RoguelikeGame, DUNGEONLOAD_STATE};
use wasm_bindgen::prelude::*;

#[derive(serde::Deserialize)]
struct ImportedFloor {
    width:usize,height:usize,tiles:Vec<u8>,spawn:[usize;2],
    #[serde(default)] enemies:Vec<[usize;2]>,
}
#[derive(serde::Deserialize)]
struct ImportedScene {
    #[serde(flatten)] first:ImportedFloor,
    #[serde(default)] lower_floors:Vec<ImportedFloor>,
    #[serde(default="default_keys")] initial_keys:u32,
}
fn default_keys()->u32 {3}
fn validate(s:&ImportedFloor)->Result<(), &'static str> {
    if !(5..=160).contains(&s.width)||!(5..=120).contains(&s.height)||s.tiles.len()!=s.width*s.height||s.enemies.len()>64 {return Err("Invalid floor dimensions");}
    if s.tiles.iter().any(|v|![0,1,3,4,5,6,7,9].contains(v)) {return Err("Unknown tile");}
    let floor=|p:[usize;2]|p[0]<s.width&&p[1]<s.height&&s.tiles[p[1]*s.width+p[0]]==0;
    if !floor(s.spawn)||s.enemies.iter().any(|p|!floor(*p)||*p==s.spawn) {return Err("Invalid spawn or enemies");}
    let mut occupied=std::collections::HashSet::new();
    if s.enemies.iter().any(|p|!occupied.insert(*p)) {return Err("Duplicate enemies");}
    for y in 0..s.height {for x in 0..s.width {
        if (x==0||y==0||x==s.width-1||y==s.height-1)&&s.tiles[y*s.width+x]!=1 {return Err("Map border must be walls");}
    }}
    Ok(())
}
fn make_enemy(p:[usize;2])->state::Enemy {
    state::Enemy{x:p[0] as i32,y:p[1] as i32,hp:20,max_hp:20,color:[0.6,1.0,0.6],name:"Goblin".into(),enemy_type:1,variant:state::EnemyVariant::Normal,atk:5,def:0,drop_rate:0,is_boss:false,pursuit_timer:0,can_see_player:false,attack_cooldown:120}
}
fn make_floor(s:ImportedFloor)->state::CustomFloorState {
    state::CustomFloorState {
        map:s.tiles.chunks(s.width).map(|row|row.iter().map(|v|match v {
            1=>state::TileType::Wall,3=>state::TileType::StairDown,4=>state::TileType::StairUp,5=>state::TileType::Pit,6=>state::TileType::WarpHole,7=>state::TileType::LockedDoor,9=>state::TileType::KeyPickup,_=>state::TileType::Room,
        }).collect()).collect(),
        spawn:[s.spawn[0] as i32,s.spawn[1] as i32],enemies:s.enemies.into_iter().map(make_enemy).collect(),
    }
}
fn build_game(s:ImportedScene)->Result<RoguelikeGame,&'static str> {
    if s.lower_floors.len()>9||s.initial_keys>99 {return Err("At most 10 floors and 99 initial keys");}
    validate(&s.first)?;for f in &s.lower_floors {validate(f)?;}
    let mut g=RoguelikeGame::new();
    g.custom_floors=std::iter::once(s.first).chain(s.lower_floors).map(make_floor).collect();
    let first=&g.custom_floors[0];
    g.map=first.map.clone();g.enemies=first.enemies.clone();
    g.map_width=g.map[0].len() as i32;g.map_height=g.map.len() as i32;
    g.player_x=first.spawn[0];g.player_y=first.spawn[1];g.player_direction=2;
    g.inventory[5]=s.initial_keys;g.scene=state::RogueScene::Playing;g.rooms.clear();
    g.visited=vec![vec![true;g.map_width as usize];g.map_height as usize];
    g.messages=vec!["MindZJ scene loaded. Keys open locked doors.".into()];g.enemy_shake=vec![0;g.enemies.len()];
    Ok(g)
}
#[wasm_bindgen]
pub fn load_mindzj_scene(json:&str)->Result<(),JsValue> {
    if json.len()>2_000_000 {return Err(JsValue::from_str("Scene too large"));}
    let s:ImportedScene=serde_json::from_str(json).map_err(|_|JsValue::from_str("Invalid scene JSON"))?;
    let game=build_game(s).map_err(|e|JsValue::from_str(e))?;
    DUNGEONLOAD_STATE.with(|slot|*slot.borrow_mut()=Some(game));Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    fn floor()->ImportedFloor {
        let mut f=ImportedFloor{width:9,height:7,tiles:vec![1;63],spawn:[2,2],enemies:vec![]};
        for y in 1..6 {for x in 1..8 {f.tiles[y*9+x]=0;}}f
    }
    fn scene(first:ImportedFloor,lower_floors:Vec<ImportedFloor>,initial_keys:u32)->RoguelikeGame {build_game(ImportedScene{first,lower_floors,initial_keys}).unwrap()}
    #[test]
    fn doors_consume_keys_and_pickups_disappear() {
        let mut f=floor();f.tiles[2*9+3]=7;f.tiles[2*9+4]=9;
        let mut g=scene(f,vec![],1);g.move_player(2);
        assert_eq!(g.inventory[5],0);assert_eq!(g.player_x,3);assert!(g.map[2][3]==state::TileType::OpenDoor);
        g.move_player(2);assert_eq!(g.inventory[5],1);g.move_player(1);g.move_player(2);assert_eq!(g.inventory[5],1);
        let mut f=floor();f.tiles[2*9+3]=7;let mut g=scene(f,vec![],0);g.move_player(2);assert_eq!(g.player_x,2);
    }
    #[test]
    fn pits_without_a_lower_floor_are_fatal_even_in_practice_mode() {
        let mut f=floor();f.tiles[2*9+3]=5;let mut g=scene(f,vec![],3);g.move_player(2);
        assert_eq!(g.hp,0);assert_eq!(g.scene,state::RogueScene::GameOver);
    }
    #[test]
    fn stairs_and_pits_preserve_floor_state() {
        let mut a=floor();a.tiles[2*9+3]=7;a.tiles[2*9+4]=3;
        let mut b=floor();b.tiles[2*9+4]=4;
        let mut g=scene(a,vec![b],3);g.move_player(2);g.move_player(2);assert_eq!(g.depth,2);assert_eq!(g.inventory[5],2);
        g.move_player(1);g.move_player(2);assert_eq!(g.depth,1);assert!(g.map[2][3]==state::TileType::OpenDoor);
        let mut a=floor();a.tiles[2*9+3]=5;let mut g=scene(a,vec![floor()],3);g.move_player(2);assert_eq!(g.depth,2);assert_eq!(g.scene,state::RogueScene::Playing);
    }
    #[test]
    fn rejects_bad_maps() {let mut f=floor();f.tiles[0]=0;assert!(validate(&f).is_err());}
}

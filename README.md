# Dungeon Studio

マップを描き、Markdown に保存し、そのまま2D／3Dのダンジョンで遊ぶブラウザーアプリです。

床・壁・鍵付き扉・落とし穴・階段を描き、開始地点・出口・敵・鍵・メモを配置できます。シード指定の迷宮生成、最大10フロア、Markdown の保存と読み込みに対応します。ゲームの移動・戦闘・状態管理には [rustgames の DUNGEON//LOAD](https://github.com/oosawak/rustgames) を使っています。

## World / Town / Dungeon

- **World Studio** (`web/world.html`): 草地・森・水辺・山・道を描き、町や複数のダンジョンを配置します。
- **Town Studio** (`web/town.html`): 道や建物を配置し、「＋家の部屋」で建物内のマップを作れます。
- **Dungeon Studio** (`web/index.html`): ダンジョン・部屋・地下階層を編集します。

World Studio の初期サンプルは「ワールド → 町 → 家・店」と2つのダンジョンを接続しています。「場所」の一覧で編集対象を切り替えます。別スタジオへのナビゲーションは新しい編集画面を開くため、切り替える前に Markdown を保存してください。

ゲームでは入口に隣接し **E** または画面下の入口ボタンで入ります。外へ出る入口、または試作用の「前の場所へ戻る」ボタンで戻れます。以前の場所のプレイヤー位置・開けた扉・鍵の取得状態・敵の状態を保持し、HP・MP・鍵・所持品・装備・経験値を引き継ぎます。これらの進行はページを閉じると失われます。

建物や町の3D表示は単純な形状を用いた試作です。NPC会話・売買・宿泊などの町の生活機能はまだありません。

## 遊び方

1. エディターでマップを編集するか「新しい迷宮を生成」を押します。
2. 必要なら「下の階を追加」を押します。接続階段が自動で配置されます。
3. 「2D / 3D で遊ぶ」を押します。
4. ゲーム画面右上のボタンで2D／3Dを切り替えます。

- 矢印 / WASD: 移動
- Z: 装備した武器で攻撃
- X: 前方へジャンプ
- C: 剣で防御
- 1〜4: 武器切り替え
- 青い出口: クリア

鍵付き扉は、ぶつかると鍵1個を消費して開きます。開始時の鍵は既定で3個、エディターで0〜99個に設定できます。配置した鍵は踏むと拾います。開けた扉と取得済みの鍵、敵の状態は階を移動しても保持します。

下り／上り階段は隣接するフロアへ接続します。落とし穴は下の階の開始地点へ転落し、下の階がないと無敵設定でもゲームオーバーになります。階段がない場合は接続先の開始地点へ移動します。

初期設定は無敵の練習モードです。`NO DAMAGE` ボタンで通常の戦闘に切り替えられます。

## 保存形式

`mindzj-scene` コードブロックに編集用 JSON を格納した `.md` ファイルを保存します。読み込んだ Markdown のブロック外の文章は、再保存時にも保持します。

- `cells`: 地形の行配列（`#` 壁、`.` 床、`+` 鍵付き扉、`O` 落とし穴、`>` 下り階段、`<` 上り階段、`g` 草地、`f` 森、`~` 水辺、`^` 山、`=` 道）
- `entities`: `spawn` / `exit` / `enemy` / `key` / `note` / `portal`
- `initialKeys`: 開始時の鍵の数
- `mapKind`: `world` / `town` / `dungeon` / `interior`
- `linkedMaps`: IDとシーンを持つ接続先の一覧（31件まで）。入口は `portal` 配置物の `target` で接続します。`$return` は入ってきた場所です。
- `lowerFloors`: 地下のフロア配列。ルートの地形が1F、配列の先頭がB1Fです。

保存ファイルには敵配置やメモを含みます。ゲーム進行のセーブ機能はまだありません。エディターから試遊する際は、シーンを URL のフラグメントで渡します。

扉と鍵を考慮した完全な攻略可能性の判定はまだありません。試遊前には、落とし穴を避けた同じ階の出口への地形上の接続を確認します。

## ローカル実行

Node.js 22 以降と Python 3 を用意し、次を実行します。npm の依存インストールは不要です。

```sh
npm test
npm run serve
```

http://127.0.0.1:8769/ を開いてください。WASM と JavaScript モジュールを使うため、`file://` では動作しません。別のプロセスがポートを使っている場合は、Python のポート番号を変更してください。

## ブラウザー検証

Playwright を開発用に導入し、ローカルサーバーの起動後に実行します。

```sh
npm install --no-save playwright
npx playwright install chromium
node scripts/playtest.mjs
```

`DUNGEON_STUDIO_URL` で対象 URL を変更できます。画像や保存ファイルは一時フォルダーへ出力します。

## Rust/WASM の再ビルド

ビルド済みの WASM を同梱しています。ソースを変更した場合は再ビルドしてください。

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.120 --locked
npm run build:wasm
cargo test --manifest-path runtime/Cargo.toml --locked
```

`runtime/Cargo.lock` で依存関係を固定しています。

## GitHub Pages

`.github/workflows/pages.yml` が `main` への push 時に JavaScript テストを実行し、`web/` を Pages へデプロイします。リポジトリの Settings → Pages で Source を GitHub Actions に設定してください。

## 構成

- `web/index.html`, `studio.js`, `studio.css`: 独自のマップエディター
- `web/scene-format.js`: Markdown 保存形式・検証・迷宮生成
- `web/campaign.js`: 町・ワールド・建物内の生成と接続サンプル
- `web/play.html`, `ui.js`, `engine.js`: dungeonload をもとにした試遊画面
- `runtime/src/mindzj.rs`: シーンの読み込みと検証
- `runtime/src/state.rs`: ゲーム状態・鍵・扉・フロア移動
- `web/licenses/`, `NOTICE.md`: 利用素材の表記

コードは MIT、素材・フォントはそれぞれのライセンスに従います。[NOTICE.md](NOTICE.md) を参照してください。

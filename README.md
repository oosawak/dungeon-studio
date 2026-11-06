# Dungeon Studio

**[Markdown CMS](https://github.com/oosawak/markdown-cms-oss) × [RUSTGAMES](https://github.com/oosawak/rustgames)**

表示フォントには [でんきチップ（DenkiChip）](https://github.com/hicchicc/x8y12pxDenkiChip) を使用しています。

マップを描き、Markdown に保存し、そのまま2D／3Dのダンジョンで遊ぶブラウザーアプリです。

床・壁・鍵付き扉・落とし穴・階段を描き、開始地点・出口・敵・鍵・メモを配置できます。シード指定の迷宮生成、最大10フロア、Markdown の保存と読み込みに対応します。ゲームの移動・戦闘・状態管理には [rustgames の DUNGEON//LOAD](https://github.com/oosawak/rustgames) を使っています。

## 開発状況・Macでの再開

**2026-11-06時点の作業途中のスナップショットです。** 最新の実装、確認済み事項、既知の問題とMacでの起動方法は [引き継ぎメモ](docs/HANDOFF.md) を参照してください。Macでの引き継ぎ検証は [検証レポート](docs/REPORT-2026-11-06-MAC.md) を参照してください。町の基本編集とFPS/TPSの基本操作はChromeで確認済みです。

- [World Studio](https://oosawak.github.io/dungeon-studio/world.html)
- [Town Studio](https://oosawak.github.io/dungeon-studio/town.html)
- [Dungeon Studio](https://oosawak.github.io/dungeon-studio/)
- [FPS Studio（実験版）](https://oosawak.github.io/dungeon-studio/fps.html)

## World / Town / Dungeon

- **World Studio** (`web/world.html`): 草地・森・水辺・山・道を描き、町や複数のダンジョンを配置します。
- **Town Studio** (`web/town.html`): 建物ツールで敷地を囲むと建物と室内マップを作成します。大きさ・向き・屋根・高さを編集できます（Chromeで基本編集のブラウザー検証済み）。
- **Dungeon Studio** (`web/index.html`): ダンジョン・部屋・地下階層を編集します。

World Studio の初期サンプルは「ワールド → 町 → 家・店」と2つのダンジョンを接続しています。「場所」の一覧で編集対象を切り替えます。別スタジオへのナビゲーションは新しい編集画面を開くため、切り替える前に Markdown を保存してください。

ゲームでは入口に隣接し **E** または画面下の入口ボタンで入ります。外へ出る入口、または試作用の「前の場所へ戻る」ボタンで戻れます。以前の場所のプレイヤー位置・開けた扉・鍵の取得状態・敵の状態を保持し、HP・MP・鍵・所持品・装備・経験値を引き継ぎます。これらの進行はページを閉じると失われます。

建物や町の3D表示は単純な形状を用いた試作です。NPC会話・売買・宿泊などの町の生活機能はまだありません。

## FPS Studio（作業途中）

[INKBOUND](https://github.com/oosawak/INKBOUND) のMITコードをもとに、町やダンジョンを取り込む別画面を追加しました。エディターの「FPS / TPS で遊ぶ」から開きます。WASD移動、マウス視点、Spaceジャンプ、Shiftダッシュ、Ctrlスライド、Eグラップル、Rリロード、V視点切り替えの実装があります。

**Chromeで町・ダンジョンの読み込み、マウス固定、移動、ジャンプ、射撃、リロード、FPS/TPS切り替え、一時停止を確認済みです。** 疾走・スライド・グラップルは今回の検証対象外です。 dungeonloadとは別ランタイムで、鍵・扉・階層移動・dungeonloadとの戦闘状態の共有は未接続です。トゥームレイダーのような壁登り・縁につかまる動作やアニメーションも未実装です。

入口は青い枠で表示されます。近づいて **F** を押すと家・町・ダンジョンへ移動し、室内の「外へ戻る」入口で帰還できます。帰還時は場所ごとの位置と視点、敵・弾痕・Waveを復元し、HP・弾薬・スコアとFPS/TPSの選択を引き継ぎます。この状態はFPS内でページを開いている間だけ保持します。

実装と検証の詳細は [FPS出入りレポート](docs/REPORT-2026-11-06-FPS-TRAVEL.md) を参照してください。

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

`dungeon-scene` コードブロックに編集用 JSON を格納した `.md` ファイルを保存します。読み込んだ Markdown のブロック外の文章は、再保存時にも保持します。

- `cells`: 地形の行配列（`#` 壁、`.` 床、`+` 鍵付き扉、`O` 落とし穴、`>` 下り階段、`<` 上り階段、`g` 草地、`f` 森、`~` 水辺、`^` 山、`=` 道）
- `entities`: `spawn` / `exit` / `enemy` / `key` / `note` / `portal`
- `buildings`: 建物の位置・幅・奥行き・向き・屋根・用途・名前・高さ。ゲーム用には占有セルを壁に変換します。
- `labels`: 地名の文字列・位置・サイズ・角度
- `initialKeys`: 開始時の鍵の数
- `mapKind`: `world` / `town` / `dungeon` / `interior`
- `linkedMaps`: IDとシーンを持つ接続先の一覧（31件まで）。入口は `portal` 配置物の `target` で接続します。`$return` は入ってきた場所です。
- `lowerFloors`: 地下のフロア配列。ルートの地形が1F、配列の先頭がB1Fです。

保存ファイルには敵配置やメモを含みます。ゲーム進行のセーブ機能はまだありません。エディターから試遊する際は、シーンを URL のフラグメントで渡します。

扉と鍵を考慮した完全な攻略可能性の判定はまだありません。試遊前には、落とし穴を避けた同じ階の出口への地形上の接続を確認します。

## シードとランダム生成

左側の「マップを生成」を開き、「ランダムに生成」を押すと新しいシードで生成します。シード欄に数値を入力して「選択中のマップを生成」を押せば同じ町を再現できます。Townでは川・道路・建物の位置、大きさ、屋根と高さがシードで変わります。「元に戻す」で生成前へ戻せます。スマホでも生成設定を開けます。

保存済みのMarkdownはそのまま読み込めます。新しい町の生成方法は、生成ボタンを押したときに使われます。

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
node scripts/playtest-campaign.mjs
node scripts/playtest-atlas.mjs
node scripts/playtest-fps-travel.mjs
node scripts/playtest-generation.mjs
```

インストール済みGoogle Chromeで実行する場合は、各コマンドに `PLAYWRIGHT_CHANNEL=chrome` を付けます。建物ボタンは強制クリックを使わず、4種類の画面サイズで検証します。

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
- `runtime/src/studio_scene.rs`: シーンの読み込みと検証
- `runtime/src/state.rs`: ゲーム状態・鍵・扉・フロア移動
- `web/licenses/`, `NOTICE.md`: 利用素材の表記

コードは MIT、素材・フォントはそれぞれのライセンスに従います。[NOTICE.md](NOTICE.md) を参照してください。

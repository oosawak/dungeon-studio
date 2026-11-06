# Codex引き継ぎメモ — 2026-11-06

> **2026-11-07更新:** 町のシードで川・街路・建物配置が変わるよう修正し、3エディターへランダム生成ボタンを追加。[町のシード検証レポート](REPORT-2026-11-07-TOWN-SEEDS.md) を参照。

> **Mac引き継ぎ後の更新:** [検証レポート](REPORT-2026-11-06-MAC.md) を先に参照してください。以下は引き継ぎ時点の履歴です。建物ボタンの通常クリック・町の基本編集・通常ゲームのマップ往復・FPS/TPSの基本操作はChromeで検証済みになりました。その後、FPS側の入口・出入りと場所ごとの状態保持を実装しました。[FPS出入りレポート](REPORT-2026-11-06-FPS-TRAVEL.md) が最新です。鍵・扉・階層とdungeonloadとの進行共有は引き続き未実装です。

このファイルは、別のMac・別のCodexセッションで作業を再開するための記録です。会話履歴の自動同期やCodex内部メモリーの転送を前提としません。

## 再開するCodexへの依頼

次の文を貼り付けてください。

> docs/HANDOFF.md と README.md を読んで、作業途中の開発を再開してください。まず町エディターで建物ツールをクリックできるか調べ、新UIのブラウザー検証を完了してください。次にFPS Studioの町・ダンジョン読み込み、移動、FPS/TPS切り替えを実操作で確認してください。未実装のゲーム連携は実装済みと扱わないでください。関連する別プロジェクトへの変更は不要です。

## Macで起動する

Node.js 22以降、Python 3、Gitを用意します。実行時のnpm依存はなく、ビルド済みWASMを同梱しています。最初からRust環境を入れる必要はありません。

```sh
git clone https://github.com/oosawak/dungeon-studio.git
cd dungeon-studio
npm test
npm run serve
```

- Dungeon: http://127.0.0.1:8769/
- World: http://127.0.0.1:8769/world.html
- Town: http://127.0.0.1:8769/town.html
- FPS/TPS: http://127.0.0.1:8769/fps.html

MacのCodexでcloneしたフォルダーをプロジェクトとして開きます。`file://`でHTMLを直接開かず、HTTPサーバー経由で確認してください。ブラウザーのローカルストレージを別PCへ移す必要はありません。編集データを移す場合はアプリから保存したMarkdownを読み込みます。未保存の編集中データやプレイ進行はGitには入りません。

必要なときだけブラウザーテスト環境を入れます。

```sh
npm install --no-save playwright
npx playwright install chromium
node scripts/playtest.mjs
```

既存のブラウザーテストは今回のUI変更前に作成されたため、現UIに合わせた見直しが必要です。Linux側の一時テスト・スクリーンショットはMacへ持ち越す前提にせず、リポジトリ内のテストを整備してください。

## 目的・合意事項

- Markdownに地図・町・ダンジョン・建物内のデータを保存し、それからゲームのシーンを作って遊べるようにする。
- ゲーム基盤はUnity/UE/Godotへの移行ではなく、Rust/WASMのrustgamesを活用する。
- dungeonloadには2D/3D切り替え。別のFPS StudioではINKBOUNDを活用し、町とダンジョンの両方を歩けるようにする。
- トゥームレイダーのような三人称探索にも関心がある。現段階はTPSカメラの試作で、クライミング実装済みではない。
- ワールドに複数のダンジョンと町、町に入れる家、ダンジョン内にも入れる建物、という接続を目指す。
- ユーザーから地図・町が参考アプリより大きく劣るとの指摘があり、見た目と編集性を改善中。現状で同等の完成度とは言えない。
- 購入ZIPのスタジオはオープンソースとみなさず、そのコード・素材を公開しない。独自実装と、ライセンスを確認したOSSを使う。
- このアプリは独立したプロジェクト。以前の母プロジェクトの名前をブランド・API・保存形式に戻さない。
- 表示は **Markdown CMS × RUSTGAMES**。でんきチップ（DenkiChip）フォントを使う。
- 最初はローカル作業だったが、その後独立リポジトリとGitHub Pagesでの公開が依頼された。今回も途中状態のpushが明示的に依頼された。

## 関連リンク

- このリポジトリ: https://github.com/oosawak/dungeon-studio
- 公開: https://oosawak.github.io/dungeon-studio/
- Markdown CMS: https://oosawak.github.io/markdown-cms-oss/
- Markdown CMS Git: https://github.com/oosawak/markdown-cms-oss
- Rustgames Git: https://github.com/oosawak/rustgames
- 元のdungeonload: https://oosawak.github.io/rustgames/play/dungeonload/index.html
- INKBOUND: https://github.com/oosawak/INKBOUND （MIT）
- デザイン参考として共有された商品: https://kiin.booth.pm/items/9075432 （ライセンス許諾を推定しない）

## 以前の版で確認済みの機能

- 独自の迷宮生成とMarkdown保存・読み込み、本文の保持。
- dungeonloadへのシーン読み込み、2D/3D切り替え。
- 扉は鍵を1個消費して開く。初期鍵は既定3個、0〜99で設定。鍵アイテムを拾える。
- 地下階層、階段、落とし穴。下の階がなければ落下はゲームオーバー。
- ワールド→町→家・店、複数ダンジョンの接続。
- 移動先から戻る操作、場所ごとの扉・鍵・敵状態の保持、HP等の引き継ぎ。
- Rustの既存テスト5件と以前のブラウザー試験は通過済み。ただし今回変更後の全体動作の保証ではない。

## 今回追加した実装（検証途中）

- World: 80×52の地形、海岸の輪郭、森の木々、山、道、地名、コンパス等をCanvasで描画。独自の手続き的な図形で、購入素材は使っていない。
- Town: 56×40、川・通り・広場と16棟のサンプル。建物の実寸、大きさ・回転・屋根・名前・高さのデータを追加。
- 建物を囲んで作成すると室内マップと入口を作成。移動時には入口も追従する実装。
- 3ペインUI、地形ブラシ、地名編集、選択・移動、拡大、PNG書き出し、履歴操作。
- 保存形式に`buildings`と`labels`を追加。既存Markdownには空配列を補う。
- ゲーム読み込み時は建物の占有セルを壁へ変換。通常2Dゲームの屋外描画に地図の絵を利用し、3Dでは建物モデルを生成する変更。
- INKBOUNDベースの`fps.html`、町とダンジョンのジオメトリ取り込み、VでFPS/TPS切り替え、簡易キャラクター、追従カメラ。
- サンプルの接続先は5件から19件へ増えた。モデルテストの件数期待値も更新。

## 直近の検証結果・問題

- 新しいWorld/Town画面をブラウザーで表示し、スクリーンショットで配置・描画を確認した。
- Canvasの初回描画前にフォント読み込みを待たず日本語が欠けたため、`document.fonts.ready`後に再描画する修正を追加した。川の色も修正したが、最終版の再撮影は未完了。
- **PlaywrightがTownの`[data-tool="building"]`クリックで「visible, enabled and stable」待機のまま30秒でタイムアウトした。** DOM上にボタンは存在する。実ユーザー操作にも問題があるか、画面レイアウトやアニメーション、テスト環境の問題かは未特定。強制クリックで試験だけ通す前に原因を確認すること。
- このタイムアウトにより、建物の作成・プロパティ編集・ドラッグ・PNGダウンロード・FPSへの遷移・実ポインターロック・移動・射撃・TPS切り替え・ダンジョンFPSの連続試験は未完了。実装はあるが「動作確認済み」と表示しない。
- 新UIでは生成設定等が折りたたまれる。既存ブラウザーテストのボタン名・座標・サンプルマップの寸法・家追加操作の前提は古い。
- 今回、JS単体テストはサンプル接続数`19 !== 5`のみ失敗していたため、現在のサンプル仕様に更新。修正後の`npm test`は全5件通過。`git diff --check`も通過。
- **FPSとdungeonloadは別ランタイム。** FPS側に鍵・扉・階層移動・家への出入り・共有進行をまだ接続していない。ダンジョンの穴の扱いもFPS固有で、dungeonloadと同一ルールではない。
- NPC会話・売買・宿泊、進行セーブ、壁登り・縁へのつかまり、滑らかな全身アニメーションは未実装。
- `flat`屋根指定は2D側では主に色違いのままで、正確な平屋根表現は今後の改善対象。

## 次に進める順番

1. Town建物ツールの通常クリックが安定するか再現し、原因を直す。
2. 建物作成→サイズ・回転・高さ変更→移動→入口と室内の同期→Markdown保存/再読込→PNG出力を通しで確認する。
3. 通常ゲームのワールド→町→家→戻る、別ダンジョンへの移動、2D/3D、建物衝突を新しい寸法で再検証する。
4. FPSのマウスロック、移動・ジャンプ・射撃・V切り替えと町/ダンジョン表示を確認する。
5. 意味のあるモデルテスト（建物占有セル・入口の整合・保存往復）と現UIのブラウザーテストをリポジトリに残す。
6. FPS側の出入り・扉・階層・進行共有の設計を進め、その後TPS探索の段差・つかまり等を検討する。

## ファイル案内

- `web/scene-format.js`: Markdownのスキーマ、正規化、検証、ゲーム用変換。
- `web/campaign.js`: ワールド・町・室内生成と接続サンプル。
- `web/settlements.js`: 建物配置、実寸、入口座標、重なり判定。
- `web/cartography.js`: 海岸線・森・山・建物・地名の独自Canvas描画。
- `web/studio.js`, `studio.css`, `world.html`, `town.html`, `index.html`: 編集UI。
- `web/atlas-runtime.js`: 通常ゲームの屋外2D描画・3D建物生成。
- `web/play.html`: dungeonloadの試遊と接続マップ遷移。
- `web/fps-stage.js`, `fps.html`: FPS/TPS試作。
- `runtime/src/studio_scene.rs`, `state.rs`: Rust読み込み、鍵・扉・階層など。
- `web/tests/scene-format.test.mjs`: Node単体テスト。
- `scripts/playtest*.mjs`: 以前のブラウザーテスト。現UIへの更新が必要。
- `NOTICE.md`, `web/licenses/`: 元コード・フォント・素材のライセンス。

## 配布・ビルド注意

GitHub Actionsが`main`へのpush後、JS/Rustテストを実行し`web/`をPagesへ配布する。push完了とPages配布完了は別なのでActionsの結果を確認する。

Rustソース変更時のみWASM再ビルドが必要。MacではREADMEの手順で`wasm32-unknown-unknown`と`wasm-bindgen-cli 0.2.120`を入れる。Linux用の一時パスやバイナリーをMacへコピーしない。

購入ZIPや展開フォルダー、元の開発ワークスペース、ブラウザー検証の一時ファイルはこのリポジトリに含めない。このリポジトリだけでclone・起動できる状態を維持する。

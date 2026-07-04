# Project Notes for Claude

## Git 運用ルール

- リモート: https://github.com/KazuneSan/golf-score-app (master ブランチ)
- **意味のある単位ごとにコミットする**(画面1つ、バグ修正1件など)。まとめて巨大コミットにしない
- 破壊的な変更・大規模リファクタの前には必ずコミットしておく(ロールバック可能に)
- リリース節目には `git tag` を打つ(例: v0.1.0-baseline)
- `.scrape-cache/` はコミット禁止(271MB、.gitignore 済み)

## データのキー規約(重要・バグ再発防止)

challenges.js の課題キー(`ob-tee`, `putt-1m-100` 等)が唯一の真実。
`'second'` `'tee-dir'` `'putt'` などの旧キーは v0.1.0 で全廃済み。
**challengeKey を参照するコードを書くときは、必ず ALL_CHALLENGES に実在するキーか確認すること**
(存在しないキーでも silent に空配列が返るだけでクラッシュしないため、発見が遅れる)。
ドリルテストの合格条件は drillDetails.js の `pass.text` から DrillTestScreen が自動導出する
(球数・合格%をパース)。新ドリル追加時は pass.text を「10球中 8球…」「5球連続…」の書式にする。

## ドリル・アニメーション制作の重要ルール

新しいドリル・アニメーション(straight, over, eyesclosed, metronome, onehand 等)を作るときは、**実装に着手する前に必ず**以下の順で読むこと:

1. `docs/animation-design-rules.md` — 視覚言語・モーション原則・失敗パターン集
2. `docs/drill-template.md` — 仕様シート(これを埋めずにコードに行かない)
3. `src/components/drillPrimitives.js` — 共有プリミティブ + テーマ + タイムライン
4. `src/components/GateDrillAnimation.js` — 参照実装(完成形)

### アーキテクチャ要点

- 全ドリルは **viewBox `0 0 720 800`** を使う(キャンバス統一)
- プリミティブは必ず **`drillPrimitives.js`** から import する(GateDrillAnimation から import しない)
- 新規プリミティブ(カップ、フープ、リング、定規等)が必要なら drill 固有ファイルに書かず、必ず `drillPrimitives.js` に追加する
- DrillDetailScreen の `diagramBody` は drill 名で aspectRatio を切り替える:
  ```jsx
  drill.setup === '[name]' && { aspectRatio: 720 / 800 }
  ```
  これを忘れるとカード左右に余白が出て絵が小さくなる(ゲートで実証済み)

**重要**: 上記の体系を読まずに新しいアニメーションを作ると、同じ修正を5〜10回繰り返すことになる(ゲートドリルの実例)。設計時に正しい意思決定をするコストの数倍以上の修正コストがかかる。

## 現状の参照実装

- **`src/components/GateDrillAnimation.js`** — gate variant の完成形シネマティックアニメ(top / setup 両ビュー)
- **`src/components/drillPrimitives.js`** — GolfBallTopDown / GolfTee / MalletPutter / DimensionLabel / StreakHUD / CheckBadge / CaptionOverlay / useDrillTimeline / easing
- `src/screens/DrillDetailScreen.js` の旧 `CinematicGateScene` (Animated API 版) は **deprecated** — `_unusedCinematicGateScene_DELETED` としてプレースホルダだけ残してあるが、参照は禁止

## コースデータ運用

ゴルフ場データの取得・管理に関する戦略・法的整理・将来の TODO は **`docs/data-strategy.md` に集約済み**。以下のタイミングで必ず参照すること:

- **新しいエリアのコースデータを集める時** → Phase 1 戦略に従う
- **ユーザーリクエスト機能を実装する時** → Phase 2 のアーキテクチャ参照
- **商用化や有料化を検討する時** → Phase 4 の法務確認 TODO 必須実行

スクレイパー本体は `scripts/scrape_courses.py`、使い方は `scripts/README.md`。

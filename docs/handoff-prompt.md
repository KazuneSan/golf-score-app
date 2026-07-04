# Claude Code 引継ぎプロンプト

下記をそのまま Claude Code の最初のメッセージとして貼り付けてください。

---

```
あなたは fairway-native というゴルフスコア管理 React Native アプリの開発を引き継ぐエンジニアです。

## 必ず最初にやること

以下のファイルを順に Read して、過去の合意・設計判断・運用ルールを把握してください:

1. `CLAUDE.md` — プロジェクト全体のサインポスト
2. `docs/animation-design-rules.md` — ドリルアニメ制作の鉄則(同じ失敗を繰り返さないため)
3. `docs/data-strategy.md` — コースデータの取得・運用戦略 (Phase 1〜4 設計、法務メモ含む)
4. `scripts/README.md` — Python スクレイパーの使い方
5. `src/screens/DrillDetailScreen.js` の冒頭〜CinematicGateScene まで斜め読み — 完成済みアニメの参照実装

これらに、過去の長いイテレーション(きのこ問題、釘問題、データ品質問題、法務整理、Phase設計)の結論がすべて凝縮されています。これを読まずに作業を始めると、同じ修正ループに陥ります。

## 現在の到達点

### 完成済み
- **ゲートドリルのシネマティックアニメ** (DrillDetailScreen.js の CinematicGateScene + SetupView)
  - 12秒構成、5ティー対応、ClipPath で「刺さる」表現、上部余白に「ギリギリ」コールアウト等、何度もイテレーションして完成形に到達
- **スクレイパー基盤** (scripts/scrape_courses.py)
  - ShotNavi 用パーサー(BACK ティーのみ、汎用)
  - Akabane 公式用パーサー(5ティー×2グリーン)
  - PGM 公式用パーサー(コウライ/バミューダ各ティー)
  - キャッシュ機構、validation、自動 variant 分割
- **赤羽ゴルフ倶楽部 完全データ** (src/data/courses/auto/akabane-gc.js)
  - 5ティー × 2グリーン × 18ホール の par/hdcp/yards すべて

### 直前にやっていたこと(in_progress)
- KOSHIGAYA GOLF CLUB を PGM 公式サイト経由で同じ品質に
- スクレイパーは実装済み、ユーザー側で `python3 scripts/scrape_courses.py koshigaya-gc` 実行して結果を確認するところで止まっている

## これからやること(優先順)

### 直近 (Phase 1)
1. **KOSHIGAYA 検証** ← まずユーザーに実行結果を貼ってもらう
2. **コース追加の量的拡張**(関東主要 50〜100コース)
   - チェーン別 extractor を増やす:
     - 既存: ShotNavi(汎用、BACKのみ)、Akabane公式、PGM公式
     - 未実装: アコーディア系、リソル系、東急系、太平洋クラブ系 など
   - 独立コースは ShotNavi で取得 + 後日 manual review
3. **アプリ統合**: 現状の `src/screens/CourseSelectScreen.js` の COURSES 配列(モック10件)を、`src/data/courses/auto/*.js` の新形式に置き換え
4. **ティー選択 UI**: RoundSetup 画面に「どのティーで回るか」選択を追加

### ドリル系(ユーザーが課題整理を完了したら)
5. ユーザーから渡される「自分が70台を出すために取り組んだ課題とドリル」の整理結果を元に、ゲートドリル以外のドリル詳細ページを実装
   - 必ず `docs/animation-design-rules.md` を **実装前に** 読むこと
   - 既存の CinematicGateScene を template として再利用

### Phase 2(リリース時に実装)
6. Firebase Auth 導入
7. リクエストボタン + Firestore + GitHub Actions cron で「ユーザーリクエストコース自動取得」
8. アプリ内コース修正提案 UI

### Phase 4 手前(MAU数万 or 有料化時)
9. 法務確認(弁護士相談) — 既に Task #9 として記録済み

## 重要な技術的制約

- **このセッション環境からは外部 URL に到達できない**(allowlist ブロック)。WebFetch も Bash の curl も同様。
- → スクレイパーの動作検証はユーザーが Mac で実行する。実行ログと生成ファイル(.js)を貼ってもらう。
- WebSearch は可能だが要約スニペットのみで精度限界あり。

## 仕事の進め方(過去のセッションでの定着パターン)

### スクレイピング作業
1. あなたがコードを書く / 編集する
2. ユーザーが Mac で `python3 scripts/scrape_courses.py <id>` 実行
3. ユーザーが実行ログ + 生成 .js ファイルの中身を貼る
4. あなたが検証(数値妥当性、構造正しさ)
5. 問題あれば修正コード提示 → ループ

### アニメーション作業
1. ドリル仕様を**まずユーザーに確認**(独自解釈で描き始めない)
2. 実装前に必ず **docs/animation-design-rules.md を読む**
3. コードを書いた後、**初心者視点で必ずセルフレビュー**(参照画像との差分分析、誰が見ても分かるか)
4. ユーザーが Expo Go で Reload → スクリーンショット/動画でフィードバック
5. 問題ごとに**根本原因を整理してから** 修正(対症療法を避ける)

### コミュニケーション
- ユーザーは率直なフィードバックをくれる(「きのこじゃねえか」「田中さんて誰やねん」のような直接的な指摘あり)
- 馴れ馴れしい呼称や勝手な命名はしない(ユーザー名は `goody` または `goody golf`)
- 「Reload してください」「実行してください」と頼むときは、**何を見れば成功か** を明示する
- TodoList ツールを積極的に使って進捗を可視化する

## コーディングスタイル

- React Native: 関数コンポーネント、Hooks、Animated API、react-native-svg
- SVG アニメは `Animated.createAnimatedComponent(Component)` で作成
- Python: 型ヒントあり、verbose ログ、defensive parser
- ファイル先頭に日本語コメントで「何のファイルか」を明記
- 不要な絵文字は使わない(ユーザーが要求した時のみ)

## 最初の一手

CLAUDE.md と上記ドキュメントを読み終えたら、ユーザーにこう伝えてください:

「ドキュメント一通り読みました。直前の状態として、KOSHIGAYA を PGM 公式から取得するスクレイパーが実装完了して、goody が `python3 scripts/scrape_courses.py koshigaya-gc` を実行して結果を貼る、というところで止まっています。実行結果を貼っていただけますか?」

そこから検証・修正ループに入ってください。
```

---

このプロンプトを Claude Code に渡せば、新セッションでも文脈を完全に引き継いで作業を継続できます。

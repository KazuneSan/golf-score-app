# Course Verification Strategy

最終更新: 2026-05-21

## 目的

全国のゴルフ場データを増やすときに、単に「取れた」だけでなく、
別ソースに当てて「合っていそうか」を評価しながら採用するための運用設計。

この設計では、取得と検証を分ける。

- 取得: データをできるだけ広く集める
- 検証: 別ソースとの整合性を見て採用可否を決める

## 前提

- 全国のゴルフ場数は `2,163` コース
- 取得済みデータは `PGM / Accordia / 赤羽GC` が中心
- 既存の比較器は `scripts/audit_course.py`
- 既存の回帰チェックは `scripts/check_scraper_regressions.py`

## 基本方針

### 1. 全国台帳を先に持つ

全国カバーを進めるときは、先に「何が未収録か」を管理する。

推奨する母集団ソース:

- `ShotNavi`
- `楽天GORA`
- `GDO`
- 公式サイト一覧

最低限、台帳には次を持たせる。

- `canonical_id`
- `display_name`
- `prefecture`
- `source_registry`
- `official_url`
- `status`

`status` 例:

- `missing`
- `collected`
- `audited`
- `review_required`
- `adopted`

### 2. 取得ソースと検証ソースを分ける

同じサイトだけを見て採用しない。

推奨優先順位:

1. 公式レイアウト
2. 公式スコアカード PDF
3. 予約サイト系
4. ガイド系

### 3. 採用はランク制にする

各コース or variant に対して検証ランクを付ける。

- `A`: 公式ソース一致
- `B`: 非公式 2ソース以上で一致
- `C`: 1ソースのみで暫定採用
- `R`: 差分あり、要確認

## 推奨ファイル構成

```text
docs/
  course-verification-strategy.md

data/
  course-registry/
    master_courses.json
    source_links.json
    audit_results/
      <course-id>.json
```

既存 repo に寄せるなら、まずは `scripts/` 配下に置いてもよい。

```text
scripts/
  audit_course.py
  audit_pgm_gora_batch.py
  check_scraper_regressions.py
  verify_registry_schema.md
```

## 台帳スキーマ案

`master_courses.json` では、全国の母集団を 1 レコード 1 クラブで持つ。

```json
{
  "id": "registry-000001",
  "displayName": "サンプルゴルフクラブ",
  "prefecture": "千葉県",
  "city": "サンプル市",
  "officialUrl": "https://example.com",
  "candidateSources": [
    {
      "source": "shotnavi",
      "url": "https://shotnavi.jp/..."
    },
    {
      "source": "rakuten_gora",
      "url": "https://booking.gora.golf.rakuten.co.jp/..."
    }
  ],
  "scrapedCourseId": "accordia-tsuchiura",
  "status": "audited"
}
```

## 正規化スキーマ

比較前に、すべてのソースをいまの出力形式に寄せる。

```json
{
  "parentClubName": "サンプルゴルフクラブ",
  "variant": "西 / Aグリーン",
  "totalPar": 36,
  "tees": [
    {"id": "blue", "label": "BLUE", "totalYards": 3448}
  ],
  "holes": [
    {
      "no": 1,
      "par": 5,
      "hdcp": 7,
      "yards": {"blue": 529, "white": 506}
    }
  ],
  "source": "official"
}
```

## 検証ステップ

### Step 1. variant 対応付け

まず比較対象を同じ粒度にそろえる。

見るもの:

- `OUT / IN`
- `東 / 西 / 南`
- `A / B グリーン`
- `ベント / 高麗`

完全自動で難しい場合は、対応候補スコアを出してレビュー対象に回す。

### Step 2. ティー名正規化

既存の `audit_course.py` に近いルールで統一する。

例:

- `Blue / 青 / ブルー -> blue`
- `Gold / 金 / ゴールド -> gold`
- `Ladies / Pink -> 個別保持`

### Step 3. 項目別比較

比較優先度:

1. `holes 数`
2. `par`
3. `hdcp`
4. `yards`
5. `totalYards`

判定ルール:

- `par`: 完全一致必須
- `hdcp`: 原則一致、差分は `review`
- `yards`: ホール単位で比較
- `totalYards`: ティー単位で比較
- `variant 数`: 構造差として記録

### Step 4. 差分分類

- `value_match`
- `structure_mismatch`
- `official_conflict`
- `missing_variant`
- `missing_tee`
- `missing_yards`

### Step 5. 採用判定

- `A`: 公式と一致 -> 自動採用
- `B`: 公式なし、独立 2 ソース一致 -> 自動採用
- `C`: 1 ソースのみ -> 暫定採用
- `R`: 差分あり -> 保留

## 既存スクリプトへの落とし込み

### `scripts/audit_course.py`

今の比較器に追加したいもの:

- `--current-source official|output|scraper`
- `--reference-source gora|shotnavi|gdo|official_pdf`
- `--emit-rank`
- `--emit-json-report /path/to/report.json`

出力例:

```json
{
  "courseId": "pgm-40",
  "rank": "R",
  "summary": {
    "matchedVariants": 3,
    "missingVariants": 0,
    "valueDiffs": 1
  },
  "diffs": [
    {
      "type": "official_conflict",
      "variant": "中コース",
      "hole": 2,
      "field": "hdcp",
      "current": 3,
      "reference": 8
    }
  ]
}
```

### `scripts/check_scraper_regressions.py`

役割は継続。

- パーサが壊れていないか
- 既知の例外が崩れていないか

ただし全国化では、これに加えて「別ソース整合」も必要。

### 新規であると良いもの

- `scripts/build_course_registry.py`
  - 全国母集団を構築
- `scripts/audit_batch.py`
  - 複数コースをまとめて比較
- `scripts/report_audit_status.py`
  - `A/B/C/R` 件数を集計

## 実運用フロー

### フローA: 新しいコースを追加するとき

1. 台帳に追加
2. スクレイプ
3. 正規化
4. 別ソースと比較
5. `A/B/C/R` を付与
6. `A/B/C` だけ採用、`R` は保留

### フローB: 既存データを監査するとき

1. 既存 `src/data/courses/auto/*.js` を読む
2. 参照ソースを取る
3. `audit_course.py` で比較
4. `audit_results/<course-id>.json` に保存

## まず着手すべき実装順

1. `docs/course-coverage.md` を最新化する
2. `master_courses.json` の最小スキーマを作る
3. `audit_course.py` に `rank` と `json report` を追加する
4. `audit_batch.py` を作る
5. `A/B/C/R` 集計レポートを出す

## 今の repo での現実的な最初のゴール

最初から全国 `2,163` コース全部を高品質にするのではなく、まずは:

- 取得済み `309` コースに `A/B/C/R` を付ける
- 未収録県 `5県` を埋める候補ソースを決める
- 新規追加コースから必ず `audit_results` を残す

これができると、全国化しても品質管理が破綻しにくい。

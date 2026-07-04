# Golf Course Scraper

ゴルフ場のホール情報(par / yards / hdcp など)を Web から取得して、
アプリ側で使える JS データファイルとして書き出すツール。

## 必要環境

- Python 3.9 以上(macOS にプリインストールされているもので OK)
- インターネット接続(ShotNavi 等にアクセスする)

## 初回セットアップ(一度だけ)

ターミナルを開いて、プロジェクトのルートに移動:

```bash
cd ~/Documents/fairway-native
```

依存パッケージをインストール:

```bash
pip3 install -r scripts/requirements.txt
```

`pip3 not found` と言われたら:

```bash
python3 -m pip install -r scripts/requirements.txt
```

## 実行方法

### 全コース(設定ファイルにあるもの全部)を取得

```bash
python3 scripts/scrape_courses.py
```

### 特定のコースだけ取得

```bash
python3 scripts/scrape_courses.py akabane-gc
python3 scripts/scrape_courses.py koshigaya-gc
```

### キャッシュを無視して再取得(HTML が更新されたとき)

```bash
python3 scripts/scrape_courses.py --force
```

### 設定済みコース一覧を見る

```bash
python3 scripts/scrape_courses.py --list
```

## 出力

スクレイプに成功すると `src/data/courses/auto/<course-id>.js` に書き出されます:

```
src/data/courses/auto/
├── akabane-gc.js     # 赤羽 A/B グリーン分割
└── koshigaya-gc.js   # KOSHIGAYA 高麗/バミューダ分割
```

各ファイルには以下のような JS が入る:

```js
export const COURSES = [
  {
    "id": "akabane-gc-a",
    "parentClubId": "akabane-gc",
    "parentClubName": "赤羽ゴルフ倶楽部",
    "name": "赤羽ゴルフ倶楽部 - Aグリーン",
    "variant": "Aグリーン",
    "kana": "あかばねごるふくらぶ",
    "prefecture": "東京都",
    "city": "北区",
    "totalPar": 72,
    "totalYards": 6199,
    "holes": [
      { "no": 1, "par": 4, "yards": 375, "hdcp": 9 },
      ...
    ],
    "tees": [...]
  },
  ...
];
```

## 出力検証

スクリプトは取得後に自動チェックします。問題があると `⚠` 付きで警告を出します:

- ホール数が18じゃない
- 合計Parが68〜74の範囲外
- PAR3で260Y超(物理的にあり得ない)
- PAR4で230Y未満や500Y超
- PAR5で440Y未満
- HDCP(ハンディキャップ)に重複

警告が出た場合は出力された JS ファイルを目で確認して、必要なら手で修正するか、
`scripts/scrape_courses.py` の parser を調整してから再実行してください。

## 監査

別ソースの JSON / 生成済み JS / HTML と突き合わせて、ホール単位の差分を出せます。

全国化と検証フローの全体設計は [docs/course-verification-strategy.md](/Users/takahashikazune/Documents/fairway-native/docs/course-verification-strategy.md) に整理しています。

### 使い方

```bash
python3 scripts/audit_course.py accordia-tsuchiura \
  --reference-file /path/to/reference.json
```

楽天GORA のコース情報URLをそのまま参照にすることもできます:

```bash
python3 scripts/audit_course.py pgm-64 \
  --from-output \
  --reference-url 'https://booking.gora.golf.rakuten.co.jp/guide/course_info/disp/c_id/120149'
```

生成済み `src/data/courses/auto/<course-id>.js` を現在値として比較したい場合:

```bash
python3 scripts/audit_course.py accordia-tsuchiura \
  --from-output \
  --reference-file /path/to/reference.json
```

現在のスクレイプ結果を参照用 JSON として吐き出したい場合:

```bash
python3 scripts/audit_course.py accordia-tsuchiura \
  --reference-file /path/to/reference.json \
  --dump-current /tmp/accordia-tsuchiura.current.json
```

### 参照ファイル形式

- 生成済み JS: `export const COURSES = [...]`
- 楽天GORA HTML: `https://booking.gora.golf.rakuten.co.jp/guide/course_info/disp/c_id/...`
- JSON 配列: `[ { ...entry... }, ... ]`
- JSON オブジェクト: `{ "entries": [ ... ] }`
- 単一エントリ JSON: `{ "id": "...", "holes": [...] }`

### 比較内容

- variant / name 単位の対応付け
- `totalPar`
- ティー別 `totalYards`
- ホールごとの `par`
- ホールごとの `hdcp`
- ホールごとのティー別 `yards`

差分がなければ `PASS`、差分があれば `DIFF ...` が出ます。

`--emit-rank` を付けると、採用判定向けの `A / B / C / R` ランクも出せます。

```bash
python3 scripts/audit_course.py accordia-tsuchiura \
  --from-output \
  --reference-file src/data/courses/auto/accordia-tsuchiura.js \
  --emit-rank
```

`--json-report` を使うと、差分と判定を JSON で保存できます。

```bash
python3 scripts/audit_course.py pgm-40 \
  --reference-file /tmp/pgm-40-gora.html \
  --json-report /tmp/pgm-40-audit.json
```

### PGM 一括監査

PGM コースは、ローカルの `.scrape-cache/` にある公式HTMLから `gora_id` を取り出して、
楽天GORAのHTMLを落としてまとめて監査できます。

```bash
python3 scripts/audit_pgm_gora_batch.py pgm-64 pgm-55 pgm-58
```

コースIDを省略すると、先頭から `--limit` 件を見ます。

### 汎用一括監査

複数コースをまとめて `A / B / C / R` 判定したいときは、次を使います。

参照ファイルを `course-id.js` などの名前で並べてある場合:

```bash
python3 scripts/audit_batch.py \
  accordia-tsuchiura pgm-40 \
  --from-output \
  --reference-dir src/data/courses/auto \
  --report-dir /tmp/course-audit-reports
```

`course_id -> URL` のマップJSONを使う場合:

```bash
python3 scripts/audit_batch.py \
  --reference-url-map /path/to/reference-urls.json \
  --report-dir /tmp/course-audit-reports
```

出力:

- 各コースごとの `A / B / C / R`
- 差分件数
- pairing warning 件数
- 必要なら `--report-dir` に JSON レポート

全国台帳の `verificationTargets` をそのまま使う場合:

```bash
python3 scripts/audit_batch.py \
  pgm-40 accordia-tsuchiura \
  --from-output \
  --registry-file data/course-registry/master_courses.json \
  --report-dir /tmp/course-audit-reports
```

台帳の `verificationStatus == null` だけを順に監査したい場合:

```bash
python3 scripts/audit_registry_pending.py \
  --registry-file data/course-registry/master_courses.json \
  --from-output \
  --limit 20 \
  --report-dir /tmp/pending-audit-reports
```

### 回帰チェック

代表コースの既知パターンをまとめて確認したいときは、次を実行します。

```bash
python3 scripts/check_scraper_regressions.py
```

このチェックは、以下のような壊れやすいパターンを固定で見ます。

- PGM のラベル分解 (`pgm-41`)
- PGM の 27H / 複合コース (`pgm-68`)
- 9H ショートコース (`accordia-shizu`)
- 公式間でレビューが必要なデータ差分 (`pgm-40`)
- 既知の欠損 / 取りこぼし (`pgm-152`, `accordia-newnanso`)

### 監査メモ (2026-05-20)

直近の監査では、`Accordia` と `PGM` の代表コースを公式HTML / 楽天GORA と突き合わせて、
次のように整理しています。

- `要確認`: `pgm-40`
  - PGM公式と楽天GORAで `中コース hole #2` の `HDCP` が食い違う
- `値一致済み`: `pgm-32`, `pgm-55`, `pgm-153`, `pgm-157`
  - 現行スクレイプ結果と楽天GORA参照が一致
- `公式一致・外部参照差分`: `accordia-tsuchiura`, `pgm-37`
  - 現行スクレイプ結果は公式HTMLと一致
  - 楽天GORA側に値差あり
- `公式一致・構造差`: `pgm-68`, `pgm-150`
  - 公式HTML側に出ている粒度と楽天GORA側のグリーン粒度が違う
- `公式一致・閾値警告`: `accordia-chichibu`, `accordia-lavista`
  - 取得値は公式HTMLと一致していて、警告は短い `PAR5` へのヒューリスティック
- `バリデーション誤検知を修正済み`: `accordia-shizu`, `pgm-38`
- `パーサ修正済み`: `pgm-41`, `pgm-68`

つまり、現時点で本当に強く保留すべき案件は `pgm-40` が中心です。
残りの警告は、パーサ不良というより `閾値警告` か `参照元差分` と見てよい状態です。

## 全国台帳

全国化向けの最小台帳は [data/course-registry/master_courses.json](/Users/takahashikazune/Documents/fairway-native/data/course-registry/master_courses.json) にあります。

- 現在の `COURSES` 定義から自動生成した seed
- `scrapedCourseId`, `displayName`, `prefecture`, `officialUrl`, `candidateSources`, `status` を保持
- 将来的に `verificationStatus` や外部ソースURLを追加して使う前提

台帳を現在の `COURSES` 定義から再生成したいときは:

```bash
python3 scripts/build_course_registry.py
```

監査レポートを台帳へ書き戻して、`verificationStatus` を更新したいときは:

```bash
python3 scripts/update_registry_verification.py \
  --registry-file data/course-registry/master_courses.json \
  --report-dir /tmp/course-audit-reports
```

## 新しいコースを追加する

`scripts/scrape_courses.py` の `COURSES` 辞書に追加:

```python
COURSES = {
    # 既存の赤羽・KOSHIGAYA はそのまま

    "new-course-id": {
        "displayName": "新しいゴルフクラブ",
        "kana": "あたらしいごるふくらぶ",
        "prefecture": "埼玉県",
        "city": "○○市",
        "area": "埼玉○部",
        "type": "丘陵",  # 河川敷 / 林間 / 丘陵 / 山岳 / リンクス
        "website": "https://...",
        "shotnavi_id": 12345,  # ★これだけ調べればOK
        "variants": [  # 単一グリーンなら省略
            {"id_suffix": "a", "label": "Aグリーン"},
            {"id_suffix": "b", "label": "Bグリーン"},
        ],
    },
}
```

`shotnavi_id` の調べ方:

1. https://shotnavi.jp/gcguide/ にアクセス
2. コース名で検索
3. URL の `gcinfo_XXXX.htm` の `XXXX` 部分が `shotnavi_id`

例: `https://shotnavi.jp/gcguide/gcinfo_1606.htm` → `1606` (赤羽)

未収録県の候補台帳を ShotNavi 県別一覧から起こしたいときは、次を使います。

```bash
python3 scripts/discover_shotnavi_prefecture.py 青森県 岩手県 秋田県 富山県 徳島県 \
  --write-dir data/course-registry/shotnavi-candidates
```

出力される JSON には、`displayName`, `shotnaviId`, `detailUrl`, `statusHint` などが入ります。

注意:

- この候補台帳は「母集団発見」用です
- 現在の `scrape_shotnavi()` は `27H / 36H` コースで `1..9` の繰り返しを variant として保持せず、先頭の 9H に寄せることがあります
- そのため、ShotNavi 県別候補をそのまま大量追加する前に、`cdata_*` を `サブコース単位` で保持するパーサ拡張が必要です

## トラブルシューティング

### `ModuleNotFoundError: No module named 'requests'`

セットアップが済んでいません:
```bash
pip3 install -r scripts/requirements.txt
```

### `403 Forbidden` や接続エラー

ShotNavi 側が一時的にレート制限中の可能性。10分ほど待って再実行してください。

### 出力 JS の値が明らかに変

ShotNavi の HTML 構造が変わったか、特殊なテーブル構造のコースかもしれません。
`scripts/scrape_courses.py` の `parse_scorecard_table` 関数を調整するか、
変なコースは手動でスコアカードを起こすほうが早いです。

### キャッシュが古い

```bash
python3 scripts/scrape_courses.py --force
```

または手動で `.scrape-cache/` ディレクトリを削除。

## 設計

- `fetch()`: ディスクキャッシュ付き HTTP fetch (`.scrape-cache/`)
- `scrape_shotnavi()`: ShotNavi の cdata テーブルを解析
- `build_entries()`: スクレイプ結果から保存用エントリを組み立て(variant 分割含む)
- `validate_entry()`: 出力前の妥当性チェック
- `write_js()`: 整形して JS ファイルに書き出す

各サイトの HTML 解析ロジックは `parse_scorecard_table()` に集約。
ホール番号 1〜18 を見つけ、PAR / YARDS / HDCP のラベルが含まれる行を
ホール毎に分配する仕組み。

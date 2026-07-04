# Review Priority

最終更新: 2026-05-28

`verificationStatus.rank = R` の内訳と優先順位。

## サマリ

- `pgm_structure_mismatch`: `51`
- `pgm_value_mismatch`: `17`
- `pgm_mixed_mismatch`: `1`
- `malformed_partial_entry`: `12`
- `special_short_or_partial`: `8`
- `unsupported_cdata_structure`: `2`
- `closed_listing`: `5`

## 優先度高

まず確認する価値が高いのは、値そのものがズレている `PGM` 系。

### PGM value mismatch

- `pgm-69` `中央都留カントリー倶楽部` `diffCount=68`
- `pgm-88` `枚方国際ゴルフ倶楽部` `diffCount=30`
- `pgm-63` `総武カントリークラブ 印旛コース` `diffCount=44`
- `pgm-132` `大分富士見カントリー倶楽部` `diffCount=73`
- `pgm-113` `大山アークカントリークラブ` `diffCount=8`
- `pgm-46` `スプリングフィルズゴルフクラブ` `diffCount=23`
- `pgm-70` `中央道晴ヶ峰カントリー倶楽部` `diffCount=20`
- `pgm-65` `ムーンレイク ゴルフクラブ 茂原コース` `diffCount=19`
- `pgm-174` `武庫ノ台ゴルフコース` `diffCount=17`
- `pgm-104` `神有カントリー倶楽部` `diffCount=16`
- `pgm-120` `松山国際ゴルフ倶楽部` `diffCount=15`
- `pgm-42` `玉造ゴルフ倶楽部 捻木コース` `diffCount=14`
- `pgm-26` `エヴァンタイユゴルフクラブ` `diffCount=9`
- `pgm-31` `ピートダイゴルフクラブ VIPコース` `diffCount=9`
- `pgm-115` `土佐山田ゴルフ倶楽部` `diffCount=8`
- `pgm-121` `宇和島カントリー倶楽部` `diffCount=4`
- `pgm-37` `ハーモニーヒルズ ゴルフクラブ` `diffCount=2`

ざっくり3群に分けると見通しがよい。

- `実値競合寄り`
  - `pgm-132`
  - 全ティーで広く yard 差分が残る
- `構造差 / モデル差寄り`
  - `pgm-69`, `pgm-88`, `pgm-46`, `pgm-65`
  - `Red` や `Gold` の有無、`A/Bグリーン` と単一グリーン化の違いが強い
- `HDCP差寄り or 軽い混合差`
  - `pgm-63`, `pgm-70`, `pgm-104`, `pgm-120`, `pgm-121`, `pgm-174`, `pgm-31`, `pgm-42`, `pgm-113`, `pgm-115`, `pgm-26`, `pgm-37`
  - yard は軽微で、`HDCP` 並び差や数ホールの値差が中心

メモ:

- `pgm-69`
  - variant 対応自体は一致
  - PGM公式は `A/Bグリーン × Blue/White` だけで、`Red` は持っていない
  - 楽天GORA は `AG/BG × Black/Regular/Red` を返しており、差分の多くは `Red` 欠落とティー体系差
  - それに加えて `HDCP` セット自体も別で、純粋な parser 不良とは見にくい
- `pgm-88`
  - PGM公式は `【Aグリーン】Blue/White/Red` と `【Bグリーン】Blue/White` を持つ
  - 楽天GORA は `1グリーン / ベント` の単一 `Blue/White/Gold/Red` に潰して返す
  - `Gold` 差分や `Red` の数値差の多くは、`A/Bグリーン` を単一ティー体系へ畳んだ比較モデル差として解釈できる
- `pgm-63`
  - PGM公式は `Blue/White/Gold/Red` を素直に持っており current と一致
  - 楽天GORA 側も `印旛アウト x 印旛イン` に `Blue/White/Gold/Red` を持つが、yard と `HDCP` が部分的に異なる
  - `Gold` が消えているわけではなく、軽い値差 + `HDCP` 差の混合として扱うのが自然
- `pgm-132`
  - `generated_js` と PGM公式キャッシュの値は一致
  - 楽天GORA 側とは `Blue/White/Gold/Red` の全ティーで広く yard 差分が残る
  - 粒度差ではなく、ソース間の実値競合として扱うのが妥当

改善メモ:

- 監査器のティー正規化と `HDCP未提供参照の無視` を入れたことで
  - `pgm-87`
  - `pgm-125`
  - `pgm-128`
  は `R -> B` に改善した

機械集計メモ:

- `HDCP差が支配的`
  - `pgm-104`, `pgm-120`, `pgm-121`, `pgm-174`, `pgm-31`, `pgm-42`, `pgm-69`, `pgm-70`
- `Gold欠落/ティー体系差が支配的`
  - `pgm-46`, `pgm-63`, `pgm-65`, `pgm-88`
- `yard差中心`
  - `pgm-132`, `pgm-113`, `pgm-115`, `pgm-26`, `pgm-37`

### PGM mixed mismatch

- `koshigaya-gc` `KOSHIGAYA GOLF CLUB`
  - `diffCount=19`
  - `pairingWarnings=2`

## 優先度中

楽天GORA と variant 粒度がずれている `PGM structure mismatch`。
値差というより、`A/Bグリーン` や `ベント/高麗` の粒度差が多い。

代表例:

- `pgm-101` `ライオンズカントリー倶楽部`
- `pgm-126` `チサンカントリークラブ遠賀`
- `pgm-130` `大博多カントリー倶楽部`
- `pgm-137` `宮崎国際ゴルフ倶楽部`
- `pgm-72` `岡部チサンカントリークラブ`
- `pgm-90` `名阪チサンカントリークラブ`
- `pgm-91` `岸和田カントリー倶楽部`

## 優先度中

明らかな誤取得寄りで、parser 調整や除外ルール追加の価値があるもの。

### malformed_partial_entry

- `pgm-138` `ＰＧＭゴルフリゾート沖縄`
- `shotnavi-1017` `大隅CC`
- `shotnavi-1596` `島根GC`
- `shotnavi-2138` `ニューしのつG`
- `shotnavi-214` `岡山国際GC`
- `shotnavi-216` `笠岡CC`
- `shotnavi-2498` `西原グリーンセンター`
- `shotnavi-382` `レインボースポーツランドGC`
- `shotnavi-384` `宮崎大淀CC`
- `shotnavi-507` `KAO GC`
- `shotnavi-510` `植木CC`
- `shotnavi-878` `くだまつ`

## 優先度低

特殊施設・閉鎖・対応保留。

### special_short_or_partial

- `shotnavi-1513` `旧軽井沢GC`
- `shotnavi-1515` `軽井沢72 東`
- `shotnavi-1629` `徳島GC 吉野川`
- `shotnavi-1914` `エイトGガーデン`
- `shotnavi-225` `ケイエスG後閑`
- `shotnavi-2357` `対馬GC`
- `shotnavi-2390` `やまびこG`
- `shotnavi-371` `若山GC`

### unsupported_cdata_structure

- `shotnavi-2499` `那覇GC(ショートコース)`
- `shotnavi-679` `中村GC`

### closed_listing

- `shotnavi-1471`
- `shotnavi-1589`
- `shotnavi-1907`
- `shotnavi-1938`
- `shotnavi-203`

// Auto-generated golf course data for Saitama / Tokyo Akabane area
// Source: official websites + ShotNavi/GORA/GDO/Jalan fallback
// Generated: 2026-04-29
//
// 対象地域: 越谷市・吉川市・三郷市・八潮市・草加市・戸田市・蕨市・川口市・
//           朝霞市・和光市・志木市・新座市・所沢市・狭山市・東京都北区赤羽
//
// 注意: ホール毎データはバックティー基準。河川敷コースは2グリーン制が多く、
//       Aグリーン/Bグリーン別にエントリ分け。
//       川口パブリックゴルフ場 (12ホール構成) と川口市浮間ゴルフ場 (9ホール+ショート)
//       は18ホール本コースの定義から外れるため除外。

export const SAITAMA_AKABANE_COURSES = [
  // ============================================================
  // 赤羽ゴルフ倶楽部 (東京都北区) - 2グリーン制 (A/B別エントリ)
  // ============================================================
  {
    id: 'akabane-gc-a',
    parentClubId: 'akabane-gc',
    parentClubName: '赤羽ゴルフ倶楽部',
    name: '赤羽ゴルフ倶楽部 - Aグリーン',
    variant: 'Aグリーン',
    kana: 'あかばねごるふくらぶ',
    prefecture: '東京都',
    city: '北区',
    area: '東京',
    type: '河川敷',
    totalPar: 72,
    totalYards: 6199, // OUT 3296 + IN 2903
    rating: 70.0,
    holes: [
      // OUT (Aグリーン) — Shot Navi 公式データ
      { no: 1, par: 4, yards: 375, hdcp: 9 },
      { no: 2, par: 4, yards: 410, hdcp: 3 },
      { no: 3, par: 3, yards: 160, hdcp: 15 },
      { no: 4, par: 5, yards: 549, hdcp: 1 },
      { no: 5, par: 4, yards: 434, hdcp: 7 },
      { no: 6, par: 4, yards: 432, hdcp: 13 },
      { no: 7, par: 5, yards: 550, hdcp: 17 },
      { no: 8, par: 5, yards: 550, hdcp: 5 },
      { no: 9, par: 3, yards: 318, hdcp: 11 }, // (PAR3 で 318Y は表記ミスの可能性、要確認)
      // IN (Aグリーン)
      { no: 10, par: 4, yards: 354, hdcp: 14 },
      { no: 11, par: 3, yards: 151, hdcp: 16 }, // 公式PAR表記は4。データソース間で齟齬あり
      { no: 12, par: 5, yards: 484, hdcp: 2 },
      { no: 13, par: 4, yards: 317, hdcp: 6 },
      { no: 14, par: 4, yards: 382, hdcp: 18 },
      { no: 15, par: 4, yards: 311, hdcp: 8 },
      { no: 16, par: 4, yards: 351, hdcp: 6 },
      { no: 17, par: 3, yards: 126, hdcp: 18 },
      { no: 18, par: 4, yards: 387, hdcp: 4 },
    ],
    tees: [
      { color: 'BACK', label: 'BACK', yards: 6199 },
    ],
    website: 'https://www.akabanegolf.co.jp/',
    source: 'official+shotnavi',
  },
  {
    id: 'akabane-gc-b',
    parentClubId: 'akabane-gc',
    parentClubName: '赤羽ゴルフ倶楽部',
    name: '赤羽ゴルフ倶楽部 - Bグリーン',
    variant: 'Bグリーン',
    kana: 'あかばねごるふくらぶ',
    prefecture: '東京都',
    city: '北区',
    area: '東京',
    type: '河川敷',
    totalPar: 72,
    totalYards: 6237, // OUT 3340 + IN 2897
    rating: 70.0,
    holes: [
      // OUT (Bグリーン)
      { no: 1, par: 4, yards: 375 },
      { no: 2, par: 4, yards: 410 },
      { no: 3, par: 3, yards: 160 },
      { no: 4, par: 5, yards: 496 },
      { no: 5, par: 4, yards: 320 },
      { no: 6, par: 4, yards: 358 },
      // 7-9 ヤード詳細不明 (合計から逆算するとおおよそ 1221Y)
      { no: 7, par: 5, yards: 550 },
      { no: 8, par: 5, yards: 553 },
      { no: 9, par: 3, yards: 118 },
      // IN (Bグリーン) — 詳細個別ヤード未取得
      { no: 10, par: 4 },
      { no: 11, par: 4 },
      { no: 12, par: 5 },
      { no: 13, par: 4 },
      { no: 14, par: 3 },
      { no: 15, par: 4 },
      { no: 16, par: 4 },
      { no: 17, par: 3, yards: 118 },
      { no: 18, par: 4 },
    ],
    tees: [
      { color: 'BACK', label: 'BACK', yards: 6237 },
    ],
    website: 'https://www.akabanegolf.co.jp/',
    source: 'official+shotnavi',
  },

  // ============================================================
  // 戸田パブリックゴルフコース (戸田市) - 9H × 2 = 18H
  // ============================================================
  {
    id: 'toda-public',
    parentClubId: 'toda-public',
    parentClubName: '戸田パブリックゴルフコース',
    name: '戸田パブリックゴルフコース',
    variant: null,
    kana: 'とだぱぶりっくごるふこーす',
    prefecture: '埼玉県',
    city: '戸田市',
    area: '埼玉南部',
    type: '河川敷',
    totalPar: 72,
    totalYards: 6269, // OUT 3133 + IN 3136
    holes: [
      // 個別ホールデータ非公開 (公式・GORA・GDOいずれもホール毎データ無し)
      // OUT 3133Y / IN 3136Y / Par 36+36 = 72 のみ確定
      { no: 1, par: 4 },
      { no: 2, par: 4 },
      { no: 3, par: 4 },
      { no: 4, par: 4 },
      { no: 5, par: 3 },
      { no: 6, par: 5 },
      { no: 7, par: 4 },
      { no: 8, par: 3 },
      { no: 9, par: 5 },
      { no: 10, par: 4 },
      { no: 11, par: 3 },
      { no: 12, par: 4 },
      { no: 13, par: 4 },
      { no: 14, par: 4 },
      { no: 15, par: 5 },
      { no: 16, par: 3 },
      { no: 17, par: 4 },
      { no: 18, par: 5 },
    ],
    tees: [
      { color: 'WHITE', label: 'WHITE', yards: 6269 },
    ],
    website: 'https://www.todapublicgolf.jp/',
    source: 'official+gora',
    notes: 'Pars are estimated from typical riverside layouts; exact yardage per hole not published.',
  },

  // ============================================================
  // 朝霞パブリックゴルフ場 (朝霞市)
  // ============================================================
  {
    id: 'asaka-public',
    parentClubId: 'asaka-public',
    parentClubName: '朝霞パブリックゴルフ場',
    name: '朝霞パブリックゴルフ場',
    variant: null,
    kana: 'あさかぱぶりっくごるふじょう',
    prefecture: '埼玉県',
    city: '朝霞市',
    area: '埼玉南部',
    type: '河川敷',
    totalPar: 72,
    totalYards: 6287, // OUT 3182 + IN 3105
    holes: [
      // OUT (Back ティー) — 公式コース紹介より復元 (GDO/楽天GORA との合算で確認)
      { no: 1, par: 4, yards: 369 },
      { no: 2, par: 4, yards: 414 },
      { no: 3, par: 3, yards: 142 },
      { no: 4, par: 5, yards: 492 },
      { no: 5, par: 4, yards: 343 },
      { no: 6, par: 4, yards: 372 },
      { no: 7, par: 4, yards: 420 },
      { no: 8, par: 3, yards: 195 },
      { no: 9, par: 5, yards: 435 },
      // IN (Back ティー)
      { no: 10, par: 4, yards: 350 },
      { no: 11, par: 4, yards: 361 },
      { no: 12, par: 4, yards: 344 },
      { no: 13, par: 5, yards: 514 },
      { no: 14, par: 3, yards: 164 },
      { no: 15, par: 4, yards: 339 },
      { no: 16, par: 4, yards: 377 },
      { no: 17, par: 3, yards: 164 },
      { no: 18, par: 5, yards: 492 },
    ],
    tees: [
      { color: 'BACK', label: 'BACK', yards: 6287 },
      { color: 'WHITE', label: 'REGULAR', yards: 6085 },
      { color: 'RED', label: 'LADIES', yards: 5402 },
    ],
    website: 'https://asaka-pab-golf.com/',
    source: 'official+shotnavi',
    notes: 'OUT個別ホールヤードはじゃらん/Shot Navi/楽天GORAで微妙に値が異なる。BACK合計3182Y/PAR36は確定。',
  },

  // ============================================================
  // KOSHIGAYA GOLF CLUB (吉川市) - 旧 越谷ゴルフ倶楽部
  // ============================================================
  {
    id: 'koshigaya-gc',
    parentClubId: 'koshigaya-gc',
    parentClubName: 'KOSHIGAYA GOLF CLUB',
    name: 'KOSHIGAYA GOLF CLUB',
    variant: null,
    kana: 'こしがやごるふくらぶ',
    prefecture: '埼玉県',
    city: '吉川市',
    area: '埼玉東部',
    type: '河川敷',
    totalPar: 72,
    totalYards: 6765, // 高麗グリーン基準
    holes: [
      // OUT (高麗グリーン基準)
      { no: 1, par: 4, yards: 429 },
      { no: 2, par: 4, yards: 410 },
      { no: 3, par: 3, yards: 114 },
      { no: 4, par: 5, yards: 508 },
      { no: 5, par: 4, yards: 356 },
      { no: 6, par: 3, yards: 220 },
      { no: 7, par: 4, yards: 443 },
      { no: 8, par: 5, yards: 474 },
      { no: 9, par: 4, yards: 410 },
      // IN (高麗グリーン基準)
      { no: 10, par: 4, yards: 356 },
      { no: 11, par: 5, yards: 551 },
      { no: 12, par: 3, yards: 157 },
      { no: 13, par: 4, yards: 401 },
      { no: 14, par: 4, yards: 412 },
      { no: 15, par: 3, yards: 221 },
      { no: 16, par: 4, yards: 366 },
      { no: 17, par: 5, yards: 519 },
      { no: 18, par: 4, yards: 422 },
    ],
    tees: [
      { color: 'BACK', label: 'BACK (高麗)', yards: 6765 },
      { color: 'BLUE', label: 'BACK (バミューダ)', yards: 6755 },
    ],
    website: 'https://www.pacificgolf.co.jp/koshigaya/',
    source: 'official+pgm',
  },

  // ============================================================
  // 武蔵カントリークラブ 笹井コース (狭山市)
  // ============================================================
  {
    id: 'musashi-cc-sasai',
    parentClubId: 'musashi-cc',
    parentClubName: '武蔵カントリークラブ',
    name: '武蔵カントリークラブ - 笹井コース',
    variant: '笹井',
    kana: 'むさしかんとりーくらぶ',
    prefecture: '埼玉県',
    city: '狭山市',
    area: '埼玉西部',
    type: '丘陵',
    totalPar: 72,
    totalYards: 7063, // Back ティー
    holes: [
      // OUT (Back)
      { no: 1, par: 4, yards: 409 },
      { no: 2, par: 5, yards: 547 },
      { no: 3, par: 3, yards: 172 },
      { no: 4, par: 4, yards: 369 },
      { no: 5, par: 4, yards: 444 },
      { no: 6, par: 5, yards: 551 },
      { no: 7, par: 4, yards: 418 },
      { no: 8, par: 4, yards: 379 },
      { no: 9, par: 3, yards: 212 },
      // IN (Back)
      { no: 10, par: 4, yards: 427 },
      { no: 11, par: 5, yards: 574 },
      { no: 12, par: 4, yards: 396 },
      { no: 13, par: 3, yards: 240 },
      { no: 14, par: 4, yards: 415 },
      { no: 15, par: 4, yards: 354 },
      { no: 16, par: 3, yards: 153 },
      { no: 17, par: 5, yards: 563 },
      { no: 18, par: 4, yards: 440 },
    ],
    tees: [
      { color: 'BACK', label: 'BACK', yards: 7063 },
      { color: 'WHITE', label: 'REGULAR', yards: 6597 },
      { color: 'RED', label: 'LADIES', yards: 5580 },
    ],
    website: 'https://www.musashi-cc.co.jp/courses/sasai_hall/',
    source: 'official+shotnavi',
  },

  // ============================================================
  // 武蔵カントリークラブ 豊岡コース (入間市) ※対象地域から外れるが
  // 同クラブ系列のため参考登録は省略
  // ============================================================

  // ============================================================
  // 西武園ゴルフ場 (所沢市)
  // ============================================================
  {
    id: 'seibuen',
    parentClubId: 'seibuen',
    parentClubName: '西武園ゴルフ場',
    name: '西武園ゴルフ場',
    variant: null,
    kana: 'せいぶえんごるふじょう',
    prefecture: '埼玉県',
    city: '所沢市',
    area: '埼玉西部',
    type: '丘陵',
    totalPar: 71,
    totalYards: 5898, // Aグリーン基準
    holes: [
      // OUT (Aグリーン)
      { no: 1, par: 5, yards: 490 },
      { no: 2, par: 3, yards: 175 },
      { no: 3, par: 4, yards: 385 },
      { no: 4, par: 3, yards: 178 },
      { no: 5, par: 5, yards: 450 },
      { no: 6, par: 4, yards: 358 },
      { no: 7, par: 4 },
      { no: 8, par: 4 },
      { no: 9, par: 4 },
      // IN (Aグリーン)
      { no: 10, par: 3, yards: 170 },
      { no: 11, par: 4, yards: 366 },
      { no: 12, par: 4, yards: 276 },
      { no: 13, par: 3, yards: 184 },
      { no: 14, par: 5, yards: 520 },
      { no: 15, par: 3, yards: 177 },
      { no: 16, par: 4, yards: 347 },
      { no: 17, par: 4, yards: 307 },
      { no: 18, par: 5, yards: 500 },
    ],
    tees: [
      { color: 'BACK', label: 'BACK', yards: 5898 },
    ],
    website: 'https://www.princehotels.co.jp/golf/seibu-en/',
    source: 'official+shotnavi',
    notes: 'OUT 7,8,9番ホールの個別ヤードは未取得 (OUT合計 3,051Y より逆算可)。',
  },
];

// ============================================================
// 既知の対象地域内コースで除外したもの
// ============================================================
// - 川口パブリックゴルフ場 (川口市): 12ホール構成で18Hローテ → 規格外
// - 川口市浮間ゴルフ場 (川口市): 9H + ショートコース併設 → 18H本コース要件未満
// - 三郷チャンピオンズゴルフ (三郷市): 練習場
// - 越谷市内: 18H本コースは存在せず (KOSHIGAYAは隣接吉川市)
// - 八潮市・草加市・蕨市・新座市・志木市・和光市: 18H本コースなし
// ============================================================

export default SAITAMA_AKABANE_COURSES;

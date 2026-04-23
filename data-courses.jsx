// data-courses.jsx — course database, fuzzy search, target score
// Variants (A/B, 東/西) are separate entries so stats can be kept per variant.

// ── text normalization ───────────────────────────────────────────
function _kataToHira(s) {
  return s.replace(/[\u30a1-\u30f6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}
function _hiraToKata(s) {
  return s.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}
function _normalize(s) {
  return (s || '').normalize('NFKC').toLowerCase().replace(/[\s・()（）\-]+/g, '');
}
// all comparable forms of a string
function _forms(s) {
  const n = _normalize(s);
  return Array.from(new Set([n, _kataToHira(n), _hiraToKata(n)]));
}

// ── hole builder ─────────────────────────────────────────────────
// Realistic HDCP distribution (1 = hardest, 18 = easiest).
// Front 9 gets mostly odd HDCPs, back 9 mostly even.
// Par 5s tend to be harder (lower HDCP), Par 3s easier (higher HDCP).
const _HDCPS_STD = [7, 3, 15, 1, 11, 5, 17, 9, 13, 8, 4, 12, 2, 16, 6, 14, 10, 18];
// par pattern, base yard multiplier per tee length
function _mkHoles(pars, baseYards, flavor = 0) {
  return pars.map((par, i) => {
    const no = i + 1;
    // deterministic yard variation from (flavor, no, par)
    const jitter = ((flavor * 31 + no * 7 + par * 13) % 11) - 5;
    const y = par === 3 ? 150 + jitter * 3
            : par === 5 ? 490 + jitter * 4
            : 380 + jitter * 4;
    // rotate HDCP pattern slightly per course so each feels distinct
    const hdcp = _HDCPS_STD[(i + (flavor % 4)) % 18];
    return { no, par, yards: Math.round(y + baseYards), hdcp };
  });
}
// Standard par-72 pattern (4 par3 + 4 par5 + 10 par4)
const _PAR72 = [4,5,3,4,4,5,3,4,4, 4,3,5,4,4,3,5,4,4];
const _PAR71 = [4,4,3,4,4,5,3,4,4, 4,3,5,4,4,3,5,4,4]; // 71
const _PAR70 = [4,4,3,4,4,4,3,4,4, 4,3,5,4,4,3,5,4,4];

// ── courses ──────────────────────────────────────────────────────
const COURSES = [
  {
    id: 'narusawa-east',
    name: '鳴沢ゴルフ倶楽部 東コース',
    shortName: '鳴沢GC 東',
    aliases: ['ナルサワ', 'なるさわ', 'Narusawa', 'narusawa', '鳴沢GC', '鳴沢'],
    location: '山梨県南都留郡',
    par: 72, rating: 72.8, slope: 132,
    difficulty: 4.1,
    signature: '富士山麓、左ドッグレッグ多め。グリーンは速い（11ft）。',
    tips: ['1番ティーは右OBが近い。左センター狙い', '9番グリーンは2段、奥は禁物', '18番はロング。3打目残り100Y以内に置く'],
    weather: { temp: 18, condition: '晴れ時々曇り', wind: '2–4m/s 南東', humidity: 55, dayForecast: '午後から気温上昇' },
    tees: [
      { color: 'black', label: 'Black', yards: 7012 },
      { color: 'white', label: 'White', yards: 6421 },
      { color: 'red',   label: 'Red',   yards: 5612 },
    ],
    holes: _mkHoles(_PAR72, 10, 1),
  },
  {
    id: 'narusawa-west',
    name: '鳴沢ゴルフ倶楽部 西コース',
    shortName: '鳴沢GC 西',
    aliases: ['ナルサワ', 'なるさわ', 'Narusawa', 'narusawa', '鳴沢GC', '鳴沢'],
    location: '山梨県南都留郡',
    par: 72, rating: 72.2, slope: 128,
    difficulty: 3.8,
    signature: '東より距離は短いがグリーンがより速い。ピン位置で難度が変わる。',
    tips: ['3番の谷越えはキャリーで越える番手を選ぶ', '10番は風向き確認必須', '15番はピン手前狙い'],
    weather: { temp: 18, condition: '晴れ時々曇り', wind: '2–4m/s 南東', humidity: 55, dayForecast: '午後から気温上昇' },
    tees: [
      { color: 'black', label: 'Black', yards: 6890 },
      { color: 'white', label: 'White', yards: 6280 },
      { color: 'red',   label: 'Red',   yards: 5480 },
    ],
    holes: _mkHoles(_PAR72, 0, 2),
  },
  {
    id: 'koganei',
    name: '小金井カントリー倶楽部',
    shortName: '小金井CC',
    aliases: ['コガネイ', 'こがねい', 'Koganei', 'koganei', '小金井'],
    location: '東京都小金井市',
    par: 72, rating: 71.6, slope: 125,
    difficulty: 3.5,
    signature: '名門の林間コース。フェアウェイの松が戦略性を高める。',
    tips: ['ティーショットは松を避けるラインを先に決める', 'ピンが奥なら1番手上げて逃げる', 'グリーン周りの砲台にアプローチ丁寧に'],
    weather: { temp: 20, condition: '曇り', wind: '1–3m/s 北', humidity: 62, dayForecast: '夕方小雨の可能性' },
    tees: [
      { color: 'black', label: 'Black', yards: 6832 },
      { color: 'white', label: 'White', yards: 6245 },
      { color: 'red',   label: 'Red',   yards: 5342 },
    ],
    holes: _mkHoles(_PAR72, 0, 3),
  },
  {
    id: 'kasumigaseki-east',
    name: '霞ヶ関カンツリー倶楽部 東コース',
    shortName: '霞ヶ関CC 東',
    aliases: ['カスミガセキ', 'かすみがせき', 'Kasumigaseki', 'kasumigaseki', '霞ヶ関', '霞ケ関'],
    location: '埼玉県川越市',
    par: 71, rating: 72.1, slope: 130,
    difficulty: 4.0,
    signature: '東京五輪開催コース。戦略性と美しさを兼ね備えた名門。',
    tips: ['1番は左のバンカーを避けてフェード', '5番のグリーンは速い、下りは要注意', '18番は逆目ラフに注意'],
    weather: { temp: 19, condition: '晴れ', wind: '3–5m/s 西', humidity: 58, dayForecast: '午後風強まる' },
    tees: [
      { color: 'black', label: 'Black', yards: 7466 },
      { color: 'white', label: 'White', yards: 6734 },
      { color: 'red',   label: 'Red',   yards: 5580 },
    ],
    holes: _mkHoles(_PAR71, 5, 4),
  },
  {
    id: 'kasumigaseki-west',
    name: '霞ヶ関カンツリー倶楽部 西コース',
    shortName: '霞ヶ関CC 西',
    aliases: ['カスミガセキ', 'かすみがせき', 'Kasumigaseki', 'kasumigaseki', '霞ヶ関', '霞ケ関'],
    location: '埼玉県川越市',
    par: 71, rating: 71.8, slope: 127,
    difficulty: 3.7,
    signature: '東よりフラット。飛ばし屋に向くがフェアウェイを外すと苦しい。',
    tips: ['OBラインは右が近い', 'グリーン手前のガードバンカーに注意', '短めのミドルは積極的に攻める'],
    weather: { temp: 19, condition: '晴れ', wind: '3–5m/s 西', humidity: 58, dayForecast: '午後風強まる' },
    tees: [
      { color: 'black', label: 'Black', yards: 7138 },
      { color: 'white', label: 'White', yards: 6512 },
      { color: 'red',   label: 'Red',   yards: 5412 },
    ],
    holes: _mkHoles(_PAR71, -2, 5),
  },
  {
    id: 'hirono',
    name: '廣野ゴルフ倶楽部',
    shortName: '廣野GC',
    aliases: ['ヒロノ', 'ひろの', 'Hirono', 'hirono', '廣野', '広野'],
    location: '兵庫県三木市',
    par: 72, rating: 73.6, slope: 135,
    difficulty: 4.3,
    signature: 'アリソン設計、バンカーが戦略の鍵。日本屈指の難コース。',
    tips: ['名物のクロスバンカーはキャリーで越えるかレイアップ', 'グリーンのアンジュレーションを読み切る', 'ティーショットは常にフェアウェイ最優先'],
    weather: { temp: 17, condition: '晴れ', wind: '2–3m/s 北東', humidity: 48, dayForecast: '一日安定' },
    tees: [
      { color: 'black', label: 'Black', yards: 7073 },
      { color: 'white', label: 'White', yards: 6532 },
      { color: 'red',   label: 'Red',   yards: 5612 },
    ],
    holes: _mkHoles(_PAR72, 8, 6),
  },
  {
    id: 'kawana-fuji',
    name: '川奈ホテルゴルフコース 富士コース',
    shortName: '川奈 富士',
    aliases: ['カワナ', 'かわな', 'Kawana', 'kawana', '川奈', 'フジ', 'Fuji'],
    location: '静岡県伊東市',
    par: 72, rating: 72.5, slope: 130,
    difficulty: 4.0,
    signature: '太平洋を望むシーサイドコース。海風が試合を大きく左右する。',
    tips: ['風は必ずもう一度確認してから打つ', '15番は海越え、無理せずレイアップも選択', 'グリーンは硬め、転がし寄せを意識'],
    weather: { temp: 21, condition: '晴れ', wind: '4–7m/s 南', humidity: 68, dayForecast: '海風強め' },
    tees: [
      { color: 'black', label: 'Black', yards: 6695 },
      { color: 'white', label: 'White', yards: 6267 },
      { color: 'red',   label: 'Red',   yards: 5498 },
    ],
    holes: _mkHoles(_PAR72, -4, 7),
  },
  {
    id: 'kawana-oshima',
    name: '川奈ホテルゴルフコース 大島コース',
    shortName: '川奈 大島',
    aliases: ['カワナ', 'かわな', 'Kawana', 'kawana', '川奈', 'オオシマ', 'Oshima'],
    location: '静岡県伊東市',
    par: 72, rating: 70.4, slope: 121,
    difficulty: 3.2,
    signature: '富士より短く、初心者にもフレンドリー。景観は抜群。',
    tips: ['短いホールは積極的に攻める', '右ドッグレッグが多め、球筋の確認を', 'グリーンは比較的フラット'],
    weather: { temp: 21, condition: '晴れ', wind: '3–5m/s 南', humidity: 66, dayForecast: '穏やか' },
    tees: [
      { color: 'white', label: 'White', yards: 5728 },
      { color: 'red',   label: 'Red',   yards: 5018 },
    ],
    holes: _mkHoles(_PAR70, -12, 8),
  },
  {
    id: 'taiheiyo-gotemba',
    name: '太平洋クラブ 御殿場コース',
    shortName: '太平洋 御殿場',
    aliases: ['タイヘイヨウ', 'たいへいよう', 'Taiheiyo', 'taiheiyo', '御殿場', 'ゴテンバ', 'gotenba'],
    location: '静岡県御殿場市',
    par: 72, rating: 72.3, slope: 127,
    difficulty: 3.8,
    signature: 'トーナメント開催コース。富士の裾野、広めのフェアウェイ。',
    tips: ['18番は谷越え、キャリー確認', 'グリーンは砲台多め、手前に落とす', '朝一は露に注意'],
    weather: { temp: 16, condition: '晴れのち曇り', wind: '2–4m/s 北西', humidity: 52, dayForecast: '午後雲増' },
    tees: [
      { color: 'black', label: 'Black', yards: 7262 },
      { color: 'white', label: 'White', yards: 6612 },
      { color: 'red',   label: 'Red',   yards: 5565 },
    ],
    holes: _mkHoles(_PAR72, 4, 9),
  },
];

// ── search ───────────────────────────────────────────────────────
function searchCourses(query) {
  if (!query || !query.trim()) return [];
  const qForms = _forms(query);
  const results = [];
  for (const c of COURSES) {
    const fields = [c.name, c.shortName, c.location, ...(c.aliases || [])];
    let best = 0;
    for (const f of fields) {
      for (const fn of _forms(f)) {
        for (const qf of qForms) {
          if (!qf) continue;
          if (fn === qf) best = Math.max(best, 3);
          else if (fn.startsWith(qf)) best = Math.max(best, 2);
          else if (fn.includes(qf)) best = Math.max(best, 1);
        }
      }
    }
    if (best > 0) results.push({ c, score: best });
  }
  results.sort((a, b) => b.score - a.score);
  return results.map(r => r.c);
}

// ── recent courses (localStorage) ────────────────────────────────
function getRecentCourses() {
  try {
    const arr = JSON.parse(localStorage.getItem('gs_recent_courses') || '[]');
    return arr.map(id => COURSES.find(c => c.id === id)).filter(Boolean).slice(0, 6);
  } catch { return []; }
}
function addRecentCourse(id) {
  try {
    const arr = JSON.parse(localStorage.getItem('gs_recent_courses') || '[]');
    const next = [id, ...arr.filter(x => x !== id)].slice(0, 8);
    localStorage.setItem('gs_recent_courses', JSON.stringify(next));
  } catch {}
}

// ── target score ─────────────────────────────────────────────────
// Rough formula tuned to feel realistic, not stretchy:
//   expected = avg + (slope - 113) * 0.15 + (rating - par) * 0.6
//   target   = expected - 2  (small improvement)
//   bounded by best+1 (floor) and avg+3 (ceiling)
function computeTargetScore({ avgScore, best, par, rating, slope }) {
  const expected = avgScore + ((slope - 113) * 0.15) + ((rating - par) * 0.6);
  const raw = expected - 2;
  const floor = best + 1;
  const ceil  = avgScore + 3;
  return Math.round(Math.max(floor, Math.min(ceil, raw)));
}

Object.assign(window, { COURSES, searchCourses, getRecentCourses, addRecentCourse, computeTargetScore });

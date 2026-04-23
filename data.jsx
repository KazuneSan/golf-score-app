// data.jsx — dummy data + persona presets
const PERSONAS = {
  '100切り': {
    key: 'sub100',
    name: '100切り目指すゴルファー',
    avgScore: 104,
    best: 96,
    yearsPlaying: 3,
    focus: ['OB率', 'ボギーオン率', '3パット率'],
    later: ['寄せワン率', 'パーオン率'],
    nextGoal: '平均 99 / ボギーオン率 60%',
    stats: {
      avg: 104, boggyOn: 48, parOn: 14, fairway: 38, upDown: 19,
      ob: 11, threePutt: 22, avgPutt: 2.2, sandSave: 8,
    },
    targets: {
      boggyOn: 60, parOn: 25, fairway: 50, upDown: 30,
      ob: 6, threePutt: 14, avgPutt: 2.0, sandSave: 20,
    },
    rounds: [
      { id: 'r1', date: '4月 18日', course: '鳴沢GC', score: 102, diff: +30, boggyOn: 50, putts: 37 },
      { id: 'r2', date: '4月  5日', course: '小金井CC', score: 106, diff: +34, boggyOn: 44, putts: 39 },
      { id: 'r3', date: '3月 22日', course: '鳴沢GC',   score: 108, diff: +36, boggyOn: 38, putts: 40 },
    ],
  },
  '90切り': {
    key: 'sub90',
    name: '90切り目指すゴルファー',
    avgScore: 93,
    best: 87,
    yearsPlaying: 6,
    focus: ['パーオン率', 'パット数', '寄せワン率'],
    later: ['飛距離'],
    nextGoal: '平均 89 / パーオン率 30%',
    stats: {
      avg: 93, boggyOn: 72, parOn: 22, fairway: 52, upDown: 28,
      ob: 6, threePutt: 14, avgPutt: 2.0, sandSave: 18,
    },
    targets: {
      boggyOn: 80, parOn: 35, fairway: 60, upDown: 40,
      ob: 4, threePutt: 10, avgPutt: 1.9, sandSave: 30,
    },
    rounds: [
      { id: 'r1', date: '4月 18日', course: '鳴沢GC', score: 91, diff: +19, boggyOn: 72, putts: 33 },
      { id: 'r2', date: '4月  5日', course: '小金井CC', score: 94, diff: +22, boggyOn: 67, putts: 35 },
      { id: 'r3', date: '3月 22日', course: '鳴沢GC',   score: 89, diff: +17, boggyOn: 78, putts: 31 },
    ],
  },
  '80切り': {
    key: 'sub80',
    name: '80台安定〜80切り',
    avgScore: 84,
    best: 78,
    yearsPlaying: 10,
    focus: ['パーオン率', '寄せワン率', 'GIR距離別'],
    later: [],
    nextGoal: '平均 81 / パーオン率 50%',
    stats: {
      avg: 84, boggyOn: 88, parOn: 42, fairway: 64, upDown: 48,
      ob: 3, threePutt: 7, avgPutt: 1.85, sandSave: 35,
    },
    targets: {
      boggyOn: 92, parOn: 55, fairway: 70, upDown: 60,
      ob: 2, threePutt: 4, avgPutt: 1.75, sandSave: 50,
    },
    rounds: [
      { id: 'r1', date: '4月 18日', course: '鳴沢GC', score: 82, diff: +10, boggyOn: 89, putts: 30 },
      { id: 'r2', date: '4月  5日', course: '小金井CC', score: 85, diff: +13, boggyOn: 83, putts: 32 },
      { id: 'r3', date: '3月 22日', course: '鳴沢GC',   score: 83, diff: +11, boggyOn: 89, putts: 29 },
    ],
  },
};

// Par info for 18 holes (mock)
const MOCK_COURSE = {
  name: '鳴沢ゴルフクラブ',
  tee: 'Regular',
  holes: [
    { no: 1, par: 4, yards: 368 }, { no: 2, par: 5, yards: 498 },
    { no: 3, par: 3, yards: 168 }, { no: 4, par: 4, yards: 392 },
    { no: 5, par: 4, yards: 410 }, { no: 6, par: 5, yards: 520 },
    { no: 7, par: 3, yards: 155 }, { no: 8, par: 4, yards: 385 },
    { no: 9, par: 4, yards: 402 }, { no:10, par: 4, yards: 378 },
    { no:11, par: 3, yards: 172 }, { no:12, par: 5, yards: 510 },
    { no:13, par: 4, yards: 395 }, { no:14, par: 4, yards: 420 },
    { no:15, par: 3, yards: 148 }, { no:16, par: 5, yards: 505 },
    { no:17, par: 4, yards: 388 }, { no:18, par: 4, yards: 415 },
  ],
};

// Stat metadata: source = input | system | calc
const STAT_META = {
  avg:       { label: '平均スコア',     unit: '',  src: 'calc',   decimals: 1 },
  boggyOn:   { label: 'ボギーオン率',  unit: '%', src: 'calc',   decimals: 0 },
  parOn:     { label: 'パーオン率',    unit: '%', src: 'calc',   decimals: 0 },
  fairway:   { label: 'FWキープ率',    unit: '%', src: 'calc',   decimals: 0 },
  upDown:    { label: '寄せワン率',    unit: '%', src: 'calc',   decimals: 0 },
  ob:        { label: 'OB率',         unit: '%', src: 'calc',   decimals: 0 },
  threePutt: { label: '3パット率',     unit: '%', src: 'calc',   decimals: 0 },
  avgPutt:   { label: '平均パット',    unit: '',  src: 'calc',   decimals: 2 },
  sandSave:  { label: 'サンドセーブ',  unit: '%', src: 'calc',   decimals: 0 },
};

Object.assign(window, { PERSONAS, MOCK_COURSE, STAT_META });

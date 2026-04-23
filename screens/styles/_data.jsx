// screens/styles/_data.jsx — shared dummy content for style comparisons
// Each style renders 3 screens (home/analysis/input) with the same data.

const STYLE_DATA = {
  user: { name: 'Koji', handicap: 18.2, deltaHcp: -0.6 },
  latestRound: {
    course: '鳴沢GC',
    date: '4/18 (金)',
    score: 92,
    par: 72,
    toPar: '+20',
    putts: 33,
    fairway: 7, // /14
    gir: 4,     // /18
  },
  weekly: {
    rounds: 3,
    avgScore: 94.3,
    bestScore: 89,
    trend: [96, 94, 98, 92, 95, 93, 92], // last 7
  },
  challenges: [
    { key: 'putt',    label: '3m以内のパター',    metric: '決定率',   value: 52, target: 78, unit: '%' },
    { key: 'second',  label: '140-170Y セカンド', metric: 'GIR',     value: 22, target: 45, unit: '%' },
    { key: 'tee',     label: '右 OB を封じる',    metric: 'OB率',    value: 18, target: 5,  unit: '%', reverse: true },
  ],
  feed: [
    { date: '4/18', course: '鳴沢GC',     score: 92, toPar: '+20', putts: 33, best: false, pr: false, note: '3パット 2回。アプローチが寄らない。' },
    { date: '4/10', course: '大洗GC',     score: 89, toPar: '+17', putts: 31, best: true,  pr: true,  note: 'ベスト更新！後半崩れなかったのが大きい。' },
    { date: '3/28', course: '鎌倉CC',     score: 95, toPar: '+23', putts: 36, best: false, pr: false, note: '風が強くてOB 2発。' },
    { date: '3/15', course: '富士平原GC', score: 92, toPar: '+20', putts: 32, best: false, pr: false, note: 'パットは改善傾向。' },
  ],
  currentRound: {
    course: '鳴沢GC',
    hole: 5,
    par: 4,
    yardage: 385,
    strokes: [
      { n: 1, club: '1W', result: 'フェアウェイ', d: 245 },
      { n: 2, club: '7I', result: 'グリーン奥',   d: 150 },
    ],
  },
};

Object.assign(window, { STYLE_DATA });

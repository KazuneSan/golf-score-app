// data-drills.jsx — drill library organized by challenge → condition → drills

const DRILL_LIBRARY = {
  putt: {
    challenge: '3m 以内のパター',
    challengeSub: '3パット率を下げる',
    goal: {
      label: 'ゴール指標',
      metric: '3m 以内カップイン率',
      target: 65,
      targetLabel: '65%',
      benchmark: 'PGA Tour 平均（90%）と 平均的アマ（50%）の間。まずは 65% を目指そう。',
    },
    conditions: [
      {
        key: 'dir',
        title: '方向性ドリル',
        sub: 'カップに向けて真っ直ぐ出す',
        why: '3m以内で外す原因の 6割は「方向のズレ」。ライン上にボールを出せるかが最初の条件。',
        drills: [
          { id: 'dir1', name: 'ゲートドリル',        time: '10分', detail: 'ティー2本でゲートを作り5球×3セット' },
          { id: 'dir2', name: '1m ストレート連続',   time: '5分',  detail: '1m から 10球連続成功まで' },
          { id: 'dir3', name: 'コインを狙う',        time: '10分', detail: '3m 先のコインにボールを止める' },
        ],
      },
      {
        key: 'dist',
        title: '距離感ドリル',
        sub: 'カップを 30cm オーバーするタッチ',
        why: '「決まる距離感」は止める距離感ではなくカップの 30cm先。短いパットほどショートは入らない。',
        drills: [
          { id: 'd1', name: '30cmオーバー×20球', time: '15分', detail: '3m から、すべて 30cm オーバーで止める' },
          { id: 'd2', name: '目つぶりタッチ',    time: '10分', detail: 'ライン見てから目を閉じて打つ' },
          { id: 'd3', name: 'ラダー（1-2-3m）',  time: '15分', detail: '3距離を交互に、1球ずつ' },
        ],
      },
      {
        key: 'repro',
        title: '再現性向上ドリル',
        sub: '毎回同じストロークを作る',
        why: 'プレッシャー下で崩れるのはストロークの再現性が低いから。リズムとテンポの型を作る。',
        drills: [
          { id: 'r1', name: 'メトロノーム(76bpm)', time: '10分', detail: 'バックと切り返しを拍に合わせる' },
          { id: 'r2', name: '片手（利き手）',     time: '5分',  detail: 'フェース管理の感覚' },
          { id: 'r3', name: 'スティック沿い',     time: '10分', detail: 'アライメント棒でヘッド軌道' },
        ],
      },
    ],
  },
  second: {
    challenge: '140-170Y セカンド',
    challengeSub: 'パーオン率を上げる',
    goal: {
      label: 'ゴール指標',
      metric: 'グリーンオン率',
      target: 40,
      targetLabel: '40%',
      benchmark: '90台ゴルファー平均 22%。まずは 40% で、ボギーオンは確実に残せる。',
    },
    conditions: [
      {
        key: 'contact', title: '芯ヒット', sub: 'まずは当たり負けしない',
        why: '150Y前後は距離不足で奥まで届かない人が 7割。芯で捉えれば+10Y伸びる。',
        drills: [
          { id: 's1', name: 'ティーアップ7I',  time: '10分', detail: '低ティー置きで下から払う' },
          { id: 's2', name: 'ハーフスイング',  time: '10分', detail: 'コンパクトに芯を当てる' },
        ],
      },
      {
        key: 'dir', title: '方向性', sub: 'グリーンに対して広く狙う',
        why: 'ピン狙いは事故のもと。グリーン中央に対して左右 10Y の楕円に収める。',
        drills: [
          { id: 's3', name: 'ゲートドリル',    time: '10分', detail: '打ち出し 2Y幅のゲートを抜く' },
          { id: 's4', name: 'フェード限定',    time: '15分', detail: '右から戻す球筋で安全側を作る' },
        ],
      },
      {
        key: 'dist', title: '距離打ち分け', sub: '10Y刻みで3段階',
        why: '150Yひとつでは合わない。140/150/160 の3段階を作ると距離感が安定。',
        drills: [
          { id: 's5', name: 'スイング振り幅',  time: '15分', detail: '肩-肩 / 3時-9時 / 4時-8時' },
          { id: 's6', name: 'クラブ2本使い',   time: '10分', detail: '7I/8I で同じ 150Y を打つ' },
        ],
      },
    ],
  },
  tee: {
    challenge: '右 OB を封じる',
    challengeSub: 'OB率を下げる',
    goal: {
      label: 'ゴール指標',
      metric: 'OB率',
      target: 6,
      targetLabel: '6% 以下',
      benchmark: '右OBは失点が大きい。封じればスコアへの直接効果が最も高い。',
    },
    conditions: [
      {
        key: 'setup', title: 'セットアップ', sub: '開かない構え',
        why: '右OBの原因の 7割はアドレス時に右を向いていること。まず構えを作る。',
        drills: [
          { id: 't1', name: 'アライメント棒',  time: '10分', detail: '足・腰・肩の3線を合わせる' },
          { id: 't2', name: 'ボール位置固定',  time: '5分',  detail: '左踵の内側一点' },
        ],
      },
      {
        key: 'ball', title: '球筋', sub: 'ドローで戻す選択肢',
        why: '右OBを封じる一番早い方法は、右に行かない球筋（ドロー）の保険を持つこと。',
        drills: [
          { id: 't3', name: '右足荷重ドロー',  time: '15分', detail: '6:4 で右に残す' },
          { id: 't4', name: 'フック素振り',    time: '5分',  detail: '振り抜きで左肘をたたむ' },
        ],
      },
    ],
  },
  approach: {
    challenge: '30Y 以内アプローチ',
    challengeSub: '寄せワン率を上げる',
    goal: { label: 'ゴール指標', metric: '寄せワン率', target: 35, targetLabel: '35%',
      benchmark: '寄せワン率 35% で 90切りが現実味。' },
    conditions: [
      {
        key: 'distance', title: '距離感', sub: '振り幅で距離を決める',
        why: '力感で距離を作るとラウンドで再現できない。振り幅の型で決める。',
        drills: [
          { id: 'a1', name: '時計振り幅',     time: '15分', detail: '7-8 / 8-8 / 9-9 時の3段' },
          { id: 'a2', name: '10Y×5本連続',    time: '10分', detail: '同じ距離を 5球連続' },
        ],
      },
      {
        key: 'lie', title: 'ライ判断', sub: '転がす / 上げる の使い分け',
        why: '毎回ロブは難度が高い。転がせるライでは転がす。',
        drills: [
          { id: 'a3', name: 'PW/SWの球質差',  time: '10分', detail: '同じ振り幅で距離の差を知る' },
        ],
      },
    ],
  },
};

// ── Favorites (localStorage) ──────────────────────────────────
// Drills are keyed by the top-level id in DRILL_LIBRARY (e.g. 'approach', 'putter')
// OR by the nested drill-level id (e.g. 'a1', 'a2'). We store whichever is passed.
function isFavDrill(id) {
  try {
    const arr = JSON.parse(localStorage.getItem('gs_fav_drills') || '[]');
    return arr.includes(id);
  } catch { return false; }
}
function toggleFavDrill(id) {
  try {
    const arr = JSON.parse(localStorage.getItem('gs_fav_drills') || '[]');
    const next = arr.includes(id) ? arr.filter(x => x !== id) : [id, ...arr];
    localStorage.setItem('gs_fav_drills', JSON.stringify(next.slice(0, 50)));
    return next.includes(id);
  } catch { return false; }
}
function getFavDrillIds() {
  try {
    return JSON.parse(localStorage.getItem('gs_fav_drills') || '[]');
  } catch { return []; }
}
// Resolve favorite IDs to actual drill objects. Matches both top-level DRILL_LIBRARY
// entries and nested sub-drill (inside focus.drills[]).
function getFavDrills() {
  const ids = getFavDrillIds();
  const out = [];
  for (const id of ids) {
    if (DRILL_LIBRARY[id]) { out.push({ kind: 'top', id, data: DRILL_LIBRARY[id] }); continue; }
    // search nested sub-drills
    for (const topId of Object.keys(DRILL_LIBRARY)) {
      const top = DRILL_LIBRARY[topId];
      for (const focus of (top.focuses || [])) {
        const d = (focus.drills || []).find(x => x.id === id);
        if (d) { out.push({ kind: 'sub', id, parentId: topId, focusKey: focus.key, data: d }); break; }
      }
    }
  }
  return out;
}

Object.assign(window, { DRILL_LIBRARY, isFavDrill, toggleFavDrill, getFavDrillIds, getFavDrills });

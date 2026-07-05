// 基準クリアの在庫計算。
// morupi のコア価値「積み上がった達成の可視化」を担う。
//
// 「基準クリア」の定義: その課題(challengeKey)に対して、
// 合格(passed=true)したテスト結果 または ドリルセッションが1件以上あること。
// = 一度でもモノサシの合格ラインを超えたら「クリア済み」とみなす。

import { ALL_CHALLENGES } from './challenges';
import { getTestResults, getDrillSessions } from './testResults';

const LEVEL_OF = { '100切り': 100, '90切り': 90, '80切り': 80 };

// challengeKey → 初回クリア時刻(ms) のマップを作る。
// 同一課題に複数の合格があれば最も古い ts を初回クリアとする。
async function getFirstClearMap() {
  const [tests, drills] = await Promise.all([
    getTestResults(),
    getDrillSessions(),
  ]);
  const map = {};
  for (const r of [...tests, ...drills]) {
    if (!r || !r.passed || !r.challengeKey) continue;
    const prev = map[r.challengeKey];
    if (prev == null || r.ts < prev) map[r.challengeKey] = r.ts;
  }
  return map;
}

// HOME 表示用の進捗サマリを返す。
export async function getProgress(personaKey = '100切り') {
  const firstClear = await getFirstClearMap();
  const clearedKeys = new Set(Object.keys(firstClear));

  const level = LEVEL_OF[personaKey] || 100;
  const levelChallenges = ALL_CHALLENGES.filter(c => c.level === level);
  const clearedInLevel = levelChallenges.filter(c => clearedKeys.has(c.k)).length;

  // 今月・先月に「初めてクリアした」基準の数(全レベル横断)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  let thisMonth = 0, lastMonth = 0;
  for (const ts of Object.values(firstClear)) {
    if (ts >= monthStart) thisMonth++;
    else if (ts >= lastMonthStart) lastMonth++;
  }

  return {
    levelLabel: personaKey || '100切り',
    clearedInLevel,
    totalInLevel: levelChallenges.length,
    thisMonth,
    lastMonth,
    totalCleared: clearedKeys.size,
  };
}

// クリア済み課題キーの Set を返す(一覧画面でのバッジ表示用)。
export async function getClearedChallengeKeys() {
  const firstClear = await getFirstClearMap();
  return new Set(Object.keys(firstClear));
}

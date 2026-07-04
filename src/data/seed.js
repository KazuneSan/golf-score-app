// Dev helper: seed realistic mock data for testing Home / Practice / Analytics displays.
import { saveRound, clearRounds } from './rounds';
import { saveTestResult, clearTestResults } from './testResults';
import { toggleFavorite, getFavorites, clearFavorites } from './favorites';
import { COURSES } from '../screens/CourseSelectScreen';

const STANDARD_PARS  = [4,5,3,4,4,3,4,5,4, 4,3,5,4,4,3,4,5,4];
const STANDARD_HDCPS = [5,1,15,9,13,17,3,7,11, 6,2,16,10,14,18,4,8,12];
const Y_BY_PAR = { 3: 170, 4: 380, 5: 525 };
const DAY = 86400000;

// Generate 18 holes with `skillOffset` controlling average score bias.
// skillOffset 0 = good, 1.5 = rough
function generateMockHoles(skillOffset = 0) {
  return STANDARD_PARS.map((p, i) => {
    const r = Math.random();
    let delta = r < 0.05 ? -1 : r < 0.35 ? 0 : r < 0.65 ? 1 : r < 0.90 ? 2 : 3;
    // add skill offset biased upward
    if (Math.random() < skillOffset / 2) delta += 1;
    const strokes = Math.max(1, p + Math.max(-1, delta));
    const putts = delta <= 0 ? (Math.random() < 0.25 ? 1 : 2)
                : delta === 1 ? 2
                : (Math.random() < 0.3 ? 3 : 2);
    return {
      no: i + 1, par: p, hdcp: STANDARD_HDCPS[i],
      yards: Y_BY_PAR[p] + Math.round(Math.sin((i + 1) * 1.7) * 30),
      strokes, putts,
      ob: Math.random() < 0.06,
      hazard: Math.random() < 0.08,
      threePutt: false, fairway: null, upDown: null, bunker: false,
      challengeResults: {},
    };
  });
}

function generateMockRound({ daysAgo, skillOffset = 0, course, isPractice = false, practiceChallenges = [] }) {
  const holes = generateMockHoles(skillOffset);
  const total = holes.reduce((a, h) => a + h.strokes, 0);
  const coursePar = STANDARD_PARS.reduce((a, b) => a + b, 0);
  const diff = total - coursePar;
  const endedAt = Date.now() - daysAgo * DAY;
  const startedAt = endedAt - 4 * 3600000; // 4 hours round

  // Fill in practice challenge results per hole for some holes
  if (isPractice && practiceChallenges.length > 0) {
    holes.forEach(h => {
      practiceChallenges.forEach(ck => {
        const r = Math.random();
        h.challengeResults[ck] = r < 0.5 ? '○' : r < 0.8 ? '△' : '×';
      });
    });
  }

  return {
    course: course ? { id: course.id, name: course.name, par: course.par, rating: course.rating, slope: course.slope } : null,
    holes, total, diff,
    target: 95,
    teeColor: 'white',
    isHalf: false,
    startSide: 'OUT',
    isPractice,
    practiceChallenges,
    startedAt, endedAt,
    memo: '',
  };
}

export async function seedMockData() {
  // Clear existing data first
  await clearRounds();
  await clearTestResults();
  await clearFavorites();

  // Use first 5 courses
  const courses = COURSES.slice(0, 5);
  const pickCourse = () => courses[Math.floor(Math.random() * courses.length)];

  // ── 8 scoring rounds, gradual improvement trend
  const roundConfigs = [
    { daysAgo: 60, skillOffset: 1.5 },
    { daysAgo: 50, skillOffset: 1.2 },
    { daysAgo: 40, skillOffset: 1.0 },
    { daysAgo: 32, skillOffset: 0.8 },
    { daysAgo: 22, skillOffset: 0.6 },
    { daysAgo: 14, skillOffset: 0.4 },
    { daysAgo: 6,  skillOffset: 0.2 },
    { daysAgo: 1,  skillOffset: 0.0 },   // newest; within 48h window for Recap CTA
  ];
  for (const cfg of roundConfigs) {
    const r = generateMockRound({ ...cfg, course: pickCourse() });
    await saveRound(r);
  }

  // ── 3 practice rounds spread over ~1 month
  const practiceConfigs = [
    { daysAgo: 28, skillOffset: 0.8, challenges: ['putt', 'second'] },
    { daysAgo: 18, skillOffset: 0.6, challenges: ['tee-dir', 'approach'] },
    { daysAgo: 8,  skillOffset: 0.4, challenges: ['second'] },
  ];
  for (const cfg of practiceConfigs) {
    const r = generateMockRound({
      daysAgo: cfg.daysAgo, skillOffset: cfg.skillOffset,
      course: pickCourse(), isPractice: true, practiceChallenges: cfg.challenges,
    });
    await saveRound(r);
  }

  // ── Drill test results (goal tests)
  const testResults = [
    { challengeKey: 'second', attempts: 6, successes: 3, pct: 50, passed: true, stars: 2, ts: Date.now() - 3 * DAY },
    { challengeKey: 'second', attempts: 6, successes: 4, pct: 67, passed: true, stars: 3, ts: Date.now() - 1 * DAY },
    { challengeKey: 'putt',   attempts: 10, successes: 6, pct: 60, passed: true, stars: 3, ts: Date.now() - 5 * DAY },
    { challengeKey: 'approach', attempts: 8, successes: 3, pct: 38, passed: false, stars: 1, ts: Date.now() - 10 * DAY },
  ];
  for (const r of testResults) await saveTestResult(r, false);

  // ── Drill sessions
  const drillSessions = [
    { challengeKey: 'putt', drillId: 'p1', attempts: 6, successes: 5, pct: 83, passed: true, stars: 3, ts: Date.now() - 2 * DAY },
    { challengeKey: 'second', drillId: 's1', attempts: 6, successes: 4, pct: 67, passed: true, stars: 2, ts: Date.now() - 4 * DAY },
  ];
  for (const r of drillSessions) await saveTestResult(r, true);

  // ── Favorite a couple drills
  await toggleFavorite('p1');   // ゲートドリル
  await toggleFavorite('s1');   // メトロノーム

  return {
    rounds: roundConfigs.length,
    practiceRounds: practiceConfigs.length,
    testResults: testResults.length,
    drillSessions: drillSessions.length,
    favorites: 2,
  };
}

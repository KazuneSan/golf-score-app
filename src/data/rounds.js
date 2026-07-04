// Round history — persisted via AsyncStorage.
// Scoring rounds vs practice rounds stored separately to avoid practice skewing averages.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SCORING = 'morupi_rounds';
const KEY_PRACTICE = 'morupi_practice_rounds';
const MAX_KEEP = 100;

function keyFor(isPractice) {
  return isPractice ? KEY_PRACTICE : KEY_SCORING;
}

export async function saveRound(round) {
  // round minimally has: course, holes, total, diff, startedAt, endedAt, isPractice
  const key = keyFor(!!round.isPractice);
  try {
    const v = await AsyncStorage.getItem(key);
    const arr = v ? JSON.parse(v) : [];
    arr.unshift(round);
    await AsyncStorage.setItem(key, JSON.stringify(arr.slice(0, MAX_KEEP)));
  } catch (e) { /* noop */ }
}

export async function getLatestRound({ practiceIncluded = false } = {}) {
  try {
    const v = await AsyncStorage.getItem(KEY_SCORING);
    const s = v ? JSON.parse(v) : [];
    if (!practiceIncluded) return s[0] || null;
    const v2 = await AsyncStorage.getItem(KEY_PRACTICE);
    const p = v2 ? JSON.parse(v2) : [];
    const latest = [s[0], p[0]].filter(Boolean).sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
    return latest[0] || null;
  } catch { return null; }
}

export async function getAllRounds() {
  try {
    const v = await AsyncStorage.getItem(KEY_SCORING);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

export async function getAllPracticeRounds() {
  try {
    const v = await AsyncStorage.getItem(KEY_PRACTICE);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

export async function clearRounds() {
  await AsyncStorage.removeItem(KEY_SCORING);
  await AsyncStorage.removeItem(KEY_PRACTICE);
}

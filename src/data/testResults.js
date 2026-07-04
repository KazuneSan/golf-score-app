// Drill Test / Drill Session results — persisted via AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TEST = 'morupi_test_results';
const KEY_DRILL = 'morupi_drill_sessions';
const MAX = 500;

// entry shape:
// { challengeKey, drillId?, ts, attempts, successes, pct, passed, stars }
export async function saveTestResult(entry, isDrill = false) {
  const key = isDrill ? KEY_DRILL : KEY_TEST;
  try {
    const v = await AsyncStorage.getItem(key);
    const arr = v ? JSON.parse(v) : [];
    arr.unshift(entry);
    await AsyncStorage.setItem(key, JSON.stringify(arr.slice(0, MAX)));
  } catch {}
}

export async function getTestResults(challengeKey = null) {
  try {
    const v = await AsyncStorage.getItem(KEY_TEST);
    const all = v ? JSON.parse(v) : [];
    return challengeKey ? all.filter(r => r.challengeKey === challengeKey) : all;
  } catch { return []; }
}

export async function getBestTestResult(challengeKey) {
  const results = await getTestResults(challengeKey);
  if (!results.length) return null;
  return results.reduce((b, r) => (r.pct > (b?.pct || 0) ? r : b), null);
}

export async function getDrillSessions({ drillId = null, challengeKey = null } = {}) {
  try {
    const v = await AsyncStorage.getItem(KEY_DRILL);
    const all = v ? JSON.parse(v) : [];
    return all.filter(r => {
      if (drillId && r.drillId !== drillId) return false;
      if (challengeKey && r.challengeKey !== challengeKey) return false;
      return true;
    });
  } catch { return []; }
}

export async function getBestDrillSession(drillId) {
  const sessions = await getDrillSessions({ drillId });
  if (!sessions.length) return null;
  return sessions.reduce((b, r) => (r.stars > (b?.stars || 0) ? r : b), null);
}

export async function clearTestResults() {
  await AsyncStorage.removeItem(KEY_TEST);
  await AsyncStorage.removeItem(KEY_DRILL);
}

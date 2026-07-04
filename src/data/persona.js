// Persona / onboarding data — persisted via AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'morupi_persona';

export function scoreToPersonaKey(score) {
  if (score <= 84) return '80切り';
  if (score <= 94) return '90切り';
  return '100切り';
}

// Per-persona baseline stats and targets (used for Home FOCUS cells and focus label).
// `stats` is the mock baseline shown before any rounds accumulate; once rounds exist,
// HomeScreen overrides these with computed values.
// Stats represent "current typical performance"; targets represent "to reach next level".
// Values are chosen so FOCUS 3x2 shows a balanced mix (~2-3 warn, ~3-4 ok) on a fresh account.
export const PERSONA_PROFILES = {
  '100切り': {
    focus: ['ボギーオン率', '3パット率'],
    stats:   { boggyOn: 55, parOn: 12, fairway: 52, upDown: 32, threePutt: 9,  ob: 1.8 },
    targets: { boggyOn: 60, parOn: 20, fairway: 50, upDown: 30, threePutt: 10, ob: 2.0 },
  },
  '90切り': {
    focus: ['ボギーオン率', 'パーオン率'],
    stats:   { boggyOn: 78, parOn: 28, fairway: 62, upDown: 42, threePutt: 5,  ob: 0.7 },
    targets: { boggyOn: 80, parOn: 35, fairway: 60, upDown: 40, threePutt: 6,  ob: 0.8 },
  },
  '80切り': {
    focus: ['パーオン率', '寄せワン率'],
    stats:   { boggyOn: 94, parOn: 50, fairway: 72, upDown: 58, threePutt: 1.5, ob: 0.15 },
    targets: { boggyOn: 92, parOn: 55, fairway: 70, upDown: 60, threePutt: 2,   ob: 0.2 },
  },
};

// Focus metric → challenge key, per persona level.
// キーは必ず challenges.js の ALL_CHALLENGES に実在するものを使うこと
// (存在しないキーだと DrillList が空になる。v0.1.0 で実際に起きたバグ)。
const METRIC_TO_CHALLENGE_BY_LEVEL = {
  '100切り': {
    boggyOn:   'mgmt-bogey-on-100',
    parOn:     'iron-100yd',
    fairway:   'ob-tee',
    upDown:    'zakuri-100',
    threePutt: 'putt-3putt-100',
    ob:        'ob-tee',
  },
  '90切り': {
    boggyOn:   'mgmt-bogey-on-90',
    parOn:     'iron-130yd',
    fairway:   'ob-tee-90',
    upDown:    'approach-chip-90',
    threePutt: 'putt-long-90',
    ob:        'ob-tee-90',
  },
  '80切り': {
    boggyOn:   'mgmt-bogey-on-80',
    parOn:     'iron-140yd',
    fairway:   'mgmt-dispersion-80',
    upDown:    'approach-chip-80',
    threePutt: 'putt-15m-80',
    ob:        'mgmt-dispersion-80',
  },
};

const FOCUS_LABEL_TO_METRIC = {
  'ボギーオン率': 'boggyOn',
  'パーオン率':   'parOn',
  'FWキープ率':   'fairway',
  '寄せワン率':   'upDown',
  '3パット率':    'threePutt',
  'OB率':         'ob',
};

export function metricToChallenge(metricKey, personaKey = '100切り') {
  const table = METRIC_TO_CHALLENGE_BY_LEVEL[personaKey]
    || METRIC_TO_CHALLENGE_BY_LEVEL['100切り'];
  return table[metricKey] || null;
}

export function focusToChallenge(focusLabel, personaKey = '100切り') {
  const metricKey = FOCUS_LABEL_TO_METRIC[focusLabel];
  return metricKey ? metricToChallenge(metricKey, personaKey) : null;
}

export async function getPersona() {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

// persona: { best, avg, goal, years, personaKey, completedAt }
export async function savePersona(persona) {
  await AsyncStorage.setItem(KEY, JSON.stringify(persona));
}

export async function hasCompletedOnboarding() {
  const p = await getPersona();
  return !!p && p.completedAt != null;
}

export async function clearPersona() {
  await AsyncStorage.removeItem(KEY);
}

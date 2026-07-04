// App-wide user preferences — persisted via AsyncStorage.
// - Round options: which per-hole trackers to show (OB/hazard/3putt/fw/upDown/bunker)
// - Custom round options: user-added tracker items
// - Language preference
import AsyncStorage from '@react-native-async-storage/async-storage';

const OPTS_KEY = 'morupi_round_options';
const CUSTOM_KEY = 'morupi_round_custom_options';
const LANG_KEY = 'morupi_lang';
const MISS_TYPES_KEY = 'morupi_miss_types';

export const MISS_TYPE_OPTIONS = [
  { key: 'push',   label: '右プッシュ' },
  { key: 'chipin', label: 'チーピン' },
  { key: 'top',    label: 'トップ' },
  { key: 'daff',   label: 'ダフリ' },
];
export const DEFAULT_MISS_TYPES = { push: false, chipin: false, top: false, daff: false };

export async function getMissTypes() {
  try {
    const v = await AsyncStorage.getItem(MISS_TYPES_KEY);
    return v ? { ...DEFAULT_MISS_TYPES, ...JSON.parse(v) } : DEFAULT_MISS_TYPES;
  } catch { return DEFAULT_MISS_TYPES; }
}

export async function setMissTypes(types) {
  await AsyncStorage.setItem(MISS_TYPES_KEY, JSON.stringify(types));
}

export async function getEnabledMissTypes() {
  const types = await getMissTypes();
  return MISS_TYPE_OPTIONS.filter(o => types[o.key]);
}

export const DEFAULT_ROUND_OPTIONS = {
  ob: true, hazard: true, threePutt: true,
  fairway: true, upDown: false, bunker: false,
};

export const BUILTIN_OPTION_LABELS = {
  ob: 'OB', hazard: 'ハザード', threePutt: '3パット',
  fairway: 'FWキープ', upDown: '寄せワン', bunker: 'バンカー',
};
export const BUILTIN_OPTION_SUBS = {
  ob: 'ホール毎に記録', hazard: 'ホール毎に記録', threePutt: '自動集計対象',
  fairway: 'パー4以上のみ', upDown: 'グリーン外から1パット', bunker: 'サンドセーブ',
};
export const BUILTIN_OPTION_ORDER = ['ob', 'hazard', 'threePutt', 'fairway', 'upDown', 'bunker'];

export async function getRoundOptions() {
  try {
    const v = await AsyncStorage.getItem(OPTS_KEY);
    return v ? { ...DEFAULT_ROUND_OPTIONS, ...JSON.parse(v) } : DEFAULT_ROUND_OPTIONS;
  } catch {
    return DEFAULT_ROUND_OPTIONS;
  }
}

export async function setRoundOptions(opts) {
  await AsyncStorage.setItem(OPTS_KEY, JSON.stringify(opts));
}

// ─── Custom round options ───
// Shape: [{ key, label, enabled }]
export async function getCustomOptions() {
  try {
    const v = await AsyncStorage.getItem(CUSTOM_KEY);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

export async function addCustomOption(label) {
  const all = await getCustomOptions();
  const key = `custom_${Date.now()}`;
  const next = [...all, { key, label: label.slice(0, 12), enabled: true }];
  await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  return next;
}

export async function removeCustomOption(key) {
  const all = await getCustomOptions();
  const next = all.filter(c => c.key !== key);
  await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  return next;
}

export async function toggleCustomOption(key) {
  const all = await getCustomOptions();
  const next = all.map(c => c.key === key ? { ...c, enabled: !c.enabled } : c);
  await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  return next;
}

// ─── Enabled list for RoundScreen ───
// Returns [{ key, label, isCustom }] combining built-in + custom
export async function getEnabledRoundOptions() {
  const opts = await getRoundOptions();
  const builtIn = BUILTIN_OPTION_ORDER
    .filter(k => opts[k])
    .map(k => ({ key: k, label: BUILTIN_OPTION_LABELS[k], isCustom: false }));
  const custom = await getCustomOptions();
  const customEnabled = custom
    .filter(c => c.enabled)
    .map(c => ({ key: c.key, label: c.label, isCustom: true }));
  return [...builtIn, ...customEnabled];
}

// Backward-compatible helper (keys only)
export async function getEnabledRoundOptionKeys() {
  const list = await getEnabledRoundOptions();
  return list.map(o => o.key);
}

// ─── Language ───
export async function getLang() {
  try {
    return (await AsyncStorage.getItem(LANG_KEY)) || 'ja';
  } catch { return 'ja'; }
}

export async function setLang(lang) {
  await AsyncStorage.setItem(LANG_KEY, lang);
}

export async function clearSettings() {
  await AsyncStorage.multiRemove([OPTS_KEY, CUSTOM_KEY, LANG_KEY, MISS_TYPES_KEY]);
}

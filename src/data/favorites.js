// Drill favorites — persisted via AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'morupi_fav_drills';

export async function getFavorites() {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

export async function isFavorite(drillId) {
  if (!drillId) return false;
  const favs = await getFavorites();
  return favs.includes(drillId);
}

export async function toggleFavorite(drillId) {
  const favs = await getFavorites();
  const has = favs.includes(drillId);
  const next = has ? favs.filter(x => x !== drillId) : [drillId, ...favs];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return !has; // return new state (true = favorite)
}

export async function clearFavorites() {
  await AsyncStorage.removeItem(KEY);
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'morupi_clubs';

export const DEFAULT_CLUBS = [
  { id: 'dr',  name: 'DR',  minDist: 210, maxDist: 250 },
  { id: '3w',  name: '3W',  minDist: 190, maxDist: 220 },
  { id: '5w',  name: '5W',  minDist: 175, maxDist: 205 },
  { id: 'ut',  name: 'UT',  minDist: 165, maxDist: 195 },
  { id: '5i',  name: '5I',  minDist: 155, maxDist: 180 },
  { id: '6i',  name: '6I',  minDist: 145, maxDist: 165 },
  { id: '7i',  name: '7I',  minDist: 135, maxDist: 155 },
  { id: '8i',  name: '8I',  minDist: 120, maxDist: 140 },
  { id: '9i',  name: '9I',  minDist: 110, maxDist: 130 },
  { id: 'pw',  name: 'PW',  minDist:  95, maxDist: 115 },
  { id: 'aw',  name: 'AW',  minDist:  75, maxDist:  95 },
  { id: 'sw',  name: 'SW',  minDist:  55, maxDist:  80 },
  { id: 'pt',  name: 'PT',  minDist:   0, maxDist:   0 },
];

export async function getClubs() {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v ? JSON.parse(v) : DEFAULT_CLUBS;
  } catch { return DEFAULT_CLUBS; }
}

export async function setClubs(clubs) {
  await AsyncStorage.setItem(KEY, JSON.stringify(clubs));
}

export async function clearClubs() {
  await AsyncStorage.removeItem(KEY);
}

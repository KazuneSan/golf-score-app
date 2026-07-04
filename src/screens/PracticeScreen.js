import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { THEMES, FONT } from '../theme/tokens';
import { ALL_CHALLENGES, RECENT_CHALLENGE_KEYS } from '../data/challenges';
import { getDrillsForChallenge, getDrillDetail, DRILL_DETAILS } from '../data/drillDetails';
import { getFavorites } from '../data/favorites';
import { getAllPracticeRounds } from '../data/rounds';
import { getChallenge } from '../data/challenges';

const theme = THEMES.light;

// Show recent 3 + all others (grouped)
const RECENT_CH = RECENT_CHALLENGE_KEYS
  .map(k => ALL_CHALLENGES.find(c => c.k === k))
  .filter(Boolean);
const OTHER_CH = ALL_CHALLENGES.filter(c => !RECENT_CHALLENGE_KEYS.includes(c.k));

const LEVELS = [
  { label: '全て',    value: null },
  { label: '100切り', value: 100 },
  { label: '90切り',  value: 90 },
  { label: '80切り',  value: 80 },
];

const CAT_LABELS = {
  tee:      'ティー',
  iron:     'アイアン',
  approach: 'アプローチ',
  bunker:   'バンカー',
  putt:     'パット',
  mgmt:     'マネジメント',
  mental:   'メンタル',
};

const CATS = [
  { label: '全て', value: null },
  ...Object.entries(CAT_LABELS).map(([k, v]) => ({ label: v, value: k })),
];

// Find which challenge a drill belongs to
function findChallengeForDrill(drillId) {
  for (const c of ALL_CHALLENGES) {
    const list = getDrillsForChallenge(c.k);
    if (list.some(d => d.id === drillId)) return c.k;
  }
  return null;
}

export default function PracticeScreen() {
  const navigation = useNavigation();
  const [favs, setFavs] = useState([]);
  const [practiceRounds, setPracticeRounds] = useState([]);
  const [levelFilter, setLevelFilter] = useState(null);
  const [catFilter, setCatFilter] = useState(null);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      getFavorites().then(setFavs);
      getAllPracticeRounds().then(setPracticeRounds);
    }, [])
  );
  const goDrills = (k) => navigation.navigate('DrillList', { challengeKey: k });
  const goRoundTest = () => navigation.navigate('CourseSelect');
  const openDrill = (drillId) => {
    const ch = findChallengeForDrill(drillId);
    navigation.navigate('DrillDetail', { drillId, challengeKey: ch });
  };
  const favDrills = favs.map(id => ({ id, detail: DRILL_DETAILS[id] })).filter(f => f.detail);

  const isFiltered = levelFilter !== null || catFilter !== null || query.trim() !== '';
  const filteredChallenges = useMemo(() => ALL_CHALLENGES.filter(c => {
    if (levelFilter !== null && c.level !== levelFilter) return false;
    if (catFilter  !== null && c.category !== catFilter)  return false;
    if (query.trim() && !c.label.includes(query.trim()))  return false;
    return true;
  }), [levelFilter, catFilter, query]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.tag}>PRACTICE</Text>
      <Text style={styles.title}>練習モード</Text>

      {/* Favorites */}
      {favDrills.length > 0 && (
        <View style={{ marginTop: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Svg width={13} height={13} viewBox="0 0 16 16" fill={theme.warn}>
              <Path d="M8 13.5s-5.5-3.2-5.5-7.2c0-2 1.5-3.3 3.2-3.3 1.1 0 2 .6 2.3 1.5.3-.9 1.2-1.5 2.3-1.5 1.7 0 3.2 1.3 3.2 3.3 0 4-5.5 7.2-5.5 7.2z" fill={theme.warn} />
            </Svg>
            <Text style={styles.label}>お気に入りドリル</Text>
            <Text style={styles.favCount}>{favDrills.length}</Text>
          </View>
          <View style={{ marginTop: 8, gap: 6 }}>
            {favDrills.slice(0, 3).map(f => (
              <Pressable key={f.id} onPress={() => openDrill(f.id)} style={styles.favRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.favName}>{f.detail.name}</Text>
                  <Text style={styles.favSub}>{f.detail.condition} · {f.detail.time}</Text>
                </View>
                <Text style={styles.chArrow}>→</Text>
              </Pressable>
            ))}
            {favDrills.length > 3 && (
              <Text style={styles.favMore}>+ {favDrills.length - 3} 件</Text>
            )}
          </View>
        </View>
      )}

      {/* DRILL section */}
      <View style={{ marginTop: 22 }}>
        <Text style={styles.sectionTag}>DRILL</Text>
        <Text style={styles.sectionTitle}>課題を潰す</Text>
        <Text style={styles.sectionSub}>弱点の要素を、ひとつずつ反復で磨き上げる</Text>

        {/* 検索バー */}
        <View style={styles.searchBar}>
          <Svg width={14} height={14} viewBox="0 0 16 16" style={{ marginRight: 7, opacity: 0.38 }}>
            <Path d="M6.5 1a5.5 5.5 0 0 1 4.26 9.005l3.12 3.12a.75.75 0 0 1-1.06 1.06l-3.12-3.12A5.5 5.5 0 1 1 6.5 1zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" fill={theme.text} />
          </Svg>
          <TextInput
            style={styles.searchInput}
            placeholder="課題を検索..."
            placeholderTextColor={theme.textTer}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* レベル セグメント */}
        <View style={styles.segment}>
          {LEVELS.map(l => {
            const active = levelFilter === l.value;
            return (
              <Pressable
                key={String(l.value)}
                style={[styles.segItem, active && styles.segItemActive]}
                onPress={() => setLevelFilter(l.value)}>
                <Text style={[styles.segText, active && styles.segTextActive]}>{l.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* カテゴリ チップ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}>
          {CATS.map(cat => {
            const active = catFilter === cat.value;
            return (
              <Pressable
                key={String(cat.value)}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCatFilter(cat.value)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isFiltered ? (
          <>
            <Text style={styles.resultCount}>{filteredChallenges.length} 件</Text>
            {filteredChallenges.length === 0 ? (
              <Text style={styles.emptyFilter}>該当する課題がありません</Text>
            ) : (
              <View style={{ marginTop: 4, gap: 8 }}>
                {filteredChallenges.map((c, i) => (
                  <ChallengeRow key={c.k} c={c} onPress={() => goDrills(c.k)} first={i === 0}
                    showLevel={levelFilter === null} />
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.label, { marginTop: 4 }]}>最近取り組んだ課題</Text>
            <View style={{ marginTop: 8, gap: 8 }}>
              {RECENT_CH.map((c, i) => (
                <ChallengeRow key={c.k} c={c} onPress={() => goDrills(c.k)} first={i === 0} />
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 18 }]}>その他の課題</Text>
            <View style={{ marginTop: 8, gap: 8 }}>
              {OTHER_CH.map((c, i) => (
                <ChallengeRow key={c.k} c={c} onPress={() => goDrills(c.k)} first={i === 0} />
              ))}
            </View>
          </>
        )}
      </View>

      {/* ROUND TEST section */}
      <View style={{ marginTop: 30 }}>
        <Text style={styles.sectionTag}>ROUND TEST</Text>
        <Text style={styles.sectionTitle}>ラウンドで検証</Text>
        <Text style={styles.sectionSub}>ドリルの成果が本番で出せたか、○△× で記録</Text>
        <Pressable onPress={goRoundTest} style={styles.roundTestBtn}>
          <View style={{ flex: 1 }}>
            <Text style={styles.roundTestTitle}>練習ラウンドを始める</Text>
            <Text style={styles.roundTestSub}>コース選択 → 確認課題を設定 → ○△× 記録</Text>
          </View>
          <Text style={styles.roundTestArrow}>→</Text>
        </Pressable>
        <Text style={styles.roundTestHint}>平均スコアには反映されず、練習ログとしていつでも見返せます</Text>
      </View>

      {/* History placeholder */}
      <View style={{ marginTop: 30 }}>
        <Text style={styles.label}>練習ラウンド履歴</Text>
        {practiceRounds.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>まだ記録がありません</Text>
            <Text style={styles.emptySub}>練習ラウンドを1回こなすと、ここに表示されます</Text>
          </View>
        ) : (
          <View style={{ marginTop: 8, gap: 6 }}>
            {practiceRounds.slice(0, 5).map((r, i) => {
              const date = new Date(r.endedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
              const chLabels = (r.practiceChallenges || []).map(k => getChallenge(k)?.label).filter(Boolean);
              return (
                <View key={i} style={styles.prRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.prName} numberOfLines={1}>{r.course?.name || 'コース'}</Text>
                    <Text style={styles.prMeta}>
                      {date}  ·  {r.isHalf ? '9H' : '18H'}
                      {chLabels.length > 0 && `  ·  ${chLabels.join(' / ')}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.prScore}>{r.total}</Text>
                    <Text style={[styles.prDiff, { color: r.diff > 0 ? theme.warn : r.diff < 0 ? theme.good : theme.textSec }]}>
                      {r.diff >= 0 ? '+' : ''}{r.diff}
                    </Text>
                  </View>
                </View>
              );
            })}
            {practiceRounds.length > 5 && (
              <Text style={styles.prMore}>+ {practiceRounds.length - 5} 件</Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

function ChallengeRow({ c, onPress, first, showLevel = false }) {
  const drillCount = getDrillsForChallenge(c.k).length;
  return (
    <Pressable onPress={onPress} style={styles.chRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.chLabel}>{c.label}</Text>
        <View style={styles.chSubRow}>
          {showLevel && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{c.level}切り</Text>
            </View>
          )}
          <Text style={styles.chSub} numberOfLines={1}>{c.sub} · {c.metric}</Text>
        </View>
      </View>
      <Text style={styles.chMeta}>{drillCount} drills</Text>
      <Text style={styles.chArrow}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  tag: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '700', color: theme.text, marginTop: 4, letterSpacing: -0.3 },
  label: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  // Section
  sectionTag: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.text, marginTop: 4, letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, color: theme.textSec, marginTop: 3, lineHeight: 18 },
  // フィルター
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surfaceAlt, borderRadius: 9,
    marginTop: 14, paddingHorizontal: 11, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: theme.text, padding: 0 },
  segment: {
    flexDirection: 'row', marginTop: 10,
    backgroundColor: theme.surfaceAlt, borderRadius: 9, padding: 3,
  },
  segItem: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 7 },
  segItemActive: {
    backgroundColor: theme.bg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10, shadowRadius: 2, elevation: 2,
  },
  segText: { fontSize: 11, fontWeight: '500', color: theme.textSec },
  segTextActive: { color: theme.text, fontWeight: '700' },
  chipsScroll: { flexGrow: 0, marginTop: 8 },
  chipsRow: { flexDirection: 'row', gap: 6, paddingBottom: 2 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.bg,
  },
  chipActive: { backgroundColor: theme.text, borderColor: theme.text },
  chipText: { fontSize: 11, fontWeight: '500', color: theme.textSec },
  chipTextActive: { color: theme.bg, fontWeight: '600' },
  resultCount: {
    fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
    letterSpacing: 0.8, fontWeight: '500', marginTop: 12, marginBottom: 4,
  },
  emptyFilter: { fontSize: 13, color: theme.textSec, textAlign: 'center', marginTop: 32 },
  // Challenge row
  chRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.surface, gap: 10 },
  chLabel: { fontSize: 14, fontWeight: '600', color: theme.text, letterSpacing: -0.1 },
  chSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 5 },
  chSub: { fontSize: 11, color: theme.textSec, flex: 1 },
  chMeta: { fontFamily: FONT.mono, fontSize: 11, color: theme.text, fontWeight: '500' },
  chArrow: { fontFamily: FONT.mono, fontSize: 14, color: theme.textSec },
  levelBadge: { backgroundColor: theme.surfaceAlt, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  levelBadgeText: { fontSize: 10, fontWeight: '600', color: theme.textSec, letterSpacing: 0.2 },
  // Favorites
  favCount: { fontFamily: FONT.mono, fontSize: 10, color: theme.warn, fontWeight: '700' },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.surface, borderLeftWidth: 3, borderLeftColor: theme.warn },
  favName: { fontSize: 13, fontWeight: '600', color: theme.text, letterSpacing: -0.1 },
  favSub: { fontSize: 10.5, color: theme.textSec, marginTop: 2, fontFamily: FONT.mono, letterSpacing: 0.2 },
  favMore: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, textAlign: 'center', paddingTop: 4 },
  // Practice rounds history
  prRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.surface },
  prName: { fontSize: 13, fontWeight: '600', color: theme.text, letterSpacing: -0.1 },
  prMeta: { fontSize: 10.5, color: theme.textSec, marginTop: 2, fontFamily: FONT.mono, letterSpacing: 0.2 },
  prScore: { fontFamily: FONT.mono, fontSize: 18, fontWeight: '500', color: theme.text, letterSpacing: -0.5 },
  prDiff: { fontFamily: FONT.mono, fontSize: 11, fontWeight: '500', marginTop: 2 },
  prMore: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, textAlign: 'center', paddingTop: 4 },
  // Round test
  roundTestBtn: { marginTop: 10, padding: 14, borderWidth: 1, borderColor: theme.borderStrong, borderRadius: 8, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  roundTestTitle: { fontSize: 14, fontWeight: '700', color: theme.text, letterSpacing: -0.2 },
  roundTestSub: { fontSize: 11, color: theme.textSec, marginTop: 3, lineHeight: 16 },
  roundTestArrow: { fontFamily: FONT.mono, fontSize: 14, color: theme.textSec },
  roundTestHint: { marginTop: 10, fontFamily: FONT.mono, fontSize: 10.5, color: theme.textTer, letterSpacing: 0.3, lineHeight: 17 },
  // Empty
  empty: { marginTop: 10, padding: 20, borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed', borderRadius: 8, backgroundColor: theme.bg, alignItems: 'center' },
  emptyTitle: { fontSize: 12, color: theme.textSec, fontWeight: '500' },
  emptySub: { fontSize: 10.5, color: theme.textTer, marginTop: 4, textAlign: 'center', lineHeight: 15 },
});

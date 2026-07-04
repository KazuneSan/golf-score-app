import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { THEMES, FONT } from '../theme/tokens';
import { ALL_CHALLENGES, RECENT_CHALLENGE_KEYS } from '../data/challenges';

const theme = THEMES.light;

// ── フィルター定数 ──────────────────────────────────────────────
const LEVELS = [
  { label: '全て',   value: null },
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

// ─────────────────────────────────────────────────────────────
export default function ChallengePickerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const initial = route.params?.current || [];
  const [selected, setSelected]     = useState(initial);
  const [levelFilter, setLevelFilter] = useState(null);
  const [catFilter, setCatFilter]   = useState(null);
  const [query, setQuery]           = useState('');

  const toggle = (k) => {
    setSelected(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };

  const isFiltered = levelFilter !== null || catFilter !== null || query.trim() !== '';

  const filtered = useMemo(() => ALL_CHALLENGES.filter(c => {
    if (levelFilter !== null && c.level !== levelFilter) return false;
    if (catFilter  !== null && c.category !== catFilter)  return false;
    if (query.trim() && !c.label.includes(query.trim()))  return false;
    return true;
  }), [levelFilter, catFilter, query]);

  // 非フィルター時: 最近 + その他
  const recentSet = new Set(RECENT_CHALLENGE_KEYS);
  const recent = RECENT_CHALLENGE_KEYS
    .map(k => ALL_CHALLENGES.find(c => c.k === k)).filter(Boolean);
  const others = ALL_CHALLENGES.filter(c => !recentSet.has(c.k));

  const done = () => {
    navigation.navigate({
      name: 'RoundSetup',
      params: { practiceChallenges: selected },
      merge: true,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>

      {/* ── フィルターヘッダー (固定) ── */}
      <View style={styles.filterArea}>
        {/* 検索バー */}
        <View style={styles.searchBar}>
          <Svg width={15} height={15} viewBox="0 0 16 16"
            style={{ marginRight: 8, opacity: 0.38 }}>
            <Path
              d="M6.5 1a5.5 5.5 0 0 1 4.26 9.005l3.12 3.12a.75.75 0 0 1-1.06 1.06l-3.12-3.12A5.5 5.5 0 1 1 6.5 1zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
              fill={theme.text} />
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
                <Text style={[styles.segText, active && styles.segTextActive]}>
                  {l.label}
                </Text>
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
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── リスト ── */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>

        {isFiltered ? (
          /* フィルター適用時: フラットリスト */
          <>
            <Text style={styles.resultCount}>{filtered.length} 件</Text>
            {filtered.length === 0 ? (
              <Text style={styles.empty}>該当する課題がありません</Text>
            ) : (
              <View style={styles.card}>
                {filtered.map((c, i) => (
                  <ChallengeRow
                    key={c.k} c={c}
                    on={selected.includes(c.k)}
                    onToggle={() => toggle(c.k)}
                    first={i === 0}
                    showLevel={levelFilter === null} />
                ))}
              </View>
            )}
          </>
        ) : (
          /* デフォルト: 最近 + その他 */
          <>
            <Text style={styles.subtitle}>
              練習ラウンドで「できた？」を記録する課題をチェック
            </Text>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>最近取り組んだ課題</Text>
            <View style={styles.card}>
              {recent.map((c, i) => (
                <ChallengeRow
                  key={c.k} c={c}
                  on={selected.includes(c.k)}
                  onToggle={() => toggle(c.k)}
                  first={i === 0} />
              ))}
            </View>
            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>その他の課題</Text>
            <View style={styles.card}>
              {others.map((c, i) => (
                <ChallengeRow
                  key={c.k} c={c}
                  on={selected.includes(c.k)}
                  onToggle={() => toggle(c.k)}
                  first={i === 0} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── フッター ── */}
      <SafeAreaView
        edges={['bottom']}
        style={{ backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border }}>
        <View style={styles.footer}>
          <Pressable onPress={done} style={styles.doneBtn}>
            <Text style={styles.doneText}>
              完了（{selected.length} 個選択中）
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
function ChallengeRow({ c, on, onToggle, first, showLevel = false }) {
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.row, !first && styles.rowBorder]}>
      <View style={[styles.box, on && styles.boxOn]}>
        {on && (
          <Svg width={12} height={12} viewBox="0 0 12 12">
            <Path
              d="M2 6 L 5 9 L 10 3"
              stroke={theme.bg} strokeWidth={2} fill="none"
              strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowLabel}>{c.label}</Text>
        <View style={styles.rowSubRow}>
          {showLevel && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{c.level}切り</Text>
            </View>
          )}
          <Text style={styles.rowSub} numberOfLines={1}>
            {c.sub} · {c.metric}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── フィルターエリア
  filterArea: {
    backgroundColor: theme.bg,
    paddingTop: 10,
    paddingBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceAlt,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
    padding: 0,
  },
  // ── レベル セグメント
  segment: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 9,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 9,
    padding: 3,
  },
  segItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 7,
  },
  segItemActive: {
    backgroundColor: theme.bg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 2,
    elevation: 2,
  },
  segText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textSec,
  },
  segTextActive: {
    color: theme.text,
    fontWeight: '700',
  },
  // ── カテゴリ チップ
  chipsScroll: { flexGrow: 0 },
  chipsRow: {
    paddingHorizontal: 16,
    paddingBottom: 9,
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  chipActive: {
    backgroundColor: theme.text,
    borderColor: theme.text,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textSec,
  },
  chipTextActive: {
    color: theme.bg,
    fontWeight: '600',
  },
  // ── リスト
  content: { padding: 20, paddingBottom: 40 },
  resultCount: {
    fontFamily: FONT.mono,
    fontSize: 10,
    color: theme.textTer,
    letterSpacing: 0.8,
    fontWeight: '500',
    marginBottom: 8,
  },
  empty: {
    fontSize: 14,
    color: theme.textSec,
    textAlign: 'center',
    marginTop: 48,
  },
  subtitle: { fontSize: 12, color: theme.textSec, lineHeight: 18 },
  sectionLabel: {
    fontFamily: FONT.mono,
    fontSize: 10,
    color: theme.textTer,
    letterSpacing: 0.8,
    fontWeight: '500',
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.surface,
  },
  // ── 課題行
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: theme.text, borderColor: theme.text },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
    letterSpacing: -0.1,
  },
  rowSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 5,
  },
  levelBadge: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.textSec,
    letterSpacing: 0.2,
  },
  rowSub: {
    fontSize: 11,
    color: theme.textSec,
    flex: 1,
  },
  // ── フッター
  footer: { paddingHorizontal: 20, paddingVertical: 12 },
  doneBtn: {
    backgroundColor: theme.text,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneText: {
    color: theme.bg,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});

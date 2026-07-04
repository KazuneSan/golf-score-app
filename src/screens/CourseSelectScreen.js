import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEMES, FONT } from '../theme/tokens';
import ALL_COURSES from '../data/courses/index';

const theme = THEMES.light;

export const COURSES = ALL_COURSES;

const RECENT_IDS = ['koshigaya-gc-korai', 'akabane-gc-a'];

// ─────── Fuzzy search ───────
const _kataToHira = (s) => s.replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const _norm = (s) => _kataToHira((s || '').toLowerCase());
const _matches = (course, q) => {
  if (!q) return true;
  const nq = _norm(q);
  return _norm(course.name).includes(nq) || _norm(course.kana).includes(nq) || _norm(course.area).includes(nq);
};

export default function CourseSelectScreen() {
  const navigation = useNavigation();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => COURSES.filter(c => _matches(c, q)), [q]);
  const recentCourses = RECENT_IDS.map(id => COURSES.find(c => c.id === id)).filter(Boolean);

  const goNext = (course) => {
    navigation.navigate('RoundSetup', { course });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.search}
          placeholder="コース名・エリアで検索"
          placeholderTextColor={theme.textTer}
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {q.length > 0 && (
          <Pressable onPress={() => setQ('')} hitSlop={8}>
            <Text style={styles.clearIcon}>×</Text>
          </Pressable>
        )}
      </View>

      {!q && recentCourses.length > 0 && (
        <View style={{ marginTop: 22 }}>
          <Text style={styles.label}>最近のラウンド</Text>
          <View style={styles.recentRow}>
            {recentCourses.map(c => (
              <Pressable key={c.id} onPress={() => goNext(c)} style={styles.recentChip}>
                <Text style={styles.recentChipText} numberOfLines={1}>{c.name.replace(/カントリー倶楽部|カントリークラブ|ゴルフ場|ゴルフクラブ|ゴルフ/, '')}</Text>
                <Text style={styles.recentChipArea}>{c.area}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={{ marginTop: q ? 14 : 22 }}>
        <Text style={styles.label}>{q ? `検索結果 · ${filtered.length}件` : 'すべてのコース'}</Text>
        <View style={{ marginTop: 10 }}>
          {filtered.map((c, i) => (
            <Pressable key={c.id} onPress={() => goNext(c)} style={[styles.row, i > 0 && styles.rowBorder]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowName} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.rowMeta}>{c.area} · Par {c.par}{c.type ? ` · ${c.type}` : ''}</Text>
              </View>
              <Text style={styles.rowArrow}>→</Text>
            </Pressable>
          ))}
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>該当するコースがありません</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 8, backgroundColor: theme.surface, paddingHorizontal: 12, height: 44 },
  searchIcon: { fontSize: 16, color: theme.textSec, marginRight: 8 },
  search: { flex: 1, fontSize: 14, color: theme.text, fontFamily: FONT.sans },
  clearIcon: { fontSize: 20, color: theme.textTer, paddingHorizontal: 4 },
  label: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  recentRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  recentChip: { flex: 1, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 10 },
  recentChipText: { fontSize: 12, fontWeight: '600', color: theme.text, letterSpacing: -0.2 },
  recentChipArea: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, marginTop: 3, letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 2, gap: 8 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
  rowName: { fontSize: 14, fontWeight: '500', color: theme.text, letterSpacing: -0.2 },
  rowMeta: { fontFamily: FONT.mono, fontSize: 11, color: theme.textSec, marginTop: 3, letterSpacing: 0.2 },
  rowArrow: { fontFamily: FONT.mono, fontSize: 14, color: theme.textSec },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 12, color: theme.textSec },
});

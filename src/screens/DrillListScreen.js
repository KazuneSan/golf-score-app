import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { THEMES, FONT } from '../theme/tokens';
import { getDrillsForChallenge } from '../data/drillDetails';
import { getChallenge } from '../data/challenges';

const theme = THEMES.light;

export default function DrillListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const challengeKey = route.params?.challengeKey || 'putt';
  const challenge = getChallenge(challengeKey);
  const drills = getDrillsForChallenge(challengeKey);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <Text style={styles.tag}>CHALLENGE</Text>
      <Text style={styles.title}>{challenge?.label || challengeKey}</Text>
      <Text style={styles.sub}>{challenge?.sub} · {challenge?.metric}</Text>

      <Text style={styles.sectionLabel}>ドリル一覧 · {drills.length}個</Text>

      <View style={{ marginTop: 10 }}>
        {drills.map((d, i) => (
          <Pressable
            key={d.id}
            onPress={() => navigation.navigate('DrillDetail', { drillId: d.id, challengeKey })}
            style={[styles.row, i > 0 && { marginTop: 8 }]}
          >
            <View style={styles.rowIdx}>
              <Text style={styles.rowIdxText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{d.name}</Text>
              <Text style={styles.rowMeta}>{d.duration} · {d.setup}</Text>
            </View>
            <Text style={styles.rowArrow}>→</Text>
          </Pressable>
        ))}
        {drills.length === 0 && (
          <Text style={styles.empty}>この課題のドリルはまだありません</Text>
        )}
      </View>

      <Pressable
        onPress={() => navigation.navigate('DrillTest', { challengeKey, mode: 'test' })}
        style={styles.testBtn}
      >
        <Text style={styles.testTag}>ROUND TEST</Text>
        <Text style={styles.testText}>テストで腕試し</Text>
        <Text style={styles.testArrow}>→</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  tag: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '700', color: theme.text, marginTop: 2, letterSpacing: -0.3 },
  sub: { fontSize: 12, color: theme.textSec, marginTop: 4 },
  sectionLabel: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500', marginTop: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.surface },
  rowIdx: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.text, alignItems: 'center', justifyContent: 'center' },
  rowIdxText: { color: theme.bg, fontFamily: FONT.mono, fontSize: 11, fontWeight: '700' },
  rowName: { fontSize: 14, fontWeight: '600', color: theme.text, letterSpacing: -0.1 },
  rowMeta: { fontFamily: FONT.mono, fontSize: 10.5, color: theme.textSec, marginTop: 2 },
  rowArrow: { fontFamily: FONT.mono, fontSize: 14, color: theme.textSec },
  empty: { fontSize: 12, color: theme.textSec, textAlign: 'center', padding: 20 },
  testBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 22, padding: 14,
    borderWidth: 2, borderColor: theme.text, borderRadius: 8, backgroundColor: theme.surface,
  },
  testTag: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.6 },
  testText: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.text, letterSpacing: -0.2 },
  testArrow: { fontFamily: FONT.mono, fontSize: 14, color: theme.text },
});

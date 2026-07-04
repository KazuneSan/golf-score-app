import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { THEMES, FONT } from '../theme/tokens';
import { ALL_CHALLENGES, RECENT_CHALLENGE_KEYS, getChallenge } from '../data/challenges';
import { getAllRounds } from '../data/rounds';

const theme = THEMES.light;

// Mock persona — later: replace with AsyncStorage-persisted state
const PERSONA = { avgScore: 96.4, best: 87 };

// Recent 3 challenges shown inline; full list available via ChallengePicker screen.
const RECENT_CHALLENGES = RECENT_CHALLENGE_KEYS.map(k => getChallenge(k)).filter(Boolean);

const MOCK_HISTORY = [
  { date: '5/3',  total: 94,  diff: 22, teeLabel: 'WHITE', isHalf: false },
  { date: '4/18', total: 98,  diff: 26, teeLabel: 'WHITE', isHalf: false },
  { date: '3/29', total: 101, diff: 29, teeLabel: 'RED',   isHalf: false },
];

const SWATCH = {
  black: '#111111', white: '#FFFFFF', red: '#D04040',
  blue: '#3F62D0', gold: '#C9A33A', green: '#2F8C5B',
};

function computeTargetScore({ avgScore, best, par, rating = 71, slope = 113 }) {
  const hc = Math.max(0, Math.min(36, Math.round((avgScore - par) * 0.93)));
  const base = par + Math.round(hc * (slope / 113));
  return Math.max(best || 60, base - 2);
}

export default function RoundSetupScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const course = route.params?.course;

  const [startSide, setStartSide] = useState('OUT');
  const [isHalf, setIsHalf] = useState(false);
  const [teeColor, setTeeColor] = useState(() => {
    if (!course?.tees) return 'white';
    return course.tees.find(t => t.color === 'white')?.color || course.tees[0].color;
  });
  const [isPractice, setIsPractice] = useState(false);
  const [practiceChallenges, setPracticeChallenges] = useState([]);
  const [courseHistory, setCourseHistory] = useState(null);
  const [companions, setCompanions] = useState([]); // null = loading

  useEffect(() => {
    if (!course?.id) return;
    getAllRounds().then(all => {
      const hits = all
        .filter(r => !r.isPractice && r.course?.id === course.id)
        .slice(0, 5)
        .map(r => ({
          date: new Date(r.endedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
          total: r.total,
          diff: r.diff,
          teeLabel: (course.tees?.find(t => t.color === r.teeColor)?.label || r.teeColor || 'WHITE').toUpperCase(),
          isHalf: r.isHalf,
        }));
      setCourseHistory(hits);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id]);

  // Sync back from ChallengePicker (navigates back with merged params)
  useEffect(() => {
    if (Array.isArray(route.params?.practiceChallenges)) {
      setPracticeChallenges(route.params.practiceChallenges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.practiceChallenges]);

  const target = course ? computeTargetScore({
    avgScore: PERSONA.avgScore, best: PERSONA.best,
    par: course.par, rating: course.rating, slope: course.slope,
  }) : 99;
  const handicap = course ? Math.max(0, Math.min(36, Math.round((PERSONA.avgScore - course.par) * 0.93))) : 18;
  const displayTarget = isHalf ? Math.round(target / 2) : target;
  const displayPar = isHalf ? Math.round((course?.par || 72) / 2) : (course?.par || 72);

  if (!course) {
    return <View style={{ padding: 20, backgroundColor: theme.bg, flex: 1 }}><Text style={{ color: theme.text }}>読み込み中...</Text></View>;
  }

  const togglePractice = (k) => {
    setPracticeChallenges(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };

  const startDisabled = isPractice && practiceChallenges.length === 0;
  const selectedTee = course.tees?.find(t => t.color === teeColor);

  const addCompanion = () => {
    if (companions.length < 3) setCompanions(prev => [...prev, '']);
  };
  const removeCompanion = (i) => setCompanions(prev => prev.filter((_, j) => j !== i));
  const updateCompanion = (i, name) => setCompanions(prev => prev.map((n, j) => j === i ? name : n));

  const goStart = () => {
    if (startDisabled) return;
    navigation.navigate('Round', {
      course, teeColor, startSide, isHalf, isPractice,
      practiceChallenges: isPractice ? practiceChallenges : [],
      target: displayTarget,
      companions: companions.map((n, i) => n.trim() || `P${i + 2}`),
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Step indicator + course name */}
      <View style={styles.stepHead}>
        <Text style={styles.stepTag}>ROUND · STEP 2 / 2</Text>
        <Text style={styles.stepCourse} numberOfLines={1}>{course.name}</Text>
      </View>

      {/* Start side */}
      <View style={{ marginTop: 18 }}>
        <Text style={styles.label}>スタート</Text>
        <View style={styles.segRow}>
          <Pressable onPress={() => setStartSide('OUT')} style={[styles.segBtn, startSide === 'OUT' && styles.segBtnOn]}>
            <Text style={[styles.segText, startSide === 'OUT' && styles.segTextOn]}>OUT（1–9）</Text>
          </Pressable>
          <Pressable onPress={() => setStartSide('IN')} style={[styles.segBtn, startSide === 'IN' && styles.segBtnOn]}>
            <Text style={[styles.segText, startSide === 'IN' && styles.segTextOn]}>IN（10–18）</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => setIsHalf(v => !v)} style={styles.halfRow}>
          <View style={[styles.halfBox, isHalf && styles.halfBoxOn]}>
            {isHalf && (
              <Svg width={12} height={12} viewBox="0 0 12 12">
                <Path d="M2 6 L 5 9 L 10 3" stroke={theme.bg} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </Svg>
            )}
          </View>
          <Text style={styles.halfText}>ハーフラウンド（9ホールのみ）</Text>
          {isHalf && <Text style={styles.halfNote}>· {startSide} の9Hのみ</Text>}
        </Pressable>
      </View>

      {/* Tee */}
      <View style={{ marginTop: 18 }}>
        <Text style={styles.label}>ティー</Text>
        <View style={styles.teeRow}>
          {course.tees.map(tee => {
            const on = teeColor === tee.color;
            const sw = SWATCH[tee.color] || '#888';
            return (
              <Pressable key={tee.color} onPress={() => setTeeColor(tee.color)} style={[styles.teeBtn, on && styles.teeBtnOn]}>
                <View style={[styles.teeDot, {
                  backgroundColor: sw,
                  borderColor: tee.color === 'white' ? (on ? theme.bg : theme.borderStrong) : 'transparent',
                }]}/>
                <Text style={[styles.teeLabel, { color: on ? theme.bg : theme.text }]}>{tee.label}</Text>
                <Text style={[styles.teeYards, { color: on ? theme.bg : theme.text, opacity: 0.65 }]}>{tee.yards}Y</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 同伴者 */}
      <View style={{ marginTop: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={styles.label}>同伴者（最大3名・任意）</Text>
          {companions.length < 3 && (
            <Pressable onPress={addCompanion} hitSlop={8}>
              <Text style={styles.compAdd}>＋ 追加</Text>
            </Pressable>
          )}
        </View>
        {companions.length === 0 ? (
          <Text style={styles.compEmpty}>同伴者のスコアも記録する場合は追加してください</Text>
        ) : (
          <View style={{ marginTop: 8, gap: 6 }}>
            {companions.map((name, i) => (
              <View key={i} style={styles.compRow}>
                <Text style={styles.compLabel}>P{i + 2}</Text>
                <TextInput
                  style={styles.compInput}
                  value={name}
                  onChangeText={v => updateCompanion(i, v)}
                  placeholder={`P${i + 2}（省略可）`}
                  placeholderTextColor={theme.textTer}
                  maxLength={8}
                  autoCorrect={false}
                />
                <Pressable onPress={() => removeCompanion(i)} hitSlop={8} style={styles.compRemove}>
                  <Text style={styles.compRemoveText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Course history */}
      {(() => {
        const isMock = courseHistory !== null && courseHistory.length === 0;
        const rows = (courseHistory && courseHistory.length > 0) ? courseHistory : (courseHistory !== null ? MOCK_HISTORY : null);
        if (!rows) return null;
        return (
          <View style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={styles.label}>このコースの成績</Text>
              {isMock && <Text style={styles.mockBadge}>サンプル</Text>}
            </View>
            <View style={styles.histCard}>
              {rows.map((r, i) => (
                <View key={i} style={[styles.histRow, i > 0 && styles.histBorder]}>
                  <Text style={styles.histDate}>{r.date}{r.isHalf ? ' (½)' : ''}</Text>
                  <Text style={styles.histScore}>{r.total}</Text>
                  <Text style={[styles.histDiff, { color: r.diff > 0 ? theme.textSec : theme.good }]}>
                    {r.diff >= 0 ? '+' : ''}{r.diff}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.histTee}>{r.teeLabel}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })()}

      {/* Weather — only shown when data is available */}
      {course.weather && (
        <View style={[styles.infoCard, { marginTop: 22 }]}>
          <View style={styles.infoHead}>
            <Text style={styles.label}>天気・コンディション</Text>
            <Text style={styles.infoMeta}>自動取得</Text>
          </View>
          <View style={styles.wxRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.wxTemp}>{course.weather.temp}°C</Text>
              <Text style={styles.wxSub}>{course.weather.condition}</Text>
            </View>
            <View style={[styles.wxCol]}>
              <Text style={styles.wxMid}>{course.weather.wind}</Text>
              <Text style={styles.wxSub}>風速・風向</Text>
            </View>
            <View style={[styles.wxCol]}>
              <Text style={styles.wxMid}>湿度 {course.weather.humidity}%</Text>
              <Text style={styles.wxSub} numberOfLines={1}>{course.weather.dayForecast}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Difficulty & Tips — only shown when data is available */}
      {(course.signature || (course.tips && course.tips.length > 0) || course.rating) && (
        <View style={[styles.infoCard, { marginTop: 12 }]}>
          <View style={styles.infoHead}>
            <Text style={styles.label}>難易度・攻略ポイント</Text>
            {(course.rating || course.slope) && (
              <Text style={styles.rsMeta}>
                {course.rating ? `R${course.rating}` : ''}{course.rating && course.slope ? ' · ' : ''}{course.slope ? `S${course.slope}` : ''}
              </Text>
            )}
          </View>
          {course.signature && <Text style={styles.signature}>{course.signature}</Text>}
          {course.tips && course.tips.length > 0 && (
            <View style={{ marginTop: 10 }}>
              {course.tips.map((t, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>·</Text>
                  <Text style={styles.tipText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Target score */}
      <View style={[styles.infoCard, { marginTop: 12 }]}>
        <Text style={styles.label}>{isHalf ? '今日の目標スコア（ハーフ）' : '今日の目標スコア'}</Text>
        <View style={styles.tgtRow}>
          <Text style={styles.tgtNum}>{displayTarget}</Text>
          <Text style={styles.tgtDiff}>+{displayTarget - displayPar}</Text>
          <View style={{ flex: 1 }}/>
          <View style={styles.tgtMetaCol}>
            <Text style={styles.tgtMeta}>平均 {PERSONA.avgScore}</Text>
            <Text style={styles.tgtMeta}>ベスト {PERSONA.best}</Text>
            <Text style={styles.tgtMeta}>推定HC {handicap}</Text>
          </View>
        </View>
        <Text style={styles.tgtDesc}>
          あなたのスコア実績とコース難易度から算出。{'\n'}いつもより2打だけ良いスコアを目標に、無理のないラウンドを。
        </Text>
      </View>

      {/* Practice mode toggle — placed just above the Start button */}
      <Pressable
        onPress={() => setIsPractice(v => !v)}
        style={[styles.practiceToggle, isPractice ? styles.practiceOn : styles.practiceOff, { marginTop: 22 }]}
      >
        <View style={[styles.pBox, isPractice ? styles.pBoxOn : styles.pBoxOff]}>
          {isPractice && (
            <Svg width={13} height={13} viewBox="0 0 12 12">
              <Path d="M2 6 L 5 9 L 10 3" stroke={theme.text} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={[styles.pTitle, { color: isPractice ? theme.bg : theme.text }]}>練習モード</Text>
            <Text style={[styles.pState, { color: isPractice ? theme.bg : theme.textSec }]}>{isPractice ? 'ON' : 'OFF'}</Text>
          </View>
          <Text style={[styles.pDesc, { color: isPractice ? theme.bg : theme.textSec, opacity: isPractice ? 0.85 : 0.7 }]}>
            課題別 ○△× を記録 · 平均スコアには反映されません
          </Text>
        </View>
      </Pressable>

      {/* Practice challenges (conditional) */}
      {isPractice && (
        <View style={[styles.chCard, { marginTop: 12 }]}>
          <View style={styles.chHead}>
            <Text style={styles.label}>確認する課題</Text>
            <Text style={styles.chCount}>PRACTICE · {practiceChallenges.length} 選択中</Text>
          </View>
          <Text style={styles.chDesc}>
            ラウンド中の各ホールで、選んだ課題について「できた？」を ○△× で記録します。
          </Text>

          <Text style={styles.chRecentLabel}>最近取り組んだ課題</Text>
          <View style={{ gap: 6 }}>
            {RECENT_CHALLENGES.map(c => {
              const on = practiceChallenges.includes(c.k);
              return (
                <Pressable key={c.k} onPress={() => togglePractice(c.k)} style={[styles.chRow, on && styles.chRowOn]}>
                  <View style={[styles.chBox, on && styles.chBoxOn]}>
                    {on && (
                      <Svg width={10} height={10} viewBox="0 0 12 12">
                        <Path d="M2 6 L 5 9 L 10 3" stroke={theme.text} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </Svg>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.chLabel, { color: on ? theme.bg : theme.text }]}>{c.label}</Text>
                    <Text style={[styles.chSub, { color: on ? theme.bg : theme.textSec, opacity: on ? 0.7 : 1 }]}>
                      {c.sub} · {c.metric}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Other selected (not in recent) — surfaced as chips so user can unselect */}
          {practiceChallenges.filter(k => !RECENT_CHALLENGE_KEYS.includes(k)).length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.chRecentLabel}>その他の選択済み</Text>
              <View style={styles.chChipRow}>
                {practiceChallenges
                  .filter(k => !RECENT_CHALLENGE_KEYS.includes(k))
                  .map(k => {
                    const c = getChallenge(k);
                    if (!c) return null;
                    return (
                      <Pressable key={k} onPress={() => togglePractice(k)} style={styles.chChip}>
                        <Text style={styles.chChipText}>{c.label}</Text>
                        <Text style={styles.chChipX}>×</Text>
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          )}

          {/* Navigate to full picker */}
          <Pressable
            onPress={() => navigation.navigate('ChallengePicker', { current: practiceChallenges })}
            style={styles.chMoreBtn}
          >
            <Text style={styles.chMoreText}>他の課題を探す</Text>
            <Text style={styles.chMoreArrow}>→</Text>
          </Pressable>
        </View>
      )}

      {/* Start button */}
      <View style={{ marginTop: 20 }}>
        <Pressable
          onPress={goStart}
          disabled={startDisabled}
          style={[styles.startBtn, startDisabled && { opacity: 0.35 }]}
        >
          <Text style={styles.startText}>
            {isPractice
              ? (practiceChallenges.length === 0
                ? '課題を1つ以上選んでください'
                : `練習ラウンド開始（${practiceChallenges.length}課題）`)
              : 'ラウンド開始'}
          </Text>
        </Pressable>
        <Text style={styles.startFoot}>
          {startSide === 'OUT' ? '1番ホールから始まります' : '10番ホールから始まります'}
          {isHalf ? '（9ホール）' : ''}
          {selectedTee ? ` · ${selectedTee.yards}Y` : ''}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40 },
  // Step header
  stepHead: { paddingBottom: 4 },
  stepTag: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  stepCourse: { fontSize: 14, fontWeight: '600', color: theme.text, marginTop: 2, letterSpacing: -0.2 },
  // Labels
  label: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  // Practice toggle
  practiceToggle: { marginTop: 18, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5 },
  practiceOn: { backgroundColor: theme.text, borderColor: theme.text },
  practiceOff: { backgroundColor: theme.surface, borderColor: theme.border },
  pBox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pBoxOn: { backgroundColor: theme.bg, borderColor: theme.bg },
  pBoxOff: { backgroundColor: 'transparent', borderColor: theme.borderStrong },
  pTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  pState: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 0.6, fontWeight: '600' },
  pDesc: { fontSize: 11, marginTop: 3, lineHeight: 17 },
  // Segment
  segRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  segBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: 'center', backgroundColor: theme.surface },
  segBtnOn: { backgroundColor: theme.text, borderColor: theme.text },
  segText: { fontSize: 13, color: theme.text, fontWeight: '500' },
  segTextOn: { color: theme.bg, fontWeight: '600' },
  // Half checkbox
  halfRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  halfBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: theme.borderStrong, alignItems: 'center', justifyContent: 'center' },
  halfBoxOn: { backgroundColor: theme.text, borderColor: theme.text },
  halfText: { fontSize: 12.5, color: theme.text },
  halfNote: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, marginLeft: 4 },
  // Tee
  teeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  teeBtn: { flex: 1, padding: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: 'center', backgroundColor: theme.surface, gap: 5 },
  teeBtnOn: { backgroundColor: theme.text, borderColor: theme.text },
  teeDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1 },
  teeLabel: { fontFamily: FONT.sans, fontSize: 11, fontWeight: '500' },
  teeYards: { fontFamily: FONT.mono, fontSize: 10 },
  // Challenge card
  chCard: { marginTop: 22, borderWidth: 2, borderColor: theme.text, borderRadius: 8, padding: 14, backgroundColor: theme.surface },
  chHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chCount: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.4 },
  chDesc: { fontSize: 11.5, color: theme.textSec, lineHeight: 18, marginTop: 6, marginBottom: 10 },
  chSearchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.bg, paddingHorizontal: 10, marginBottom: 10, height: 38 },
  chSearchIcon: { fontSize: 14, color: theme.textTer, marginRight: 6 },
  chSearchInput: { flex: 1, fontSize: 12.5, color: theme.text, fontFamily: FONT.sans },
  noMatch: { fontSize: 11.5, color: theme.textSec, paddingVertical: 12, textAlign: 'center' },
  chRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: 'transparent' },
  chRowOn: { backgroundColor: theme.text, borderColor: theme.text },
  chBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: theme.borderStrong, alignItems: 'center', justifyContent: 'center' },
  chBoxOn: { backgroundColor: theme.bg, borderColor: theme.bg },
  chLabel: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
  chSub: { fontSize: 10.5, marginTop: 2 },
  chRecentLabel: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.6, marginBottom: 8, fontWeight: '500' },
  chChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: theme.borderStrong, borderRadius: 20, backgroundColor: theme.bg },
  chChipText: { fontSize: 11, color: theme.text, fontWeight: '500' },
  chChipX: { fontSize: 14, color: theme.textSec, lineHeight: 14 },
  chMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 11, borderWidth: 1, borderColor: theme.borderStrong, borderRadius: 6, backgroundColor: theme.bg },
  chMoreText: { fontSize: 12.5, color: theme.text, fontWeight: '500' },
  chMoreArrow: { fontSize: 14, color: theme.textSec, fontFamily: FONT.mono },
  // Info cards (weather, difficulty, target)
  infoCard: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 14, backgroundColor: theme.surface },
  infoHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  infoMeta: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer },
  // Weather
  wxRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
  wxCol: { flex: 1, borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 10 },
  wxTemp: { fontFamily: FONT.mono, fontSize: 22, fontWeight: '400', lineHeight: 22, color: theme.text },
  wxMid: { fontFamily: FONT.mono, fontSize: 13, fontWeight: '500', color: theme.text },
  wxSub: { fontSize: 10.5, color: theme.textSec, marginTop: 6 },
  // Difficulty
  rsMeta: { fontFamily: FONT.mono, fontSize: 11, color: theme.text },
  signature: { marginTop: 8, fontSize: 12.5, lineHeight: 20, color: theme.text },
  tipRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  tipBullet: { fontSize: 12, color: theme.textSec, lineHeight: 20 },
  tipText: { flex: 1, fontSize: 12, color: theme.textSec, lineHeight: 20 },
  // Target
  tgtRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 8 },
  tgtNum: { fontFamily: FONT.mono, fontSize: 44, fontWeight: '400', letterSpacing: -1.5, lineHeight: 44, color: theme.text },
  tgtDiff: { fontFamily: FONT.mono, fontSize: 13, color: theme.textSec },
  tgtMetaCol: { alignItems: 'flex-end' },
  tgtMeta: { fontFamily: FONT.mono, fontSize: 10.5, color: theme.textTer, lineHeight: 16 },
  tgtDesc: { fontSize: 11.5, color: theme.textSec, marginTop: 10, lineHeight: 18 },
  // Companion
  compAdd: { fontFamily: FONT.mono, fontSize: 10, color: theme.textSec, letterSpacing: 0.4 },
  compEmpty: { fontSize: 11, color: theme.textTer, marginTop: 6 },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compLabel: { fontFamily: FONT.mono, fontSize: 11, color: theme.textSec, width: 22 },
  compInput: { flex: 1, height: 38, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 10, fontSize: 13, color: theme.text, backgroundColor: theme.surface },
  compRemove: { padding: 4 },
  compRemoveText: { fontSize: 18, color: theme.textTer, lineHeight: 20 },
  // Course history
  mockBadge: { fontFamily: FONT.mono, fontSize: 8, color: theme.textTer, letterSpacing: 0.5, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  histCard: { marginTop: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 8, backgroundColor: theme.surface, overflow: 'hidden' },
  histRow: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 10, paddingHorizontal: 12, gap: 8 },
  histBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
  histDate: { fontFamily: FONT.mono, fontSize: 11, color: theme.textSec, width: 44 },
  histScore: { fontFamily: FONT.mono, fontSize: 16, fontWeight: '500', color: theme.text, letterSpacing: -0.5 },
  histDiff: { fontFamily: FONT.mono, fontSize: 11 },
  histTee: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.4 },
  // Start button
  startBtn: { backgroundColor: theme.text, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  startText: { color: theme.bg, fontSize: 14, fontWeight: '600', letterSpacing: -0.1 },
  startFoot: { marginTop: 10, textAlign: 'center', fontSize: 11, color: theme.textTer },
});

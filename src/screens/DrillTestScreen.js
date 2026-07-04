import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { THEMES, FONT } from '../theme/tokens';
import { getChallenge } from '../data/challenges';
import { getDrillDetail } from '../data/drillDetails';
import { saveTestResult } from '../data/testResults';

const theme = THEMES.light;

// Per-challenge test configuration
const TEST_CONFIG = {
  putt:        { attempts: 10, action: '3m パット',         verb: 'カップイン',        target: 50, targetLabel: '50% 以上' },
  'short-putt':{ attempts: 10, action: '1m パット',         verb: 'カップイン',        target: 90, targetLabel: '90% 以上' },
  second:      { attempts: 6,  action: '140-170Y セカンド', verb: 'グリーンオン',      target: 40, targetLabel: '40% 以上' },
  'tee-dir':   { attempts: 6,  action: 'ティーショット',    verb: 'フェアウェイキープ', target: 55, targetLabel: '55% 以上' },
  'tee-dist':  { attempts: 6,  action: 'ティーショット',    verb: '目標飛距離達成',    target: 50, targetLabel: '50% 以上' },
  approach:    { attempts: 8,  action: '30Y アプローチ',    verb: '寄せワン圏内',      target: 60, targetLabel: '60% 以上' },
  bunker:      { attempts: 6,  action: 'バンカー',         verb: '1発脱出',           target: 60, targetLabel: '60% 以上' },
  'iron-100':  { attempts: 6,  action: '100Y ショット',    verb: 'グリーンオン',      target: 50, targetLabel: '50% 以上' },
  chip:        { attempts: 8,  action: 'チップ',           verb: '寄せワン圏内',      target: 65, targetLabel: '65% 以上' },
  'course-mgmt': { attempts: 18, action: 'ボギーオン',     verb: 'ボギーオン達成',    target: 60, targetLabel: '60% 以上' },
};

export default function DrillTestScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { challengeKey = 'putt', drillId, mode = 'test' } = route.params || {};

  const challenge = getChallenge(challengeKey);
  const drill = drillId ? getDrillDetail(drillId) : null;
  const cfg = TEST_CONFIG[challengeKey] || TEST_CONFIG.putt;

  const isDrillMode = mode === 'drill' && drill;
  const attempts = isDrillMode ? 6 : cfg.attempts;
  const title = isDrillMode ? drill.name : (challenge?.metric || '課題テスト');
  const subtitle = isDrillMode
    ? drill.purpose?.slice(0, 80) + (drill.purpose?.length > 80 ? '…' : '')
    : `${cfg.action} × ${attempts}球`;
  const kicker = isDrillMode ? 'DRILL' : 'GOAL TEST';

  const [phase, setPhase] = useState('intro');
  const [records, setRecords] = useState([]);
  const [result, setResult] = useState(null);

  const succCount = records.filter(Boolean).length;
  const attemptsLeft = attempts - records.length;

  const start = () => {
    setRecords([]);
    setResult(null);
    setPhase('active');
  };

  const recordAttempt = (success) => {
    const next = [...records, success];
    setRecords(next);
    if (next.length >= attempts) {
      const succ = next.filter(Boolean).length;
      const pct = Math.round((succ / attempts) * 100);
      const passed = pct >= cfg.target;
      const stars = pct >= cfg.target + 10 ? 3 : passed ? 2 : 1;
      const entry = {
        challengeKey, ts: Date.now(),
        attempts, successes: succ, pct, passed, stars,
        ...(isDrillMode ? { drillId } : {}),
      };
      // Fire-and-forget persist
      saveTestResult(entry, isDrillMode).catch(() => {});
      setResult({ ...entry, records: next });
      setTimeout(() => setPhase('result'), 300);
    }
  };

  const undoLast = () => {
    setRecords(r => r.slice(0, -1));
  };

  const finish = () => {
    navigation.goBack();
  };

  // ─ INTRO ─
  if (phase === 'intro') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.introContent}>
          <Text style={styles.tag}>{kicker}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>テスト条件</Text>
            <Row k="試技回数" v={`${attempts} 球`} />
            <Row k="合格ライン" v={cfg.targetLabel} />
            <Row k="アクション" v={cfg.action} />
            <Row k="成功判定" v={cfg.verb} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>スター判定</Text>
            <Row k="★★★" v={`${cfg.target + 10}% 以上`} />
            <Row k="★★" v={`${cfg.target}% 以上（合格）`} />
            <Row k="★" v={`${cfg.target}% 未満`} />
          </View>

          <Text style={styles.introNote}>
            1球ごとに「できた（○）/できなかった（×）」をタップして記録します。
          </Text>

          <Pressable onPress={start} style={styles.startBtn}>
            <Text style={styles.startText}>テストを始める</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>戻る</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─ ACTIVE ─
  if (phase === 'active') {
    const pct = Math.round((succCount / attempts) * 100);
    const currentAttempt = records.length + 1;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8 }}>
            <Pressable onPress={() => {
              Alert.alert('テスト中断', '進捗は保存されません。終了しますか？', [
                { text: 'キャンセル', style: 'cancel' },
                { text: '終了', style: 'destructive', onPress: () => navigation.goBack() },
              ]);
            }} hitSlop={10}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M6 6L18 18M18 6L6 18" stroke={theme.textSec} strokeWidth={1.8} strokeLinecap="round" />
              </Svg>
            </Pressable>
            <Text style={styles.activeTitle}>{title}</Text>
            <Text style={styles.activeCount}>{records.length}/{attempts}</Text>
          </View>

          {/* Progress dots */}
          <View style={styles.progressRow}>
            {Array.from({ length: attempts }, (_, i) => {
              const v = records[i];
              const color = v === true ? theme.good : v === false ? theme.warn : theme.border;
              return <View key={i} style={[styles.progDot, { backgroundColor: color }]} />;
            })}
          </View>

          {/* Live stats */}
          <View style={styles.liveStats}>
            <View>
              <Text style={styles.liveLabel}>成功</Text>
              <Text style={styles.liveValue}>{succCount}<Text style={styles.liveUnit}>/{records.length || '—'}</Text></Text>
            </View>
            <View>
              <Text style={styles.liveLabel}>成功率</Text>
              <Text style={styles.liveValue}>{records.length ? pct : '—'}<Text style={styles.liveUnit}>%</Text></Text>
            </View>
            <View>
              <Text style={styles.liveLabel}>残り</Text>
              <Text style={styles.liveValue}>{attemptsLeft}<Text style={styles.liveUnit}> 球</Text></Text>
            </View>
          </View>

          {/* Current attempt indicator */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={styles.attemptTag}>Attempt</Text>
            <Text style={styles.attemptNum}>{currentAttempt}</Text>
            <Text style={styles.attemptQ}>{cfg.verb}できた？</Text>
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <Pressable onPress={() => recordAttempt(false)} style={[styles.resultBtn, { borderColor: theme.warn, backgroundColor: theme.warn + '10' }]}>
              <Text style={[styles.resultBtnSym, { color: theme.warn }]}>×</Text>
              <Text style={[styles.resultBtnLabel, { color: theme.warn }]}>失敗</Text>
            </Pressable>
            <Pressable onPress={() => recordAttempt(true)} style={[styles.resultBtn, { borderColor: theme.good, backgroundColor: theme.good + '10' }]}>
              <Text style={[styles.resultBtnSym, { color: theme.good }]}>○</Text>
              <Text style={[styles.resultBtnLabel, { color: theme.good }]}>成功</Text>
            </Pressable>
          </View>
          <Pressable onPress={undoLast} disabled={records.length === 0} style={[styles.undoBtn, records.length === 0 && { opacity: 0.3 }]}>
            <Text style={styles.undoText}>1つ戻す</Text>
          </Pressable>
          <View style={{ height: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  // ─ RESULT ─
  return <ResultPhase result={result} cfg={cfg} onRetry={start} onFinish={finish} />;
}

// ─ RESULT phase (separate component for animation hooks) ─
function ResultPhase({ result, cfg, onRetry, onFinish }) {
  // Animated values
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(0)).current;
  const pctAnim = useRef(new Animated.Value(0)).current;
  const barFill = useRef(new Animated.Value(0)).current;
  const history = useRef(new Animated.Value(0)).current;
  const actions = useRef(new Animated.Value(0)).current;

  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    // Count up %
    const duration = 900;
    const steps = 30;
    const inc = result.pct / steps;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i >= steps) {
        setDisplayPct(result.pct);
        clearInterval(iv);
      } else {
        setDisplayPct(Math.round(inc * i));
      }
    }, duration / steps);

    // Stagger the reveal
    const popStar = (val, delay) => Animated.sequence([
      Animated.delay(delay),
      Animated.spring(val, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]);

    Animated.parallel([
      popStar(star1, 0),
      popStar(star2, 180),
      popStar(star3, 360),
      Animated.timing(badge, { toValue: 1, duration: 400, delay: 500, useNativeDriver: true }),
      Animated.timing(pctAnim, { toValue: 1, duration: 500, delay: 600, useNativeDriver: true }),
      Animated.timing(barFill, { toValue: 1, duration: 800, delay: 900, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
      Animated.timing(history, { toValue: 1, duration: 500, delay: 1100, useNativeDriver: true }),
      Animated.timing(actions, { toValue: 1, duration: 400, delay: 1300, useNativeDriver: true }),
    ]).start();

    return () => clearInterval(iv);
  }, [result.pct]);

  const starValues = [star1, star2, star3];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>
        {/* Top: tag */}
        <View style={{ paddingTop: 12, alignItems: 'center' }}>
          <Text style={styles.tag}>RESULT</Text>
        </View>

        {/* Middle: hero content centered */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          {/* Stars */}
          <View style={styles.starsRow}>
            {[0, 1, 2].map(i => {
              const filled = result.stars > i;
              return (
                <Animated.Text key={i} style={[
                  styles.star,
                  { color: filled ? '#D49622' : theme.border },
                  { opacity: starValues[i], transform: [{ scale: starValues[i] }] },
                ]}>★</Animated.Text>
              );
            })}
          </View>

          {/* Pass/Fail badge */}
          <Animated.View style={[
            styles.passBadge,
            { backgroundColor: result.passed ? theme.good : theme.warn },
            { opacity: badge, transform: [{ translateY: badge.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
          ]}>
            <Text style={styles.passText}>{result.passed ? '合格' : '未達'}</Text>
          </Animated.View>

          {/* Big percentage */}
          <Animated.View style={{ opacity: pctAnim, transform: [{ scale: pctAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }], marginTop: 20, alignItems: 'center' }}>
            <Text style={styles.pctNum}>{displayPct}<Text style={styles.pctUnit}>%</Text></Text>
            <Text style={styles.pctDetail}>{result.successes} / {result.attempts} 成功</Text>
          </Animated.View>

          {/* Benchmark bar */}
          <View style={styles.benchRow}>
            <Text style={styles.benchLabel}>合格ライン</Text>
            <View style={styles.benchBar}>
              <Animated.View style={[
                styles.benchFill,
                { backgroundColor: result.passed ? theme.good : theme.warn },
                { width: barFill.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.min(100, result.pct)}%`] }) },
              ]} />
              <View style={[styles.benchMarker, { left: `${cfg.target}%` }]} />
            </View>
            <Text style={styles.benchMeta}>目標 {cfg.target}%</Text>
          </View>

          {/* History */}
          <Animated.View style={[styles.historyCard, { opacity: history, transform: [{ translateY: history.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
            <Text style={styles.cardLabel}>試技履歴</Text>
            <View style={styles.historyRow}>
              {result.records.map((v, i) => (
                <View key={i} style={[styles.historyCell, { backgroundColor: v ? theme.good : theme.warn }]}>
                  <Text style={styles.historySym}>{v ? '○' : '×'}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Bottom: actions (full width, stacked) */}
        <Animated.View style={[{ paddingHorizontal: 20, paddingBottom: 12, gap: 8 }, { opacity: actions, transform: [{ translateY: actions.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
          <Pressable onPress={onRetry} style={styles.retryBtn}>
            <Text style={styles.retryText}>もう一度</Text>
          </Pressable>
          <Pressable onPress={onFinish} style={styles.finishBtn}>
            <Text style={styles.finishText}>完了</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function Row({ k, v }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{k}</Text>
      <Text style={styles.rowV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Intro
  introContent: { padding: 20, paddingBottom: 40 },
  tag: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: '700', color: theme.text, marginTop: 4, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: theme.textSec, marginTop: 6, lineHeight: 20 },
  card: { marginTop: 20, padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 8, backgroundColor: theme.surface },
  cardLabel: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowK: { fontSize: 12.5, color: theme.textSec },
  rowV: { fontFamily: FONT.mono, fontSize: 12.5, color: theme.text, fontWeight: '500' },
  introNote: { fontSize: 12, color: theme.textSec, marginTop: 18, lineHeight: 18 },
  startBtn: { marginTop: 18, backgroundColor: theme.text, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  startText: { color: theme.bg, fontSize: 14, fontWeight: '600' },
  cancelBtn: { marginTop: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelText: { color: theme.textSec, fontSize: 13 },
  // Active
  activeTitle: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600', color: theme.text, letterSpacing: -0.2 },
  activeCount: { fontFamily: FONT.mono, fontSize: 13, color: theme.textSec, fontWeight: '500' },
  progressRow: { flexDirection: 'row', gap: 3, marginTop: 16 },
  progDot: { flex: 1, height: 4, borderRadius: 2 },
  liveStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 8, backgroundColor: theme.surface },
  liveLabel: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  liveValue: { fontFamily: FONT.mono, fontSize: 22, fontWeight: '500', color: theme.text, marginTop: 4, letterSpacing: -0.5 },
  liveUnit: { fontSize: 12, color: theme.textSec, fontWeight: '400' },
  attemptTag: { fontFamily: FONT.mono, fontSize: 11, color: theme.textTer, letterSpacing: 1.5, fontWeight: '600' },
  attemptNum: { fontFamily: FONT.mono, fontSize: 72, fontWeight: '300', color: theme.text, letterSpacing: -2.5, lineHeight: 72 },
  attemptQ: { fontSize: 16, color: theme.text, marginTop: 10, fontWeight: '600' },
  resultBtn: { flex: 1, paddingVertical: 18, borderRadius: 12, borderWidth: 2, alignItems: 'center', gap: 4 },
  resultBtnSym: { fontSize: 42, fontWeight: '600', lineHeight: 42 },
  resultBtnLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  undoBtn: { paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: 'transparent' },
  undoText: { color: theme.textSec, fontSize: 12 },
  // Result
  starsRow: { flexDirection: 'row', gap: 14 },
  star: { fontSize: 56 },
  passBadge: { marginTop: 14, paddingHorizontal: 22, paddingVertical: 7, borderRadius: 24 },
  passText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  pctNum: { fontFamily: FONT.mono, fontSize: 90, fontWeight: '300', color: theme.text, letterSpacing: -3.5, lineHeight: 90, textAlign: 'center' },
  pctUnit: { fontSize: 34, color: theme.textSec },
  pctDetail: { fontFamily: FONT.mono, fontSize: 13, color: theme.textSec, marginTop: 4 },
  benchRow: { width: '100%', marginTop: 26 },
  benchLabel: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  benchBar: { marginTop: 8, height: 10, borderRadius: 5, backgroundColor: theme.border, position: 'relative', overflow: 'hidden' },
  benchFill: { height: '100%' },
  benchMarker: { position: 'absolute', top: -2, width: 2, height: 14, backgroundColor: theme.text },
  benchMeta: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, marginTop: 6, textAlign: 'right' },
  historyCard: { width: '100%', marginTop: 20, padding: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 8, backgroundColor: theme.surface },
  historyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  historyCell: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  historySym: { color: '#fff', fontFamily: FONT.mono, fontSize: 14, fontWeight: '700' },
  retryBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.borderStrong, paddingVertical: 13, borderRadius: 8, alignItems: 'center' },
  retryText: { color: theme.text, fontSize: 13, fontWeight: '600' },
  finishBtn: { backgroundColor: theme.text, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  finishText: { color: theme.bg, fontSize: 14, fontWeight: '600' },
});

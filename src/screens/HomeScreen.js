import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { THEMES, FONT } from '../theme/tokens';
import { getLatestRound, getAllRounds } from '../data/rounds';
import { getPersona, PERSONA_PROFILES, metricToChallenge, focusToChallenge } from '../data/persona';
import { getBestTestResult } from '../data/testResults';
import { getDrillsForChallenge } from '../data/drillDetails';
import { getProgress } from '../data/progress';
import { pickTip } from '../data/tips';

const theme = THEMES.light;

// SVG primitives that accept Animated values
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Easing matched to the sparkline (cubic ease-out, 0.6× speed feel)
const FILL_DURATION = 1300;
const FADE_DURATION = 500;

// ─── Half-arc gauge (180°) with target tick ───
function HalfGauge({ value, target, max = 100, accent, fillAnim, size = 120 }) {
  const r = size * 0.32;
  const cx = size / 2;
  const cy = r + 6;
  const arcLen = Math.PI * r;
  // Half circle from (cx-r, cy) to (cx+r, cy), arc going through the top.
  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  // Target angle: 0% = π rad (left), 100% = 0 rad (right)
  const targetFrac = Math.max(0, Math.min(1, target / max));
  const targetAngle = Math.PI * (1 - targetFrac);
  const tickInnerX = cx + (r - 5) * Math.cos(targetAngle);
  const tickInnerY = cy - (r - 5) * Math.sin(targetAngle);
  const tickOuterX = cx + (r + 5) * Math.cos(targetAngle);
  const tickOuterY = cy - (r + 5) * Math.sin(targetAngle);
  const fillFrac = Math.max(0, Math.min(1, value / max));
  return (
    <Svg width={size} height={cy + 8} viewBox={`0 0 ${size} ${cy + 8}`}>
      {/* background arc */}
      <Path d={bgPath} fill="none" stroke={'#E5E5E7'} strokeWidth={6} strokeLinecap="round" />
      {/* filled arc (animated via stroke-dashoffset) */}
      <AnimatedPath
        d={bgPath} fill="none" stroke={accent} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={`${arcLen} ${arcLen}`}
        strokeDashoffset={fillAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [arcLen, arcLen * (1 - fillFrac)],
        })}
      />
      {/* target tick */}
      <Path d={`M ${tickInnerX} ${tickInnerY} L ${tickOuterX} ${tickOuterY}`} stroke={'#0A0A0A'} strokeWidth={1.8} strokeLinecap="round"/>
    </Svg>
  );
}

const STAT_META = {
  boggyOn:   { label: 'ボギーオン率', unit: '%', decimals: 0 },
  parOn:     { label: 'パーオン率',   unit: '%', decimals: 0 },
  fairway:   { label: 'FWキープ率',   unit: '%', decimals: 0 },
  upDown:    { label: '寄せワン率',   unit: '%', decimals: 0 },
  threePutt: { label: '3パット率',    unit: '%', decimals: 0 },
  ob:        { label: 'OB率',         unit: '回', decimals: 1 },
};

const reverseSet = new Set(['threePutt', 'ob']);

// Compute aggregate stats from saved rounds
function computeStatsFromRounds(rounds, baseline) {
  if (!rounds || rounds.length === 0) return { ...baseline };
  const allHoles = rounds.flatMap(r => r.holes || []).filter(h => h.strokes != null);
  if (allHoles.length === 0) return { ...baseline };

  const total = allHoles.length;
  const boggyOn = allHoles.filter(h => (h.strokes - (h.putts || 0)) <= (h.par - 1)).length;
  const parOn   = allHoles.filter(h => (h.strokes - (h.putts || 0)) <= (h.par - 2)).length;
  const threeP  = allHoles.filter(h => (h.putts || 0) >= 3).length;
  const obCount = allHoles.filter(h => h.ob).length;

  const avgObPerRound = rounds.length ? obCount / rounds.length : baseline.ob;

  return {
    boggyOn:   Math.round((boggyOn / total) * 100),
    parOn:     Math.round((parOn / total) * 100),
    threePutt: Math.round((threeP / total) * 100),
    ob:        parseFloat(avgObPerRound.toFixed(1)),
    // fairway/upDown: not tracked per-hole yet → fall back to baseline
    fairway:   baseline.fairway,
    upDown:    baseline.upDown,
  };
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const { width: winW } = useWindowDimensions();
  const [persona, setPersona] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [latestRound, setLatestRound] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [now, setNow] = useState(Date.now());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [p, allR, latest] = await Promise.all([
          getPersona(),
          getAllRounds(),
          getLatestRound(),
        ]);
        if (!active) return;
        setPersona(p);
        setRounds(allR);
        setLatestRound(latest);
        setNow(Date.now());

        // Fetch best test result for primary focus
        const personaKey = p?.personaKey || '100切り';
        const profile = PERSONA_PROFILES[personaKey] || PERSONA_PROFILES['100切り'];
        const primaryFocus = profile.focus[0];
        const primaryCh = focusToChallenge(primaryFocus, personaKey) || 'putt-1m-100';
        const best = await getBestTestResult(primaryCh);
        if (active) setTestResult(best);

        const prog = await getProgress(personaKey);
        if (active) setProgress(prog);
      })();
      return () => { active = false; };
    }, [])
  );

  const onNavigate = (name) => {
    const map = {
      'settings': 'Settings',
      'practice': 'Practice',
      'analysis': 'Analytics',
      'course-select': 'CourseSelect',
    };
    navigation.navigate(map[name] || name);
  };

  const goToMetricChallenge = (metricKey) => {
    const pk = persona?.personaKey || '100切り';
    const ch = metricToChallenge(metricKey, pk);
    if (!ch) return onNavigate('practice');
    navigation.navigate('DrillList', { challengeKey: ch });
  };

  const goToFocusTest = () => {
    const pk = persona?.personaKey || '100切り';
    const profile = PERSONA_PROFILES[pk] || PERSONA_PROFILES['100切り'];
    const primaryCh = focusToChallenge(profile.focus[0], pk) || 'putt-1m-100';
    navigation.navigate('DrillList', { challengeKey: primaryCh });
  };

  const reopenComplete = () => {
    if (!latestRound) return;
    navigation.navigate('RoundComplete', {
      course: latestRound.course,
      holes: latestRound.holes,
      target: latestRound.target,
      startedAt: latestRound.startedAt,
      endedAt: latestRound.endedAt,
      isPractice: latestRound.isPractice,
      isHalf: latestRound.isHalf,
    });
  };

  // ─── Derived values (with progressive real-data enhancement) ───
  const personaKey = persona?.personaKey || '100切り';
  const profile = PERSONA_PROFILES[personaKey] || PERSONA_PROFILES['100切り'];

  const roundScores = rounds.map(r => r.total).filter(n => Number.isFinite(n));
  const hasRounds = roundScores.length > 0;

  const best = hasRounds ? Math.min(...roundScores) : (persona?.best ?? 100);
  const avgScore = hasRounds
    ? roundScores.reduce((a, b) => a + b, 0) / roundScores.length
    : (persona?.avg ?? 105);
  const goalScore = persona?.goal ?? 90;

  // Focus labels come from persona profile
  const focusLabels = profile.focus;
  const primaryFocus = focusLabels[0];

  // Real-data stats — use the latest 5 rounds (rounds is newest-first)
  const recentRounds = rounds.slice(0, 5);
  const stats = computeStatsFromRounds(recentRounds, profile.stats);
  const targets = profile.targets;
  const focusSubText = recentRounds.length === 0
    ? '目安値（ラウンド記録で更新）'
    : `直近 ${recentRounds.length} ラウンドから算出`;

  // Daily tip selected by primary focus + day of year
  const tip = pickTip(primaryFocus);

  // Sparkline: show up to last 8 rounds (oldest → newest)
  const trend = [...roundScores].reverse().slice(-8);
  const latestIdx = trend.length - 1;
  const bestVal = trend.length ? Math.min(...trend) : null;
  const bestIdx = bestVal != null ? trend.indexOf(bestVal) : -1;

  const hoursSince = latestRound?.endedAt ? (now - latestRound.endedAt) / 3600000 : null;
  const withinWindow = hoursSince != null && hoursSince <= 48;

  const spW = 170, spH = 44;
  const sMax = trend.length ? Math.max(...trend, goalScore + 2) : goalScore + 10;
  const sMin = trend.length ? Math.min(...trend, goalScore - 2) : goalScore - 5;
  // 上=良い(スコアが低い=良い ので、低スコアほど上に描く)。展開チャートと向きを統一。
  const yFor = (v) => ((v - sMin) / Math.max(1, sMax - sMin)) * spH;
  const pts = trend.map((v, i) => ({
    x: (i / Math.max(1, trend.length - 1)) * spW,
    y: yFor(v), v,
  }));
  const pathD = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
  const goalY = yFor(goalScore);
  const BEST_DOT = '#D49622', BEST_SOFT = '#E5A83A';

  // Path length (for stroke-dash draw animation)
  let pathLen = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    pathLen += Math.sqrt(dx * dx + dy * dy);
  }
  pathLen = Math.max(1, pathLen);

  // ─── Sparkline animations (HTML-equivalent + new left-to-right draw) ───
  const sparkOpacity = useRef(new Animated.Value(0)).current;
  const sparkY       = useRef(new Animated.Value(4)).current;
  const lineDraw     = useRef(new Animated.Value(0)).current;       // 0 = hidden, 1 = full draw
  const dotsOpacity  = useRef(new Animated.Value(0)).current;       // intermediate dots fade
  const bloomR       = useRef(new Animated.Value(1.28)).current;
  const bloomOpacity = useRef(new Animated.Value(0)).current;
  const bestR        = useRef(new Animated.Value(0.96)).current;
  const bestOpacity  = useRef(new Animated.Value(0)).current;
  const pingR        = useRef(new Animated.Value(1.44)).current;
  const pingOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trend.length < 2) return;

    // Reset
    sparkOpacity.setValue(0);
    sparkY.setValue(4);
    lineDraw.setValue(0);
    dotsOpacity.setValue(0);
    bloomR.setValue(1.28);
    bloomOpacity.setValue(0.75);
    bestR.setValue(0.96);
    bestOpacity.setValue(0);
    pingR.setValue(1.44);
    pingOpacity.setValue(0.45);

    // riseIn — whole sparkline fades in + slides up (immediate)
    Animated.parallel([
      Animated.timing(sparkOpacity, { toValue: 1, duration: 430, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(sparkY, { toValue: 0, duration: 430, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();

    // line draw — left to right (1333ms = 800 / 0.6)
    Animated.timing(lineDraw, {
      toValue: 1,
      duration: 1333,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();

    // intermediate dots fade in just before line finishes
    Animated.sequence([
      Animated.delay(917),
      Animated.timing(dotsOpacity, { toValue: 1, duration: 417, useNativeDriver: false }),
    ]).start();

    // BEST dot bloom + scale-pop, deferred until line is mostly drawn
    if (bestIdx >= 0) {
      Animated.sequence([
        Animated.delay(1250),
        Animated.parallel([
          Animated.timing(bloomR, { toValue: 16, duration: 1500, useNativeDriver: false, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
          Animated.timing(bloomOpacity, { toValue: 0, duration: 1500, useNativeDriver: false }),
        ]),
      ]).start();

      Animated.sequence([
        Animated.delay(1200),
        Animated.parallel([
          Animated.timing(bestOpacity, { toValue: 1, duration: 450, useNativeDriver: false }),
          Animated.sequence([
            Animated.timing(bestR, { toValue: 3.84, duration: 450, useNativeDriver: false, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
            Animated.timing(bestR, { toValue: 3.2, duration: 300, useNativeDriver: false }),
          ]),
        ]),
      ]).start();
    }

    // LATEST dot ping
    if (latestIdx >= 0 && latestIdx !== bestIdx) {
      Animated.sequence([
        Animated.delay(1500),
        Animated.parallel([
          Animated.timing(pingR, { toValue: 7.2, duration: 1167, useNativeDriver: false, easing: Easing.out(Easing.ease) }),
          Animated.timing(pingOpacity, { toValue: 0, duration: 1167, useNativeDriver: false }),
        ]),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestIdx, latestIdx, trend.length, pathLen]);

  // Latest round display (real or empty placeholder)
  const lrScore = latestRound?.total;
  const lrDiff = latestRound?.diff;
  const lrDate = latestRound ? new Date(latestRound.endedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : null;
  const lrCourse = latestRound?.course?.name;

  // Test result for Home card — 実際に受けたテストの合格ラインを優先
  const targetPct = testResult?.target ?? 60;

  // ─ スコア推移の展開アニメ (iOS=引っ張り+タップ / Android=タップのみ) ─
  const canExpand = trend.length >= 2;
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const expandedRef = useRef(false);
  const toggleExpand = (v) => {
    if (!canExpand) return;
    const nv = typeof v === 'boolean' ? v : !expandedRef.current;
    if (nv === expandedRef.current) return;
    expandedRef.current = nv;
    setExpanded(nv);
    Animated.spring(expandAnim, { toValue: nv ? 1 : 0, useNativeDriver: false, friction: 10, tension: 55 }).start();
  };
  const onScroll = (e) => {
    if (Platform.OS !== 'ios' || !canExpand) return;
    const y = e.nativeEvent.contentOffset.y;
    if (!expandedRef.current && y < -62) toggleExpand(true);
    else if (expandedRef.current && y > 44) toggleExpand(false);
  };

  const COLLAPSED_H = 58, EXPANDED_H = 300;
  const containerH = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [COLLAPSED_H, EXPANDED_H] });
  const collapsedOpacity = expandAnim.interpolate({ inputRange: [0, 0.35], outputRange: [1, 0], extrapolate: 'clamp' });
  const expandedOpacity = expandAnim.interpolate({ inputRange: [0.45, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const chevRotate = expandAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const chartW = winW - 40;
  const roundCount = roundScores.length;
  const remainingToGoal = Math.max(0, Math.round(avgScore) - goalScore);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      onScroll={onScroll} scrollEventThrottle={16}>
      <View style={styles.topBar}>
        <Pressable onPress={() => onNavigate('settings')} hitSlop={12} style={styles.gearBtn}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={3} stroke={theme.textSec} strokeWidth={1.5}/>
            <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
              stroke={theme.textSec} strokeWidth={1.5} fill="none" strokeLinejoin="round"/>
          </Svg>
        </Pressable>
      </View>

      <View style={{ marginTop: 4 }}>
        {!canExpand ? (
          <>
            <Text style={styles.label}>ベストスコア</Text>
            <View style={[styles.bestRow, { marginTop: 10 }]}>
              <View style={styles.bestLeft}>
                <Text style={styles.bestNum}>{best}</Text>
                <Text style={styles.bestAvg}>ave. {Math.round(avgScore)}</Text>
              </View>
              <View style={styles.sparkWrap}>
                <Text style={styles.sparkEmpty}>ラウンドを{'\n'}記録すると{'\n'}推移が出る</Text>
              </View>
            </View>
          </>
        ) : (
          <Pressable onPress={() => toggleExpand()}>
            <View style={styles.scoreLabelRow}>
              <Text style={styles.label}>ベストスコア</Text>
              <View style={styles.expandHint}>
                <Text style={styles.expandHintText}>推移</Text>
                <Animated.View style={{ transform: [{ rotate: chevRotate }] }}>
                  <Svg width={13} height={13} viewBox="0 0 24 24">
                    <Path d="M6 9l6 6 6-6" stroke={theme.textTer} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </Svg>
                </Animated.View>
              </View>
            </View>

            <Animated.View style={{ height: containerH, overflow: 'hidden', marginTop: 6 }}>
              {/* ── 折りたたみ (スコア + 小スパークライン) ── */}
              <Animated.View style={[styles.absFill, { opacity: collapsedOpacity }]}>
                <View style={styles.bestRow}>
                  <View style={styles.bestLeft}>
                    <Text style={styles.bestNum}>{best}</Text>
                    <Text style={styles.bestAvg}>ave. {Math.round(avgScore)}</Text>
                  </View>
                  <View style={styles.sparkWrap}>
                    <Animated.View style={{ width: '100%', opacity: sparkOpacity, transform: [{ translateY: sparkY }] }}>
                      <Svg width="100%" height={spH + 10} viewBox={`0 -10 ${spW} ${spH + 16}`} preserveAspectRatio="none">
                        <Line x1={0} x2={spW} y1={goalY} y2={goalY} stroke={theme.textTer} strokeDasharray="2 3" strokeWidth={0.7}/>
                        <SvgText x={spW} y={goalY - 3} fontSize={7} fill={theme.textTer} textAnchor="end" fontFamily={FONT.mono}>目標 {goalScore}</SvgText>
                        <AnimatedPath
                          d={pathD} fill="none" stroke={theme.text} strokeWidth={1.3}
                          strokeLinecap="round" strokeLinejoin="round"
                          strokeDasharray={pathLen}
                          strokeDashoffset={lineDraw.interpolate({ inputRange: [0, 1], outputRange: [pathLen, 0] })}
                        />
                        {pts.map((pt, i) => (i === bestIdx || i === latestIdx) ? null : (
                          <AnimatedCircle key={i} cx={pt.x} cy={pt.y} r={1.5} fill={theme.bg} stroke={theme.text} strokeWidth={1} opacity={dotsOpacity}/>
                        ))}
                        {bestIdx >= 0 && (
                          <AnimatedCircle cx={pts[bestIdx].x} cy={pts[bestIdx].y} r={bloomR} fill={BEST_SOFT} opacity={bloomOpacity}/>
                        )}
                        {bestIdx >= 0 && (
                          <AnimatedCircle cx={pts[bestIdx].x} cy={pts[bestIdx].y} r={bestR} fill={BEST_SOFT} stroke={BEST_DOT} strokeWidth={0.8} opacity={bestOpacity}/>
                        )}
                        {latestIdx >= 0 && latestIdx !== bestIdx && (
                          <AnimatedCircle cx={pts[latestIdx].x} cy={pts[latestIdx].y} r={pingR} fill="none" stroke={theme.text} strokeWidth={1.2} opacity={pingOpacity}/>
                        )}
                        {latestIdx >= 0 && latestIdx !== bestIdx && (
                          <Circle cx={pts[latestIdx].x} cy={pts[latestIdx].y} r={2.4} fill={theme.text} stroke={theme.bg} strokeWidth={1}/>
                        )}
                      </Svg>
                    </Animated.View>
                  </View>
                </View>
              </Animated.View>

              {/* ── 展開 (大チャート + 統計) ── */}
              <Animated.View style={[styles.absFill, { opacity: expandedOpacity }]} pointerEvents={expanded ? 'auto' : 'none'}>
                <View style={styles.heroRow}>
                  <Text style={styles.bestNum}>{best}</Text>
                  <Text style={styles.bestAvg}>ベスト</Text>
                </View>
                <ExpandedScoreChart
                  width={chartW} trend={trend} sMin={sMin} sMax={sMax}
                  goalScore={goalScore}
                />
                <View style={styles.statsRow}>
                  <View style={styles.statCell}>
                    <Text style={styles.statBig}>{Math.round(avgScore)}</Text>
                    <Text style={styles.statLbl}>平均</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statCell}>
                    <Text style={styles.statBig}>{roundCount}</Text>
                    <Text style={styles.statLbl}>ラウンド</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statCell}>
                    <Text style={styles.statBig}>{remainingToGoal > 0 ? `あと${remainingToGoal}` : '達成'}</Text>
                    <Text style={styles.statLbl}>目標 {goalScore} まで</Text>
                  </View>
                </View>
              </Animated.View>
            </Animated.View>
          </Pressable>
        )}
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={styles.label}>直近のラウンド</Text>
        {latestRound ? (
          <Pressable onPress={reopenComplete} style={styles.latestRow}>
            <Text style={styles.latestScore}>{lrScore}</Text>
            <Text style={[styles.latestDiff, { color: lrDiff > 0 ? theme.textSec : theme.good }]}>
              {lrDiff >= 0 ? '+' : ''}{lrDiff}
            </Text>
            <View style={{ flex: 1 }}/>
            <Text style={styles.latestMeta}>{lrDate} · {lrCourse}</Text>
          </Pressable>
        ) : (
          <Text style={styles.latestEmpty}>まだラウンド記録がありません</Text>
        )}
      </View>

      {withinWindow && (
        <Pressable onPress={reopenComplete} style={styles.recapCTA}>
          <View style={{ flex: 1 }}>
            <Text style={styles.recapTag}>ROUND RECAP · 残り {Math.max(1, Math.round(48 - hoursSince))}h</Text>
            <Text style={styles.recapTitle}>ラウンドお疲れ様でした</Text>
            <Text style={styles.recapSub}>今日の結果と、次に活かすポイントを振り返る</Text>
          </View>
          <Text style={styles.recapArrow}>→</Text>
        </Pressable>
      )}

      <View style={{ marginTop: 14, flexDirection: 'row', gap: 6 }}>
        <Pressable onPress={() => onNavigate('course-select')} style={[styles.btnPrimary, { flex: 1 }]}>
          <Text style={styles.btnPrimaryText}>＋ ラウンド記録</Text>
        </Pressable>
        <Pressable onPress={() => onNavigate('practice')} style={[styles.btnSecondary, { flex: 1 }]}>
          <Text style={styles.btnSecondaryText}>練習モード</Text>
        </Pressable>
      </View>

      {/* 基準クリア進捗 — morupi のコア価値 */}
      <ProgressCard progress={progress} onPress={() => onNavigate('practice')} />

      {/* 注力課題のテスト結果 */}
      <TestResultCard
        testResult={testResult}
        targetPct={targetPct}
        primaryFocus={primaryFocus}
        onPress={goToFocusTest}
      />

      <View style={{ marginTop: 26 }}>
        <Text style={styles.label}>FOCUS · 目標差分</Text>
        <Text style={styles.focusSub}>{focusSubText}</Text>
        <View style={styles.focusGrid}>
          {['boggyOn', 'parOn', 'fairway', 'upDown', 'threePutt', 'ob'].map((k, i) => (
            <MetricCell
              key={k} k={k}
              cur={stats[k]} tgt={targets[k]}
              reverse={reverseSet.has(k)}
              onPress={() => goToMetricChallenge(k)}
              delay={400 + i * 110}
            />
          ))}
        </View>
      </View>

      <View style={{ marginTop: 26 }}>
        <Text style={styles.label}>今日の一言</Text>
        <View style={styles.tipCard}>
          <Text style={styles.tipTag}>{tip.tag}</Text>
          <Text style={styles.tipQ}>「{tip.q}」</Text>
          <Text style={styles.tipWho}>— {tip.who}</Text>
        </View>
      </View>

      <Pressable onPress={() => onNavigate('analysis')} style={styles.analysisBtn}>
        <Text style={styles.analysisText}>すべての分析を見る →</Text>
      </Pressable>
    </ScrollView>
    </SafeAreaView>
  );
}

function MetricCell({ k, cur, tgt, reverse, onPress, delay = 0 }) {
  const meta = STAT_META[k];
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(8)).current;
  const barFill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!meta || cur == null || tgt == null) return;
    fade.setValue(0);
    rise.setValue(8);
    barFill.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: FADE_DURATION, delay, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(rise, { toValue: 0, duration: FADE_DURATION, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(barFill, { toValue: 1, duration: FILL_DURATION, delay: delay + 150, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, cur, tgt, delay]);

  if (!meta || cur == null || tgt == null) return null;
  const gap = reverse ? (cur - tgt) : (tgt - cur);
  const ok = gap <= 0;
  // Scale chosen so target tick sits clearly inside the bar (around ~70%),
  // letting "current" be visibly to the left or right of the tick.
  const scaleMax = Math.max(tgt * 1.4, cur * 1.1, 0.001);
  const fillPos = Math.max(0, Math.min(100, (cur / scaleMax) * 100));
  const tickPos = Math.max(0, Math.min(100, (tgt / scaleMax) * 100));
  const dispCur = meta.decimals ? cur.toFixed(meta.decimals) : cur;
  const dispTgt = meta.decimals ? tgt.toFixed(meta.decimals) : tgt;
  const dispGap = Math.abs(gap).toFixed(meta.decimals || 0);
  const accent = ok ? theme.good : theme.warn;

  return (
    <Animated.View style={[styles.metric, { opacity: fade, transform: [{ translateY: rise }] }]}>
      <Pressable onPress={onPress} style={{ flex: 1 }}>
        <View style={styles.metricTop}>
          <Text style={styles.metricLabel} numberOfLines={1}>{meta.label}</Text>
          <Text style={[styles.metricChip, { color: accent }]}>{ok ? '✓' : `−${dispGap}${meta.unit}`}</Text>
        </View>
        <View style={styles.metricValRow}>
          <Text style={[styles.metricVal, { color: theme.text }]}>{dispCur}</Text>
          <Text style={styles.metricUnit}>{meta.unit}</Text>
        </View>
        <View style={styles.metricBar}>
          <Animated.View style={[
            styles.metricBarFill,
            {
              backgroundColor: accent,
              width: barFill.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${fillPos}%`] }),
            },
          ]}/>
          <View style={[styles.metricBarTick, { left: `${tickPos}%` }]} />
        </View>
        <Text style={[styles.metricTarget, { color: ok ? theme.good : theme.textTer }]}>
          {ok ? '目標達成' : `目標 ${dispTgt}${meta.unit}`}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── 展開時の大きなスコア推移チャート ───
const GOLD = '#D49622', GOLD_SOFT = '#E5A83A';
function ExpandedScoreChart({ width, trend, sMin, sMax, goalScore }) {
  const H = 176;
  const padL = 8, padR = 12, padT = 22, padB = 24;
  const innerW = Math.max(1, width - padL - padR);
  const innerH = H - padT - padB;
  const range = Math.max(1, sMax - sMin);
  const yFor = (v) => padT + ((v - sMin) / range) * innerH;   // 上=良い(低スコア)
  const xFor = (i) => padL + (i / Math.max(1, trend.length - 1)) * innerW;
  const pts = trend.map((v, i) => ({ x: xFor(i), y: yFor(v), v }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const goalY = yFor(goalScore);
  const bestVal = Math.min(...trend);
  const worstVal = Math.max(...trend);
  const bestIdx = trend.indexOf(bestVal);
  const latestIdx = trend.length - 1;
  const bestLabelX = Math.max(padL + 18, Math.min(width - padR - 18, pts[bestIdx].x));

  return (
    <Svg width={width} height={H}>
      <Line x1={padL} x2={width - padR} y1={goalY} y2={goalY} stroke={theme.textTer} strokeDasharray="3 4" strokeWidth={1}/>
      <SvgText x={width - padR} y={goalY - 5} fontSize={9} fill={theme.textTer} textAnchor="end" fontFamily={FONT.mono}>目標 {goalScore}</SvgText>
      <Path d={pathD} fill="none" stroke={theme.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p, i) => (i === bestIdx || i === latestIdx) ? null : (
        <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={theme.bg} stroke={theme.text} strokeWidth={1.4}/>
      ))}
      {latestIdx !== bestIdx && (
        <Circle cx={pts[latestIdx].x} cy={pts[latestIdx].y} r={3.6} fill={theme.text} stroke={theme.bg} strokeWidth={1.5}/>
      )}
      <Circle cx={pts[bestIdx].x} cy={pts[bestIdx].y} r={5} fill={GOLD_SOFT} stroke={GOLD} strokeWidth={1.5}/>
      <SvgText x={bestLabelX} y={pts[bestIdx].y - 12} fontSize={10} fill={GOLD} textAnchor="middle" fontFamily={FONT.mono} fontWeight="700">{bestVal} BEST</SvgText>
      <SvgText x={padL} y={H - 7} fontSize={9} fill={theme.textTer} fontFamily={FONT.mono}>{worstVal}</SvgText>
      <SvgText x={width - padR} y={H - 7} fontSize={9} fill={theme.textTer} textAnchor="end" fontFamily={FONT.mono}>直近 {trend.length} ラウンド ↑良い</SvgText>
    </Svg>
  );
}

// ─── 基準クリア進捗カード（積み上がりの可視化）───
function ProgressCard({ progress, onPress }) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(8)).current;
  const barFill = useRef(new Animated.Value(0)).current;

  const cleared = progress?.clearedInLevel ?? 0;
  const total = progress?.totalInLevel ?? 0;
  const frac = total > 0 ? cleared / total : 0;

  useEffect(() => {
    fade.setValue(0);
    rise.setValue(8);
    barFill.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: FADE_DURATION, delay: 120, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(rise, { toValue: 0, duration: FADE_DURATION, delay: 120, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(barFill, { toValue: 1, duration: FILL_DURATION, delay: 300, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleared, total]);

  if (!progress) return null;

  const remaining = Math.max(0, total - cleared);
  const sub = cleared === 0
    ? '最初の基準クリアを目指そう'
    : remaining === 0
      ? `${progress.levelLabel}の基準をすべてクリア`
      : `コンプリートまで あと ${remaining} 個`;

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }], marginTop: 20 }}>
      <Pressable onPress={onPress} style={styles.progCard}>
        <View style={styles.progTop}>
          <Text style={styles.label}>基準クリア · {progress.levelLabel}</Text>
          {progress.thisMonth > 0 && (
            <Text style={styles.progMonth}>今月 +{progress.thisMonth}</Text>
          )}
        </View>
        <View style={styles.progValRow}>
          <Text style={styles.progNum}>{cleared}</Text>
          <Text style={styles.progDen}>/ {total} クリア</Text>
        </View>
        <View style={styles.progBar}>
          <Animated.View style={[
            styles.progBarFill,
            {
              backgroundColor: GOLD,
              width: barFill.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.round(frac * 100)}%`] }),
            },
          ]} />
        </View>
        <Text style={styles.progSub}>{sub}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Test result card with fade + bar fill + star stagger ───
function TestResultCard({ testResult, targetPct, primaryFocus, onPress }) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(8)).current;
  const barFill = useRef(new Animated.Value(0)).current;
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;
  const stars = [star1, star2, star3];

  useEffect(() => {
    fade.setValue(0);
    rise.setValue(8);
    barFill.setValue(0);
    stars.forEach(v => v.setValue(0));

    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: FADE_DURATION, delay: 200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(rise, { toValue: 0, duration: FADE_DURATION, delay: 200, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();

    if (testResult) {
      Animated.timing(barFill, {
        toValue: 1,
        duration: FILL_DURATION,
        delay: 350,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }).start();
      Animated.stagger(180, stars.map(v =>
        Animated.spring(v, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 })
      )).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testResult?.ts, testResult?.pct]);

  const pct = testResult ? Math.min(100, (testResult.pct / targetPct) * 100) : 0;
  const accent = testResult?.passed ? theme.good : theme.text;

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }], marginTop: 26 }}>
      <Pressable onPress={onPress} style={styles.testCard}>
        <Text style={styles.label}>注力課題のテスト結果</Text>
        <View style={styles.testHead}>
          <Text style={styles.testMetric}>{primaryFocus}</Text>
          {testResult ? (
            <Text style={styles.testPctVal}>
              <Text style={{ color: testResult.passed ? theme.good : theme.text, fontWeight: '700' }}>
                {testResult.pct}%
              </Text>
              <Text style={{ color: theme.textTer }}>  /  {targetPct}%</Text>
            </Text>
          ) : (
            <Text style={styles.testPct}>未挑戦</Text>
          )}
        </View>
        {testResult ? (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <HalfGauge
                value={testResult.pct}
                target={targetPct}
                max={100}
                accent={accent}
                fillAnim={barFill}
                size={130}
              />
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {[1, 2, 3].map((n, i) => (
                  <Animated.View key={n} style={{
                    opacity: stars[i],
                    transform: [{ scale: stars[i].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
                  }}>
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                      <Path d="M12 2 L14.5 9 L22 9 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2 9 L9.5 9 Z"
                        fill={testResult.stars >= n ? '#E5A83A' : 'transparent'}
                        stroke={testResult.stars >= n ? '#D49622' : theme.border}
                        strokeWidth={1.5} strokeLinejoin="round"/>
                    </Svg>
                  </Animated.View>
                ))}
              </View>
            </View>
            <Text style={styles.testDate}>
              {new Date(testResult.ts).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
              {' · '}{testResult.successes}/{testResult.attempts}
              {testResult.passed && <Text style={{ color: theme.good }}>  ·  目標達成</Text>}
            </Text>
          </View>
        ) : (
          <Text style={styles.testSub}>目標 {targetPct}%。まずは現状を測ろう。</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  topBar: { paddingTop: 8, paddingBottom: 2, flexDirection: 'row', justifyContent: 'flex-end' },
  gearBtn: { padding: 6 },
  label: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  bestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  bestLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  bestNum: { fontFamily: FONT.mono, fontSize: 44, fontWeight: '400', color: theme.text, letterSpacing: -1.6, lineHeight: 50 },
  bestAvg: { fontFamily: FONT.mono, fontSize: 12, color: theme.textSec, letterSpacing: 0.3 },
  sparkWrap: { flex: 1, maxWidth: 180, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sparkEmpty: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, textAlign: 'center', letterSpacing: 0.3, lineHeight: 14 },
  // スコア推移 展開
  scoreLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  expandHint: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  expandHintText: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.6 },
  absFill: { position: 'absolute', left: 0, right: 0, top: 0 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  statsRow: { flexDirection: 'row', marginTop: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: theme.border },
  statBig: { fontFamily: FONT.mono, fontSize: 21, fontWeight: '500', color: theme.text, letterSpacing: -0.5 },
  statLbl: { fontSize: 10.5, color: theme.textSec, marginTop: 3 },
  latestRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 8 },
  latestScore: { fontFamily: FONT.mono, fontSize: 22, fontWeight: '500', letterSpacing: -0.6, color: theme.text },
  latestDiff: { fontFamily: FONT.mono, fontSize: 12 },
  latestMeta: { fontSize: 11, color: theme.textSec },
  latestEmpty: { fontSize: 12, color: theme.textSec, marginTop: 8, fontStyle: 'italic' },
  recapCTA: { marginTop: 16, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderLeftWidth: 3, borderLeftColor: theme.text, borderRadius: 6 },
  recapTag: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  recapTitle: { fontSize: 12.5, fontWeight: '600', color: theme.text, marginTop: 3, letterSpacing: -0.1 },
  recapSub: { fontSize: 10.5, color: theme.textSec, marginTop: 3, lineHeight: 15 },
  recapArrow: { fontFamily: FONT.mono, fontSize: 12, color: theme.textSec },
  btnPrimary: { backgroundColor: theme.text, paddingVertical: 11, borderRadius: 6, alignItems: 'center' },
  btnPrimaryText: { color: theme.bg, fontSize: 12.5, fontWeight: '500' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.borderStrong, paddingVertical: 11, borderRadius: 6, alignItems: 'center' },
  btnSecondaryText: { color: theme.text, fontSize: 12.5, fontWeight: '500' },
  // 基準クリア進捗カード
  progCard: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 14, backgroundColor: theme.surface },
  progTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progMonth: { fontFamily: FONT.mono, fontSize: 10, color: GOLD, fontWeight: '700', letterSpacing: 0.3 },
  progValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 },
  progNum: { fontFamily: FONT.mono, fontSize: 32, fontWeight: '500', color: theme.text, letterSpacing: -1, lineHeight: 34 },
  progDen: { fontFamily: FONT.mono, fontSize: 13, color: theme.textSec },
  progBar: { height: 6, backgroundColor: theme.surfaceAlt, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progBarFill: { height: '100%', borderRadius: 3 },
  progSub: { fontSize: 11.5, color: theme.textSec, marginTop: 8 },
  testCard: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 14, backgroundColor: theme.surface },
  testHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 },
  testMetric: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: theme.text },
  testPct: { fontFamily: FONT.mono, fontSize: 12, color: theme.textTer },
  testPctVal: { fontFamily: FONT.mono, fontSize: 12 },
  testSub: { fontSize: 11.5, color: theme.textSec, marginTop: 8, lineHeight: 18 },
  testBar: { flex: 1, height: 3, backgroundColor: theme.border, borderRadius: 1, overflow: 'hidden' },
  testBarFill: { height: '100%' },
  testDate: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, marginTop: 6, letterSpacing: 0.3 },
  focusSub: { fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer, marginTop: 4, letterSpacing: 0.3 },
  focusGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14, marginTop: 10 },
  metric: { width: '31.5%', paddingTop: 4, paddingRight: 4, paddingBottom: 6, paddingLeft: 0, borderRadius: 3 },
  metricTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricLabel: { fontSize: 11, color: theme.textSec, letterSpacing: -0.1, flex: 1 },
  metricChip: { fontFamily: FONT.mono, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  metricValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 4 },
  metricVal: { fontFamily: FONT.mono, fontSize: 18, fontWeight: '500', letterSpacing: -0.5, lineHeight: 18 },
  metricUnit: { fontFamily: FONT.mono, fontSize: 10, color: theme.textSec },
  metricBar: { height: 2, backgroundColor: theme.border, borderRadius: 1, marginTop: 8, position: 'relative' },
  metricBarFill: { height: '100%', borderRadius: 1 },
  metricBarTick: { position: 'absolute', top: -2, width: 1.5, height: 6, backgroundColor: theme.text, marginLeft: -0.75 },
  metricTarget: { fontFamily: FONT.mono, fontSize: 9, marginTop: 4, letterSpacing: 0.3 },
  tipCard: { marginTop: 10, padding: 14, borderWidth: 1, borderColor: theme.border, borderLeftWidth: 3, borderLeftColor: theme.text, borderRadius: 8, backgroundColor: theme.surface },
  tipTag: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, marginBottom: 6, fontWeight: '500' },
  tipQ: { fontSize: 13, lineHeight: 22, color: theme.text, letterSpacing: -0.1 },
  tipWho: { fontSize: 11, color: theme.textSec, marginTop: 8 },
  analysisBtn: { marginTop: 20, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingVertical: 11, alignItems: 'center' },
  analysisText: { color: theme.textSec, fontSize: 12, fontWeight: '500' },
});

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { FONT } from '../theme/tokens';
import { getDrillDetail, getDrillsForChallenge } from '../data/drillDetails';
import { getChallenge } from '../data/challenges';
import { isFavorite, toggleFavorite } from '../data/favorites';

const INK = '#FEFEF8';
const SOFT = 'rgba(254,254,248,0.72)';
const DIM = 'rgba(254,254,248,0.5)';
const TER = 'rgba(254,254,248,0.32)';
const BORDER = 'rgba(254,254,248,0.18)';

const { width: SCREEN_W } = Dimensions.get('window');

// Per-slide theme
const THEMES_BY_SLIDE = {
  welcome: { bg: ['#0D2218', '#1F4230'], accent: '#D4B254' },
  summary: { bg: ['#141826', '#2B223C'], accent: '#E89A7A' },
  good:    { bg: ['#0F2B1C', '#2F5333'], accent: '#8EE4B3' },
  focus:   { bg: ['#2A1B24', '#483141'], accent: '#E8A5A5' },
  drill:   { bg: ['#1B1F2E', '#2E3044'], accent: '#D4B254' },
  close:   { bg: ['#0E0E14', '#222230'], accent: '#D4B254' },
};

// Map focus metric to a recommended drill (simple heuristic)
function pickRecommendedDrill(stats) {
  if (stats.boggyOnPct < 60) {
    const drills = getDrillsForChallenge('second');
    const d = drills[0];
    return d ? { id: d.id, challengeKey: 'second', detail: getDrillDetail(d.id) } : null;
  }
  if (stats.threePutts > 0) {
    const drills = getDrillsForChallenge('putt');
    const d = drills[0];
    return d ? { id: d.id, challengeKey: 'putt', detail: getDrillDetail(d.id) } : null;
  }
  const drills = getDrillsForChallenge('approach');
  const d = drills[0];
  return d ? { id: d.id, challengeKey: 'approach', detail: getDrillDetail(d.id) } : null;
}

export default function RoundCompleteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { course, holes = [], target, startedAt = Date.now(), isPractice, isHalf } = route.params || {};

  const played = holes.filter(h => h.strokes != null);
  const total = played.reduce((a, h) => a + h.strokes, 0);
  const playedPar = played.reduce((a, h) => a + h.par, 0);
  const diff = played.length ? total - playedPar : 0;
  const targetVal = target || 0;
  const reached = targetVal > 0 && total <= targetVal;

  const stats = {
    eagles:  played.filter(h => h.strokes - h.par <= -2).length,
    birdies: played.filter(h => h.strokes - h.par === -1).length,
    pars:    played.filter(h => h.strokes - h.par === 0).length,
    bogeys:  played.filter(h => h.strokes - h.par === 1).length,
    doubles: played.filter(h => h.strokes - h.par === 2).length,
    triples: played.filter(h => h.strokes - h.par >= 3).length,
    ob: played.filter(h => h.ob).length,
    threePutts: played.filter(h => (h.putts || 0) >= 3).length,
    totalPutts: played.reduce((a, h) => a + (h.putts || 0), 0),
    boggyOnHoles: played.filter(h => (h.strokes - (h.putts || 0)) <= (h.par - 1)).length,
  };
  stats.boggyOnPct = played.length ? Math.round((stats.boggyOnHoles / played.length) * 100) : 0;

  // Highlights
  let bestHole = null;
  played.forEach(h => {
    const d = h.strokes - h.par;
    const bd = bestHole ? bestHole.strokes - bestHole.par : 99;
    if (d < bd) bestHole = h;
  });
  let maxStreak = 0, cur = 0;
  holes.forEach(h => {
    if (h.strokes != null && (h.strokes - h.par) <= 0) { cur++; maxStreak = Math.max(maxStreak, cur); }
    else if (h.strokes != null) cur = 0;
  });

  const highlights = [];
  if (stats.eagles > 0)  highlights.push({ label: `Eagle × ${stats.eagles}`, sub: '会心の一撃' });
  if (stats.birdies > 0) highlights.push({ label: `Birdie × ${stats.birdies}`, sub: 'ピンを突いた' });
  if (stats.pars >= 5)   highlights.push({ label: `Par × ${stats.pars}`, sub: 'ベース安定' });
  if (stats.ob === 0 && played.length >= 6) highlights.push({ label: 'OB 0本', sub: '方向性が良い' });
  if (stats.threePutts === 0 && played.length >= 6) highlights.push({ label: '3パット 0', sub: 'パッティング冴え' });
  if (maxStreak >= 3) highlights.push({ label: `連続 Par+ × ${maxStreak}`, sub: '集中が切れない' });
  if (bestHole && (bestHole.strokes - bestHole.par) <= 0) {
    const d = bestHole.strokes - bestHole.par;
    const lab = d <= -2 ? 'Eagle' : d === -1 ? 'Birdie' : 'Par';
    highlights.push({ label: `${bestHole.no}番 ${lab}`, sub: 'ベストホール' });
  }
  if (highlights.length === 0 && played.length > 0) {
    highlights.push({ label: `${played.length}ホール完走`, sub: 'やり切った' });
  }
  const topHighlights = highlights.slice(0, 3);

  // Focus metric selection (simplified)
  const focusMetric = useMemo(() => {
    const boggyTarget = 60;
    const putt3Target = 1;
    if (stats.boggyOnPct < boggyTarget) {
      return { label: 'ボギーオン率', current: stats.boggyOnPct, target: boggyTarget, gap: boggyTarget - stats.boggyOnPct, reverse: false, unit: '%' };
    }
    if (stats.threePutts > putt3Target) {
      return { label: '3パット数', current: stats.threePutts, target: putt3Target, gap: stats.threePutts - putt3Target, reverse: true, unit: '回' };
    }
    return { label: 'ボギーオン率', current: stats.boggyOnPct, target: boggyTarget, gap: 0, reverse: false, unit: '%' };
  }, [stats]);

  const recDrill = useMemo(() => pickRecommendedDrill(stats), [stats]);

  const dateStr = new Date(startedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });

  const slides = [
    { key: 'welcome', duration: 3000 },
    { key: 'summary', duration: 5000 },
    ...(topHighlights.length > 0 ? [{ key: 'good', duration: 4500 }] : []),
    { key: 'focus',   duration: 5500 },
    ...(recDrill ? [{ key: 'drill', duration: 7000 }] : []),
    { key: 'close',   duration: 0 },
  ];

  const [idx, setIdx] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const slideFade = useRef(new Animated.Value(0)).current;

  const currentSlide = slides[idx];
  const currentTheme = THEMES_BY_SLIDE[currentSlide.key];

  const goHome = () => navigation.popToTop();
  const openDrill = () => {
    if (!recDrill) return;
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Main' },
        { name: 'DrillDetail', params: { drillId: recDrill.id, challengeKey: recDrill.challengeKey } },
      ],
    });
  };
  const nextSlide = () => { if (idx < slides.length - 1) setIdx(i => i + 1); };
  const prevSlide = () => { if (idx > 0) setIdx(i => i - 1); };

  useEffect(() => {
    progress.setValue(0);
    slideFade.setValue(0);
    Animated.timing(slideFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    if (currentSlide.duration > 0) {
      Animated.timing(progress, {
        toValue: 1,
        duration: currentSlide.duration,
        useNativeDriver: false,
        easing: Easing.linear,
      }).start(({ finished }) => { if (finished) nextSlide(); });
    } else {
      progress.setValue(1);
    }
    return () => progress.stopAnimation();
  }, [idx]);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={currentTheme.bg} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header: progress + close */}
        <View style={styles.header}>
          <View style={styles.progressBars}>
            {slides.map((_, i) => (
              <View key={i} style={styles.progressTrack}>
                <Animated.View style={[
                  styles.progressFill,
                  {
                    width: i < idx ? '100%'
                      : i > idx ? '0%'
                      : progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  },
                ]} />
              </View>
            ))}
          </View>
          <Pressable onPress={goHome} hitSlop={12} style={styles.closeBtn}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M6 6L18 18M18 6L6 18" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>

        {/* Slide content with tap-zone wrapper */}
        <Pressable
          style={{ flex: 1 }}
          onPress={(e) => {
            const x = e.nativeEvent.locationX;
            if (x < SCREEN_W * 0.35) prevSlide();
            else nextSlide();
          }}
        >
          <Animated.View style={{ flex: 1, opacity: slideFade }}>
            {currentSlide.key === 'welcome' && (
              <WelcomeSlide theme={currentTheme} course={course} dateStr={dateStr} reached={reached} isPractice={isPractice} isHalf={isHalf} />
            )}
            {currentSlide.key === 'summary' && (
              <SummarySlide theme={currentTheme} total={total} diff={diff} playedPar={playedPar} stats={stats} reached={reached} isHalf={isHalf} playedCount={played.length} />
            )}
            {currentSlide.key === 'good' && (
              <GoodSlide theme={currentTheme} highlights={topHighlights} />
            )}
            {currentSlide.key === 'focus' && (
              <FocusSlide theme={currentTheme} focus={focusMetric} target={targetVal} reached={reached} />
            )}
            {currentSlide.key === 'drill' && recDrill && (
              <DrillSlide theme={currentTheme} drill={recDrill.detail} drillId={recDrill.id} onOpen={openDrill} />
            )}
            {currentSlide.key === 'close' && (
              <CloseSlide theme={currentTheme} total={total} diff={diff} reached={reached} onHome={goHome} />
            )}
          </Animated.View>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

// ───────── Welcome ─────────
function WelcomeSlide({ theme, course, dateStr, reached, isPractice, isHalf }) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;
  const hintFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(rise, { toValue: 0, useNativeDriver: true, friction: 6, tension: 60 }),
      Animated.timing(hintFade, { toValue: 1, duration: 500, delay: 900, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Stage>
      <View style={{ position: 'relative' }}>
        <Sparkles accent={theme.accent} />
        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
          <Text style={[styles.kicker, { color: theme.accent }]}>ROUND · COMPLETE</Text>
          <Text style={styles.welcomeTitle}>お疲れ様{'\n'}でした。</Text>
          <View style={[styles.accentLine, { backgroundColor: theme.accent }]} />
          <Text style={styles.welcomeMeta}>{course?.name}</Text>
          <Text style={styles.welcomeMetaSub}>
            {dateStr}{isHalf ? '  ·  HALF' : ''}{isPractice ? '  ·  PRACTICE' : ''}
          </Text>
          {reached && (
            <View style={[styles.reachedChip, { borderColor: theme.accent }]}>
              <Text style={[styles.reachedText, { color: theme.accent }]}>★ 目標達成</Text>
            </View>
          )}
        </Animated.View>
      </View>
      <View style={{ flex: 1 }} />
      <Animated.View style={{ opacity: hintFade, alignItems: 'center' }}>
        <Text style={styles.hintText}>TAP →  NEXT     ·     ←  PREV</Text>
      </Animated.View>
    </Stage>
  );
}

// ───────── Summary ─────────
function SummarySlide({ theme, total, diff, playedPar, stats, reached, isHalf, playedCount }) {
  const [displayTotal, setDisplayTotal] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const diffFade = useRef(new Animated.Value(0)).current;
  const chipsFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = 1000;
    const steps = 36;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i >= steps) { setDisplayTotal(total); clearInterval(iv); }
      else setDisplayTotal(Math.round((total / steps) * i));
    }, duration / steps);

    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 70 }),
      Animated.timing(diffFade, { toValue: 1, duration: 300, delay: 800, useNativeDriver: true }),
      Animated.timing(chipsFade, { toValue: 1, duration: 350, delay: 1200, useNativeDriver: true }),
    ]).start();
    return () => clearInterval(iv);
  }, []);

  const diffColor = diff > 0 ? theme.accent : diff < 0 ? '#8EE4B3' : INK;

  const chips = [
    { k: 'Birdie', v: stats.birdies, c: '#8EE4B3' },
    { k: 'Par',    v: stats.pars,    c: INK },
    { k: 'Bogey',  v: stats.bogeys,  c: SOFT },
    { k: 'OB',     v: stats.ob,      c: stats.ob > 0 ? theme.accent : SOFT },
    { k: '3Putt',  v: stats.threePutts, c: stats.threePutts > 0 ? theme.accent : SOFT },
  ].filter(c => c.v > 0 || ['Par', 'Bogey'].includes(c.k));

  return (
    <Stage>
      {reached && <Confetti />}
      <Animated.Text style={[styles.kicker, { color: theme.accent, opacity: fade }]}>
        こんなラウンドでしたね
      </Animated.Text>

      <Animated.View style={{ opacity: fade, transform: [{ scale }], marginTop: 24, alignItems: 'center' }}>
        <Text style={styles.heroScore}>{displayTotal}</Text>
      </Animated.View>

      <Animated.View style={{ opacity: diffFade, alignItems: 'center', marginTop: 4 }}>
        <Text style={[styles.heroDiff, { color: diffColor }]}>
          {diff >= 0 ? '+' : ''}{diff}
        </Text>
        <Text style={[styles.heroSub, { color: TER }]}>
          PAR {playedPar}  ·  {playedCount}ホール{isHalf ? ' (HALF)' : ''}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.chipsGrid, { opacity: chipsFade }]}>
        {chips.map(c => (
          <View key={c.k} style={styles.chip}>
            <Text style={[styles.chipK, { color: DIM }]}>{c.k}</Text>
            <Text style={[styles.chipV, { color: c.c }]}>{c.v}</Text>
          </View>
        ))}
      </Animated.View>
    </Stage>
  );
}

// ───────── Good ─────────
function GoodSlide({ theme, highlights }) {
  const titleFade = useRef(new Animated.Value(0)).current;
  const anims = highlights.map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(titleFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.stagger(
        200,
        anims.map(a => Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }))
      ),
    ]).start();
  }, []);

  return (
    <Stage align="top">
      <Animated.Text style={[styles.kicker, { color: theme.accent, opacity: titleFade }]}>
        Good Points
      </Animated.Text>
      <Animated.Text style={[styles.goodTitle, { opacity: titleFade }]}>
        ここが良かった{'\n'}ですね！
      </Animated.Text>
      <Animated.Text style={[styles.goodSubtitle, { opacity: titleFade, color: SOFT }]}>
        データから光っていた点を拾いました。
      </Animated.Text>

      <View style={{ marginTop: 28, gap: 12 }}>
        {highlights.map((h, i) => (
          <Animated.View
            key={i}
            style={[
              styles.goodCard,
              { borderColor: theme.accent + '44' },
              {
                opacity: anims[i],
                transform: [
                  { translateX: anims[i].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
                ],
              },
            ]}
          >
            <View style={[styles.goodBullet, { backgroundColor: theme.accent + '22' }]}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M5 13l4 4L19 7" stroke={theme.accent} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.goodLabel}>{h.label}</Text>
              <Text style={[styles.goodSub, { color: SOFT }]}>{h.sub}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </Stage>
  );
}

// ───────── Focus ─────────
function FocusSlide({ theme, focus, target, reached }) {
  const fade1 = useRef(new Animated.Value(0)).current;
  const fade2 = useRef(new Animated.Value(0)).current;
  const fade3 = useRef(new Animated.Value(0)).current;
  const fade4 = useRef(new Animated.Value(0)).current;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade1, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(fade2, { toValue: 1, duration: 300, delay: 100, useNativeDriver: true }),
      Animated.timing(fade3, { toValue: 1, duration: 300, delay: 200, useNativeDriver: true }),
      Animated.timing(barAnim, { toValue: 1, duration: 800, delay: 100, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
      Animated.timing(fade4, { toValue: 1, duration: 350, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const hasNums = focus.current != null && focus.target != null;
  // Bar fill percent: how close current is to target (capped 100)
  const pctCur = hasNums
    ? (focus.reverse
        ? Math.max(0, Math.min(100, ((focus.target / Math.max(focus.current, 0.1)) * 100)))
        : Math.max(0, Math.min(100, (focus.current / focus.target) * 100)))
    : 0;

  return (
    <Stage>
      <Animated.Text style={[styles.kicker, { color: theme.accent, opacity: fade1 }]}>
        次のレベルへ
      </Animated.Text>

      {/* Target headline */}
      <Animated.Text style={[styles.focusLine, { color: SOFT, opacity: fade1, marginTop: 20 }]}>
        あなたの次の目標は
      </Animated.Text>
      <Animated.View style={{ opacity: fade2, marginTop: 2, flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <Text style={styles.focusTargetNum}>{target || '—'}</Text>
        <Text style={[styles.focusTargetUnit, { color: DIM }]}>打を切る</Text>
      </Animated.View>

      {/* Metric */}
      <Animated.Text style={[styles.focusLine, { color: SOFT, opacity: fade3, marginTop: 32 }]}>
        そのために磨くのは
      </Animated.Text>
      <Animated.Text style={[styles.focusMetric, { opacity: fade3, marginTop: 4 }]}>
        {focus.label}
      </Animated.Text>

      {hasNums && (
        <Animated.View style={{ opacity: fade4, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={[styles.focusMeta, { color: TER }]}>TODAY</Text>
              <Text style={[styles.focusVal, { color: focus.gap > 0 ? theme.accent : '#8EE4B3' }]}>
                {focus.current}{focus.unit}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={[styles.focusMeta, { color: TER }]}>GOAL</Text>
              <Text style={[styles.focusVal, { color: SOFT, fontSize: 18 }]}>
                {focus.target}{focus.unit}
              </Text>
            </View>
          </View>
          <View style={styles.focusBar}>
            <Animated.View style={[
              styles.focusBarFill,
              {
                width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pctCur}%`] }),
                backgroundColor: focus.gap > 0 ? theme.accent : '#8EE4B3',
              },
            ]} />
            <View style={[styles.focusBarTarget]} />
          </View>
        </Animated.View>
      )}

      <Animated.Text style={[styles.focusNote, { color: SOFT, opacity: fade4 }]}>
        {reached
          ? 'ここを安定できれば、次のレベルが視界に入ります。'
          : 'この1点を集中的に磨けば、目標は届きます。'}
      </Animated.Text>
    </Stage>
  );
}

// ───────── Drill ─────────
function DrillSlide({ theme, drill, drillId, onOpen }) {
  const fadeT = useRef(new Animated.Value(0)).current;
  const fadeC = useRef(new Animated.Value(0)).current;
  const fadeB = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const [favActive, setFavActive] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeT, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeC, { toValue: 1, duration: 350, delay: 150, useNativeDriver: true }),
      Animated.timing(fadeB, { toValue: 1, duration: 350, delay: 300, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.035, duration: 850, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    isFavorite(drillId).then(setFavActive);
  }, [drillId]);

  const onToggleFav = async () => {
    const now = await toggleFavorite(drillId);
    setFavActive(now);
  };

  return (
    <Stage align="top">
      <Animated.Text style={[styles.kicker, { color: theme.accent, opacity: fadeT }]}>
        For That Metric
      </Animated.Text>
      <Animated.Text style={[styles.drillTitle, { opacity: fadeT }]}>
        このドリルを{'\n'}やってみよう
      </Animated.Text>

      {/* Drill card */}
      <Animated.View style={[styles.drillCard, { opacity: fadeC, borderColor: theme.accent + '44' }]}>
        <Text style={[styles.drillKicker, { color: theme.accent }]}>{drill.condition}</Text>
        <Text style={styles.drillName}>{drill.name}</Text>
        {drill.purpose && (
          <Text style={[styles.drillPurpose, { color: SOFT }]} numberOfLines={4}>
            {drill.purpose}
          </Text>
        )}
        {drill.pass?.text && (
          <View style={[styles.drillPass, { borderTopColor: BORDER }]}>
            <Text style={[styles.drillPassLabel, { color: TER }]}>合格ライン</Text>
            <Text style={[styles.drillPassText, { color: INK }]}>{drill.pass.text}</Text>
          </View>
        )}
      </Animated.View>

      {/* CTAs */}
      <Animated.View style={{ opacity: fadeB, marginTop: 14, gap: 8 }}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Pressable onPress={onOpen} style={[styles.drillBtn, { backgroundColor: INK }]}>
            <Text style={styles.drillBtnText}>ドリルページを開く  →</Text>
          </Pressable>
        </Animated.View>
        <Pressable onPress={onToggleFav} style={[styles.favBtn, favActive && { backgroundColor: 'rgba(254,254,248,0.12)', borderColor: INK }]}>
          <Svg width={14} height={14} viewBox="0 0 16 16" fill={favActive ? INK : 'none'}>
            <Path d="M8 13.5s-5.5-3.2-5.5-7.2c0-2 1.5-3.3 3.2-3.3 1.1 0 2 .6 2.3 1.5.3-.9 1.2-1.5 2.3-1.5 1.7 0 3.2 1.3 3.2 3.3 0 4-5.5 7.2-5.5 7.2z"
              stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
          </Svg>
          <Text style={styles.favBtnText}>{favActive ? 'お気に入り登録済み' : 'あとで見返す（お気に入り）'}</Text>
        </Pressable>
      </Animated.View>
    </Stage>
  );
}

// ───────── Close ─────────
function CloseSlide({ theme, total, diff, reached, onHome }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scoreFade = useRef(new Animated.Value(0)).current;
  const btnFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(scoreFade, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
      Animated.timing(btnFade, { toValue: 1, duration: 500, delay: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const diffColor = diff > 0 ? theme.accent : diff < 0 ? '#8EE4B3' : SOFT;

  return (
    <View style={styles.stage}>
      <Animated.View style={{ opacity: fade, flex: 1, justifyContent: 'center' }}>
        <Text style={[styles.kicker, { color: theme.accent }]}>See You Next Round</Text>
        <Text style={styles.closeTitle}>また次の{'\n'}ラウンドで</Text>

        <Animated.View style={{ opacity: scoreFade, marginTop: 36 }}>
          <Text style={[styles.closeTodayLabel, { color: DIM }]}>TODAY</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
            <Text style={styles.closeTotal}>{total}</Text>
            <Text style={[styles.closeDiff, { color: diffColor }]}>
              {diff >= 0 ? '+' : ''}{diff}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.View style={{ opacity: btnFade }}>
        <Pressable onPress={onHome} style={[styles.homeBtn, { backgroundColor: INK }]}>
          <Text style={styles.homeText}>ホームに戻る</Text>
        </Pressable>
        <Text style={[styles.closeFoot, { color: TER }]}>
          48時間以内、ホームの「直近のラウンド」{'\n'}からいつでも見返せます
        </Text>
      </Animated.View>
    </View>
  );
}

// ───────── Shared ─────────
function Stage({ children, align = 'center' }) {
  return (
    <View style={[styles.stage, align === 'top' && { justifyContent: 'flex-start' }]}>
      {align !== 'top'
        ? <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>
        : children}
    </View>
  );
}

// Confetti — 30 particles fly outward
function Confetti() {
  const particles = useMemo(() => {
    const colors = ['#8EE4B3', '#E89A7A', '#FEFEF8', '#D4B254', '#E8A5A5'];
    return Array.from({ length: 30 }, (_, i) => {
      const angle = (i / 30) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const dist = 120 + Math.random() * 160;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 30,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 6,
        delay: Math.random() * 300,
        round: Math.random() > 0.4,
      };
    });
  }, []);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.out(Easing.cubic) }).start();
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute',
          left: '50%', top: '40%',
          width: p.size, height: p.size,
          backgroundColor: p.color,
          borderRadius: p.round ? p.size / 2 : 1,
          opacity: anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] }) },
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.y] }) },
            { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) },
          ],
        }}/>
      ))}
    </View>
  );
}

// Sparkles — 4 rotating stars
function Sparkles({ accent = '#FFFFFF' }) {
  const positions = [
    { x: -40, y: -40, delay: 200, size: 10 },
    { x: 50, y: -50, delay: 500, size: 8 },
    { x: -60, y: 50, delay: 800, size: 9 },
    { x: 55, y: 55, delay: 1100, size: 7 },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {positions.map((p, i) => <Sparkle key={i} {...p} accent={accent} />)}
    </View>
  );
}
function Sparkle({ x, y, delay, size, accent }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute',
      left: '50%', top: 60, // near top where title is
      marginLeft: x, marginTop: y,
      width: size, height: size,
      opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }),
      transform: [
        { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] }) },
        { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
      ],
    }}>
      <Svg width={size} height={size} viewBox="0 0 10 10">
        <Path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill={accent} />
      </Svg>
    </Animated.View>
  );
}

// ───────── Styles ─────────
const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, gap: 14,
  },
  progressBars: { flex: 1, flexDirection: 'row', gap: 3 },
  progressTrack: { flex: 1, height: 2.5, backgroundColor: 'rgba(254,254,248,0.22)', borderRadius: 1.5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: INK },
  closeBtn: { padding: 4 },
  // Stage
  stage: { flex: 1, paddingHorizontal: 32, paddingTop: 24, paddingBottom: 36 },
  // Kicker
  kicker: { fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: 1.8, fontWeight: '600', textTransform: 'uppercase' },
  // Welcome
  welcomeTitle: { fontSize: 52, fontWeight: '700', color: INK, letterSpacing: -1.5, lineHeight: 64, marginTop: 20 },
  accentLine: { height: 2, width: 48, marginTop: 28, marginBottom: 22 },
  welcomeMeta: { fontSize: 17, color: INK, fontWeight: '600', letterSpacing: -0.2 },
  welcomeMetaSub: { fontFamily: FONT.mono, fontSize: 12, color: SOFT, marginTop: 6, letterSpacing: 0.5 },
  reachedChip: { marginTop: 22, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderRadius: 20 },
  reachedText: { fontFamily: FONT.mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  hintText: { fontFamily: FONT.mono, fontSize: 10, color: TER, letterSpacing: 1.6, fontWeight: '500' },
  // Summary
  heroScore: { fontFamily: FONT.mono, fontSize: 140, fontWeight: '300', color: INK, letterSpacing: -5, lineHeight: 146, includeFontPadding: false, textAlign: 'center' },
  heroDiff: { fontFamily: FONT.mono, fontSize: 24, fontWeight: '500' },
  heroSub: { fontFamily: FONT.mono, fontSize: 11, marginTop: 6, letterSpacing: 0.8, fontWeight: '500', textTransform: 'uppercase' },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 36, justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 4, backgroundColor: 'rgba(254,254,248,0.06)', borderWidth: 1, borderColor: 'rgba(254,254,248,0.15)' },
  chipK: { fontSize: 11, fontWeight: '500' },
  chipV: { fontFamily: FONT.mono, fontSize: 15, fontWeight: '600', letterSpacing: -0.3 },
  // Good
  goodTitle: { fontSize: 36, fontWeight: '700', color: INK, letterSpacing: -0.9, marginTop: 12, lineHeight: 42 },
  goodSubtitle: { fontSize: 13, marginTop: 10 },
  goodCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(254,254,248,0.05)' },
  goodBullet: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  goodLabel: { fontSize: 17, fontWeight: '700', color: INK, letterSpacing: -0.3 },
  goodSub: { fontSize: 12, marginTop: 3 },
  // Focus
  focusLine: { fontSize: 16, fontWeight: '500', letterSpacing: -0.2 },
  focusTargetNum: { fontFamily: FONT.mono, fontSize: 72, fontWeight: '300', color: INK, letterSpacing: -3, lineHeight: 78, includeFontPadding: false },
  focusTargetUnit: { fontFamily: FONT.mono, fontSize: 14, letterSpacing: 0.3 },
  focusMetric: { fontSize: 28, fontWeight: '700', color: INK, letterSpacing: -0.7, lineHeight: 34 },
  focusMeta: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 0.8, fontWeight: '600', textTransform: 'uppercase' },
  focusVal: { fontFamily: FONT.mono, fontSize: 22, fontWeight: '500', letterSpacing: -0.6 },
  focusBar: { height: 8, backgroundColor: 'rgba(254,254,248,0.14)', borderRadius: 4, overflow: 'hidden', position: 'relative' },
  focusBarFill: { height: '100%' },
  focusBarTarget: { position: 'absolute', left: '100%', top: -3, width: 2, height: 14, backgroundColor: INK, opacity: 0.85, marginLeft: -1 },
  focusNote: { fontSize: 14, marginTop: 28, lineHeight: 22, letterSpacing: -0.1 },
  // Drill
  drillTitle: { fontSize: 32, fontWeight: '700', color: INK, letterSpacing: -0.7, marginTop: 10, lineHeight: 40 },
  drillCard: { marginTop: 22, padding: 18, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(254,254,248,0.06)' },
  drillKicker: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, fontWeight: '700', textTransform: 'uppercase' },
  drillName: { fontSize: 22, fontWeight: '700', color: INK, letterSpacing: -0.4, marginTop: 6, lineHeight: 28 },
  drillPurpose: { fontSize: 13, lineHeight: 20, marginTop: 10 },
  drillPass: { marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
  drillPassLabel: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, fontWeight: '600', textTransform: 'uppercase' },
  drillPassText: { fontSize: 13, fontWeight: '600', marginTop: 3, letterSpacing: -0.2 },
  drillBtn: { paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  drillBtnText: { color: '#0D0D14', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  favBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(254,254,248,0.3)' },
  favBtnText: { color: INK, fontSize: 13, fontWeight: '500' },
  // Close
  closeTitle: { fontSize: 40, fontWeight: '700', color: INK, letterSpacing: -1.2, marginTop: 14, lineHeight: 50 },
  closeTodayLabel: { fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1.2, fontWeight: '600', textTransform: 'uppercase' },
  closeTotal: { fontFamily: FONT.mono, fontSize: 72, fontWeight: '300', color: INK, letterSpacing: -3, lineHeight: 78, includeFontPadding: false },
  closeDiff: { fontFamily: FONT.mono, fontSize: 22, fontWeight: '500' },
  homeBtn: { paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  homeText: { color: '#0D0D14', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  closeFoot: { fontFamily: FONT.mono, fontSize: 10, marginTop: 14, textAlign: 'center', lineHeight: 16, letterSpacing: 0.4 },
});

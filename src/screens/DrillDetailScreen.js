import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing, Image, FlatList, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path, Rect, Circle, Ellipse, Line, Text as SvgText, G, Polygon, LinearGradient, Defs, Stop, ClipPath } from 'react-native-svg';
import { THEMES, FONT } from '../theme/tokens';
import { getDrillDetail } from '../data/drillDetails';
import { isFavorite, toggleFavorite } from '../data/favorites';
import GateDrillAnimation from '../components/GateDrillAnimation';
import OverDrillAnimation from '../components/OverDrillAnimation';
import SwingDrillAnimation from '../components/SwingDrillAnimation';

const theme = THEMES.light;

// ── ゲートドリル: 静止画カルーセル ──
const GATE_STEPS = [
  require('../../assets/drills/gate-step-1.png'),
  require('../../assets/drills/gate-step-2.png'),
  require('../../assets/drills/gate-step-3.png'),
  require('../../assets/drills/gate-step-4.png'),
  require('../../assets/drills/gate-step-5.png'),
];
const GATE_IMG_W = 269;  // 切り出し後の幅
const GATE_IMG_H = 714;  // 切り出し後の高さ
const GATE_IMG_AR = GATE_IMG_W / GATE_IMG_H; // 約0.377

function GateCarousel() {
  const { width: winW } = useWindowDimensions();
  const slideW = winW - 32; // 16px の左右マージン
  // 画像は縦長なので、画面に収まる適切な高さに調整
  const imgH = Math.min(slideW / GATE_IMG_AR, 520); // 最大520px
  const imgW = imgH * GATE_IMG_AR;
  const [page, setPage] = useState(0);

  return (
    <View style={styles.gateCarouselWrap}>
      <FlatList
        data={GATE_STEPS}
        horizontal
        pagingEnabled
        snapToInterval={slideW}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const i = Math.round(e.nativeEvent.contentOffset.x / slideW);
          setPage(i);
        }}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.gateSlide, { width: slideW }]}>
            <Image source={item} style={{ width: imgW, height: imgH }} resizeMode="contain" />
          </View>
        )}
      />
      {/* ページドット */}
      <View style={styles.gateDots}>
        {GATE_STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.gateDot, i === page && styles.gateDotActive]}
          />
        ))}
      </View>
      <Text style={styles.gateHint}>{page + 1} / {GATE_STEPS.length}  ·  ← スワイプ →</Text>
    </View>
  );
}

// Animated SVG primitives
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

// Reps per drill variant — chips show 1/N → 5/N etc cycling
const DRILL_REPS = {
  gate: 5, straight: 10, over: 5, swing: 5, eyesclosed: 5, metronome: 4, onehand: 3,
};

// Cycle duration per variant (ms)
const CYCLE_DUR = {
  gate: 2400, straight: 2400, over: 2400, eyesclosed: 2400,
  metronome: 790, onehand: 1000,
};

// ─── Drill Diagram (static, simplified from HTML) ───
function DrillDiagram({ variant, view }) {
  const W = 320, H = 260;
  const ISO_INK = '#1E1E1E';
  const FLAG_RED = '#D64545';

  // シネマティックアニメーションコンポーネントを先に dispatch
  if (variant === 'over')   return <OverDrillAnimation view={view} />;
  if (variant === 'swing')  return <SwingDrillAnimation view={view} />;

  if (view === 'setup') {
    return <SetupView variant={variant} />;
  }
  // top view
  return <TopView variant={variant} W={W} H={H} ISO_INK={ISO_INK} FLAG_RED={FLAG_RED} />;
}

function IsoBase({ W, H }) {
  return (
    <>
      <Defs>
        <LinearGradient id="drBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#DEE5E0" />
          <Stop offset="100%" stopColor="#C5CEC8" />
        </LinearGradient>
        <LinearGradient id="drGrass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#7AA889" />
          <Stop offset="100%" stopColor="#4F7A61" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill="url(#drBg)" />
      <Polygon points="40,150 280,150 320,260 0,260" fill="url(#drGrass)" stroke="#4F7A61" strokeWidth={0.5} />
    </>
  );
}

function IsoFlag({ x, y, FLAG_RED, ISO_INK }) {
  return (
    <G>
      <Line x1={x} y1={y} x2={x} y2={y - 60} stroke={ISO_INK} strokeWidth={1.3} />
      <Polygon points={`${x},${y-60} ${x+18},${y-55} ${x},${y-48}`} fill={FLAG_RED} stroke={ISO_INK} strokeWidth={0.8} />
    </G>
  );
}

function IsoHole({ cx, cy, ISO_INK }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy + 1.5} rx={10} ry={4.2} fill={ISO_INK} />
      <Ellipse cx={cx} cy={cy} rx={8.5} ry={3.4} fill="#303030" />
    </G>
  );
}

function DataChip({ text }) {
  return (
    <G>
      <Rect x={14} y={14} width={110} height={22} rx={3} fill="rgba(255,255,255,0.88)" stroke="#1E1E1E" strokeWidth={0.5} />
      <SvgText x={22} y={29} fontSize={10} fill="#1E1E1E" fontFamily={FONT.mono}>{text}</SvgText>
    </G>
  );
}

// Rep counter chip top-right
function RepBadge({ rep, max, W = 320 }) {
  return (
    <G>
      <Rect x={W - 14 - 70} y={14} width={70} height={22} rx={3} fill="#1E1E1E" />
      <SvgText x={W - 14 - 64} y={29} fontSize={9} fill="rgba(255,255,255,0.55)" fontFamily={FONT.mono} letterSpacing="0.6">REP</SvgText>
      <SvgText x={W - 14 - 38} y={29} fontSize={11} fill="#fff" fontFamily={FONT.mono} fontWeight="600" letterSpacing="0.3">{rep}</SvgText>
      <SvgText x={W - 14 - 24} y={29} fontSize={9} fill="rgba(255,255,255,0.5)" fontFamily={FONT.mono}>/{max}</SvgText>
    </G>
  );
}

// ─── CinematicGateScene は GateDrillAnimation に移行済み ───
// src/components/GateDrillAnimation.js を参照。
// 削除済み — 旧実装 (Animated API ベース) はここに置かない。
function _unusedCinematicGateScene_DELETED({ ISO_INK, FLAG_RED }) {
  const [containerW, setContainerW] = useState(320);
  const ratio = containerW > 0 ? containerW / 320 : 1;

  const t = useRef(new Animated.Value(0)).current;
  const tValRef = useRef(0);
  const captionFade = useRef(new Animated.Value(1)).current;
  const [captionIdx, setCaptionIdx] = useState(0);

  const TOTAL = 12000;
  // Captions: align with the actual drill steps
  const captions = [
    'ボールの10cm先に1本目を刺す',
    'ボールがギリギリ通る幅で2本目',
    'ティーに当てず通すのが目標',
    'パターを真っ直ぐ振る',
    '5回連続でクリア',
  ];
  // Beat boundaries. Total 12s — extended for caption readability.
  // Beat 1 = 1.8s  (tee 1: zoom + snap drop, with reading dwell)
  // Beat 2 = 1.8s  (tee 2: pan + snap drop, with reading dwell)
  // Beat 3 = 1.8s  (zoom OUT, ball + dimensions)
  // Beat 4 = 4.8s  (putter swing + ball through gate)
  // Beat 5 = 1.8s  (success badge + hold)
  const capStart = [0.00, 0.15, 0.30, 0.45, 0.85];

  useEffect(() => {
    const listenerId = t.addListener(({ value }) => { tValRef.current = value; });
    Animated.loop(
      Animated.timing(t, {
        toValue: 1, duration: TOTAL, useNativeDriver: false, easing: Easing.linear,
      })
    ).start();

    let lastIdx = -1;
    const tick = setInterval(() => {
      const v = tValRef.current;
      let idx = 0;
      for (let i = capStart.length - 1; i >= 0; i--) {
        if (v >= capStart[i]) { idx = i; break; }
      }
      if (idx !== lastIdx) {
        lastIdx = idx;
        Animated.timing(captionFade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
          setCaptionIdx(idx);
          Animated.timing(captionFade, { toValue: 1, duration: 280, useNativeDriver: true }).start();
        });
      }
    }, 60);

    return () => {
      clearInterval(tick);
      t.removeListener(listenerId);
      t.stopAnimation();
    };
  }, []);

  // ─── Layout (behind-ball POV, viewBox 320×260) ───
  // Ball at (160, 178), starts large (r=7) — close to the camera.
  // Gate at depth y=130 (further from camera):
  //   Tee 1 base = (150, 130)   ← left tee
  //   Tee 2 base = (170, 130)   ← right tee
  //   Both stems extend UPWARD to y=110, cups at the top.
  //   Gate width on screen = 20 SVG units (= ball width × 1.43 → ギリギリ feel).
  // Ball travels: foreground (160, 178, r=7) → past gate (160, 88, r=4).
  //   Ball edges at gate level (x=153, 167) leave just 3 SVG units clearance
  //   from each tee — visually tight.
  // Putter: vertical shaft, head at ball level, grip centered at bottom.

  // ─── Camera path: zoomed-in tee placement → zoom out → swing → success ───
  // Each beat has 75% dwell + 25% cubic ease-in-out transition.
  const cameraKeys = {
    rest1: [0.00, 4.0, 150, 115],   // ZOOMED IN on Tee 1 (focus shifted UP for taller tee)
    rest2: [0.15, 4.0, 170, 115],   // pan to Tee 2 (still zoomed up)
    rest3: [0.30, 1.0, 160, 145],   // ZOOM OUT — full reveal with ball
    rest4: [0.45, 1.0, 160, 152],   // wider for putter setup
    rest5: [0.85, 1.04, 160, 130],  // toward gate for success badge
  };

  const buildCamArray = (axis) => {
    const keys = ['rest1', 'rest2', 'rest3', 'rest4', 'rest5'];
    const tvList = keys.map(k => cameraKeys[k][0]);
    const valOf = (k) => {
      const [_, s, fx, fy] = cameraKeys[k];
      return axis === 'scale' ? s : axis === 'tx' ? -s * (fx - 160) : -s * (fy - 130);
    };
    const inp = [tvList[0]];
    const out = [valOf(keys[0])];
    for (let i = 1; i < keys.length; i++) {
      const tvPrev = tvList[i - 1];
      const tv = tvList[i];
      const valPrev = out[out.length - 1];
      const val = valOf(keys[i]);
      const gap = tv - tvPrev;
      // 75% dwell, 25% cubic ease-in-out transition
      const dwellEnd = tvPrev + gap * 0.75;
      inp.push(dwellEnd); out.push(valPrev);
      const tStart = dwellEnd;
      const tLen = tv - tStart;
      // Cubic ease-in-out (y = 3x²−2x³): samples at 0.25/0.5/0.75 → 0.156/0.500/0.844
      inp.push(tStart + tLen * 0.25); out.push(valPrev + (val - valPrev) * 0.156);
      inp.push(tStart + tLen * 0.50); out.push(valPrev + (val - valPrev) * 0.500);
      inp.push(tStart + tLen * 0.75); out.push(valPrev + (val - valPrev) * 0.844);
      inp.push(tv); out.push(val);
    }
    inp.push(1); out.push(out[out.length - 1]);
    return { inp, out };
  };
  const camScaleA = buildCamArray('scale');
  const camTxA = buildCamArray('tx');
  const camTyA = buildCamArray('ty');

  const camScale = t.interpolate({ inputRange: camScaleA.inp, outputRange: camScaleA.out });
  const camTxSvg = t.interpolate({ inputRange: camTxA.inp, outputRange: camTxA.out });
  const camTySvg = t.interpolate({ inputRange: camTyA.inp, outputRange: camTyA.out });

  // ─── Element animations (12s timeline) ───
  // Ball: hidden during zoom-in beats; fades in during zoom-out reveal;
  // flies past gate after putter impact (0.71) and exits frame
  const ballOp = t.interpolate({
    inputRange: [0, 0.300, 0.345, 0.790, 0.810, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
    extrapolate: 'clamp',
  });

  // ─── Tee 1 (left): SNAP drop, Beat 1 (0.00–0.15) ───
  const tee1Op = t.interpolate({
    inputRange: [0, 0.015, 0.030, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp',
  });
  // Two-phase drop: gravity fall (0.030–0.090, -18 → 0 cubic ease-in) +
  // drive-in into ground (0.090–0.115, 0 → +7.5). Final position buries 1/4 of tee.
  const tee1DropY = t.interpolate({
    inputRange: [0,    0.030, 0.045, 0.060, 0.075, 0.090, 0.115, 1],
    outputRange: [-18, -18,   -17.72, -15.75, -10.4, 0,    7.5,   7.5],
    extrapolate: 'clamp',
  });
  // Impact ring at base
  const tee1RingR = t.interpolate({
    inputRange: [0, 0.087, 0.090, 0.099, 0.135, 1],
    outputRange: [0, 0, 3, 14, 26, 26],
    extrapolate: 'clamp',
  });
  const tee1RingOp = t.interpolate({
    inputRange: [0, 0.087, 0.090, 0.099, 0.135, 1],
    outputRange: [0, 0, 0.78, 0.55, 0, 0],
    extrapolate: 'clamp',
  });
  // Brief horizontal vibration on impact
  const tee1Shake = t.interpolate({
    inputRange: [0, 0.090, 0.0975, 0.105, 0.1125, 0.120, 0.1275, 1],
    outputRange: [0, 0, 0.6, -0.5, 0.3, -0.15, 0, 0],
    extrapolate: 'clamp',
  });

  // ─── Tee 2 (right): Beat 2 (0.15–0.30) ───
  const tee2Op = t.interpolate({
    inputRange: [0, 0.165, 0.180, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp',
  });
  // Same two-phase drop pattern for tee 2
  const tee2DropY = t.interpolate({
    inputRange: [0,    0.180, 0.195, 0.210, 0.225, 0.240, 0.265, 1],
    outputRange: [-18, -18,   -17.72, -15.75, -10.4, 0,    7.5,   7.5],
    extrapolate: 'clamp',
  });
  const tee2RingR = t.interpolate({
    inputRange: [0, 0.237, 0.240, 0.249, 0.285, 1],
    outputRange: [0, 0, 3, 14, 26, 26],
    extrapolate: 'clamp',
  });
  const tee2RingOp = t.interpolate({
    inputRange: [0, 0.237, 0.240, 0.249, 0.285, 1],
    outputRange: [0, 0, 0.78, 0.55, 0, 0],
    extrapolate: 'clamp',
  });
  const tee2Shake = t.interpolate({
    inputRange: [0, 0.240, 0.2475, 0.255, 0.2625, 0.270, 0.2775, 1],
    outputRange: [0, 0, 0.6, -0.5, 0.3, -0.15, 0, 0],
    extrapolate: 'clamp',
  });

  // ─── Dimension labels — appear during Beat 3 (0.30–0.45) ───
  const dist10cmOp = t.interpolate({
    inputRange: [0, 0.300, 0.330, 0.435, 0.470, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
  });
  // Upper "ギリギリ通る幅" callout — same timing
  const width2cmOp = t.interpolate({
    inputRange: [0, 0.315, 0.345, 0.435, 0.470, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
  });

  // ─── Putter swing — Beat 4 (0.45–0.85) ───
  const putterOp = t.interpolate({
    inputRange: [0, 0.470, 0.510, 0.810, 0.850, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
  });
  // Timing:
  //   0.510–0.590: address dwell (dy=0)
  //   0.590–0.670: pull back gradually (dy: 0 → 22)
  //   0.670–0.690: hold (dy=22)
  //   0.690–0.710: SNAP forward (dy: 22 → 0) → impact at 0.710
  //   0.710–0.770: follow-through (dy: 0 → -28)
  //   0.770–0.810: hold (dy=-28)
  const putterDy = t.interpolate({
    inputRange: [0, 0.510, 0.590, 0.630, 0.670, 0.690, 0.710, 0.730, 0.770, 0.810, 1],
    outputRange: [0, 0,    0,    9,    22,    22,   0,    -14,   -28,  -28,   -28],
    extrapolate: 'clamp',
  });

  // ─── Ball motion: stays put until impact at 0.710 ───
  const ballY = t.interpolate({
    inputRange: [0, 0.710, 0.730, 0.765, 0.785, 0.800, 1],
    outputRange: [178, 178, 168, 118, 92, 88, 88],
    extrapolate: 'clamp',
  });
  const ballR = t.interpolate({
    inputRange: [0, 0.710, 0.800, 1],
    outputRange: [7, 7, 4, 4],
    extrapolate: 'clamp',
  });
  const ballShadowRy = t.interpolate({
    inputRange: [0, 0.710, 0.800, 1],
    outputRange: [1.8, 1.8, 1.0, 1.0],
    extrapolate: 'clamp',
  });

  // Motion streak (whoosh) during travel
  const ballStreakOp = t.interpolate({
    inputRange: [0, 0.730, 0.745, 0.780, 0.800, 1],
    outputRange: [0, 0, 0.55, 0.40, 0, 0],
    extrapolate: 'clamp',
  });

  // Gate-pass confirmation flash (when ball crosses y=130)
  const gateFlash = t.interpolate({
    inputRange: [0, 0.750, 0.765, 0.795, 0.820, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
  });

  // Success message — upper area, gentle slide-down + fade (Beat 5: 0.85–1.00)
  const successOp = t.interpolate({
    inputRange: [0, 0.850, 0.910, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: 'clamp',
  });
  // Subtle slide-down entrance (no bouncy overshoot)
  const successDy = t.interpolate({
    inputRange: [0, 0.850, 0.910, 1],
    outputRange: [-10, -10, 0, 0],
    extrapolate: 'clamp',
  });

  // Loop fader
  const loopFade = t.interpolate({
    inputRange: [0, 0.030, 0.978, 1],
    outputRange: [0, 1, 1, 0],
  });

  // ─── Tee shape (single-path silhouette, longer + smooth taper) ───
  // Profile: flat cap top → SMOOTH Q curve to shaft (no abrupt angle change) → long
  // gradually tapering shaft → sharp tip. Total height 30 (was 21).
  // Cap width 8 → shaft top width 4 → tip 0. Most of body is the long shaft.
  const teePath = (cx) => `M ${cx - 4} 100 L ${cx + 4} 100 L ${cx + 4} 102 Q ${cx + 3} 105 ${cx + 2} 107 L ${cx + 1} 128 L ${cx} 130 L ${cx - 1} 128 L ${cx - 2} 107 Q ${cx - 3} 105 ${cx - 4} 102 L ${cx - 4} 100 Z`;

  return (
    <View
      style={{ flex: 1, overflow: 'hidden', backgroundColor: '#F7F4ED' }}
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
    >
      <Animated.View style={{
        width: '100%', height: '100%',
        opacity: loopFade,
        transform: [
          { translateX: Animated.multiply(camTxSvg, ratio) },
          { translateY: Animated.multiply(camTySvg, ratio) },
          { scale: camScale },
        ],
      }}>
        <Svg width="100%" height="100%" viewBox="0 0 320 260">
          {/* ClipPath: hide everything below the ground line (y >= 130).
              Used to mask the lower 1/4 of tees that are buried in ground. */}
          <Defs>
            <ClipPath id="aboveGround">
              <Rect x={0} y={0} width={320} height={130} />
            </ClipPath>
          </Defs>

          {/* Pure warm off-white canvas */}
          <Rect x={0} y={0} width={320} height={260} fill="#F7F4ED" />

          {/* Ground line at the gate's depth — subtle but clearly readable on zoom-in */}
          <Line x1={70} y1={130} x2={250} y2={130} stroke="#1F1F1E" strokeWidth={0.5} strokeDasharray="2.5 4" opacity={0.18} />

          {/* "10cm" dimension — vertical line between ball front and gate */}
          <AnimatedG opacity={dist10cmOp}>
            <Line x1={114} y1={130} x2={114} y2={172} stroke="#9A9A92" strokeWidth={0.5} />
            <Line x1={112} y1={130} x2={116} y2={130} stroke="#9A9A92" strokeWidth={0.5} />
            <Line x1={112} y1={172} x2={116} y2={172} stroke="#9A9A92" strokeWidth={0.5} />
            <SvgText x={108} y={154} fontSize={9} fill="#6B6B66" textAnchor="end" fontFamily={FONT.sans} fontWeight="500" letterSpacing="0.2">10cm</SvgText>
          </AnimatedG>

          {/* "ギリギリ通る幅" — large callout in upper empty space, with arrow bracket */}
          <AnimatedG opacity={width2cmOp}>
            {/* Sub-spec (technical reference, smaller) */}
            <SvgText x={160} y={56} fontSize={9} fill="#9A9A92" textAnchor="middle" fontFamily={FONT.sans} fontWeight="500" letterSpacing="0.4">ボール+2cm</SvgText>
            {/* Main label — prominent */}
            <SvgText x={160} y={76} fontSize={14} fill="#1F1F1E" textAnchor="middle" fontFamily={FONT.sans} fontWeight="700" letterSpacing="1">ギリギリ通る幅</SvgText>
            {/* Arrow bracket spanning gate width */}
            <Line x1={150} y1={88} x2={170} y2={88} stroke="#1F1F1E" strokeWidth={0.9} />
            {/* Left arrow head (pointing left) */}
            <Path d="M 150 88 L 153 86 M 150 88 L 153 90" stroke="#1F1F1E" strokeWidth={0.9} fill="none" strokeLinecap="round" />
            {/* Right arrow head (pointing right) */}
            <Path d="M 170 88 L 167 86 M 170 88 L 167 90" stroke="#1F1F1E" strokeWidth={0.9} fill="none" strokeLinecap="round" />
            {/* Connector dashed lines from bracket ends down to tee cap tops */}
            <Line x1={150} y1={91} x2={150} y2={99} stroke="#1F1F1E" strokeWidth={0.5} strokeDasharray="2 2" opacity={0.5} />
            <Line x1={170} y1={91} x2={170} y2={99} stroke="#1F1F1E" strokeWidth={0.5} strokeDasharray="2 2" opacity={0.5} />
          </AnimatedG>

          {/* ─── Tee 1 (left, x=150) — clipped above ground, lower 1/4 buried ─── */}
          {/* Ground shadow (NOT clipped - sits on ground surface) */}
          <AnimatedEllipse cx={150} cy={130.5} rx={2.5} ry={0.7} fill="#1F1F1E"
            opacity={Animated.multiply(tee1Op, 0.22)} />
          {/* Strong insertion shock ring (ブスッと) */}
          <AnimatedCircle cx={150} cy={130} r={tee1RingR} fill="none" stroke="#1F1F1E" strokeWidth={0.8} opacity={tee1RingOp} />
          {/* Tee path clipped to above-ground region */}
          <G clipPath="url(#aboveGround)">
            <AnimatedG x={tee1Shake} y={tee1DropY} opacity={tee1Op}>
              <Path d={teePath(150)} fill="#1F1F1E" strokeLinejoin="round" />
            </AnimatedG>
          </G>

          {/* ─── Tee 2 (right, x=170) — same buried-tee treatment ─── */}
          <AnimatedEllipse cx={170} cy={130.5} rx={2.5} ry={0.7} fill="#1F1F1E"
            opacity={Animated.multiply(tee2Op, 0.22)} />
          <AnimatedCircle cx={170} cy={130} r={tee2RingR} fill="none" stroke="#1F1F1E" strokeWidth={0.8} opacity={tee2RingOp} />
          <G clipPath="url(#aboveGround)">
            <AnimatedG x={tee2Shake} y={tee2DropY} opacity={tee2Op}>
              <Path d={teePath(170)} fill="#1F1F1E" strokeLinejoin="round" />
            </AnimatedG>
          </G>

          {/* ─── Putter — pill head + heel hosel + diagonal shaft (no grip; off-frame) ─── */}
          <AnimatedG opacity={putterOp} y={putterDy}>
            {/* Shadow on ground (prominent) */}
            <Ellipse cx={160} cy={195} rx={20} ry={2.5} fill="#1F1F1E" opacity={0.22} />

            {/* Shaft — diagonal UP-LEFT, exits frame at upper-left
                (RH golfer's hands are off-frame in that direction) */}
            <Line x1={150.5} y1={178.5} x2={75} y2={28} stroke="#7A7A78" strokeWidth={1.6} strokeLinecap="round" />
            <Line x1={151.2} y1={178.5} x2={75.7} y2={28} stroke="#C8C7C0" strokeWidth={0.5} strokeLinecap="round" opacity={0.5} />

            {/* Head — pill shape (rounded ends), wider proportions */}
            <Rect x={142} y={184} width={36} height={8} rx={4} fill="#1F1F1E" />

            {/* Top bevel highlight */}
            <Line x1={146} y1={185} x2={174} y2={185} stroke="#3A3A3A" strokeWidth={0.6} />
            {/* Face highlight (subtle off-white line on top edge) */}
            <Line x1={146} y1={184.3} x2={174} y2={184.3} stroke="#A8A6A0" strokeWidth={0.4} opacity={0.7} />

            {/* Sight line — alignment aid */}
            <Line x1={160} y1={184} x2={160} y2={192} stroke="#FAFAFA" strokeWidth={1.3} />

            {/* Hosel — heel side (LEFT for RH golfer perspective) */}
            <Rect x={149} y={180.5} width={3} height={4} fill="#1F1F1E" />
            {/* Ferrule — white decorative band */}
            <Rect x={148.5} y={179} width={4} height={1.5} fill="#F0EDE5" />
          </AnimatedG>

          {/* Motion streak (whoosh) behind ball — vertical, going up */}
          <AnimatedLine
            x1={160} y1={Animated.add(ballY, 18)}
            x2={160} y2={Animated.add(ballY, 5)}
            stroke="#1F1F1E" strokeWidth={1.2} strokeLinecap="round" strokeDasharray="1.5 2.5"
            opacity={ballStreakOp}
          />

          {/* Ball shadow (under ball, shrinks with ball) */}
          <AnimatedEllipse cx={160} cy={Animated.add(ballY, 5)} rx={ballR} ry={ballShadowRy}
            fill="#1F1F1E" opacity={Animated.multiply(ballOp, 0.18)} />
          {/* Ball */}
          <AnimatedCircle cx={160} cy={ballY} r={ballR}
            fill="#FAFAFA" stroke="#1F1F1E" strokeWidth={0.7} opacity={ballOp} />

          {/* Gate-pass confirmation: small green flash above gate */}
          <AnimatedCircle cx={160} cy={102} r={3} fill="#4A8A5C" opacity={gateFlash} />

          {/* Success message — upper area, horizontal pill: "✓ 5回連続でクリア" */}
          <AnimatedG opacity={successOp} y={successDy}>
            {/* Pill background — clean white with green border */}
            <Rect x={70} y={50} width={180} height={40} rx={20} fill="#FFFFFF" stroke="#4A8A5C" strokeWidth={1.2} />
            {/* Check icon — filled green disc */}
            <Circle cx={98} cy={70} r={10} fill="#4A8A5C" />
            <Path d="M 93 70 L 97 74 L 104 66" stroke="#FFFFFF" strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* Message text */}
            <SvgText x={116} y={76} fontSize={14} fill="#1F1F1E" fontFamily={FONT.sans} fontWeight="700" letterSpacing="0.5">5回連続でクリア</SvgText>
          </AnimatedG>

        </Svg>
      </Animated.View>

      {/* Caption band */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#1F1F1E',
        paddingVertical: 11, paddingHorizontal: 16,
      }}>
        <Animated.Text style={{
          color: '#F7F4ED', fontSize: 13, fontWeight: '500', letterSpacing: 0.1,
          textAlign: 'center',
          opacity: captionFade,
        }}>
          {captions[captionIdx]}
        </Animated.Text>
      </View>
    </View>
  );
}

function TopView({ variant, W, H, ISO_INK, FLAG_RED }) {
  // ─── Animation drivers ───
  const ballProgress = useRef(new Animated.Value(0)).current;   // 0→1 for one ball cycle (2400ms)
  const pendulum = useRef(new Animated.Value(0)).current;       // 0→1 over pendulum period
  const [rep, setRep] = useState(1);

  useEffect(() => {
    ballProgress.setValue(0);
    pendulum.setValue(0);

    // 'gate' uses CinematicGateScene with its own animation; skip default ball loop
    const isBall = ['straight', 'over', 'eyesclosed'].includes(variant);
    const isPendulum = ['metronome', 'onehand'].includes(variant);

    if (isBall) {
      Animated.loop(
        Animated.timing(ballProgress, {
          toValue: 1, duration: 2400, useNativeDriver: false,
          easing: Easing.bezier(0.2, 0.85, 0.2, 1),
        })
      ).start();
    }
    if (isPendulum) {
      Animated.loop(
        Animated.timing(pendulum, {
          toValue: 1, duration: CYCLE_DUR[variant], useNativeDriver: false,
          easing: Easing.inOut(Easing.ease),
        })
      ).start();
    }

    // Rep counter
    const max = DRILL_REPS[variant] || 5;
    setRep(1);
    const dur = CYCLE_DUR[variant] || 2400;
    const iv = setInterval(() => {
      setRep(r => r >= max ? 1 : r + 1);
    }, dur);
    return () => {
      clearInterval(iv);
      ballProgress.stopAnimation();
      pendulum.stopAnimation();
    };
  }, [variant]);

  if (variant === 'gate') {
    return <GateDrillAnimation view="top" />;
  }
  if (variant === 'straight') {
    const ballCx = ballProgress.interpolate({
      inputRange: [0, 0.05, 0.14, 0.85, 0.92, 1],
      outputRange: [60, 63, 78, 255, 263, 265],
    });
    const ballOp = ballProgress.interpolate({
      inputRange: [0, 0.04, 0.06, 0.96, 1], outputRange: [0, 0, 1, 1, 0],
    });
    const shadowOp = ballProgress.interpolate({
      inputRange: [0, 0.13, 0.85, 1], outputRange: [0, 0.55, 0.55, 0],
    });
    const successFlash = ballProgress.interpolate({
      inputRange: [0, 0.85, 0.89, 0.96, 1], outputRange: [0, 0, 1, 1, 0],
    });
    return (
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <IsoBase W={W} H={H} />
        <IsoFlag x={270} y={205} FLAG_RED={FLAG_RED} ISO_INK={ISO_INK} />
        <IsoHole cx={265} cy={205} ISO_INK={ISO_INK} />
        <Line x1={60} x2={260} y1={205} y2={205} stroke="rgba(255,255,255,0.45)" strokeWidth={0.8} strokeDasharray="2 4" />
        <SvgText x={160} y={225} fontSize={9} fill={ISO_INK} textAnchor="middle" fontFamily={FONT.mono}>← 1 m →</SvgText>
        <AnimatedEllipse cx={ballCx} cy={212} rx={6} ry={2} fill="rgba(0,0,0,0.4)" opacity={shadowOp} />
        <AnimatedCircle cx={ballCx} cy={205} r={5} fill="#fff" stroke={ISO_INK} strokeWidth={0.8} opacity={ballOp} />
        {/* Success ✓ at hole when ball arrives */}
        <AnimatedSvgText x={265} y={182} fontSize={14} fill="#5FC48B" textAnchor="middle" fontFamily={FONT.mono} fontWeight="700" opacity={successFlash}>✓</AnimatedSvgText>
        <DataChip text="STRAIGHT · 1m" />
        <RepBadge rep={rep} max={DRILL_REPS.straight} W={W} />
      </Svg>
    );
  }
  if (variant === 'over') {
    // Ball stops past the hole at the +30cm zone
    const ballCx = ballProgress.interpolate({
      inputRange: [0, 0.05, 0.14, 0.7, 0.82, 0.92, 1],
      outputRange: [60, 63, 78, 200, 225, 230, 230],
    });
    const ballOp = ballProgress.interpolate({
      inputRange: [0, 0.04, 0.06, 0.96, 1], outputRange: [0, 0, 1, 1, 0],
    });
    const shadowOp = ballProgress.interpolate({
      inputRange: [0, 0.13, 0.82, 1], outputRange: [0, 0.55, 0.55, 0],
    });
    const zoneFlash = ballProgress.interpolate({
      inputRange: [0, 0.78, 0.82, 0.9, 1], outputRange: [0, 0, 0.7, 0.5, 0],
    });
    return (
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <IsoBase W={W} H={H} />
        <IsoFlag x={205} y={205} FLAG_RED={FLAG_RED} ISO_INK={ISO_INK} />
        <IsoHole cx={195} cy={205} ISO_INK={ISO_INK} />
        <Ellipse cx={230} cy={205} rx={8} ry={3} fill="none" stroke={theme.warn} strokeWidth={1.5} strokeDasharray="3 3" />
        <SvgText x={230} y={188} fontSize={9} fill={theme.warn} textAnchor="middle" fontFamily={FONT.mono} fontWeight="700">+30cm</SvgText>
        {/* Zone flash on success */}
        <AnimatedEllipse cx={230} cy={205} rx={14} ry={6} fill="rgba(95,196,139,0.6)" opacity={zoneFlash} />
        {/* Animated ball + shadow */}
        <AnimatedEllipse cx={ballCx} cy={212} rx={6} ry={2} fill="rgba(0,0,0,0.4)" opacity={shadowOp} />
        <AnimatedCircle cx={ballCx} cy={205} r={5} fill="#fff" stroke={ISO_INK} strokeWidth={0.8} opacity={ballOp} />
        <DataChip text="OVER · 3m + 30cm" />
        <RepBadge rep={rep} max={DRILL_REPS.over} W={W} />
      </Svg>
    );
  }
  if (variant === 'eyesclosed') {
    const ballCx = ballProgress.interpolate({
      inputRange: [0, 0.05, 0.14, 0.7, 0.82, 0.92, 1],
      outputRange: [60, 63, 78, 200, 225, 230, 230],
    });
    const ballOp = ballProgress.interpolate({
      inputRange: [0, 0.04, 0.06, 0.96, 1], outputRange: [0, 0, 1, 1, 0],
    });
    const shadowOp = ballProgress.interpolate({
      inputRange: [0, 0.13, 0.82, 1], outputRange: [0, 0.55, 0.55, 0],
    });
    const zoneFlash = ballProgress.interpolate({
      inputRange: [0, 0.78, 0.82, 0.9, 1], outputRange: [0, 0, 0.6, 0.4, 0],
    });
    // Eye scale: open at start/end, closed (scaleY 0.08) during swing
    const eyeScaleY = ballProgress.interpolate({
      inputRange: [0, 0.08, 0.15, 0.8, 0.9, 1], outputRange: [1, 1, 0.08, 0.08, 1, 1],
    });
    const feelOp = ballProgress.interpolate({
      inputRange: [0, 0.15, 0.2, 0.75, 0.85, 1], outputRange: [0, 0, 1, 1, 0, 0],
    });
    return (
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <IsoBase W={W} H={H} />
        <IsoFlag x={205} y={205} FLAG_RED={FLAG_RED} ISO_INK={ISO_INK} />
        <IsoHole cx={195} cy={205} ISO_INK={ISO_INK} />
        <Ellipse cx={230} cy={205} rx={8} ry={3} fill="none" stroke={theme.warn} strokeWidth={1.5} strokeDasharray="3 3" />
        <AnimatedEllipse cx={230} cy={205} rx={14} ry={6} fill="rgba(95,196,139,0.5)" opacity={zoneFlash} />
        <AnimatedEllipse cx={ballCx} cy={212} rx={6} ry={2} fill="rgba(0,0,0,0.4)" opacity={shadowOp} />
        <AnimatedCircle cx={ballCx} cy={205} r={5} fill="#fff" stroke={ISO_INK} strokeWidth={0.8} opacity={ballOp} />
        {/* Animated eye — opens/closes during swing */}
        <G>
          <Circle cx={54} cy={64} r={28} fill={theme.surface} stroke={ISO_INK} strokeWidth={1.2} />
          {/* closed-eye line under */}
          <Path d="M39 64 Q 54 69 69 64" stroke={ISO_INK} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.4} />
          {/* open eye — scaleY drops to closed during swing */}
          <AnimatedEllipse cx={54} cy={64} rx={16} ry={Animated.multiply(eyeScaleY, 10)} fill="#fff" stroke={ISO_INK} strokeWidth={1.2} />
          <AnimatedCircle cx={54} cy={64} r={Animated.multiply(eyeScaleY, 5.5)} fill={ISO_INK} />
          <SvgText x={54} y={110} fontSize={10} fill={ISO_INK} textAnchor="middle" fontFamily={FONT.mono} fontWeight="600">目を閉じる</SvgText>
          {/* "感覚で打つ" speech bubble — appears while eye is closed */}
          <AnimatedG opacity={feelOp}>
            <Rect x={92} y={54} width={86} height={20} rx={10} fill={ISO_INK} />
            <SvgText x={135} y={68} fontSize={10} fill="#fff" textAnchor="middle" fontFamily={FONT.mono} fontWeight="600">感覚で打つ</SvgText>
          </AnimatedG>
        </G>
        <DataChip text="EYES CLOSED · 3m" />
        <RepBadge rep={rep} max={DRILL_REPS.eyesclosed} W={W} />
      </Svg>
    );
  }
  if (variant === 'metronome') {
    // Pendulum rotation: -18 → +18 → -18 over one cycle (790ms)
    const rotation = pendulum.interpolate({
      inputRange: [0, 0.5, 1], outputRange: [-18, 18, -18],
    });
    // Ball pulses with the rhythm
    const ballScale = pendulum.interpolate({
      inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1],
    });
    // Beat 1 pulse (0% → 100% scale at 0% phase, 0%→100% at 50% phase for beat 2)
    const beat1Scale = pendulum.interpolate({
      inputRange: [0, 0.1, 0.5, 1], outputRange: [1.15, 1, 1, 1.15],
    });
    const beat1Op = pendulum.interpolate({
      inputRange: [0, 0.15, 0.5, 1], outputRange: [1, 0.25, 0.25, 1],
    });
    const beat2Scale = pendulum.interpolate({
      inputRange: [0, 0.5, 0.6, 1], outputRange: [1, 1.15, 1, 1],
    });
    const beat2Op = pendulum.interpolate({
      inputRange: [0, 0.5, 0.65, 1], outputRange: [0.25, 1, 0.25, 0.25],
    });
    return (
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <IsoBase W={W} H={H} />
        {/* Ball pulses with beat */}
        <Ellipse cx={160} cy={217} rx={6} ry={2} fill="rgba(0,0,0,0.28)" />
        <AnimatedCircle cx={160} cy={210} r={Animated.multiply(ballScale, 5)} fill="#fff" stroke={ISO_INK} strokeWidth={0.8} />
        {/* Pendulum club — rotates around hinge at (160, 80) */}
        <AnimatedG rotation={rotation} originX="160" originY="80">
          <Line x1={160} y1={80} x2={160} y2={205} stroke={ISO_INK} strokeWidth={2.2} />
          <Polygon points="150,203 172,203 176,211 154,211" fill={ISO_INK} />
        </AnimatedG>
        {/* Beats */}
        <AnimatedCircle cx={50} cy={95} r={Animated.multiply(beat1Scale, 6)} fill={theme.warn} opacity={beat1Op} />
        <SvgText x={50} y={78} fontSize={9} fill={ISO_INK} textAnchor="middle" fontFamily={FONT.mono} fontWeight="600">BEAT 1</SvgText>
        <SvgText x={50} y={118} fontSize={9} fill={theme.textSec} textAnchor="middle" fontFamily={FONT.mono}>back</SvgText>
        <AnimatedCircle cx={270} cy={95} r={Animated.multiply(beat2Scale, 6)} fill={theme.warn} opacity={beat2Op} />
        <SvgText x={270} y={78} fontSize={9} fill={ISO_INK} textAnchor="middle" fontFamily={FONT.mono} fontWeight="600">BEAT 2</SvgText>
        <SvgText x={270} y={118} fontSize={9} fill={theme.textSec} textAnchor="middle" fontFamily={FONT.mono}>impact</SvgText>
        <DataChip text="METRONOME · ♩=76" />
        <RepBadge rep={rep} max={DRILL_REPS.metronome} W={W} />
      </Svg>
    );
  }
  if (variant === 'onehand') {
    const rotation = pendulum.interpolate({
      inputRange: [0, 0.5, 1], outputRange: [-18, 18, -18],
    });
    return (
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <IsoBase W={W} H={H} />
        <IsoFlag x={270} y={205} FLAG_RED={FLAG_RED} ISO_INK={ISO_INK} />
        <IsoHole cx={265} cy={205} ISO_INK={ISO_INK} />
        <Ellipse cx={160} cy={217} rx={6} ry={2} fill="rgba(0,0,0,0.28)" />
        <Circle cx={160} cy={210} r={5} fill="#fff" stroke={ISO_INK} strokeWidth={0.8} />
        {/* One-hand pendulum (slower swing) */}
        <AnimatedG rotation={rotation} originX="160" originY="70">
          <Line x1={160} y1={70} x2={160} y2={205} stroke={ISO_INK} strokeWidth={2.2} />
          <Polygon points="150,203 172,203 176,211 154,211" fill={ISO_INK} />
        </AnimatedG>
        {/* LH off marker (static) */}
        <G>
          <Circle cx={96} cy={90} r={14} fill="none" stroke="#B23A2A" strokeWidth={1.6} />
          <Line x1={88} y1={82} x2={104} y2={98} stroke="#B23A2A" strokeWidth={1.6} />
          <Line x1={88} y1={98} x2={104} y2={82} stroke="#B23A2A" strokeWidth={1.6} />
          <SvgText x={96} y={122} fontSize={9} fill="#B23A2A" textAnchor="middle" fontFamily={FONT.mono} fontWeight="600">LH OFF</SvgText>
        </G>
        <DataChip text="ONE-HAND" />
        <RepBadge rep={rep} max={DRILL_REPS.onehand} W={W} />
      </Svg>
    );
  }
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <IsoBase W={W} H={H} />
      <DataChip text="DRILL" />
    </Svg>
  );
}

function SetupView({ variant }) {
  const ink = theme.text;
  const sub = theme.textSec;
  const accent = theme.accent;
  if (variant === 'gate') {
    // Same tee silhouette as the animation
    const teeP = (cx) => `M ${cx - 4} 100 L ${cx + 4} 100 L ${cx + 4} 102 Q ${cx + 3} 105 ${cx + 2} 107 L ${cx + 1} 128 L ${cx} 130 L ${cx - 1} 128 L ${cx - 2} 107 Q ${cx - 3} 105 ${cx - 4} 102 L ${cx - 4} 100 Z`;
    return (
      <Svg viewBox="0 0 320 260" width="100%" height="100%">
        <Defs>
          <ClipPath id="setupGate_aboveGround">
            <Rect x={0} y={0} width={320} height={130} />
          </ClipPath>
        </Defs>

        {/* Warm off-white canvas — matches the animation */}
        <Rect x={0} y={0} width={320} height={260} fill="#F7F4ED" />

        {/* Ground line */}
        <Line x1={70} y1={130} x2={250} y2={130} stroke="#1F1F1E" strokeWidth={0.5} strokeDasharray="2.5 4" opacity={0.18} />

        {/* "ギリギリ通る幅" upper callout with arrow bracket */}
        <SvgText x={160} y={56} fontSize={9} fill="#9A9A92" textAnchor="middle" fontFamily={FONT.sans} fontWeight="500" letterSpacing="0.4">ボール+2cm</SvgText>
        <SvgText x={160} y={76} fontSize={14} fill="#1F1F1E" textAnchor="middle" fontFamily={FONT.sans} fontWeight="700" letterSpacing="1">ギリギリ通る幅</SvgText>
        <Line x1={150} y1={88} x2={170} y2={88} stroke="#1F1F1E" strokeWidth={0.9} />
        <Path d="M 150 88 L 153 86 M 150 88 L 153 90" stroke="#1F1F1E" strokeWidth={0.9} fill="none" strokeLinecap="round" />
        <Path d="M 170 88 L 167 86 M 170 88 L 167 90" stroke="#1F1F1E" strokeWidth={0.9} fill="none" strokeLinecap="round" />
        <Line x1={150} y1={91} x2={150} y2={99} stroke="#1F1F1E" strokeWidth={0.5} strokeDasharray="2 2" opacity={0.5} />
        <Line x1={170} y1={91} x2={170} y2={99} stroke="#1F1F1E" strokeWidth={0.5} strokeDasharray="2 2" opacity={0.5} />

        {/* Tee 1 (left) — buried 1/4 in ground (clipped below y=130) */}
        <Ellipse cx={150} cy={130.5} rx={2.5} ry={0.7} fill="#1F1F1E" opacity={0.22} />
        <G clipPath="url(#setupGate_aboveGround)">
          <G transform="translate(0 7.5)">
            <Path d={teeP(150)} fill="#1F1F1E" strokeLinejoin="round" />
          </G>
        </G>

        {/* Tee 2 (right) — same buried treatment */}
        <Ellipse cx={170} cy={130.5} rx={2.5} ry={0.7} fill="#1F1F1E" opacity={0.22} />
        <G clipPath="url(#setupGate_aboveGround)">
          <G transform="translate(0 7.5)">
            <Path d={teeP(170)} fill="#1F1F1E" strokeLinejoin="round" />
          </G>
        </G>

        {/* "10cm" dimension between ball and gate */}
        <Line x1={114} y1={130} x2={114} y2={172} stroke="#9A9A92" strokeWidth={0.5} />
        <Line x1={112} y1={130} x2={116} y2={130} stroke="#9A9A92" strokeWidth={0.5} />
        <Line x1={112} y1={172} x2={116} y2={172} stroke="#9A9A92" strokeWidth={0.5} />
        <SvgText x={108} y={154} fontSize={9} fill="#6B6B66" textAnchor="end" fontFamily={FONT.sans} fontWeight="500" letterSpacing="0.2">10cm</SvgText>

        {/* Ball — same style as animation */}
        <Ellipse cx={160} cy={183} rx={7} ry={1.8} fill="#1F1F1E" opacity={0.18} />
        <Circle cx={160} cy={178} r={7} fill="#FAFAFA" stroke="#1F1F1E" strokeWidth={0.7} />
        <SvgText x={160} y={208} fontSize={10} fill="#6B6B66" textAnchor="middle" fontFamily={FONT.sans} fontWeight="500" letterSpacing="0.4">ボール</SvgText>
      </Svg>
    );
  }
  if (variant === 'straight') {
    return (
      <Svg viewBox="0 0 320 260" width="100%" height="100%">
        <Rect x={0} y={0} width={320} height={260} fill="#DCEBE2" />
        <SvgText x={160} y={24} fontSize={11} fill={sub} textAnchor="middle" fontFamily={FONT.mono}>真っ平らな 1m</SvgText>
        <Rect x={40} y={120} width={240} height={20} rx={3} fill="#fff" stroke={theme.border} />
        <Circle cx={160} cy={130} r={6} fill="#7FBF8F" stroke="#2F7D4A" />
        <SvgText x={160} y={166} fontSize={10} fill={sub} textAnchor="middle">水準器で確認</SvgText>
        <Circle cx={60} cy={200} r={10} fill="#fff" stroke="#000" opacity={0.8} />
        <Ellipse cx={260} cy={200} rx={10} ry={4} fill="#111" opacity={0.75} />
        <Line x1={75} y1={200} x2={245} y2={200} stroke={ink} strokeWidth={1} strokeDasharray="3 3" />
        <SvgText x={160} y={218} fontSize={11} fill={ink} textAnchor="middle" fontWeight="700">1m</SvgText>
      </Svg>
    );
  }
  if (variant === 'over') {
    return (
      <Svg viewBox="0 0 320 260" width="100%" height="100%">
        <Rect x={0} y={0} width={320} height={260} fill="#DCEBE2" />
        <SvgText x={160} y={24} fontSize={11} fill={sub} textAnchor="middle" fontFamily={FONT.mono}>仮想カップ + 目印</SvgText>
        <Circle cx={50} cy={150} r={11} fill="#fff" stroke="#000" opacity={0.8} />
        <SvgText x={50} y={182} fontSize={10} fill={sub} textAnchor="middle">スタート</SvgText>
        <Rect x={200} y={124} width={3} height={30} fill={accent} />
        <Circle cx={201.5} cy={122} r={4} fill={accent} />
        <SvgText x={201} y={172} fontSize={10} fill={ink} textAnchor="middle" fontWeight="600">カップ</SvgText>
        <Rect x={248} y={124} width={3} height={30} fill={theme.warn} />
        <Circle cx={249.5} cy={122} r={4} fill={theme.warn} />
        <SvgText x={249} y={172} fontSize={10} fill={theme.warn} textAnchor="middle" fontWeight="600">+30cm</SvgText>
        <Line x1={60} y1={150} x2={200} y2={150} stroke={ink} strokeWidth={1} />
        <SvgText x={130} y={142} fontSize={10} fill={ink} textAnchor="middle">3m</SvgText>
      </Svg>
    );
  }
  // default simple
  return (
    <Svg viewBox="0 0 320 260" width="100%" height="100%">
      <Rect x={0} y={0} width={320} height={260} fill={theme.surfaceAlt} />
      <SvgText x={160} y={130} fontSize={11} fill={theme.textSec} textAnchor="middle" fontFamily={FONT.mono}>セットアップ図</SvgText>
    </Svg>
  );
}

// ─── Main screen ───
export default function DrillDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const drillId = route.params?.drillId;
  const drill = getDrillDetail(drillId);

  const [view, setView] = useState('top');
  const [tab, setTab] = useState('steps');
  const [favActive, setFavActive] = useState(false);

  useEffect(() => {
    isFavorite(drillId).then(setFavActive);
  }, [drillId]);
  const onToggleFav = async () => {
    const now = await toggleFavorite(drillId);
    setFavActive(now);
  };

  if (!drill) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 40 }}>
        <Text style={{ color: theme.text }}>ドリルデータがありません</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 20, padding: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 6 }}>
          <Text style={{ color: theme.text, textAlign: 'center' }}>戻る</Text>
        </Pressable>
      </View>
    );
  }

  const tabs = [
    { k: 'steps',    label: '手順', count: drill.steps?.length || 0 },
    { k: 'mistakes', label: 'ミス', count: drill.mistakes?.length || 0 },
    { k: 'check',    label: 'チェック', count: drill.checkpoints?.length || 0 },
  ].filter(t => t.count > 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Title */}
        <View style={styles.titleWrap}>
          <View style={styles.pillRow}>
            <View style={styles.pill}><Text style={styles.pillText}>{drill.condition}</Text></View>
            <Text style={styles.time}>{drill.time}</Text>
            {drill.equipment?.length > 0 && (
              <Text style={styles.equipment}>· {drill.equipment.join(' / ')}</Text>
            )}
            <View style={{ flex: 1 }} />
            <Pressable onPress={onToggleFav} hitSlop={10} style={styles.favIconBtn}>
              <Svg width={20} height={20} viewBox="0 0 16 16" fill={favActive ? theme.warn : 'none'}>
                <Path d="M8 13.5s-5.5-3.2-5.5-7.2c0-2 1.5-3.3 3.2-3.3 1.1 0 2 .6 2.3 1.5.3-.9 1.2-1.5 2.3-1.5 1.7 0 3.2 1.3 3.2 3.3 0 4-5.5 7.2-5.5 7.2z"
                  stroke={favActive ? theme.warn : theme.textSec} strokeWidth={1.3} strokeLinejoin="round" />
              </Svg>
            </Pressable>
          </View>
          <Text style={styles.name}>{drill.name}</Text>
          {drill.purpose && <Text style={styles.purpose}>{drill.purpose}</Text>}
        </View>

        {/* Diagram */}
        {drill.setup === 'gate' ? (
          /* gate は静止画カルーセル（5ステップ） */
          <GateCarousel />
        ) : (
          <View style={styles.diagramWrap}>
            <View style={[
              styles.diagramBody,
              drill.setup === 'over'  && { aspectRatio: 720 / 800 },
              drill.setup === 'swing' && { aspectRatio: 720 / 800 },
            ]}>
              <DrillDiagram variant={drill.setup} view={view} />
            </View>

            {/* View toggle */}
            <View style={styles.viewToggle}>
              {[{ k: 'top', label: '俯瞰' }, { k: 'setup', label: 'セットアップ' }].map(t => {
                const on = view === t.k;
                return (
                  <Pressable key={t.k} onPress={() => setView(t.k)} style={[styles.vtBtn, on && styles.vtBtnOn, t.k === 'top' && { borderRightWidth: 1, borderRightColor: theme.border }]}>
                    <Text style={[styles.vtText, on && { color: theme.text, fontWeight: '700' }]}>{t.label}ビュー</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Tabs */}
        {tabs.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
            <View style={styles.tabRow}>
              {tabs.map(t => {
                const on = tab === t.k;
                return (
                  <Pressable key={t.k} onPress={() => setTab(t.k)} style={[styles.tabBtn, on && styles.tabBtnOn]}>
                    <Text style={[styles.tabText, on && { color: theme.text, fontWeight: '700' }]}>{t.label}</Text>
                    <Text style={[styles.tabCount, on && { color: theme.textSec }]}>{t.count}</Text>
                  </Pressable>
                );
              })}
            </View>

            {tab === 'steps' && (
              <View style={{ gap: 10 }}>
                {drill.steps.map(s => (
                  <View key={s.n} style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>{s.n}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stepTitle}>{s.t}</Text>
                      <Text style={styles.stepDesc}>{s.d}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {tab === 'mistakes' && (
              <View style={{ gap: 8 }}>
                {drill.mistakes.map((m, i) => (
                  <View key={i} style={styles.mistakeRow}>
                    <View style={styles.mistakeX}><Text style={styles.mistakeXText}>×</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mistakeTitle}>{m.t}</Text>
                      <Text style={styles.mistakeDesc}>{m.d}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {tab === 'check' && (
              <View style={{ gap: 8 }}>
                {drill.checkpoints.map((c, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={styles.checkBox}>
                      <Svg width={10} height={10} viewBox="0 0 12 12">
                        <Path d="M2 6 L 5 9 L 10 3" stroke={theme.good} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    </View>
                    <Text style={styles.checkText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border }}>
        <View style={styles.footer}>
          <Pressable
            onPress={() => navigation.navigate('DrillTest', { challengeKey: route.params?.challengeKey, drillId, mode: 'drill' })}
            style={styles.testBtn}
          >
            <Text style={styles.testBtnText}>このドリルをテスト →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  titleWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  pill: { backgroundColor: theme.text, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { color: theme.bg, fontFamily: FONT.mono, fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  favIconBtn: { padding: 2 },
  time: { fontFamily: FONT.mono, fontSize: 10.5, color: theme.textSec, letterSpacing: 0.3 },
  equipment: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, marginLeft: 4, letterSpacing: 0.3 },
  name: { fontSize: 20, fontWeight: '700', color: theme.text, letterSpacing: -0.4, lineHeight: 26 },
  purpose: { fontSize: 12, color: theme.textSec, marginTop: 4, lineHeight: 18 },
  // Diagram
  diagramWrap: { marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 8, overflow: 'hidden', backgroundColor: theme.surface },
  diagramBody: { aspectRatio: 320 / 260, backgroundColor: theme.surfaceAlt },
  // gate carousel
  gateCarouselWrap: { marginBottom: 14 },
  gateSlide: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  gateDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6 },
  gateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.border },
  gateDotActive: { backgroundColor: theme.text, width: 18 },
  gateHint: { textAlign: 'center', fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.6, marginTop: 6 },
  narration: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface },
  narrNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.text, alignItems: 'center', justifyContent: 'center' },
  narrNumText: { color: theme.bg, fontFamily: FONT.mono, fontSize: 12, fontWeight: '700' },
  narrTitle: { fontSize: 12.5, fontWeight: '600', color: theme.text, letterSpacing: -0.1 },
  narrDesc: { fontSize: 11, color: theme.textSec, marginTop: 2, lineHeight: 16 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.border },
  viewToggle: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.border },
  vtBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: 'transparent' },
  vtBtnOn: { backgroundColor: theme.surface },
  vtText: { fontSize: 11.5, color: theme.textSec, fontWeight: '600' },
  // Pass
  passCard: { marginHorizontal: 16, marginBottom: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  passStar: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.text, alignItems: 'center', justifyContent: 'center' },
  passStarText: { color: theme.bg, fontSize: 14 },
  passLabel: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 0.8, fontWeight: '700', color: theme.textTer },
  passText: { fontSize: 13, fontWeight: '700', color: theme.text, marginTop: 2 },
  passSub: { fontSize: 11, color: theme.textSec, marginTop: 2 },
  // Tabs
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 10 },
  tabBtn: { flex: 1, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnOn: { borderBottomColor: theme.text },
  tabText: { fontSize: 12.5, color: theme.textSec, fontWeight: '500' },
  tabCount: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer },
  // Steps tab
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.text, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { color: theme.bg, fontFamily: FONT.mono, fontSize: 11, fontWeight: '700' },
  stepTitle: { fontSize: 13, fontWeight: '700', color: theme.text, letterSpacing: -0.1 },
  stepDesc: { fontSize: 12, color: theme.textSec, marginTop: 2, lineHeight: 18 },
  // Mistakes tab
  mistakeRow: { flexDirection: 'row', gap: 10, padding: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.surface },
  mistakeX: { width: 18, height: 18, borderRadius: 4, backgroundColor: 'rgba(178,58,42,0.1)', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  mistakeXText: { color: theme.warn, fontSize: 11, fontWeight: '700' },
  mistakeTitle: { fontSize: 12.5, fontWeight: '700', color: theme.text },
  mistakeDesc: { fontSize: 11.5, color: theme.textSec, marginTop: 2, lineHeight: 17 },
  // Check tab
  checkBox: { width: 16, height: 16, borderRadius: 4, backgroundColor: 'rgba(47,125,74,0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkText: { flex: 1, fontSize: 12.5, color: theme.text, lineHeight: 19 },
  // Footer
  footer: { paddingHorizontal: 16, paddingVertical: 12 },
  testBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', backgroundColor: theme.text },
  testBtnText: { color: theme.bg, fontSize: 14, fontWeight: '700' },
});

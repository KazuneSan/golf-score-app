/**
 * GateDrillAnimation.js  (React Native)
 * ─────────────────────────────────────────────────────────────
 * ゲートドリル(1m パットの方向性練習)のシネマティックアニメーション。
 *
 * このファイルは "ゲートドリル固有のシーン構築" のみを持つ。
 * 共通のプリミティブ・テーマ・タイムラインは
 *   ./drillPrimitives.js
 * に集約されている。新しいドリルを作るときも drillPrimitives から
 * import すること(GateDrillAnimation からは import しない)。
 *
 * Props
 * ─────────────────────────────────────────────────────────────
 *   view         'top' | 'setup'           default 'top'
 *   duration     seconds per loop          default 11
 *   autoPlay     start playing on mount    default true
 *   loop         restart when finished     default true
 *   paused       freeze the timeline       default false
 *   seekTo       seconds — controlled mode (overrides internal time)
 *   onPhase      (phaseIndex) => void      fires when phase changes
 *   theme        partial theme overrides
 *   goalCount    target streak (e.g. 5)    default 5
 *   showCaption  black caption bar overlay default true
 *   captions     string[] of length 4      default Japanese captions
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Rect, Circle, Ellipse, Line, Path } from 'react-native-svg';
import {
  CANVAS_W as W, CANVAS_H as H, BALL_R, DEFAULT_THEME,
  easing, clamp, useDrillTimeline,
  GolfTee, GolfBallTopDown, MalletPutter,
  DimensionLabel, StreakHUD, CheckBadge,
  CaptionOverlay,
} from './drillPrimitives';
import { Text as SvgText } from 'react-native-svg';

// ─────────────────────────────────────────────────────────────────────────
// ゲートドリル固有の幾何配置
// ─────────────────────────────────────────────────────────────────────────
const CX = 360;
const SETUP_Y = 560;
const GATE_Y  = 320;
const GATE_GAP = BALL_R * 2 + 12;  // ボール + 数 mm のクリアランス
const MARKER_W = 18;
const MARKER_LX = CX - GATE_GAP / 2 - MARKER_W / 2;
const MARKER_RX = CX + GATE_GAP / 2 + MARKER_W / 2;

// フェーズ境界 (秒、ループ開始からの相対時刻)
function phaseOf(time) {
  if (time < 2.6) return 0; // build gate
  if (time < 4.4) return 1; // place ball
  if (time < 5.6) return 2; // address & swing
  return 3;                 // roll, pass, streak
}

const DEFAULT_CAPTIONS = [
  'ボールの 10cm 先に ティー2本でゲートをつくる',
  'ボールをセットする',
  'スクエアフェースで 真っ直ぐ振る',
  'ティーに触れず 5回連続で通過 → クリア',
];

// ─────────────────────────────────────────────────────────────────────────
// ゲート幅ラベル (ゲートドリル専用 — 「ボールがギリギリ通る幅」コールアウト)
// ─────────────────────────────────────────────────────────────────────────
function GateWidthLabel({ opacity, theme }) {
  const innerL = MARKER_LX + MARKER_W / 2;
  const innerR = MARKER_RX - MARKER_W / 2;
  const ballL  = CX - BALL_R;
  const ballR  = CX + BALL_R;
  const y = GATE_Y;
  return (
    <G opacity={opacity}>
      <Circle cx={CX} cy={y} r={BALL_R}
        fill="rgba(255,255,255,0.55)"
        stroke={theme.ink} strokeWidth={1.6}
        strokeDasharray="4 4" opacity={0.85} />
      <G stroke={theme.accent} strokeLinecap="round">
        <Line x1={innerL} y1={y} x2={ballL} y2={y} strokeWidth={2.2} />
        <Line x1={innerL} y1={y - 5} x2={innerL} y2={y + 5} strokeWidth={2.2} />
        <Line x1={ballL}  y1={y - 5} x2={ballL}  y2={y + 5} strokeWidth={2.2} />
        <Line x1={ballR}  y1={y} x2={innerR} y2={y} strokeWidth={2.2} />
        <Line x1={innerR} y1={y - 5} x2={innerR} y2={y + 5} strokeWidth={2.2} />
        <Line x1={ballR}  y1={y - 5} x2={ballR}  y2={y + 5} strokeWidth={2.2} />
      </G>
      <G transform={`translate(${CX}, ${y + BALL_R + 42})`}>
        <Line x1={0} y1={-20} x2={0} y2={-(BALL_R + 22)}
          stroke={theme.accent} strokeWidth={1.6} strokeDasharray="2 3" />
        <Rect x={-128} y={-22} width={256} height={44} rx={22} fill={theme.accent} />
        <SvgText x={0} y={-2} textAnchor="middle"
          fontSize={15} fontWeight="800" fill={theme.bg}
          fontFamily={theme.fontJa}>ボールがギリギリ通る幅</SvgText>
        <SvgText x={0} y={14} textAnchor="middle"
          fontFamily={theme.fontEn}
          fontSize={9} fontWeight="700" fill={theme.bg}
          opacity={0.85}>BALL ⌀ + few mm</SvgText>
      </G>
    </G>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 俯瞰シーン
// ─────────────────────────────────────────────────────────────────────────
function TopDownScene({ time, theme, goalCount }) {
  const distP =
    easing.easeOutCubic(clamp((time - 1.0) / 0.7, 0, 1)) *
    (1 - clamp((time - 2.6) / 0.4, 0, 1));
  const markerL = clamp((time - 0.6) / 0.5, 0, 1);
  const markerR = clamp((time - 1.0) / 0.5, 0, 1);
  const gateLabel =
    clamp((time - 1.8) / 0.5, 0, 1) *
    (1 - clamp((time - 3.2) / 0.5, 0, 1));
  const ballEntry = clamp((time - 2.7) / 0.5, 0, 1);

  const T_PUT_IN = 3.4, T_PUT_SET = 4.3;
  const T_BACK_S = 4.5, T_BACK_E = 5.2, T_IMPACT = 5.55;
  let swing = 0;
  if (time >= T_BACK_S && time < T_BACK_E) {
    swing = -easing.easeOutQuad((time - T_BACK_S) / (T_BACK_E - T_BACK_S));
  } else if (time >= T_BACK_E && time < T_IMPACT) {
    swing = -1 + easing.easeInQuad((time - T_BACK_E) / (T_IMPACT - T_BACK_E)) * 2;
  } else if (time >= T_IMPACT) {
    swing = 1 - clamp((time - T_IMPACT) / 0.5, 0, 1) * 1.5;
  }

  const addressY = SETUP_Y + BALL_R + 6;
  let faceY;
  if (time < T_PUT_IN) {
    faceY = H + 80;
  } else if (time < T_PUT_SET) {
    const p = (time - T_PUT_IN) / (T_PUT_SET - T_PUT_IN);
    faceY = (H + 80) + (addressY - (H + 80)) * easing.easeOutCubic(p);
  } else {
    const back = swing < 0 ? -swing * 60 : 0;
    const fwd  = swing > 0 ?  swing * 36 : 0;
    faceY = addressY + back - fwd;
  }
  const putterOp =
    clamp((time - T_PUT_IN) / 0.3, 0, 1) *
    (1 - clamp((time - (T_IMPACT + 0.7)) / 0.5, 0, 1));

  const T_OFF = 7.3;
  let ballY = SETUP_Y, rolled = 0;
  if (time >= T_IMPACT) {
    const p = clamp((time - T_IMPACT) / (T_OFF - T_IMPACT), 0, 1);
    const eased = easing.easeOutCubic(p);
    ballY = SETUP_Y - eased * (SETUP_Y + 80);
    rolled = SETUP_Y - ballY;
  }
  const ballVisible = time >= 2.7 && time < T_OFF;

  const T_PASS = T_IMPACT + 0.32;
  const passLocal = time - T_PASS;
  const passRing = passLocal >= 0 && passLocal < 1.4 ? clamp(passLocal / 0.4, 0, 1) : 0;
  const passFade = passLocal >= 0 ? clamp(1 - (passLocal - 0.6) / 0.7, 0, 1) : 0;

  const streakFill = time > T_PASS + 0.4 && time < 10.6 ? 1 : 0;
  const loopFade = clamp((time - 10.4) / 0.6, 0, 1);

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <Rect x={0} y={0} width={W} height={H} fill={theme.bg} />

      {/* ターゲットライン */}
      <Line x1={CX} y1={120} x2={CX} y2={H - 20}
        stroke={theme.inkSoft} strokeWidth={2}
        strokeDasharray="6 10" strokeLinecap="round" />

      {distP > 0.01 && (
        <DimensionLabel
          xLine={CX - 90}
          yTop={GATE_Y + 4}
          yBot={SETUP_Y - BALL_R - 4}
          extLeft={CX - BALL_R - 8}
          extRight={CX - 30}
          opacity={distP} theme={theme} />
      )}

      <GolfTee x={MARKER_LX} y={GATE_Y} progress={markerL} theme={theme} />
      <GolfTee x={MARKER_RX} y={GATE_Y} progress={markerR} theme={theme} />

      {gateLabel > 0.05 && <GateWidthLabel opacity={gateLabel} theme={theme} />}

      <MalletPutter cx={CX} faceY={faceY} opacity={putterOp} theme={theme} />

      {ballVisible && (
        <GolfBallTopDown x={CX} y={ballY} rolled={rolled} entry={ballEntry} theme={theme} />
      )}

      {passRing > 0 && (
        <G opacity={passFade}>
          <Circle cx={CX} cy={GATE_Y} r={60 + passRing * 70}
            stroke={theme.success} strokeWidth={3.5} fill="none"
            opacity={(1 - passRing) * 0.9} />
          {passLocal > 0.18 && (
            <CheckBadge x={CX + 110} y={GATE_Y - 80}
              opacity={clamp((passLocal - 0.18) / 0.25, 0, 1)}
              theme={theme} />
          )}
        </G>
      )}

      <StreakHUD
        filled={streakFill}
        goal={goalCount}
        justPassed={time > T_PASS + 0.4 && time < T_PASS + 1.4}
        label={`${goalCount}回連続でクリア`}
        theme={theme} />

      {loopFade > 0 && (
        <Rect x={0} y={0} width={W} height={H} fill={theme.bg} opacity={loopFade} />
      )}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// セットアップ (後方視点) シーン
// ─────────────────────────────────────────────────────────────────────────
function SetupScene({ time, theme, goalCount }) {
  const VX = CX, VY = 160;
  const groundY = 560;
  const markerL = clamp((time - 0.6) / 0.5, 0, 1);
  const markerR = clamp((time - 1.0) / 0.5, 0, 1);
  const ballEntry = clamp((time - 2.7) / 0.5, 0, 1);

  const T_BACK_S = 4.5, T_BACK_E = 5.2, T_IMPACT = 5.55;
  let swing = 0;
  if (time >= T_BACK_S && time < T_BACK_E) {
    swing = -easing.easeOutQuad((time - T_BACK_S) / (T_BACK_E - T_BACK_S));
  } else if (time >= T_BACK_E && time < T_IMPACT) {
    swing = -1 + easing.easeInQuad((time - T_BACK_E) / (T_IMPACT - T_BACK_E)) * 2;
  } else if (time >= T_IMPACT) {
    swing = 1 - clamp((time - T_IMPACT) / 0.5, 0, 1) * 1.5;
  }

  const ballX0 = CX, ballY0 = 700;
  const T_OFF = 7.3;
  let ballX = ballX0, ballY = ballY0, ballScale = 1;
  if (time >= T_IMPACT) {
    const p = clamp((time - T_IMPACT) / (T_OFF - T_IMPACT), 0, 1);
    const eased = easing.easeOutCubic(p);
    ballX = ballX0 + (VX - ballX0) * eased;
    ballY = ballY0 + (VY - ballY0) * eased;
    ballScale = 1 - eased * 0.85;
  }
  const ballVisible = time >= 2.7 && time < T_OFF;

  const T_PUT_IN = 3.4, T_PUT_SET = 4.3;
  const ADDRESS_Y = 760;
  let putterY = 880;
  if (time >= T_PUT_IN && time < T_PUT_SET) {
    const p = (time - T_PUT_IN) / (T_PUT_SET - T_PUT_IN);
    putterY = 880 + (ADDRESS_Y - 880) * easing.easeOutCubic(p);
  } else if (time >= T_PUT_SET) {
    putterY = ADDRESS_Y + (-swing) * 24;
  }
  const putterOp =
    clamp((time - T_PUT_IN) / 0.3, 0, 1) *
    (1 - clamp((time - (T_IMPACT + 0.7)) / 0.5, 0, 1));

  const T_PASS = T_IMPACT + 0.32;
  const passLocal = time - T_PASS;
  const passShow = passLocal >= 0 && passLocal < 1.3;
  const passFade = passLocal >= 0 ? clamp(1 - (passLocal - 0.7) / 0.6, 0, 1) : 0;
  const streakFill = time > T_PASS + 0.4 && time < 10.6 ? 1 : 0;
  const loopFade = clamp((time - 10.4) / 0.6, 0, 1);

  const putterW = 220, putterH = 36;
  const rot = swing * 4;

  const teeH_L = 130 * easing.easeOutBack(clamp(markerL, 0, 1));
  const teeH_R = 130 * easing.easeOutBack(clamp(markerR, 0, 1));

  const bR = BALL_R * ballScale;

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <Rect x={0} y={0} width={W} height={H} fill={theme.bg} />

      {/* パース線 */}
      <Line x1={CX - 6} y1={VY + 30} x2={CX - 240} y2={H - 20}
        stroke={theme.inkFaint} strokeWidth={1.4} strokeDasharray="5 6" />
      <Line x1={CX + 6} y1={VY + 30} x2={CX + 240} y2={H - 20}
        stroke={theme.inkFaint} strokeWidth={1.4} strokeDasharray="5 6" />
      <Line x1={CX} y1={VY + 4} x2={CX} y2={H - 20}
        stroke={theme.inkSoft} strokeWidth={2.5}
        strokeDasharray="8 10" strokeLinecap="round" />

      {/* ティー 左 */}
      {markerL > 0 && (
        <G>
          <Ellipse cx={CX - 70 + 4} cy={groundY + 6} rx={14 * markerL} ry={3 * markerL}
            fill={theme.ink} opacity={0.25} />
          <Line x1={CX - 70} y1={groundY} x2={CX - 70} y2={groundY - teeH_L}
            stroke={theme.ink} strokeWidth={3.5} strokeLinecap="round" />
          {markerL > 0.7 && (
            <G>
              <Rect x={CX - 70 - 9} y={groundY - teeH_L - 12} width={18} height={14} rx={2.5}
                fill={theme.gateFill} stroke={theme.ink} strokeWidth={2} />
              <Ellipse cx={CX - 70} cy={groundY - teeH_L - 9} rx={5} ry={1.6}
                fill={theme.ink} opacity={0.5} />
            </G>
          )}
        </G>
      )}

      {/* ティー 右 */}
      {markerR > 0 && (
        <G>
          <Ellipse cx={CX + 70 + 4} cy={groundY + 6} rx={14 * markerR} ry={3 * markerR}
            fill={theme.ink} opacity={0.25} />
          <Line x1={CX + 70} y1={groundY} x2={CX + 70} y2={groundY - teeH_R}
            stroke={theme.ink} strokeWidth={3.5} strokeLinecap="round" />
          {markerR > 0.7 && (
            <G>
              <Rect x={CX + 70 - 9} y={groundY - teeH_R - 12} width={18} height={14} rx={2.5}
                fill={theme.gateFill} stroke={theme.ink} strokeWidth={2} />
              <Ellipse cx={CX + 70} cy={groundY - teeH_R - 9} rx={5} ry={1.6}
                fill={theme.ink} opacity={0.5} />
            </G>
          )}
        </G>
      )}

      {/* パター */}
      {putterOp > 0.01 && (
        <G transform={`translate(${CX}, ${putterY}) rotate(${rot})`} opacity={putterOp}>
          <Ellipse cx={4} cy={putterH * 0.7 + 4} rx={putterW * 0.5} ry={6}
            fill={theme.ink} opacity={0.35} />
          <Rect x={-putterW / 2} y={-putterH / 2} width={putterW} height={putterH}
            rx={putterH / 2 - 4} fill="#0d0d0e" />
          <Rect x={-putterW / 2 + 8} y={-putterH / 2 + 3} width={putterW - 16} height={3}
            rx={1.5} fill="rgba(255,255,255,0.5)" />
          <Rect x={-2.5} y={-putterH / 2 + 8} width={5} height={putterH - 16}
            fill={theme.putterRed} rx={2} />
          <Circle cx={-putterW * 0.28} cy={2} r={4} fill="#f3eedf" />
          <Circle cx={putterW * 0.28}  cy={2} r={4} fill="#f3eedf" />
          <Line x1={0} y1={-putterH / 2 - 2} x2={-40} y2={-380}
            stroke={theme.ink} strokeWidth={8} strokeLinecap="round" />
        </G>
      )}

      {/* ボール */}
      {ballVisible && (
        <G transform={`translate(${ballX}, ${ballY}) scale(${clamp(ballEntry, 0, 1) < 1 ? 0.4 + 0.6 * easing.easeOutBack(clamp(ballEntry, 0, 1)) : 1})`}>
          <Ellipse cx={2} cy={bR * 0.6} rx={bR * 0.9} ry={bR * 0.25}
            fill={theme.ink} opacity={0.32} />
          <Circle cx={0} cy={0} r={bR} fill="#f6f1e2"
            stroke={theme.ink} strokeWidth={1.6} />
          <Ellipse cx={-bR * 0.36} cy={-bR * 0.42} rx={bR * 0.22} ry={bR * 0.11}
            fill="rgba(255,255,255,0.85)" />
        </G>
      )}

      {/* 通過フラッシュ */}
      {passShow && (
        <G opacity={passFade}>
          <Ellipse cx={CX} cy={520} rx={120} ry={20}
            fill="none" stroke={theme.success} strokeWidth={3} opacity={0.85} />
          {passLocal > 0.2 && (
            <CheckBadge x={CX + 110} y={groundY - 80}
              opacity={clamp((passLocal - 0.2) / 0.25, 0, 1)} theme={theme} />
          )}
        </G>
      )}

      <StreakHUD
        filled={streakFill}
        goal={goalCount}
        justPassed={time > T_PASS + 0.4 && time < T_PASS + 1.4}
        label={`${goalCount}回連続でクリア`}
        theme={theme} />

      {loopFade > 0 && (
        <Rect x={0} y={0} width={W} height={H} fill={theme.bg} opacity={loopFade} />
      )}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Default export
// ─────────────────────────────────────────────────────────────────────────
export default function GateDrillAnimation({
  view = 'top',
  duration = 11,
  autoPlay = true,
  loop = true,
  paused = false,
  seekTo = null,
  onPhase,
  theme: themeOverride,
  goalCount = 5,
  showCaption = true,
  captions = DEFAULT_CAPTIONS,
}) {
  const theme = useMemo(
    () => ({ ...DEFAULT_THEME, ...(themeOverride || {}) }),
    [themeOverride],
  );

  const { time, phase } = useDrillTimeline({
    duration, autoPlay, loop, paused, seekTo, phaseOf, onPhase,
  });

  const Scene = view === 'setup' ? SetupScene : TopDownScene;

  return (
    <View style={styles.container}>
      <Scene time={time} theme={theme} goalCount={goalCount} />
      {showCaption && (
        <CaptionOverlay phase={phase} totalPhases={4}
          captions={captions} theme={theme} />
      )}
    </View>
  );
}

export { phaseOf };

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
});

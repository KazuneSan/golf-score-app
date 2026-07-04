/**
 * SwingDrillAnimation.js  (React Native) — v2
 * ─────────────────────────────────────────────────────────────
 * 'swing' setup バリアント: 横視点でクラブ+ボールのみ表示。
 * 棒人間なし。
 *
 * 3つのインパクトパターンをループ:
 *   Phase 0 — アドレス
 *   Phase 1 — トップ : クラブヘッドがボールより高い位置を通過
 *   Phase 2 — ダフり : ボール手前の地面を叩く
 *   Phase 3 — クリーン: 正しいインパクト → 飛翔
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Rect, Circle, Ellipse, Line, Path } from 'react-native-svg';
import { Text as SvgText } from 'react-native-svg';
import {
  CANVAS_W as W, CANVAS_H as H, BALL_R, DEFAULT_THEME,
  easing, clamp, useDrillTimeline,
  ClubSideView, EmotionBurst,
  GolfBallTopDown, StreakHUD, CheckBadge, CaptionOverlay,
} from './drillPrimitives';

// ── ジオメトリ ─────────────────────────────────────────────────
const GROUND_Y  = 620;
const BALL_CX   = 320;
const BALL_CY   = GROUND_Y - BALL_R;   // 582

// スイング折り返し点
const BACK_X  = BALL_CX - 95;   // 225
const BACK_Y  = BALL_CY - 210;  // 372
const FOLO_X  = BALL_CX + 145;  // 465
const FOLO_Y  = BALL_CY - 185;  // 397

// 各インパクト位置
const IMP_TOP_Y = BALL_CY - 95;   // トップ: 95px 上 (明確にボールより高い)
const IMP_CHK_X = BALL_CX - 80;   // ダフり: 80px 手前 (地面を先に叩く)
const IMP_CHK_Y = GROUND_Y;

// クリーン飛翔
const LAND_X = BALL_CX + 390;
const PEAK_H = 380;

// ── タイムライン ────────────────────────────────────────────────
const T_S1_BACK = 1.5;                               // スイング1 バックスイング開始
const T_S1_IMP  = T_S1_BACK + 0.5 + 0.10 + 0.20;   // = 2.30 トップ・インパクト

const T_S2_ADDR = 4.8;
const T_S2_BACK = T_S2_ADDR + 0.30;                  // 5.10
const T_S2_IMP  = T_S2_BACK + 0.5 + 0.10 + 0.20;   // = 5.90 ダフり・インパクト

const T_S3_ADDR = 8.0;
const T_S3_BACK = T_S3_ADDR + 0.30;                  // 8.30
const T_S3_IMP  = T_S3_BACK + 0.60 + 0.15 + 0.20;  // = 9.25 クリーン・インパクト
const T_CLN_LAND = T_S3_IMP + 2.10;                  // 11.35 → ループ内で消える

const T_STREAK   = 9.90;
const T_LOOP_END = 10.50;
const DURATION   = 11;

function phaseOf(time) {
  if (time < 1.2)      return 0;  // アドレス
  if (time < T_S2_ADDR) return 1; // トップ
  if (time < T_S3_ADDR) return 2; // ダフり
  return 3;                        // クリーン
}

const DEFAULT_CAPTIONS = [
  'アドレス：クラブをボールにセットする',
  'NG①：トップ（クラブがボールの上を通過）',
  'NG②：ダフり（ボールの手前を叩く）',
  '正しいインパクト → 5回連続でクリア',
];

// ── クラブヘッド位置計算 ──────────────────────────────────────
function swingPos(local, impX, impY, BS = 0.5, BH = 0.10, DS = 0.20) {
  if (local <= 0) return { x: BALL_CX, y: BALL_CY };
  if (local < BS) {
    const t = easing.easeOutQuad(local / BS);
    return {
      x: BALL_CX + (BACK_X - BALL_CX) * t,
      y: BALL_CY + (BACK_Y - BALL_CY) * t,
    };
  }
  if (local < BS + BH) return { x: BACK_X, y: BACK_Y };
  if (local < BS + BH + DS) {
    const t = easing.easeInCubic((local - BS - BH) / DS);
    return {
      x: BACK_X + (impX - BACK_X) * t,
      y: BACK_Y + (impY - BACK_Y) * t,
    };
  }
  const ft = local - (BS + BH + DS);
  if (ft < 0.5) {
    const t = easing.easeOutQuad(ft / 0.5);
    return { x: impX + (FOLO_X - impX) * t, y: impY + (FOLO_Y - impY) * t };
  }
  return { x: FOLO_X, y: FOLO_Y };
}

function getClub(time) {
  // Phase 0 / address holds → at ball
  if (time < T_S1_BACK) return { x: BALL_CX, y: BALL_CY, op: 1 };

  // Swing 1 — TOP
  if (time < T_S2_ADDR) {
    const pos = swingPos(time - T_S1_BACK, BALL_CX, IMP_TOP_Y);
    const op  = clamp(1 - (time - (T_S1_IMP + 0.55)) / 0.55, 0, 1);
    return { x: pos.x, y: pos.y, op: Math.max(op, 0.06) };
  }

  if (time < T_S2_BACK) return { x: BALL_CX, y: BALL_CY, op: 1 };

  // Swing 2 — CHUNK
  if (time < T_S3_ADDR) {
    const pos = swingPos(time - T_S2_BACK, IMP_CHK_X, IMP_CHK_Y);
    const op  = clamp(1 - (time - (T_S2_IMP + 0.45)) / 0.55, 0, 1);
    return { x: pos.x, y: pos.y, op: Math.max(op, 0.06) };
  }

  if (time < T_S3_BACK) return { x: BALL_CX, y: BALL_CY, op: 1 };

  // Swing 3 — CLEAN
  const pos = swingPos(time - T_S3_BACK, BALL_CX, BALL_CY, 0.60, 0.15, 0.20);
  const op  = clamp(1 - (time - (T_S3_IMP + 0.40)) / 0.60, 0, 1);
  return { x: pos.x, y: pos.y, op: Math.max(op, 0) };
}

// ─────────────────────────────────────────────────────────────
function SwingScene({ time, theme, goalCount }) {
  const club = getClub(time);

  // ── ボール位置 / 透明度 ────────────────────────────────────
  let ballX = BALL_CX, ballY = BALL_CY, ballOp = 1, ballRolled = 0;
  let ballEntry = clamp(time / 0.38, 0, 1);

  // Phase 1: インパクト後 → わずかに右ヘ転がる (薄当たり)
  if (time > T_S1_IMP && time < T_S2_ADDR) {
    const p = clamp((time - T_S1_IMP) / 0.85, 0, 1);
    ballX  = BALL_CX + easing.easeOutQuad(p) * 28;
    ballOp = clamp(1 - (time - (T_S2_ADDR - 0.38)) / 0.38, 0.04, 1);
  }
  // Phase 2: リセット
  if (time >= T_S2_ADDR && time < T_S2_IMP) {
    ballX     = BALL_CX;
    ballOp    = clamp((time - T_S2_ADDR) / 0.30, 0, 1);
    ballEntry = clamp((time - T_S2_ADDR) / 0.30, 0, 1);
  }
  // Phase 2: インパクト後 → ほとんど動かない (ダフり)
  if (time > T_S2_IMP && time < T_S3_ADDR) {
    const p = clamp((time - T_S2_IMP) / 0.65, 0, 1);
    ballX  = BALL_CX + easing.easeOutQuad(p) * 9;
    ballOp = clamp(1 - (time - (T_S3_ADDR - 0.38)) / 0.38, 0.04, 1);
  }
  // Phase 3: リセット
  if (time >= T_S3_ADDR && time < T_S3_IMP) {
    ballX     = BALL_CX;
    ballOp    = clamp((time - T_S3_ADDR) / 0.30, 0, 1);
    ballEntry = clamp((time - T_S3_ADDR) / 0.30, 0, 1);
  }
  // Phase 3: クリーン飛翔
  if (time > T_S3_IMP && time < T_CLN_LAND) {
    const p = easing.easeOutCubic(
      clamp((time - T_S3_IMP) / (T_CLN_LAND - T_S3_IMP), 0, 1)
    );
    ballX      = BALL_CX + p * (LAND_X - BALL_CX);
    ballY      = BALL_CY - 4 * PEAK_H * p * (1 - p);
    ballRolled = (ballX - BALL_CX) * 1.3;
    ballOp     = 1 - clamp((p - 0.74) / 0.26, 0, 1);
  } else if (time >= T_CLN_LAND) {
    ballOp = 0;
  }
  const ballVisible = ballOp > 0.02;

  // ── アノテーション表示量 ───────────────────────────────────
  // トップ: インパクト後に登場、Phase 2 前に消える
  const topAnnoOp = time >= T_S1_IMP
    ? clamp((time - T_S1_IMP) / 0.32, 0, 1)
      * clamp(1 - (time - (T_S2_ADDR - 0.55)) / 0.50, 0, 1)
    : 0;

  // ダフり: インパクト後に登場、Phase 3 前に消える
  const chkAnnoOp = time >= T_S2_IMP
    ? clamp((time - T_S2_IMP) / 0.32, 0, 1)
      * clamp(1 - (time - (T_S3_ADDR - 0.55)) / 0.50, 0, 1)
    : 0;

  // 土: ダフりインパクト後
  const dirtP    = clamp((time - T_S2_IMP) / 0.72, 0, 1);
  const showDirt = time >= T_S2_IMP && time < T_S2_IMP + 0.72;

  // クリーン: ♪ + チェック
  const showNote = time >= T_S3_IMP && time < T_S3_IMP + 0.88;
  const noteP    = clamp((time - T_S3_IMP) / 0.88, 0, 1);
  const checkOp  = time >= T_S3_IMP + 0.28
    ? clamp((time - (T_S3_IMP + 0.28)) / 0.28, 0, 1)
      * clamp(1 - (time - (T_S3_IMP + 0.85)) / 0.38, 0, 1)
    : 0;

  const streakFill = time > T_STREAK && time < T_LOOP_END ? 1 : 0;
  const loopFade   = clamp((time - T_LOOP_END) / 0.50, 0, 1);

  // ── 共通ラベルボックス座標 ────────────────────────────────
  const LBL_X = 462, LBL_Y = 455, LBL_W = 230, LBL_H = 84;
  const LBL_CX = LBL_X + LBL_W / 2;  // 577

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      {/* 背景 */}
      <Rect x={0} y={0} width={W} height={H} fill={theme.bg} />

      {/* ─── トップ アノテーション ─── */}
      {topAnnoOp > 0.02 && (
        <G opacity={topAnnoOp}>
          {/* ボール中心高さ基準線 (緑点線 = 正しいコンタクト高さ) */}
          <Line
            x1={155} y1={BALL_CY} x2={LBL_X - 8} y2={BALL_CY}
            stroke={theme.success} strokeWidth={2.4}
            strokeDasharray="9 6" strokeLinecap="round" />
          {/* "当てる高さ" ピル */}
          <Rect x={LBL_X - 8} y={BALL_CY - 16} width={130} height={32} rx={16}
            fill={theme.success} />
          <SvgText
            x={LBL_X - 8 + 65} y={BALL_CY + 5}
            textAnchor="middle" fontSize={15} fontWeight="800"
            fill={theme.bg} fontFamily={theme.fontJa}>当てる高さ</SvgText>

          {/* ギャップ矢印 (クラブ → 基準線) */}
          <Line
            x1={355} y1={IMP_TOP_Y + 20} x2={355} y2={BALL_CY - 4}
            stroke={theme.accent} strokeWidth={2.2}
            strokeDasharray="5 4" strokeLinecap="round" />
          <Circle cx={355} cy={IMP_TOP_Y + 20} r={4} fill={theme.accent} />
          <Circle cx={355} cy={BALL_CY - 4}    r={4} fill={theme.accent} />

          {/* サブテキスト */}
          <SvgText
            x={LBL_CX} y={LBL_Y - 28}
            textAnchor="middle" fontSize={20} fontWeight="700"
            fill={theme.accent} fontFamily={theme.fontJa}>
            クラブが高すぎる
          </SvgText>
          {/* "トップ" 大ラベル */}
          <Rect x={LBL_X} y={LBL_Y} width={LBL_W} height={LBL_H} rx={14}
            fill={theme.accent} />
          <SvgText
            x={LBL_CX} y={LBL_Y + LBL_H * 0.72}
            textAnchor="middle" fontSize={54} fontWeight="900"
            fill={theme.bg} fontFamily={theme.fontJa}>トップ</SvgText>
        </G>
      )}

      {/* ─── ダフり アノテーション ─── */}
      {chkAnnoOp > 0.02 && (
        <G opacity={chkAnnoOp}>
          {/* 接触点 × マーカー */}
          <Line
            x1={IMP_CHK_X - 18} y1={GROUND_Y - 18}
            x2={IMP_CHK_X + 18} y2={GROUND_Y + 2}
            stroke={theme.accent} strokeWidth={5.5} strokeLinecap="round" />
          <Line
            x1={IMP_CHK_X + 18} y1={GROUND_Y - 18}
            x2={IMP_CHK_X - 18} y2={GROUND_Y + 2}
            stroke={theme.accent} strokeWidth={5.5} strokeLinecap="round" />

          {/* "ここを先に叩いた" ラベル */}
          <SvgText
            x={IMP_CHK_X} y={GROUND_Y + 50}
            textAnchor="middle" fontSize={19} fontWeight="700"
            fill={theme.accent} fontFamily={theme.fontJa}>
            ここを先に叩いた
          </SvgText>

          {/* 横オフセット点線: 接触点 → ボール */}
          <Line
            x1={IMP_CHK_X + 20} y1={GROUND_Y - 6}
            x2={BALL_CX - 20}   y2={GROUND_Y - 6}
            stroke={theme.inkSoft} strokeWidth={2}
            strokeDasharray="5 5" />

          {/* サブテキスト */}
          <SvgText
            x={LBL_CX} y={LBL_Y - 28}
            textAnchor="middle" fontSize={20} fontWeight="700"
            fill={theme.accent} fontFamily={theme.fontJa}>
            ボールの手前を叩く
          </SvgText>
          {/* "ダフり" 大ラベル */}
          <Rect x={LBL_X} y={LBL_Y} width={LBL_W} height={LBL_H} rx={14}
            fill={theme.accent} />
          <SvgText
            x={LBL_CX} y={LBL_Y + LBL_H * 0.72}
            textAnchor="middle" fontSize={54} fontWeight="900"
            fill={theme.bg} fontFamily={theme.fontJa}>ダフり</SvgText>
        </G>
      )}

      {/* 地面ライン */}
      <Line
        x1={36} y1={GROUND_Y} x2={W - 36} y2={GROUND_Y}
        stroke={theme.ink} strokeWidth={2.8}
        strokeLinecap="round" opacity={0.88} />

      {/* 土 (ダフり時) */}
      {showDirt && (
        <EmotionBurst
          x={IMP_CHK_X} y={GROUND_Y - 10}
          type="dirt" progress={dirtP} theme={theme} />
      )}

      {/* クラブ */}
      <ClubSideView
        headX={club.x} headY={club.y}
        shaftAngle={-28} shaftLength={220}
        opacity={club.op} theme={theme} />

      {/* ボール */}
      {ballVisible && (
        <GolfBallTopDown
          x={ballX} y={ballY}
          rolled={ballRolled}
          entry={ballEntry}
          theme={theme} />
      )}

      {/* クリーン: ♪ */}
      {showNote && (
        <EmotionBurst
          x={BALL_CX + 90} y={BALL_CY - 55}
          type="note" progress={noteP} theme={theme} />
      )}

      {/* クリーン: チェックバッジ */}
      {checkOp > 0.01 && (
        <CheckBadge
          x={BALL_CX + 195} y={BALL_CY - 80}
          opacity={checkOp} theme={theme} />
      )}

      {/* StreakHUD */}
      <StreakHUD
        filled={streakFill} goal={goalCount}
        justPassed={time > T_STREAK && time < T_STREAK + 1.0}
        label="5回連続でクリア"
        theme={theme} />

      {/* ループクロスフェード */}
      {loopFade > 0 && (
        <Rect x={0} y={0} width={W} height={H} fill={theme.bg} opacity={loopFade} />
      )}
    </Svg>
  );
}

// ── Default export ─────────────────────────────────────────────
export default function SwingDrillAnimation({
  view = 'top',
  duration = DURATION,
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

  return (
    <View style={styles.container}>
      <SwingScene time={time} theme={theme} goalCount={goalCount} />
      {showCaption && (
        <CaptionOverlay
          phase={phase} totalPhases={4}
          captions={captions} theme={theme} />
      )}
    </View>
  );
}

export { phaseOf };

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
});

/**
 * drillPrimitives.js
 * ─────────────────────────────────────────────────────────────
 * 全ドリルアニメーションで共有するプリミティブ + テーマ + タイムライン。
 *
 * 新しいドリルを作るときは
 *   import { GolfBallTopDown, GolfTee, MalletPutter, ... } from './drillPrimitives';
 * から始めること。GateDrillAnimation から import しない。
 *
 * 新規プリミティブが必要になったら、drill 固有ファイルに書かず、
 * このファイルに追加して全ドリルで使えるようにする。
 *
 * Exports
 * ─────────────────────────────────────────────────────────────
 *   定数:  CANVAS_W (720), CANVAS_H (800), BALL_R (38)
 *   テーマ: DEFAULT_THEME, FONTS
 *   ユーティリティ: easing, clamp
 *   フック: useDrillTimeline
 *   プリミティブ (SVG パーツ):
 *     GolfBallTopDown, GolfTee, MalletPutter,
 *     DimensionLabel, StreakHUD, CheckBadge
 *   UI:
 *     CaptionOverlay (動画下のダークバー — STEP n/N + 説明文)
 *
 * デザイントークン
 * ─────────────────────────────────────────────────────────────
 *   bg       cream  (#faf6ec)        — キャンバス背景。緑/芝/グラデ禁止
 *   ink      dark   (#1a1714)        — 主役の線・テキスト
 *   accent   red    (#c43320)        — タイトクリアランス強調
 *   success  green  (#3a8f4c)        — 成功時のチェック・リング
 *
 * Canvas
 * ─────────────────────────────────────────────────────────────
 *   全ドリルは viewBox `0 0 720 800` を使う。
 *   座標が共有されることで、StreakHUD など W/H 依存のプリミティブが
 *   ドリル間でレイアウト崩れせずに使い回せる。
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  G, Rect, Circle, Ellipse, Line, Path, Polygon,
  Text as SvgText, Defs, ClipPath, RadialGradient, Stop,
} from 'react-native-svg';

// ─────────────────────────────────────────────────────────────────────────
// 定数 — 全ドリル共通キャンバス
// ─────────────────────────────────────────────────────────────────────────
export const CANVAS_W = 720;
export const CANVAS_H = 800;
export const BALL_R = 38;

// ─────────────────────────────────────────────────────────────────────────
// テーマ
// ─────────────────────────────────────────────────────────────────────────
export const DEFAULT_THEME = {
  bg:        '#faf6ec',   // cream
  ink:       '#1a1714',
  inkSoft:   'rgba(26,23,20,0.35)',
  inkFaint:  'rgba(26,23,20,0.15)',
  accent:    '#c43320',
  putterRed: '#d12d28',
  chip:      '#161210',
  chipText:  '#faf6ec',
  gateFill:  '#fbf8ee',
  success:   '#3a8f4c',
  fontJa:    'System',
  fontEn:    'Menlo',
};

export const FONTS = { ja: 'System', en: 'Menlo' };

// ─────────────────────────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────────────────────────
export const easing = {
  linear:        (t) => t,
  easeInQuad:    (t) => t * t,
  easeOutQuad:   (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic:   (t) => t * t * t,
  easeOutCubic:  (t) => (--t) * t * t + 1,
  easeOutBack:   (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─────────────────────────────────────────────────────────────────────────
// useDrillTimeline — RAF ベースのタイムラインフック
// 全ドリルが同じハートビートで動くようにする。
// ─────────────────────────────────────────────────────────────────────────
export function useDrillTimeline({
  duration = 11,
  autoPlay = true,
  loop = true,
  paused = false,
  seekTo = null,
  phaseOf = () => 0,
  onPhase,
}) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const lastPhaseRef = useRef(-1);

  const controlled = seekTo != null;
  const effectiveTime = controlled ? clamp(seekTo, 0, duration) : time;

  useEffect(() => {
    if (controlled || !playing || paused) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;
          else { next = duration; setPlaying(false); }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, paused, duration, loop, controlled]);

  const phase = phaseOf(effectiveTime);
  useEffect(() => {
    if (phase !== lastPhaseRef.current) {
      lastPhaseRef.current = phase;
      if (onPhase) onPhase(phase);
    }
  }, [phase, onPhase]);

  return {
    time: effectiveTime,
    phase,
    isPlaying: playing,
    play:  () => setPlaying(true),
    pause: () => setPlaying(false),
    seek:  (t) => setTime(clamp(t, 0, duration)),
  };
}

// ═════════════════════════════════════════════════════════════════════════
// プリミティブ — 視覚言語 (cream fill + ink outline + subtle shadow)
// 新規プリミティブを追加する場合も、必ずこの言語に従うこと。
// ═════════════════════════════════════════════════════════════════════════

/** ティー (上から見た図) */
export function GolfTee({ x, y, progress = 1, theme = DEFAULT_THEME }) {
  const p = clamp(progress, 0, 1);
  if (p <= 0) return null;
  const sc = 0.4 + 0.6 * easing.easeOutBack(p);
  return (
    <G transform={`translate(${x},${y}) scale(${sc})`}>
      <Ellipse cx={3} cy={8} rx={18} ry={4} fill={theme.ink} opacity={0.22} />
      <G stroke={theme.ink} strokeWidth={2.2}
         strokeLinejoin="round" strokeLinecap="round"
         fill={theme.gateFill}>
        <Path d="M -11 -22 Q -13 -20 -12 -16 L -4 -12 L -4 4 L -2 8 L 0 9 L 2 8 L 4 4 L 4 -12 L 12 -16 Q 13 -20 11 -22 Q 6 -24 0 -23.5 Q -6 -24 -11 -22 Z" />
        <Path d="M -9 -21 Q 0 -18 9 -21" fill="none" />
        <Path d="M -7 -19 Q 0 -16.5 7 -19" fill="none" strokeWidth={1} opacity={0.4} />
      </G>
    </G>
  );
}

/** ボール (上から見た図、rolling stripe 付き) */
export function GolfBallTopDown({
  x, y, r = BALL_R, rolled = 0, entry = 1, theme = DEFAULT_THEME,
}) {
  const e = clamp(entry, 0, 1);
  const sc = e < 1 ? 0.4 + 0.6 * easing.easeOutBack(e) : 1;
  const traveled = rolled / r;
  const clipId = `gd_ballClip_${Math.round(x * 7 + y * 11)}`;
  const gradId = `gd_ballGrad_${Math.round(x * 13 + y * 17)}`;
  return (
    <G transform={`translate(${x}, ${y}) scale(${sc})`}>
      <Ellipse cx={2} cy={r * 0.18} rx={r * 0.94} ry={r * 0.92}
        fill={theme.ink} opacity={0.22} />
      <Defs>
        <RadialGradient id={gradId} cx="0.35" cy="0.32" r="0.85">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="60%" stopColor="#f6f1e2" />
          <Stop offset="100%" stopColor="#c9c2ad" />
        </RadialGradient>
        <ClipPath id={clipId}>
          <Circle cx={0} cy={0} r={r - 1.5} />
        </ClipPath>
      </Defs>
      <Circle cx={0} cy={0} r={r} fill={`url(#${gradId})`}
        stroke={theme.ink} strokeWidth={1.6} />
      <G clipPath={`url(#${clipId})`}>
        {[0, Math.PI].map((startA, idx) => {
          const a = startA - traveled;
          const cosA = Math.cos(a);
          if (cosA <= 0.04) return null;
          const fy = -r * Math.sin(a);
          const fw = r * 1.4 * cosA;
          return (
            <Rect key={idx}
              x={-fw / 2} y={fy - 1.2}
              width={fw} height={2.4}
              rx={1.2}
              fill={theme.ink} opacity={cosA * 0.9} />
          );
        })}
      </G>
      <Ellipse cx={-r * 0.36} cy={-r * 0.42} rx={r * 0.22} ry={r * 0.11}
        fill="rgba(255,255,255,0.85)" />
    </G>
  );
}

/** マレットパター (上から見た図) */
export function MalletPutter({
  cx, faceY, opacity = 1, handed = 'right',
  headW = 124, headD = 86,
  shaftEndY,
  theme = DEFAULT_THEME,
}) {
  if (opacity <= 0.01) return null;
  const semiR = headW / 2;
  const sideH = headD - semiR;
  const pathD =
    `M ${-semiR} 0 L ${semiR} 0 L ${semiR} ${sideH} ` +
    `A ${semiR} ${semiR} 0 0 1 ${-semiR} ${sideH} Z`;
  const dir = handed === 'right' ? 1 : -1;
  const hoselX = headW * 0.34 * dir;
  const hoselY = 12;
  const shaftEndX = -220 * dir;
  const shaftEndYFinal = shaftEndY != null ? shaftEndY : (CANVAS_H + 60 - faceY);
  return (
    <G transform={`translate(${cx}, ${faceY})`} opacity={opacity}>
      <Line x1={hoselX} y1={hoselY} x2={shaftEndX} y2={shaftEndYFinal}
        stroke="#2a2a2c" strokeWidth={9} strokeLinecap="round" />
      <Line x1={hoselX} y1={hoselY} x2={shaftEndX} y2={shaftEndYFinal}
        stroke="rgba(255,255,255,0.22)" strokeWidth={2.2} strokeLinecap="round" />
      <G transform="translate(3,5)" opacity={0.32}>
        <Path d={pathD} fill={theme.ink} />
      </G>
      <Path d={pathD} fill="#0e0e0f" />
      <Circle cx={hoselX} cy={hoselY} r={6.5} fill="#1a1a1d" />
      <Circle cx={hoselX} cy={hoselY} r={3} fill="#3a3a3e" />
      <Line x1={-semiR + 4} y1={1.5} x2={semiR - 4} y2={1.5}
        stroke="#3a3a3d" strokeWidth={2.5} strokeLinecap="round" />
      <Rect x={-2.5} y={8} width={5} height={headD - 22}
        fill={theme.putterRed} rx={2.5} />
      <Circle cx={-headW * 0.22} cy={headD - 22} r={5} fill="#f3eedf" />
      <Circle cx={headW * 0.22}  cy={headD - 22} r={5} fill="#f3eedf" />
    </G>
  );
}

/** 寸法ラベル (縦方向の "10cm" 表示) */
export function DimensionLabel({
  xLine, yTop, yBot, extLeft, extRight,
  label = '10cm', opacity = 1, theme = DEFAULT_THEME,
}) {
  return (
    <G opacity={opacity}>
      {extLeft != null && (
        <Line x1={xLine} y1={yBot} x2={extLeft} y2={yBot}
          stroke={theme.ink} strokeWidth={1} opacity={0.55} strokeDasharray="3 4" />
      )}
      {extRight != null && (
        <Line x1={xLine} y1={yTop} x2={extRight} y2={yTop}
          stroke={theme.ink} strokeWidth={1} opacity={0.55} strokeDasharray="3 4" />
      )}
      <Line x1={xLine} y1={yBot} x2={xLine} y2={yTop}
        stroke={theme.ink} strokeWidth={1.6} />
      <Polygon
        points={`${xLine - 5},${yBot - 10} ${xLine + 5},${yBot - 10} ${xLine},${yBot}`}
        fill={theme.ink} />
      <Polygon
        points={`${xLine - 5},${yTop + 10} ${xLine + 5},${yTop + 10} ${xLine},${yTop}`}
        fill={theme.ink} />
      <G transform={`translate(${xLine - 56}, ${(yBot + yTop) / 2})`}>
        <Rect x={0} y={-18} width={50} height={36} rx={6} fill={theme.ink} />
        <SvgText x={25} y={6} textAnchor="middle"
          fontSize={17} fontWeight="800" fill={theme.bg}>{label}</SvgText>
      </G>
    </G>
  );
}

/**
 * StreakHUD — "GOAL · N回連続でクリア" + 進捗ドット
 * 全ドリル統一の HUD レイアウト。上部に置くこと。
 *
 * 位置: 左上 (36, ~) にラベル、右上 (W-余白, ~) にドット。
 * 注意: container アスペクトに合わせて viewBox が縦長 (720×800) になっている
 * 場合、preserveAspectRatio="meet" だと HUD は安全な範囲に収まる。
 */
export function StreakHUD({
  filled = 0, goal = 5, justPassed = false,
  label = '5回連続でクリア',
  theme = DEFAULT_THEME,
}) {
  const dotsX = CANVAS_W - 40 - goal * 38;
  return (
    <G>
      <G transform="translate(36, 56)">
        <SvgText x={0} y={0} fontFamily={theme.fontEn}
          fontSize={11} fontWeight="700" fill={theme.ink}
          opacity={0.5}>GOAL</SvgText>
        <SvgText x={0} y={22} fontFamily={theme.fontJa}
          fontSize={17} fontWeight="800" fill={theme.ink}>{label}</SvgText>
      </G>
      <G transform={`translate(${dotsX}, 60)`}>
        {Array.from({ length: goal }).map((_, i) => {
          const on = i < filled;
          const isJust = justPassed && i === filled - 1;
          const r = 14 + (isJust ? 3 : 0);
          return (
            <G key={i} transform={`translate(${i * 38}, 12)`}>
              <Circle cx={0} cy={0} r={r}
                fill={on ? theme.success : 'rgba(20,18,12,0.04)'}
                stroke={on ? theme.success : theme.ink}
                strokeWidth={on ? 0 : 1.8}
                opacity={on ? 1 : 0.55} />
              {on && (
                <Path d="M -6 0 L -1 5 L 7 -6"
                  stroke={theme.bg} strokeWidth={2.8} fill="none"
                  strokeLinecap="round" strokeLinejoin="round" />
              )}
            </G>
          );
        })}
      </G>
    </G>
  );
}

/** チェックバッジ (緑の ✓ アイコン) — 成功瞬間のフィードバック */
export function CheckBadge({ x, y, opacity = 1, r = 22, theme = DEFAULT_THEME }) {
  return (
    <G transform={`translate(${x}, ${y})`} opacity={opacity}>
      <Circle cx={0} cy={0} r={r} fill={theme.success} />
      <Path d="M -8 0 L -2 7 L 10 -7"
        stroke={theme.bg} strokeWidth={3.5} fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
    </G>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ZoneStake — 横から見たゾーンマーカー (縦の杭)
// 'over' 系ドリルのターゲットゾーン境界に使う。
// 他のドリルでも着地ゾーン・アライメントゾーン等に再利用可能。
// ─────────────────────────────────────────────────────────────────────────
export function ZoneStake({
  x, groundY, height = 140, progress = 1, color, theme = DEFAULT_THEME,
}) {
  const p = clamp(progress, 0, 1);
  if (p <= 0) return null;
  const sc = easing.easeOutBack(p);
  const fill = color || theme.ink;
  const topY = groundY - height * sc;
  return (
    <G>
      <Ellipse cx={x + 3} cy={groundY + 5} rx={10 * p} ry={3 * p}
        fill={theme.ink} opacity={0.18} />
      <Line x1={x} y1={groundY} x2={x} y2={topY}
        stroke={fill} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={x} cy={topY} r={8 * sc} fill={fill} />
    </G>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ClubSideView — 横から見たアイアン/ウェッジ
// headX/headY = ボールコンタクト位置 (フェース中央底部)
// shaftAngle  = 縦軸から何度傾くか (負 = 左傾き = 右打ちアドレス想定)
//
// 構造: ヒール(左) ─ ホーゼル ─ シャフト ─ グリップ
//               ↑
//        フェース中央 = headX,headY
//               ↓
//        トウ(右) へ向かってヘッドが延びる
// ─────────────────────────────────────────────────────────────────────────
export function ClubSideView({
  headX, headY,
  shaftAngle = -28,
  shaftLength = 310,
  opacity = 1,
  theme = DEFAULT_THEME,
}) {
  if (opacity <= 0.01) return null;
  const rad = (shaftAngle * Math.PI) / 180;

  // ── ホーゼル (ヒール側 = 左) ─────────────────────────────────
  const HOSEL_X   = headX - 16;   // ヒールから少し内側
  const HOSEL_BOT = headY - 18;   // ヘッド天端と同じ高さ
  const HOSEL_TOP = headY - 30;   // シャフト接続点

  // ── シャフト & グリップ ──────────────────────────────────────
  const shaftEndX = HOSEL_X + shaftLength * Math.sin(rad);
  const shaftEndY = HOSEL_TOP - shaftLength * Math.cos(rad);

  // グリップ: シャフト末端から 52px の区間
  const GRIP_LEN = 52;
  const gf = Math.min(GRIP_LEN / shaftLength, 0.88);
  const gripX0 = HOSEL_X + (1 - gf) * (shaftEndX - HOSEL_X);
  const gripY0 = HOSEL_TOP + (1 - gf) * (shaftEndY - HOSEL_TOP);

  // ── ヘッド形状 (Path) ─────────────────────────────────────────
  // ヒール (左) → ソール曲線 → トウ (右) → トップライン → 閉じる
  const X = headX, Y = headY;
  const headPath = [
    `M ${X - 20} ${Y}`,                              // ヒール・ソール
    `Q ${X + 4} ${Y + 7} ${X + 26} ${Y + 2}`,       // 湾曲ソール
    `L ${X + 26} ${Y - 14}`,                         // トウ フェース
    `L ${X - 20} ${Y - 18}`,                         // トップライン
    'Z',
  ].join(' ');

  return (
    <G opacity={opacity}>
      {/* 地面影 */}
      <Ellipse cx={X + 3} cy={Y + 10} rx={28} ry={5}
        fill={theme.ink} opacity={0.14} />

      {/* シャフト本体 */}
      <Line x1={HOSEL_X} y1={HOSEL_TOP} x2={shaftEndX} y2={shaftEndY}
        stroke="#3a3a3c" strokeWidth={4.5} strokeLinecap="round" />
      {/* シャフト光沢 */}
      <Line x1={HOSEL_X} y1={HOSEL_TOP} x2={shaftEndX} y2={shaftEndY}
        stroke="rgba(255,255,255,0.22)" strokeWidth={1.0} strokeLinecap="round" />

      {/* グリップ (太め・暗め) */}
      <Line x1={gripX0} y1={gripY0} x2={shaftEndX} y2={shaftEndY}
        stroke="#121214" strokeWidth={8} strokeLinecap="round" />
      {/* グリップ端キャップ */}
      <Circle cx={shaftEndX} cy={shaftEndY} r={5}
        fill="#1a1a1c" />

      {/* ホーゼル (シャフト接続首部) */}
      <Rect
        x={HOSEL_X - 4} y={HOSEL_TOP}
        width={8} height={HOSEL_BOT - HOSEL_TOP}
        rx={4} fill="#252528" />

      {/* ヘッド本体 */}
      <Path d={headPath} fill="#0e0e0f" strokeWidth={0} />
      {/* ヘッド天面ハイライト */}
      <Line x1={X - 20} y1={Y - 18} x2={X + 26} y2={Y - 14}
        stroke="rgba(255,255,255,0.16)" strokeWidth={1.0} strokeLinecap="round" />

      {/* スコアライン (フェース溝 × 5本) */}
      {[3, 6, 9, 12, 15].map(d => (
        <Line key={d}
          x1={X - 13} y1={Y - d}
          x2={X + 19} y2={Y - d}
          stroke="rgba(255,255,255,0.26)" strokeWidth={1.3}
          strokeLinecap="round" />
      ))}
    </G>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// StickFigure — 正面からの棒人間ゴルファー
// swing 系ドリルのキャラクターアニメで使う。
// handsX/Y でグリップ位置を、clubHeadX/Y でヘッド位置を制御して
// 全スイング姿勢を表現する。bodyLean で体の回転も付ける。
// ─────────────────────────────────────────────────────────────────────────
export function StickFigure({
  hipX = 360, hipY = 460,
  headR = 42,
  shoulderSpan = 88,
  bodyLean = 0,
  handsX, handsY,
  clubHeadX, clubHeadY,
  showClub = true,
  strokeW = 9,
  theme = DEFAULT_THEME,
}) {
  const TORSO_H   = 165;
  const shoulderY = hipY - TORSO_H;
  const headCy    = shoulderY - headR - 6;
  const lSh = { x: hipX - shoulderSpan, y: shoulderY };
  const rSh = { x: hipX + shoulderSpan, y: shoulderY };
  // 膝: 少し外側に開く
  const lKnee = { x: hipX - 32, y: hipY + 62 };
  const rKnee = { x: hipX + 58, y: hipY + 62 };
  const lFoot = { x: hipX - 46, y: hipY + 130 };
  const rFoot = { x: hipX + 52, y: hipY + 130 };

  return (
    <G transform={`rotate(${bodyLean}, ${hipX}, ${hipY})`}>
      {/* 地面影 */}
      <Ellipse cx={hipX + 4} cy={hipY + 136} rx={44} ry={8}
        fill={theme.ink} opacity={0.14} />
      {/* 頭 (黒塗り丸 — 顔パーツなし) */}
      <Circle cx={hipX} cy={headCy} r={headR} fill={theme.ink} />
      {/* 首 + 胴体 */}
      <Line x1={hipX} y1={shoulderY - 2} x2={hipX} y2={hipY}
        stroke={theme.ink} strokeWidth={strokeW} strokeLinecap="round" />
      {/* 肩ライン */}
      <Line x1={lSh.x} y1={lSh.y} x2={rSh.x} y2={rSh.y}
        stroke={theme.ink} strokeWidth={strokeW} strokeLinecap="round" />
      {/* 両腕 → グリップ位置 */}
      {handsX != null && (
        <>
          <Line x1={lSh.x} y1={lSh.y} x2={handsX} y2={handsY}
            stroke={theme.ink} strokeWidth={strokeW} strokeLinecap="round" />
          <Line x1={rSh.x} y1={rSh.y} x2={handsX} y2={handsY}
            stroke={theme.ink} strokeWidth={strokeW} strokeLinecap="round" />
        </>
      )}
      {/* 脚 */}
      <Line x1={hipX} y1={hipY} x2={lKnee.x} y2={lKnee.y}
        stroke={theme.ink} strokeWidth={strokeW} strokeLinecap="round" />
      <Line x1={lKnee.x} y1={lKnee.y} x2={lFoot.x} y2={lFoot.y}
        stroke={theme.ink} strokeWidth={strokeW} strokeLinecap="round" />
      <Line x1={hipX} y1={hipY} x2={rKnee.x} y2={rKnee.y}
        stroke={theme.ink} strokeWidth={strokeW} strokeLinecap="round" />
      <Line x1={rKnee.x} y1={rKnee.y} x2={rFoot.x} y2={rFoot.y}
        stroke={theme.ink} strokeWidth={strokeW} strokeLinecap="round" />
      {/* クラブ: グリップ → ヘッド */}
      {showClub && clubHeadX != null && handsX != null && (
        <G>
          <Line x1={handsX} y1={handsY} x2={clubHeadX} y2={clubHeadY}
            stroke={theme.ink} strokeWidth={6} strokeLinecap="round" />
          {/* アイアンヘッド */}
          <Rect x={clubHeadX - 15} y={clubHeadY - 4} width={30} height={14} rx={2.5}
            fill={theme.ink} />
        </G>
      )}
    </G>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EmotionBurst — キャラクターの感情フィードバック記号
// type:
//   'sweat' — トップ・ミス時の汗飛び (3つの黒丸が放射状に飛ぶ)
//   'dirt'  — ダフり時の土が飛ぶ演出
//   'cross' — NG の × (accent カラー)
//   'note'  — 成功の ♪ (success カラー、上に浮かぶ)
// progress: 0→1 で演出の進行度
// ─────────────────────────────────────────────────────────────────────────
export function EmotionBurst({ x, y, type = 'sweat', progress = 0, theme = DEFAULT_THEME }) {
  const p = clamp(progress, 0, 1);
  if (p <= 0.01) return null;

  if (type === 'sweat') {
    const dirs = [[-0.9, -1.25], [0.05, -1.5], [1.05, -1.0]];
    const fade = p > 0.55 ? clamp(1 - (p - 0.55) / 0.45, 0, 1) : 1;
    return (
      <G opacity={fade}>
        {dirs.map(([dx, dy], i) => {
          const dist = easing.easeOutBack(Math.min(p * 1.5, 1)) * 62;
          return (
            <Circle key={i}
              cx={x + dx * dist} cy={y + dy * dist}
              r={Math.max(13 - p * 5, 5)}
              fill={theme.ink} opacity={0.75 - i * 0.08} />
          );
        })}
      </G>
    );
  }

  if (type === 'dirt') {
    // ダフり: 土塊が上方に5方向飛ぶ
    const dirs = [[-0.65, -1.3], [0, -1.5], [0.7, -1.2], [-1.05, -0.75], [1.1, -0.6]];
    const fade = p > 0.55 ? clamp(1 - (p - 0.55) / 0.45, 0, 1) : 1;
    return (
      <G opacity={fade}>
        {dirs.map(([dx, dy], i) => {
          const dist = easing.easeOutBack(Math.min(p * 1.4, 1)) * 48;
          const r = Math.max(9 - p * 3, 3);
          return (
            <Ellipse key={i}
              cx={x + dx * dist} cy={y + dy * dist}
              rx={r} ry={r * 0.6}
              fill={theme.ink} opacity={(0.65 - i * 0.08) * fade} />
          );
        })}
      </G>
    );
  }

  if (type === 'cross') {
    const sc = easing.easeOutBack(Math.min(p * 1.8, 1));
    const fade = p > 0.6 ? clamp(1 - (p - 0.6) / 0.4, 0, 1) : 1;
    const s = 34 * sc;
    return (
      <G opacity={fade}>
        <Line x1={x - s} y1={y - s} x2={x + s} y2={y + s}
          stroke={theme.accent} strokeWidth={12} strokeLinecap="round" />
        <Line x1={x + s} y1={y - s} x2={x - s} y2={y + s}
          stroke={theme.accent} strokeWidth={12} strokeLinecap="round" />
      </G>
    );
  }

  if (type === 'note') {
    const rise = easing.easeOutCubic(p) * 95;
    const fade = p > 0.42 ? clamp(1 - (p - 0.42) / 0.58, 0, 1) : 1;
    return (
      <SvgText x={x} y={y - rise}
        fontSize={56} textAnchor="middle"
        fill={theme.success} opacity={fade}
        fontFamily={theme.fontJa}>♪</SvgText>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// CaptionOverlay — 動画下のダークバー (STEP n/N + 日本語キャプション)
// すべてのドリルで同じレイアウトを使う。
// ─────────────────────────────────────────────────────────────────────────
export function CaptionOverlay({ phase, totalPhases = 4, captions, theme = DEFAULT_THEME }) {
  const text = captions[phase] || '';
  return (
    <View style={[styles.caption, { backgroundColor: theme.chip }]}>
      <Text style={[styles.captionStep, { color: theme.chipText }]}>
        STEP {phase + 1}/{totalPhases}{'  '}
        <Text style={[styles.captionText, { color: theme.chipText }]}>{text}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  captionStep: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    opacity: 0.55,
    fontFamily: 'Menlo',
  },
  captionText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: 0.1,
    opacity: 1,
  },
});

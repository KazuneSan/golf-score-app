/**
 * OverDrillAnimation.js  (React Native)
 * ─────────────────────────────────────────────────────────────
 * 'over' setup バリアントのシネマティックアニメーション。
 *
 * ショット / アプローチ / バンカー / ロングパットなど
 * 「ボールを放物線で飛ばしてターゲットゾーンに入れる」
 * ドリル群 (26本) に共通して使う横視点アニメ。
 *
 * Props — GateDrillAnimation と同じ API
 * ─────────────────────────────────────────────────────────────
 *   view         'top' | 'setup'     default 'top'
 *   duration     秒 (ループ長)       default 11
 *   autoPlay     マウント時に再生    default true
 *   loop         ループ             default true
 *   paused       一時停止           default false
 *   seekTo       制御モード (秒)
 *   onPhase      フェーズ変化コールバック
 *   theme        テーマの上書き
 *   goalCount    目標球数           default 5
 *   showCaption  キャプションバー表示 default true
 *   captions     string[4]          default 日本語キャプション
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Rect, Circle, Ellipse, Line, Path } from 'react-native-svg';
import { Text as SvgText } from 'react-native-svg';
import {
  CANVAS_W as W, CANVAS_H as H, BALL_R, DEFAULT_THEME,
  easing, clamp, useDrillTimeline,
  ZoneStake, ClubSideView,
  GolfBallTopDown, StreakHUD, CheckBadge, CaptionOverlay,
} from './drillPrimitives';

// ── ゲオメトリ ─────────────────────────────────────────────────
const GROUND_Y  = 640;           // 地面ライン Y
const BALL_X0   = 108;           // ボール発射地点 X
const BALL_Y0   = GROUND_Y - BALL_R;  // ボール発射地点 Y (602)
const ZONE_L_X  = 488;           // 左ゾーンステーク X
const ZONE_R_X  = 612;           // 右ゾーンステーク X
const ZONE_MID  = (ZONE_L_X + ZONE_R_X) / 2;  // 550
const STAKE_H   = 148;           // ステーク高さ
const PEAK_H    = 400;           // 弧の頂点の地面からの高さ

/** 放物線弧の座標 (t: 0=発射, 1=着地) */
function arcPos(t) {
  const x = BALL_X0 + t * (ZONE_MID - BALL_X0);
  const y = BALL_Y0 - 4 * PEAK_H * t * (1 - t);
  return { x, y };
}

// ── フェーズ境界 ───────────────────────────────────────────────
function phaseOf(time) {
  if (time < 2.2) return 0;   // ゾーン設定
  if (time < 4.0) return 1;   // アドレス
  if (time < 5.4) return 2;   // スイング / 発射
  return 3;                    // 弾道 → 着地 → ストリーク
}

const DEFAULT_CAPTIONS = [
  'ターゲットゾーンを地面に設定する',
  'ボールをアドレスする',
  'しっかりインパクト',
  '5球中4球以上をゾーン内に → クリア',
];

// タイミング定数 (秒)
const T_BACK_S  = 4.10;   // バックスイング開始
const T_BACK_E  = 4.65;   // バックスイング終了
const T_IMPACT  = 4.92;   // インパクト
const T_LAND    = 6.90;   // 着地
const T_LOOP_END = 10.50; // ループクロスフェード開始

// ─────────────────────────────────────────────────────────────
// サイドビューシーン  (view='top' の実体)
// ─────────────────────────────────────────────────────────────
function SideScene({ time, theme, goalCount }) {
  // ゾーンステーク
  const stakeL = clamp((time - 0.50) / 0.65, 0, 1);
  const stakeR = clamp((time - 1.10) / 0.65, 0, 1);

  // ゾーンラベル (両ステーク登場後 → スイング前に消える)
  const zoneLabelOp =
    clamp((time - 1.80) / 0.50, 0, 1) *
    (1 - clamp((time - 3.50) / 0.50, 0, 1));

  // ボール entry
  const ballEntry = clamp((time - 2.30) / 0.55, 0, 1);

  // ── クラブヘッド位置 (左右に平行移動) ──────────────────────
  let chX = BALL_X0, chY = BALL_Y0;
  if (time >= T_BACK_S && time < T_BACK_E) {
    // バックスイング: 左へ
    const p = easing.easeOutQuad((time - T_BACK_S) / (T_BACK_E - T_BACK_S));
    chX = BALL_X0 - p * 88;
  } else if (time >= T_BACK_E && time < T_IMPACT) {
    // ダウンスイング: 急速に戻る
    const p = easing.easeInCubic((time - T_BACK_E) / (T_IMPACT - T_BACK_E));
    chX = BALL_X0 - 88 * (1 - p);
  } else if (time >= T_IMPACT) {
    // フォロースルー: 右へ・やや上
    const p = clamp((time - T_IMPACT) / 0.45, 0, 1);
    chX = BALL_X0 + easing.easeOutQuad(p) * 98;
    chY = BALL_Y0 - p * 38;
  }

  const clubOp =
    clamp((time - 2.20) / 0.40, 0, 1) *
    (1 - clamp((time - (T_IMPACT + 0.40)) / 0.30, 0, 1));

  // ── ボール弧 ────────────────────────────────────────────────
  let ballX = BALL_X0, ballY = BALL_Y0;
  const ballVisible = time >= 2.30 && time < T_LOOP_END + 0.5;
  let rolled = 0;

  if (time >= T_IMPACT && time < T_LAND) {
    const p = easing.easeOutCubic(
      clamp((time - T_IMPACT) / (T_LAND - T_IMPACT), 0, 1)
    );
    const pos = arcPos(p);
    ballX = pos.x;
    ballY = pos.y;
    rolled = (ballX - BALL_X0) * 1.4;
  } else if (time >= T_LAND) {
    const pos = arcPos(1);
    ballX = pos.x;
    ballY = pos.y;
    rolled = (ballX - BALL_X0) * 1.4;
  }

  // 飛翔中の地面影
  const flightP =
    time >= T_IMPACT && time < T_LAND
      ? clamp((time - T_IMPACT) / (T_LAND - T_IMPACT), 0, 1)
      : 0;
  const shadowX  = BALL_X0 + flightP * (ZONE_MID - BALL_X0);
  const shadowSc = 1 - flightP * 0.70;
  const shadowOp = flightP > 0 ? 0.22 : 0;

  // 弧ガイドパス (飛翔中にうっすら表示)
  const arcGuideOp = flightP > 0 ? Math.min(flightP * 2.2, 0.32) : 0;
  const arcD = (() => {
    let d = '';
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const p = arcPos(t);
      d += i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
    }
    return d;
  })();

  // 着地フラッシュ
  const landLocal = time - T_LAND;
  const landRing  = landLocal >= 0 && landLocal < 1.30
    ? clamp(landLocal / 0.36, 0, 1) : 0;
  const landFade  = landLocal >= 0
    ? clamp(1 - (landLocal - 0.50) / 0.80, 0, 1) : 0;

  // ストリーク / ループフェード
  const streakFill = time > T_LAND + 0.55 && time < T_LOOP_END ? 1 : 0;
  const loopFade   = clamp((time - T_LOOP_END) / 0.50, 0, 1);

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      {/* 背景 */}
      <Rect x={0} y={0} width={W} height={H} fill={theme.bg} />

      {/* 地面ライン */}
      <Line x1={36} y1={GROUND_Y} x2={W - 36} y2={GROUND_Y}
        stroke={theme.ink} strokeWidth={2.8} strokeLinecap="round" opacity={0.9} />

      {/* ゾーン塗り (地面上) */}
      {stakeL > 0.2 && stakeR > 0.2 && (
        <Rect
          x={ZONE_L_X} y={GROUND_Y}
          width={ZONE_R_X - ZONE_L_X} height={14}
          fill={theme.success} rx={3}
          opacity={Math.min(stakeL, stakeR) * 0.22} />
      )}

      {/* 弧ガイド (飛翔中のみ) */}
      {arcGuideOp > 0 && (
        <Path d={arcD}
          stroke={theme.inkSoft} strokeWidth={1.8} fill="none"
          strokeDasharray="7 9" strokeLinecap="round"
          opacity={arcGuideOp} />
      )}

      {/* ゾーンステーク */}
      <ZoneStake x={ZONE_L_X} groundY={GROUND_Y} height={STAKE_H}
        progress={stakeL} theme={theme} />
      <ZoneStake x={ZONE_R_X} groundY={GROUND_Y} height={STAKE_H}
        progress={stakeR} theme={theme} />

      {/* ゾーンラベルピル */}
      {zoneLabelOp > 0.05 && (
        <G opacity={zoneLabelOp}>
          <Rect
            x={ZONE_L_X + 4} y={GROUND_Y - STAKE_H - 50}
            width={ZONE_R_X - ZONE_L_X - 8} height={38}
            rx={19} fill={theme.ink} />
          <SvgText
            x={ZONE_MID} y={GROUND_Y - STAKE_H - 26}
            textAnchor="middle" fontSize={15} fontWeight="800"
            fill={theme.bg} fontFamily={theme.fontJa}>ターゲット</SvgText>
        </G>
      )}

      {/* クラブ */}
      <ClubSideView
        headX={chX} headY={chY}
        shaftAngle={-28} shaftLength={310}
        opacity={clubOp} theme={theme} />

      {/* 飛翔中の地面影 */}
      {shadowOp > 0 && (
        <Ellipse
          cx={shadowX} cy={GROUND_Y + 5}
          rx={BALL_R * shadowSc} ry={5 * shadowSc}
          fill={theme.ink} opacity={shadowOp} />
      )}

      {/* ボール */}
      {ballVisible && (
        <GolfBallTopDown
          x={ballX} y={ballY}
          rolled={rolled} entry={ballEntry}
          theme={theme} />
      )}

      {/* 着地リング + チェックバッジ */}
      {landRing > 0 && (
        <G opacity={landFade}>
          <Circle cx={ZONE_MID} cy={GROUND_Y}
            r={28 + landRing * 66}
            stroke={theme.success} strokeWidth={3.5} fill="none"
            opacity={(1 - landRing) * 0.85} />
          {landLocal > 0.22 && (
            <CheckBadge
              x={ZONE_MID + 100} y={GROUND_Y - 80}
              opacity={clamp((landLocal - 0.22) / 0.28, 0, 1)}
              theme={theme} />
          )}
        </G>
      )}

      {/* StreakHUD */}
      <StreakHUD
        filled={streakFill} goal={goalCount}
        justPassed={time > T_LAND + 0.55 && time < T_LAND + 1.60}
        label="5球中4球以上をゾーン内へ"
        theme={theme} />

      {/* ループクロスフェード */}
      {loopFade > 0 && (
        <Rect x={0} y={0} width={W} height={H} fill={theme.bg} opacity={loopFade} />
      )}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────
// セットアップシーン — 後方視点 (view='setup')
// ─────────────────────────────────────────────────────────────
function SetupScene({ time, theme, goalCount }) {
  const VX   = W / 2;   // 消失点 X
  const VP_Y = 390;     // 消失点 Y (地平線)

  // 遠方のゾーンステーク (透視パース)
  const stakeP = clamp((time - 0.80) / 0.90, 0, 1);
  const DIST_L_X = VX - 50 * stakeP;
  const DIST_R_X = VX + 50 * stakeP;
  const DIST_Y   = VP_Y + 58;
  const DIST_H   = 72 * stakeP;

  // 手前のボール
  const ballEntry  = clamp((time - 2.30) / 0.55, 0, 1);
  const BALL_FG_Y  = 730;

  // 発射後: ボールが消失点方向に縮みながら飛ぶ
  let ballX = VX, ballY = BALL_FG_Y, ballScale = 1;
  const ballVisible = time >= 2.30 && time < T_LOOP_END + 0.5;

  if (time >= T_IMPACT && time < T_LAND) {
    const p = easing.easeOutCubic(
      clamp((time - T_IMPACT) / (T_LAND - T_IMPACT), 0, 1)
    );
    ballY    = BALL_FG_Y - p * (BALL_FG_Y - DIST_Y);
    ballScale = 1 - p * 0.88;
  } else if (time >= T_LAND) {
    ballY    = DIST_Y;
    ballScale = 0.12;
  }

  const bR = BALL_R * Math.max(ballScale, 0.05);

  // 着地
  const landLocal = time - T_LAND;
  const landFade  = landLocal >= 0
    ? clamp(1 - (landLocal - 0.50) / 0.80, 0, 1) : 0;
  const landRing  = landLocal >= 0 && landLocal < 1.30
    ? clamp(landLocal / 0.36, 0, 1) : 0;

  // ストリーク / ループ
  const streakFill = time > T_LAND + 0.55 && time < T_LOOP_END ? 1 : 0;
  const loopFade   = clamp((time - T_LOOP_END) / 0.50, 0, 1);

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <Rect x={0} y={0} width={W} height={H} fill={theme.bg} />

      {/* 地平線 */}
      <Line x1={0} y1={VP_Y} x2={W} y2={VP_Y}
        stroke={theme.inkFaint} strokeWidth={1.4} />

      {/* 透視パース線 (地面) */}
      <Line x1={80} y1={H - 30} x2={VX} y2={VP_Y}
        stroke={theme.inkFaint} strokeWidth={1.2} strokeDasharray="6 8" />
      <Line x1={W - 80} y1={H - 30} x2={VX} y2={VP_Y}
        stroke={theme.inkFaint} strokeWidth={1.2} strokeDasharray="6 8" />
      {/* センターライン */}
      <Line x1={VX} y1={VP_Y + 4} x2={VX} y2={H - 30}
        stroke={theme.inkSoft} strokeWidth={2} strokeDasharray="8 10" />

      {/* 遠方ゾーンステーク */}
      {stakeP > 0.10 && (
        <G>
          {/* 左 */}
          <Line x1={DIST_L_X} y1={DIST_Y} x2={DIST_L_X} y2={DIST_Y - DIST_H}
            stroke={theme.ink} strokeWidth={4 * stakeP} strokeLinecap="round" opacity={stakeP} />
          <Circle cx={DIST_L_X} cy={DIST_Y - DIST_H} r={6 * stakeP}
            fill={theme.ink} opacity={stakeP} />
          {/* 右 */}
          <Line x1={DIST_R_X} y1={DIST_Y} x2={DIST_R_X} y2={DIST_Y - DIST_H}
            stroke={theme.ink} strokeWidth={4 * stakeP} strokeLinecap="round" opacity={stakeP} />
          <Circle cx={DIST_R_X} cy={DIST_Y - DIST_H} r={6 * stakeP}
            fill={theme.ink} opacity={stakeP} />
          {/* ゾーン塗り */}
          <Rect x={DIST_L_X} y={DIST_Y} width={DIST_R_X - DIST_L_X} height={10}
            fill={theme.success} opacity={stakeP * 0.26} rx={2} />
        </G>
      )}

      {/* 手前ボール */}
      {ballVisible && bR > 0.5 && (
        <G transform={`translate(${ballX}, ${ballY})`}>
          <Ellipse cx={2} cy={bR * 0.5} rx={bR * 0.9} ry={bR * 0.22}
            fill={theme.ink} opacity={0.22 * ballScale} />
          <Circle cx={0} cy={0} r={bR}
            fill="#f6f1e2" stroke={theme.ink} strokeWidth={ballScale > 0.5 ? 1.6 : 0.8} />
          {ballScale > 0.3 && (
            <Ellipse cx={-bR * 0.36} cy={-bR * 0.42} rx={bR * 0.22} ry={bR * 0.11}
              fill="rgba(255,255,255,0.85)" />
          )}
        </G>
      )}

      {/* 着地リング */}
      {landRing > 0 && (
        <G opacity={landFade}>
          <Ellipse cx={VX} cy={DIST_Y}
            rx={28 + landRing * 52} ry={8 + landRing * 10}
            stroke={theme.success} strokeWidth={3} fill="none"
            opacity={(1 - landRing) * 0.82} />
          {landLocal > 0.25 && (
            <CheckBadge x={VX + 80} y={DIST_Y - 60}
              opacity={clamp((landLocal - 0.25) / 0.30, 0, 1)} theme={theme} />
          )}
        </G>
      )}

      <StreakHUD
        filled={streakFill} goal={goalCount}
        justPassed={time > T_LAND + 0.55 && time < T_LAND + 1.60}
        label="5球中4球以上をゾーン内へ"
        theme={theme} />

      {loopFade > 0 && (
        <Rect x={0} y={0} width={W} height={H} fill={theme.bg} opacity={loopFade} />
      )}
    </Svg>
  );
}

// ── Default export ─────────────────────────────────────────────
export default function OverDrillAnimation({
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

  const Scene = view === 'setup' ? SetupScene : SideScene;

  return (
    <View style={styles.container}>
      <Scene time={time} theme={theme} goalCount={goalCount} />
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

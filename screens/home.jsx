// screens/home.jsx — reworked
// Structure (top → bottom):
//  ① LATEST ROUND    — hero with animated sparkline + prominent BEST score
//  ② Round Recap CTA — only within 48h of last round
//  ③ Primary actions — record / practice
//  ④ 注力課題テスト結果 — best test record for primary focus challenge
//  ⑤ FOCUS · 3x2 matrix — 6 key stats with target & mini bar
//  ⑥ 今日のドリル     — drill progress + rotating tip
//  ⑦ Bridge → practice
//  ⑧ 分析を見る + DEV

function HomeScreen({ theme, persona, go }) {
  const p = persona;
  const s = p.stats;
  const t = p.targets;

  // --- real last round --------------------------------------------
  const lastRound = (() => {
    try {
      const arr = JSON.parse(localStorage.getItem('gs_rounds') || '[]');
      return arr[0] || null;
    } catch { return null; }
  })();
  const hoursSinceRound = lastRound?.endedAt
    ? (Date.now() - lastRound.endedAt) / (1000 * 60 * 60)
    : null;
  const withinWindow = hoursSinceRound != null && hoursSinceRound <= 48;

  const reopenComplete = (round) => {
    if (!round) return;
    window.__roundState = {
      course: {
        id: round.course?.id,
        name: round.course?.name || 'コース',
        par: round.course?.par || round.holes.reduce((a, h) => a + h.par, 0),
        holes: round.holes,
      },
      teeColor: round.teeColor,
      startSide: round.startSide,
      isHalf: round.isHalf,
      target: round.target,
      startedAt: round.startedAt,
      endedAt: round.endedAt,
      holes: round.holes,
      memo: round.memo || '',
      status: 'finalized',
    };
    go('round-complete');
  };

  // --- primary focus → challenge key ------------------------------
  const FOCUS_TO_CHALLENGE = {
    '3パット率':   'putt',
    'パット数':    'putt',
    'ボギーオン率': 'second',
    'パーオン率':  'second',
    'GIR距離別':   'second',
    'OB率':        'tee',
    '寄せワン率':  'approach',
  };
  const focusLabel = p.focus?.[0] || 'パーオン率';
  const primaryChallenge = FOCUS_TO_CHALLENGE[focusLabel] || 'putt';
  const primaryLib = window.DRILL_LIBRARY?.[primaryChallenge];

  // Best test result for primary challenge
  const testResult = (() => {
    try {
      const all = JSON.parse(localStorage.getItem('gs_test_results') || '[]');
      const forThis = all.filter(r => r.challengeKey === primaryChallenge);
      if (!forThis.length) return null;
      return forThis.reduce((b, r) => (r.pct > (b?.pct || 0) ? r : b), null);
    } catch { return null; }
  })();

  const goToTest = () => {
    window.__selectedDrillTop = primaryChallenge;
    window.__autoOpenTest = true;
    go('practice');
  };

  // --- latest/best/avg for sparkline ------------------------------
  const latest = p.rounds[0];
  const scores = p.rounds.map(r => r.score);
  const trend = [...scores].reverse(); // 古→新
  const latestIdx = trend.length - 1;
  const bestVal = Math.min(...trend);
  const bestIdx = trend.indexOf(bestVal);
  const avgScore = p.avgScore;
  const goalScore = parseInt(p.nextGoal.match(/平均\s*(\d+)/)?.[1] || '99', 10);

  // Sparkline geometry
  const spW = 260, spH = 70;
  const sMax = Math.max(...trend, goalScore + 2);
  const sMin = Math.min(...trend, goalScore - 2);
  const yFor = (v) => spH - ((v - sMin) / Math.max(1, sMax - sMin)) * spH;
  const sparkPoints = trend.map((v, i) => ({
    x: (i / Math.max(1, trend.length - 1)) * spW,
    y: yFor(v),
    v,
  }));
  const sparkPath = sparkPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const goalY = yFor(goalScore);
  const fillPathAboveGoal = `${sparkPath} L ${spW} ${goalY} L 0 ${goalY} Z`;
  const sparkPathLen = 680; // approximate; strokeDasharray will clip overflow

  // --- focus key for the drill section ----------------------------
  const drillFocusKey = p.focus[0];
  const tip = window.pickTip(drillFocusKey);
  const drill = window.FOCUS_DRILL_PROGRESS[drillFocusKey] || {};

  // --- helpers ----------------------------------------------------
  const labelEl = (txt, style = {}) => (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
      letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
      ...style,
    }}>{txt}</div>
  );
  const section = (mt = 24) => ({ marginTop: mt });
  const reverseSet = new Set(['threePutt', 'ob', 'avgPutt']);

  // Keyframes for sparkline + entrance animations
  const homeKeyframes = `
    @keyframes hmSparkDraw { from { stroke-dashoffset: 800; } to { stroke-dashoffset: 0; } }
    @keyframes hmFadeIn { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
    @keyframes hmPop    { 0% { opacity: 0; transform: scale(0.4); } 55% { opacity: 1; transform: scale(1.25); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes hmStarSpin { 0% { opacity: 0; transform: scale(0.3) rotate(-45deg); } 60% { opacity: 1; transform: scale(1.2) rotate(10deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
    @keyframes hmLatestPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.3); opacity: 0; } }
    @keyframes hmAreaFade { from { opacity: 0; } to { opacity: 0.16; } }
    @keyframes hmSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `;

  return (
    <div style={{
      padding: '0 20px 120px', color: theme.text,
      fontFamily: FONT.sans, letterSpacing: -0.1,
    }}>
      <style>{homeKeyframes}</style>

      {/* ① LATEST ROUND — hero with animated sparkline */}
      <div style={{ paddingTop: 10 }}>
        {labelEl('LATEST ROUND')}

        {/* BEST / LATEST prominent row */}
        <div style={{
          display: 'flex', alignItems: 'stretch', gap: 10, marginTop: 10,
        }}>
          {/* LATEST */}
          <div
            onClick={lastRound ? () => reopenComplete(lastRound) : undefined}
            style={{
              flex: 1, padding: '12px 14px',
              background: theme.surface, border: `1px solid ${theme.border}`,
              borderRadius: 8, cursor: lastRound ? 'pointer' : 'default',
              animation: 'hmSlideUp 450ms ease-out both',
            }}
          >
            <div style={{
              fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
              letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 600,
            }}>Latest</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <span style={{
                fontFamily: FONT.mono, fontSize: 32, fontWeight: 400, letterSpacing: -1, lineHeight: 1,
              }}>{lastRound?.total ?? latest.score}</span>
              <span style={{
                fontFamily: FONT.mono, fontSize: 13,
                color: (lastRound?.diff ?? latest.diff) > 0 ? theme.warn : theme.good,
              }}>{lastRound ? `${lastRound.diff >= 0 ? '+' : ''}${lastRound.diff}` : `+${latest.diff}`}</span>
            </div>
            <div style={{ fontSize: 10.5, color: theme.textSec, marginTop: 6, lineHeight: 1.4 }}>
              {lastRound
                ? `${new Date(lastRound.endedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`
                : latest.date}
              <br/>
              {lastRound ? (lastRound.course?.name || '') : latest.course}
            </div>
          </div>

          {/* BEST — gold hero */}
          <div style={{
            flex: 1, padding: '12px 14px',
            background: 'linear-gradient(135deg, #FFD980, #E5A83A)',
            color: '#1A1200', borderRadius: 8,
            position: 'relative', overflow: 'hidden',
            animation: 'hmSlideUp 500ms 120ms ease-out both',
            boxShadow: '0 4px 14px rgba(201,149,40,0.25)',
          }}>
            <div style={{
              position: 'absolute', top: 6, right: 8, opacity: 0.45,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24">
                <path d="M12 2 L14.5 9 L22 9 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2 9 L9.5 9 Z" fill="#1A1200"/>
              </svg>
            </div>
            <div style={{
              fontFamily: FONT.mono, fontSize: 9, letterSpacing: 0.8,
              textTransform: 'uppercase', fontWeight: 700, opacity: 0.75,
            }}>Your Level</div>
            <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, opacity: 0.8 }}>ベストスコア</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <span style={{
                fontFamily: FONT.mono, fontSize: 34, fontWeight: 500, letterSpacing: -1.2, lineHeight: 1,
              }}>{p.best}</span>
            </div>
            <div style={{ fontSize: 10.5, marginTop: 6, opacity: 0.7, lineHeight: 1.4 }}>
              this is you
            </div>
          </div>
        </div>

        {/* Sparkline — larger, animated, prominent best marker */}
        <div style={{
          marginTop: 10, padding: '14px 14px 10px',
          background: theme.surface, border: `1px solid ${theme.border}`,
          borderRadius: 8, animation: 'hmSlideUp 500ms 240ms ease-out both',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8,
          }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
              letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
            }}>直近 {trend.length} ラウンド</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <LegendDot color="#E5A83A" size={7} isStar/>
              <span style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textSec, letterSpacing: 0.3 }}>ベスト</span>
              <LegendDot color={theme.text} size={7}/>
              <span style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textSec, letterSpacing: 0.3 }}>直近</span>
            </div>
          </div>

          <svg viewBox={`0 -14 ${spW} ${spH + 28}`}
               preserveAspectRatio="none"
               style={{ width: '100%', height: spH + 14, overflow: 'visible' }}>
            {/* Gap fill (area between sparkline and goal line) */}
            <path d={fillPathAboveGoal} fill={theme.warn}
              style={{ animation: 'hmAreaFade 700ms 1000ms ease-out both', opacity: 0 }}/>

            {/* Target line */}
            <line x1={0} x2={spW} y1={goalY} y2={goalY}
              stroke={theme.textTer} strokeDasharray="3 4" strokeWidth={0.8}/>
            <text x={spW - 2} y={goalY - 5} fontSize={8} fill={theme.textSec}
              textAnchor="end" fontFamily={FONT.mono} letterSpacing={0.3}>
              目標 {goalScore}
            </text>

            {/* Animated spark path */}
            <path d={sparkPath} fill="none" stroke={theme.text} strokeWidth={1.6}
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={sparkPathLen}
              strokeDashoffset={sparkPathLen}
              style={{ animation: 'hmSparkDraw 1.2s 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards' }}/>

            {/* Non-best, non-latest dots */}
            {sparkPoints.map((p, i) => {
              if (i === bestIdx || i === latestIdx) return null;
              return (
                <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={theme.bg} stroke={theme.text} strokeWidth={1.3}
                  style={{
                    transformOrigin: `${p.x}px ${p.y}px`, transformBox: 'fill-box',
                    animation: `hmFadeIn 300ms ${700 + i * 90}ms both`,
                    opacity: 0,
                  }}/>
              );
            })}

            {/* Best — gold star */}
            {bestIdx >= 0 && (
              <g style={{
                transformOrigin: `${sparkPoints[bestIdx].x}px ${sparkPoints[bestIdx].y}px`, transformBox: 'fill-box',
                animation: 'hmStarSpin 700ms 1500ms cubic-bezier(0.16, 1, 0.3, 1) both',
                opacity: 0,
              }}>
                <circle cx={sparkPoints[bestIdx].x} cy={sparkPoints[bestIdx].y} r={9} fill="rgba(229,168,58,0.18)"/>
                <circle cx={sparkPoints[bestIdx].x} cy={sparkPoints[bestIdx].y} r={5.5} fill="#E5A83A" stroke="#B98520" strokeWidth={1.2}/>
                <text x={sparkPoints[bestIdx].x} y={sparkPoints[bestIdx].y - 12} fontSize={9}
                  fill="#B98520" textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} letterSpacing={0.4}>
                  ★ {bestVal}
                </text>
              </g>
            )}

            {/* Latest — ringed accent */}
            {latestIdx >= 0 && latestIdx !== bestIdx && (
              <g style={{
                transformOrigin: `${sparkPoints[latestIdx].x}px ${sparkPoints[latestIdx].y}px`, transformBox: 'fill-box',
                animation: 'hmFadeIn 400ms 1700ms both',
                opacity: 0,
              }}>
                <circle cx={sparkPoints[latestIdx].x} cy={sparkPoints[latestIdx].y} r={8} fill="none"
                  stroke={theme.text} strokeWidth={1.3} opacity={0.3}
                  style={{
                    transformOrigin: `${sparkPoints[latestIdx].x}px ${sparkPoints[latestIdx].y}px`, transformBox: 'fill-box',
                    animation: 'hmLatestPulse 1.8s 2100ms ease-out infinite',
                  }}/>
                <circle cx={sparkPoints[latestIdx].x} cy={sparkPoints[latestIdx].y} r={4} fill={theme.text}/>
                <text x={sparkPoints[latestIdx].x} y={sparkPoints[latestIdx].y + 16} fontSize={9}
                  fill={theme.textSec} textAnchor="middle" fontFamily={FONT.mono} letterSpacing={0.3}>
                  {sparkPoints[latestIdx].v}
                </text>
              </g>
            )}
          </svg>

          {/* Stats row under sparkline */}
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginTop: 10, paddingTop: 10, borderTop: `1px solid ${theme.border}`,
          }}>
            <div>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.5 }}>平均</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 14, fontWeight: 500, marginTop: 2 }}>{avgScore.toFixed(1)}</div>
            </div>
            <div>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.5 }}>目標</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 14, fontWeight: 500, marginTop: 2 }}>{goalScore}</div>
            </div>
            <div>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.5 }}>ベストとの差</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 14, fontWeight: 500, marginTop: 2, color: theme.warn }}>
                {(lastRound?.total ?? latest.score) - p.best >= 0 ? '+' : ''}
                {(lastRound?.total ?? latest.score) - p.best}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ② 48h Round Recap CTA — sits right below latest round */}
      {withinWindow && lastRound && (
        <div
          onClick={() => reopenComplete(lastRound)}
          style={{
            ...section(12), padding: '14px 14px',
            background: theme.text, color: theme.bg,
            borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
            animation: 'hmSlideUp 500ms 360ms ease-out both',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 9, opacity: 0.6,
              letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
            }}>Round Recap · {Math.max(1, Math.round(48 - hoursSinceRound))}h 残り</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4, letterSpacing: -0.1 }}>
              ラウンドお疲れ様でした！
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 4, lineHeight: 1.5 }}>
              今日の結果と、次に活かすポイントを見る
            </div>
          </div>
          <span style={{ fontFamily: FONT.mono, fontSize: 14, opacity: 0.6 }}>→</span>
        </div>
      )}

      {/* ③ Primary actions */}
      <div style={{ ...section(14), display: 'flex', gap: 6 }}>
        <button onClick={() => go('course-select')} style={{
          flex: 1, background: theme.text, color: theme.bg, border: 'none',
          padding: '12px 0', borderRadius: 6, fontFamily: FONT.sans,
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
        }}>＋ ラウンド記録</button>
        <button onClick={() => go('practice')} style={{
          flex: 1, background: 'transparent', color: theme.text,
          border: `1px solid ${theme.borderStrong}`,
          padding: '12px 0', borderRadius: 6, fontFamily: FONT.sans,
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
        }}>練習モード</button>
      </div>

      {/* ④ 注力課題のテスト結果 */}
      <div style={section(26)}>
        {labelEl('注力課題のテスト結果')}
        <FocusTestCard
          theme={theme}
          primaryLib={primaryLib}
          testResult={testResult}
          onGoToTest={goToTest}
        />
      </div>

      {/* ⑤ FOCUS 3x2 matrix */}
      <div style={section(26)}>
        {labelEl('FOCUS · 目標差分')}
        <div style={{
          marginTop: 10,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
        }}>
          {['boggyOn', 'parOn', 'fairway', 'upDown', 'threePutt', 'ob'].map((k, i) => (
            <MetricCell
              key={k}
              k={k}
              cur={s[k]} tgt={t[k]}
              reverse={reverseSet.has(k)}
              theme={theme}
              delay={i * 60}
            />
          ))}
        </div>
      </div>

      {/* ⑥ 今日のドリル */}
      <div style={section(24)}>
        {labelEl('今日のドリル')}
        <div style={{
          marginTop: 10, border: `1px solid ${theme.border}`, borderRadius: 8,
          padding: 14, background: theme.surface,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.2 }}>{drill.drill}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.textSec }}>
              {drill.done}/{drill.total}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 2, marginTop: 10 }}>
            {Array.from({ length: drill.total }, (_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 1,
                background: i < drill.done ? theme.text : theme.border,
              }}/>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, fontFamily: FONT.mono, fontSize: 10, color: theme.textSec }}>
            <span>命中 <span style={{ color: theme.text, fontWeight: 500 }}>{drill.accuracy}%</span></span>
            <span>連続 <span style={{ color: theme.text, fontWeight: 500 }}>{drill.streak}日</span></span>
          </div>

          {/* Rotating tip */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
              letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
            }}>{tip.tag} · 今日の一言</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: theme.text, letterSpacing: -0.1 }}>
              「{tip.q}」
            </div>
            <div style={{ fontSize: 11, color: theme.textSec, marginTop: 6 }}>— {tip.who}</div>
          </div>

          <button onClick={() => go('practice')} style={{
            marginTop: 12, width: '100%', background: 'transparent',
            color: theme.text, border: `1px solid ${theme.borderStrong}`,
            padding: '9px 0', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: FONT.sans,
          }}>このドリルを始める →</button>
        </div>
      </div>

      {/* ⑦ Bridge */}
      <div style={{
        ...section(14),
        padding: '12px 14px', border: `1px solid ${theme.border}`, borderRadius: 8,
        background: theme.surface, display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer',
      }} onClick={() => go('practice')}>
        <div style={{ width: 2, height: 28, background: theme.text }}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>この課題のドリル一覧へ</div>
          <div style={{ fontSize: 11, color: theme.textSec, marginTop: 1 }}>
            {drillFocusKey}を改善する · 条件別に分解
          </div>
        </div>
        <span style={{ fontFamily: FONT.mono, fontSize: 12, color: theme.textSec }}>→</span>
      </div>

      {/* Analysis */}
      <button onClick={() => go('analysis')} style={{
        marginTop: 24, width: '100%', background: 'transparent',
        color: theme.textSec, border: `1px solid ${theme.border}`,
        padding: '11px 0', borderRadius: 6, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', fontFamily: FONT.sans,
      }}>すべての分析を見る →</button>

      {/* DEV buttons */}
      <button onClick={() => go('animation-gallery')} style={{
        marginTop: 10, width: '100%', background: 'transparent',
        color: theme.textTer, border: `1px dashed ${theme.borderStrong}`,
        padding: '10px 0', borderRadius: 6, fontSize: 11, fontWeight: 500,
        cursor: 'pointer', fontFamily: FONT.mono, letterSpacing: 0.5,
      }}>DEV · ドリルアニメ方向性を見る →</button>
      <button onClick={() => go('drill-layout-gallery')} style={{
        marginTop: 6, width: '100%', background: 'transparent',
        color: theme.textTer, border: `1px dashed ${theme.borderStrong}`,
        padding: '10px 0', borderRadius: 6, fontSize: 11, fontWeight: 500,
        cursor: 'pointer', fontFamily: FONT.mono, letterSpacing: 0.5,
      }}>DEV · ドリルレイアウト比較 F/H →</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Legend dot (including star variant)
// ─────────────────────────────────────────────────────────
function LegendDot({ color, size = 6, isStar }) {
  if (isStar) {
    return (
      <svg width={size + 2} height={size + 2} viewBox="0 0 10 10"
        style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M5 0 L6.2 3.8 L10 4 L7 6.3 L8 10 L5 7.8 L2 10 L3 6.3 L0 4 L3.8 3.8 Z" fill={color}/>
      </svg>
    );
  }
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      borderRadius: '50%', background: color, verticalAlign: 'middle',
    }}/>
  );
}

// ─────────────────────────────────────────────────────────
// Focus test card — best record for primary challenge
// ─────────────────────────────────────────────────────────
function FocusTestCard({ theme, primaryLib, testResult, onGoToTest }) {
  if (!primaryLib) return null;
  const date = testResult
    ? new Date(testResult.ts).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
    : null;
  return (
    <div
      onClick={onGoToTest}
      style={{
        marginTop: 10, padding: '14px 14px',
        border: `1px solid ${theme.border}`, borderRadius: 8,
        background: theme.surface, cursor: 'pointer',
        animation: 'hmSlideUp 500ms 100ms ease-out both',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>
          {primaryLib.goal.metric}
        </div>
        <div style={{
          fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
          letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600,
        }}>Test</div>
      </div>

      {testResult ? (
        <>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 10,
          }}>
            <div>
              <div style={{
                fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
                letterSpacing: 0.5, textTransform: 'uppercase',
              }}>ベスト</div>
              <div style={{
                fontFamily: FONT.mono, fontSize: 30, fontWeight: 400, letterSpacing: -1,
                lineHeight: 1, marginTop: 2,
                color: testResult.passed ? theme.good : theme.text,
              }}>{testResult.pct}%</div>
            </div>
            <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
              {[1, 2, 3].map(n => (
                <svg key={n} width={18} height={18} viewBox="0 0 24 24">
                  <path
                    d="M12 2 L14.5 9 L22 9 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2 9 L9.5 9 Z"
                    fill={testResult.stars >= n ? '#FFB93D' : 'transparent'}
                    stroke={testResult.stars >= n ? '#D49622' : theme.border}
                    strokeWidth={1.5} strokeLinejoin="round"/>
                </svg>
              ))}
            </div>
            <div style={{ flex: 1 }}/>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
                letterSpacing: 0.5, textTransform: 'uppercase',
              }}>目標</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 16, fontWeight: 500, marginTop: 2, color: theme.text }}>
                {primaryLib.goal.target}%
              </div>
            </div>
          </div>
          <div style={{
            fontSize: 11, color: theme.textSec, marginTop: 10, paddingTop: 10,
            borderTop: `1px solid ${theme.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>
              {date} · {testResult.successes}/{testResult.attempts}
              {testResult.passed && <span style={{ color: theme.good, marginLeft: 6 }}>· 目標達成</span>}
            </span>
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.text, fontWeight: 600 }}>
              もう一度 →
            </span>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: theme.textSec, marginTop: 8, lineHeight: 1.6 }}>
            目標 {primaryLib.goal.targetLabel}。まずは挑戦して現状を測ろう。
          </div>
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: theme.text, color: theme.bg, borderRadius: 6,
            fontSize: 13, fontWeight: 600, textAlign: 'center',
            letterSpacing: -0.1,
          }}>
            挑戦する →
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Metric cell — small card in the 3x2 focus matrix
// ─────────────────────────────────────────────────────────
function MetricCell({ k, cur, tgt, reverse, theme, delay }) {
  const meta = window.STAT_META?.[k];
  if (!meta || cur == null || tgt == null) return null;
  const gap = reverse ? (cur - tgt) : (tgt - cur);
  const ok = gap <= 0;
  const pct = Math.max(0, Math.min(100, reverse
    ? (tgt / Math.max(cur, 0.01)) * 100
    : (cur / tgt) * 100));
  const dispCur = meta.decimals ? cur.toFixed(meta.decimals) : cur;
  const dispTgt = meta.decimals ? tgt.toFixed(meta.decimals) : tgt;
  return (
    <div style={{
      padding: '10px 10px',
      border: `1px solid ${theme.border}`,
      borderRadius: 6,
      background: theme.surface,
      animation: `hmSlideUp 400ms ${delay}ms ease-out both`,
      minWidth: 0,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: theme.text, letterSpacing: -0.1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{meta.label}</div>

      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 6,
      }}>
        <span style={{
          fontFamily: FONT.mono, fontSize: 18, fontWeight: 500, letterSpacing: -0.5,
          color: ok ? theme.good : theme.text, lineHeight: 1,
        }}>{dispCur}</span>
        <span style={{
          fontFamily: FONT.mono, fontSize: 10, color: theme.textSec,
        }}>{meta.unit}</span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, marginTop: 6,
      }}>
        <div style={{
          flex: 1, height: 3, background: theme.border, borderRadius: 1, overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: ok ? theme.good : theme.text,
            transition: 'width .5s',
          }}/>
        </div>
      </div>

      <div style={{
        fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, marginTop: 4,
        letterSpacing: 0.3,
      }}>
        {ok ? '達成' : reverse ? `目標 ${dispTgt} / −${Math.abs(gap).toFixed(meta.decimals || 0)}` : `目標 ${dispTgt} / −${Math.abs(gap).toFixed(meta.decimals || 0)}`}
      </div>
    </div>
  );
}

window.HomeScreen = HomeScreen;

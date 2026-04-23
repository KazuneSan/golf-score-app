// screens/home.jsx — Linear v2 (minimal)
// Structure (top → bottom):
//  ① LATEST ROUND    — score + animated sparkline with gold BEST accent
//  ② Round Recap CTA — within 48h of last round only
//  ③ Primary actions — record / practice
//  ④ 注力課題のテスト結果 — replaces "次の目標"
//  ⑤ FOCUS · 3x2 matrix — 6 metrics, minimal grid
//  ⑥ 今日のドリル
//  ⑦ Bridge
//  ⑧ 分析 + DEV

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
    '3パット率': 'putt',  'パット数': 'putt',
    'ボギーオン率': 'second', 'パーオン率': 'second', 'GIR距離別': 'second',
    'OB率': 'tee',
    '寄せワン率': 'approach',
  };
  const focusLabel = p.focus?.[0] || 'パーオン率';
  const primaryChallenge = FOCUS_TO_CHALLENGE[focusLabel] || 'putt';
  const primaryLib = window.DRILL_LIBRARY?.[primaryChallenge];
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

  // Metric-key → related challenge key (for Focus matrix deep-linking)
  const METRIC_TO_CHALLENGE = {
    boggyOn:   'second',  // ボギーオン率
    parOn:     'second',  // パーオン率
    fairway:   'tee',     // FWキープ率 (tee shot skill)
    upDown:    'approach',// 寄せワン率
    threePutt: 'putt',    // 3パット率
    ob:        'tee',     // OB率
    avgPutt:   'putt',
    sandSave:  'approach',
  };
  const goToMetricDrills = (metricKey) => {
    const ch = METRIC_TO_CHALLENGE[metricKey] || primaryChallenge;
    window.__selectedDrillTop = ch;
    // Do NOT set autoOpenTest — we want the drill list (not the test)
    go('practice');
  };

  // --- derived ----------------------------------------------------
  const latest = p.rounds[0];
  const scores = p.rounds.map(r => r.score);
  const trend = [...scores].reverse(); // 古→新
  const latestIdx = trend.length - 1;
  const bestVal = Math.min(...trend);
  const bestIdx = trend.indexOf(bestVal);
  const avgScore = p.avgScore;
  const goalScore = parseInt(p.nextGoal.match(/平均\s*(\d+)/)?.[1] || '99', 10);

  const drillFocusKey = p.focus[0];
  const tip = window.pickTip(drillFocusKey);
  const drill = window.FOCUS_DRILL_PROGRESS[drillFocusKey] || {};

  const reverseSet = new Set(['threePutt', 'ob', 'avgPutt']);

  // Sparkline geometry
  const spW = 170, spH = 44;
  const sMax = Math.max(...trend, goalScore + 2);
  const sMin = Math.min(...trend, goalScore - 2);
  const yFor = (v) => spH - ((v - sMin) / Math.max(1, sMax - sMin)) * spH;
  const sparkPoints = trend.map((v, i) => ({
    x: (i / Math.max(1, trend.length - 1)) * spW,
    y: yFor(v), v,
  }));
  const sparkPath = sparkPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const goalY = yFor(goalScore);

  // Keep gold reserved only for the tiny best dot on the sparkline, else monochrome.
  const BEST_DOT = '#D49622';
  const BEST_DOT_SOFT = '#E5A83A';

  // Display values (prefer real last round if available)
  const showScore = lastRound?.total ?? latest.score;
  const showDiff = lastRound?.diff ?? latest.diff;
  const showDate = lastRound
    ? new Date(lastRound.endedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
    : latest.date;
  const showCourse = lastRound ? (lastRound.course?.name || '') : latest.course;

  // --- helpers ----------------------------------------------------
  const label = (txt, style = {}) => (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
      letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
      ...style,
    }}>{txt}</div>
  );
  const section = (mt = 24) => ({ marginTop: mt });

  // Subtle keyframes — path draw + fade only (no showy effects)
  const homeKeyframes = `
    @keyframes hmSparkDraw { from { stroke-dashoffset: 640; } to { stroke-dashoffset: 0; } }
    @keyframes hmFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes hmDotIn { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
  `;

  return (
    <div style={{
      padding: '0 20px 120px', color: theme.text,
      fontFamily: FONT.sans, letterSpacing: -0.1,
    }}>
      <style>{homeKeyframes}</style>

      {/* ① SCORE — BEST as hero (monochrome), LATEST in a dedicated section below */}
      <div
        style={{ ...section(4), cursor: lastRound ? 'pointer' : 'default' }}
        onClick={lastRound ? () => reopenComplete(lastRound) : undefined}
      >
        {label('ベストスコア', { paddingTop: 6 })}

        {/* BEST hero + sparkline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{
                fontFamily: FONT.mono, fontSize: 44, fontWeight: 400, letterSpacing: -1.6,
                color: theme.text, lineHeight: 1,
              }}>{p.best}</span>
              <span style={{
                fontFamily: FONT.mono, fontSize: 12,
                color: theme.textSec, letterSpacing: 0.3,
              }}>
                ave. {avgScore.toFixed(1)}
              </span>
            </div>
          </div>
          <div style={{ flex: 1, maxWidth: 180 }}>
            <svg viewBox={`0 -10 ${spW} ${spH + 16}`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: spH + 10, overflow: 'visible' }}>
              {/* Target line */}
              <line x1={0} x2={spW} y1={goalY} y2={goalY}
                stroke={theme.textTer} strokeDasharray="2 3" strokeWidth={0.7}/>
              <text x={spW} y={goalY - 3} fontSize={7} fill={theme.textTer}
                textAnchor="end" fontFamily={FONT.mono}>目標 {goalScore}</text>

              {/* Animated spark path */}
              <path d={sparkPath} fill="none" stroke={theme.text} strokeWidth={1.3}
                strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={640}
                strokeDashoffset={640}
                style={{ animation: 'hmSparkDraw 1.1s 200ms cubic-bezier(0.22,1,0.36,1) forwards' }}/>

              {/* Regular dots (skip best + latest) */}
              {sparkPoints.map((pt, i) => {
                if (i === bestIdx || i === latestIdx) return null;
                return (
                  <circle key={i} cx={pt.x} cy={pt.y} r={1.5}
                    fill={theme.bg} stroke={theme.text} strokeWidth={1}
                    style={{
                      transformOrigin: `${pt.x}px ${pt.y}px`, transformBox: 'fill-box',
                      animation: `hmDotIn 300ms ${700 + i * 80}ms both`, opacity: 0,
                    }}/>
                );
              })}

              {/* BEST — subtle gold dot accent (only thing colored on the chart) */}
              {bestIdx >= 0 && (
                <g style={{
                  transformOrigin: `${sparkPoints[bestIdx].x}px ${sparkPoints[bestIdx].y}px`,
                  transformBox: 'fill-box',
                  animation: 'hmDotIn 400ms 1200ms both', opacity: 0,
                }}>
                  <circle cx={sparkPoints[bestIdx].x} cy={sparkPoints[bestIdx].y} r={3.2}
                    fill={BEST_DOT_SOFT} stroke={BEST_DOT} strokeWidth={0.8}/>
                </g>
              )}

              {/* LATEST — filled accent dot */}
              {latestIdx >= 0 && latestIdx !== bestIdx && (
                <circle cx={sparkPoints[latestIdx].x} cy={sparkPoints[latestIdx].y} r={2.4}
                  fill={theme.text} stroke={theme.bg} strokeWidth={1}
                  style={{
                    transformOrigin: `${sparkPoints[latestIdx].x}px ${sparkPoints[latestIdx].y}px`,
                    transformBox: 'fill-box',
                    animation: 'hmDotIn 400ms 1400ms both', opacity: 0,
                  }}/>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* ①b LATEST ROUND — now its own section, subtle */}
      <div
        style={{ ...section(20), cursor: lastRound ? 'pointer' : 'default' }}
        onClick={lastRound ? () => reopenComplete(lastRound) : undefined}
      >
        {label('LATEST ROUND')}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8,
        }}>
          <span style={{
            fontFamily: FONT.mono, fontSize: 22, fontWeight: 500, letterSpacing: -0.6,
            color: theme.text,
          }}>{showScore}</span>
          <span style={{
            fontFamily: FONT.mono, fontSize: 12,
            color: showDiff > 0 ? theme.textSec : theme.good,
          }}>{showDiff >= 0 ? '+' : ''}{showDiff}</span>
          <span style={{ flex: 1 }}/>
          <span style={{ fontSize: 11, color: theme.textSec }}>
            {showDate} · {showCourse}
          </span>
        </div>
      </div>

      {/* ② 48h CTA — subtle (secondary) so it doesn't compete with "+ラウンド記録" */}
      {withinWindow && lastRound && (
        <div
          onClick={() => reopenComplete(lastRound)}
          style={{
            ...section(16), padding: '12px 14px',
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderLeft: `3px solid ${theme.text}`,
            borderRadius: 6, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
              letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
            }}>Round Recap · 残り {Math.max(1, Math.round(48 - hoursSinceRound))}h</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 3, letterSpacing: -0.1, color: theme.text }}>
              ラウンドお疲れ様でした
            </div>
            <div style={{ fontSize: 10.5, color: theme.textSec, marginTop: 3, lineHeight: 1.5 }}>
              今日の結果と、次に活かすポイントを振り返る
            </div>
          </div>
          <span style={{ fontFamily: FONT.mono, fontSize: 12, color: theme.textSec }}>→</span>
        </div>
      )}

      {/* ③ Primary actions */}
      <div style={{ ...section(14), display: 'flex', gap: 6 }}>
        <button onClick={() => go('course-select')} style={{
          flex: 1, background: theme.text, color: theme.bg, border: 'none',
          padding: '11px 0', borderRadius: 6, fontFamily: FONT.sans,
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
        }}>＋ ラウンド記録</button>
        <button onClick={() => go('practice')} style={{
          flex: 1, background: 'transparent', color: theme.text,
          border: `1px solid ${theme.borderStrong}`,
          padding: '11px 0', borderRadius: 6, fontFamily: FONT.sans,
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
        }}>練習モード</button>
      </div>

      {/* ④ 注力課題のテスト結果 — matches "次の目標" card style */}
      <div
        onClick={goToTest}
        style={{
          ...section(26), border: `1px solid ${theme.border}`,
          borderRadius: 8, padding: 14, background: theme.surface,
          cursor: 'pointer',
        }}
      >
        {label('注力課題のテスト結果')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>
            {primaryLib?.goal?.metric || focusLabel}
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 12, color: theme.text }}>
            {testResult ? (
              <>
                <span style={{ color: testResult.passed ? theme.good : theme.text, fontWeight: 600 }}>
                  {testResult.pct}%
                </span>
                <span style={{ color: theme.textTer, marginLeft: 6 }}>
                  / {primaryLib?.goal?.target}%
                </span>
              </>
            ) : (
              <span style={{ color: theme.textTer }}>未挑戦</span>
            )}
          </div>
        </div>

        {/* Stars + progress bar */}
        {testResult ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <div style={{ flex: 1, height: 3, background: theme.border, borderRadius: 1, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (testResult.pct / (primaryLib?.goal?.target || 100)) * 100)}%`,
                  background: testResult.passed ? theme.good : theme.text,
                }}/>
              </div>
              <div style={{ display: 'flex', gap: 1 }}>
                {[1, 2, 3].map(n => (
                  <svg key={n} width="11" height="11" viewBox="0 0 24 24">
                    <path d="M12 2 L14.5 9 L22 9 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2 9 L9.5 9 Z"
                      fill={testResult.stars >= n ? '#E5A83A' : 'transparent'}
                      stroke={testResult.stars >= n ? '#D49622' : theme.border}
                      strokeWidth={1.5} strokeLinejoin="round"/>
                  </svg>
                ))}
              </div>
            </div>
            <div style={{
              fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
              marginTop: 6, letterSpacing: 0.3,
            }}>
              {new Date(testResult.ts).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
              {' · '}{testResult.successes}/{testResult.attempts}
              {testResult.passed && <span style={{ color: theme.good, marginLeft: 4 }}>· 目標達成</span>}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 8, lineHeight: 1.55 }}>
            目標 {primaryLib?.goal?.targetLabel || '—'}。まずは現状を測ろう。
          </div>
        )}
      </div>

      {/* ⑤ FOCUS 3×2 — tap a cell to open its related challenge's drills */}
      <div style={section(26)}>
        {label('FOCUS · 目標差分')}
        <div style={{
          fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer,
          marginTop: 4, letterSpacing: 0.3,
        }}>
          気になる指標をタップ → 関連ドリルへ
        </div>
        <div style={{
          marginTop: 10,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          columnGap: 14, rowGap: 14,
        }}>
          {['boggyOn', 'parOn', 'fairway', 'upDown', 'threePutt', 'ob'].map(k => (
            <MetricCell key={k} k={k}
              cur={s[k]} tgt={t[k]}
              reverse={reverseSet.has(k)}
              theme={theme}
              onClick={() => goToMetricDrills(k)}/>
          ))}
        </div>
      </div>

      {/* ⑥ 今日のドリル */}
      <div style={section(26)}>
        {label('今日のドリル')}
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
        marginTop: 20, width: '100%', background: 'transparent',
        color: theme.textSec, border: `1px solid ${theme.border}`,
        padding: '11px 0', borderRadius: 6, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', fontFamily: FONT.sans,
      }}>すべての分析を見る →</button>

      {/* Settings */}
      <button onClick={() => go('settings')} style={{
        marginTop: 10, width: '100%', background: 'transparent',
        color: theme.textSec, border: `1px solid ${theme.border}`,
        padding: '11px 0', borderRadius: 6, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', fontFamily: FONT.sans,
      }}>設定 →</button>

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
// Metric cell — minimal, tappable to jump to related drills
// ─────────────────────────────────────────────────────────
function MetricCell({ k, cur, tgt, reverse, theme, onClick }) {
  const meta = window.STAT_META?.[k];
  if (!meta || cur == null || tgt == null) return null;
  const gap = reverse ? (cur - tgt) : (tgt - cur);
  const ok = gap <= 0;
  const pct = Math.max(0, Math.min(100, reverse
    ? (tgt / Math.max(cur, 0.01)) * 100
    : (cur / tgt) * 100));
  const dispCur = meta.decimals ? cur.toFixed(meta.decimals) : cur;
  const dispTgt = meta.decimals ? tgt.toFixed(meta.decimals) : tgt;
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      style={{
        minWidth: 0, cursor: onClick ? 'pointer' : 'default',
        background: 'transparent', border: 'none', padding: 0, textAlign: 'left',
        fontFamily: FONT.sans, color: theme.text,
        position: 'relative',
      }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <div style={{
          fontSize: 11, color: theme.textSec, letterSpacing: -0.1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          flex: 1, minWidth: 0,
        }}>{meta.label}</div>
        {onClick && (
          <span style={{
            fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.2,
          }}>›</span>
        )}
      </div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4,
      }}>
        <span style={{
          fontFamily: FONT.mono, fontSize: 18, fontWeight: 500, letterSpacing: -0.5,
          color: ok ? theme.good : theme.text, lineHeight: 1,
        }}>{dispCur}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textSec }}>{meta.unit}</span>
      </div>
      <div style={{
        height: 2, background: theme.border, borderRadius: 1, overflow: 'hidden',
        marginTop: 6,
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: ok ? theme.good : theme.text,
          transition: 'width .4s',
        }}/>
      </div>
      <div style={{
        fontFamily: FONT.mono, fontSize: 9, color: ok ? theme.good : theme.textTer,
        marginTop: 4, letterSpacing: 0.3,
      }}>
        {ok ? '達成' : `→ ${dispTgt}${meta.unit}`}
      </div>
    </Wrapper>
  );
}

window.HomeScreen = HomeScreen;

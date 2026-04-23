// screens/drill-test.jsx — game-like "Clubhouse Challenge" test for each challenge.
//
// Flow: intro → active → result
// Per-challenge test config:
//   putt     → 3m パット × 10球 · カップイン率
//   second   → 140-170Y セカンド × 6球 · グリーンオン率
//   tee      → ティーショット × 6球 · フェアウェイキープ率
//   approach → 30Y アプローチ × 8球 · 寄せワン圏内率
//
// Persistence: all results → localStorage `gs_test_results`.
//   Entry: { challengeKey, ts, attempts, successes, pct, passed, stars }

const TEST_CONFIG = {
  putt:     { attempts: 10, action: '3m パット',         verb: 'カップイン',        short: 'IN',   icon: '⛳' },
  second:   { attempts: 6,  action: '140-170Y セカンド', verb: 'グリーンオン',      short: 'ON',   icon: '🏁' },
  tee:      { attempts: 6,  action: 'ティーショット',     verb: 'フェアウェイキープ', short: 'KEEP', icon: '🎯' },
  approach: { attempts: 8,  action: '30Y アプローチ',    verb: '寄せワン圏内',      short: 'OK',   icon: '🎯' },
};

// mode='test' (default, clubhouse challenge) | 'drill' (single drill play)
function DrillTestScreen({ theme, challengeKey, drillId, mode = 'test', onBack, onDone }) {
  const lib = (window.DRILL_LIBRARY || {})[challengeKey];
  const base = TEST_CONFIG[challengeKey] || TEST_CONFIG.putt;

  if (!lib) {
    return (
      <div style={{ padding: 40, color: theme.text, fontFamily: FONT.sans }}>
        この課題のセッションはまだ未整備です。
        <TapBtn theme={theme} variant="ghost" onClick={onBack} style={{ marginTop: 20 }}>戻る</TapBtn>
      </div>
    );
  }

  // Resolve drill + condition (drill mode only)
  const { drill, cond, drillIdxInCond, totalDrillsInCond, orderInChallenge } = React.useMemo(() => {
    if (mode !== 'drill' || !drillId) return {};
    let flatOrder = 0;
    for (const c of lib.conditions) {
      for (let i = 0; i < c.drills.length; i++) {
        if (c.drills[i].id === drillId) {
          return {
            drill: c.drills[i],
            cond: c,
            drillIdxInCond: i,
            totalDrillsInCond: c.drills.length,
            orderInChallenge: flatOrder + 1,
          };
        }
        flatOrder++;
      }
    }
    return {};
  }, [mode, drillId, lib]);

  // Session config — tailored per mode
  const cfg = mode === 'drill' && drill
    ? {
        ...base,
        attempts: 6,  // drill sessions are shorter
        kicker: `Drill · ${cond.title}`,
        title: drill.name,
        subtitle: drill.detail,
        benchmark: cond.why,
        storageKey: 'gs_drill_sessions',
        storageExtra: { challengeKey, drillId },
        isDrill: true,
      }
    : {
        ...base,
        kicker: 'Goal Test',
        title: `${lib.goal.metric}`,
        subtitle: `${base.action} × ${base.attempts}球`,
        benchmark: lib.goal.benchmark,
        storageKey: 'gs_test_results',
        storageExtra: { challengeKey },
        isDrill: false,
      };

  const target = lib.goal.target;
  const targetLabel = lib.goal.targetLabel;

  const [phase, setPhase] = React.useState('intro');
  const [records, setRecords] = React.useState([]); // array of true/false
  const [lastResult, setLastResult] = React.useState(null);

  const bestRecord = React.useMemo(() => {
    try {
      const all = JSON.parse(localStorage.getItem(cfg.storageKey) || '[]');
      const forThis = all.filter(r => {
        if (r.challengeKey !== challengeKey) return false;
        if (cfg.isDrill && r.drillId !== drillId) return false;
        return true;
      });
      if (forThis.length === 0) return null;
      return forThis.reduce((b, r) => (r.pct > (b?.pct || 0) ? r : b), null);
    } catch { return null; }
  }, [challengeKey, drillId, phase, cfg.storageKey, cfg.isDrill]);

  const startTest = () => {
    setRecords([]);
    setPhase('active');
  };

  const recordAttempt = (success) => {
    setRecords(prev => {
      const next = [...prev, success];
      if (next.length >= cfg.attempts) {
        // compute final
        const succ = next.filter(Boolean).length;
        const pct = Math.round((succ / cfg.attempts) * 100);
        const passed = pct >= target;
        const stars = pct >= target + 10 ? 3 : passed ? 2 : 1;
        const prevBestPct = bestRecord?.pct ?? 0;
        const newBest = pct > prevBestPct;
        const entry = {
          challengeKey, ts: Date.now(),
          attempts: cfg.attempts, successes: succ,
          pct, passed, stars,
          ...cfg.storageExtra,
        };
        try {
          const all = JSON.parse(localStorage.getItem(cfg.storageKey) || '[]');
          all.unshift(entry);
          localStorage.setItem(cfg.storageKey, JSON.stringify(all.slice(0, 500)));
        } catch { /* noop */ }
        setLastResult({ ...entry, newBest, prevBestPct, records: next });
        setTimeout(() => setPhase('result'), 350);
      }
      return next;
    });
  };

  const retry = () => {
    setRecords([]);
    setLastResult(null);
    setPhase('intro');
  };

  // Keyframes shared by all phases
  const keyframes = `
    @keyframes dtFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes dtFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes dtPop    { 0% { opacity: 0; transform: scale(0.6); } 60% { opacity: 1; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes dtFlash  { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes dtPulse  { 0%,100% { box-shadow: 0 0 0 0 rgba(250,250,250,0.45); } 50% { box-shadow: 0 0 0 12px rgba(250,250,250,0); } }
    @keyframes dtShake  { 0%,100%{transform:translateX(0);} 20%{transform:translateX(-4px);} 40%{transform:translateX(4px);} 60%{transform:translateX(-3px);} 80%{transform:translateX(3px);} }
    @keyframes dtStarIn { 0% { opacity: 0; transform: scale(0.3) rotate(-30deg); } 60% { opacity: 1; transform: scale(1.25) rotate(5deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
    @keyframes dtBurst  { 0% { transform: translate(-50%, -50%) rotate(0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(calc(-50% + var(--x, 0)), calc(-50% + var(--y, 0))) rotate(720deg); opacity: 0; } }
    @keyframes dtDrawCheck { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }
    @keyframes dtStreakFlame { 0%, 100% { transform: scale(1) rotate(0); } 50% { transform: scale(1.15) rotate(4deg); } }
    @keyframes dtBarFill { from { width: 0%; } }
  `;

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      color: theme.text, fontFamily: FONT.sans, position: 'relative',
      background: theme.bg,
    }}>
      <style>{keyframes}</style>
      <div style={{ padding: '4px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, color: theme.textSec, fontSize: 13,
        }}>{Icon.chevL(theme.textSec, 16)} 戻る</button>
        <div style={{
          fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
          letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600,
        }}>{cfg.isDrill ? 'Drill Session' : 'Clubhouse Challenge'}</div>
        <div style={{ width: 40 }}/>
      </div>

      {phase === 'intro' && <IntroPhase theme={theme} lib={lib} cfg={cfg} bestRecord={bestRecord}
        drill={drill} cond={cond} orderInChallenge={orderInChallenge}
        onStart={startTest}/>}
      {phase === 'active' && <ActivePhase theme={theme} lib={lib} cfg={cfg} records={records}
        target={target} onTap={recordAttempt}/>}
      {phase === 'result' && lastResult && <ResultPhase theme={theme} lib={lib} cfg={cfg}
        result={lastResult} target={target} targetLabel={targetLabel}
        onRetry={retry} onDone={onDone}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// INTRO phase
// ─────────────────────────────────────────────────────────
function IntroPhase({ theme, lib, cfg, bestRecord, drill, cond, orderInChallenge, onStart }) {
  const bestDate = bestRecord
    ? new Date(bestRecord.ts).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })
    : null;

  // Drill-mode: fetch rich details (animation variant + steps / mistakes / checkpoints)
  const details = cfg.isDrill && drill
    ? (window.DRILL_DETAILS || {})[drill.id]
    : null;
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailTab, setDetailTab] = React.useState('steps');

  // Narration ticker (drill mode only, synced with animation)
  const steps = details?.steps || [];
  const [narIdx, setNarIdx] = React.useState(0);
  React.useEffect(() => {
    if (!cfg.isDrill || steps.length === 0) return;
    const iv = setInterval(() => setNarIdx(i => (i + 1) % steps.length), 2800);
    return () => clearInterval(iv);
  }, [cfg.isDrill, steps.length]);

  return (
    <div style={{ flex: 1, padding: '8px 20px 30px', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <div style={{
        fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
        letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 500,
        animation: 'dtFadeUp 400ms 100ms both',
      }}>{cfg.kicker}</div>

      <div style={{
        fontSize: cfg.isDrill ? 24 : 26, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.2,
        marginTop: 10, marginBottom: 6,
        animation: 'dtPop 550ms 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
        {cfg.isDrill ? cfg.title : <>{cfg.title}<br/>テスト</>}
      </div>

      {cfg.isDrill ? (
        <div style={{
          fontSize: 12.5, color: theme.textSec, lineHeight: 1.6, marginBottom: 12,
          animation: 'dtFadeUp 400ms 400ms both',
        }}>
          {cfg.subtitle}
        </div>
      ) : (
        <div style={{
          fontSize: 12.5, color: theme.textSec, lineHeight: 1.6, marginBottom: 20,
          animation: 'dtFadeUp 400ms 400ms both',
        }}>
          {cfg.action} を <b style={{ color: theme.text }}>{cfg.attempts}球</b> 打って、
          {cfg.verb} の回数をカウント。<br/>
          目標は <b style={{ color: theme.text }}>{lib.goal.target}% ({lib.goal.targetLabel})</b>。
        </div>
      )}

      {/* Drill-mode: animated preview + collapsible details */}
      {cfg.isDrill && details?.setup && window.DrillDiagram && (
        <div style={{
          marginBottom: 12, border: `1px solid ${theme.border}`, borderRadius: 8,
          overflow: 'hidden', background: theme.surface,
          animation: 'dtFadeUp 500ms 500ms both',
        }}>
          <div style={{ aspectRatio: '320/260', background: theme.surfaceAlt }}>
            {React.createElement(window.DrillDiagram, { variant: details.setup, theme, view: 'top' })}
          </div>
          {/* Narration ticker (synced) */}
          {steps.length > 0 && (
            <div
              key={narIdx}
              style={{
                display: 'flex', gap: 10, alignItems: 'center',
                padding: '10px 14px', borderTop: `1px solid ${theme.border}`,
                animation: 'dtFadeUp 320ms ease-out both',
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: theme.text, color: theme.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT.mono, fontSize: 11, fontWeight: 700,
              }}>{steps[narIdx].n}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: -0.1 }}>{steps[narIdx].t}</div>
                <div style={{
                  fontSize: 10.5, color: theme.textSec, marginTop: 2, lineHeight: 1.45,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>{steps[narIdx].d}</div>
              </div>
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {steps.map((_, i) => (
                  <div key={i} style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: i === narIdx ? theme.text : theme.border,
                    transition: 'background .2s',
                  }}/>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsible "詳しい解説" — only in drill mode and when details exist */}
      {cfg.isDrill && details && (() => {
        const hasSteps = (details.steps || []).length > 0;
        const hasMistakes = (details.mistakes || []).length > 0;
        const hasCheck = (details.checkpoints || []).length > 0;
        const tabs = [
          hasSteps    && { k: 'steps',    label: '手順',   count: details.steps.length },
          hasMistakes && { k: 'mistakes', label: 'ミス',   count: details.mistakes.length },
          hasCheck    && { k: 'check',    label: 'チェック', count: details.checkpoints.length },
        ].filter(Boolean);
        return (
          <div style={{ marginBottom: 14, animation: 'dtFadeUp 500ms 650ms both' }}>
            <button onClick={() => setDetailsOpen(o => !o)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 14px',
              background: theme.surface, border: `1px solid ${theme.border}`,
              borderRadius: 8,
              cursor: 'pointer', color: theme.text, fontFamily: FONT.sans,
              fontSize: 12.5, fontWeight: 600, letterSpacing: -0.1, textAlign: 'left',
            }}>
              <span>詳しい解説</span>
              <span style={{
                fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.3,
              }}>
                {details.purpose ? '目的 · ' : ''}
                {tabs.map(t => `${t.label}${t.count}`).join(' · ')}
              </span>
              <span style={{ flex: 1 }}/>
              <span style={{
                fontFamily: FONT.mono, fontSize: 12, color: theme.textSec,
                transform: detailsOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s',
              }}>▾</span>
            </button>

            {detailsOpen && (
              <div style={{
                marginTop: 8, border: `1px solid ${theme.border}`, borderRadius: 8,
                background: theme.surface, overflow: 'hidden',
              }}>
                {/* Purpose */}
                {details.purpose && (
                  <div style={{
                    padding: '12px 14px', borderBottom: `1px solid ${theme.border}`,
                    fontSize: 12, color: theme.textSec, lineHeight: 1.6,
                  }}>
                    <div style={{
                      fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
                      letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4,
                    }}>目的</div>
                    {details.purpose}
                  </div>
                )}

                {/* Tabs */}
                {tabs.length > 0 && (
                  <div style={{ padding: '8px 14px 12px' }}>
                    <div style={{
                      display: 'flex', gap: 0, borderBottom: `1px solid ${theme.border}`,
                      marginBottom: 10,
                    }}>
                      {tabs.map(t => {
                        const on = detailTab === t.k;
                        return (
                          <button key={t.k} onClick={() => setDetailTab(t.k)} style={{
                            flex: 1, padding: '8px 0',
                            background: 'transparent', border: 'none',
                            color: on ? theme.text : theme.textSec,
                            fontFamily: FONT.sans, fontSize: 12,
                            fontWeight: on ? 700 : 500, cursor: 'pointer',
                            borderBottom: `2px solid ${on ? theme.text : 'transparent'}`,
                            marginBottom: -1, letterSpacing: -0.1,
                          }}>
                            {t.label} <span style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textTer }}>{t.count}</span>
                          </button>
                        );
                      })}
                    </div>

                    {detailTab === 'steps' && hasSteps && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {details.steps.map(s => (
                          <div key={s.n} style={{ display: 'flex', gap: 10 }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                              background: theme.text, color: theme.bg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: FONT.mono, fontSize: 10, fontWeight: 700,
                            }}>{s.n}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.t}</div>
                              <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 2, lineHeight: 1.55 }}>{s.d}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {detailTab === 'mistakes' && hasMistakes && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {details.mistakes.map((m, i) => (
                          <div key={i} style={{ display: 'flex', gap: 10 }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
                              background: 'rgba(178,58,42,0.1)', color: theme.danger,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700,
                            }}>×</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>{m.t}</div>
                              <div style={{ fontSize: 11, color: theme.textSec, marginTop: 2, lineHeight: 1.55 }}>{m.d}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {detailTab === 'check' && hasCheck && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {details.checkpoints.map((c, i) => (
                          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                            <div style={{
                              width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
                              background: 'rgba(47,125,74,0.15)', color: theme.good,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>{Icon.check(theme.good, 10)}</div>
                            <div style={{ fontSize: 12, lineHeight: 1.55, flex: 1 }}>{c}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Records row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        animation: 'dtFadeUp 500ms 600ms both',
      }}>
        <RecordCard theme={theme} label="目標"
          big={`${lib.goal.target}%`}
          sub={cfg.isDrill ? `${cfg.attempts}球中 ${Math.ceil(lib.goal.target * cfg.attempts / 100)}球以上` : lib.goal.benchmark}/>
        <RecordCard theme={theme} label="ベスト記録"
          big={bestRecord ? `${bestRecord.pct}%` : '—'}
          sub={bestRecord
            ? `${bestDate} · ${bestRecord.successes}/${bestRecord.attempts} · ${'★'.repeat(bestRecord.stars)}`
            : '未挑戦'}
          highlight={!!bestRecord}/>
      </div>

      {/* Why / context */}
      <div style={{
        marginTop: 16, padding: '12px 14px',
        background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8,
        borderLeft: `3px solid ${theme.text}`,
        animation: 'dtFadeUp 500ms 800ms both',
      }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer,
          letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
          marginBottom: 6,
        }}>{cfg.isDrill ? 'なぜこのドリル？' : 'Benchmark'}</div>
        <div style={{ fontSize: 12.5, color: theme.textSec, lineHeight: 1.7 }}>
          {cfg.benchmark}
        </div>
      </div>

      {/* Rule / flow */}
      <div style={{
        marginTop: 12, padding: '12px 14px',
        background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8,
        animation: 'dtFadeUp 500ms 950ms both',
      }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer,
          letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
          marginBottom: 8,
        }}>Rule</div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: theme.textSec, lineHeight: 1.75 }}>
          <li>{cfg.action} を {cfg.attempts} 球、順番に打つ</li>
          <li>{cfg.verb} したら「{cfg.short}」、しなかったら「OUT」をタップ</li>
          <li>達成率 {lib.goal.target}% 以上で合格（★★）、+10% で ★★★</li>
        </ol>
      </div>

      <div style={{ flex: 1, minHeight: 8 }}/>

      {/* Start button */}
      <button onClick={onStart} style={{
        width: '100%', background: theme.text, color: theme.bg, border: 'none',
        padding: '16px 0', borderRadius: 10,
        fontFamily: FONT.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer',
        letterSpacing: -0.1, marginTop: 14,
        animation: 'dtPop 500ms 1100ms cubic-bezier(0.16, 1, 0.3, 1) both, dtPulse 2.2s 1800ms infinite',
      }}>
        {cfg.isDrill ? 'ドリル開始 →' : 'テスト開始 →'}
      </button>
      <div style={{
        textAlign: 'center', fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
        letterSpacing: 0.5, marginTop: 10,
        animation: 'dtFadeIn 400ms 1400ms both',
      }}>{cfg.attempts} ATTEMPTS · SELF-REPORT</div>
    </div>
  );
}

function RecordCard({ theme, label, big, sub, highlight }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: highlight ? theme.text : theme.surface,
      color: highlight ? theme.bg : theme.text,
      border: highlight ? 'none' : `1px solid ${theme.border}`,
      borderRadius: 8,
    }}>
      <div style={{
        fontFamily: FONT.mono, fontSize: 9, color: highlight ? 'rgba(255,255,255,0.6)' : theme.textTer,
        letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
      }}>{label}</div>
      <div style={{
        fontFamily: FONT.mono, fontSize: 22, fontWeight: 500, letterSpacing: -0.8,
        marginTop: 6, lineHeight: 1,
      }}>{big}</div>
      <div style={{
        fontSize: 10.5, color: highlight ? 'rgba(255,255,255,0.6)' : theme.textSec,
        marginTop: 6, lineHeight: 1.5,
      }}>{sub}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ACTIVE phase
// ─────────────────────────────────────────────────────────
function ActivePhase({ theme, lib, cfg, records, target, onTap }) {
  const successes = records.filter(Boolean).length;
  const totalTries = records.length;
  const remaining = cfg.attempts - totalTries;
  const attemptNum = totalTries + 1;
  const currentPct = totalTries > 0 ? Math.round((successes / totalTries) * 100) : 0;

  // current streak (consecutive true at end of records)
  let streak = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i]) streak++; else break;
  }
  // Max possible pct from here
  const maxPossible = totalTries > 0
    ? Math.round(((successes + remaining) / cfg.attempts) * 100)
    : 100;

  const [flash, setFlash] = React.useState(null); // 'in' | 'out' | null
  const onIn = () => { setFlash('in'); onTap(true); setTimeout(() => setFlash(null), 400); };
  const onOut = () => { setFlash('out'); onTap(false); setTimeout(() => setFlash(null), 400); };

  return (
    <div style={{ flex: 1, padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Flash overlay */}
      {flash && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
          background: flash === 'in' ? 'rgba(95,196,139,0.45)' : 'rgba(232,133,74,0.25)',
          animation: 'dtFlash 400ms ease-out',
        }}/>
      )}

      {/* Progress header */}
      <div style={{ marginBottom: 4 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8,
        }}>
          <span style={{
            fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
            letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600,
          }}>Attempt {attemptNum} / {cfg.attempts}</span>
          {streak >= 2 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 10,
              background: 'rgba(232,133,74,0.15)', color: theme.warn,
              fontFamily: FONT.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
              animation: 'dtStreakFlame 0.8s ease-in-out infinite',
            }}>🔥 {streak} STREAK</span>
          )}
        </div>
        {/* Attempt dots */}
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: cfg.attempts }, (_, i) => {
            const done = i < records.length;
            const ok = records[i];
            const current = i === totalTries;
            return (
              <div key={i} style={{
                flex: 1, height: 6, borderRadius: 3,
                background: done ? (ok ? theme.good : theme.warn + 'aa')
                          : current ? theme.borderStrong
                          : theme.border,
                transition: 'background .3s',
              }}/>
            );
          })}
        </div>
      </div>

      {/* Live stat hero */}
      <div style={{
        marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 16,
      }}>
        <div>
          <div style={{
            fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
            letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
          }}>成功</div>
          <div style={{
            fontFamily: FONT.mono, fontSize: 56, fontWeight: 400,
            letterSpacing: -2.5, lineHeight: 0.9, marginTop: 4,
          }}>
            {successes}
            <span style={{ fontSize: 22, color: theme.textSec, marginLeft: 6 }}>
              / {cfg.attempts}
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
            letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
          }}>現在</div>
          <div style={{
            fontFamily: FONT.mono, fontSize: 32, fontWeight: 500, letterSpacing: -1.2,
            color: currentPct >= target ? theme.good : theme.text, lineHeight: 1, marginTop: 4,
          }}>{currentPct}%</div>
        </div>
      </div>

      {/* Target marker line */}
      <div style={{
        marginTop: 18, height: 6, background: theme.surfaceAlt, borderRadius: 3, overflow: 'visible',
        position: 'relative',
      }}>
        <div style={{
          height: '100%', width: `${Math.min(100, currentPct)}%`,
          background: currentPct >= target ? theme.good : theme.text,
          borderRadius: 3, transition: 'width .4s',
        }}/>
        {/* target marker */}
        <div style={{
          position: 'absolute', left: `${target}%`, top: -3, bottom: -3,
          width: 2, background: theme.text, opacity: 0.6,
        }}/>
        <div style={{
          position: 'absolute', left: `${target}%`, top: -18,
          transform: 'translateX(-50%)',
          fontFamily: FONT.mono, fontSize: 9, color: theme.text, fontWeight: 600, letterSpacing: 0.3,
          whiteSpace: 'nowrap',
        }}>目標 {target}%</div>
      </div>

      {/* Question */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: '20px 0', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{cfg.icon}</div>
        <div style={{ fontSize: 15, color: theme.textSec, marginBottom: 4 }}>
          {attemptNum} 球目
        </div>
        <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.4, color: theme.text }}>
          {cfg.verb} した？
        </div>
      </div>

      {/* IN / OUT buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onOut} style={{
          flex: 1, padding: '18px 0',
          background: 'transparent', color: theme.warn,
          border: `2px solid ${theme.warn}`,
          borderRadius: 10,
          fontFamily: FONT.sans, fontSize: 16, fontWeight: 700, cursor: 'pointer',
          letterSpacing: 0.4,
        }}>OUT</button>
        <button onClick={onIn} style={{
          flex: 1, padding: '18px 0',
          background: theme.good, color: '#FFFFFF',
          border: 'none', borderRadius: 10,
          fontFamily: FONT.sans, fontSize: 16, fontWeight: 800, cursor: 'pointer',
          letterSpacing: 0.4,
        }}>{cfg.short}</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// RESULT phase
// ─────────────────────────────────────────────────────────
function useCountUp(target, duration = 1200, start = 0) {
  const [v, setV] = React.useState(start);
  React.useEffect(() => {
    if (target == null || !isFinite(target)) { setV(target || 0); return; }
    if (target === 0) { setV(0); return; }
    const begin = Date.now();
    let raf;
    const tick = () => {
      const t = Math.min(1, (Date.now() - begin) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(Math.round(start + (target - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);
  return v;
}

function ResultPhase({ theme, lib, cfg, result, target, targetLabel, onRetry, onDone }) {
  const animatedPct = useCountUp(result.pct, 1300);
  const stars = result.stars;
  const passed = result.passed;
  const newBest = result.newBest;
  const diff = result.pct - target;

  const msg = (() => {
    if (stars === 3) return cfg.isDrill ? `完璧！ +${diff}% 上振れ` : `最高評価！ 目標を +${diff}% 更新`;
    if (stars === 2) return cfg.isDrill ? `クリア ${diff >= 0 ? '+' : ''}${diff}%` : `目標達成 ${diff >= 0 ? '+' : ''}${diff}%`;
    return cfg.isDrill ? `もう一歩 (目標 −${Math.abs(diff)}%)` : `目標まで あと ${Math.abs(diff)}%`;
  })();

  return (
    <div style={{ flex: 1, padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {passed && <Confetti/>}

      <div style={{
        fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
        letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 500,
        marginTop: 4,
        animation: 'dtFadeIn 400ms both',
      }}>Result</div>

      {/* Stars row */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14, marginBottom: 14,
      }}>
        {[1, 2, 3].map(n => {
          const on = stars >= n;
          return (
            <svg key={n} width="44" height="44" viewBox="0 0 24 24"
              style={{
                animation: on
                  ? `dtStarIn 560ms ${350 + (n-1) * 200}ms cubic-bezier(0.16, 1, 0.3, 1) both`
                  : `dtFadeIn 300ms ${900 + (n-1) * 120}ms both`,
              }}>
              <path
                d="M12 2 L14.5 9 L22 9 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2 9 L9.5 9 Z"
                fill={on ? '#FFD54A' : 'transparent'}
                stroke={on ? '#E2B836' : theme.border}
                strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          );
        })}
      </div>

      {/* Big pct */}
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 90, fontWeight: 300, letterSpacing: -3, lineHeight: 1,
          color: passed ? theme.good : theme.text,
          animation: 'dtFadeIn 300ms 100ms both',
        }}>{animatedPct}%</div>
        <div style={{
          fontFamily: FONT.mono, fontSize: 15, color: theme.textSec, marginTop: 4,
          animation: 'dtFadeIn 400ms 1400ms both',
        }}>({result.successes} / {result.attempts})</div>
      </div>

      {/* Message */}
      <div style={{
        textAlign: 'center', marginTop: 16,
        fontSize: 17, fontWeight: 700, letterSpacing: -0.3,
        color: passed ? theme.good : theme.warn,
        animation: 'dtFadeUp 500ms 1500ms both',
      }}>{msg}</div>

      {/* New best badge */}
      {newBest && (
        <div style={{
          margin: '14px auto 0',
          padding: '7px 14px',
          background: theme.text, color: theme.bg,
          borderRadius: 14,
          fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
          animation: 'dtPop 500ms 1800ms cubic-bezier(0.16, 1, 0.3, 1) both',
        }}>✦ NEW BEST ✦</div>
      )}

      {/* Comparison */}
      <div style={{
        marginTop: 20, padding: '12px 14px',
        background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: FONT.mono, fontSize: 12, color: theme.textSec,
        animation: 'dtFadeUp 500ms 2000ms both',
      }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase', color: theme.textTer }}>今回</div>
          <div style={{ color: passed ? theme.good : theme.text, fontSize: 16, fontWeight: 500, marginTop: 2 }}>
            {result.pct}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase', color: theme.textTer }}>目標</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: theme.text }}>
            {target}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase', color: theme.textTer }}>ベスト</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginTop: 2, color: theme.text }}>
            {Math.max(result.pct, result.prevBestPct)}%
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}/>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 8, flexDirection: 'column', marginTop: 14,
        animation: 'dtFadeUp 500ms 2200ms both',
      }}>
        <button onClick={onRetry} style={{
          width: '100%', background: theme.text, color: theme.bg, border: 'none',
          padding: '14px 0', borderRadius: 8,
          fontFamily: FONT.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          letterSpacing: -0.1,
        }}>{cfg.isDrill ? 'もう一度ドリル' : 'もう一度テスト'}</button>
        <button onClick={onDone} style={{
          width: '100%', background: 'transparent', color: theme.text,
          border: `1px solid ${theme.borderStrong}`,
          padding: '13px 0', borderRadius: 8,
          fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>ドリル一覧に戻る</button>
      </div>
    </div>
  );
}

function Confetti() {
  const particles = React.useMemo(() => {
    const colors = ['#5FC48B', '#E8854A', '#FAFAFA', '#FFD54A', '#3966D8'];
    return Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const dist = 130 + Math.random() * 180;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 30,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 7,
        delay: Math.random() * 400,
        round: Math.random() > 0.5,
      };
    });
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 4 }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: '50%', top: '30%',
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: p.round ? '50%' : '2px',
          animation: `dtBurst 1.8s cubic-bezier(0.1, 0.9, 0.3, 1) ${p.delay}ms forwards`,
          ['--x']: `${p.x}px`,
          ['--y']: `${p.y}px`,
          opacity: 0,
        }}/>
      ))}
    </div>
  );
}

window.DrillTestScreen = DrillTestScreen;

// screens/round.jsx — per-hole input, Linear v2.
//
// Layout:
//   top:      close / course (+tee/target) / progress
//   ribbon:   18-hole progress
//   hero:     HOLE N · Par / Yards / HDCP / 目標+ラベル
//   strokes:  1–8 buttons + "9+" → inline number input
//   putts:    1–4 buttons + "5+" → inline number input
//   events:   OB / ハザード アイコントグル（1ホール1個まで）
//   result:   このホールのスコア (Bogey / Par / ...) + ラウンド累積
//   footer:   back / next
//
// Inputs captured (minimum-friction spec):
//   strokes: required
//   putts:   required
//   ob:      optional boolean
//   hazard:  optional boolean

function RoundScreen({ theme, persona, go }) {
  // Source of truth: window.__roundState (created in round-setup).
  // Falls back to setup/MOCK_COURSE if opened directly.
  const state = window.__roundState;
  const setup = window.__roundSetup;
  const course = state?.course || setup?.course || MOCK_COURSE;
  const startSide = state?.startSide || setup?.startSide || 'OUT';
  const teeColor = state?.teeColor || setup?.teeColor;
  const targetScore = state?.target || setup?.target;

  // Are we editing a completed round (came back from result page)?
  const isEditing = state?.status === 'completed';

  // Course par: prefer the explicit value, else sum from holes (MOCK_COURSE fallback).
  const coursePar = course.par || course.holes.reduce((a, h) => a + h.par, 0);

  // User's rough handicap (prototype: derive from avg score).
  const userHc = (persona && Number.isFinite(persona.avgScore))
    ? Math.max(0, Math.min(36, Math.round((persona.avgScore - coursePar) * 0.93)))
    : 18;

  // Starting hole index: prefer the hole specified by result-page edit, else OUT→0 / IN→9.
  const startIdx = (() => {
    if (state && Number.isInteger(window.__roundEditHole)) {
      const i = window.__roundEditHole;
      window.__roundEditHole = null;
      return i;
    }
    return startSide === 'IN' ? Math.floor(course.holes.length / 2) : 0;
  })();

  // User-configured optional trackers (OB / hazard / 3putt / fw / upDown / bunker).
  const enabledOptKeys = React.useMemo(
    () => (window.getEnabledRoundOptionKeys?.() || ['ob', 'hazard']),
    []
  );

  const [holeIdx, setHoleIdx] = React.useState(startIdx);
  const [holes, setHoles] = React.useState(() => {
    if (state?.holes) return state.holes;
    return course.holes.map(h => ({
      ...h, strokes: null, putts: null,
      ob: false, hazard: false,
      threePutt: false, fairway: null, upDown: null, bunker: false,
    }));
  });

  // Mirror hole state back to shared __roundState so round-result sees edits.
  React.useEffect(() => {
    if (state) state.holes = holes;
  }, [holes]);
  // "extra" mode: when strokes ≥ 9 or putts ≥ 5, show free-number input
  const [strokesExtra, setStrokesExtra] = React.useState(false);
  const [puttsExtra, setPuttsExtra] = React.useState(false);

  const hole = holes[holeIdx];
  const total = holes.length;
  const done = holes.filter(h => h.strokes != null).length;

  const update = (patch) => {
    setHoles(hs => hs.map((h, i) => i === holeIdx ? { ...h, ...patch } : h));
  };

  const setStroke = (n) => update({ strokes: n });
  const setPutt = (n) => update({ putts: n });
  const toggleField = (k) => update({ [k]: !hole[k] });

  const next = () => {
    setHoleIdx(i => Math.min(total - 1, i + 1));
    setStrokesExtra(false);
    setPuttsExtra(false);
  };
  const prev = () => {
    setHoleIdx(i => Math.max(0, i - 1));
    setStrokesExtra(false);
    setPuttsExtra(false);
  };

  // ── derived per-hole info ────────────────────────────────────
  const scoreToPar = hole.strokes != null ? hole.strokes - hole.par : null;
  const scoreLabel = (d) =>
    d === null ? '—' :
    d === -2 ? 'Eagle' :
    d === -1 ? 'Birdie' :
    d === 0  ? 'Par' :
    d === 1  ? 'Bogey' :
    d === 2  ? 'Double' :
    d > 0    ? `+${d}` :
               `${d}`;

  // Hole-specific target based on user handicap and hole HDCP (USGA-style).
  // strokes_received = floor(userHc / 18) + (holeHDCP <= userHc % 18 ? 1 : 0)
  const strokesReceived =
    Math.floor(userHc / 18) + ((hole.hdcp || 18) <= (userHc % 18) ? 1 : 0);
  const holeTarget = hole.par + strokesReceived;
  const targetLabel =
    strokesReceived === 0 ? 'パー狙い' :
    strokesReceived === 1 ? 'ボギー狙い' :
    strokesReceived === 2 ? 'ダボ狙い' :
                            'トリプル以内';

  // Running totals across all entered holes (order-independent — tap-around safe).
  const playedAll = holes.filter(h => h.strokes != null);
  const runTotal = playedAll.reduce((a, h) => a + h.strokes, 0);
  const runPar   = playedAll.reduce((a, h) => a + h.par, 0);
  const runDiff  = playedAll.length ? runTotal - runPar : 0;
  const anyPlayed = playedAll.length > 0;

  const threePutt = hole.putts != null && hole.putts >= 3;

  // Per-hole target (USGA stroke allocation) — used for the scorecard picker.
  const hdcpTargetFor = (h) => {
    const received =
      Math.floor(userHc / 18) + ((h.hdcp || 18) <= (userHc % 18) ? 1 : 0);
    return h.par + received;
  };

  // Jump to any hole (also resets the free-input modes).
  const jumpTo = (i) => {
    setHoleIdx(i);
    setStrokesExtra(false);
    setPuttsExtra(false);
  };

  // ── helpers ──────────────────────────────────────────────────
  const label = (txt, style = {}) => (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
      letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500, ...style,
    }}>{txt}</div>
  );

  const NumBtn = ({ n, active, onClick }) => (
    <button onClick={onClick} style={{
      flex: 1, padding: '13px 0',
      border: `1px solid ${active ? theme.text : theme.border}`,
      background: active ? theme.text : theme.surface,
      color: active ? theme.bg : theme.text,
      fontFamily: FONT.mono, fontSize: 15, fontWeight: 500,
      borderRadius: 6, cursor: 'pointer', minWidth: 0,
    }}>{n}</button>
  );

  const ExtraBtn = ({ active, children, onClick }) => (
    <button onClick={onClick} style={{
      flex: 1, padding: '13px 0',
      border: `1px solid ${active ? theme.text : theme.border}`,
      background: active ? theme.text : theme.surface,
      color: active ? theme.bg : theme.textSec,
      fontFamily: FONT.sans, fontSize: 12, fontWeight: 500,
      borderRadius: 6, cursor: 'pointer', minWidth: 0,
    }}>{children}</button>
  );

  // Free-number input box, used when strokes ≥ 9 or putts ≥ 5.
  const FreeInput = ({ value, min, onChange, onCancel, hint }) => (
    <div style={{
      display: 'flex', gap: 6, alignItems: 'stretch',
    }}>
      <input
        type="number" min={min} max={20}
        autoFocus
        value={value ?? ''}
        onChange={e => {
          const v = e.target.value === '' ? null : parseInt(e.target.value, 10);
          onChange(Number.isFinite(v) ? v : null);
        }}
        style={{
          flex: 1, padding: '12px 14px',
          border: `1px solid ${theme.text}`,
          background: theme.surface, color: theme.text,
          fontFamily: FONT.mono, fontSize: 16, fontWeight: 500,
          borderRadius: 6, outline: 'none', boxSizing: 'border-box',
          minWidth: 0, width: '100%',
        }}
      />
      <button onClick={onCancel} style={{
        padding: '0 14px', background: 'transparent',
        border: `1px solid ${theme.border}`, color: theme.textSec,
        fontFamily: FONT.sans, fontSize: 12, fontWeight: 500,
        borderRadius: 6, cursor: 'pointer',
      }}>戻る</button>
    </div>
  );

  // OB / ハザードトグルアイコンボタン
  const EventTap = ({ on, label, icon, onClick }) => (
    <button onClick={onClick} style={{
      width: '100%', padding: '10px 6px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      background: on ? theme.text : theme.surface,
      color: on ? theme.bg : theme.text,
      border: `1px solid ${on ? theme.text : theme.border}`,
      borderRadius: 6, cursor: 'pointer',
      fontFamily: FONT.sans, fontSize: 12, fontWeight: 500,
      minWidth: 0,
    }}>
      {icon}
      <span style={{
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</span>
    </button>
  );

  // DEBUG: fill all holes with plausible scores for quick testing.
  // strokes ~= par + random(-1..+3), putts = 2 mostly, occasional OB/hazard.
  const debugFillAll = () => {
    const filled = holes.map(h => {
      const r = Math.random();
      // spread: 10% birdie, 40% par, 35% bogey, 12% double, 3% worse
      let delta;
      if      (r < 0.10) delta = -1;
      else if (r < 0.50) delta = 0;
      else if (r < 0.85) delta = 1;
      else if (r < 0.97) delta = 2;
      else               delta = 3;
      const strokes = Math.max(1, h.par + delta);
      const putts = delta <= 0 ? (Math.random() < 0.25 ? 1 : 2)
                  : delta === 1 ? 2
                  : (Math.random() < 0.3 ? 3 : 2);
      const ob = Math.random() < 0.06;
      const hazard = Math.random() < 0.08;
      return { ...h, strokes, putts, ob, hazard };
    });
    setHoles(filled);
  };
  const debugClearAll = () => {
    setHoles(hs => hs.map(h => ({
      ...h, strokes: null, putts: null, ob: false, hazard: false,
    })));
    setStrokesExtra(false);
    setPuttsExtra(false);
  };

  // Icon map for each option key
  const OPT_ICONS = {
    ob: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1.2" y="1.2" width="11.6" height="11.6" rx="1.4"
              stroke="currentColor" strokeWidth="1.3" fill="none"/>
        <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    hazard: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1L13 12H1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
        <path d="M7 5v3.2M7 10v.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    threePutt: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="4" cy="7" r="1.5" fill="currentColor"/>
        <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
        <circle cx="10" cy="7" r="1.5" fill="currentColor"/>
      </svg>
    ),
    fairway: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 12L7 2L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
        <line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
    upDown: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 10 Q 4 4 7 7 T 12 4" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    bunker: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 10 Q 5 6 7 9 Q 9 6 12 10" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
        <line x1="1" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1"/>
      </svg>
    ),
  };
  const OPT_LABELS = {
    ob: 'OB', hazard: 'ハザード', threePutt: '3パット',
    fairway: 'FWキープ', upDown: '寄せワン', bunker: 'バンカー',
  };

  // ── render ───────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: theme.text, fontFamily: FONT.sans }}>
      {/* Top bar */}
      <div style={{ padding: '4px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => go('home')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
          {Icon.close(theme.textSec, 18)}
        </button>
        <div style={{ textAlign: 'center', minWidth: 0, flex: 1, padding: '0 10px' }}>
          <div style={{
            fontSize: 12.5, fontWeight: 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{course.name}</div>
          {(teeColor || Number.isFinite(targetScore)) && (
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.4, marginTop: 2 }}>
              {teeColor && `${teeColor.toUpperCase()} tee`}
              {teeColor && Number.isFinite(targetScore) && ' · '}
              {Number.isFinite(targetScore) && `目標 ${targetScore}`}
            </div>
          )}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.textSec }}>
          {done}/{total}
        </div>
      </div>

      {/* DEBUG: bulk fill / clear — dev only */}
      <div style={{
        margin: '0 16px 8px', padding: '6px 8px',
        display: 'flex', alignItems: 'center', gap: 6,
        background: theme.surfaceAlt, border: `1px dashed ${theme.borderStrong}`,
        borderRadius: 4,
      }}>
        <span style={{
          fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
          letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 500,
        }}>DEV</span>
        <span style={{ flex: 1 }}/>
        <button onClick={debugFillAll} style={{
          padding: '4px 8px',
          background: theme.text, color: theme.bg, border: 'none',
          borderRadius: 3, cursor: 'pointer',
          fontFamily: FONT.mono, fontSize: 10, fontWeight: 500,
        }}>全ホール一括入力</button>
        <button onClick={debugClearAll} style={{
          padding: '4px 8px',
          background: 'transparent', color: theme.textSec,
          border: `1px solid ${theme.border}`,
          borderRadius: 3, cursor: 'pointer',
          fontFamily: FONT.mono, fontSize: 10, fontWeight: 500,
        }}>クリア</button>
      </div>

      {/* Running total — minimal, borderless */}
      <div style={{
        padding: '0 16px 12px',
        display: 'flex', alignItems: 'baseline', gap: 10,
      }}>
        <span style={{
          fontFamily: FONT.mono, fontSize: 26, fontWeight: 400, letterSpacing: -0.8,
          color: anyPlayed ? theme.text : theme.textTer, lineHeight: 1,
        }}>
          {anyPlayed ? runTotal : '—'}
        </span>
        {anyPlayed && (
          <span style={{
            fontFamily: FONT.mono, fontSize: 16, fontWeight: 500,
            color: runDiff > 0 ? theme.warn : runDiff < 0 ? theme.good : theme.textSec,
          }}>
            {runDiff >= 0 ? '+' : ''}{runDiff}
          </span>
        )}
        <span style={{ flex: 1 }}/>
        <span style={{
          fontFamily: FONT.mono, fontSize: 10.5, color: theme.textTer,
          letterSpacing: 0.5,
        }}>
          {playedAll.length}/{total}
        </span>
      </div>


      {/* Hero: hole / par / target / (result when played) */}
      <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {label(`HOLE ${hole.no} / ${total}`)}
          <div style={{ fontFamily: FONT.mono, fontSize: 56, fontWeight: 400, letterSpacing: -2.4, lineHeight: 0.95, marginTop: 4 }}>
            {hole.no}
          </div>
          {hole.strokes != null && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
              <span style={{
                fontSize: 24, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1,
                color: scoreToPar > 0 ? theme.warn
                     : scoreToPar < 0 ? theme.good
                     : theme.text,
              }}>
                {scoreLabel(scoreToPar)}
              </span>
              <span style={{
                fontFamily: FONT.mono, fontSize: 16, fontWeight: 500,
                color: scoreToPar > 0 ? theme.warn
                     : scoreToPar < 0 ? theme.good
                     : theme.textSec,
              }}>
                {scoreToPar >= 0 ? '+' : ''}{scoreToPar}
              </span>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 20, fontWeight: 500, letterSpacing: -0.5 }}>Par {hole.par}</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.textSec, marginTop: 2 }}>
            {hole.yards}Y · HDCP {hole.hdcp}
          </div>
          {/* Hole target */}
          <div style={{
            marginTop: 8,
            display: 'inline-flex', alignItems: 'baseline', gap: 6,
            fontFamily: FONT.mono,
          }}>
            <span style={{ fontSize: 9, color: theme.textTer, letterSpacing: 0.6, textTransform: 'uppercase' }}>目標</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{holeTarget}</span>
            <span style={{ fontSize: 10.5, color: theme.textSec }}>· {targetLabel}</span>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1 }}>
        {/* 打数 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ marginBottom: 8 }}>{label('打数')}</div>
          {(strokesExtra || (hole.strokes != null && hole.strokes > 8)) ? (
            <FreeInput
              value={hole.strokes}
              min={1}
              onChange={(v) => setStroke(v)}
              onCancel={() => { setStrokesExtra(false); setStroke(null); }}
            />
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,4,5,6,7,8].map(n => (
                <NumBtn key={n} n={n}
                  active={hole.strokes === n}
                  onClick={() => setStroke(n)}
                />
              ))}
              <ExtraBtn active={false} onClick={() => setStrokesExtra(true)}>9+</ExtraBtn>
            </div>
          )}
        </div>

        {/* パット */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            {label('パット')}
            {threePutt && <span style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.warn }}>3パット</span>}
          </div>
          {(puttsExtra || (hole.putts != null && hole.putts > 4)) ? (
            <FreeInput
              value={hole.putts}
              min={0}
              onChange={(v) => setPutt(v)}
              onCancel={() => { setPuttsExtra(false); setPutt(null); }}
            />
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,4].map(n => (
                <NumBtn key={n} n={n}
                  active={hole.putts === n}
                  onClick={() => setPutt(n)}
                />
              ))}
              <ExtraBtn active={false} onClick={() => setPuttsExtra(true)}>5+</ExtraBtn>
            </div>
          )}
        </div>

        {/* 発生時のみ — user-configured trackers (Settings) */}
        {enabledOptKeys.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8,
            }}>
              {label('発生時のみタップ')}
              <span style={{
                fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.4,
              }}>設定で変更</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: enabledOptKeys.length <= 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: 6,
            }}>
              {enabledOptKeys.map(k => (
                <EventTap key={k}
                  on={!!hole[k]}
                  icon={OPT_ICONS[k]}
                  label={OPT_LABELS[k]}
                  onClick={() => toggleField(k)}
                />
              ))}
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer, marginTop: 6, letterSpacing: 0.3 }}>
              発生しなければ何もしなくてOK
            </div>
          </div>
        )}
      </div>

      {/* Hole picker — tap any hole to jump (numbers only) */}
      <div style={{
        padding: '10px 16px 4px',
        borderTop: `1px solid ${theme.border}`,
        background: theme.bg,
      }}>
        {[[0, 9], [9, 18]].map(([from, to]) => (
          <div key={from} style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
            {holes.slice(from, to).map((h, k) => {
              const i = from + k;
              const on = i === holeIdx;
              const played = h.strokes != null;
              return (
                <button key={h.no} onClick={() => jumpTo(i)} style={{
                  flex: 1, minWidth: 0,
                  padding: '7px 0',
                  border: `1px solid ${on ? theme.text : theme.border}`,
                  background: on ? theme.text : played ? theme.surfaceAlt : theme.surface,
                  color: on ? theme.bg : theme.text,
                  borderRadius: 4, cursor: 'pointer',
                  fontFamily: FONT.mono, fontSize: 12, fontWeight: 600, lineHeight: 1,
                  position: 'relative',
                }}>
                  {h.no}
                  {played && !on && (
                    <div style={{
                      position: 'absolute', top: 3, right: 3,
                      width: 3, height: 3, borderRadius: '50%',
                      background: theme.text,
                    }}/>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px 14px',
        display: 'flex', gap: 8,
        background: theme.bg,
        borderTop: `1px solid ${theme.border}`,
      }}>
        <TapBtn theme={theme} variant="ghost" onClick={prev} style={{ flex: 0, minWidth: 52, padding: '11px 0' }} disabled={holeIdx === 0}>
          {Icon.chevL(theme.text, 16)}
        </TapBtn>
        {isEditing ? (
          // Editing mode — always offer "return to result"
          <TapBtn theme={theme} variant="primary" full
            onClick={() => go('round-result')}
            style={{ padding: '11px 0' }}>
            結果に戻る
          </TapBtn>
        ) : holeIdx === total - 1 ? (
          <TapBtn theme={theme} variant="primary" full
            onClick={() => {
              if (state) state.status = 'completed';
              go('round-result');
            }}
            style={{ padding: '11px 0' }}>
            ラウンドを終える
          </TapBtn>
        ) : (
          <TapBtn theme={theme} variant="primary" full
            onClick={next}
            style={{ padding: '11px 0' }}>
            {`次のホール  ›  ${hole.no + 1}`}
          </TapBtn>
        )}
      </div>
    </div>
  );
}

window.RoundScreen = RoundScreen;

// screens/round-complete.jsx — cinematic Stories-like wrap-up with rich animations.
//
// Flow (6 slides):
//   1. WELCOME   "お疲れ様でした"
//   2. SUMMARY   "こんなラウンドでしたね" — count-up score + stat chips
//   3. GOOD      "ここが良かったですね！" — staggered highlight cards
//   4. FOCUS     "目標XXに向けて、指標YYを改善しよう" — animated gap bar
//   5. DRILL     "このドリルをやってみよう" — direct jump to drill page
//   6. CLOSE     return home
//
// Navigation: tap left 35% = prev, tap right 65%+ = next, hold = pause.

function RoundCompleteScreen({ theme, persona, go }) {
  const state = window.__roundState;
  React.useEffect(() => { if (!state) go('home'); }, []);
  if (!state) return null;

  const { course, holes, target, isHalf } = state;
  const played = holes.filter(h => h.strokes != null);
  const total = played.reduce((a, h) => a + h.strokes, 0);
  const playedPar = played.reduce((a, h) => a + h.par, 0);
  const diff = played.length ? total - playedPar : 0;

  const targetVal = target || 0;
  const reached = targetVal > 0 && total <= targetVal;
  const gap = total - targetVal;

  // ── per-round stats ─────────────────────────────────────
  const stats = {
    obCount:     played.filter(h => h.ob).length,
    threePutts:  played.filter(h => (h.putts || 0) >= 3).length,
    totalPutts:  played.reduce((a, h) => a + (h.putts || 0), 0),
    eagles:  played.filter(h => h.strokes - h.par <= -2).length,
    birdies: played.filter(h => h.strokes - h.par === -1).length,
    pars:    played.filter(h => h.strokes - h.par === 0).length,
    bogeys:  played.filter(h => h.strokes - h.par === 1).length,
    doubles: played.filter(h => h.strokes - h.par === 2).length,
    triples: played.filter(h => h.strokes - h.par >= 3).length,
    boggyOnHoles: played.filter(h => (h.strokes - (h.putts || 0)) <= (h.par - 1)).length,
    parOnHoles:   played.filter(h => (h.strokes - (h.putts || 0)) <= (h.par - 2)).length,
  };
  stats.boggyOnPct   = played.length ? Math.round((stats.boggyOnHoles / played.length) * 100) : 0;
  stats.parOnPct     = played.length ? Math.round((stats.parOnHoles   / played.length) * 100) : 0;
  stats.threePuttPct = played.length ? Math.round((stats.threePutts   / played.length) * 100) : 0;
  stats.obPct        = played.length ? Math.round((stats.obCount      / played.length) * 100) : 0;
  stats.avgPutt      = played.length ? (stats.totalPutts / played.length) : 0;

  let bestHole = null;
  played.forEach(h => {
    const d = h.strokes - h.par;
    const bd = bestHole ? bestHole.strokes - bestHole.par : 99;
    if (d < bd) bestHole = h;
  });
  let maxStreak = 0, curStreak = 0;
  holes.forEach(h => {
    if (h.strokes != null && (h.strokes - h.par) <= 0) {
      curStreak++; maxStreak = Math.max(maxStreak, curStreak);
    } else if (h.strokes != null) curStreak = 0;
  });

  const highlights = [];
  if (stats.eagles > 0)  highlights.push({ label: `Eagle × ${stats.eagles}`, sub: '会心の一撃でした' });
  if (stats.birdies > 0) highlights.push({ label: `Birdie × ${stats.birdies}`, sub: 'ピンを突ける一打が出た' });
  if (stats.pars >= 5)   highlights.push({ label: `Par × ${stats.pars}`, sub: 'ベースが安定していた' });
  if (stats.obCount === 0 && played.length >= 6) highlights.push({ label: 'OB 0本', sub: 'ティーショットの方向性が出ていた' });
  if (stats.threePutts === 0 && played.length >= 6) highlights.push({ label: '3パット 0', sub: 'パッティングが冴えていた' });
  if (maxStreak >= 3) highlights.push({ label: `連続 Par+ × ${maxStreak}`, sub: '集中力が切れなかった' });
  if (bestHole && (bestHole.strokes - bestHole.par) <= 0) {
    const d = bestHole.strokes - bestHole.par;
    const lab = d <= -2 ? 'Eagle' : d === -1 ? 'Birdie' : 'Par';
    highlights.push({ label: `${bestHole.no}番 ${lab}`, sub: 'これが今日のベストホール' });
  }
  if (highlights.length === 0 && played.length > 0) {
    highlights.push({ label: `${played.length}ホール完走`, sub: 'ラウンドをやり切った' });
  }
  const topHighlights = highlights.slice(0, 3);

  // ── focus metric ───────────────────────────────────────
  const STAT_KEY_BY_LABEL = {
    'ボギーオン率': 'boggyOn', '3パット率': 'threePutt', 'OB率': 'ob',
    'パーオン率': 'parOn', 'パット数': 'avgPutt', '寄せワン率': 'upDown',
    '飛距離': null, 'GIR距離別': 'parOn',
  };
  const computable = new Set(['boggyOn', 'parOn', 'threePutt', 'ob', 'avgPutt']);
  const focus = (() => {
    const candidates = (persona?.focus || []).map(label => {
      const key = STAT_KEY_BY_LABEL[label];
      if (!key || !computable.has(key)) return { label, key: null, gap: 0, current: null, target: null };
      const roundVal = (
        key === 'boggyOn' ? stats.boggyOnPct :
        key === 'parOn' ? stats.parOnPct :
        key === 'threePutt' ? stats.threePuttPct :
        key === 'ob' ? stats.obPct :
        key === 'avgPutt' ? stats.avgPutt : null
      );
      const tgt = persona.targets?.[key];
      if (roundVal == null || tgt == null) return { label, key, gap: 0, current: roundVal, target: tgt };
      const reverse = (key === 'threePutt' || key === 'ob' || key === 'avgPutt');
      const gap = reverse ? (roundVal - tgt) : (tgt - roundVal);
      return { label, key, gap, current: roundVal, target: tgt, reverse };
    });
    candidates.sort((a, b) => (b.gap || 0) - (a.gap || 0));
    return candidates[0] || { label: 'パーオン率', key: 'parOn' };
  })();

  const recDrill = (() => {
    const lib = window.DRILL_LIBRARY || {};
    for (const id of Object.keys(lib)) {
      if (lib[id]?.goal?.metric === focus.label) return { id, data: lib[id] };
    }
    const first = Object.keys(lib)[0];
    return first ? { id: first, data: lib[first] } : null;
  })();

  const [favActive, setFavActive] = React.useState(
    () => recDrill ? window.isFavDrill(recDrill.id) : false
  );
  const toggleFav = () => {
    if (!recDrill) return;
    const on = window.toggleFavDrill(recDrill.id);
    setFavActive(on);
  };
  const openDrill = () => {
    if (!recDrill) return;
    window.__selectedDrillTop = recDrill.id;
    go('practice');
  };

  const dateStr = new Date(state.startedAt).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  });

  // ── Stories palette ────────────────────────────────────
  const BG = '#0A0A0A';
  const INK = '#FAFAFA';
  const SUB = 'rgba(255,255,255,0.72)';
  const DIM = 'rgba(255,255,255,0.5)';
  const TER = 'rgba(255,255,255,0.32)';
  const GOOD = '#5FC48B';
  const WARN = '#E8854A';
  const ACCENT_SOFT = 'rgba(95,196,139,0.12)';

  const goHome = () => go('home');

  // ── Slide list (dynamic) ───────────────────────────────
  const slideConfigs = [
    { key: 'welcome', duration: 3500,
      render: () => <WelcomeSlide course={course} dateStr={dateStr} isHalf={isHalf} reached={reached}/> },
    { key: 'summary', duration: 6000,
      render: () => <SummarySlide total={total} diff={diff} playedPar={playedPar} played={played}
        stats={stats} reached={reached} isHalf={isHalf}/> },
    ...(topHighlights.length > 0
      ? [{ key: 'good', duration: 5500, render: () => <GoodSlide highlights={topHighlights}/> }]
      : []),
    { key: 'focus', duration: 7000,
      render: () => <FocusSlide target={targetVal} reached={reached} focus={focus} persona={persona}/> },
    ...(recDrill
      ? [{ key: 'drill', duration: 8000,
          render: () => <DrillSlide recDrill={recDrill} favActive={favActive} toggleFav={toggleFav} openDrill={openDrill}/> }]
      : []),
    { key: 'close', duration: Infinity,
      render: () => <CloseSlide total={total} diff={diff} goHome={goHome} reached={reached}/> },
  ];

  // ── state ──────────────────────────────────────────────
  const [slideIdx, setSlideIdx] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const clampedIdx = Math.max(0, Math.min(slideConfigs.length - 1, slideIdx));
  const currentSlide = slideConfigs[clampedIdx];

  const next = () => { if (slideIdx < slideConfigs.length - 1) setSlideIdx(slideIdx + 1); };
  const prev = () => { if (slideIdx > 0) setSlideIdx(slideIdx - 1); };

  React.useEffect(() => {
    const duration = currentSlide?.duration;
    if (!isFinite(duration)) { setProgress(100); return; }
    if (paused) return;
    setProgress(0);
    const start = Date.now();
    let raf;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);
      if (elapsed >= duration) next();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [slideIdx, paused, slideConfigs.length]);

  const isInteractive = (el) => !!(el && el.closest && el.closest('[data-interactive="true"]'));
  const onPointerDown = (e) => { if (!isInteractive(e.target)) setPaused(true); };
  const onPointerUp = () => setPaused(false);
  const onClick = (e) => {
    if (isInteractive(e.target)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) prev();
    else if (x > rect.width * 0.65) next();
  };

  // ── Keyframes (injected once) ──────────────────────────
  const keyframes = `
    @keyframes rcFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes rcFadeDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes rcFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes rcScaleIn { from { opacity: 0; transform: scale(0.82); } to { opacity: 1; transform: scale(1); } }
    @keyframes rcPopIn { 0% { opacity: 0; transform: scale(0.6); } 60% { opacity: 1; transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes rcSlideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes rcPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(250,250,250,0.45); } 50% { box-shadow: 0 0 0 10px rgba(250,250,250,0); } }
    @keyframes rcShimmer { 0% { background-position: -300px 0; } 100% { background-position: 300px 0; } }
    @keyframes rcSparkle { 0%, 100% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1); } }
    @keyframes rcSparkleRot { 0% { opacity: 0; transform: scale(0.3) rotate(0); } 50% { opacity: 1; transform: scale(1) rotate(180deg); } 100% { opacity: 0; transform: scale(0.3) rotate(360deg); } }
    @keyframes rcBurst { 0% { transform: translate(-50%, -50%) rotate(0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(calc(-50% + var(--x, 0px)), calc(-50% + var(--y, 0px))) rotate(720deg); opacity: 0; } }
    @keyframes rcDrawCheck { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }
    @keyframes rcBarFill { from { transform: scaleX(var(--from, 0)); } to { transform: scaleX(var(--to, 1)); } }
    @keyframes rcGlow { 0%, 100% { filter: drop-shadow(0 0 0 rgba(255,255,255,0)); } 50% { filter: drop-shadow(0 0 12px rgba(255,255,255,0.35)); } }
  `;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: BG, color: INK, fontFamily: FONT.sans,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}
      onClick={onClick}
      onMouseDown={onPointerDown} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
      onTouchStart={onPointerDown} onTouchEnd={onPointerUp}
    >
      <style>{keyframes}</style>

      {/* Background ambient gradient (shifts per slide via key) */}
      <div key={`bg-${clampedIdx}`} style={{
        position: 'absolute', inset: 0,
        background:
          clampedIdx === 0 ? 'radial-gradient(ellipse at 50% 30%, rgba(95,196,139,0.12), transparent 60%)'
          : clampedIdx === slideConfigs.length - 1 ? 'radial-gradient(ellipse at 50% 70%, rgba(255,255,255,0.06), transparent 60%)'
          : reached
            ? 'radial-gradient(ellipse at 50% 40%, rgba(95,196,139,0.10), transparent 55%)'
            : 'radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.05), transparent 55%)',
        animation: 'rcFadeIn 700ms ease-out',
        pointerEvents: 'none',
      }}/>

      {/* Progress bars */}
      <div style={{
        display: 'flex', gap: 3, padding: '10px 12px 4px',
        position: 'relative', zIndex: 10,
      }}>
        {slideConfigs.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 2.5, background: 'rgba(255,255,255,0.22)', borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: INK,
              width: i < clampedIdx ? '100%' : i === clampedIdx ? `${progress}%` : '0%',
            }}/>
          </div>
        ))}
      </div>

      {/* Top meta */}
      <div style={{
        padding: '8px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9, color: DIM,
          letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 500,
        }}>Fairway · Round</div>
        <button onClick={goHome} data-interactive="true" style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: DIM, padding: '4px 2px',
          fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.8,
        }}>× CLOSE</button>
      </div>

      {/* Slide */}
      <div key={clampedIdx} style={{
        flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0,
        animation: 'rcFadeIn 400ms ease-out',
      }}>
        {currentSlide.render()}
      </div>

      {/* Hint at start */}
      {clampedIdx === 0 && (
        <div style={{
          position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center',
          fontFamily: FONT.mono, fontSize: 9.5, color: TER, letterSpacing: 0.8,
          pointerEvents: 'none', animation: 'rcFadeIn 800ms 1500ms both',
        }}>TAP → NEXT   ·   ← PREV   ·   HOLD TO PAUSE</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────
const _FONT = window.FONT || { sans: 'system-ui', mono: 'monospace' };
const COLORS = {
  BG: '#0A0A0A', INK: '#FAFAFA',
  SUB: 'rgba(255,255,255,0.72)',
  DIM: 'rgba(255,255,255,0.5)',
  TER: 'rgba(255,255,255,0.32)',
  GOOD: '#5FC48B', WARN: '#E8854A',
};

function Stage({ children, align = 'center' }) {
  return (
    <div style={{
      flex: 1, padding: '36px 28px 80px',
      display: 'flex', flexDirection: 'column',
      justifyContent: align === 'top' ? 'flex-start' : 'center',
      alignItems: 'stretch', position: 'relative', zIndex: 1,
    }}>{children}</div>
  );
}

function Kicker({ children, color = COLORS.DIM, delay = 0 }) {
  return (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10.5, color,
      letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 500,
      marginBottom: 18,
      animation: `rcFadeDown 500ms ${delay}ms both`,
    }}>{children}</div>
  );
}

// Count-up hook for revealing numbers
function useCountUp(target, duration = 1500) {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    if (target == null || !isFinite(target)) { setVal(target || 0); return; }
    if (target === 0) { setVal(0); return; }
    const start = Date.now();
    let raf;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);
  return val;
}

// Confetti burst (only renders when active). Uses CSS custom properties for direction.
function Confetti() {
  const particles = React.useMemo(() => {
    const colors = ['#5FC48B', '#E8854A', '#FAFAFA', '#F59E0B', '#D64545'];
    return Array.from({ length: 30 }, (_, i) => {
      const angle = (i / 30) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const dist = 120 + Math.random() * 160;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 20,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 6,
        delay: Math.random() * 300,
        round: Math.random() > 0.4,
      };
    });
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: '50%', top: '40%',
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: p.round ? '50%' : '2px',
          animation: `rcBurst 1.6s cubic-bezier(0.1, 0.9, 0.3, 1) ${p.delay}ms forwards`,
          ['--x']: `${p.x}px`,
          ['--y']: `${p.y}px`,
          opacity: 0,
        }}/>
      ))}
    </div>
  );
}

// Sparkle — 4 little stars around an element
function Sparkles({ around = { x: 0, y: 0 } }) {
  const positions = [
    { x: -40, y: -20, delay: 200, size: 8 },
    { x: 45, y: -30, delay: 500, size: 6 },
    { x: -55, y: 30, delay: 800, size: 7 },
    { x: 50, y: 35, delay: 1100, size: 5 },
  ];
  return (
    <>
      {positions.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`,
          width: p.size, height: p.size,
          transform: 'translate(-50%, -50%)',
          animation: `rcSparkleRot 1.6s ${p.delay}ms infinite`,
          opacity: 0,
        }}>
          <svg viewBox="0 0 10 10" width="100%" height="100%">
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="#FAFAFA"/>
          </svg>
        </div>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Slide: Welcome
// ─────────────────────────────────────────────────────────
function WelcomeSlide({ course, dateStr, isHalf, reached }) {
  return (
    <Stage>
      <Kicker>Round · Complete</Kicker>
      <div style={{ position: 'relative' }}>
        <Sparkles/>
        <div style={{
          fontSize: 46, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.12,
          marginBottom: 8, position: 'relative', zIndex: 1,
          animation: 'rcPopIn 700ms cubic-bezier(0.16, 1, 0.3, 1) 100ms both',
        }}>
          お疲れ様<br/>でした
        </div>
      </div>
      <div style={{
        fontSize: 14.5, color: COLORS.INK, fontWeight: 500, letterSpacing: -0.1,
        marginTop: 28,
        animation: 'rcFadeUp 500ms 700ms both',
      }}>{course.name}</div>
      <div style={{
        fontFamily: FONT.mono, fontSize: 11.5, color: COLORS.DIM,
        marginTop: 6, letterSpacing: 0.4,
        animation: 'rcFadeUp 500ms 850ms both',
      }}>{dateStr}{isHalf ? ' · HALF' : ''}</div>
    </Stage>
  );
}

// ─────────────────────────────────────────────────────────
// Slide: Summary (こんなラウンドでしたね)
// ─────────────────────────────────────────────────────────
function SummarySlide({ total, diff, playedPar, played, stats, reached, isHalf }) {
  const countTotal = useCountUp(total, 1400);
  const diffColor = diff > 0 ? COLORS.WARN : diff < 0 ? COLORS.GOOD : COLORS.INK;
  const chips = [
    { k: 'Birdie', v: stats.birdies, c: COLORS.GOOD },
    { k: 'Par',    v: stats.pars,    c: COLORS.INK },
    { k: 'Bogey',  v: stats.bogeys,  c: COLORS.INK },
    { k: 'OB',     v: stats.obCount, c: stats.obCount > 0 ? COLORS.WARN : COLORS.INK },
    { k: '3Putt',  v: stats.threePutts, c: stats.threePutts > 0 ? COLORS.WARN : COLORS.INK },
  ].filter(c => c.v > 0 || ['Par', 'Bogey'].includes(c.k));
  return (
    <Stage>
      {reached && <Confetti/>}
      <Kicker>こんなラウンドでしたね</Kicker>
      <div style={{
        fontFamily: FONT.mono, fontSize: 112, fontWeight: 300,
        letterSpacing: -4.5, lineHeight: 0.9, marginBottom: 4,
        animation: 'rcFadeIn 200ms both',
      }}>{Math.round(countTotal) || '—'}</div>
      <div style={{
        fontFamily: FONT.mono, fontSize: 28, fontWeight: 500, color: diffColor,
        letterSpacing: -0.5, marginTop: 4,
        animation: 'rcPopIn 500ms 1400ms both',
      }}>{diff >= 0 ? '+' : ''}{diff}</div>
      <div style={{
        marginTop: 16, fontFamily: FONT.mono, fontSize: 10.5,
        color: COLORS.TER, letterSpacing: 0.5,
        animation: 'rcFadeIn 400ms 1500ms both',
      }}>PAR {playedPar} · {played.length}ホール{isHalf ? ' (HALF)' : ''}</div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 32,
      }}>
        {chips.map((c, i) => (
          <div key={c.k} style={{
            display: 'flex', alignItems: 'baseline', gap: 6,
            padding: '7px 11px', borderRadius: 4,
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid rgba(255,255,255,0.15)`,
            animation: `rcScaleIn 450ms ${1700 + i * 90}ms cubic-bezier(0.16, 1, 0.3, 1) both`,
          }}>
            <span style={{
              fontFamily: FONT.sans, fontSize: 11, color: COLORS.DIM, fontWeight: 500,
            }}>{c.k}</span>
            <span style={{
              fontFamily: FONT.mono, fontSize: 15, color: c.c, fontWeight: 500, letterSpacing: -0.3,
            }}>{c.v}</span>
          </div>
        ))}
      </div>
    </Stage>
  );
}

// ─────────────────────────────────────────────────────────
// Slide: Good points (ここが良かったですね！)
// ─────────────────────────────────────────────────────────
function GoodSlide({ highlights }) {
  return (
    <Stage>
      <Kicker color={COLORS.GOOD}>Good Points</Kicker>
      <div style={{
        fontSize: 34, fontWeight: 800, letterSpacing: -1, lineHeight: 1.2,
        marginBottom: 6,
        animation: 'rcPopIn 600ms 100ms cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>ここが良かった<br/>ですね！</div>
      <div style={{
        fontSize: 13, color: COLORS.SUB, marginBottom: 26,
        animation: 'rcFadeIn 400ms 700ms both',
      }}>データから光っていた点を拾いました。</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {highlights.map((h, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '13px 14px',
            background: 'rgba(95, 196, 139, 0.08)',
            border: `1px solid rgba(95, 196, 139, 0.3)`,
            borderRadius: 8,
            animation: `rcSlideInRight 500ms ${900 + i * 220}ms cubic-bezier(0.16, 1, 0.3, 1) both`,
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22">
              <circle cx="11" cy="11" r="10" fill={COLORS.GOOD} opacity="0.15"/>
              <path d="M6 11 L 10 15 L 16 8" stroke={COLORS.GOOD} strokeWidth="2" fill="none"
                strokeLinecap="round" strokeLinejoin="round"
                style={{
                  strokeDasharray: 20, strokeDashoffset: 20,
                  animation: `rcDrawCheck 500ms ${1100 + i * 220}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                }}/>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>{h.label}</div>
              <div style={{ fontSize: 11.5, color: COLORS.SUB, marginTop: 3 }}>{h.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </Stage>
  );
}

// ─────────────────────────────────────────────────────────
// Slide: Focus — target + metric with animated bar
// ─────────────────────────────────────────────────────────
function FocusSlide({ target, reached, focus, persona }) {
  // Normalize for bar: show "current vs target" on a 0..max scale
  const cur = focus.current;
  const tgt = focus.target;
  const isAvgPutt = focus.key === 'avgPutt';
  const hasNums = cur != null && tgt != null;
  // For forward metrics (higher is better): bar fills to `cur/tgtTop` where tgtTop = max(cur, tgt)*1.05
  // For reverse (OB, threePutt, avgPutt): visualize as "distance from 0"
  const pctCur = hasNums
    ? (focus.reverse
        ? Math.max(0, Math.min(100, (1 - cur / Math.max(cur, tgt, 1) * 1.1) * 100))
        : Math.max(0, Math.min(100, (cur / Math.max(tgt, 1) / 1.1) * 100)))
    : 0;
  const pctTgt = hasNums
    ? (focus.reverse
        ? Math.max(0, Math.min(100, (1 - tgt / Math.max(cur, tgt, 1) * 1.1) * 100))
        : Math.max(0, Math.min(100, (tgt / Math.max(tgt, 1) / 1.1) * 100)))
    : 0;
  return (
    <Stage>
      <Kicker>次のレベルへ</Kicker>

      {/* Target headline */}
      <div style={{
        fontSize: 17, fontWeight: 500, color: COLORS.SUB, letterSpacing: -0.2,
        marginBottom: 6,
        animation: 'rcFadeUp 500ms 100ms both',
      }}>あなたの次の目標は</div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10,
        marginBottom: 28,
        animation: 'rcFadeUp 500ms 300ms both',
      }}>
        <span style={{
          fontFamily: FONT.mono, fontSize: 70, fontWeight: 300,
          letterSpacing: -2.5, lineHeight: 1, color: COLORS.INK,
        }}>{target || '—'}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 14, color: COLORS.DIM, letterSpacing: 0.3 }}>
          打を切る
        </span>
      </div>

      {/* Focus metric */}
      <div style={{
        fontSize: 15, color: COLORS.SUB, lineHeight: 1.6,
        marginBottom: 8,
        animation: 'rcFadeUp 500ms 1000ms both',
      }}>そのために磨くのは</div>
      <div style={{
        fontSize: 26, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.2,
        marginBottom: 20,
        animation: 'rcPopIn 550ms 1200ms cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>{focus.label}</div>

      {hasNums && (
        <div style={{ animation: 'rcFadeUp 500ms 1600ms both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <div>
              <span style={{
                fontFamily: FONT.mono, fontSize: 9, color: COLORS.TER, letterSpacing: 0.5, textTransform: 'uppercase',
              }}>今回</span>
              <span style={{
                fontFamily: FONT.mono, fontSize: 22, fontWeight: 500, marginLeft: 8,
                color: focus.gap > 0 ? COLORS.WARN : COLORS.GOOD, letterSpacing: -0.6,
              }}>
                {isAvgPutt ? cur.toFixed(2) : Math.round(cur)}{isAvgPutt ? '' : '%'}
              </span>
            </div>
            <div>
              <span style={{
                fontFamily: FONT.mono, fontSize: 9, color: COLORS.TER, letterSpacing: 0.5, textTransform: 'uppercase',
              }}>目標</span>
              <span style={{
                fontFamily: FONT.mono, fontSize: 18, fontWeight: 500, marginLeft: 8,
                color: COLORS.SUB, letterSpacing: -0.3,
              }}>
                {isAvgPutt ? tgt.toFixed(2) : tgt}{isAvgPutt ? '' : '%'}
              </span>
            </div>
          </div>
          {/* Progress bar: current vs target markers */}
          <div style={{
            position: 'relative', height: 6,
            background: 'rgba(255,255,255,0.12)', borderRadius: 3,
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${pctCur}%`,
              background: focus.gap > 0 ? COLORS.WARN : COLORS.GOOD,
              borderRadius: 3, transformOrigin: 'left',
              animation: 'rcBarFill 900ms 1800ms cubic-bezier(0.16, 1, 0.3, 1) both',
              ['--from']: 0, ['--to']: 1,
            }}/>
            {/* target marker */}
            <div style={{
              position: 'absolute', left: `${pctTgt}%`, top: -4, bottom: -4,
              width: 2, background: COLORS.INK, opacity: 0.85,
              animation: 'rcFadeIn 400ms 2500ms both',
            }}/>
          </div>
        </div>
      )}

      <div style={{
        fontSize: 13.5, color: COLORS.SUB, lineHeight: 1.7, marginTop: 26,
        animation: 'rcFadeUp 500ms 2200ms both',
      }}>
        {reached
          ? 'ここを安定できれば、次のレベルが視界に入ります。'
          : 'この1点を集中的に磨けば、目標は届きます。'}
      </div>
    </Stage>
  );
}

// ─────────────────────────────────────────────────────────
// Slide: Drill
// ─────────────────────────────────────────────────────────
function DrillSlide({ recDrill, favActive, toggleFav, openDrill }) {
  return (
    <Stage align="top">
      <Kicker>For That Metric</Kicker>
      <div style={{
        fontSize: 30, fontWeight: 800, letterSpacing: -0.7, lineHeight: 1.2,
        marginBottom: 10,
        animation: 'rcPopIn 550ms 100ms cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>このドリルを<br/>やってみよう</div>

      {/* Drill card */}
      <div style={{
        marginTop: 16, padding: '16px 16px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 10,
        animation: 'rcFadeUp 500ms 500ms both',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.3 }}>
          {recDrill.data.challenge || recDrill.data.title || recDrill.id}
        </div>
        {recDrill.data.challengeSub && (
          <div style={{ fontSize: 12, color: COLORS.SUB, marginTop: 4 }}>
            {recDrill.data.challengeSub}
          </div>
        )}
        {recDrill.data.why && (
          <div style={{
            fontSize: 13, lineHeight: 1.7, color: COLORS.SUB,
            marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.12)',
          }}>
            {recDrill.data.why}
          </div>
        )}
      </div>

      {/* CTAs */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16,
        animation: 'rcFadeUp 500ms 800ms both',
      }}>
        <button onClick={openDrill} data-interactive="true" style={{
          background: COLORS.INK, color: COLORS.BG, border: 'none',
          padding: '15px 16px', borderRadius: 8,
          fontFamily: FONT.sans, fontSize: 14, fontWeight: 700,
          cursor: 'pointer', letterSpacing: -0.1,
          animation: 'rcPulse 2.2s 1400ms infinite',
        }}>ドリルページを開く  →</button>
        <button onClick={toggleFav} data-interactive="true" style={{
          background: favActive ? 'rgba(255,255,255,0.12)' : 'transparent',
          color: COLORS.INK,
          border: `1px solid ${favActive ? COLORS.INK : 'rgba(255,255,255,0.3)'}`,
          padding: '12px 16px', borderRadius: 8,
          fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill={favActive ? 'currentColor' : 'none'}>
            <path d="M8 13.5s-5.5-3.2-5.5-7.2c0-2 1.5-3.3 3.2-3.3 1.1 0 2 .6 2.3 1.5.3-.9 1.2-1.5 2.3-1.5 1.7 0 3.2 1.3 3.2 3.3 0 4-5.5 7.2-5.5 7.2z"
              stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
          {favActive ? 'お気に入り登録済み' : 'あとで見返す（お気に入り）'}
        </button>
      </div>
    </Stage>
  );
}

// ─────────────────────────────────────────────────────────
// Slide: Close
// ─────────────────────────────────────────────────────────
function CloseSlide({ total, diff, goHome, reached }) {
  const diffColor = diff > 0 ? COLORS.WARN : diff < 0 ? COLORS.GOOD : COLORS.SUB;
  return (
    <Stage>
      <Kicker>See You Next Round</Kicker>
      <div style={{
        fontSize: 38, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.2,
        marginBottom: 24,
        animation: 'rcPopIn 600ms 100ms cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>また次の<br/>ラウンドで</div>

      <div style={{
        fontFamily: FONT.mono, fontSize: 11, color: COLORS.DIM, letterSpacing: 0.6,
        marginBottom: 8,
        animation: 'rcFadeIn 400ms 700ms both',
      }}>TODAY</div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 40,
        animation: 'rcFadeUp 500ms 900ms both',
      }}>
        <span style={{
          fontFamily: FONT.mono, fontSize: 48, fontWeight: 300, letterSpacing: -2,
        }}>{total || '—'}</span>
        <span style={{
          fontFamily: FONT.mono, fontSize: 18, fontWeight: 500, color: diffColor,
        }}>{diff >= 0 ? '+' : ''}{diff}</span>
      </div>

      <button onClick={goHome} data-interactive="true" style={{
        background: COLORS.INK, color: COLORS.BG, border: 'none',
        padding: '14px 20px', borderRadius: 8, width: '100%',
        fontFamily: FONT.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
        animation: 'rcFadeUp 500ms 1200ms both',
      }}>ホームに戻る</button>
      <div style={{
        fontFamily: FONT.mono, fontSize: 10, color: COLORS.TER,
        letterSpacing: 0.4, marginTop: 14, textAlign: 'center', lineHeight: 1.6,
        animation: 'rcFadeIn 400ms 1500ms both',
      }}>
        48時間以内、ホームの<br/>LATEST ROUND からいつでも見返せます
      </div>
    </Stage>
  );
}

window.RoundCompleteScreen = RoundCompleteScreen;

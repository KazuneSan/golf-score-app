// screens/round-complete.jsx — Instagram Stories-like slideshow of round wrap-up.
//
// Navigation:
//   - Tap right 1/3 → next slide
//   - Tap left 1/3 → previous slide
//   - Hold (touch/mouse down) → pause auto-advance
//   - Last slide: stays put, has "ホームに戻る" CTA
//
// Slides (dynamic order):
//   1. Open        — "お疲れ様でした" + course + date
//   2. Score       — big number + diff
//   3. Target      — reached / missed verdict + praise copy
//   4..N. Highlights (up to 2) — per positive fact
//   N+1. Focus     — next level metric
//   N+2. Drill     — recommended drill + favorite
//   N+3. Close     — "また次のラウンドで" + return home button

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

  // ── per-round stats ────────────────────────────────────
  const stats = {
    obCount:     played.filter(h => h.ob).length,
    hazardCount: played.filter(h => h.hazard).length,
    threePutts:  played.filter(h => (h.putts || 0) >= 3).length,
    totalPutts:  played.reduce((a, h) => a + (h.putts || 0), 0),
    eagles:   played.filter(h => h.strokes - h.par <= -2).length,
    birdies:  played.filter(h => h.strokes - h.par === -1).length,
    pars:     played.filter(h => h.strokes - h.par === 0).length,
    bogeys:   played.filter(h => h.strokes - h.par === 1).length,
    boggyOnHoles: played.filter(h => (h.strokes - (h.putts || 0)) <= (h.par - 1)).length,
    parOnHoles:   played.filter(h => (h.strokes - (h.putts || 0)) <= (h.par - 2)).length,
  };
  stats.boggyOnPct   = played.length ? Math.round((stats.boggyOnHoles / played.length) * 100) : 0;
  stats.parOnPct     = played.length ? Math.round((stats.parOnHoles   / played.length) * 100) : 0;
  stats.threePuttPct = played.length ? Math.round((stats.threePutts   / played.length) * 100) : 0;
  stats.obPct        = played.length ? Math.round((stats.obCount      / played.length) * 100) : 0;
  stats.avgPutt      = played.length ? (stats.totalPutts / played.length) : 0;

  // Best hole + streak
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

  // Highlights (keyword + meaning)
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
  // Limit to 2 for story pacing
  const topHighlights = highlights.slice(0, 2);

  // ── focus metric (same logic as previous version) ─────
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
      return { label, key, gap, current: roundVal, target: tgt };
    });
    candidates.sort((a, b) => (b.gap || 0) - (a.gap || 0));
    return candidates[0] || { label: 'パーオン率', key: 'parOn' };
  })();

  // Drill rec
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

  const praise = (() => {
    if (reached && -gap >= 3) return { body: 'いつもよりグッと締まったラウンドでした。次のレベルに向けた練習に進む価値が十分にあります。' };
    if (reached) return { body: '大きなミスを避けきった勝負強さが光りました。この感覚を次に持ち越しましょう。' };
    if (gap <= 3) return { body: '大崩れはなく、ここを磨けば目標はすぐそこ。気になる指標を1つだけ決めて、次のラウンドに備えましょう。' };
    return { body: '今日は難しいラウンドでしたね。ただデータを見ると、光っていた場面はしっかりあります。改善の糸口も見えています。' };
  })();

  const dateStr = new Date(state.startedAt).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  });

  const goHome = () => go('home');

  // ── colors (story palette — always dark for cinematic feel) ─
  const BG = '#0B0B0B';
  const INK = '#FAFAFA';
  const SUB = 'rgba(255,255,255,0.7)';
  const DIM = 'rgba(255,255,255,0.5)';
  const TER = 'rgba(255,255,255,0.35)';
  const GOOD = '#5FC48B';
  const WARN = '#E8854A';

  // ── build slides array ─────────────────────────────────
  const slides = [];

  // 1. Open
  slides.push({
    key: 'open', duration: 3500,
    render: () => (
      <StorySlide>
        <StoryLabel color={DIM}>Round · Complete</StoryLabel>
        <div style={{
          fontSize: 42, fontWeight: 700, letterSpacing: -1.3, lineHeight: 1.15,
          marginBottom: 30,
        }}>お疲れ様<br/>でした</div>
        <div style={{ fontSize: 14.5, color: INK, fontWeight: 500, letterSpacing: -0.1 }}>
          {course.name}
        </div>
        <div style={{
          fontFamily: FONT.mono, fontSize: 11.5, color: DIM,
          marginTop: 6, letterSpacing: 0.4,
        }}>
          {dateStr}{isHalf ? ' · HALF' : ''}
        </div>
      </StorySlide>
    ),
  });

  // 2. Score
  slides.push({
    key: 'score', duration: 4500,
    render: () => {
      const diffColor = diff > 0 ? WARN : diff < 0 ? GOOD : INK;
      return (
        <StorySlide>
          <StoryLabel color={DIM}>{isHalf ? 'ハーフ・スコア' : '今日のスコア'}</StoryLabel>
          <div style={{
            fontFamily: FONT.mono, fontSize: 130, fontWeight: 300,
            letterSpacing: -5.5, lineHeight: 0.9, marginBottom: 6,
          }}>{total || '—'}</div>
          <div style={{
            fontFamily: FONT.mono, fontSize: 30, fontWeight: 500,
            color: diffColor, letterSpacing: -0.5,
          }}>{diff >= 0 ? '+' : ''}{diff}</div>
          <div style={{
            marginTop: 32, fontFamily: FONT.mono, fontSize: 11,
            color: TER, letterSpacing: 0.6,
          }}>PAR {playedPar || (course.par || 72)} · {played.length}ホール完走</div>
        </StorySlide>
      );
    },
  });

  // 3. Target verdict
  slides.push({
    key: 'target', duration: 5000,
    render: () => {
      const headColor = reached ? GOOD : WARN;
      return (
        <StorySlide>
          <StoryLabel color={headColor}>{reached ? 'Target Achieved' : 'Target Missed'}</StoryLabel>
          <div style={{
            fontSize: reached ? 46 : 40, fontWeight: 700, letterSpacing: -1.3, lineHeight: 1.1,
            color: reached ? GOOD : INK, marginBottom: 22,
          }}>
            {reached ? '目標クリア' : `あと${gap}打`}
          </div>
          <div style={{
            fontFamily: FONT.mono, fontSize: 12.5, color: SUB,
            marginBottom: 28, letterSpacing: 0.4,
          }}>
            目標 {targetVal} / 実績 {total}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: SUB }}>
            {praise.body}
          </div>
        </StorySlide>
      );
    },
  });

  // 4..N. Highlights
  topHighlights.forEach((h, i) => {
    slides.push({
      key: `highlight-${i}`, duration: 4000,
      render: () => (
        <StorySlide>
          <StoryLabel color={GOOD}>今日の光ったところ {i + 1}/{topHighlights.length}</StoryLabel>
          <div style={{
            fontFamily: FONT.mono, fontSize: 58, fontWeight: 400,
            letterSpacing: -1.8, lineHeight: 1, marginBottom: 20,
          }}>{h.label}</div>
          <div style={{ fontSize: 16, color: SUB, lineHeight: 1.6 }}>{h.sub}</div>
        </StorySlide>
      ),
    });
  });

  // N+1. Focus metric
  slides.push({
    key: 'focus', duration: 6000,
    render: () => (
      <StorySlide>
        <StoryLabel color={DIM}>次のレベルへ</StoryLabel>
        <div style={{
          fontSize: 36, fontWeight: 700, letterSpacing: -1, lineHeight: 1.2,
          marginBottom: 26,
        }}>
          {focus.label}を<br/>磨こう
        </div>
        {focus.current != null && focus.target != null && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 26 }}>
            <div>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: TER, letterSpacing: 0.6, textTransform: 'uppercase' }}>今回</div>
              <div style={{
                fontFamily: FONT.mono, fontSize: 42, fontWeight: 400,
                color: focus.gap > 0 ? WARN : GOOD,
                letterSpacing: -1.5, lineHeight: 1, marginTop: 4,
              }}>
                {focus.key === 'avgPutt' ? focus.current.toFixed(2) : Math.round(focus.current)}
                <span style={{ fontSize: 18 }}>{focus.key === 'avgPutt' ? '' : '%'}</span>
              </div>
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: TER }}>→</div>
            <div>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: TER, letterSpacing: 0.6, textTransform: 'uppercase' }}>目標</div>
              <div style={{
                fontFamily: FONT.mono, fontSize: 28, fontWeight: 400,
                color: SUB, letterSpacing: -0.5, lineHeight: 1, marginTop: 4,
              }}>
                {focus.key === 'avgPutt' ? focus.target.toFixed(2) : focus.target}
                <span style={{ fontSize: 14 }}>{focus.key === 'avgPutt' ? '' : '%'}</span>
              </div>
            </div>
          </div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.7, color: SUB }}>
          {reached
            ? 'ここを安定できれば、次のレベルが現実的に見えてきます。'
            : 'この1点を磨けば、目標は超えられます。'}
        </div>
      </StorySlide>
    ),
  });

  // N+2. Drill
  if (recDrill) {
    slides.push({
      key: 'drill', duration: 7500,
      render: () => (
        <StorySlide align="top">
          <StoryLabel color={DIM}>おすすめのドリル</StoryLabel>
          <div style={{
            fontSize: 26, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.3,
            marginBottom: 12,
          }}>{recDrill.data.challenge || recDrill.data.title || recDrill.id}</div>
          {recDrill.data.challengeSub && (
            <div style={{ fontSize: 13, color: SUB, marginBottom: 22 }}>
              {recDrill.data.challengeSub}
            </div>
          )}
          {recDrill.data.why && (
            <div style={{ fontSize: 13.5, lineHeight: 1.75, color: SUB, marginBottom: 24 }}>
              {recDrill.data.why}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            <button onClick={toggleFav} data-interactive="true" style={{
              background: favActive ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: INK,
              border: `1px solid ${favActive ? INK : 'rgba(255,255,255,0.3)'}`,
              padding: '12px 16px', borderRadius: 6,
              fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill={favActive ? 'currentColor' : 'none'}>
                <path d="M8 13.5s-5.5-3.2-5.5-7.2c0-2 1.5-3.3 3.2-3.3 1.1 0 2 .6 2.3 1.5.3-.9 1.2-1.5 2.3-1.5 1.7 0 3.2 1.3 3.2 3.3 0 4-5.5 7.2-5.5 7.2z"
                  stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
              {favActive ? 'お気に入り登録済み' : 'お気に入りに登録'}
            </button>
            <button onClick={openDrill} data-interactive="true" style={{
              background: INK, color: BG, border: 'none',
              padding: '13px 16px', borderRadius: 6,
              fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            }}>ドリルを見る →</button>
          </div>
        </StorySlide>
      ),
    });
  }

  // N+3. Close
  slides.push({
    key: 'close', duration: Infinity,
    render: () => (
      <StorySlide>
        <StoryLabel color={DIM}>See you next round</StoryLabel>
        <div style={{
          fontSize: 40, fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.2,
          marginBottom: 30,
        }}>また次の<br/>ラウンドで</div>
        <div style={{
          fontFamily: FONT.mono, fontSize: 12, color: DIM, letterSpacing: 0.4,
          marginBottom: 8,
        }}>TODAY</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 42 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 42, fontWeight: 400, letterSpacing: -1.5 }}>
            {total || '—'}
          </span>
          <span style={{ fontFamily: FONT.mono, fontSize: 16, fontWeight: 500,
            color: diff > 0 ? WARN : diff < 0 ? GOOD : SUB }}>
            {diff >= 0 ? '+' : ''}{diff}
          </span>
        </div>
        <button onClick={goHome} data-interactive="true" style={{
          background: INK, color: BG, border: 'none',
          padding: '14px 20px', borderRadius: 8, width: '100%',
          fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>ホームに戻る</button>
        <div style={{
          fontFamily: FONT.mono, fontSize: 10, color: TER,
          letterSpacing: 0.4, marginTop: 16, textAlign: 'center', lineHeight: 1.6,
        }}>
          この画面は 48時間以内、ホームの<br/>LATEST ROUND から見返せます
        </div>
      </StorySlide>
    ),
  });

  // ── state ──────────────────────────────────────────────
  const [slideIdx, setSlideIdx] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const clampedIdx = Math.max(0, Math.min(slides.length - 1, slideIdx));
  const currentSlide = slides[clampedIdx];

  const next = () => {
    if (slideIdx < slides.length - 1) setSlideIdx(slideIdx + 1);
  };
  const prev = () => {
    if (slideIdx > 0) setSlideIdx(slideIdx - 1);
  };

  // Auto-advance with progress
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
  }, [slideIdx, paused, slides.length]);

  // Tap / hold handlers
  const handlePointerDown = (e) => {
    if (e.target.closest('[data-interactive="true"]')) return;
    setPaused(true);
  };
  const handlePointerUp = (e) => { setPaused(false); };
  const handleClick = (e) => {
    if (e.target.closest('[data-interactive="true"]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    if (x < w * 0.35) prev();
    else if (x > w * 0.65) next();
  };

  // ── render ─────────────────────────────────────────────
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: BG, color: INK, fontFamily: FONT.sans,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      userSelect: 'none',
    }}
      onClick={handleClick}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
    >
      {/* Progress bars */}
      <div style={{
        display: 'flex', gap: 3, padding: '10px 12px 6px',
        position: 'relative', zIndex: 10,
      }}>
        {slides.map((s, i) => (
          <div key={i} style={{
            flex: 1, height: 2.5, background: 'rgba(255,255,255,0.22)', borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: INK,
              width: i < clampedIdx ? '100%' : i === clampedIdx ? `${progress}%` : '0%',
              transition: 'none',
            }}/>
          </div>
        ))}
      </div>

      {/* Top meta bar with close */}
      <div style={{
        padding: '6px 16px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9, color: DIM,
          letterSpacing: 1, textTransform: 'uppercase', fontWeight: 500,
        }}>Fairway</div>
        <button onClick={goHome} data-interactive="true" style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: DIM, padding: '6px 4px',
          fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.8,
        }}>× CLOSE</button>
      </div>

      {/* Slide content */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {currentSlide.render()}
      </div>

      {/* Hint at bottom (only on first slide) */}
      {clampedIdx === 0 && (
        <div style={{
          position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center',
          fontFamily: FONT.mono, fontSize: 9.5, color: TER, letterSpacing: 0.8,
          pointerEvents: 'none',
        }}>TAP → NEXT   ·   ← PREV   ·   HOLD TO PAUSE</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Slide layout primitives (dark cinematic style)
// ─────────────────────────────────────────────────────────
function StorySlide({ children, align = 'center' }) {
  return (
    <div style={{
      flex: 1, padding: '40px 30px 80px',
      display: 'flex', flexDirection: 'column',
      justifyContent: align === 'top' ? 'flex-start' : 'center',
      alignItems: 'stretch',
      position: 'relative', zIndex: 1,
    }}>{children}</div>
  );
}

function StoryLabel({ children, color = 'rgba(255,255,255,0.55)' }) {
  return (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10.5, color,
      letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 500,
      marginBottom: 18,
    }}>{children}</div>
  );
}

window.RoundCompleteScreen = RoundCompleteScreen;

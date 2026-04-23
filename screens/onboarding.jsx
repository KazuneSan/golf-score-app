// screens/onboarding.jsx — Linear v2. 1問1画面の診断。

// Map target score → persona key used across the app
function _scoreToPersona(score) {
  if (score <= 84) return '80切り';
  if (score <= 94) return '90切り';
  return '100切り';
}

function OnboardingScreen({ theme, onFinish, setPersonaKey }) {
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState({
    best: null, avg: null, goal: 99, years: null,
  });

  const qs = [
    {
      id: 'best', title: 'ベストスコアは？',
      sub: 'だいたいで OK',
      options: [
        { v: 110, label: '110 以上' },
        { v: 100, label: '100 前後' },
        { v: 90,  label: '90 前後' },
        { v: 80,  label: '80 台' },
        { v: 75,  label: '70 台' },
      ],
    },
    {
      id: 'avg', title: '平均スコア帯は？',
      sub: '直近 10 ラウンドくらいで',
      options: [
        { v: 110, label: '110 以上' },
        { v: 100, label: '100 前後' },
        { v: 90,  label: '90 前後' },
        { v: 85,  label: '80 台後半' },
        { v: 80,  label: '80 台前半' },
      ],
    },
    {
      id: 'goal', title: '目指したいスコアは？',
      sub: 'スクロールして選ぶ · 指標の優先度はこれに合わせて変わります',
      type: 'wheel',
    },
    {
      id: 'years', title: 'ゴルフ歴は？',
      options: [
        { v: 1, label: '〜1 年' },
        { v: 3, label: '1-3 年' },
        { v: 5, label: '3-5 年' },
        { v: 10, label: '5-10 年' },
        { v: 15, label: '10 年以上' },
      ],
    },
  ];

  const q = qs[step];
  const last = step === qs.length - 1;
  const canNext = q.type === 'wheel' ? answers[q.id] != null : answers[q.id] != null;

  const pick = (v) => setAnswers(a => ({ ...a, [q.id]: v }));

  const doNext = () => {
    if (last) {
      // Persist the exact target score for Home/Focus target-value logic
      try { localStorage.setItem('gs_target_score', String(answers.goal)); } catch {}
      setPersonaKey(_scoreToPersona(answers.goal));
      onFinish();
    } else {
      setStep(s => s + 1);
    }
  };

  if (step === qs.length) return null;

  const label = (txt) => (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
      letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
    }}>{txt}</div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: theme.text, fontFamily: FONT.sans, padding: '8px 0 16px' }}>
      {/* Progress bar */}
      <div style={{ padding: '0 20px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={()=>setStep(s => Math.max(0, s - 1))} disabled={step===0} style={{
          background: 'transparent', border: 'none',
          cursor: step===0 ? 'default' : 'pointer',
          opacity: step===0 ? 0.2 : 1, padding: 0,
        }}>{Icon.chevL(theme.text, 18)}</button>
        <div style={{ flex: 1, display: 'flex', gap: 3 }}>
          {qs.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 2, borderRadius: 1,
              background: i <= step ? theme.text : theme.border,
            }}/>
          ))}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.textSec, minWidth: 28, textAlign: 'right' }}>
          {step + 1}/{qs.length}
        </div>
      </div>

      <div style={{ padding: '0 20px 8px' }}>
        {label('レベル診断')}
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 10, letterSpacing: -0.6, lineHeight: 1.3 }}>{q.title}</div>
        {q.sub && <div style={{ fontSize: 12.5, color: theme.textSec, marginTop: 6 }}>{q.sub}</div>}
      </div>

      {q.type === 'wheel' ? (
        <div style={{ padding: '22px 20px 16px' }}>
          <ScoreWheel
            min={70} max={120}
            value={answers.goal ?? 99}
            onChange={(v) => pick(v)}
            theme={theme}
          />
          <div style={{
            marginTop: 12, textAlign: 'center',
            fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
            letterSpacing: 0.4,
          }}>
            {_scoreToPersona(answers.goal ?? 99)}レベル
          </div>
        </div>
      ) : (
        <div style={{ padding: '22px 20px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {q.options.map(o => {
            const on = answers[q.id] === o.v;
            return (
              <button key={o.v} onClick={()=>pick(o.v)} style={{
                border: `1px solid ${on ? theme.text : theme.border}`,
                padding: '13px 15px',
                background: on ? theme.text : theme.surface,
                color: on ? theme.bg : theme.text,
                borderRadius: 6, cursor: 'pointer',
                fontFamily: FONT.sans, fontSize: 14, fontWeight: 500,
                textAlign: 'left',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                letterSpacing: -0.1,
              }}>
                <span>{o.label}</span>
                {on && Icon.check(theme.bg, 14)}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1 }}/>

      <div style={{ padding: '12px 20px 14px' }}>
        <TapBtn theme={theme} variant="primary" full disabled={!canNext} onClick={doNext}>
          {last ? '診断結果を見る' : '次へ'}
        </TapBtn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ScoreWheel — iOS-style vertical scroll picker.
// Numbers snap to center, selected is large + bold, neighbors fade.
// ─────────────────────────────────────────────────────────
function ScoreWheel({ min, max, value, onChange, theme }) {
  const ITEM_H = 44;
  const VISIBLE = 5;
  const CONTAINER_H = ITEM_H * VISIBLE;
  const wheelRef = React.useRef(null);
  const rafRef = React.useRef(null);

  // Golf: smaller score is better. Put best (lowest) at top so scrolling up = aspiring.
  const scores = React.useMemo(() => {
    const arr = [];
    for (let v = min; v <= max; v++) arr.push(v);
    return arr;
  }, [min, max]);

  // Sync scroll position to current value on first mount
  React.useEffect(() => {
    if (!wheelRef.current || value == null) return;
    const idx = scores.indexOf(value);
    if (idx >= 0) {
      wheelRef.current.scrollTop = idx * ITEM_H;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = wheelRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(scores.length - 1, idx));
      const v = scores[clamped];
      if (v != null && v !== value) onChange(v);
    });
  };

  return (
    <div style={{
      position: 'relative', width: '100%', maxWidth: 240, margin: '0 auto',
    }}>
      {/* Center selection band */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: CONTAINER_H / 2 - ITEM_H / 2,
        height: ITEM_H,
        borderTop: `1px solid ${theme.border}`,
        borderBottom: `1px solid ${theme.border}`,
        pointerEvents: 'none',
        zIndex: 1,
      }}/>
      {/* Side ticks */}
      <div style={{
        position: 'absolute', left: 8, top: CONTAINER_H / 2 - ITEM_H / 2 + ITEM_H / 2 - 6,
        width: 10, height: 12, borderLeft: `2px solid ${theme.text}`, pointerEvents: 'none', zIndex: 3,
      }}/>
      <div style={{
        position: 'absolute', right: 8, top: CONTAINER_H / 2 - ITEM_H / 2 + ITEM_H / 2 - 6,
        width: 10, height: 12, borderRight: `2px solid ${theme.text}`, pointerEvents: 'none', zIndex: 3,
      }}/>

      {/* Top/bottom fade masks */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: CONTAINER_H / 2,
        background: `linear-gradient(${theme.bg}, rgba(0,0,0,0))`,
        pointerEvents: 'none', zIndex: 2,
      }}/>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: CONTAINER_H / 2,
        background: `linear-gradient(rgba(0,0,0,0), ${theme.bg})`,
        pointerEvents: 'none', zIndex: 2,
      }}/>

      {/* Scrollable list */}
      <div
        ref={wheelRef}
        onScroll={handleScroll}
        style={{
          height: CONTAINER_H,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          padding: `${CONTAINER_H / 2 - ITEM_H / 2}px 0`,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        className="hide-scroll"
      >
        {scores.map(s => {
          const isSelected = s === value;
          const distance = Math.abs(s - value);
          const opacity = isSelected ? 1
                        : distance === 1 ? 0.55
                        : distance === 2 ? 0.3
                        : 0.15;
          return (
            <div key={s} style={{
              height: ITEM_H,
              scrollSnapAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT.mono,
              fontSize: isSelected ? 34 : 22,
              fontWeight: isSelected ? 500 : 400,
              color: theme.text,
              opacity,
              transition: 'font-size 0.15s, opacity 0.15s',
              letterSpacing: -1.2,
              lineHeight: 1,
              userSelect: 'none',
            }}>
              {s}
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.OnboardingScreen = OnboardingScreen;

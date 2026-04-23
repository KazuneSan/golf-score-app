// screens/onboarding.jsx — Linear v2. 1問1画面の診断。

function OnboardingScreen({ theme, onFinish, setPersonaKey }) {
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState({
    best: null, avg: null, goal: null, years: null,
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
      id: 'goal', title: '直近の目標は？',
      sub: 'これに合わせて指標の優先度が変わります',
      options: [
        { v: 'sub100', label: '100 切り' },
        { v: 'sub90',  label: '90 切り' },
        { v: 'sub85',  label: '80 台を安定' },
        { v: 'sub80',  label: '80 切り・競技志向' },
      ],
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
  const canNext = answers[q.id] != null;

  const pick = (v) => setAnswers(a => ({ ...a, [q.id]: v }));

  const doNext = () => {
    if (last) {
      const map = { sub100: '100切り', sub90: '90切り', sub85: '80切り', sub80: '80切り' };
      setPersonaKey(map[answers.goal] || '90切り');
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

      <div style={{ flex: 1 }}/>

      <div style={{ padding: '12px 20px 14px' }}>
        <TapBtn theme={theme} variant="primary" full disabled={!canNext} onClick={doNext}>
          {last ? '診断結果を見る' : '次へ'}
        </TapBtn>
      </div>
    </div>
  );
}

window.OnboardingScreen = OnboardingScreen;

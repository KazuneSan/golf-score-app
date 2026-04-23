// pattern-1-linear.jsx — Linear-inspired: grayscale, typography, minimal chrome

function Pattern1Linear({ screen }) {
  const d = window.STYLE_DATA;
  const t = {
    bg: '#FAFAFA', surface: '#FFFFFF',
    border: '#EAEAEA', borderStrong: '#D4D4D4',
    text: '#111111', sub: '#6B6B6B', ter: '#9B9B9B',
    accent: '#5E6AD2', // linear purple
    sans: 'Inter, -apple-system, sans-serif',
    mono: 'IBM Plex Mono, monospace',
  };

  const Row = ({ label, value, mono = true }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: `1px solid ${t.border}`, fontSize: 13 }}>
      <span style={{ color: t.sub }}>{label}</span>
      <span style={{ fontFamily: mono ? t.mono : t.sans, fontWeight: 500, color: t.text }}>{value}</span>
    </div>
  );

  if (screen === 'home') return (
    <div style={{ padding: '48px 20px 20px', height: '100%', overflow: 'auto', background: t.bg, fontFamily: t.sans, color: t.text, letterSpacing: -0.1 }}>
      <div style={{ fontFamily: t.mono, fontSize: 10, color: t.ter, letterSpacing: 0.8, textTransform: 'uppercase' }}>FAIRWAY · OVERVIEW</div>
      <div style={{ fontSize: 20, fontWeight: 600, marginTop: 18, letterSpacing: -0.4 }}>Hi, Koji.</div>
      <div style={{ fontSize: 13, color: t.sub, marginTop: 2 }}>HCP 18.2 · <span style={{ color: '#2A8D5C' }}>−0.6</span> this month</div>

      <div style={{ marginTop: 28, fontFamily: t.mono, fontSize: 10, color: t.ter, letterSpacing: 0.8, textTransform: 'uppercase' }}>LAST ROUND</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
        <div style={{ fontFamily: t.mono, fontSize: 52, fontWeight: 400, letterSpacing: -2 }}>{d.latestRound.score}</div>
        <div style={{ fontFamily: t.mono, fontSize: 14, color: t.sub }}>{d.latestRound.toPar}</div>
      </div>
      <div style={{ fontSize: 12, color: t.sub, marginTop: 2 }}>{d.latestRound.course} · {d.latestRound.date}</div>

      <div style={{ marginTop: 24 }}>
        <Row label="Weekly avg"  value={d.weekly.avgScore}/>
        <Row label="Best"        value={d.weekly.bestScore}/>
        <Row label="Putts"       value={d.latestRound.putts}/>
        <Row label="Fairways"    value={`${d.latestRound.fairway}/14`}/>
        <Row label="GIR"         value={`${d.latestRound.gir}/18`}/>
      </div>

      <div style={{ marginTop: 24, fontFamily: t.mono, fontSize: 10, color: t.ter, letterSpacing: 0.8, textTransform: 'uppercase' }}>FOCUS</div>
      {d.challenges.slice(0,2).map((c, i) => (
        <div key={c.key} style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: i===0 ? `1px solid ${t.border}` : 'none' }}>
          <div style={{ width: 2, background: t.accent, flexShrink: 0 }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: t.sub, marginTop: 2, fontFamily: t.mono }}>{c.value}{c.unit} / {c.target}{c.unit}</div>
          </div>
        </div>
      ))}
    </div>
  );

  if (screen === 'analysis') return (
    <div style={{ padding: '48px 20px 20px', height: '100%', overflow: 'auto', background: t.bg, fontFamily: t.sans, color: t.text }}>
      <div style={{ fontFamily: t.mono, fontSize: 10, color: t.ter, letterSpacing: 0.8, textTransform: 'uppercase' }}>ANALYSIS</div>
      <div style={{ fontSize: 22, fontWeight: 600, marginTop: 12, letterSpacing: -0.5 }}>Scoring trend</div>
      <div style={{ fontSize: 12, color: t.sub, marginTop: 4 }}>Last 7 rounds</div>

      <svg viewBox="0 0 300 120" style={{ width: '100%', marginTop: 20 }}>
        <line x1="0" y1="60" x2="300" y2="60" stroke={t.border} strokeDasharray="2 3"/>
        <polyline fill="none" stroke={t.text} strokeWidth="1.5"
          points={d.weekly.trend.map((v,i)=>`${i*48+10},${(v-85)*7+10}`).join(' ')}/>
        {d.weekly.trend.map((v,i)=>(<circle key={i} cx={i*48+10} cy={(v-85)*7+10} r="3" fill={t.bg} stroke={t.text} strokeWidth="1.5"/>))}
      </svg>

      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: t.mono, fontSize: 10, color: t.ter }}>
        <span>avg {d.weekly.avgScore}</span>
        <span>best {d.weekly.bestScore}</span>
      </div>

      <div style={{ marginTop: 28, fontFamily: t.mono, fontSize: 10, color: t.ter, letterSpacing: 0.8, textTransform: 'uppercase' }}>GAPS TO TARGET</div>
      {d.challenges.map(c => {
        const gap = c.reverse ? c.value - c.target : c.target - c.value;
        return (
          <div key={c.key} style={{ padding: '14px 0', borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontFamily: t.mono, fontSize: 12, color: t.sub }}>−{gap}{c.unit}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1, height: 3, background: t.border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: t.text, width: `${c.value / Math.max(c.value, c.target) * 100}%` }}/>
              </div>
              <div style={{ fontFamily: t.mono, fontSize: 11, color: t.text, width: 42, textAlign: 'right' }}>{c.value}{c.unit}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // input — keyboard-shortcut style, command bar
  const r = d.currentRound;
  return (
    <div style={{ padding: '48px 20px 20px', height: '100%', overflow: 'auto', background: t.bg, fontFamily: t.sans, color: t.text }}>
      <div style={{ fontFamily: t.mono, fontSize: 10, color: t.ter, letterSpacing: 0.8, textTransform: 'uppercase' }}>ROUND IN PROGRESS</div>
      <div style={{ fontSize: 22, fontWeight: 600, marginTop: 8, letterSpacing: -0.5 }}>Hole {r.hole}</div>
      <div style={{ fontFamily: t.mono, fontSize: 12, color: t.sub, marginTop: 2 }}>Par {r.par} · {r.yardage}Y · {r.course}</div>

      <div style={{ marginTop: 22, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {r.strokes.map((s, i, arr) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: t.surface, borderBottom: i<arr.length-1 ? `1px solid ${t.border}` : 'none' }}>
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.ter, width: 14 }}>{s.n}.</span>
            <span style={{ fontSize: 13, fontWeight: 500, fontFamily: t.mono }}>{s.club}</span>
            <span style={{ fontSize: 12, color: t.sub, flex: 1 }}>{s.result}</span>
            <span style={{ fontFamily: t.mono, fontSize: 12, color: t.sub }}>{s.d}Y</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, fontFamily: t.mono, fontSize: 10, color: t.ter, letterSpacing: 0.8, textTransform: 'uppercase' }}>NEXT SHOT · TAP OR TYPE</div>
      <div style={{ marginTop: 10, background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: t.mono, fontSize: 11, color: t.ter }}>›</span>
        <span style={{ fontSize: 13, color: t.sub, flex: 1 }}>e.g. "PW グリーン 130"</span>
        <span style={{ fontFamily: t.mono, fontSize: 10, color: t.ter, border: `1px solid ${t.border}`, borderRadius: 4, padding: '2px 6px' }}>⌘K</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 12 }}>
        {['PW','9I','8I','SW','7I','6I','P','Ch'].map(c => (
          <button key={c} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 6, padding: '10px 0', fontFamily: t.mono, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{c}</button>
        ))}
      </div>

      <button style={{ marginTop: 18, width: '100%', background: t.text, color: t.bg, border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 13, fontWeight: 500, fontFamily: t.sans, cursor: 'pointer' }}>
        Complete hole →
      </button>
    </div>
  );
}

window.Pattern1Linear = Pattern1Linear;

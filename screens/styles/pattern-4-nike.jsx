// pattern-4-nike.jsx — Nike Run Club inspired: monumental type, B&W + volt

function Pattern4Nike({ screen }) {
  const d = window.STYLE_DATA;
  const t = {
    bg: '#000000', fg: '#FFFFFF', sub: '#888888', ter: '#444444',
    accent: '#D8FF3B', // volt
    line: '#1F1F1F',
    display: '"Archivo Black", "Oswald", Impact, sans-serif',
    sans: '"Inter", -apple-system, sans-serif',
    mono: 'IBM Plex Mono, monospace',
  };

  if (screen === 'home') return (
    <div style={{ height: '100%', overflow: 'auto', background: t.bg, color: t.fg, fontFamily: t.sans }}>
      <div style={{ padding: '50px 18px 18px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: t.sub, textTransform: 'uppercase' }}>LATEST ROUND — {d.latestRound.date}</div>
        <div style={{ fontFamily: t.display, fontSize: 88, lineHeight: 0.85, letterSpacing: -2, marginTop: 14, textTransform: 'uppercase' }}>
          {d.latestRound.score}
        </div>
        <div style={{ fontFamily: t.display, fontSize: 24, lineHeight: 1, marginTop: 6, color: t.accent, letterSpacing: -0.5 }}>
          {d.latestRound.toPar} TO PAR
        </div>
        <div style={{ fontSize: 12, color: t.sub, marginTop: 14, textTransform: 'uppercase', letterSpacing: 1 }}>{d.latestRound.course}</div>
      </div>

      <div style={{ borderTop: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}`, padding: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontFamily: t.display, fontSize: 42, lineHeight: 1, letterSpacing: -1 }}>{d.latestRound.putts}</div>
          <div style={{ fontSize: 10, color: t.sub, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>TOTAL PUTTS</div>
        </div>
        <div>
          <div style={{ fontFamily: t.display, fontSize: 42, lineHeight: 1, letterSpacing: -1 }}>{d.latestRound.fairway}/14</div>
          <div style={{ fontSize: 10, color: t.sub, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>FAIRWAYS HIT</div>
        </div>
        <div>
          <div style={{ fontFamily: t.display, fontSize: 42, lineHeight: 1, letterSpacing: -1, color: t.accent }}>{d.latestRound.gir}/18</div>
          <div style={{ fontSize: 10, color: t.sub, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>GREEN IN REG</div>
        </div>
        <div>
          <div style={{ fontFamily: t.display, fontSize: 42, lineHeight: 1, letterSpacing: -1 }}>{Math.round(d.latestRound.fairway/14*100)}%</div>
          <div style={{ fontSize: 10, color: t.sub, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>FIR RATE</div>
        </div>
      </div>

      <div style={{ padding: '18px' }}>
        <div style={{ fontSize: 10, color: t.sub, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>THIS WEEK</div>
        <div style={{ fontFamily: t.display, fontSize: 80, lineHeight: 0.9, letterSpacing: -1.5, marginTop: 8 }}>
          {d.weekly.rounds}<span style={{ fontSize: 20, color: t.sub, fontFamily: t.mono, marginLeft: 8 }}>ROUNDS</span>
        </div>
        <div style={{ fontFamily: t.display, fontSize: 48, lineHeight: 0.9, letterSpacing: -1, color: t.accent, marginTop: 8 }}>
          {d.weekly.avgScore} AVG
        </div>
      </div>

      <div style={{ padding: '18px', borderTop: `1px solid ${t.line}` }}>
        <div style={{ fontSize: 10, color: t.sub, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>CHALLENGES</div>
        {d.challenges.slice(0,2).map(c => {
          const pct = c.reverse ? (c.target/c.value*100) : (c.value/c.target*100);
          return (
            <div key={c.key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: t.display, fontSize: 16, letterSpacing: -0.3, textTransform: 'uppercase' }}>{c.label}</span>
                <span style={{ fontFamily: t.mono, fontSize: 13, color: t.accent, fontWeight: 700 }}>{Math.min(100, Math.round(pct))}%</span>
              </div>
              <div style={{ height: 3, background: t.line, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: t.accent }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (screen === 'analysis') return (
    <div style={{ height: '100%', overflow: 'auto', background: t.bg, color: t.fg, fontFamily: t.sans }}>
      <div style={{ padding: '50px 18px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: t.sub, textTransform: 'uppercase' }}>ANALYSIS</div>
        <div style={{ fontFamily: t.display, fontSize: 68, lineHeight: 0.85, letterSpacing: -1.8, marginTop: 10, textTransform: 'uppercase' }}>
          LAST 7<br/>ROUNDS
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${t.line}`, padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <div style={{ fontFamily: t.display, fontSize: 68, lineHeight: 0.9, letterSpacing: -1.5, color: t.accent }}>{d.weekly.avgScore}</div>
          <div style={{ fontSize: 11, color: t.sub, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>AVG SCORE</div>
        </div>
        <svg viewBox="0 0 300 80" style={{ width: '100%', marginTop: 10 }}>
          <polyline fill="none" stroke={t.accent} strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"
            points={d.weekly.trend.map((v,i)=>`${i*47+10},${(v-85)*5}`).join(' ')}/>
        </svg>
      </div>

      <div style={{ borderTop: `1px solid ${t.line}`, padding: '18px' }}>
        <div style={{ fontSize: 10, color: t.sub, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>FOCUS</div>
        {d.challenges.map((c, i) => {
          const pct = c.reverse ? (c.target/c.value*100) : (c.value/c.target*100);
          return (
            <div key={c.key} style={{ padding: '16px 0', borderTop: i > 0 ? `1px solid ${t.line}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontFamily: t.display, fontSize: 22, letterSpacing: -0.5, textTransform: 'uppercase', lineHeight: 1 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: t.sub, marginTop: 4 }}>{c.metric}</div>
                </div>
                <div style={{ fontFamily: t.display, fontSize: 36, lineHeight: 1, letterSpacing: -0.8, color: t.accent }}>{c.value}{c.unit}</div>
              </div>
              <div style={{ height: 2, background: t.line, marginTop: 10 }}>
                <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: t.accent }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // input
  const r = d.currentRound;
  return (
    <div style={{ height: '100%', overflow: 'auto', background: t.bg, color: t.fg, fontFamily: t.sans }}>
      <div style={{ padding: '50px 18px 14px' }}>
        <div style={{ fontSize: 10, color: t.sub, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>RECORDING</div>
        <div style={{ fontFamily: t.display, fontSize: 110, lineHeight: 0.82, letterSpacing: -3, marginTop: 10, textTransform: 'uppercase' }}>
          H{String(r.hole).padStart(2,'0')}
        </div>
        <div style={{ fontSize: 12, color: t.sub, marginTop: 4, fontFamily: t.mono, letterSpacing: 1 }}>PAR {r.par} · {r.yardage}Y</div>
      </div>

      <div style={{ borderTop: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}`, padding: '20px 18px', display: 'flex', alignItems: 'baseline', gap: 18 }}>
        <div style={{ fontFamily: t.display, fontSize: 120, lineHeight: 0.85, letterSpacing: -4, color: t.accent }}>{r.strokes.length}</div>
        <div>
          <div style={{ fontSize: 10, color: t.sub, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>STROKES</div>
          <div style={{ fontFamily: t.display, fontSize: 24, lineHeight: 1, letterSpacing: -0.5, marginTop: 4 }}>{r.strokes.length - r.par > 0 ? '+' : ''}{r.strokes.length - r.par}</div>
        </div>
      </div>

      <div>
        {r.strokes.map(s => (
          <div key={s.n} style={{ padding: '14px 18px', borderBottom: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontFamily: t.display, fontSize: 22, lineHeight: 1, letterSpacing: -0.5, color: t.accent, width: 32 }}>{String(s.n).padStart(2,'0')}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: t.display, fontSize: 16, letterSpacing: -0.3, textTransform: 'uppercase', lineHeight: 1 }}>{s.club}</div>
              <div style={{ fontSize: 11, color: t.sub, marginTop: 3 }}>{s.result}</div>
            </div>
            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.fg, fontWeight: 700 }}>{s.d}Y</div>
          </div>
        ))}
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ fontSize: 10, color: t.sub, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>SELECT CLUB</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, border: `1px solid ${t.line}` }}>
          {['PW','9I','8I','SW'].map((c, i) => (
            <button key={c} style={{ background: t.bg, color: t.fg, border: 'none', borderLeft: i > 0 ? `1px solid ${t.line}` : 'none', padding: '18px 0', fontFamily: t.display, fontSize: 18, letterSpacing: -0.3 }}>{c}</button>
          ))}
        </div>
        <button style={{ marginTop: 14, width: '100%', background: t.accent, color: t.bg, border: 'none', padding: '18px 0', fontFamily: t.display, fontSize: 18, letterSpacing: 1, textTransform: 'uppercase' }}>
          END HOLE ▶
        </button>
      </div>
    </div>
  );
}

window.Pattern4Nike = Pattern4Nike;

// pattern-3-strava.jsx — Strava inspired: feed, photos, kudos, orange accent

function Pattern3Strava({ screen }) {
  const d = window.STYLE_DATA;
  const t = {
    bg: '#F7F7FA', card: '#FFFFFF', border: '#E3E3E8',
    text: '#242428', sub: '#6D6D78', ter: '#9A9AA3',
    accent: '#FC4C02', // Strava orange
    pos: '#2B8A3E', neg: '#C92A2A',
    sans: '"Inter", -apple-system, system-ui, sans-serif',
    mono: 'IBM Plex Mono, monospace',
  };

  const Avatar = ({ initials, size = 40, color = t.accent }) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size*0.38, fontWeight: 700 }}>{initials}</div>
  );

  if (screen === 'home') return (
    <div style={{ height: '100%', overflow: 'auto', background: t.bg, color: t.text, fontFamily: t.sans }}>
      {/* Header */}
      <div style={{ padding: '50px 18px 12px', background: t.card, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.3 }}>Feed</div>
        <Avatar initials="YT" size={32}/>
      </div>

      {/* Activity card */}
      <div style={{ background: t.card, margin: '12px 0 0', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar initials="YT"/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Yamada Taro</div>
            <div style={{ fontSize: 11, color: t.sub }}>{d.latestRound.date} · Morning round</div>
          </div>
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, marginTop: 10, letterSpacing: -0.2 }}>{d.latestRound.course} · 18 holes</div>

        {/* Hero stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginTop: 14, borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
          {[
            { label: 'Score', val: d.latestRound.score, sub: d.latestRound.toPar },
            { label: 'Putts', val: d.latestRound.putts, sub: '32.0 /18' },
            { label: 'FIR',   val: `${Math.round(d.latestRound.fairway/14*100)}%`, sub: `${d.latestRound.fairway}/14` },
          ].map((m, i) => (
            <div key={m.label} style={{ padding: '0 8px', borderLeft: i > 0 ? `1px solid ${t.border}` : 'none' }}>
              <div style={{ fontSize: 10, color: t.sub, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{m.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2, letterSpacing: -0.5 }}>{m.val}</div>
              <div style={{ fontSize: 11, color: t.sub, marginTop: 1 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* "Map" — course hole bar */}
        <div style={{ marginTop: 14, borderRadius: 8, overflow: 'hidden', background: '#F2F3F5', padding: 10 }}>
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 60 }}>
            {[4,5,3,4,5,4,3,4,4, 4,3,5,4,4,3,4,5,4].map((par,i) => {
              const rel = d.latestRound.holes?.[i]?.rel ?? [0,1,-1,0,1,0,0,2,1,0,0,-1,1,0,1,0,0,1][i];
              const h = 20 + rel*8;
              const c = rel < 0 ? t.pos : rel === 0 ? t.ter : t.accent;
              return <div key={i} style={{ flex: 1, height: h, background: c, borderRadius: 2 }}/>;
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: t.sub, fontFamily: t.mono }}>
            <span>FRONT 9 · +4</span><span>BACK 9 · +3</span>
          </div>
        </div>

        {/* Kudos / comment */}
        <div style={{ display: 'flex', gap: 18, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.border}`, fontSize: 12, color: t.sub, fontWeight: 600 }}>
          <span>👏 8 kudos</span><span>💬 2 comments</span><span style={{ marginLeft: 'auto', color: t.accent }}>View details</span>
        </div>
      </div>

      {/* Weekly summary */}
      <div style={{ background: t.card, marginTop: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: t.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>This week</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{d.weekly.rounds}</div>
            <div style={{ fontSize: 11, color: t.sub }}>Rounds</div>
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{d.weekly.avgScore}</div>
            <div style={{ fontSize: 11, color: t.sub }}>Avg score</div>
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: t.accent }}>{d.weekly.bestScore}</div>
            <div style={{ fontSize: 11, color: t.sub }}>Best</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (screen === 'analysis') return (
    <div style={{ height: '100%', overflow: 'auto', background: t.bg, color: t.text, fontFamily: t.sans }}>
      <div style={{ padding: '50px 18px 14px', background: t.card, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 11, color: t.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Progress</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2, letterSpacing: -0.4 }}>Last 7 rounds</div>
      </div>

      <div style={{ background: t.card, padding: '16px', marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.8 }}>{d.weekly.avgScore}</div>
            <div style={{ fontSize: 11, color: t.sub }}>Avg score</div>
          </div>
          <div style={{ fontSize: 13, color: t.pos, fontWeight: 700 }}>▼ 1.2 vs prev</div>
        </div>
        <svg viewBox="0 0 300 90" style={{ width: '100%', marginTop: 8 }}>
          <polyline fill="none" stroke={t.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            points={d.weekly.trend.map((v,i)=>`${i*47+10},${(v-85)*6}`).join(' ')}/>
          {d.weekly.trend.map((v,i) => (
            <circle key={i} cx={i*47+10} cy={(v-85)*6} r="3" fill={t.accent}/>
          ))}
        </svg>
      </div>

      <div style={{ background: t.card, marginTop: 10, padding: '16px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Personal records</div>
        {d.challenges.map(c => {
          const pct = c.reverse ? (c.target/c.value*100) : (c.value/c.target*100);
          return (
            <div key={c.key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ fontWeight: 700 }}>{c.label}</span>
                <span style={{ color: t.sub, fontFamily: t.mono }}>{c.value}{c.unit} / {c.target}{c.unit}</span>
              </div>
              <div style={{ height: 8, background: '#ECECEF', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: t.accent }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Input — full-bleed like Strava's record
  const r = d.currentRound;
  return (
    <div style={{ height: '100%', overflow: 'auto', background: t.bg, color: t.text, fontFamily: t.sans }}>
      <div style={{ padding: '50px 18px 14px', background: t.accent, color: '#fff' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.85 }}>Recording</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.6 }}>Hole {r.hole}</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>Par {r.par} · {r.yardage}Y</div>
        </div>
      </div>

      <div style={{ background: t.card, padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontFamily: t.mono, fontSize: 56, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>{r.strokes.length}</div>
        <div style={{ fontSize: 11, color: t.sub }}>
          <div style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.4 }}>Strokes</div>
          <div style={{ fontSize: 22, color: t.text, fontWeight: 800, marginTop: 4 }}>{r.strokes.length - r.par > 0 ? '+' : ''}{r.strokes.length - r.par}</div>
          <div>vs par</div>
        </div>
      </div>

      <div style={{ background: t.card, marginTop: 10 }}>
        {r.strokes.map((s, i) => (
          <div key={i} style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.ter, width: 18 }}>{String(s.n).padStart(2,'0')}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{s.club}</div>
              <div style={{ fontSize: 11, color: t.sub }}>{s.result}</div>
            </div>
            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.text, fontWeight: 700 }}>{s.d}Y</div>
          </div>
        ))}
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 11, color: t.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Add stroke — club</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {['PW','9I','8I','SW'].map(c => (
            <button key={c} style={{ background: t.card, color: t.text, border: `1px solid ${t.border}`, borderRadius: 4, padding: '12px 0', fontFamily: t.mono, fontWeight: 700, fontSize: 13 }}>{c}</button>
          ))}
        </div>
        <button style={{ marginTop: 14, width: '100%', background: t.accent, color: '#fff', border: 'none', borderRadius: 4, padding: '14px 0', fontSize: 13, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          Finish hole
        </button>
      </div>
    </div>
  );
}

window.Pattern3Strava = Pattern3Strava;

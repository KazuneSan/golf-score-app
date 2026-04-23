// pattern-2-fitness.jsx — Apple Fitness inspired: dark, activity rings, vivid

function Pattern2Fitness({ screen }) {
  const d = window.STYLE_DATA;
  const t = {
    bg: '#000000', surface: '#0E0E10', surface2: '#1C1C1E',
    border: '#2A2A2D', text: '#FFFFFF', sub: '#98989F', ter: '#636366',
    ring1: '#FA114F', // red  — scoring
    ring2: '#9AE400', // green — FW/GIR
    ring3: '#14E0D4', // cyan — putts
    sans: '-apple-system, SF Pro Display, Inter, sans-serif',
    mono: 'SF Mono, IBM Plex Mono, monospace',
  };

  const Ring = ({ size, stroke, pct, color, trackOpacity = 0.2 }) => {
    const r = (size - stroke) / 2;
    const C = 2 * Math.PI * r;
    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeOpacity={trackOpacity} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-pct/100)}/>
      </svg>
    );
  };

  if (screen === 'home') return (
    <div style={{ padding: '50px 20px 20px', height: '100%', overflow: 'auto', background: t.bg, color: t.text, fontFamily: t.sans }}>
      <div style={{ fontSize: 12, color: t.sub, fontWeight: 500 }}>{d.latestRound.date.toUpperCase()}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6, marginTop: 2 }}>Summary</div>

      <div style={{ background: t.surface, borderRadius: 20, padding: 20, marginTop: 18, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 0 }}><Ring size={110} stroke={10} pct={70} color={t.ring1}/></div>
          <div style={{ position: 'absolute', inset: 14 }}><Ring size={82} stroke={10} pct={50} color={t.ring2}/></div>
          <div style={{ position: 'absolute', inset: 28 }}><Ring size={54} stroke={10} pct={85} color={t.ring3}/></div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: t.ring1, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Score</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8 }}>{d.latestRound.score}<span style={{ fontSize: 14, color: t.sub, fontWeight: 500, marginLeft: 4 }}>{d.latestRound.toPar}</span></div>
          <div style={{ fontSize: 11, color: t.ring2, fontWeight: 600, marginTop: 6, textTransform: 'uppercase' }}>Fairways</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{d.latestRound.fairway}<span style={{ color: t.sub, fontSize: 11, marginLeft: 2 }}>/14</span></div>
          <div style={{ fontSize: 11, color: t.ring3, fontWeight: 600, marginTop: 6, textTransform: 'uppercase' }}>Putts</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{d.latestRound.putts}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        {[
          { label: 'Weekly avg', val: d.weekly.avgScore, color: t.ring1 },
          { label: 'Best',       val: d.weekly.bestScore, color: t.ring2 },
        ].map(x => (
          <div key={x.label} style={{ background: t.surface, borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 10, color: x.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{x.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, letterSpacing: -0.5 }}>{x.val}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 22, marginBottom: 10 }}>Trends</div>
      {d.challenges.slice(0,2).map(c => (
        <div key={c.key} style={{ background: t.surface, borderRadius: 14, padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Ring size={48} stroke={5} pct={c.reverse ? (c.target/c.value*100) : (c.value/c.target*100)} color={t.ring1}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: t.sub, marginTop: 2 }}>{c.value}{c.unit} · goal {c.target}{c.unit}</div>
          </div>
        </div>
      ))}
    </div>
  );

  if (screen === 'analysis') return (
    <div style={{ padding: '50px 20px 20px', height: '100%', overflow: 'auto', background: t.bg, color: t.text, fontFamily: t.sans }}>
      <div style={{ fontSize: 12, color: t.sub, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>Activity</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, letterSpacing: -0.6 }}>7-round window</div>

      <div style={{ background: t.surface, borderRadius: 20, padding: 18, marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { label: 'Score',    val: d.weekly.avgScore, color: t.ring1 },
            { label: 'Fairways', val: '50%',             color: t.ring2 },
            { label: 'Putts',    val: 32.1,              color: t.ring3 },
          ].map(m => (
            <div key={m.label} style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: m.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{m.val}</div>
            </div>
          ))}
        </div>
        <svg viewBox="0 0 280 80" style={{ width: '100%', marginTop: 14 }}>
          <defs>
            <linearGradient id="fitgrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.ring1} stopOpacity="0.6"/>
              <stop offset="100%" stopColor={t.ring1} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <polyline fill="none" stroke={t.ring1} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            points={d.weekly.trend.map((v,i)=>`${i*44+10},${(v-85)*5}`).join(' ')}/>
          <polygon fill="url(#fitgrad)"
            points={`10,80 ${d.weekly.trend.map((v,i)=>`${i*44+10},${(v-85)*5}`).join(' ')} ${(d.weekly.trend.length-1)*44+10},80`}/>
        </svg>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>Focus</div>
      {d.challenges.map(c => (
        <div key={c.key} style={{ background: t.surface, borderRadius: 16, padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Ring size={56} stroke={6} pct={c.reverse ? (c.target/c.value*100) : (c.value/c.target*100)} color={c.reverse ? t.ring1 : t.ring2}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: t.sub, marginTop: 2 }}>{c.metric}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{c.value}{c.unit}</div>
            <div style={{ fontSize: 10, color: t.sub }}>/ {c.target}{c.unit}</div>
          </div>
        </div>
      ))}
    </div>
  );

  // input
  const r = d.currentRound;
  return (
    <div style={{ padding: '50px 20px 20px', height: '100%', overflow: 'auto', background: t.bg, color: t.text, fontFamily: t.sans }}>
      <div style={{ fontSize: 11, color: t.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Workout</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6, marginTop: 2 }}>Hole {r.hole}</div>
      <div style={{ fontSize: 13, color: t.sub, marginTop: 2 }}>Par {r.par} · {r.yardage}Y · {r.course}</div>

      <div style={{ marginTop: 18, background: t.surface, borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Ring size={80} stroke={8} pct={(r.strokes.length/r.par*100)} color={t.ring1}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: t.ring1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>Strokes</div>
          <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, letterSpacing: -1.2 }}>{r.strokes.length}<span style={{ fontSize: 14, color: t.sub, fontWeight: 500 }}>/{r.par}</span></div>
        </div>
      </div>

      <div style={{ marginTop: 14, borderRadius: 14, overflow: 'hidden' }}>
        {r.strokes.map((s, i) => (
          <div key={i} style={{ background: t.surface, padding: '12px 14px', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: t.ring1, color: t.bg, fontFamily: t.mono, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{s.club} <span style={{ color: t.sub, fontWeight: 500, fontSize: 12 }}>{s.d}Y</span></div>
              <div style={{ fontSize: 11, color: t.sub }}>{s.result}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: t.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 18, marginBottom: 8 }}>Club</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {['PW','9I','8I','SW'].map(c => (
          <button key={c} style={{ background: t.surface2, color: t.text, border: 'none', borderRadius: 12, padding: '12px 0', fontFamily: t.mono, fontSize: 13, fontWeight: 700 }}>{c}</button>
        ))}
      </div>

      <button style={{ marginTop: 16, width: '100%', background: t.ring1, color: t.text, border: 'none', borderRadius: 999, padding: '14px 0', fontSize: 14, fontWeight: 700 }}>
        END HOLE
      </button>
    </div>
  );
}

window.Pattern2Fitness = Pattern2Fitness;

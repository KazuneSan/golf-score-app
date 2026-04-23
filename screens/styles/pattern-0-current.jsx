// pattern-0-current.jsx — current design cloned, compact for comparison phone

function Pattern0Current({ screen }) {
  const d = window.STYLE_DATA;
  const t = {
    bg: '#F3F1EC', surface: '#FFFFFF', surfaceAlt: '#EEEAE0',
    border: '#E5E0D6', text: '#171717', sub: '#78736A',
    accent: '#2F7D4A', accentSoft: '#DCEBE2', accentInk: '#1F5333',
    warn: '#B0710D', danger: '#B23A2A',
    mono: 'IBM Plex Mono, monospace', sans: 'Noto Sans JP, Inter, sans-serif',
  };

  if (screen === 'home') return (
    <div style={{ padding: '50px 16px 16px', height: '100%', overflow: 'auto', fontFamily: t.sans, background: t.bg, color: t.text }}>
      <div style={{ fontSize: 12, color: t.sub, marginBottom: 8 }}>おはよう、{d.user.name}</div>
      <div style={{ background: t.text, color: t.bg, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 11, opacity: 0.55, textTransform: 'uppercase', letterSpacing: 0.5 }}>直近のラウンド</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
          <div style={{ fontFamily: t.mono, fontSize: 42, fontWeight: 600, letterSpacing: -1.5 }}>{d.latestRound.score}</div>
          <div style={{ color: t.accentSoft, fontFamily: t.mono, fontSize: 14 }}>{d.latestRound.toPar}</div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{d.latestRound.course} · {d.latestRound.date}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        {[['週平均', d.weekly.avgScore], ['ベスト', d.weekly.bestScore], ['パット', d.latestRound.putts], ['FW', `${d.latestRound.fairway}/14`]].map(([l,v]) => (
          <div key={l} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: t.sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</div>
            <div style={{ fontFamily: t.mono, fontSize: 20, fontWeight: 600, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: t.sub, textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 8px' }}>課題</div>
      {d.challenges.slice(0,2).map(c => (
        <div key={c.key} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 12, marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <div style={{ fontFamily: t.mono, fontSize: 20, fontWeight: 600 }}>{c.value}{c.unit}</div>
            <div style={{ fontSize: 11, color: t.sub }}>目標 {c.target}{c.unit}</div>
          </div>
          <div style={{ height: 4, background: t.surfaceAlt, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: `${c.value/c.target*100}%`, height: '100%', background: t.accent }}/>
          </div>
        </div>
      ))}
    </div>
  );

  if (screen === 'analysis') return (
    <div style={{ padding: '50px 16px 16px', height: '100%', overflow: 'auto', fontFamily: t.sans, background: t.bg }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>分析</div>
      <div style={{ fontSize: 12, color: t.sub, marginTop: 4 }}>直近7ラウンドの推移</div>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 14, marginTop: 12 }}>
        <div style={{ fontSize: 11, color: t.sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>スコア推移</div>
        <svg viewBox="0 0 280 80" style={{ width: '100%', marginTop: 10 }}>
          <polyline fill="none" stroke={t.accent} strokeWidth="2"
            points={d.weekly.trend.map((v,i)=>`${i*46+8},${(v-85)*4}`).join(' ')}/>
          {d.weekly.trend.map((v,i)=>(<circle key={i} cx={i*46+8} cy={(v-85)*4} r="3" fill={t.accent}/>))}
        </svg>
      </div>
      <div style={{ fontSize: 11, color: t.sub, textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 8px' }}>課題の内訳</div>
      {d.challenges.map(c => (
        <div key={c.key} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 12, marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div>
          <div style={{ fontSize: 11, color: t.sub, marginTop: 2 }}>{c.metric}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <div style={{ fontFamily: t.mono, fontSize: 22, fontWeight: 600, color: c.reverse ? t.danger : t.accent }}>{c.value}{c.unit}</div>
            <div style={{ fontSize: 11, color: t.sub }}>→ 目標 {c.target}{c.unit}</div>
          </div>
        </div>
      ))}
    </div>
  );

  // input
  const r = d.currentRound;
  return (
    <div style={{ padding: '50px 16px 16px', height: '100%', overflow: 'auto', fontFamily: t.sans, background: t.bg }}>
      <div style={{ fontSize: 12, color: t.sub }}>{r.course}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
        <div style={{ fontSize: 26, fontWeight: 700 }}>Hole {r.hole}</div>
        <div style={{ fontFamily: t.mono, fontSize: 13, color: t.sub }}>Par {r.par} · {r.yardage}Y</div>
      </div>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, marginTop: 14 }}>
        {r.strokes.map((s, i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 14px', borderBottom: i<arr.length-1 ? `1px solid ${t.border}` : 'none' }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, background: t.text, color: t.bg, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.mono }}>{s.n}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.club} <span style={{ color: t.sub, fontWeight: 400, fontSize: 11 }}>{s.d}Y</span></div>
              <div style={{ fontSize: 11, color: t.sub }}>{s.result}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: t.sub, margin: '16px 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>次のショット</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {['PW','9I','8I','SW'].map(c => (
          <button key={c} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: '12px 0', fontFamily: t.mono, fontSize: 13, fontWeight: 600 }}>{c}</button>
        ))}
      </div>
      <button style={{ marginTop: 16, width: '100%', background: t.accent, color: '#fff', border: 'none', borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 600 }}>
        ホール終了
      </button>
    </div>
  );
}

window.Pattern0Current = Pattern0Current;

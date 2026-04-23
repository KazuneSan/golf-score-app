// pattern-2-fitness-v2.jsx — Fitness-inspired, optimized for golf record/practice service
// Key adaptations:
//  - 3 rings redefined: (1) ボギーオン率 goal, (2) パット目標, (3) OB抑制
//  - Green/gold + one neon — less "workout", more "golf dusk"
//  - Weekly/monthly achievement over daily workout
//  - Input per hole: completing hole visibly advances the rings

function Pattern2FitnessV2({ screen }) {
  const P = window.PERSONAS?.['100切り'];
  if (!P) return <div style={{padding:40}}>no data</div>;

  const t = {
    bg: '#07100C',          // deep forest black
    surface: '#10201A',
    surface2: '#17302A',
    border: '#1F3A32',
    text: '#F2F7F4', sub: '#93A59D', ter: '#5F7A71',
    ring1: '#7BE495',       // soft green — boggyOn (main goal)
    ring2: '#F4C430',       // gold — putts
    ring3: '#FF7A59',       // coral — OB (reverse goal)
    sans: '"Noto Sans JP", -apple-system, SF Pro Display, Inter, sans-serif',
    mono: 'SF Mono, IBM Plex Mono, monospace',
  };

  const Ring = ({ size, stroke, pct, color, trackOpacity = 0.18 }) => {
    const r = (size - stroke) / 2;
    const C = 2 * Math.PI * r;
    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeOpacity={trackOpacity} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-Math.min(100, pct)/100)}/>
      </svg>
    );
  };

  // Ring definitions specific to this service
  const goals = {
    boggyOn:   { cur: P.stats.boggyOn,   tgt: P.targets.boggyOn,   pct: (P.stats.boggyOn / P.targets.boggyOn) * 100, color: t.ring1, label: 'ボギーオン', unit: '%' },
    threePutt: { cur: P.stats.threePutt, tgt: P.targets.threePutt, pct: (P.targets.threePutt / P.stats.threePutt) * 100, color: t.ring2, label: '3パット抑制', unit: '%' },
    ob:        { cur: P.stats.ob,        tgt: P.targets.ob,        pct: (P.targets.ob / P.stats.ob) * 100, color: t.ring3, label: 'OB抑制', unit: '%' },
  };

  // --- HOME ------------------------------------------------------------
  if (screen === 'home') {
    const latest = P.rounds[0];
    return (
      <div style={{ padding: '48px 20px 20px', height: '100%', overflow: 'auto', background: t.bg, color: t.text, fontFamily: t.sans }}>
        <div style={{ fontFamily: t.mono, fontSize: 10, color: t.sub, letterSpacing: 1, textTransform: 'uppercase' }}>今月の目標達成</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 4 }}>{P.nextGoal.split(' / ')[0]}</div>

        {/* Triple ring — the three things 100切り persona works on */}
        <div style={{ background: t.surface, borderRadius: 20, padding: 18, marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0 }}><Ring size={120} stroke={10} pct={goals.boggyOn.pct}  color={t.ring1}/></div>
            <div style={{ position: 'absolute', inset: 14 }}><Ring size={92} stroke={10} pct={goals.threePutt.pct} color={t.ring2}/></div>
            <div style={{ position: 'absolute', inset: 28 }}><Ring size={64} stroke={10} pct={goals.ob.pct}        color={t.ring3}/></div>
          </div>
          <div style={{ flex: 1, fontSize: 11 }}>
            {[goals.boggyOn, goals.threePutt, goals.ob].map((g, i) => (
              <div key={i} style={{ marginBottom: i < 2 ? 10 : 0 }}>
                <div style={{ color: g.color, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', fontSize: 10 }}>{g.label}</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 1 }}>
                  {g.cur}{g.unit} <span style={{ color: t.sub, fontSize: 11, fontWeight: 400 }}>/ {g.tgt}{g.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest round as a small achievement card */}
        <div style={{ background: t.surface, borderRadius: 16, padding: 14, marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.mono, fontSize: 15, fontWeight: 700, color: t.ring1 }}>
            {latest.score}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>最新ラウンド</div>
            <div style={{ fontSize: 11, color: t.sub, marginTop: 2 }}>{latest.date} · {latest.course}</div>
          </div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.sub }}>+{latest.diff}</div>
        </div>

        {/* Weekly streak */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>今週の記録</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
            {['月','火','水','木','金','土','日'].map((d, i) => {
              const hit = [false, true, false, false, true, true, false][i];
              return (
                <div key={d} style={{ flex: 1 }}>
                  <div style={{ height: 40, background: hit ? t.ring1 : t.surface, borderRadius: 6, opacity: hit ? 1 : 0.5 }}/>
                  <div style={{ fontSize: 9, color: t.sub, textAlign: 'center', marginTop: 4, fontFamily: t.mono }}>{d}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: t.sub, marginTop: 8 }}>3 日記録 · ドリル連続 <span style={{ color: t.ring2, fontWeight: 700 }}>5 日</span></div>
        </div>
      </div>
    );
  }

  // --- ANALYSIS --------------------------------------------------------
  if (screen === 'analysis') {
    const rows = [
      { key: 'boggyOn',   label: 'ボギーオン率', cur: P.stats.boggyOn,   tgt: P.targets.boggyOn,   color: t.ring1, unit: '%' },
      { key: 'parOn',     label: 'パーオン率',   cur: P.stats.parOn,     tgt: P.targets.parOn,     color: t.ring1, unit: '%' },
      { key: 'fairway',   label: 'FWキープ率',   cur: P.stats.fairway,   tgt: P.targets.fairway,   color: t.ring1, unit: '%' },
      { key: 'threePutt', label: '3パット率',    cur: P.stats.threePutt, tgt: P.targets.threePutt, color: t.ring2, unit: '%', reverse: true },
      { key: 'ob',        label: 'OB率',         cur: P.stats.ob,        tgt: P.targets.ob,        color: t.ring3, unit: '%', reverse: true },
    ];
    const trend = [108, 106, 104, 105, 102, 104, 102];

    return (
      <div style={{ padding: '48px 20px 20px', height: '100%', overflow: 'auto', background: t.bg, color: t.text, fontFamily: t.sans }}>
        <div style={{ fontFamily: t.mono, fontSize: 10, color: t.sub, letterSpacing: 1, textTransform: 'uppercase' }}>直近 7 ラウンド</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 2 }}>指標の進捗</div>

        {/* Trend */}
        <div style={{ background: t.surface, borderRadius: 18, padding: 16, marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.8 }}>{P.stats.avg}</div>
            <div style={{ fontSize: 11, color: t.sub }}>平均スコア</div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: t.ring1, fontFamily: t.mono }}>▼ 2.4</div>
          </div>
          <svg viewBox="0 0 280 70" style={{ width: '100%', marginTop: 8 }}>
            <defs>
              <linearGradient id="v2grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.ring1} stopOpacity="0.5"/>
                <stop offset="100%" stopColor={t.ring1} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polyline fill="none" stroke={t.ring1} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              points={trend.map((v,i)=>`${i*44+10},${(v-95)*4}`).join(' ')}/>
            <polygon fill="url(#v2grad)"
              points={`10,70 ${trend.map((v,i)=>`${i*44+10},${(v-95)*4}`).join(' ')} ${(trend.length-1)*44+10},70`}/>
          </svg>
        </div>

        {/* Stat rows with small rings */}
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>目標差分</div>
        {rows.map(r => {
          const pct = r.reverse ? (r.tgt / r.cur) * 100 : (r.cur / r.tgt) * 100;
          return (
            <div key={r.key} style={{ background: t.surface, borderRadius: 14, padding: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Ring size={42} stroke={5} pct={pct} color={r.color}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{r.label}</div>
                <div style={{ fontSize: 10, color: t.sub, marginTop: 1, fontFamily: t.mono }}>{r.cur}{r.unit} / {r.tgt}{r.unit}</div>
              </div>
              <div style={{ fontFamily: t.mono, fontSize: 12, color: r.color, fontWeight: 700 }}>{Math.round(pct)}%</div>
            </div>
          );
        })}
      </div>
    );
  }

  // --- INPUT -----------------------------------------------------------
  const hole = { no: 5, par: 4, yards: 410 };
  // Show the ring contribution preview — "if you hit boggy this hole, ring ticks up"
  const scoreNow = 5;

  return (
    <div style={{ padding: '48px 20px 20px', height: '100%', overflow: 'auto', background: t.bg, color: t.text, fontFamily: t.sans }}>
      <div style={{ fontFamily: t.mono, fontSize: 10, color: t.sub, letterSpacing: 1, textTransform: 'uppercase' }}>HOLE 5 / 18 · PAR {hole.par}</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>{hole.yards}Y</div>

      {/* Huge current hole score with ring contribution */}
      <div style={{ background: t.surface, borderRadius: 20, padding: 18, marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 84, height: 84 }}>
          <Ring size={84} stroke={8} pct={(scoreNow/(hole.par+1))*100} color={t.ring1}/>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>{scoreNow}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: t.ring1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>ボギーオン達成</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>+1 (ボギー)</div>
          <div style={{ fontSize: 11, color: t.sub, marginTop: 2 }}>月間リング +0.6%</div>
        </div>
      </div>

      {/* Tap inputs in a dense row */}
      <div style={{ fontSize: 10, color: t.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 18, marginBottom: 8 }}>スコア</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
        {[3,4,5,6,7,8].map(n => {
          const active = n === scoreNow;
          return (
            <button key={n} style={{
              background: active ? t.ring1 : t.surface2,
              color: active ? t.bg : t.text,
              border: 'none', borderRadius: 10, padding: '14px 0',
              fontFamily: t.mono, fontSize: 14, fontWeight: 700
            }}>{n}</button>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: t.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 14, marginBottom: 8 }}>パット</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {[1,2,3,4,5].map(n => {
          const active = n === 2;
          return (
            <button key={n} style={{
              background: active ? t.ring2 : t.surface2,
              color: active ? t.bg : t.text,
              border: 'none', borderRadius: 10, padding: '14px 0',
              fontFamily: t.mono, fontSize: 14, fontWeight: 700
            }}>{n}</button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}>
        <button style={{ background: t.surface2, color: t.text, border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 12, fontWeight: 700 }}>FW ○</button>
        <button style={{ background: t.surface2, color: t.sub, border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 12, fontWeight: 700 }}>OB なし</button>
      </div>

      <button style={{ marginTop: 16, width: '100%', background: t.ring1, color: t.bg, border: 'none', borderRadius: 999, padding: '14px 0', fontSize: 14, fontWeight: 700 }}>
        次のホールへ →
      </button>
    </div>
  );
}

window.Pattern2FitnessV2 = Pattern2FitnessV2;

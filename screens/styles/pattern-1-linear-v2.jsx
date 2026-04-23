// pattern-1-linear-v2.jsx — Linear-inspired, optimized for this golf record/practice service
// Key adaptations:
//  - Lead with "目標差分" (gap to target) instead of raw score
//  - Surface ボギーオン率/パーオン率/FW率 as primary stats
//  - Clear bridge: Focus → Drill (this service's practice mode)
//  - Round input: hole-per-screen, only the 6 true inputs (Score/Putt/FW/OB/Approach/3putt)

function Pattern1LinearV2({ screen }) {
  const P = window.PERSONAS?.['100切り'];
  if (!P) return <div style={{padding:40}}>no data</div>;

  const t = {
    bg: '#FAFAFA', surface: '#FFFFFF',
    border: '#EAEAEA', borderStrong: '#D4D4D4',
    text: '#111111', sub: '#6B6B6B', ter: '#9B9B9B',
    ok: '#2A8D5C', warn: '#C2410C', accent: '#111111',
    sans: '"Noto Sans JP", Inter, -apple-system, sans-serif',
    mono: 'IBM Plex Mono, monospace',
  };

  const label = (txt) => (
    <div style={{ fontFamily: t.mono, fontSize: 10, color: t.ter, letterSpacing: 0.8, textTransform: 'uppercase' }}>{txt}</div>
  );

  // --- HOME ------------------------------------------------------------
  if (screen === 'home') {
    const latest = P.rounds[0];
    // Top 3 focus stats with gap to target
    const focusStats = [
      { key: 'boggyOn',   label: 'ボギーオン率', cur: P.stats.boggyOn,   tgt: P.targets.boggyOn,   unit: '%' },
      { key: 'threePutt', label: '3パット率',    cur: P.stats.threePutt, tgt: P.targets.threePutt, unit: '%', reverse: true },
      { key: 'ob',        label: 'OB率',         cur: P.stats.ob,        tgt: P.targets.ob,        unit: '%', reverse: true },
    ];

    return (
      <div style={{ padding: '48px 20px 20px', height: '100%', overflow: 'auto', background: t.bg, fontFamily: t.sans, color: t.text, letterSpacing: -0.1 }}>
        {label('FAIRWAY')}
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 14, letterSpacing: -0.4 }}>Koji さん</div>
        <div style={{ fontSize: 12, color: t.sub, marginTop: 2 }}>{P.name} · {P.yearsPlaying}年目</div>

        {/* Next goal — THE thing users see first */}
        <div style={{ marginTop: 22, padding: 14, border: `1px solid ${t.border}`, borderRadius: 8, background: t.surface }}>
          {label('次の目標')}
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6, letterSpacing: -0.2 }}>{P.nextGoal}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <div style={{ flex: 1, height: 3, background: t.border, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: t.text, width: '62%' }}/>
            </div>
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.sub }}>62%</span>
          </div>
        </div>

        {/* Latest round — small, contextual */}
        <div style={{ marginTop: 22 }}>
          {label('LATEST ROUND')}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
            <div>
              <span style={{ fontFamily: t.mono, fontSize: 32, fontWeight: 400, letterSpacing: -1 }}>{latest.score}</span>
              <span style={{ fontFamily: t.mono, fontSize: 13, color: t.sub, marginLeft: 8 }}>+{latest.diff}</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: t.sub }}>
              <div>{latest.date}</div>
              <div>{latest.course}</div>
            </div>
          </div>
        </div>

        {/* Focus stats — the 3 things this persona is working on */}
        <div style={{ marginTop: 22 }}>
          {label('FOCUS · 目標差分')}
          <div style={{ marginTop: 6 }}>
            {focusStats.map((s, i) => {
              const gap = s.reverse ? (s.cur - s.tgt) : (s.tgt - s.cur);
              const pct = s.reverse ? Math.min(100, (s.tgt / s.cur) * 100) : Math.min(100, (s.cur / s.tgt) * 100);
              return (
                <div key={s.key} style={{ padding: '12px 0', borderBottom: i < focusStats.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                    <span style={{ fontFamily: t.mono, fontSize: 12 }}>
                      <span style={{ color: t.text }}>{s.cur}{s.unit}</span>
                      <span style={{ color: t.ter }}> → {s.tgt}{s.unit}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1, height: 2, background: t.border, borderRadius: 1, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: t.text, width: `${pct}%` }}/>
                    </div>
                    <span style={{ fontFamily: t.mono, fontSize: 10, color: t.warn, width: 46, textAlign: 'right' }}>
                      −{Math.abs(gap)}{s.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bridge to practice mode */}
        <div style={{ marginTop: 16, padding: 12, border: `1px solid ${t.borderStrong}`, borderRadius: 8, background: t.surface, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 2, height: 28, background: t.accent }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>この課題のドリルへ</div>
            <div style={{ fontSize: 11, color: t.sub, marginTop: 1 }}>3パット率を減らす · 4種類の練習</div>
          </div>
          <span style={{ fontFamily: t.mono, fontSize: 11, color: t.sub }}>→</span>
        </div>
      </div>
    );
  }

  // --- ANALYSIS --------------------------------------------------------
  if (screen === 'analysis') {
    const rows = [
      { key: 'avg',       ...window.STAT_META.avg,       cur: P.stats.avg,       tgt: 99 },
      { key: 'boggyOn',   ...window.STAT_META.boggyOn,   cur: P.stats.boggyOn,   tgt: P.targets.boggyOn },
      { key: 'parOn',     ...window.STAT_META.parOn,     cur: P.stats.parOn,     tgt: P.targets.parOn },
      { key: 'fairway',   ...window.STAT_META.fairway,   cur: P.stats.fairway,   tgt: P.targets.fairway },
      { key: 'threePutt', ...window.STAT_META.threePutt, cur: P.stats.threePutt, tgt: P.targets.threePutt, reverse: true },
      { key: 'ob',        ...window.STAT_META.ob,        cur: P.stats.ob,        tgt: P.targets.ob,        reverse: true },
    ];
    const trend = [108, 106, 104, 105, 102, 104, 102];

    return (
      <div style={{ padding: '48px 20px 20px', height: '100%', overflow: 'auto', background: t.bg, fontFamily: t.sans, color: t.text }}>
        {label('ANALYSIS')}
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 12, letterSpacing: -0.4 }}>スコア推移</div>
        <div style={{ fontSize: 12, color: t.sub, marginTop: 2 }}>直近 7 ラウンド · 平均 {P.stats.avg}</div>

        <svg viewBox="0 0 300 100" style={{ width: '100%', marginTop: 14 }}>
          <line x1="0" y1="60" x2="300" y2="60" stroke={t.border} strokeDasharray="2 3"/>
          <text x="295" y="56" textAnchor="end" fontFamily={t.mono} fontSize="8" fill={t.ter}>目標 99</text>
          <polyline fill="none" stroke={t.text} strokeWidth="1.5"
            points={trend.map((v,i)=>`${i*48+10},${(v-95)*5+10}`).join(' ')}/>
          {trend.map((v,i)=>(<circle key={i} cx={i*48+10} cy={(v-95)*5+10} r="3" fill={t.bg} stroke={t.text} strokeWidth="1.5"/>))}
        </svg>

        <div style={{ marginTop: 22 }}>
          {label('指標テーブル')}
          <div style={{ marginTop: 6 }}>
            {rows.map((r, i) => {
              const gap = r.reverse ? (r.cur - r.tgt) : (r.tgt - r.cur);
              const onTrack = gap <= 0;
              return (
                <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'baseline', padding: '11px 0', borderBottom: i < rows.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                  <span style={{ fontSize: 12 }}>{r.label}</span>
                  <span style={{ fontFamily: t.mono, fontSize: 12, color: t.sub, textAlign: 'right', minWidth: 78 }}>
                    {r.cur}{r.unit} / {r.tgt}{r.unit}
                  </span>
                  <span style={{ fontFamily: t.mono, fontSize: 11, color: onTrack ? t.ok : t.warn, width: 42, textAlign: 'right' }}>
                    {onTrack ? '✓' : `−${Math.abs(gap)}${r.unit}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- INPUT (round, per hole) -----------------------------------------
  const hole = { no: 5, par: 4, yards: 410 };
  const inputs = [
    { k: 'score', label: 'スコア', val: 5, hint: '+1' },
    { k: 'putt',  label: 'パット', val: 2, hint: '' },
    { k: 'fw',    label: 'FW',    val: '○', hint: 'キープ' },
    { k: 'ob',    label: 'OB',    val: 0, hint: '' },
  ];

  return (
    <div style={{ padding: '48px 20px 20px', height: '100%', overflow: 'auto', background: t.bg, fontFamily: t.sans, color: t.text }}>
      {label('HOLE 5 / 18')}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>Par {hole.par}</div>
        <div style={{ fontFamily: t.mono, fontSize: 12, color: t.sub }}>{hole.yards}Y</div>
      </div>

      {/* 4 key inputs as tap-list — mimics Linear property editor */}
      <div style={{ marginTop: 20, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden', background: t.surface }}>
        {inputs.map((it, i) => (
          <div key={it.k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', borderBottom: i < inputs.length - 1 ? `1px solid ${t.border}` : 'none' }}>
            <span style={{ fontSize: 12, color: t.sub, width: 60 }}>{it.label}</span>
            <span style={{ flex: 1, fontFamily: t.mono, fontSize: 18, fontWeight: 500 }}>{it.val}</span>
            {it.hint && <span style={{ fontFamily: t.mono, fontSize: 10, color: t.ter, border: `1px solid ${t.border}`, borderRadius: 4, padding: '2px 6px' }}>{it.hint}</span>}
          </div>
        ))}
      </div>

      {/* Stepper for active field (score) */}
      <div style={{ marginTop: 16 }}>
        {label('SCORE (ACTIVE)')}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {[3, 4, 5, 6, 7, 8].map(n => {
            const active = n === 5;
            return (
              <button key={n} style={{
                flex: 1, padding: '12px 0', border: `1px solid ${active ? t.text : t.border}`,
                background: active ? t.text : t.surface, color: active ? t.bg : t.text,
                fontFamily: t.mono, fontSize: 14, fontWeight: 500, borderRadius: 6, cursor: 'pointer'
              }}>{n}</button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: t.sub, marginTop: 8 }}>Par 4 に対して <span style={{ color: t.warn }}>+1 (ボギー)</span></div>
      </div>

      {/* Progress ribbon */}
      <div style={{ marginTop: 22 }}>
        {label('ラウンド進行')}
        <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
          {Array.from({ length: 18 }, (_, i) => {
            const done = i < 4, cur = i === 4;
            return (
              <div key={i} style={{
                flex: 1, height: 24, borderRadius: 2,
                background: cur ? t.text : done ? '#D4D4D4' : t.border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: t.mono, fontSize: 9, color: cur ? t.bg : t.sub
              }}>{i+1}</div>
            );
          })}
        </div>
      </div>

      <button style={{ marginTop: 16, width: '100%', background: t.text, color: t.bg, border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
        次のホールへ →
      </button>
    </div>
  );
}

window.Pattern1LinearV2 = Pattern1LinearV2;

// pattern-5-editorial.jsx — Editorial / newsprint: serifs, hairline rules, numerics

function Pattern5Editorial({ screen }) {
  const d = window.STYLE_DATA;
  const t = {
    bg: '#F4F1EA',         // warm off-white / newsprint
    paper: '#FBF9F3',
    ink: '#1A1A1A',
    sub: '#5A554E',
    ter: '#8A857C',
    rule: '#C9C3B5',
    accent: '#8C1D18',     // deep red
    serif: '"Playfair Display", "Times New Roman", Georgia, serif',
    sans: '"Inter", -apple-system, sans-serif',
    mono: 'IBM Plex Mono, monospace',
  };

  const Rule = ({ thick = 1, style = 'solid', mt = 12, mb = 12 }) =>
    <div style={{ borderTop: `${thick}px ${style} ${t.rule}`, marginTop: mt, marginBottom: mb }}/>;

  if (screen === 'home') return (
    <div style={{ height: '100%', overflow: 'auto', background: t.bg, color: t.ink, fontFamily: t.sans }}>
      {/* Masthead */}
      <div style={{ padding: '48px 20px 10px', borderBottom: `3px double ${t.ink}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 10, color: t.sub, letterSpacing: 2, textTransform: 'uppercase' }}>
          <span>Vol. XII · No. 47</span>
          <span>{d.latestRound.date}</span>
        </div>
        <div style={{ fontFamily: t.serif, fontSize: 36, letterSpacing: -0.5, textAlign: 'center', marginTop: 4, fontWeight: 900, fontStyle: 'italic' }}>
          The Round
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, color: t.sub, letterSpacing: 3, textTransform: 'uppercase', marginTop: 2 }}>
          Weekly Golf Record
        </div>
      </div>

      {/* Lead article */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 10, color: t.accent, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>LATEST DISPATCH</div>
        <div style={{ fontFamily: t.serif, fontSize: 26, lineHeight: 1.1, letterSpacing: -0.4, marginTop: 6, fontWeight: 700 }}>
          A Steady Round at {d.latestRound.course.split('·')[0].trim()}
        </div>
        <div style={{ fontSize: 11, color: t.sub, fontStyle: 'italic', marginTop: 4 }}>
          Filed from the 18th green, {d.latestRound.date}
        </div>

        <Rule/>

        {/* Drop-cap numerical summary */}
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ fontFamily: t.serif, fontSize: 96, lineHeight: 0.85, letterSpacing: -3, color: t.ink, fontWeight: 900 }}>
            {d.latestRound.score}
          </div>
          <div style={{ flex: 1, fontFamily: t.serif, fontSize: 14, lineHeight: 1.4, color: t.ink, paddingTop: 4 }}>
            Finished <em style={{ color: t.accent, fontStyle: 'normal', fontWeight: 700 }}>{d.latestRound.toPar}</em> with <strong>{d.latestRound.putts}</strong> putts and {d.latestRound.fairway} fairways hit of fourteen. Front nine held the line; the back slipped on the par-threes.
          </div>
        </div>

        <Rule style="double" thick={3} mt={18} mb={14}/>

        {/* Columnar stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {[
            { label: 'Putts',    val: d.latestRound.putts },
            { label: 'Fairways', val: `${d.latestRound.fairway}/14` },
            { label: 'G.I.R.',   val: `${d.latestRound.gir}/18` },
          ].map((m, i) => (
            <div key={m.label} style={{ textAlign: 'center', padding: '0 6px', borderLeft: i > 0 ? `1px solid ${t.rule}` : 'none' }}>
              <div style={{ fontFamily: t.mono, fontSize: 9, color: t.sub, letterSpacing: 2, textTransform: 'uppercase' }}>{m.label}</div>
              <div style={{ fontFamily: t.serif, fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>{m.val}</div>
            </div>
          ))}
        </div>

        <Rule mt={14}/>

        {/* Secondary */}
        <div style={{ fontSize: 10, color: t.accent, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>THE WEEK IN REVIEW</div>
        <div style={{ fontFamily: t.serif, fontSize: 18, marginTop: 4, fontWeight: 700, letterSpacing: -0.2 }}>
          Average holds at <span style={{ fontStyle: 'italic' }}>{d.weekly.avgScore}</span>; best of <span style={{ color: t.accent }}>{d.weekly.bestScore}</span>.
        </div>
        <div style={{ fontFamily: t.serif, fontSize: 13, color: t.sub, marginTop: 6, lineHeight: 1.5 }}>
          Over <strong style={{ color: t.ink }}>{d.weekly.rounds} rounds</strong> this week, scores trended downward — a modest gain of 1.2 strokes versus the prior seven outings.
        </div>

        {/* Trend */}
        <svg viewBox="0 0 300 60" style={{ width: '100%', marginTop: 10 }}>
          <polyline fill="none" stroke={t.ink} strokeWidth="1.5"
            points={d.weekly.trend.map((v,i)=>`${i*47+10},${(v-85)*4}`).join(' ')}/>
          {d.weekly.trend.map((v,i) => (
            <circle key={i} cx={i*47+10} cy={(v-85)*4} r="2" fill={t.accent}/>
          ))}
        </svg>
        <div style={{ fontSize: 10, color: t.ter, fontStyle: 'italic', textAlign: 'center', marginTop: 4 }}>
          Fig. 1 — Scores over last seven rounds
        </div>

        <Rule style="double" thick={3} mt={16}/>

        {/* Challenges */}
        <div style={{ fontSize: 10, color: t.accent, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>FOCUS POINTS</div>
        {d.challenges.slice(0,2).map((c, i) => (
          <div key={c.key} style={{ marginTop: 10, paddingTop: i > 0 ? 10 : 0, borderTop: i > 0 ? `1px dotted ${t.rule}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontFamily: t.serif, fontSize: 15, fontWeight: 700 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: t.sub, fontStyle: 'italic' }}>{c.metric}</div>
            </div>
            <div style={{ fontFamily: t.serif, fontSize: 22, fontWeight: 700, color: t.accent }}>
              {c.value}<span style={{ fontSize: 11, color: t.sub, fontFamily: t.mono, marginLeft: 4 }}>/{c.target}{c.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (screen === 'analysis') return (
    <div style={{ height: '100%', overflow: 'auto', background: t.bg, color: t.ink, fontFamily: t.sans }}>
      <div style={{ padding: '48px 20px 10px', borderBottom: `2px solid ${t.ink}` }}>
        <div style={{ fontSize: 10, color: t.sub, letterSpacing: 2, textTransform: 'uppercase' }}>Feature</div>
        <div style={{ fontFamily: t.serif, fontSize: 30, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.05, marginTop: 4 }}>
          Seven Rounds, <em style={{ color: t.accent }}>Examined</em>
        </div>
      </div>

      <div style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <div style={{ fontFamily: t.serif, fontSize: 72, fontWeight: 900, letterSpacing: -2, lineHeight: 0.85 }}>{d.weekly.avgScore}</div>
          <div style={{ fontSize: 11, color: t.sub, fontStyle: 'italic' }}>mean score, <br/>last 7 rounds</div>
        </div>

        <svg viewBox="0 0 300 80" style={{ width: '100%', marginTop: 10 }}>
          <polyline fill="none" stroke={t.ink} strokeWidth="2"
            points={d.weekly.trend.map((v,i)=>`${i*47+10},${(v-85)*5}`).join(' ')}/>
          {d.weekly.trend.map((v,i) => (
            <circle key={i} cx={i*47+10} cy={(v-85)*5} r="3" fill={t.bg} stroke={t.accent} strokeWidth="1.5"/>
          ))}
        </svg>
        <div style={{ fontSize: 10, color: t.ter, fontStyle: 'italic', textAlign: 'center' }}>
          Fig. 2 — Trajectory of scoring
        </div>

        <Rule style="double" thick={3} mt={16}/>

        <div style={{ fontSize: 10, color: t.accent, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>The Indicators</div>
        {d.challenges.map((c, i) => {
          const pct = c.reverse ? (c.target/c.value*100) : (c.value/c.target*100);
          return (
            <div key={c.key} style={{ padding: '12px 0', borderTop: i > 0 ? `1px solid ${t.rule}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontFamily: t.serif, fontSize: 17, fontWeight: 700 }}>{c.label}</div>
                <div style={{ fontFamily: t.serif, fontSize: 22, fontWeight: 700, color: pct >= 100 ? t.accent : t.ink }}>
                  {c.value}{c.unit}
                </div>
              </div>
              <div style={{ fontSize: 11, color: t.sub, fontStyle: 'italic', marginTop: 2 }}>
                Target {c.target}{c.unit} · {Math.round(pct)}% of goal
              </div>
              <div style={{ height: 4, background: t.rule, marginTop: 6, position: 'relative' }}>
                <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: t.ink }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Input — like a scorecard
  const r = d.currentRound;
  return (
    <div style={{ height: '100%', overflow: 'auto', background: t.bg, color: t.ink, fontFamily: t.sans }}>
      <div style={{ padding: '48px 20px 10px', borderBottom: `3px double ${t.ink}` }}>
        <div style={{ fontSize: 10, color: t.sub, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' }}>Scorecard · In Play</div>
        <div style={{ fontFamily: t.serif, fontSize: 28, fontWeight: 900, letterSpacing: -0.5, textAlign: 'center', marginTop: 2 }}>
          Hole <em style={{ color: t.accent }}>{r.hole}</em>
        </div>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.sub, letterSpacing: 1, textAlign: 'center', marginTop: 2 }}>
          PAR {r.par} · {r.yardage} YARDS
        </div>
      </div>

      <div style={{ padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ fontFamily: t.serif, fontSize: 110, fontWeight: 900, letterSpacing: -4, lineHeight: 0.85, color: t.ink }}>
          {r.strokes.length}
        </div>
        <div style={{ fontSize: 11, color: t.sub, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>
          Strokes · <span style={{ color: t.accent, fontWeight: 700 }}>{r.strokes.length - r.par > 0 ? '+' : ''}{r.strokes.length - r.par}</span>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: t.serif }}>
          <thead>
            <tr style={{ borderTop: `2px solid ${t.ink}`, borderBottom: `1px solid ${t.ink}` }}>
              <th style={{ textAlign: 'left', padding: '6px 2px', fontSize: 10, letterSpacing: 2, color: t.sub, fontFamily: t.mono, textTransform: 'uppercase', fontWeight: 700 }}>#</th>
              <th style={{ textAlign: 'left', padding: '6px 2px', fontSize: 10, letterSpacing: 2, color: t.sub, fontFamily: t.mono, textTransform: 'uppercase', fontWeight: 700 }}>Club</th>
              <th style={{ textAlign: 'left', padding: '6px 2px', fontSize: 10, letterSpacing: 2, color: t.sub, fontFamily: t.mono, textTransform: 'uppercase', fontWeight: 700 }}>Result</th>
              <th style={{ textAlign: 'right', padding: '6px 2px', fontSize: 10, letterSpacing: 2, color: t.sub, fontFamily: t.mono, textTransform: 'uppercase', fontWeight: 700 }}>Yds</th>
            </tr>
          </thead>
          <tbody>
            {r.strokes.map(s => (
              <tr key={s.n} style={{ borderBottom: `1px dotted ${t.rule}` }}>
                <td style={{ padding: '8px 2px', fontFamily: t.mono, fontSize: 12, color: t.sub }}>{s.n}</td>
                <td style={{ padding: '8px 2px', fontSize: 14, fontWeight: 700 }}>{s.club}</td>
                <td style={{ padding: '8px 2px', fontSize: 12, color: t.sub, fontStyle: 'italic' }}>{s.result}</td>
                <td style={{ padding: '8px 2px', fontFamily: t.mono, fontSize: 12, textAlign: 'right' }}>{s.d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 10, color: t.sub, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontFamily: t.mono }}>Select Club</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {['PW','9I','8I','SW'].map(c => (
            <button key={c} style={{ background: t.paper, color: t.ink, border: `1px solid ${t.ink}`, borderRadius: 0, padding: '12px 0', fontFamily: t.serif, fontSize: 15, fontWeight: 700 }}>{c}</button>
          ))}
        </div>
        <button style={{ marginTop: 12, width: '100%', background: t.ink, color: t.bg, border: 'none', borderRadius: 0, padding: '14px 0', fontFamily: t.serif, fontSize: 15, fontWeight: 700, letterSpacing: 1, fontStyle: 'italic' }}>
          Conclude Hole
        </button>
      </div>
    </div>
  );
}

window.Pattern5Editorial = Pattern5Editorial;

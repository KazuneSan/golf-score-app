// screens/analysis.jsx — Linear v2. 3 tabs: overview / detail / link.

function AnalysisScreen({ theme, persona, go }) {
  const [tab, setTab] = React.useState('overview');
  const p = persona;
  const s = p.stats, t = p.targets;

  const STATS_ORDER = [
    { k: 'boggyOn',   better: 'higher', impact: 'high' },
    { k: 'parOn',     better: 'higher', impact: 'med' },
    { k: 'threePutt', better: 'lower',  impact: 'high' },
    { k: 'ob',        better: 'lower',  impact: 'high' },
    { k: 'fairway',   better: 'higher', impact: 'med' },
    { k: 'upDown',    better: 'higher', impact: 'med' },
    { k: 'avgPutt',   better: 'lower',  impact: 'low' },
    { k: 'sandSave',  better: 'higher', impact: 'low' },
  ];

  const actionHint = (k, val, targ, better) => {
    const diff = better === 'higher' ? targ - val : val - targ;
    if (diff <= 0) return '目標達成ずみ';
    if (k === 'boggyOn') return `18H 中あと ${Math.ceil((diff/100)*18)} 回 ボギーオンできれば目標到達`;
    if (k === 'parOn')   return `18H 中あと ${Math.ceil((diff/100)*18)} 回 パーオンできれば目標到達`;
    if (k === 'fairway') return `14H 中あと ${Math.ceil((diff/100)*14)} 回 FW に置ければ OK`;
    if (k === 'upDown')  return `グリーン外しから +${Math.ceil((diff/100)*6)} 回 寄せワン`;
    if (k === 'threePutt') return `18H 中 3パットを あと ${Math.ceil((diff/100)*18)} 回 減らす`;
    if (k === 'ob')      return `ラウンドに OB を あと ${Math.ceil((diff/100)*18*0.5)} 回 減らす`;
    if (k === 'avgPutt') return `1ホール平均で -${diff.toFixed(2)} 打`;
    return '改善余地あり';
  };

  const label = (txt, style = {}) => (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
      letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
      ...style,
    }}>{txt}</div>
  );

  // Trend chart points — recent rounds
  const trend = [...p.rounds].reverse().map(r => r.score);
  const goalScore = parseInt(p.nextGoal.match(/平均\s*(\d+)/)?.[1] || '99', 10);
  const spW = 300, spH = 90;
  const sMax = Math.max(...trend, goalScore + 2);
  const sMin = Math.min(...trend, goalScore - 2);
  const pathD = trend.map((v, i) => {
    const x = (i / Math.max(1, trend.length - 1)) * spW;
    const y = spH - ((v - sMin) / Math.max(1, sMax - sMin)) * spH;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const goalY = spH - ((goalScore - sMin) / Math.max(1, sMax - sMin)) * spH;

  return (
    <div style={{ padding: '0 20px 120px', color: theme.text, fontFamily: FONT.sans }}>
      {/* Header */}
      <div style={{ paddingTop: 4, marginBottom: 14 }}>
        {label('ANALYSIS')}
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, marginTop: 8 }}>分析</div>
        <div style={{ fontSize: 12, color: theme.textSec, marginTop: 4 }}>{p.name} · 直近 {p.rounds.length} ラウンド</div>
      </div>

      <Seg theme={theme} value={tab} onChange={setTab}
        options={[
          { value: 'overview', label: 'サマリー' },
          { value: 'detail',   label: '詳細' },
          { value: 'link',     label: 'つながり' },
        ]}/>

      {tab === 'overview' && (
        <>
          {/* Self level */}
          <div style={{ marginTop: 18, padding: 14, border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface }}>
            {label('自分のレベル')}
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6, letterSpacing: -0.3 }}>{p.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <div style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.5, textTransform: 'uppercase' }}>平均スコア</div>
                <div style={{ fontFamily: FONT.mono, fontSize: 26, fontWeight: 400, letterSpacing: -0.8, marginTop: 4 }}>{s.avg.toFixed(1)}</div>
              </div>
              <div>
                <div style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.5, textTransform: 'uppercase' }}>次の壁</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 6, lineHeight: 1.3 }}>{p.nextGoal}</div>
              </div>
            </div>
          </div>

          {/* Trend chart */}
          <div style={{ marginTop: 22 }}>
            {label('スコア推移')}
            <svg viewBox={`0 0 ${spW} ${spH + 20}`} style={{ width: '100%', marginTop: 10, overflow: 'visible' }}>
              <line x1={0} x2={spW} y1={goalY} y2={goalY} stroke={theme.textTer} strokeDasharray="2 3" strokeWidth={0.8}/>
              <text x={spW} y={goalY - 4} textAnchor="end" fontFamily={FONT.mono} fontSize="8" fill={theme.textTer}>目標 {goalScore}</text>
              <path d={pathD} fill="none" stroke={theme.text} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              {trend.map((v, i) => {
                const x = (i / Math.max(1, trend.length - 1)) * spW;
                const y = spH - ((v - sMin) / Math.max(1, sMax - sMin)) * spH;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r={2.5} fill={theme.bg} stroke={theme.text} strokeWidth="1.2"/>
                    <text x={x} y={spH + 14} textAnchor="middle" fontFamily={FONT.mono} fontSize="9" fill={theme.textSec}>{v}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Focus — top 3 */}
          <div style={{ marginTop: 22 }}>
            {label('注目すべき指標')}
            <div style={{ marginTop: 8 }}>
              {STATS_ORDER.slice(0, 3).map((item, i, arr) => {
                const m = STAT_META[item.k];
                const val = s[item.k], targ = t[item.k];
                const ok = item.better === 'higher' ? val >= targ : val <= targ;
                const gap = item.better === 'higher' ? targ - val : val - targ;
                return (
                  <div key={item.k} style={{
                    padding: '14px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${theme.border}` : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</span>
                        <Pill theme={theme} tone={ok ? 'good' : 'warn'}>
                          {ok ? '達成' : 'あと少し'}
                        </Pill>
                      </div>
                      <span style={{ fontFamily: FONT.mono, fontSize: 12, color: theme.textSec }}>
                        {m.decimals ? val.toFixed(m.decimals) : val}{m.unit} / {m.decimals ? targ.toFixed(m.decimals) : targ}{m.unit}
                      </span>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <Progress theme={theme} value={val} target={targ} better={item.better}/>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 11.5, color: theme.textSec, lineHeight: 1.5 }}>
                      {actionHint(item.k, val, targ, item.better)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {p.later.length > 0 && (
            <div style={{ marginTop: 22 }}>
              {label('後回しにしてよい')}
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {p.later.map(x => <Pill key={x} theme={theme} tone="ghost">{x}</Pill>)}
              </div>
              <div style={{ marginTop: 8, fontSize: 11.5, color: theme.textSec, lineHeight: 1.5 }}>
                今の平均スコア帯では、この指標を追いかけてもスコアに直結しにくい傾向があります。
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'detail' && (
        <div style={{ marginTop: 18 }}>
          {label('指標テーブル')}
          <div style={{ marginTop: 8 }}>
            {STATS_ORDER.map((item, i, arr) => {
              const m = STAT_META[item.k];
              const val = s[item.k], targ = t[item.k];
              const diff = item.better === 'higher' ? val - targ : targ - val;
              const ok = diff >= 0;
              return (
                <div key={item.k} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 12, alignItems: 'baseline',
                  padding: '13px 0',
                  borderBottom: i < arr.length - 1 ? `1px solid ${theme.border}` : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {m.label}
                      <span style={{
                        fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
                        marginLeft: 6, letterSpacing: 0.4, textTransform: 'uppercase',
                      }}>
                        {item.impact === 'high' ? 'H' : item.impact === 'med' ? 'M' : 'L'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: theme.textSec, marginTop: 2 }}>
                      {actionHint(item.k, val, targ, item.better)}
                    </div>
                  </div>
                  <span style={{ fontFamily: FONT.mono, fontSize: 12, color: theme.textSec, textAlign: 'right', minWidth: 88 }}>
                    {m.decimals ? val.toFixed(m.decimals) : val}{m.unit} / {m.decimals ? targ.toFixed(m.decimals) : targ}{m.unit}
                  </span>
                  <span style={{
                    fontFamily: FONT.mono, fontSize: 11,
                    color: ok ? theme.good : theme.warn,
                    width: 48, textAlign: 'right',
                  }}>
                    {ok ? '✓' : `−${m.decimals ? Math.abs(diff).toFixed(m.decimals) : Math.abs(diff)}${m.unit}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'link' && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            {label('通常モード × 練習モード')}
            <div style={{ marginTop: 10, border: `1px solid ${theme.border}`, borderRadius: 8, padding: 14, background: theme.surface }}>
              <CausalRow theme={theme}
                cause={{ label: 'パーオン率', val: `${s.parOn}%`, target: `目標 ${t.parOn}%` }}
                mid={{ label: 'セカンド再現率', val: '48%' }}
                rec={{ label: 'セカンドを練習', hint: '140-170Y のグリーン乗せ' }}
                onClick={()=>go('practice')}/>
              <div style={{ height: 1, background: theme.border, margin: '16px 0' }}/>
              <CausalRow theme={theme}
                cause={{ label: '3パット率', val: `${s.threePutt}%`, target: `目標 ${t.threePutt}%` }}
                mid={{ label: 'パター再現率', val: '71%' }}
                rec={{ label: '3m ロングパット', hint: '1発目の距離感に絞る' }}
                onClick={()=>go('practice')}/>
              <div style={{ height: 1, background: theme.border, margin: '16px 0' }}/>
              <CausalRow theme={theme}
                cause={{ label: 'OB率', val: `${s.ob}%`, target: `目標 ${t.ob}%` }}
                mid={{ label: 'ティー方向性', val: '右OB傾向' }}
                rec={{ label: '右 OB を封じる', hint: 'セットアップ + 球筋' }}
                onClick={()=>go('practice')}/>
            </div>
          </div>

          <div style={{
            padding: 14, border: `1px solid ${theme.borderStrong}`, borderRadius: 8,
            background: theme.surface,
          }}>
            {label('次のアクション')}
            <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, lineHeight: 1.5, letterSpacing: -0.2 }}>
              「セカンド」を中心に練習 → 次ラウンドで<br/>
              140-170Y を <span style={{ fontFamily: FONT.mono, background: theme.text, color: theme.bg, padding: '1px 5px', borderRadius: 3 }}>+3本</span> グリーンに乗せる
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CausalRow({ cause, mid, rec, theme, onClick }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.5, textTransform: 'uppercase' }}>通常</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{cause.label}</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 500, marginTop: 2, color: theme.warn }}>{cause.val}</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, marginTop: 1 }}>{cause.target}</div>
        </div>
        <div style={{ color: theme.textTer, fontFamily: FONT.mono, fontSize: 18 }}>→</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.5, textTransform: 'uppercase' }}>練習</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{mid.label}</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 500, marginTop: 2, color: theme.danger }}>{mid.val}</div>
        </div>
      </div>
      <button onClick={onClick} style={{
        marginTop: 10, width: '100%',
        background: theme.text, color: theme.bg,
        border: 'none', borderRadius: 6,
        padding: '10px 12px', cursor: 'pointer',
        fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 500,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{rec.label} <span style={{ opacity: 0.55 }}>· {rec.hint}</span></span>
        <span style={{ fontFamily: FONT.mono }}>›</span>
      </button>
    </div>
  );
}

window.AnalysisScreen = AnalysisScreen;

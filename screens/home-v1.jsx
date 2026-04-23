// screens/home.jsx — Dashboard

function HomeScreen({ theme, persona, go }) {
  const p = persona;
  const s = p.stats;
  const t = p.targets;
  const [filter, setFilter] = React.useState('期間: 直近5R');

  const statCards = [
    { k: 'boggyOn', better: 'higher', src: 'calc' },
    { k: 'parOn',   better: 'higher', src: 'calc' },
    { k: 'fairway', better: 'higher', src: 'calc' },
    { k: 'upDown',  better: 'higher', src: 'calc' },
  ];

  return (
    <div style={{ padding: '0 16px 120px', color: theme.text, fontFamily: FONT.sans }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 4, marginBottom: 18,
      }}>
        <div>
          <div style={{ fontSize: 12, color: theme.textSec, letterSpacing: 0.3 }}>こんにちは、Kenji</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.8, marginTop: 2 }}>今日のゴルフ</div>
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: 999,
          background: theme.accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14,
        }}>K</div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {['期間: 直近5R','コース: すべて','フレンド: 自分'].map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{
            border: `1px solid ${filter===f ? 'transparent' : theme.border}`,
            background: filter===f ? theme.text : 'transparent',
            color: filter===f ? theme.bg : theme.textSec,
            padding: '7px 12px', borderRadius: 999,
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>{f}</button>
        ))}
      </div>

      {/* Hero: latest round */}
      <Card theme={theme} padding={18} style={{ marginBottom: 12, background: theme.accent, color: '#fff', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 0.4, textTransform: 'uppercase' }}>直近ラウンド</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{p.rounds[0].course}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{p.rounds[0].date}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 44, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1 }}>{p.rounds[0].score}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 13, opacity: 0.75, marginTop: 4 }}>+{p.rounds[0].diff}  /  {p.rounds[0].putts} putts</div>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <TapBtn theme={theme} variant="surface" style={{ flex: 1, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} onClick={()=>go('round')}>
            + ラウンド記録
          </TapBtn>
          <TapBtn theme={theme} variant="surface" style={{ flex: 1, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} onClick={()=>go('practice')}>
            + 練習モード
          </TapBtn>
        </div>
      </Card>

      {/* Key stats grid */}
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSec, margin: '18px 2px 10px', letterSpacing: 0.5, textTransform: 'uppercase' }}>主要スタッツ</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {statCards.map((sc, i) => {
          const meta = STAT_META[sc.k];
          const val = s[sc.k];
          const targ = t[sc.k];
          const unit = meta.unit;
          const label = meta.label;
          return (
            <Card key={sc.k} theme={theme} padding={14}>
              <Stat theme={theme} label={label} unit={unit} src={sc.src}
                value={meta.decimals ? val.toFixed(meta.decimals) : val}
                align="left" />
              <div style={{ marginTop: 10 }}>
                <Progress theme={theme} value={val} target={targ} better={sc.better}/>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: theme.textSec, fontFamily: FONT.mono, letterSpacing: 0.2 }}>
                目標 {meta.decimals ? targ.toFixed(meta.decimals) : targ}{unit}
              </div>
            </Card>
          );
        })}
        <Card theme={theme} padding={14} style={{ display:'flex', alignItems:'center', justifyContent: 'center' }} onClick={()=>go('analysis')}>
          <div style={{ textAlign: 'center', color: theme.textSec, fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>全スタッツを見る</div>
            <div style={{ marginTop: 2, fontSize: 11 }}>Analysis →</div>
          </div>
        </Card>
      </div>

      {/* Focus metric */}
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSec, margin: '22px 2px 10px', letterSpacing: 0.5, textTransform: 'uppercase' }}>今見るべき指標</div>
      <Card theme={theme} padding={16}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pill theme={theme} tone="accent">FOCUS</Pill>
          <span style={{ fontSize: 12, color: theme.textSec }}>{p.name}</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
          {p.focus[0]}を 1 番見る
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: theme.textSec, lineHeight: 1.55 }}>
          いまの段階では {p.focus[0]} がスコアに直結します。他の指標は一旦気にせず、この数字の上下だけ追いましょう。
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {p.focus.map(f => <Pill key={f} theme={theme} tone="neutral">{f}</Pill>)}
          {p.later.map(f => <Pill key={f} theme={theme} tone="ghost">後で: {f}</Pill>)}
        </div>
      </Card>

      {/* Next improvement */}
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSec, margin: '22px 2px 10px', letterSpacing: 0.5, textTransform: 'uppercase' }}>次に改善すべきポイント</div>
      <Card theme={theme} padding={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: theme.textSec, letterSpacing: 0.3, textTransform: 'uppercase' }}>原因 → 対策</div>
            <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600, letterSpacing: -0.2, lineHeight: 1.45 }}>
              パーオン率が低い →<br/>
              練習モードでも <span style={{ color: theme.accent }}>セカンド成功率が低め</span>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 14, padding: 12, background: theme.accentSoft,
          borderRadius: 12, color: theme.accentInk, fontSize: 13, lineHeight: 1.55,
        }}>
          <b>次のラウンドであと3回</b>、140-170Yのセカンドをグリーンに乗せられれば、ボギーオン率が目標に届きます。
        </div>
        <TapBtn theme={theme} variant="soft" style={{ marginTop: 14 }} full onClick={()=>go('analysis')}>分析を見る →</TapBtn>
      </Card>

      {/* Suggested practice */}
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSec, margin: '22px 2px 10px', letterSpacing: 0.5, textTransform: 'uppercase' }}>おすすめ練習テーマ</div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, marginRight: -16, paddingRight: 16 }}>
        {[
          { t: 'セカンド', d: '140-170Y のグリーン乗せ', pri: true },
          { t: 'アプローチ', d: '30Y 以内の距離感', pri: false },
          { t: 'パター', d: '3m 以内の確実性', pri: false },
        ].map((x, i) => (
          <div key={i} style={{
            minWidth: 200,
            background: x.pri ? theme.text : theme.surface,
            color: x.pri ? theme.bg : theme.text,
            border: x.pri ? 'none' : `1px solid ${theme.border}`,
            borderRadius: 18, padding: 16,
          }}>
            <div style={{ fontSize: 11, opacity: x.pri ? 0.7 : 1, color: x.pri ? undefined : theme.textSec, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              {x.pri ? 'PRIORITY' : 'SUGGESTED'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8, letterSpacing: -0.3 }}>{x.t}</div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: x.pri ? 0.7 : 1, color: x.pri ? undefined : theme.textSec }}>{x.d}</div>
            <button onClick={()=>go('practice')} style={{
              marginTop: 14, border: 'none',
              background: x.pri ? 'rgba(255,255,255,0.15)' : theme.accentSoft,
              color: x.pri ? '#fff' : theme.accent,
              padding: '8px 12px', borderRadius: 10,
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}>練習モードを開始</button>
          </div>
        ))}
      </div>

      {/* Past rounds */}
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSec, margin: '22px 2px 10px', letterSpacing: 0.5, textTransform: 'uppercase' }}>直近のラウンド</div>
      <Card theme={theme} padding={0}>
        {p.rounds.map((r, i) => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            borderBottom: i < p.rounds.length - 1 ? `1px solid ${theme.border}` : 'none',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: theme.accentSoft, color: theme.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{Icon.flag(theme.accent, 16)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>{r.course}</div>
              <div style={{ fontSize: 12, color: theme.textSec, marginTop: 2 }}>{r.date} · ボギーオン {r.boggyOn}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 20, fontWeight: 600, letterSpacing: -0.5 }}>{r.score}</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.textSec }}>+{r.diff}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

window.HomeScreen = HomeScreen;

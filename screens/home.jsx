// screens/home.jsx — Linear v2
// Structure (top → bottom):
//  ① IDENTITY           who + persona + avatar
//  ② LATEST ROUND       score + diff + date + course + 7-round sparkline
//  ③ NEXT GOAL          the thing to chase, with progress to it
//  ④ FOCUS · 目標差分   top N focus stats, each as a row with gap
//  ⑤ 今日のドリル       drill progress + rotating tip
//  ⑥ BRIDGE             → practice mode
//  ⑦ OTHER STATS        compact table, tap → analysis
//
// Everything is monochrome. Numbers in IBM Plex Mono, labels in SF-mono uppercase.

function HomeScreen({ theme, persona, go }) {
  const p = persona;
  const s = p.stats;
  const t = p.targets;

  // --- real last round (from localStorage history) ------------------
  const lastRound = (() => {
    try {
      const arr = JSON.parse(localStorage.getItem('gs_rounds') || '[]');
      return arr[0] || null;
    } catch { return null; }
  })();
  const hoursSinceRound = lastRound?.endedAt
    ? (Date.now() - lastRound.endedAt) / (1000 * 60 * 60)
    : null;
  const withinWindow = hoursSinceRound != null && hoursSinceRound <= 48;

  // Restore __roundState from a saved round and navigate to complete screen.
  const reopenComplete = (round) => {
    if (!round) return;
    window.__roundState = {
      course: {
        id: round.course?.id,
        name: round.course?.name || 'コース',
        par: round.course?.par || round.holes.reduce((a, h) => a + h.par, 0),
        holes: round.holes,
      },
      teeColor: round.teeColor,
      startSide: round.startSide,
      isHalf: round.isHalf,
      target: round.target,
      startedAt: round.startedAt,
      endedAt: round.endedAt,
      holes: round.holes,
      memo: round.memo || '',
      status: 'finalized',
    };
    go('round-complete');
  };

  // Which focus metric to surface in the 48h CTA. Match persona.focus[0] to a drill.
  const ctaFocusLabel = p.focus?.[0] || '';
  const ctaDrill = (() => {
    const lib = window.DRILL_LIBRARY || {};
    for (const id of Object.keys(lib)) {
      if (lib[id]?.goal?.metric === ctaFocusLabel) return { id, data: lib[id] };
    }
    return null;
  })();

  // --- derived ------------------------------------------------------
  const latest = p.rounds[0];
  const scores = p.rounds.map(r => r.score);
  const avgScore = p.avgScore;
  const goalScore = parseInt(p.nextGoal.match(/平均\s*(\d+)/)?.[1] || '99', 10);
  const gap = avgScore - goalScore;

  const focusKey = p.focus[0];
  const tip = window.pickTip(focusKey);
  const drill = window.FOCUS_DRILL_PROGRESS[focusKey] || {};

  const STAT_KEY_BY_LABEL = {
    'ボギーオン率': 'boggyOn',
    '3パット率':    'threePutt',
    'OB率':         'ob',
    'パーオン率':   'parOn',
    'パット数':     'avgPutt',
    '寄せワン率':   'upDown',
    '飛距離':       null,
    'GIR距離別':    'parOn',
  };

  // Focus stats: primary focus + next 2
  const focusStatKeys = p.focus
    .map(f => STAT_KEY_BY_LABEL[f])
    .filter(Boolean)
    .slice(0, 3);

  const reverseSet = new Set(['threePutt', 'ob', 'avgPutt']);

  const otherStats = [
    { k: 'parOn' },
    { k: 'fairway' },
    { k: 'upDown' },
    { k: 'sandSave' },
  ].filter(x => !focusStatKeys.includes(x.k));

  // Sparkline — ラウンドは配列先頭が最新なので reverse して「古→新」にする
  const trend = [...scores].reverse();
  const spW = 140, spH = 34;
  const sMax = Math.max(...trend, goalScore + 2);
  const sMin = Math.min(...trend, goalScore - 2);
  const sparkPath = trend.map((v, i) => {
    const x = (i / Math.max(1, trend.length - 1)) * spW;
    const y = spH - ((v - sMin) / Math.max(1, sMax - sMin)) * spH;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const goalY = spH - ((goalScore - sMin) / Math.max(1, sMax - sMin)) * spH;

  // --- helpers ------------------------------------------------------
  const label = (txt, style = {}) => (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
      letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
      ...style,
    }}>{txt}</div>
  );

  const section = (mt = 24) => ({ marginTop: mt });

  // Row for a focus stat
  const StatRow = ({ k, accent = false }) => {
    const meta = window.STAT_META[k];
    const cur = s[k];
    const tgt = t[k];
    const reverse = reverseSet.has(k);
    const gap = reverse ? (cur - tgt) : (tgt - cur);
    const ok = gap <= 0;
    const pct = Math.max(0, Math.min(100, reverse
      ? (tgt / Math.max(cur, 0.01)) * 100
      : (cur / tgt) * 100));
    const dispCur = meta.decimals ? cur.toFixed(meta.decimals) : cur;
    const dispTgt = meta.decimals ? tgt.toFixed(meta.decimals) : tgt;
    return (
      <div style={{ padding: '12px 0', borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, fontWeight: accent ? 600 : 500, letterSpacing: -0.2 }}>
            {meta.label}
            {accent && <span style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, marginLeft: 6, letterSpacing: 0.4 }}>PRIMARY</span>}
          </span>
          <span style={{ fontFamily: FONT.mono, fontSize: 12 }}>
            <span style={{ color: theme.text }}>{dispCur}{meta.unit}</span>
            <span style={{ color: theme.textTer }}> → {dispTgt}{meta.unit}</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1, height: 2, background: theme.border, borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: ok ? theme.good : theme.text, width: `${pct}%`, transition: 'width .4s' }}/>
          </div>
          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: ok ? theme.good : theme.warn, width: 52, textAlign: 'right' }}>
            {ok ? '達成' : `−${Math.abs(gap).toFixed(meta.decimals || 0)}${meta.unit}`}
          </span>
        </div>
      </div>
    );
  };

  // --- render -------------------------------------------------------
  return (
    <div style={{
      padding: '0 20px 120px',
      color: theme.text,
      fontFamily: FONT.sans,
      letterSpacing: -0.1,
    }}>
      {/* ① Identity */}
      <div style={{ paddingTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {label('FAIRWAY')}
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 10, letterSpacing: -0.3 }}>Koji さん</div>
          <div style={{ fontSize: 11, color: theme.textSec, marginTop: 2 }}>{p.name} · {p.yearsPlaying}年目</div>
        </div>
        <div style={{
          width: 30, height: 30, borderRadius: 4,
          background: theme.text, color: theme.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 600, fontSize: 12,
        }}>K</div>
      </div>

      {/* 48h post-round CTA */}
      {withinWindow && lastRound && (
        <div
          onClick={() => reopenComplete(lastRound)}
          style={{
            ...section(18), padding: '14px 14px',
            background: theme.text, color: theme.bg,
            borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 9, opacity: 0.6,
              letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
            }}>Round Recap · {Math.max(1, Math.round(48 - hoursSinceRound))}h 残り</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4, letterSpacing: -0.1 }}>
              ラウンドお疲れ様でした！
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 4, lineHeight: 1.5 }}>
              {ctaFocusLabel && ctaDrill
                ? `「${ctaFocusLabel}」を改善する${ctaDrill.data.challenge ? `「${ctaDrill.data.challenge}」` : 'ドリル'}を試してみよう`
                : '今日の結果と、次に活かすポイントを見る'}
            </div>
          </div>
          <span style={{ fontFamily: FONT.mono, fontSize: 14, opacity: 0.6 }}>→</span>
        </div>
      )}

      {/* ② Latest round */}
      <div
        style={{ ...section(26), cursor: lastRound ? 'pointer' : 'default' }}
        onClick={lastRound ? () => reopenComplete(lastRound) : undefined}
      >
        {label('LATEST ROUND')}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: FONT.mono, fontSize: 36, fontWeight: 400, letterSpacing: -1.2 }}>
                {lastRound?.total ?? latest.score}
              </span>
              <span style={{
                fontFamily: FONT.mono, fontSize: 13,
                color: (lastRound?.diff ?? latest.diff) > 0 ? theme.textSec : theme.good,
              }}>
                {lastRound ? `${lastRound.diff >= 0 ? '+' : ''}${lastRound.diff}` : `+${latest.diff}`}
              </span>
            </div>
            <div style={{ fontSize: 11, color: theme.textSec, marginTop: 2 }}>
              {lastRound
                ? `${new Date(lastRound.endedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} · ${lastRound.course?.name || ''}`
                : `${latest.date} · ${latest.course}`}
            </div>
          </div>
          <div style={{ flex: 1, maxWidth: 160 }}>
            <svg viewBox={`0 0 ${spW} ${spH}`} style={{ width: '100%', height: spH, overflow: 'visible' }}>
              <line x1={0} x2={spW} y1={goalY} y2={goalY} stroke={theme.textTer} strokeDasharray="2 3" strokeWidth={0.7}/>
              <text x={spW} y={goalY - 3} fontSize="7" fill={theme.textTer} textAnchor="end" fontFamily={FONT.mono}>目標 {goalScore}</text>
              <path d={sparkPath} fill="none" stroke={theme.text} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              {trend.map((v, i) => {
                const x = (i / Math.max(1, trend.length - 1)) * spW;
                const y = spH - ((v - sMin) / Math.max(1, sMax - sMin)) * spH;
                return <circle key={i} cx={x} cy={y} r={1.5} fill={theme.bg} stroke={theme.text} strokeWidth="1"/>;
              })}
            </svg>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, textAlign: 'right', marginTop: 4, letterSpacing: 0.4 }}>
              平均 {avgScore.toFixed(1)} · best {p.best}
            </div>
          </div>
        </div>
      </div>

      {/* Primary actions */}
      <div style={{ ...section(14), display: 'flex', gap: 6 }}>
        <button onClick={() => go('course-select')} style={{
          flex: 1, background: theme.text, color: theme.bg, border: 'none',
          padding: '11px 0', borderRadius: 6, fontFamily: FONT.sans,
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
        }}>＋ ラウンド記録</button>
        <button onClick={() => go('practice')} style={{
          flex: 1, background: 'transparent', color: theme.text,
          border: `1px solid ${theme.borderStrong}`,
          padding: '11px 0', borderRadius: 6, fontFamily: FONT.sans,
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
        }}>練習モード</button>
      </div>

      {/* ③ Next goal */}
      <div style={{ ...section(26), border: `1px solid ${theme.border}`, borderRadius: 8, padding: 14, background: theme.surface }}>
        {label('次の目標')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>{p.nextGoal}</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 12, color: theme.text }}>
            −{gap.toFixed(1)}
            <span style={{ color: theme.textTer, marginLeft: 4 }}>打</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <div style={{ flex: 1, height: 3, background: theme.border, borderRadius: 1, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, (1 - gap / 10) * 100))}%`,
              background: theme.text,
            }}/>
          </div>
          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textSec, width: 34, textAlign: 'right' }}>
            {Math.min(100, Math.max(0, Math.round((1 - gap / 10) * 100)))}%
          </span>
        </div>
      </div>

      {/* ④ Focus — top N stats with gap */}
      <div style={section(26)}>
        {label('FOCUS · 目標差分')}
        <div style={{ marginTop: 2 }}>
          {focusStatKeys.map((k, i) => (
            <StatRow key={k} k={k} accent={i === 0}/>
          ))}
        </div>
      </div>

      {/* ⑤ Today's drill + tip */}
      <div style={section(18)}>
        {label('今日のドリル')}
        <div style={{
          marginTop: 10, border: `1px solid ${theme.border}`, borderRadius: 8,
          padding: 14, background: theme.surface,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.2 }}>{drill.drill}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.textSec }}>
              {drill.done}/{drill.total}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 2, marginTop: 10 }}>
            {Array.from({ length: drill.total }, (_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 1,
                background: i < drill.done ? theme.text : theme.border,
              }}/>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, fontFamily: FONT.mono, fontSize: 10, color: theme.textSec }}>
            <span>命中 <span style={{ color: theme.text, fontWeight: 500 }}>{drill.accuracy}%</span></span>
            <span>連続 <span style={{ color: theme.text, fontWeight: 500 }}>{drill.streak}日</span></span>
          </div>

          {/* Rotating tip */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
              letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
            }}>{tip.tag} · 今日の一言</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: theme.text, letterSpacing: -0.1 }}>
              「{tip.q}」
            </div>
            <div style={{ fontSize: 11, color: theme.textSec, marginTop: 6 }}>
              — {tip.who}
            </div>
          </div>

          <button onClick={() => go('practice')} style={{
            marginTop: 12, width: '100%', background: 'transparent',
            color: theme.text, border: `1px solid ${theme.borderStrong}`,
            padding: '9px 0', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: FONT.sans,
          }}>このドリルを始める →</button>
        </div>
      </div>

      {/* ⑥ Bridge */}
      <div style={{
        ...section(14),
        padding: '12px 14px', border: `1px solid ${theme.border}`, borderRadius: 8,
        background: theme.surface, display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer',
      }} onClick={() => go('practice')}>
        <div style={{ width: 2, height: 28, background: theme.text }}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>この課題のドリル一覧へ</div>
          <div style={{ fontSize: 11, color: theme.textSec, marginTop: 1 }}>
            {focusKey}を改善する · 条件別に分解
          </div>
        </div>
        <span style={{ fontFamily: FONT.mono, fontSize: 12, color: theme.textSec }}>→</span>
      </div>

      {/* ⑦ Other stats — compact table */}
      <div style={section(26)}>
        {label('その他の指標')}
        <div style={{ marginTop: 8 }}>
          {otherStats.map((st, i) => {
            const meta = window.STAT_META[st.k];
            const cur = s[st.k];
            const tgt = t[st.k];
            const reverse = reverseSet.has(st.k);
            const ok = reverse ? cur <= tgt : cur >= tgt;
            const dispCur = meta.decimals ? cur.toFixed(meta.decimals) : cur;
            const dispTgt = meta.decimals ? tgt.toFixed(meta.decimals) : tgt;
            return (
              <div key={st.k} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto',
                gap: 12, alignItems: 'baseline',
                padding: '10px 0',
                borderBottom: i < otherStats.length - 1 ? `1px solid ${theme.border}` : 'none',
              }}>
                <span style={{ fontSize: 12.5 }}>{meta.label}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 12, color: theme.textSec, minWidth: 84, textAlign: 'right' }}>
                  {dispCur}{meta.unit} / {dispTgt}{meta.unit}
                </span>
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: ok ? theme.good : theme.textTer, width: 14, textAlign: 'right' }}>
                  {ok ? '✓' : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={() => go('analysis')} style={{
        marginTop: 20, width: '100%', background: 'transparent',
        color: theme.textSec, border: `1px solid ${theme.border}`,
        padding: '11px 0', borderRadius: 6, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', fontFamily: FONT.sans,
      }}>すべての分析を見る →</button>

      {/* DEV: temporary entry for animation direction review */}
      <button onClick={() => go('animation-gallery')} style={{
        marginTop: 10, width: '100%', background: 'transparent',
        color: theme.textTer, border: `1px dashed ${theme.borderStrong}`,
        padding: '10px 0', borderRadius: 6, fontSize: 11, fontWeight: 500,
        cursor: 'pointer', fontFamily: FONT.mono, letterSpacing: 0.5,
      }}>DEV · ドリルアニメ方向性を見る →</button>
    </div>
  );
}

window.HomeScreen = HomeScreen;

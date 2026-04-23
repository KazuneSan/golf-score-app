// screens/practice.jsx — Practice mode (Drill / Round Test)

function PracticeScreen({ theme, go }) {
  const [phase, setPhase] = React.useState('hub'); // hub | drill | drillDetail | roundTest | summary
  // default challenge — putt lets us showcase the detailed goal/conditions
  const [challenge, setChallenge] = React.useState('putt');
  const [lastSession, setLastSession] = React.useState(null);
  const [activeDrillId, setActiveDrillId] = React.useState(null);
  // drill completion state keyed by `${challenge}/${drillId}` → { done: bool, ts }
  const [completions, setCompletions] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('gs_drill_done') || '{}'); } catch { return {}; }
  });
  React.useEffect(() => {
    localStorage.setItem('gs_drill_done', JSON.stringify(completions));
  }, [completions]);

  const CHALLENGES = {
    putt:     { label: '3m 以内のパター',   sub: '3パット率を下げる',  from: '分析「つながり」' },
    second:   { label: '140-170Y セカンド', sub: 'パーオン率を上げる', from: '分析' },
    tee:      { label: '右 OB を封じる',    sub: 'OB率を下げる',       from: '分析' },
    approach: { label: '30Y 以内アプローチ', sub: '寄せワン率を上げる', from: '分析' },
  };

  const toggleDrill = (cKey, dId) => {
    const k = `${cKey}/${dId}`;
    setCompletions(c => ({ ...c, [k]: c[k]?.done ? { done: false } : { done: true, ts: Date.now() } }));
  };

  if (phase === 'hub') {
    return (
      <PracticeHub theme={theme} go={go} challenges={CHALLENGES} challenge={challenge} setChallenge={setChallenge}
        completions={completions}
        onDrill={() => setPhase('drill')}
        onRoundTest={() => setPhase('roundTest')}/>
    );
  }
  if (phase === 'drill') {
    return <DrillScreen theme={theme} go={go} challengeKey={challenge} challengeMeta={CHALLENGES[challenge]}
      completions={completions} toggleDrill={toggleDrill}
      onOpenDetail={(dId) => { setActiveDrillId(dId); setPhase('drillDetail'); }}
      onFinish={(session) => { setLastSession(session); setPhase('summary'); }}
      onBack={() => setPhase('hub')}/>;
  }
  if (phase === 'drillDetail') {
    const drill = (window.DRILL_DETAILS || {})[activeDrillId];
    const key = `${challenge}/${activeDrillId}`;
    return <DrillDetailScreen theme={theme} drill={drill}
      isDone={!!completions[key]?.done}
      onToggleDone={() => toggleDrill(challenge, activeDrillId)}
      onBack={() => setPhase('drill')}/>;
  }
  if (phase === 'roundTest') {
    return <RoundTestScreen theme={theme} go={go} challenge={CHALLENGES[challenge]}
      onFinish={(session) => { setLastSession(session); setPhase('summary'); }}
      onBack={() => setPhase('hub')}/>;
  }
  if (phase === 'summary') {
    return <PracticeSummary theme={theme} go={go} session={lastSession}
      onAgain={() => setPhase('hub')}/>;
  }
}

// ─────────────────────────────────────────────────────────────
// Hub — choose Drill or Round Test against a challenge
// ─────────────────────────────────────────────────────────────
function PracticeHub({ theme, go, challenges, challenge, setChallenge, completions, onDrill, onRoundTest }) {
  const c = challenges[challenge];
  const lib = DRILL_LIBRARY[challenge];

  // count drills done across all conditions of the current challenge
  const allDrills = lib ? lib.conditions.flatMap(cond => cond.drills.map(d => d.id)) : [];
  const doneCount = allDrills.filter(id => completions[`${challenge}/${id}`]?.done).length;
  const totalCount = allDrills.length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: theme.text, fontFamily: FONT.sans }}>
      <div style={{ padding: '4px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={()=>go('home')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
          {Icon.close(theme.textSec, 20)}
        </button>
        <div style={{ fontSize: 13, fontWeight: 600 }}>練習モード</div>
        <div style={{ width: 20 }}/>
      </div>

      <div style={{ padding: '8px 16px 14px' }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
          letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
        }}>PRACTICE</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10, letterSpacing: -0.5, lineHeight: 1.3 }}>
          今の課題に<br/>合わせて練習する
        </div>
        <div style={{ fontSize: 12.5, color: theme.textSec, marginTop: 8, lineHeight: 1.55 }}>
          分析から導いた課題を、ドリルで条件ごとに分解し、ラウンドで確かめる。
        </div>
      </div>

      {/* お気に入りドリル — hidden when empty */}
      <FavoritesSection
        theme={theme}
        onOpen={(topId) => { setChallenge(topId); onDrill(); }}
      />

      <div style={{ padding: '0 16px 12px' }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
          letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500, marginBottom: 8,
        }}>取り組む課題</div>
        <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <SourceDot src="calc" theme={theme}/>
            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textSec, letterSpacing: 0.4 }}>{c.from}</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>{c.label}</div>
          <div style={{ fontSize: 12, color: theme.textSec, marginTop: 4 }}>{c.sub}</div>
          {totalCount > 0 && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 3, background: theme.border, borderRadius: 1, overflow: 'hidden' }}>
                <div style={{ width: `${(doneCount/totalCount)*100}%`, height: '100%', background: theme.text, transition: 'width .4s' }}/>
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.textSec }}>
                <span style={{ color: theme.text, fontWeight: 500 }}>{doneCount}</span>/{totalCount}
              </div>
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {Object.entries(challenges).map(([k, x]) => (
              <button key={k} onClick={()=>setChallenge(k)} style={{
                border: `1px solid ${challenge===k ? theme.text : theme.border}`,
                background: challenge===k ? theme.text : 'transparent',
                color: challenge===k ? theme.bg : theme.textSec,
                padding: '5px 10px', borderRadius: 4,
                fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                fontFamily: FONT.sans,
              }}>{x.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ModeCard theme={theme} onClick={onDrill}
          badge="DRILL"
          title="ドリル"
          sub="練習場・自宅 / パターマット"
          desc="課題を条件ごとに分解した反復練習。完了チェックで進捗が見えます。"
          primary/>
        <ModeCard theme={theme} onClick={onRoundTest}
          badge="ROUND TEST"
          title="ラウンドテスト"
          sub="実ラウンド中に試す"
          desc="ドリルでやったことが本番で出せたかを、ホールごとに振り返る。"/>
      </div>

      <div style={{
        padding: '18px 16px 8px', fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
        letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
      }}>最近の練習</div>
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, overflow: 'hidden' }}>
          {[
            { t: 'ドリル',          d: '4/20 夜 · 距離感ドリル',   r: '3 種完了',        tag: 'drill' },
            { t: 'ラウンドテスト',  d: '4/18 · 鳴沢GC',            r: '○4 / △3 / ×2',   tag: 'round' },
            { t: 'ドリル',          d: '4/15 · 方向性ドリル',      r: '2 種完了',        tag: 'drill' },
          ].map((x, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
              borderBottom: i < arr.length - 1 ? `1px solid ${theme.border}` : 'none',
            }}>
              <span style={{
                fontFamily: FONT.mono, fontSize: 9, letterSpacing: 0.5,
                border: `1px solid ${theme.borderStrong}`, padding: '2px 6px', borderRadius: 3,
                color: theme.textSec, fontWeight: 500,
              }}>{x.tag==='drill'?'DRILL':'TEST'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{x.t}</div>
                <div style={{ fontSize: 11, color: theme.textSec, marginTop: 2 }}>{x.d}</div>
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.textSec }}>{x.r}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }}/>
    </div>
  );
}

// Favorites section — shows favorited drills; hidden when list is empty.
function FavoritesSection({ theme, onOpen }) {
  const [favs, setFavs] = React.useState(() => (window.getFavDrills?.() || []));
  if (favs.length === 0) return null;
  const remove = (id) => {
    window.toggleFavDrill?.(id);
    setFavs(window.getFavDrills?.() || []);
  };
  return (
    <div style={{ padding: '0 16px 12px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8,
      }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
          letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
        }}>お気に入り</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textTer }}>{favs.length}件</div>
      </div>
      <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, overflow: 'hidden' }}>
        {favs.map((fav, i) => {
          const topId = fav.kind === 'top' ? fav.id : fav.parentId;
          const title = fav.data.challenge || fav.data.name || fav.data.title || fav.id;
          const sub = fav.data.challengeSub || fav.data.goal?.metric || fav.data.sub || '';
          return (
            <div key={fav.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px',
              borderBottom: i < favs.length - 1 ? `1px solid ${theme.border}` : 'none',
            }}>
              <div onClick={() => onOpen?.(topId)} style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: -0.1 }}>{title}</div>
                {sub && <div style={{ fontSize: 11, color: theme.textSec, marginTop: 2 }}>{sub}</div>}
              </div>
              <button onClick={() => remove(fav.id)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: theme.text, padding: 4, display: 'flex',
              }} title="お気に入りから外す">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 13.5s-5.5-3.2-5.5-7.2c0-2 1.5-3.3 3.2-3.3 1.1 0 2 .6 2.3 1.5.3-.9 1.2-1.5 2.3-1.5 1.7 0 3.2 1.3 3.2 3.3 0 4-5.5 7.2-5.5 7.2z"
                    stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              </button>
              <span onClick={() => onOpen?.(topId)} style={{
                fontFamily: FONT.mono, fontSize: 12, color: theme.textSec, cursor: 'pointer',
              }}>→</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModeCard({ theme, onClick, badge, title, sub, desc, primary }) {
  return (
    <button onClick={onClick} style={{
      background: primary ? theme.text : theme.surface,
      color: primary ? theme.bg : theme.text,
      border: primary ? 'none' : `1px solid ${theme.border}`,
      borderRadius: 8, padding: 14, textAlign: 'left', cursor: 'pointer',
      fontFamily: FONT.sans,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase',
          color: primary ? theme.bg : theme.textSec, opacity: primary ? 0.55 : 1,
          fontWeight: 500,
        }}>{badge}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 14, opacity: 0.5 }}>→</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 10, letterSpacing: -0.3 }}>{title}</div>
      <div style={{ fontSize: 11.5, opacity: 0.65, marginTop: 2 }}>{sub}</div>
      <div style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.55, opacity: primary ? 0.8 : 0.7 }}>{desc}</div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Drill — goal + conditions + drill lists with completion
// ─────────────────────────────────────────────────────────────
function DrillScreen({ theme, go, challengeKey, challengeMeta, completions, toggleDrill, onOpenDetail, onFinish, onBack }) {
  const lib = DRILL_LIBRARY[challengeKey];
  const [noteInput, setNoteInput] = React.useState('');
  const [notes, setNotes] = React.useState([]);
  const [expanded, setExpanded] = React.useState(() => lib?.conditions[0]?.key || null);

  if (!lib) {
    return (
      <div style={{ padding: 40, color: theme.text, fontFamily: FONT.sans }}>
        ドリル未整備の課題です。
        <TapBtn theme={theme} variant="ghost" onClick={onBack} style={{ marginTop: 20 }}>戻る</TapBtn>
      </div>
    );
  }

  const allDrills = lib.conditions.flatMap(c => c.drills.map(d => ({ ...d, condKey: c.key })));
  const doneCount = allDrills.filter(d => completions[`${challengeKey}/${d.id}`]?.done).length;
  const totalCount = allDrills.length;
  const pct = totalCount ? Math.round(doneCount / totalCount * 100) : 0;

  const addNote = () => {
    if (!noteInput.trim()) return;
    setNotes(n => [...n, noteInput.trim()]);
    setNoteInput('');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: theme.text, fontFamily: FONT.sans }}>
      <div style={{ padding: '4px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: theme.textSec, fontSize: 13 }}>
          {Icon.chevL(theme.textSec, 16)} 戻る
        </button>
        <div style={{ fontSize: 13, fontWeight: 600 }}>ドリル</div>
        <div style={{ width: 40 }}/>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }} className="hide-scroll">
        <div style={{ padding: '4px 16px 8px' }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
            letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
          }}>取り組み中</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, letterSpacing: -0.4 }}>{lib.challenge}</div>
          <div style={{ fontSize: 12, color: theme.textSec, marginTop: 2 }}>{lib.challengeSub}</div>
        </div>

        {/* Goal metric — dark hero card */}
        <div style={{ padding: '8px 16px 12px' }}>
          <div style={{ background: theme.text, color: theme.bg, borderRadius: 8, padding: 14 }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase',
              opacity: 0.5, fontWeight: 500,
            }}>{lib.goal.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 36, fontWeight: 400, letterSpacing: -1.2, lineHeight: 1 }}>
                {lib.goal.targetLabel}
              </div>
              <div style={{ fontSize: 12, opacity: 0.65, flex: 1 }}>{lib.goal.metric} を目指す</div>
            </div>
            <div style={{
              marginTop: 10, padding: '10px 12px',
              background: 'rgba(255,255,255,0.08)', borderRadius: 6,
              fontSize: 11.5, lineHeight: 1.55, opacity: 0.85,
            }}>
              {lib.goal.benchmark}
            </div>
          </div>
        </div>

        {/* Progress for this challenge */}
        <div style={{ padding: '2px 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
              letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
            }}>条件別ドリル</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.textSec }}>
              <span style={{ color: theme.text, fontWeight: 500 }}>{doneCount}</span>/{totalCount} · {pct}%
            </div>
          </div>
          <div style={{ height: 3, background: theme.border, borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: theme.text, transition: 'width .4s' }}/>
          </div>
        </div>

        {/* Conditions */}
        <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lib.conditions.map(cond => {
            const condDone = cond.drills.filter(d => completions[`${challengeKey}/${d.id}`]?.done).length;
            const open = expanded === cond.key;
            const allDone = condDone === cond.drills.length && cond.drills.length > 0;
            return (
              <Card key={cond.key} theme={theme} padding={0}>
                <button onClick={()=>setExpanded(open ? null : cond.key)} style={{
                  width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: 14, textAlign: 'left', color: 'inherit', fontFamily: 'inherit',
                  display: 'flex', gap: 12, alignItems: 'center',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 4, flexShrink: 0,
                    background: allDone ? theme.text : theme.surfaceAlt,
                    color: allDone ? theme.bg : theme.textSec,
                    border: allDone ? 'none' : `1px solid ${theme.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FONT.mono, fontSize: 11, fontWeight: 500,
                  }}>
                    {allDone ? Icon.check(theme.bg, 16) : `${condDone}/${cond.drills.length}`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>{cond.title}</div>
                    <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 2 }}>{cond.sub}</div>
                  </div>
                  <span style={{ fontFamily: FONT.mono, color: theme.textTer, fontSize: 14, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
                </button>

                {open && (
                  <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px 14px 14px' }}>
                    <div style={{
                      fontSize: 11.5, color: theme.textSec, lineHeight: 1.55, marginBottom: 12,
                      padding: 10, background: theme.surfaceAlt, borderRadius: 6,
                      borderLeft: `2px solid ${theme.borderStrong}`,
                    }}>
                      <b style={{ color: theme.text, fontWeight: 600 }}>なぜこの条件？</b><br/>{cond.why}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {cond.drills.map(d => {
                        const done = !!completions[`${challengeKey}/${d.id}`]?.done;
                        const hasDetail = !!(window.DRILL_DETAILS || {})[d.id];
                        return (
                          <div key={d.id} style={{
                            background: done ? theme.surfaceAlt : theme.surface,
                            border: `1px solid ${theme.border}`,
                            borderRadius: 6,
                            display: 'flex', alignItems: 'stretch',
                            overflow: 'hidden',
                          }}>
                            <button onClick={()=>toggleDrill(challengeKey, d.id)}
                              aria-label={done ? '完了を取り消す' : '完了にする'}
                              style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                padding: '10px 8px 10px 12px', display: 'flex', alignItems: 'center',
                              }}>
                              <div style={{
                                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                                background: done ? theme.text : 'transparent',
                                border: done ? 'none' : `1.5px solid ${theme.borderStrong}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {done && Icon.check(theme.bg, 12)}
                              </div>
                            </button>
                            <button onClick={()=> hasDetail ? onOpenDetail(d.id) : toggleDrill(challengeKey, d.id)}
                              style={{
                                flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
                                padding: '10px 8px', textAlign: 'left',
                                fontFamily: FONT.sans, color: 'inherit',
                              }}>
                              <div style={{
                                fontSize: 13, fontWeight: 500,
                                textDecoration: done ? 'line-through' : 'none',
                                color: done ? theme.textSec : theme.text,
                              }}>{d.name}</div>
                              <div style={{ fontSize: 11, color: theme.textSec, marginTop: 2 }}>{d.detail}</div>
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px 0 4px', flexShrink: 0 }}>
                              <div style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textSec }}>{d.time}</div>
                              {hasDetail && (
                                <button onClick={()=>onOpenDetail(d.id)} style={{
                                  background: 'transparent', color: theme.textSec,
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: 4, padding: '3px 8px',
                                  fontSize: 10, fontWeight: 500, cursor: 'pointer',
                                  fontFamily: FONT.sans,
                                }}>詳細 ›</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Notes */}
        <div style={{ padding: '10px 16px 20px' }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
            letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <SourceDot src="input" theme={theme}/>
            気づいたこと
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={noteInput} onChange={e=>setNoteInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && addNote()}
              placeholder="例: 30cmオーバーを意識するとラインが見える"
              style={{
                flex: 1, border: `1px solid ${theme.border}`, borderRadius: 6,
                padding: '10px 12px', fontFamily: FONT.sans, fontSize: 13,
                background: theme.surface, color: theme.text, outline: 'none',
              }}/>
            <button onClick={addNote} style={{
              background: theme.text, color: theme.bg, border: 'none',
              borderRadius: 6, padding: '0 14px',
              fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
            }}>追加</button>
          </div>
          {notes.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {notes.map((n, i) => (
                <div key={i} style={{
                  background: theme.surfaceAlt,
                  border: `1px solid ${theme.border}`,
                  borderLeft: `2px solid ${theme.text}`,
                  padding: '10px 12px', borderRadius: 4,
                  fontSize: 13, lineHeight: 1.5, display: 'flex', gap: 8,
                }}>
                  <span style={{ flex: 1 }}>{n}</span>
                  <button onClick={()=>setNotes(ns => ns.filter((_,j)=>j!==i))} style={{
                    background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5,
                  }}>{Icon.close(theme.text, 12)}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '12px 16px 14px', display: 'flex', gap: 10, borderTop: `1px solid ${theme.border}` }}>
        <TapBtn theme={theme} variant="ghost" onClick={onBack} style={{ minWidth: 74 }}>閉じる</TapBtn>
        <TapBtn theme={theme} variant="primary" full disabled={doneCount === 0}
          onClick={()=>onFinish({ type: 'drill', challenge: { label: lib.challenge, sub: lib.challengeSub }, doneCount, totalCount, notes, goal: lib.goal })}>
          セッションを記録（{doneCount}種完了）
        </TapBtn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Round Test — 18 holes, per-hole ○/△/× or skip + note
// ─────────────────────────────────────────────────────────────
function RoundTestScreen({ theme, go, challenge, onFinish, onBack }) {
  const [holeIdx, setHoleIdx] = React.useState(0);
  const [holes, setHoles] = React.useState(() =>
    MOCK_COURSE.holes.map(h => ({ no: h.no, par: h.par, v: null /* good|ok|miss|skip */, note: '' }))
  );
  const h = holes[holeIdx];
  const total = holes.length;
  const answered = holes.filter(x => x.v).length;
  const last = holeIdx === total - 1;

  const set = (patch) => setHoles(hs => hs.map((x,i) => i===holeIdx ? { ...x, ...patch } : x));
  const next = () => last ? null : setHoleIdx(i => i + 1);
  const prev = () => setHoleIdx(i => Math.max(0, i - 1));

  const tally = { good: 0, ok: 0, miss: 0, skip: 0 };
  holes.forEach(x => { if (x.v) tally[x.v]++; });
  const applicable = tally.good + tally.ok + tally.miss;
  const successPct = applicable ? Math.round(((tally.good + tally.ok * 0.5) / applicable) * 100) : 0;

  const finish = () => onFinish({ type: 'roundTest', challenge, holes, tally, applicable, successPct });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: theme.text, fontFamily: FONT.sans }}>
      <div style={{ padding: '4px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: theme.textSec, fontSize: 13 }}>
          {Icon.chevL(theme.textSec, 16)} 戻る
        </button>
        <div style={{ fontSize: 13, fontWeight: 600 }}>ラウンドテスト</div>
        <div style={{ fontSize: 12, color: theme.textSec, fontFamily: FONT.mono }}>{answered}/{total}</div>
      </div>

      {/* Challenge banner */}
      <div style={{ padding: '4px 16px 10px' }}>
        <div style={{
          padding: '10px 12px',
          background: theme.surface, border: `1px solid ${theme.border}`,
          borderLeft: `2px solid ${theme.text}`,
          borderRadius: 6,
        }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
            letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
          }}>今日試すこと</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, marginTop: 3, letterSpacing: -0.2 }}>{challenge.label}</div>
        </div>
      </div>

      {/* Hole dots */}
      <div style={{ display: 'flex', gap: 2, padding: '0 16px 14px' }}>
        {holes.map((x, i) => (
          <button key={i} onClick={()=>setHoleIdx(i)} style={{
            flex: 1, height: 4, borderRadius: 1, border: 'none', padding: 0, cursor: 'pointer',
            background:
              i === holeIdx ? theme.text :
              x.v === 'good' ? theme.good :
              x.v === 'ok'   ? theme.warn :
              x.v === 'miss' ? theme.danger :
              x.v === 'skip' ? theme.border :
              theme.border,
            opacity: x.v === 'skip' ? 0.4 : 1,
          }}/>
        ))}
      </div>

      {/* Hero hole */}
      <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
            letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
          }}>HOLE {h.no} / {total}</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 52, fontWeight: 400, letterSpacing: -2.4, lineHeight: 0.95, marginTop: 6 }}>{h.no}</div>
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 16, fontWeight: 500, color: theme.textSec }}>Par {h.par}</div>
      </div>

      {/* 3 buttons + skip */}
      <div style={{ padding: '14px 16px 4px' }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
          letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
          marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <SourceDot src="input" theme={theme}/>
          「{challenge.label}」できた？
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { v: 'good', label: 'できた',   big: '○', color: theme.good },
            { v: 'ok',   label: 'まあまあ', big: '△', color: theme.warn },
            { v: 'miss', label: 'ミス',     big: '×', color: theme.danger },
          ].map(x => {
            const on = h.v === x.v;
            return (
              <button key={x.v} onClick={()=>set({ v: x.v })} style={{
                background: on ? x.color : theme.surface,
                color: on ? '#fff' : theme.text,
                border: on ? 'none' : `1px solid ${theme.border}`,
                borderRadius: 6, padding: '14px 8px',
                cursor: 'pointer', fontFamily: FONT.sans,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <div style={{
                  fontFamily: FONT.mono,
                  fontSize: 26, fontWeight: 400, lineHeight: 1,
                  color: on ? '#fff' : x.color,
                }}>{x.big}</div>
                <div style={{ fontSize: 11, fontWeight: 500 }}>{x.label}</div>
              </button>
            );
          })}
        </div>
        <button onClick={()=>set({ v: 'skip' })} style={{
          marginTop: 6, width: '100%',
          background: h.v === 'skip' ? theme.surfaceAlt : 'transparent',
          color: theme.textSec,
          border: `1px dashed ${theme.borderStrong}`,
          borderRadius: 6, padding: '9px 12px',
          fontFamily: FONT.sans, fontSize: 12, fontWeight: 500, cursor: 'pointer',
        }}>
          {h.v === 'skip' ? '✓ スキップ（機会なし）' : 'このホールは機会がなかった（スキップ）'}
        </button>
      </div>

      {/* Per-hole note */}
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
          letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <SourceDot src="input" theme={theme}/>
          気づき（任意）
        </div>
        <textarea value={h.note} onChange={e=>set({ note: e.target.value })}
          placeholder="例: アドレスで開いてた / 風を読めた"
          style={{
            width: '100%', minHeight: 48, resize: 'none',
            border: `1px solid ${theme.border}`, borderRadius: 6,
            padding: '10px 12px', fontFamily: FONT.sans, fontSize: 13,
            background: theme.surface, color: theme.text, outline: 'none',
            boxSizing: 'border-box', lineHeight: 1.5,
          }}/>
      </div>

      <div style={{ flex: 1 }}/>

      {/* Footer — prev / next / finish */}
      <div style={{ padding: '12px 16px 14px', display: 'flex', gap: 10, borderTop: `1px solid ${theme.border}` }}>
        <TapBtn theme={theme} variant="ghost" onClick={prev} style={{ minWidth: 56 }} disabled={holeIdx === 0}>{Icon.chevL(theme.text, 16)}</TapBtn>
        {last ? (
          <TapBtn theme={theme} variant="primary" full onClick={finish} disabled={answered === 0}>
            テストを終える（{applicable}本 記録）
          </TapBtn>
        ) : (
          <TapBtn theme={theme} variant="primary" full onClick={next}>
            次のホール  ›  {h.no + 1}
          </TapBtn>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Summary — practice-only eval
// ─────────────────────────────────────────────────────────────
function PracticeSummary({ theme, go, session, onAgain }) {
  if (!session) return null;
  const isDrill = session.type === 'drill';

  // For drills: show progress on drills-completed; for round tests: show recreation %.
  let pct, base, t;
  if (isDrill) {
    base = session.totalCount || 0;
    pct = base === 0 ? 0 : Math.round((session.doneCount / base) * 100);
    t = null;
  } else {
    t = session.tally;
    base = session.applicable || 0;
    pct = base === 0 ? 0 : Math.round(((t.good + t.ok * 0.5) / base) * 100);
  }

  // Verdict
  let verdict, verdictSub;
  if (isDrill) {
    if (pct >= 80) { verdict = '十分こなせた'; verdictSub = '次のラウンドでこの感覚を試しましょう。'; }
    else if (pct >= 40) { verdict = '着実に前進中'; verdictSub = '残りのドリルも次回セッションで。'; }
    else { verdict = 'まだ序盤'; verdictSub = 'まずは各条件1つずつ触れてみましょう。'; }
  } else {
    if (pct >= 75) { verdict = '課題クリアに近い'; verdictSub = 'この感覚を継続できればスコアに直結します。'; }
    else if (pct >= 50) { verdict = '手応えあり'; verdictSub = 'あと一歩。気づきを定着させましょう。'; }
    else { verdict = 'まだ苦しい'; verdictSub = '動きを1点だけ変えて、もう1セット試しましょう。'; }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: theme.text, fontFamily: FONT.sans, padding: '4px 0 0' }}>
      <div style={{ padding: '4px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 20 }}/>
        <div style={{ fontSize: 13, fontWeight: 600 }}>練習サマリー</div>
        <button onClick={()=>go('home')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
          {Icon.close(theme.textSec, 20)}
        </button>
      </div>

      <div style={{ padding: '0 16px', flex: 1, overflow: 'auto' }}>
        {/* Hero score */}
        <div style={{
          background: theme.text, color: theme.bg, borderRadius: 8, padding: 16, marginTop: 8,
        }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, opacity: 0.55,
            letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
          }}>
            {isDrill ? 'ドリル' : 'ラウンドテスト'} · {session.challenge.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 14 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 64, fontWeight: 400, letterSpacing: -2.4, lineHeight: 0.9 }}>
              {isDrill ? session.doneCount : pct}<span style={{ fontSize: 20, opacity: 0.55 }}>{isDrill ? `/${base}` : '%'}</span>
            </div>
            <div>
              <div style={{
                fontFamily: FONT.mono, fontSize: 10, opacity: 0.55,
                letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
              }}>{isDrill ? 'ドリル完了' : '再現率'}</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                {isDrill
                  ? `${base}種中 ${session.doneCount}種にチェック`
                  : `${base}本中 ○${t.good} △${t.ok} ×${t.miss}${t.skip ? ` · SKIP ${t.skip}` : ''}`}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.07)', borderRadius: 6 }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 10, opacity: 0.55,
              letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
            }}>判定</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{verdict}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 3, lineHeight: 1.5 }}>{verdictSub}</div>
          </div>
        </div>

        {/* Distribution bar — round test only */}
        {!isDrill && (
        <div style={{ marginTop: 18 }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
            letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500, marginBottom: 8,
          }}>内訳</div>
          <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, padding: 14 }}>
            <div style={{ display: 'flex', height: 6, borderRadius: 1, overflow: 'hidden', background: theme.border }}>
              {base > 0 && <>
                <div style={{ width: `${t.good/base*100}%`, background: theme.good }}/>
                <div style={{ width: `${t.ok/base*100}%`,   background: theme.warn }}/>
                <div style={{ width: `${t.miss/base*100}%`, background: theme.danger }}/>
              </>}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontFamily: FONT.mono, fontSize: 11.5 }}>
              <span style={{ color: theme.good }}>○ {t.good}</span>
              <span style={{ color: theme.warn }}>△ {t.ok}</span>
              <span style={{ color: theme.danger }}>× {t.miss}</span>
              <span style={{ color: theme.textSec, marginLeft: 'auto' }}>SKIP {t.skip || 0}</span>
            </div>
          </div>
        </div>
        )}

        {/* Drill goal reminder */}
        {isDrill && session.goal && (
          <div style={{ marginTop: 18 }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
              letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500, marginBottom: 8,
            }}>目指す指標</div>
            <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 24, fontWeight: 400, color: theme.text, letterSpacing: -0.8 }}>
                  {session.goal.targetLabel}
                </div>
                <div style={{ fontSize: 12, color: theme.textSec }}>{session.goal.metric}</div>
              </div>
              <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 8, lineHeight: 1.5 }}>{session.goal.benchmark}</div>
            </div>
          </div>
        )}

        {/* Notes */}
        {isDrill && session.notes.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
              letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
              marginBottom: 8, display: 'flex', gap: 6,
            }}>
              <SourceDot src="input" theme={theme}/>
              気づいたこと
            </div>
            <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, overflow: 'hidden' }}>
              {session.notes.map((n, i, arr) => (
                <div key={i} style={{
                  padding: '11px 14px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${theme.border}` : 'none',
                  fontSize: 12.5, lineHeight: 1.55,
                }}>{n}</div>
              ))}
            </div>
          </div>
        )}

        {!isDrill && session.holes && (
          <div style={{ marginTop: 18 }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
              letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500, marginBottom: 8,
            }}>ホール別気づき</div>
            <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, overflow: 'hidden' }}>
              {session.holes.filter(x => x.note).length === 0 && (
                <div style={{ padding: 14, fontSize: 12, color: theme.textSec }}>メモなし</div>
              )}
              {session.holes.filter(x => x.note).map((x, i, arr) => (
                <div key={i} style={{ padding: '11px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${theme.border}` : 'none', display: 'flex', gap: 12 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 4, flexShrink: 0,
                    background: theme.surfaceAlt,
                    border: `1px solid ${theme.border}`,
                    color:
                      x.v === 'good' ? theme.good :
                      x.v === 'ok'   ? theme.warn :
                      x.v === 'miss' ? theme.danger : theme.textSec,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FONT.mono, fontSize: 11, fontWeight: 500,
                  }}>{x.no}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.55, flex: 1 }}>{x.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next step hint */}
        <div style={{ marginTop: 18, marginBottom: 14 }}>
          <div style={{
            padding: 14, border: `1px solid ${theme.borderStrong}`, borderRadius: 8,
            background: theme.surface,
          }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
              letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
            }}>次のステップ</div>
            <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 6, lineHeight: 1.55, letterSpacing: -0.1 }}>
              {isDrill
                ? '気づきを1つに絞って、次のラウンドで「ラウンドテスト」で確かめる。'
                : pct >= 60
                  ? '手応えあり。課題を1段上げて、次の弱点に進む。'
                  : 'もう一度ドリルに戻って、気づきを動きに落とす。'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px 14px', display: 'flex', gap: 10, borderTop: `1px solid ${theme.border}` }}>
        <TapBtn theme={theme} variant="ghost" onClick={onAgain} style={{ minWidth: 90 }}>もう1セット</TapBtn>
        <TapBtn theme={theme} variant="primary" full onClick={()=>go('analysis')}>分析に反映</TapBtn>
      </div>
    </div>
  );
}

window.PracticeScreen = PracticeScreen;

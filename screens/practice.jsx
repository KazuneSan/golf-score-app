// screens/practice.jsx — Practice mode (Drill / Round Test)

function PracticeScreen({ theme, go }) {
  const [phase, setPhase] = React.useState('hub'); // hub | drill | drillDetail | roundTest | summary
  // default challenge — putt lets us showcase the detailed goal/conditions
  const [challenge, setChallenge] = React.useState('putt');
  const [lastSession, setLastSession] = React.useState(null);
  const [activeDrillId, setActiveDrillId] = React.useState(null);

  // Deep-link: if round-complete (or elsewhere) set __selectedDrillTop, jump
  // straight into the drill phase for that challenge on mount.
  React.useEffect(() => {
    const sel = window.__selectedDrillTop;
    const openTest = window.__autoOpenTest;
    if (sel) {
      setChallenge(sel);
      setPhase(openTest ? 'drillTest' : 'drill');
      window.__selectedDrillTop = null;
      window.__autoOpenTest = false;
    }
  }, []);
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
      onOpenTest={() => setPhase('drillTest')}
      onStartSession={(dId) => { setActiveDrillId(dId); setPhase('drillSession'); }}
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
  if (phase === 'drillTest') {
    return <DrillTestScreen theme={theme}
      challengeKey={challenge}
      mode="test"
      onBack={() => setPhase('drill')}
      onDone={() => setPhase('drill')}/>;
  }
  if (phase === 'drillSession') {
    // Playing a specific drill — same UI as test, with drill-specific config.
    // Completion for the Fairway is derived from session history (see FairwayRoadmap),
    // so we don't need to toggle the legacy 'gs_drill_done' flag here.
    return <DrillTestScreen theme={theme}
      challengeKey={challenge}
      drillId={activeDrillId}
      mode="drill"
      onBack={() => setPhase('drill')}
      onDone={() => setPhase('drill')}/>;
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
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: theme.text, fontFamily: FONT.sans }}>
      {/* Header */}
      <div style={{ padding: '4px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={()=>go('home')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
          {Icon.close(theme.textSec, 20)}
        </button>
        <div style={{ fontSize: 13, fontWeight: 600 }}>練習モード</div>
        <div style={{ width: 20 }}/>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }} className="hide-scroll">
        {/* Small header — no verbose intro */}
        <div style={{ padding: '10px 16px 8px' }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
            letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
          }}>Practice</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, letterSpacing: -0.3 }}>
            練習モード
          </div>
        </div>

        {/* お気に入り — 先に表示（熟練ユーザーの最短動線）*/}
        <FavoritesSection theme={theme}
          onOpen={(topId) => { setChallenge(topId); onDrill(); }}/>

        {/* ━━━ SECTION 1: DRILL ━━━ */}
        <ModeSection
          theme={theme}
          tag="DRILL"
          title="課題を潰す"
          sub="弱点の要素を、ひとつずつ反復で磨き上げる"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
            </svg>
          }
        >
          <div style={{
            padding: '0 16px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {Object.entries(challenges).map(([k, c]) => (
              <ChallengePickRow
                key={k}
                theme={theme}
                challengeKey={k}
                meta={c}
                selected={challenge === k}
                completions={completions}
                onPick={() => { setChallenge(k); onDrill(); }}
              />
            ))}
          </div>
        </ModeSection>

        {/* ━━━ SECTION 2: ROUND TEST ━━━ */}
        <ModeSection
          theme={theme}
          tag="ROUND TEST"
          title="ラウンドで検証"
          sub="ドリルの成果が本番で出せたか、○△× で記録"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 3 L 6 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M6 3 L 18 6 L 6 9 Z" fill="currentColor"/>
              <ellipse cx="10" cy="21" rx="7" ry="1.2" fill="currentColor" opacity="0.25"/>
            </svg>
          }
        >
          <div style={{ padding: '0 16px 14px' }}>
            <button onClick={() => { window.__roundMode = 'practice'; go('course-select'); }} style={{
              width: '100%', background: theme.surface, color: theme.text,
              border: `1px solid ${theme.borderStrong}`, borderRadius: 8,
              padding: '14px 14px', cursor: 'pointer', fontFamily: FONT.sans,
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>
                  練習ラウンドを始める
                </div>
                <div style={{ fontSize: 11, color: theme.textSec, marginTop: 3, lineHeight: 1.5 }}>
                  コース選択 → 確認課題を設定 → ○△× 記録
                </div>
              </div>
              <span style={{ fontFamily: FONT.mono, fontSize: 14, color: theme.textSec }}>→</span>
            </button>

            <div style={{
              marginTop: 10, fontSize: 10.5, color: theme.textTer,
              lineHeight: 1.6, fontFamily: FONT.mono, letterSpacing: 0.3,
            }}>
              平均スコアには反映されず、練習ログとしていつでも見返せます
            </div>
          </div>
        </ModeSection>

        {/* 練習ラウンド履歴 */}
        <PracticeRoundHistory theme={theme} go={go}/>

        <div style={{ height: 20 }}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ModeSection — big visual section header with icon + tag + title + sub,
// then child content below. Visually anchors each mode of the hub.
// ─────────────────────────────────────────────────────────
function ModeSection({ theme, icon, tag, title, sub, children }) {
  return (
    <div style={{ marginTop: 18, borderTop: `1px solid ${theme.border}`, paddingTop: 14 }}>
      <div style={{
        padding: '0 16px 12px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: theme.text, color: theme.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
            letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600,
          }}>{tag}</div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, marginTop: 2 }}>
            {title}
          </div>
          <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 3, lineHeight: 1.55 }}>
            {sub}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ChallengePickRow — one challenge with progress + stars, tap → drill page
// ─────────────────────────────────────────────────────────
function ChallengePickRow({ theme, challengeKey, meta, selected, completions, onPick }) {
  const lib = DRILL_LIBRARY[challengeKey];
  if (!lib) return null;
  const flat = lib.conditions.flatMap(cond => cond.drills);
  const total = flat.length;
  const done = flat.filter(d => isDrillDone(challengeKey, d.id, completions)).length;
  const stars = flat.reduce((sum, d) => {
    const best = getBestDrillSession(challengeKey, d.id);
    return sum + (best?.stars || 0);
  }, 0);
  const maxStars = total * 3;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <button onClick={onPick} style={{
      background: theme.surface, color: theme.text,
      border: `1px solid ${selected ? theme.text : theme.border}`,
      borderRadius: 8, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      cursor: 'pointer', fontFamily: FONT.sans, textAlign: 'left',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>{meta.label}</span>
          {selected && (
            <span style={{
              fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 0.6,
              color: theme.textTer, fontWeight: 600,
            }}>CURRENT</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: theme.textSec, marginTop: 3 }}>{meta.sub}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <div style={{
            flex: 1, height: 2.5, background: theme.border, borderRadius: 1, overflow: 'hidden',
          }}>
            <div style={{
              width: `${pct}%`, height: '100%', background: theme.text, transition: 'width .4s',
            }}/>
          </div>
          <span style={{
            fontFamily: FONT.mono, fontSize: 10, color: theme.textSec, letterSpacing: 0.2,
          }}>
            <span style={{ color: theme.text, fontWeight: 500 }}>{done}</span>/{total}
          </span>
        </div>
        {stars > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, marginTop: 6,
            fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24">
              <path d="M12 2 L14.5 9 L22 9 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2 9 L9.5 9 Z"
                fill="#E5A83A"/>
            </svg>
            <span>{stars} / {maxStars}</span>
          </div>
        )}
      </div>
      <span style={{ fontFamily: FONT.mono, fontSize: 14, color: theme.textSec, flexShrink: 0 }}>→</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Session helpers — read gs_drill_sessions for best result per drill.
// CLEAR_STARS = 3 means only ★★★ sessions count as "cleared".
// ─────────────────────────────────────────────────────────────
const CLEAR_STARS = 3;
function _allDrillSessions() {
  try { return JSON.parse(localStorage.getItem('gs_drill_sessions') || '[]'); }
  catch { return []; }
}
function getBestDrillSession(challengeKey, drillId) {
  const all = _allDrillSessions();
  const forThis = all.filter(r => r.challengeKey === challengeKey && r.drillId === drillId);
  if (!forThis.length) return null;
  return forThis.reduce((b, r) =>
    (r.stars > (b?.stars || 0) || (r.stars === (b?.stars || 0) && r.pct > (b?.pct || 0)) ? r : b),
    null);
}
function isDrillDone(challengeKey, drillId, completions) {
  const legacy = !!completions?.[`${challengeKey}/${drillId}`]?.done;
  if (legacy) return true;
  const best = getBestDrillSession(challengeKey, drillId);
  return !!(best && best.stars >= CLEAR_STARS);
}

// ─────────────────────────────────────────────────────────────
// Chapter-based drill roadmap — Duolingo-inspired, Linear v2 minimal.
// ─────────────────────────────────────────────────────────────
// Gamification tokens — star gold accent only, rest is Linear v2 monochrome
const STAR_COLOR = '#D49622';
const STAR_SOFT  = '#E5A83A';

function FairwayRoadmap({ theme, lib, challengeKey, completions, toggleDrill, onOpenDetail, onOpenTest, onStartSession }) {
  const flat = lib.conditions.flatMap(cond => cond.drills);
  const doneCount = flat.filter(d => isDrillDone(challengeKey, d.id, completions)).length;
  const totalCount = flat.length;
  const totalStars = flat.reduce((sum, d) => sum + (getBestDrillSession(challengeKey, d.id)?.stars || 0), 0);
  const maxStars = totalCount * 3;
  const allDone = doneCount === totalCount && totalCount > 0;

  // One-time keyframes for pulse/shine
  const gameKeyframes = `
    @keyframes fwPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); } 50% { box-shadow: 0 0 0 8px rgba(255,255,255,0); } }
  `;

  return (
    <div>
      <style>{gameKeyframes}</style>

      {/* Crown hero — XP-style total star count */}
      <div style={{
        padding: '14px 16px',
        background: theme.text, color: theme.bg,
        borderRadius: 10, marginBottom: 16,
      }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
            fontWeight: 600, opacity: 0.55,
          }}>Total Crowns</div>
          <div style={{
            fontFamily: FONT.mono, fontSize: 11, fontWeight: 500, opacity: 0.75, letterSpacing: 0.3,
          }}>{doneCount}/{totalCount} cleared</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M12 2 L14.5 9 L22 9 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2 9 L9.5 9 Z"
              fill={STAR_SOFT} stroke={STAR_COLOR} strokeWidth="0.8"/>
          </svg>
          <span style={{
            fontFamily: FONT.mono, fontSize: 32, fontWeight: 400, letterSpacing: -1, lineHeight: 1,
          }}>{totalStars}</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 14, opacity: 0.55 }}>/ {maxStars}</span>
        </div>
        <div style={{
          marginTop: 10, height: 3, background: 'rgba(255,255,255,0.15)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            width: maxStars ? `${(totalStars / maxStars) * 100}%` : '0%',
            height: '100%',
            background: allDone ? '#5FC48B' : 'rgba(255,255,255,0.95)',
            transition: 'width .4s',
          }}/>
        </div>
      </div>

      {/* Chapters */}
      {lib.conditions.map((cond, idx) => (
        <Chapter
          key={cond.key}
          theme={theme}
          num={idx + 1}
          cond={cond}
          challengeKey={challengeKey}
          completions={completions}
          onStartSession={onStartSession}
          onOpenDetail={onOpenDetail}
        />
      ))}

      {/* Clubhouse Challenge at the end */}
      <ClubhouseChallenge
        theme={theme}
        lib={lib}
        allDone={allDone}
        onOpenTest={onOpenTest}
      />
    </div>
  );
}

// ─── Chapter (a condition / element — e.g., 方向性) ───
function Chapter({ theme, num, cond, challengeKey, completions, onStartSession, onOpenDetail }) {
  const total = cond.drills.length;
  const clearedCount = cond.drills.filter(d => isDrillDone(challengeKey, d.id, completions)).length;
  const chapterStars = cond.drills.reduce((s, d) => s + (getBestDrillSession(challengeKey, d.id)?.stars || 0), 0);
  const maxStars = total * 3;
  const cleared = clearedCount === total && total > 0;

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Chapter header strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 2px 8px',
      }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
          letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 700,
        }}>Chapter {num}</div>
        <div style={{ flex: 1, height: 1, background: theme.border }}/>
        {/* Per-drill progress dots */}
        <div style={{ display: 'flex', gap: 3 }}>
          {cond.drills.map((d, i) => {
            const done = isDrillDone(challengeKey, d.id, completions);
            return (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: done ? theme.good : theme.border,
              }}/>
            );
          })}
        </div>
        <div style={{
          fontFamily: FONT.mono, fontSize: 10, color: theme.textSec, letterSpacing: 0.3,
        }}>
          ★ <span style={{ color: theme.text, fontWeight: 700 }}>{chapterStars}</span>/{maxStars}
        </div>
      </div>

      {/* Title row */}
      <div style={{
        padding: '0 2px 4px',
        display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
          {cond.title}
        </div>
        {cleared && (
          <span style={{
            fontFamily: FONT.mono, fontSize: 9, fontWeight: 700,
            color: theme.good, letterSpacing: 0.6, textTransform: 'uppercase',
            padding: '2px 6px', background: theme.good + '22', borderRadius: 3,
          }}>✓ Cleared</span>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 1, marginBottom: 8, padding: '0 2px', lineHeight: 1.55 }}>
        {cond.sub}
      </div>

      {/* Why note — tight */}
      <div style={{
        padding: '8px 10px', marginBottom: 8,
        background: theme.surfaceAlt, borderRadius: 6,
        borderLeft: `2px solid ${theme.borderStrong}`,
        fontSize: 11, color: theme.textSec, lineHeight: 1.55,
      }}>
        {cond.why}
      </div>

      {/* Drill rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {cond.drills.map((d, i) => (
          <DrillRow
            key={d.id}
            theme={theme}
            idx={i + 1}
            drill={d}
            done={isDrillDone(challengeKey, d.id, completions)}
            bestSession={getBestDrillSession(challengeKey, d.id)}
            hasDetail={!!(window.DRILL_DETAILS || {})[d.id]}
            onStart={() => onStartSession(d.id)}
            onOpenDetail={() => onOpenDetail(d.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── DrillRow — single drill with node + stars + CTA ───
function DrillRow({ theme, idx, drill, done, bestSession, hasDetail, onStart, onOpenDetail }) {
  const stars = bestSession?.stars || 0;
  const inProgress = stars > 0 && !done;
  return (
    <div
      onClick={onStart}
      style={{
        display: 'flex', alignItems: 'stretch',
        background: theme.surface,
        border: `1px solid ${done ? theme.good + '55' : inProgress ? theme.borderStrong : theme.border}`,
        borderRadius: 8, padding: '10px 10px 10px 12px',
        gap: 12, cursor: 'pointer',
      }}
    >
      {/* Left node: number or check */}
      <div style={{
        width: 30, height: 30, flexShrink: 0, borderRadius: '50%',
        background: done ? theme.good : theme.surfaceAlt,
        border: done ? 'none' : `1.5px solid ${theme.borderStrong}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        alignSelf: 'center',
      }}>
        {done ? (
          <svg width="14" height="14" viewBox="0 0 12 12">
            <path d="M2 6 L 5 9 L 10 3" stroke="#fff" strokeWidth="2.2" fill="none"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <span style={{
            fontFamily: FONT.mono, fontSize: 12, fontWeight: 700, color: theme.text,
          }}>{idx}</span>
        )}
      </div>

      {/* Middle content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.1 }}>{drill.name}</span>
          {/* Always show 3 stars (shows the goal) */}
          <div style={{ display: 'flex', gap: 1 }}>
            {[1, 2, 3].map(n => (
              <svg key={n} width="11" height="11" viewBox="0 0 24 24">
                <path d="M12 2 L14.5 9 L22 9 L16 13 L18.5 20 L12 16 L5.5 20 L8 13 L2 9 L9.5 9 Z"
                  fill={stars >= n ? STAR_SOFT : 'transparent'}
                  stroke={stars >= n ? STAR_COLOR : theme.border}
                  strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            ))}
          </div>
        </div>
        <div style={{
          fontSize: 10.5, color: theme.textSec, marginTop: 3,
          fontFamily: FONT.mono, letterSpacing: 0.3,
        }}>
          {drill.time} · {drill.detail}
        </div>
      </div>

      {/* Right CTAs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {hasDetail && (
          <button onClick={(e) => { e.stopPropagation(); onOpenDetail(); }} style={{
            background: 'transparent', color: theme.textSec,
            border: `1px solid ${theme.border}`, borderRadius: 4,
            padding: '3px 7px', fontSize: 10, fontWeight: 500, cursor: 'pointer',
            fontFamily: FONT.sans,
          }}>解説</button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onStart(); }} style={{
          background: done ? 'transparent' : theme.text,
          color: done ? theme.text : theme.bg,
          border: done ? `1px solid ${theme.borderStrong}` : 'none',
          borderRadius: 14, padding: '5px 11px',
          fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
          fontFamily: FONT.mono, letterSpacing: 0.5,
        }}>
          {done ? 'もう一度' : inProgress ? '★ 更新' : 'プレイ'}
        </button>
      </div>
    </div>
  );
}


function ClubhouseChallenge({ theme, lib, allDone, onOpenTest }) {
  const C = { GRASS_D: '#4E8E67', INK_LIGHT: '#FFFFFF' };
  // Best record (if any)
  const best = (() => {
    try {
      const all = JSON.parse(localStorage.getItem('gs_test_results') || '[]');
      const forThis = all.filter(r => r.challengeKey === (lib._key || null));
      if (!forThis.length) return null;
      return forThis.reduce((b, r) => (r.pct > (b?.pct || 0) ? r : b), null);
    } catch { return null; }
  })();

  return (
    <button onClick={onOpenTest} style={{
      width: '100%', border: 'none', cursor: 'pointer',
      padding: '18px 16px 18px',
      background: `linear-gradient(135deg, ${C.GRASS_D}, #2F6A47)`,
      color: C.INK_LIGHT, textAlign: 'left',
      fontFamily: FONT.sans,
      display: 'flex', alignItems: 'center', gap: 14,
      position: 'relative',
    }}>
      {/* Trophy icon */}
      <div style={{
        width: 48, height: 48, flexShrink: 0, borderRadius: 24,
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, lineHeight: 1,
        animation: allDone ? 'fwPulse 2.2s ease-out infinite' : 'none',
      }}>🏆</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.2,
          textTransform: 'uppercase', opacity: 0.75, fontWeight: 600,
        }}>Clubhouse Challenge</div>
        <div style={{
          fontSize: 16, fontWeight: 700, marginTop: 4, letterSpacing: -0.2,
        }}>
          {lib.goal.metric}テスト
        </div>
        <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 3 }}>
          目標 {lib.goal.targetLabel}
          {best && <span style={{ marginLeft: 8, opacity: 0.7 }}>· ベスト {best.pct}%</span>}
        </div>
      </div>

      <span style={{
        fontFamily: FONT.mono, fontSize: 18, fontWeight: 500, opacity: 0.85,
      }}>→</span>
    </button>
  );
}

// Practice round history — lists past practice rounds with per-challenge ○△× summary.
function PracticeRoundHistory({ theme, go }) {
  const rounds = (() => {
    try { return JSON.parse(localStorage.getItem('gs_practice_rounds') || '[]').slice(0, 8); }
    catch { return []; }
  })();
  if (rounds.length === 0) return null;

  const reopen = (round) => {
    // Restore state so the Round Complete screen can replay it
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
      mode: 'practice',
      practiceChallenges: round.practiceChallenges || [],
      status: 'finalized',
    };
    go('round-complete');
  };

  return (
    <div style={{ padding: '14px 16px 8px' }}>
      <div style={{
        fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
        letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500, marginBottom: 8,
      }}>練習ラウンド履歴</div>
      <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, overflow: 'hidden' }}>
        {rounds.map((r, i) => {
          const date = new Date(r.endedAt || r.startedAt).toLocaleDateString('ja-JP', {
            month: 'numeric', day: 'numeric',
          });
          // Aggregate ○△× across all challenges
          const counts = { '○': 0, '△': 0, '×': 0 };
          (r.holes || []).forEach(h => {
            Object.values(h.challengeResults || {}).forEach(v => {
              if (counts[v] != null) counts[v]++;
            });
          });
          const challengeLabels = (r.practiceChallenges || [])
            .map(k => window.DRILL_LIBRARY?.[k]?.challenge || k);
          return (
            <div key={i}
              onClick={() => reopen(r)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                borderBottom: i < rounds.length - 1 ? `1px solid ${theme.border}` : 'none',
                cursor: 'pointer',
              }}>
              <span style={{
                fontFamily: FONT.mono, fontSize: 9, letterSpacing: 0.5,
                border: `1px solid ${theme.borderStrong}`, padding: '2px 6px', borderRadius: 3,
                color: theme.textSec, fontWeight: 600,
              }}>PRACTICE</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: -0.1,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.course?.name || 'コース'}
                </div>
                <div style={{ fontSize: 10.5, color: theme.textSec, marginTop: 2,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {date} · {challengeLabels.slice(0, 2).join(' / ')}
                  {challengeLabels.length > 2 && ` +${challengeLabels.length - 2}`}
                </div>
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textSec, flexShrink: 0, display: 'flex', gap: 6 }}>
                <span style={{ color: theme.good }}>○{counts['○']}</span>
                <span>△{counts['△']}</span>
                <span style={{ color: theme.warn }}>×{counts['×']}</span>
              </div>
            </div>
          );
        })}
      </div>
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
function DrillScreen({ theme, go, challengeKey, challengeMeta, completions, toggleDrill, onOpenDetail, onOpenTest, onStartSession, onFinish, onBack }) {
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

        {/* Fairway roadmap — each condition = one hole */}
        <div style={{ padding: '0 16px 12px' }}>
          <FairwayRoadmap
            theme={theme}
            lib={lib}
            challengeKey={challengeKey}
            completions={completions}
            toggleDrill={toggleDrill}
            onOpenDetail={onOpenDetail}
            onOpenTest={onOpenTest}
            onStartSession={onStartSession}
          />
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

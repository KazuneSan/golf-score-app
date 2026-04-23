// screens/drill-layout-gallery.jsx — drill-page layout showcase for F / H options.
// Uses real DRILL_LIBRARY.putt data. Demo completion state:
//   first 2 drills in condition 0 → done, 3rd → current, rest → upcoming.

function DrillLayoutGalleryScreen({ theme, go }) {
  const lib = (window.DRILL_LIBRARY || {}).putt;
  if (!lib) {
    return (
      <div style={{ padding: 40, color: theme.text, fontFamily: FONT.sans }}>
        ドリルデータが読み込めませんでした。
      </div>
    );
  }

  // Flat list with demo state
  const flat = lib.conditions.flatMap((cond, ci) =>
    cond.drills.map((d, di) => ({ ...d, condKey: cond.key, condTitle: cond.title, condIdx: ci, drillIdx: di }))
  );
  const firstUndoneIdx = 2; // matches demo: 0,1 done → idx 2 is current
  const getState = (globalIdx) =>
    globalIdx < firstUndoneIdx ? 'done'
    : globalIdx === firstUndoneIdx ? 'current'
    : 'upcoming';

  const label = (txt, style = {}) => (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
      letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500, ...style,
    }}>{txt}</div>
  );

  return (
    <div style={{ padding: '0 16px 40px', color: theme.text, fontFamily: FONT.sans, letterSpacing: -0.1 }}>
      {/* Header */}
      <div style={{ paddingTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => go('home')} style={{
          background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: theme.text,
        }}>{Icon.chevL(theme.text, 16)}</button>
        <div>
          {label('Drill · Layout Gallery')}
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>ドリルページ レイアウト比較</div>
        </div>
      </div>

      {/* Blurb */}
      <div style={{
        marginTop: 14, padding: '10px 12px',
        background: theme.surfaceAlt, borderRadius: 6,
        fontSize: 11.5, color: theme.textSec, lineHeight: 1.6,
      }}>
        同じデータ（3mパター · 9ドリル）を 2 通りのレイアウトで描画。デモ状態: 冒頭2ドリル完了、3つめを進行中。
      </div>

      {/* Option F: Fairway */}
      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>
          案 F · Fairway ロードマップ
        </div>
        <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 4, lineHeight: 1.55 }}>
          要素 = ホール、ドリル = フェアウェイ上の距離マーカー。ティー → グリーンの流れでゴルフらしい。
        </div>
        <div style={{ marginTop: 12 }}>
          <FairwayLayout lib={lib} flat={flat} getState={getState} theme={theme}/>
        </div>
      </div>

      {/* Option H: Subway */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>
          案 H · 地下鉄マップ
        </div>
        <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 4, lineHeight: 1.55 }}>
          縦1本のラインに駅＝ドリル、乗換駅＝要素境界。Linear v2 のミニマル路線と調和。
        </div>
        <div style={{ marginTop: 12 }}>
          <SubwayLayout lib={lib} flat={flat} getState={getState} theme={theme}/>
        </div>
      </div>

      <div style={{
        marginTop: 22, padding: '12px 14px',
        fontSize: 11.5, color: theme.textTer,
        background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 6,
        lineHeight: 1.65,
      }}>
        気に入った方（または組み合わせ）を教えてください。DrillScreen に本実装します。
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Option F — Fairway Roadmap
// ─────────────────────────────────────────────────────────
function FairwayLayout({ lib, flat, getState, theme }) {
  const doneCount = flat.filter((d, i) => getState(i) === 'done').length;
  const totalCount = flat.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  // Fairway palette (stays consistent across themes)
  const GRASS = '#7FBF94';
  const GRASS_D = '#4E8E67';
  const GRASS_SOFT = 'rgba(127,191,148,0.12)';
  const INK_LIGHT = '#FFFFFF';

  return (
    <div style={{
      border: `1px solid ${theme.border}`, borderRadius: 10, overflow: 'hidden',
      background: theme.surface,
    }}>
      {/* Challenge header (course card) */}
      <div style={{
        padding: '14px 16px',
        background: `linear-gradient(135deg, ${GRASS_D}, ${GRASS})`,
        color: INK_LIGHT,
      }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.2,
          textTransform: 'uppercase', opacity: 0.75, fontWeight: 500,
        }}>Course · 3H Par 9</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, letterSpacing: -0.2 }}>
          {lib.challenge}
        </div>
        <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 2 }}>
          Goal: {lib.goal.metric} {lib.goal.targetLabel}
        </div>
        {/* Course progress */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1, height: 4, background: 'rgba(255,255,255,0.3)',
            borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: 'rgba(255,255,255,0.95)',
              transition: 'width .4s',
            }}/>
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.3 }}>
            {doneCount}/{totalCount}
          </div>
        </div>
      </div>

      {/* Holes */}
      <div style={{ background: GRASS_SOFT }}>
        {lib.conditions.map((cond, hIdx) => {
          const firstGlobalIdx = flat.findIndex(d => d.condKey === cond.key);
          const condDrills = cond.drills.map((d, di) => ({
            ...d,
            globalIdx: firstGlobalIdx + di,
            state: getState(firstGlobalIdx + di),
          }));
          const condDone = condDrills.filter(d => d.state === 'done').length;
          const condAllDone = condDone === condDrills.length;
          return (
            <FairwayHole
              key={cond.key}
              hole={hIdx + 1}
              cond={cond}
              drills={condDrills}
              done={condDone}
              allDone={condAllDone}
              isLast={hIdx === lib.conditions.length - 1}
              theme={theme}
            />
          );
        })}

        {/* Final trophy */}
        <div style={{
          padding: '14px 16px',
          background: `linear-gradient(135deg, ${GRASS_D}, #3A6A4C)`,
          color: INK_LIGHT,
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.2,
            textTransform: 'uppercase', opacity: 0.7, fontWeight: 500,
          }}>Clubhouse</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
            🏆 {lib.goal.metric} {lib.goal.targetLabel} 達成
          </div>
        </div>
      </div>
    </div>
  );
}

function FairwayHole({ hole, cond, drills, done, allDone, isLast, theme }) {
  const GRASS = '#7FBF94';
  const GRASS_D = '#4E8E67';
  const FAIRWAY_BG = '#D4EADC';
  const FAIRWAY_EDGE = '#A5CDB3';
  return (
    <div style={{ borderBottom: isLast ? 'none' : `1px dashed ${FAIRWAY_EDGE}` }}>
      {/* Hole header */}
      <div style={{
        padding: '12px 16px 8px',
        display: 'flex', alignItems: 'baseline', gap: 10,
        background: 'rgba(255,255,255,0.4)',
      }}>
        <span style={{
          fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1, fontWeight: 600,
          color: GRASS_D, textTransform: 'uppercase',
        }}>Hole {hole} · Par {drills.length}</span>
        <span style={{ flex: 1, height: 1, background: FAIRWAY_EDGE }}/>
        <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 500, color: theme.text }}>
          {done}/{drills.length}
        </span>
      </div>

      {/* Condition title + why */}
      <div style={{ padding: '4px 16px 10px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2, color: theme.text }}>
          {cond.title}
        </div>
        <div style={{ fontSize: 11, color: theme.textSec, marginTop: 2 }}>
          {cond.sub}
        </div>
      </div>

      {/* Fairway — SVG-based path with drill nodes */}
      <div style={{ position: 'relative', padding: '4px 16px 18px' }}>
        {/* Fairway strip */}
        <div style={{
          position: 'absolute', left: 34, top: 4, bottom: 18, width: 22,
          background: `linear-gradient(180deg, ${FAIRWAY_BG}, ${FAIRWAY_BG} 90%, ${FAIRWAY_EDGE})`,
          borderRadius: 11,
          border: `1px dashed ${FAIRWAY_EDGE}`,
        }}/>

        {/* Tee */}
        <div style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8,
        }}>
          <div style={{
            width: 44, textAlign: 'center', zIndex: 1,
            fontSize: 18, lineHeight: 1,
          }}>⛳</div>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, color: GRASS_D, letterSpacing: 0.6, fontWeight: 600,
            textTransform: 'uppercase',
          }}>Tee</div>
        </div>

        {/* Drill nodes */}
        {drills.map((d, i) => <FairwayDrillNode key={d.id} drill={d} theme={theme} grassDark={GRASS_D} grass={GRASS}/>)}

        {/* Green flag */}
        <div style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 14, marginTop: 8,
        }}>
          <div style={{
            width: 44, textAlign: 'center', zIndex: 1,
            fontSize: 18, lineHeight: 1,
            opacity: allDone ? 1 : 0.5,
          }}>🏁</div>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, color: allDone ? GRASS_D : theme.textSec,
            letterSpacing: 0.6, fontWeight: 600, textTransform: 'uppercase',
          }}>{allDone ? 'Green Complete' : 'Green'}</div>
        </div>
      </div>
    </div>
  );
}

function FairwayDrillNode({ drill, theme, grass, grassDark }) {
  const isDone = drill.state === 'done';
  const isCurrent = drill.state === 'current';

  const dotFill = isDone ? grassDark : isCurrent ? '#FFFFFF' : '#FFFFFF';
  const dotStroke = isDone ? grassDark : isCurrent ? grassDark : '#C5CEC8';
  const dotSize = isCurrent ? 20 : 16;

  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 14,
      padding: '9px 0',
    }}>
      {/* Node container — positioned over the fairway strip */}
      <div style={{ width: 44, display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        <div style={{
          width: dotSize, height: dotSize, borderRadius: '50%',
          background: dotFill,
          border: `2px solid ${dotStroke}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isCurrent ? `0 0 0 4px ${grassDark}22` : 'none',
        }}>
          {isDone && (
            <svg width="10" height="10" viewBox="0 0 12 12">
              <path d="M2 6 L 5 9 L 10 3" stroke="#fff" strokeWidth="2.2" fill="none"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: isCurrent ? 700 : 500,
          letterSpacing: -0.1, color: theme.text,
        }}>{drill.name}</div>
        <div style={{
          fontSize: 10.5, color: theme.textSec, marginTop: 2,
          fontFamily: FONT.mono, letterSpacing: 0.3,
        }}>{drill.time} · {drill.detail}</div>
      </div>

      {/* Status chip */}
      {isCurrent && (
        <span style={{
          padding: '3px 8px', background: grassDark, color: '#fff',
          borderRadius: 3, fontSize: 10, fontWeight: 600,
          fontFamily: FONT.mono, letterSpacing: 0.4,
        }}>NOW</span>
      )}
      {isDone && (
        <span style={{
          fontFamily: FONT.mono, fontSize: 10, color: grassDark, fontWeight: 600, letterSpacing: 0.4,
        }}>DONE</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Option H — Subway Line Map
// ─────────────────────────────────────────────────────────
function SubwayLayout({ lib, flat, getState, theme }) {
  const doneCount = flat.filter((d, i) => getState(i) === 'done').length;
  const totalCount = flat.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  // Line colors per condition (muted but distinct)
  const LINE_COLORS = ['#3966D8', '#E06C2F', '#2A8D5C', '#9048C9'];

  return (
    <div style={{
      border: `1px solid ${theme.border}`, borderRadius: 10, overflow: 'hidden',
      background: theme.surface,
    }}>
      {/* Line header */}
      <div style={{
        padding: '14px 16px',
        background: theme.surfaceAlt,
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.2,
          color: theme.textTer, textTransform: 'uppercase', fontWeight: 500,
        }}>Line</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, letterSpacing: -0.2 }}>
          {lib.challenge}
        </div>
        <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 2 }}>
          Goal: {lib.goal.metric} {lib.goal.targetLabel}
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1, height: 3, background: theme.border, borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              width: `${pct}%`, height: '100%', background: theme.text, transition: 'width .4s',
            }}/>
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.textSec, letterSpacing: 0.3 }}>
            <span style={{ color: theme.text, fontWeight: 600 }}>{doneCount}</span>/{totalCount} · {pct}%
          </div>
        </div>
      </div>

      {/* Stations */}
      <div style={{ padding: '8px 0' }}>
        {/* Start terminal */}
        <Terminal label="START" theme={theme} align="top"/>

        {lib.conditions.map((cond, ci) => {
          const color = LINE_COLORS[ci % LINE_COLORS.length];
          const firstGlobalIdx = flat.findIndex(d => d.condKey === cond.key);
          return (
            <React.Fragment key={cond.key}>
              {/* Condition line label */}
              <SectionLineLabel title={cond.title} sub={cond.sub} color={color} theme={theme}/>

              {cond.drills.map((d, di) => {
                const globalIdx = firstGlobalIdx + di;
                const state = getState(globalIdx);
                return (
                  <Station
                    key={d.id}
                    drill={d}
                    condKey={cond.key}
                    stationCode={`${cond.key.toUpperCase().slice(0, 3)}-${String(di + 1).padStart(2, '0')}`}
                    state={state}
                    color={color}
                    theme={theme}
                  />
                );
              })}

              {ci < lib.conditions.length - 1 && (
                <Transfer
                  from={cond.title}
                  to={lib.conditions[ci + 1].title}
                  colorFrom={color}
                  colorTo={LINE_COLORS[(ci + 1) % LINE_COLORS.length]}
                  theme={theme}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Goal terminal */}
        <Terminal label={`GOAL · ${lib.goal.metric} ${lib.goal.targetLabel}`} theme={theme} align="bottom"/>
      </div>
    </div>
  );
}

// Terminal (start / end) — big labelled block
function Terminal({ label, theme, align }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px', position: 'relative',
    }}>
      <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 14, height: 14, borderRadius: 3,
          background: theme.text, border: `2px solid ${theme.text}`,
        }}/>
      </div>
      {/* Connector segment */}
      {align === 'top' && (
        <div style={{
          position: 'absolute', left: 30, top: 24, bottom: -4, width: 3, background: theme.textTer,
        }}/>
      )}
      {align === 'bottom' && (
        <div style={{
          position: 'absolute', left: 30, top: -4, bottom: 24, width: 3, background: theme.textTer,
        }}/>
      )}
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 11, fontWeight: 700,
          color: theme.text, letterSpacing: 1.2, textTransform: 'uppercase',
        }}>{label}</div>
      </div>
    </div>
  );
}

// Section line label — shows condition name + why, line color accent
function SectionLineLabel({ title, sub, color, theme }) {
  return (
    <div style={{
      padding: '8px 16px', position: 'relative',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      {/* Line segment */}
      <div style={{
        position: 'absolute', left: 30, top: 0, bottom: 0, width: 3, background: color,
      }}/>
      <div style={{ width: 28, display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
        <div style={{
          width: 3, height: 16, background: color,
        }}/>
      </div>
      <div style={{ flex: 1, paddingTop: 2 }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, fontWeight: 600,
          color: color, textTransform: 'uppercase',
        }}>{title} Line</div>
        <div style={{
          fontSize: 11.5, color: theme.textSec, marginTop: 3, lineHeight: 1.5,
        }}>{sub}</div>
      </div>
    </div>
  );
}

// Station — single drill on the line
function Station({ drill, stationCode, state, color, theme }) {
  const isDone = state === 'done';
  const isCurrent = state === 'current';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px', position: 'relative',
    }}>
      {/* Line segment (vertical) */}
      <div style={{
        position: 'absolute', left: 30, top: 0, bottom: 0, width: 3, background: color,
      }}/>
      {/* Station marker */}
      <div style={{ width: 28, display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        <div style={{
          width: isCurrent ? 18 : 14, height: isCurrent ? 18 : 14, borderRadius: '50%',
          background: isDone ? color : theme.surface,
          border: `${isCurrent ? 3 : 2}px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isCurrent ? `0 0 0 4px ${color}22` : 'none',
        }}>
          {isDone && (
            <svg width="9" height="9" viewBox="0 0 12 12">
              <path d="M2 6 L 5 9 L 10 3" stroke="#fff" strokeWidth="2.2" fill="none"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
      {/* Station info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8,
        }}>
          <span style={{
            fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, fontWeight: 500,
          }}>{stationCode}</span>
          <span style={{
            fontSize: 13, fontWeight: isCurrent ? 700 : 500,
            color: isDone ? theme.textSec : theme.text, letterSpacing: -0.1,
            textDecoration: isDone ? 'line-through' : 'none', textDecorationColor: color + '88',
          }}>{drill.name}</span>
        </div>
        <div style={{
          fontSize: 10.5, color: theme.textSec, marginTop: 2,
          fontFamily: FONT.mono, letterSpacing: 0.3,
        }}>{drill.time} · {drill.detail}</div>
      </div>
      {/* Status */}
      {isCurrent && (
        <span style={{
          padding: '3px 8px', background: color, color: '#fff',
          borderRadius: 3, fontSize: 10, fontWeight: 600,
          fontFamily: FONT.mono, letterSpacing: 0.4,
        }}>NOW</span>
      )}
    </div>
  );
}

// Transfer — between conditions
function Transfer({ from, to, colorFrom, colorTo, theme }) {
  return (
    <div style={{
      padding: '10px 16px', position: 'relative',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Dual color line segment */}
      <div style={{
        position: 'absolute', left: 30, top: 0, bottom: '50%', width: 3, background: colorFrom,
      }}/>
      <div style={{
        position: 'absolute', left: 30, top: '50%', bottom: 0, width: 3, background: colorTo,
      }}/>
      {/* Transfer marker (square) */}
      <div style={{ width: 28, display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        <div style={{
          width: 18, height: 18, borderRadius: 3,
          background: theme.surface,
          border: `2px solid ${theme.text}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 3 L 8 3 M 8 3 L 6 1 M 8 3 L 6 5 M 8 7 L 2 7 M 2 7 L 4 5 M 2 7 L 4 9"
              stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, fontWeight: 600,
          color: theme.textTer, textTransform: 'uppercase',
        }}>Transfer</div>
        <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 2 }}>
          {from} → {to}
        </div>
      </div>
    </div>
  );
}

window.DrillLayoutGalleryScreen = DrillLayoutGalleryScreen;

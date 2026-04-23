// screens/round-setup.jsx — pre-round info entry
// After picking a course, choose: start side (OUT/IN), tee color.
// Shows: weather, difficulty+tips, target score.
// "ラウンド開始" → go('round')

function RoundSetupScreen({ theme, persona, go }) {
  const course = window.__courseSelected;

  // Safety: if somehow no course selected, send user back
  React.useEffect(() => {
    if (!course) go('course-select');
  }, []);

  const [startSide, setStartSide] = React.useState('OUT');
  const [isHalf, setIsHalf] = React.useState(false);
  const [teeColor, setTeeColor] = React.useState(() => {
    if (!course) return 'white';
    const preferred = course.tees.find(t => t.color === 'white') || course.tees[0];
    return preferred.color;
  });

  if (!course) {
    return <div style={{ padding: 20, fontFamily: FONT.sans, color: theme.text }}>読み込み中...</div>;
  }

  const target = window.computeTargetScore({
    avgScore: persona.avgScore, best: persona.best,
    par: course.par, rating: course.rating, slope: course.slope,
  });
  // Rough handicap guess (not official): avg - par, clamped
  const handicap = Math.max(0, Math.min(36, Math.round((persona.avgScore - course.par) * 0.93)));

  const label = (txt, style = {}) => (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
      letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500, ...style,
    }}>{txt}</div>
  );

  const start = () => {
    const now = Date.now();
    const allHoles = course.holes.map(h => ({
      ...h, strokes: null, putts: null, ob: false, hazard: false,
    }));
    // Half round: only the selected side's 9 holes are played.
    const rounHoles = isHalf
      ? (startSide === 'IN' ? allHoles.slice(9, 18) : allHoles.slice(0, 9))
      : allHoles;
    const roundTarget = isHalf ? Math.round(target / 2) : target;
    window.__roundSetup = { course, startSide, teeColor, isHalf, target: roundTarget, startedAt: now };
    // Initialize round state (holes + memo). Shared across round / round-result / round-complete.
    window.__roundState = {
      course, startSide, teeColor, isHalf,
      target: roundTarget,
      startedAt: now,
      holes: rounHoles,
      memo: '',
      status: 'in-progress', // 'in-progress' | 'completed'
    };
    window.__roundEditHole = null;
    go('round');
  };

  // Segmented button (for OUT/IN)
  const SegBtn = ({ on, children, onClick, flex = 1 }) => (
    <button onClick={onClick} style={{
      flex, background: on ? theme.text : 'transparent',
      color: on ? theme.bg : theme.text,
      border: `1px solid ${on ? 'transparent' : theme.border}`,
      padding: '12px 0', borderRadius: 6,
      fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
      letterSpacing: -0.1,
    }}>{children}</button>
  );

  // Tee color swatch map
  const SWATCH = {
    black: '#111111', white: '#FFFFFF', red: '#D04040',
    blue: '#3F62D0', gold: '#C9A33A', green: '#2F8C5B',
  };
  const TeeBtn = ({ tee }) => {
    const on = teeColor === tee.color;
    const sw = SWATCH[tee.color] || '#888';
    return (
      <button onClick={() => setTeeColor(tee.color)} style={{
        flex: 1, padding: '12px 8px',
        background: on ? theme.text : 'transparent',
        color: on ? theme.bg : theme.text,
        border: `1px solid ${on ? 'transparent' : theme.border}`,
        borderRadius: 6, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        fontFamily: FONT.sans, fontSize: 12, fontWeight: 500,
      }}>
        <span style={{
          width: 16, height: 16, borderRadius: '50%', background: sw,
          border: `1px solid ${tee.color === 'white' ? (on ? theme.bg : theme.borderStrong) : 'transparent'}`,
        }}/>
        <span>{tee.label}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 10, opacity: 0.65 }}>{tee.yards}Y</span>
      </button>
    );
  };

  return (
    <div style={{ padding: '0 20px 120px', color: theme.text, fontFamily: FONT.sans, letterSpacing: -0.1 }}>
      {/* Header */}
      <div style={{ paddingTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => go('course-select')} style={{
          background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: theme.text,
        }}>{Icon.chevL(theme.text, 16)}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Round · Step 2 / 2
          </div>
          <div style={{
            fontSize: 14, fontWeight: 600, marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{course.name}</div>
        </div>
      </div>

      {/* Start side */}
      <div style={{ marginTop: 22 }}>
        {label('スタート')}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <SegBtn on={startSide === 'OUT'} onClick={() => setStartSide('OUT')}>OUT（1–9）</SegBtn>
          <SegBtn on={startSide === 'IN'}  onClick={() => setStartSide('IN')}>IN（10–18）</SegBtn>
        </div>
        {/* Half-round checkbox */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 10, cursor: 'pointer', userSelect: 'none',
        }}>
          <span
            onClick={() => setIsHalf(v => !v)}
            style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              border: `1px solid ${isHalf ? theme.text : theme.borderStrong}`,
              background: isHalf ? theme.text : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isHalf && Icon.check(theme.bg, 12)}
          </span>
          <span
            onClick={() => setIsHalf(v => !v)}
            style={{ fontSize: 12.5, color: theme.text }}
          >
            ハーフラウンド（9ホールのみ）
          </span>
          {isHalf && (
            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, marginLeft: 4 }}>
              · {startSide} の9Hのみ
            </span>
          )}
        </label>
      </div>

      {/* Tee */}
      <div style={{ marginTop: 18 }}>
        {label('ティー')}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {course.tees.map(t => <TeeBtn key={t.color} tee={t} />)}
        </div>
      </div>

      {/* Weather */}
      <div style={{
        marginTop: 22, border: `1px solid ${theme.border}`, borderRadius: 8,
        padding: 14, background: theme.surface,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          {label('天気・コンディション')}
          <span style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textTer }}>自動取得</span>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10, marginTop: 12,
        }}>
          <div>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, fontWeight: 400, lineHeight: 1 }}>
              {course.weather.temp}°C
            </div>
            <div style={{ fontSize: 10.5, color: theme.textSec, marginTop: 6 }}>{course.weather.condition}</div>
          </div>
          <div style={{ borderLeft: `1px solid ${theme.border}`, paddingLeft: 10 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 500 }}>{course.weather.wind}</div>
            <div style={{ fontSize: 10.5, color: theme.textSec, marginTop: 6 }}>風速・風向</div>
          </div>
          <div style={{ borderLeft: `1px solid ${theme.border}`, paddingLeft: 10 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 500 }}>湿度 {course.weather.humidity}%</div>
            <div style={{ fontSize: 10.5, color: theme.textSec, marginTop: 6 }}>{course.weather.dayForecast}</div>
          </div>
        </div>
      </div>

      {/* Difficulty & Tips */}
      <div style={{
        marginTop: 12, border: `1px solid ${theme.border}`, borderRadius: 8,
        padding: 14, background: theme.surface,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          {label('難易度・攻略ポイント')}
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: theme.text }}>
            R{course.rating} · S{course.slope}
          </span>
        </div>
        <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.6 }}>{course.signature}</div>
        <ul style={{
          margin: '10px 0 0', paddingLeft: 16,
          fontSize: 12, color: theme.textSec, lineHeight: 1.75,
        }}>
          {course.tips.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>

      {/* Target score */}
      <div style={{
        marginTop: 12, border: `1px solid ${theme.border}`, borderRadius: 8,
        padding: 14, background: theme.surface,
      }}>
        {label(isHalf ? '今日の目標スコア（ハーフ）' : '今日の目標スコア')}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
          <span style={{
            fontFamily: FONT.mono, fontSize: 44, fontWeight: 400, letterSpacing: -1.5, lineHeight: 1,
          }}>{isHalf ? Math.round(target / 2) : target}</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 13, color: theme.textSec }}>
            +{(isHalf ? Math.round(target / 2) : target) - (isHalf ? Math.round(course.par / 2) : course.par)}
          </span>
          <span style={{ flex: 1 }}/>
          <div style={{ textAlign: 'right', fontFamily: FONT.mono, fontSize: 10.5, color: theme.textTer, lineHeight: 1.5 }}>
            <div>平均 {persona.avgScore}</div>
            <div>ベスト {persona.best}</div>
            <div>推定HC {handicap}</div>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 10, lineHeight: 1.6 }}>
          あなたのスコア実績とコース難易度から算出。
          いつもより2打だけ良いスコアを目標に、無理のないラウンドを。
        </div>
      </div>

      {/* Start */}
      <div style={{ marginTop: 20 }}>
        <button onClick={start} style={{
          width: '100%', background: theme.text, color: theme.bg, border: 'none',
          padding: '14px 0', borderRadius: 8,
          fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          letterSpacing: -0.1,
        }}>ラウンド開始</button>
        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: theme.textTer }}>
          {startSide === 'OUT' ? '1番ホールから始まります' : '10番ホールから始まります'}
          {isHalf ? '（9ホール）' : ''} ·
          {' '}{course.tees.find(t => t.color === teeColor)?.yards}Y
        </div>
      </div>
    </div>
  );
}

window.RoundSetupScreen = RoundSetupScreen;

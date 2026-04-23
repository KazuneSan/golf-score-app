// screens/course-select.jsx — search + recent courses
// Empty state: "最近検索したコース" (from localStorage)
// Typing:     "検索結果" with fuzzy-matched courses (kata/hira/roman)

function CourseSelectScreen({ theme, go }) {
  const [q, setQ] = React.useState('');
  const [recent, setRecent] = React.useState(() => window.getRecentCourses());

  const suggestions = q.trim() ? window.searchCourses(q).slice(0, 12) : [];

  const label = (txt, style = {}) => (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
      letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500, ...style,
    }}>{txt}</div>
  );

  const pick = (c) => {
    window.addRecentCourse(c.id);
    window.__courseSelected = c;
    go('round-setup');
  };

  const Row = ({ c }) => (
    <div onClick={() => pick(c)} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 0', borderBottom: `1px solid ${theme.border}`,
      cursor: 'pointer',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, letterSpacing: -0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {c.name}
        </div>
        <div style={{ fontSize: 11, color: theme.textSec, marginTop: 3, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>{c.location}</span>
          <span style={{ color: theme.textTer }}>·</span>
          <span style={{ fontFamily: FONT.mono }}>Par {c.par}</span>
          <span style={{ color: theme.textTer }}>·</span>
          <span style={{ fontFamily: FONT.mono }}>R{c.rating}/S{c.slope}</span>
        </div>
      </div>
      <span style={{ fontFamily: FONT.mono, fontSize: 12, color: theme.textSec, flexShrink: 0 }}>→</span>
    </div>
  );

  return (
    <div style={{ padding: '0 20px 120px', color: theme.text, fontFamily: FONT.sans, letterSpacing: -0.1 }}>
      {/* Header */}
      <div style={{ paddingTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => go('home')} style={{
          background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: theme.text,
        }}>{Icon.chevL(theme.text, 16)}</button>
        <div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Round · Step 1 / 2
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>コースを選ぶ</div>
        </div>
      </div>

      {/* Search box */}
      <div style={{ marginTop: 18, position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: theme.textTer, pointerEvents: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </div>
        <input
          autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="コース名（ひらがな・カタカナ・英字OK）"
          style={{
            width: '100%', padding: '12px 14px 12px 34px',
            background: theme.surface, color: theme.text,
            border: `1px solid ${theme.border}`, borderRadius: 8,
            fontFamily: FONT.sans, fontSize: 13.5, outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {q && (
          <button onClick={() => setQ('')} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: theme.textSec, padding: 6,
          }}>{Icon.close(theme.textSec, 14)}</button>
        )}
      </div>

      {/* Suggestions or recent */}
      {q.trim() ? (
        <div style={{ marginTop: 20 }}>
          {label(`検索結果 · ${suggestions.length}件`)}
          <div style={{ marginTop: 4 }}>
            {suggestions.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 12.5, color: theme.textSec }}>「{q}」に一致するコースが見つかりません</div>
                <div style={{ fontSize: 11, color: theme.textTer, marginTop: 6 }}>
                  ひらがな・カタカナ・英字いずれでも検索できます
                </div>
              </div>
            ) : (
              suggestions.map(c => <Row key={c.id} c={c} />)
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          {label('最近検索したコース')}
          <div style={{ marginTop: 4 }}>
            {recent.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 12.5, color: theme.textSec }}>履歴はまだありません</div>
                <div style={{ fontSize: 11, color: theme.textTer, marginTop: 6 }}>
                  上の検索窓からコースを探してください
                </div>
              </div>
            ) : recent.map(c => <Row key={c.id} c={c} />)}
          </div>

          {/* Tip at bottom when showing recent */}
          {recent.length > 0 && (
            <div style={{ marginTop: 24, fontSize: 11, color: theme.textTer, lineHeight: 1.6 }}>
              同じゴルフ場でも「東/西」「A/Bコース」は別扱いで記録されます。
            </div>
          )}
        </div>
      )}
    </div>
  );
}

window.CourseSelectScreen = CourseSelectScreen;

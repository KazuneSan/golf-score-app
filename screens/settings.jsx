// screens/settings.jsx — app settings.
//
// Currently focused on Round Options — which optional per-hole trackers
// are shown during round recording (OB, ハザード, 3-putt, FWキープ, 寄せワン, バンカー).

const ROUND_OPTION_DEFS = [
  { k: 'ob',        label: 'OB',         short: 'OB',  desc: 'OB発生数を記録。OB率の算出に使用。', priority: 'A' },
  { k: 'hazard',    label: 'ハザード',    short: 'HAZ', desc: '池・黄杭/赤杭・林などのペナルティ。', priority: 'A' },
  { k: 'threePutt', label: '3パット',     short: '3P',  desc: '3パット注目日。パット数からも自動判定可。', priority: 'B' },
  { k: 'fairway',   label: 'FWキープ',    short: 'FW',  desc: 'ティーショットのFWキープ。Par3は除外。', priority: 'B' },
  { k: 'upDown',    label: '寄せワン',    short: 'U&D', desc: 'グリーンを外してからパーで収めた。', priority: 'C' },
  { k: 'bunker',    label: 'バンカー',    short: 'BK',  desc: 'バンカーに入れたホール。サンドセーブ率に。', priority: 'C' },
];

const DEFAULT_ROUND_OPTIONS = {
  ob:        true,
  hazard:    true,
  threePutt: false,
  fairway:   false,
  upDown:    false,
  bunker:    false,
};

function getRoundOptions() {
  try {
    const raw = localStorage.getItem('gs_round_options');
    return raw ? { ...DEFAULT_ROUND_OPTIONS, ...JSON.parse(raw) } : { ...DEFAULT_ROUND_OPTIONS };
  } catch { return { ...DEFAULT_ROUND_OPTIONS }; }
}
function setRoundOptions(opts) {
  try { localStorage.setItem('gs_round_options', JSON.stringify(opts)); } catch {}
}
// List of enabled option keys in the canonical order
function getEnabledRoundOptionKeys() {
  const o = getRoundOptions();
  return ROUND_OPTION_DEFS.map(d => d.k).filter(k => o[k]);
}

Object.assign(window, {
  ROUND_OPTION_DEFS, DEFAULT_ROUND_OPTIONS,
  getRoundOptions, setRoundOptions, getEnabledRoundOptionKeys,
});

// ── Language ─────────────────────────────────────────────
const LANGUAGES = [
  { k: 'ja', label: '日本語',  sub: 'Japanese · デフォルト' },
  { k: 'en', label: 'English', sub: 'English' },
  { k: 'ko', label: '한국어',  sub: 'Korean' },
];
function getLang() {
  try { return localStorage.getItem('gs_lang') || 'ja'; }
  catch { return 'ja'; }
}
function setLang(l) {
  try { localStorage.setItem('gs_lang', l); } catch {}
}

// ── Data reset ───────────────────────────────────────────
// All localStorage keys the app writes to
const APP_STORAGE_KEYS = [
  'gs_rounds',             // scoring round history
  'gs_practice_rounds',    // practice round history
  'gs_drill_sessions',     // per-drill session results
  'gs_drill_done',         // legacy drill toggle
  'gs_test_results',       // clubhouse test results
  'gs_fav_drills',         // favorite drills
  'gs_recent_courses',     // recent course search history
  'gs_round_options',      // per-hole tracker options
  'gs_lang',               // language preference
  'gs_target_score',       // diagnosis target
  'gs_screen',             // last viewed screen
];
function resetAllAppData() {
  try {
    APP_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
  } catch {}
}

Object.assign(window, { LANGUAGES, getLang, setLang, APP_STORAGE_KEYS, resetAllAppData });

function SettingsScreen({ theme, go }) {
  const [opts, setOpts] = React.useState(() => getRoundOptions());
  const toggle = (k) => {
    const next = { ...opts, [k]: !opts[k] };
    setOpts(next);
    setRoundOptions(next);
  };
  const enabledCount = Object.values(opts).filter(Boolean).length;

  // Language
  const [lang, setLangState] = React.useState(() => getLang());
  const selectLang = (l) => { setLangState(l); setLang(l); };

  // Reset confirmation dialog state
  const [resetOpen, setResetOpen] = React.useState(false);
  const doReset = () => {
    resetAllAppData();
    setResetOpen(false);
    // Reset round options local state too
    setOpts({ ...DEFAULT_ROUND_OPTIONS });
    setLangState('ja');
    // Go back to home after reset
    setTimeout(() => go('home'), 200);
  };

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
          {label('Settings')}
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>設定</div>
        </div>
      </div>

      {/* Round options */}
      <div style={{ marginTop: 22 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8,
        }}>
          {label('ラウンド記録の項目')}
          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textTer }}>
            有効 {enabledCount}/{ROUND_OPTION_DEFS.length}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: theme.textSec, marginBottom: 10, lineHeight: 1.55 }}>
          ラウンド中の「発生時のみタップ」に表示する項目を選べます。日によって注目したい指標が違う人向け。
        </div>

        <div style={{
          border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, overflow: 'hidden',
        }}>
          {ROUND_OPTION_DEFS.map((def, i) => {
            const on = !!opts[def.k];
            return (
              <div key={def.k}
                onClick={() => toggle(def.k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 14px',
                  borderBottom: i < ROUND_OPTION_DEFS.length - 1 ? `1px solid ${theme.border}` : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.1 }}>{def.label}</span>
                    <span style={{
                      fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
                      letterSpacing: 0.4,
                    }}>{def.short} · Tier {def.priority}</span>
                  </div>
                  <div style={{ fontSize: 11, color: theme.textSec, marginTop: 3, lineHeight: 1.55 }}>
                    {def.desc}
                  </div>
                </div>
                <Toggle on={on} theme={theme}/>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 11, color: theme.textTer, marginTop: 10, lineHeight: 1.6 }}>
          打数・パット数は常に必須です。ここで選んだ項目だけがラウンド記録画面の下部に表示されます。
        </div>
      </div>

      {/* Reset round options to defaults */}
      <div style={{ marginTop: 14 }}>
        <button onClick={() => { setOpts(DEFAULT_ROUND_OPTIONS); setRoundOptions(DEFAULT_ROUND_OPTIONS); }}
          style={{
            width: '100%', background: 'transparent', color: theme.textSec,
            border: `1px solid ${theme.border}`, borderRadius: 6,
            padding: '10px 0', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
            fontFamily: FONT.sans,
          }}>項目設定をデフォルトに戻す</button>
      </div>

      {/* ─── Language ─── */}
      <div style={{ marginTop: 30 }}>
        {label('言語 / Language')}
        <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 6, marginBottom: 10, lineHeight: 1.55 }}>
          表示言語を選べます。UI全体の翻訳は順次対応予定。
        </div>
        <div style={{
          border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, overflow: 'hidden',
        }}>
          {LANGUAGES.map((l, i) => {
            const on = lang === l.k;
            return (
              <div key={l.k}
                onClick={() => selectLang(l.k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 14px',
                  borderBottom: i < LANGUAGES.length - 1 ? `1px solid ${theme.border}` : 'none',
                  cursor: 'pointer',
                  background: on ? theme.surfaceAlt : 'transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.1 }}>{l.label}</div>
                  <div style={{ fontSize: 10.5, color: theme.textSec, marginTop: 2, letterSpacing: 0.2 }}>
                    {l.sub}
                  </div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `1.5px solid ${on ? theme.text : theme.borderStrong}`,
                  background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && (
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', background: theme.text,
                    }}/>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Data reset ─── */}
      <div style={{ marginTop: 30 }}>
        {label('データ管理')}
        <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 6, marginBottom: 10, lineHeight: 1.55 }}>
          ラウンド履歴・練習ログ・お気に入り・設定などアプリ内のすべてのデータを削除します。この操作は取り消せません。
        </div>
        <button onClick={() => setResetOpen(true)} style={{
          width: '100%', background: 'transparent',
          color: theme.danger,
          border: `1px solid ${theme.danger}55`,
          borderRadius: 6, padding: '12px 0',
          fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          letterSpacing: -0.1,
        }}>
          すべてのデータを削除（リセット）
        </button>
      </div>

      {/* App info at bottom */}
      <div style={{
        marginTop: 30, paddingTop: 20,
        borderTop: `1px solid ${theme.border}`,
        fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer,
        letterSpacing: 0.4, textAlign: 'center', lineHeight: 1.7,
      }}>
        Fairway · Golf Score Prototype
      </div>

      {/* Reset confirmation modal */}
      {resetOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
          onClick={() => setResetOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{
            background: theme.surface, color: theme.text,
            borderRadius: 10, padding: '18px 20px 16px',
            width: '100%', maxWidth: 320,
            fontFamily: FONT.sans,
            border: `1px solid ${theme.border}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          }}>
            <div style={{
              fontFamily: FONT.mono, fontSize: 9.5, color: theme.danger,
              letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
            }}>Warning</div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2, marginBottom: 8 }}>
              すべてのデータを削除しますか？
            </div>
            <div style={{ fontSize: 12, color: theme.textSec, lineHeight: 1.6, marginBottom: 14 }}>
              ラウンド履歴・練習ログ・お気に入り・各種設定が全て削除されます。<br/>
              この操作は <b style={{ color: theme.danger }}>取り消せません</b>。
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setResetOpen(false)} style={{
                flex: 1, background: 'transparent', color: theme.text,
                border: `1px solid ${theme.border}`, borderRadius: 6,
                padding: '11px 0', fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>キャンセル</button>
              <button onClick={doReset} style={{
                flex: 1, background: theme.danger, color: '#fff',
                border: 'none', borderRadius: 6,
                padding: '11px 0', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// iOS-ish toggle switch
function Toggle({ on, theme }) {
  return (
    <div style={{
      width: 42, height: 24, borderRadius: 12,
      background: on ? theme.text : theme.border,
      position: 'relative', transition: 'background .2s',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 20 : 2,
        width: 20, height: 20, borderRadius: '50%',
        background: theme.bg,
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        transition: 'left .2s',
      }}/>
    </div>
  );
}

window.SettingsScreen = SettingsScreen;

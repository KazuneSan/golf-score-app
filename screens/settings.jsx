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

function SettingsScreen({ theme, go }) {
  const [opts, setOpts] = React.useState(() => getRoundOptions());
  const toggle = (k) => {
    const next = { ...opts, [k]: !opts[k] };
    setOpts(next);
    setRoundOptions(next);
  };
  const enabledCount = Object.values(opts).filter(Boolean).length;

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

      {/* Reset */}
      <div style={{ marginTop: 22 }}>
        <button onClick={() => { setOpts(DEFAULT_ROUND_OPTIONS); setRoundOptions(DEFAULT_ROUND_OPTIONS); }}
          style={{
            width: '100%', background: 'transparent', color: theme.textSec,
            border: `1px solid ${theme.border}`, borderRadius: 6,
            padding: '11px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: FONT.sans,
          }}>デフォルトに戻す</button>
      </div>
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

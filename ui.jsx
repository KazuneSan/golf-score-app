// ui.jsx — shared primitives (Linear v2): Card, Stat, Pill, Icon, SourceDot, Seg, Progress, TapBtn
const Icon = {
  chevR: (c='currentColor', s=14) => (
    <svg width={s*0.58} height={s} viewBox="0 0 8 14" fill="none">
      <path d="M1 1l6 6-6 6" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  chevL: (c='currentColor', s=14) => (
    <svg width={s*0.58} height={s} viewBox="0 0 8 14" fill="none">
      <path d="M7 1L1 7l6 6" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  close: (c='currentColor', s=18) => (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none">
      <path d="M4 4l10 10M14 4L4 14" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  plus: (c='currentColor', s=18) => (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none">
      <path d="M9 2v14M2 9h14" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  minus: (c='currentColor', s=18) => (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none">
      <path d="M2 9h14" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  check: (c='currentColor', s=16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5l3 3 7-7.5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  info: (c='currentColor', s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke={c} strokeWidth="1.2"/>
      <path d="M7 6v4M7 4.2v.1" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  trend: (dir, c) => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      {dir === 'up'
        ? <path d="M2 8l3-3 2 2 3-4M8 3h2v2" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        : <path d="M2 4l3 3 2-2 3 4M8 9h2V7" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>}
    </svg>
  ),
  flag: (c='currentColor', s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <path d="M3 12V2M3 3h7l-1.2 2.2L10 7H3" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  target: (c='currentColor', s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke={c} strokeWidth="1.2"/>
      <circle cx="7" cy="7" r="2.5" stroke={c} strokeWidth="1.2"/>
      <circle cx="7" cy="7" r="0.5" fill={c}/>
    </svg>
  ),
};

function Card({ children, style, theme, onClick, padding = 14 }) {
  return (
    <div onClick={onClick} style={{
      background: theme.surface,
      borderRadius: 8,
      padding,
      border: `1px solid ${theme.border}`,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

function Pill({ children, theme, tone = 'neutral', style }) {
  const tones = {
    neutral: { bg: theme.chipBg, fg: theme.text, border: 'transparent' },
    accent:  { bg: 'transparent', fg: theme.text, border: theme.borderStrong },
    good:    { bg: 'transparent', fg: theme.good, border: theme.good + '55' },
    warn:    { bg: 'transparent', fg: theme.warn, border: theme.warn + '55' },
    danger:  { bg: 'transparent', fg: theme.danger, border: theme.danger + '55' },
    ghost:   { bg: 'transparent', fg: theme.textSec, border: theme.border },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: 22, padding: '0 8px', borderRadius: 4,
      background: t.bg, color: t.fg,
      fontSize: 11, fontWeight: 500, letterSpacing: 0,
      border: `1px solid ${t.border}`,
      ...style,
    }}>{children}</span>
  );
}

// Source indicator — subtle monochrome glyph. input / system / calc.
function SourceDot({ src, theme }) {
  const map = {
    input:  { c: '入', tip: 'あなたが入力' },
    system: { c: '自', tip: 'コース情報など自動' },
    calc:   { c: '計', tip: '自動で計算' },
  };
  const m = map[src];
  if (!m) return null;
  return (
    <span title={m.tip} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 14, height: 14, borderRadius: 3,
      background: 'transparent',
      border: `1px solid ${theme.borderStrong}`,
      color: theme.textSec,
      fontFamily: FONT.sans, fontSize: 8, fontWeight: 600,
      flexShrink: 0,
    }}>{m.c}</span>
  );
}

function Stat({ label, value, unit, sub, theme, src, big = false, align = 'left' }) {
  return (
    <div style={{ textAlign: align }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        color: theme.textTer, fontSize: 10, fontWeight: 500,
        letterSpacing: 0.8, textTransform: 'uppercase',
        fontFamily: FONT.mono,
        justifyContent: align === 'left' ? 'flex-start' : 'center',
      }}>
        {src && <SourceDot src={src} theme={theme}/>}
        <span>{label}</span>
      </div>
      <div style={{
        marginTop: 6,
        color: theme.text,
        fontFamily: FONT.mono,
        fontSize: big ? 40 : 24,
        fontWeight: 400,
        letterSpacing: big ? -1.2 : -0.5,
        lineHeight: 1,
      }}>
        {value}
        {unit && <span style={{
          fontSize: big ? 14 : 11, color: theme.textSec,
          marginLeft: 3, fontWeight: 400,
        }}>{unit}</span>}
      </div>
      {sub && <div style={{ marginTop: 6, fontSize: 12, color: theme.textSec, fontFamily: FONT.sans }}>{sub}</div>}
    </div>
  );
}

// Segmented control — Linear style tab underline, flat
function Seg({ options, value, onChange, theme }) {
  return (
    <div style={{
      display: 'flex', gap: 0,
      borderBottom: `1px solid ${theme.border}`,
    }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            border: 'none', background: 'transparent',
            padding: '10px 14px',
            color: on ? theme.text : theme.textSec,
            fontFamily: FONT.sans, fontSize: 12.5,
            fontWeight: on ? 600 : 500,
            cursor: 'pointer',
            borderBottom: `2px solid ${on ? theme.text : 'transparent'}`,
            marginBottom: -1,
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

// Progress: current vs target
function Progress({ value, target, better = 'higher', theme, height = 3 }) {
  const max = better === 'higher' ? Math.max(target * 1.2, value * 1.1, target + 5)
                                  : Math.max(target * 2, value * 1.2, target + 6);
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tpct = Math.max(0, Math.min(100, (target / max) * 100));
  const ok = better === 'higher' ? value >= target : value <= target;
  const color = ok ? theme.good : theme.text;
  return (
    <div style={{ position: 'relative', height, background: theme.border, borderRadius: 1 }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, height: '100%',
        width: `${pct}%`, background: color, borderRadius: 1,
        transition: 'width .5s',
      }}/>
      <div style={{
        position: 'absolute', top: -3, height: height + 6, width: 1,
        left: `calc(${tpct}% - 0.5px)`,
        background: theme.textTer,
      }}/>
    </div>
  );
}

// Tap button — Linear v2 flat monochrome
function TapBtn({ children, onClick, theme, variant = 'primary', style, full = false, disabled }) {
  const styles = {
    primary: { bg: theme.text,       fg: theme.bg,   border: 'transparent' },
    dark:    { bg: theme.text,       fg: theme.bg,   border: 'transparent' },
    soft:    { bg: theme.surface2,   fg: theme.text, border: 'transparent' },
    ghost:   { bg: 'transparent',    fg: theme.text, border: theme.borderStrong },
    surface: { bg: theme.surface,    fg: theme.text, border: theme.border },
  };
  const s = styles[variant];
  return (
    <button disabled={disabled} onClick={onClick} style={{
      background: s.bg, color: s.fg,
      border: `1px solid ${s.border}`, borderRadius: 8,
      fontFamily: FONT.sans, fontSize: 13, fontWeight: 500,
      padding: '13px 18px',
      width: full ? '100%' : undefined,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      letterSpacing: -0.1,
      ...style,
    }}>{children}</button>
  );
}

Object.assign(window, { Icon, Card, Pill, Stat, SourceDot, Seg, Progress, TapBtn });

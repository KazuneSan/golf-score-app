// screens/round-result.jsx — round result + memo + shareable scorecard
//
// Data source: window.__roundState (populated by round-setup, mutated by round).
// - Tap any hole in the 9+9 matrix → jump back to round screen at that hole.
// - Memo is saved back to __roundState.memo (and on "完了", persisted to localStorage).
// - Scorecard modal uses html2canvas to produce a PNG (download or Web Share API).

function RoundResultScreen({ theme, persona, go }) {
  const state = window.__roundState;

  // Safety: no round in progress — send home.
  React.useEffect(() => {
    if (!state) go('home');
  }, []);
  if (!state) return null;

  const { course, holes } = state;
  const [memoText, setMemoText] = React.useState(state.memo || '');
  const [showScorecard, setShowScorecard] = React.useState(false);

  // Mirror memo to shared state so editing round → returning here preserves it.
  React.useEffect(() => { state.memo = memoText; }, [memoText]);

  // ── derived totals ──────────────────────────────────────────
  const played = holes.filter(h => h.strokes != null);
  const coursePar = course.par || holes.reduce((a, h) => a + h.par, 0);
  const total = played.reduce((a, h) => a + h.strokes, 0);
  const playedPar = played.reduce((a, h) => a + h.par, 0);
  const diff = played.length ? total - playedPar : 0;

  // Half round: only one side is played. Matrix shows only that side.
  const isHalf = !!state.isHalf || holes.length === 9;
  const front = isHalf
    ? (state.startSide === 'IN' ? [] : holes)
    : holes.slice(0, 9);
  const back = isHalf
    ? (state.startSide === 'IN' ? holes : [])
    : holes.slice(9, 18);
  const halfTotal = (hs) => hs.filter(h => h.strokes != null).reduce((a, h) => a + h.strokes, 0);
  const halfPar   = (hs) => hs.filter(h => h.strokes != null).reduce((a, h) => a + h.par, 0);
  const frontTot = halfTotal(front), frontPar = halfPar(front);
  const backTot  = halfTotal(back),  backPar  = halfPar(back);

  // Count types (eagle/birdie/par/bogey/double/more)
  const counts = played.reduce((acc, h) => {
    const d = h.strokes - h.par;
    if (d <= -2) acc.eagle++;
    else if (d === -1) acc.birdie++;
    else if (d === 0) acc.par++;
    else if (d === 1) acc.bogey++;
    else if (d === 2) acc.double++;
    else acc.more++;
    return acc;
  }, { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, more: 0 });

  const totalPutts = played.reduce((a, h) => a + (h.putts || 0), 0);
  const threePuttCount = played.filter(h => (h.putts || 0) >= 3).length;
  const obCount = played.filter(h => h.ob).length;
  const hazardCount = played.filter(h => h.hazard).length;

  // ── score symbols ───────────────────────────────────────────
  // ◎ Eagle+, ○ Birdie, (nothing) Par, △ Bogey, □ Double, number for worse
  const symbolFor = (h) => {
    if (h.strokes == null) return '—';
    const d = h.strokes - h.par;
    if (d <= -2) return '◎';
    if (d === -1) return '○';
    if (d === 0) return '−';
    if (d === 1) return '△';
    if (d === 2) return '□';
    return `+${d}`;
  };
  const symbolColor = (h) => {
    if (h.strokes == null) return theme.textTer;
    const d = h.strokes - h.par;
    if (d < 0) return theme.good;
    if (d === 0) return theme.text;
    if (d >= 2) return theme.warn;
    return theme.text;
  };

  // ── handlers ────────────────────────────────────────────────
  const editHole = (idx) => {
    window.__roundEditHole = idx;
    go('round');
  };

  const finish = () => {
    // Persist round history to localStorage so we can revisit later.
    const endedAt = Date.now();
    try {
      const hist = JSON.parse(localStorage.getItem('gs_rounds') || '[]');
      hist.unshift({
        course: { id: course.id, name: course.name, par: coursePar },
        teeColor: state.teeColor,
        startSide: state.startSide,
        isHalf: !!state.isHalf,
        target: state.target,
        startedAt: state.startedAt,
        endedAt,
        total, diff,
        holes: holes.map(h => ({
          no: h.no, par: h.par, hdcp: h.hdcp,
          strokes: h.strokes, putts: h.putts,
          ob: h.ob, hazard: h.hazard,
        })),
        memo: memoText,
      });
      localStorage.setItem('gs_rounds', JSON.stringify(hist.slice(0, 50)));
    } catch (e) { /* noop */ }
    // Mark state as finalized + add endedAt so round-complete can read it.
    if (state) {
      state.memo = memoText;
      state.endedAt = endedAt;
      state.status = 'finalized';
    }
    // Don't clear __roundState yet — round-complete uses it.
    go('round-complete');
  };

  // ── small ui helpers ────────────────────────────────────────
  const label = (txt, style = {}) => (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
      letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500, ...style,
    }}>{txt}</div>
  );

  // Half card — 9-column grid, 2 data rows (symbol + strokes) + hole-number header row.
  const HalfCard = ({ hs, from, title, tot, par }) => {
    const d = tot - par;
    const diffText = !played.filter(h => hs.includes(h)).length
      ? '—'
      : d === 0 ? 'E' : `${d >= 0 ? '+' : ''}${d}`;
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6,
        }}>
          <span style={{
            fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
            letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
          }}>{title}</span>
          <span style={{ flex: 1, height: 1, background: theme.border }}/>
          <span style={{ fontFamily: FONT.mono, fontSize: 12, fontWeight: 500 }}>
            {tot || '—'}
          </span>
          <span style={{
            fontFamily: FONT.mono, fontSize: 11,
            color: d > 0 ? theme.warn : d < 0 ? theme.good : theme.textSec,
          }}>
            {diffText}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {hs.map((h, k) => {
            const i = from + k;
            return (
              <button key={h.no} onClick={() => editHole(i)} style={{
                flex: 1, minWidth: 0, padding: '6px 0 7px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 4,
                cursor: 'pointer',
              }}>
                <span style={{
                  fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, lineHeight: 1,
                }}>{h.no}</span>
                <span style={{
                  fontFamily: FONT.mono, fontSize: 16, lineHeight: 1,
                  color: symbolColor(h),
                  fontWeight: 500,
                }}>{symbolFor(h)}</span>
                <span style={{
                  fontFamily: FONT.mono, fontSize: 12, lineHeight: 1, marginTop: 1,
                  color: h.strokes == null ? theme.textTer : theme.text,
                }}>{h.strokes ?? '—'}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const dateStr = new Date(state.startedAt).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  });

  // ── render ──────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 16px 40px', color: theme.text, fontFamily: FONT.sans, letterSpacing: -0.1 }}>
      {/* Header */}
      <div style={{ paddingTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
            letterSpacing: 0.8, textTransform: 'uppercase',
          }}>Round · Result</div>
          <div style={{
            fontSize: 14, fontWeight: 600, marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{course.name}</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 10.5, color: theme.textSec, marginTop: 2 }}>
            {dateStr}
            {state.teeColor && ` · ${state.teeColor.toUpperCase()} tee`}
            {state.target && ` · 目標 ${state.target}`}
          </div>
        </div>
      </div>

      {/* Total — the hero number */}
      <div style={{
        marginTop: 18, display: 'flex', alignItems: 'flex-end', gap: 14,
      }}>
        <div>
          <div style={{
            fontFamily: FONT.mono, fontSize: 56, fontWeight: 400, letterSpacing: -2.2, lineHeight: 0.95,
          }}>{total || '—'}</div>
          {played.length > 0 && (
            <div style={{
              fontFamily: FONT.mono, fontSize: 16, fontWeight: 500, marginTop: 4,
              color: diff > 0 ? theme.warn : diff < 0 ? theme.good : theme.textSec,
            }}>
              {diff >= 0 ? '+' : ''}{diff}
              <span style={{ fontSize: 11, color: theme.textTer, marginLeft: 6 }}>
                / Par {playedPar || coursePar}
              </span>
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.6 }}>
            {played.length}/18 完了
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6, fontFamily: FONT.mono, fontSize: 10, color: theme.textSec }}>
            <span>OUT {frontTot || '—'}</span>
            <span>IN {backTot || '—'}</span>
          </div>
        </div>
      </div>

      {/* Counts chip row */}
      <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
        {[
          ['Eagle', counts.eagle, theme.good],
          ['Birdie', counts.birdie, theme.good],
          ['Par', counts.par, theme.text],
          ['Bogey', counts.bogey, theme.text],
          ['Double+', counts.double + counts.more, theme.warn],
        ].map(([k, v, c]) => (
          <span key={k} style={{
            fontSize: 11, padding: '4px 8px',
            background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 4,
            color: v > 0 ? c : theme.textTer,
            fontWeight: v > 0 ? 500 : 400,
            fontFamily: FONT.sans,
          }}>
            {k} <span style={{ fontFamily: FONT.mono, marginLeft: 2 }}>{v}</span>
          </span>
        ))}
      </div>

      {/* 9+9 matrix */}
      <div style={{ marginTop: 22 }}>
        {label('スコア')}
        <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer, marginTop: 4, marginBottom: 10 }}>
          ◎ Eagle   ○ Birdie   − Par   △ Bogey   □ Double · タップで編集
        </div>
        {front.length > 0 && <HalfCard hs={front} from={0} title="OUT" tot={frontTot} par={frontPar}/>}
        {back.length > 0  && <HalfCard hs={back}  from={front.length > 0 ? 9 : 0} title="IN"  tot={backTot}  par={backPar}/>}
      </div>

      {/* Putts / OB / Hazard summary */}
      <div style={{
        marginTop: 14, padding: '10px 0',
        borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: FONT.mono, fontSize: 11, color: theme.textSec,
      }}>
        <span>パット計 <span style={{ color: theme.text, fontWeight: 500 }}>{totalPutts}</span></span>
        <span>3パット <span style={{ color: threePuttCount > 0 ? theme.warn : theme.text, fontWeight: 500 }}>{threePuttCount}</span></span>
        <span>OB <span style={{ color: obCount > 0 ? theme.warn : theme.text, fontWeight: 500 }}>{obCount}</span></span>
        <span>ハザード <span style={{ color: hazardCount > 0 ? theme.warn : theme.text, fontWeight: 500 }}>{hazardCount}</span></span>
      </div>

      {/* Memo */}
      <div style={{ marginTop: 22 }}>
        {label('ラウンドメモ')}
        <textarea
          value={memoText}
          onChange={e => setMemoText(e.target.value)}
          placeholder="今日のラウンドで気づいたこと、感触、次に活かしたいことなど"
          rows={5}
          style={{
            width: '100%', marginTop: 8,
            padding: '12px 14px',
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            fontFamily: FONT.sans, fontSize: 13, color: theme.text,
            outline: 'none', resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer, marginTop: 6 }}>
          保存されます。後でラウンド履歴から見返せるようになります。
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 22, display: 'flex', gap: 8, flexDirection: 'column' }}>
        <button onClick={() => setShowScorecard(true)} style={{
          width: '100%',
          background: theme.surfaceAlt,
          color: theme.text,
          border: `1.5px solid ${theme.text}`,
          padding: '13px 0', borderRadius: 8,
          fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          letterSpacing: -0.1,
        }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="6" cy="7" r="1.2" fill="currentColor"/>
            <path d="M2 11l3-3 3 3 2-2 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
          </svg>
          スコアカードを作成 · シェア
        </button>
        <button onClick={finish} style={{
          width: '100%', background: theme.text, color: theme.bg, border: 'none',
          padding: '14px 0', borderRadius: 8,
          fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>完了して保存</button>
      </div>

      {/* Scorecard modal */}
      {showScorecard && (
        <ScorecardModal
          theme={theme}
          course={course} holes={holes}
          total={total} diff={diff}
          frontTot={frontTot} backTot={backTot}
          frontPar={frontPar} backPar={backPar}
          dateStr={dateStr}
          onClose={() => setShowScorecard(false)}
          symbolFor={symbolFor}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Scorecard modal — pick template, add photo, render & share.
// ─────────────────────────────────────────────────────────────
function ScorecardModal({
  theme, course, holes, total, diff,
  frontTot, backTot, frontPar, backPar,
  dateStr, onClose, symbolFor,
}) {
  const [template, setTemplate] = React.useState('strip');
  const [photoUrl, setPhotoUrl] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const cardRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  const pickPhoto = () => fileInputRef.current?.click();
  const clearPhoto = () => setPhotoUrl(null);

  const onPhotoSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result);
    reader.readAsDataURL(f);
  };

  const onSave = async () => {
    if (!window.html2canvas || !cardRef.current) return;
    setSaving(true);
    try {
      const canvas = await window.html2canvas(cardRef.current, {
        scale: 3, useCORS: true, backgroundColor: null, logging: false,
      });
      await new Promise(resolve => {
        canvas.toBlob(async (blob) => {
          if (!blob) { resolve(); return; }
          const fileName = `fairway-${dateStr.replace(/\//g, '')}-${total}.png`;
          const file = new File([blob], fileName, { type: 'image/png' });
          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: course.name,
                text: `${total} (${diff >= 0 ? '+' : ''}${diff}) @ ${course.name}`,
              });
            } else {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = fileName;
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1500);
            }
          } catch (e) { /* user cancelled share — fine */ }
          resolve();
        }, 'image/png');
      });
    } finally {
      setSaving(false);
    }
  };

  // All templates are photo-based; differ in detail level and visual language.
  const templates = [
    { k: 'stamp',    label: 'ミニマル' },    // photo + small overlay chip (total only)
    { k: 'strip',    label: '詳細・下段' },  // photo + bottom dark strip with score + 9+9
    { k: 'cinema',   label: 'シネマ' },      // letterbox bars top/bottom
    { k: 'polaroid', label: 'ポラロイド' },  // photo in white frame, score on white margin
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)',
      zIndex: 100, overflowY: 'auto',
      padding: '30px 16px',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 420, margin: '0 auto',
        background: theme.bg,
        borderRadius: 10,
        padding: '14px 14px 18px',
        color: theme.text, fontFamily: FONT.sans,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{
              fontFamily: FONT.mono, fontSize: 9, color: theme.textTer,
              letterSpacing: 0.8, textTransform: 'uppercase',
            }}>Share</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>スコアカード</div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', color: theme.textSec, padding: 4,
          }}>{Icon.close(theme.textSec, 18)}</button>
        </div>

        {/* Template picker */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {templates.map(t => {
            const on = template === t.k;
            return (
              <button key={t.k} onClick={() => setTemplate(t.k)} style={{
                flex: 1, minWidth: 0, padding: '9px 0',
                background: on ? theme.text : 'transparent',
                color: on ? theme.bg : theme.text,
                border: `1px solid ${on ? 'transparent' : theme.border}`,
                borderRadius: 6,
                fontSize: 11.5, fontWeight: 500,
                fontFamily: FONT.sans, cursor: 'pointer',
              }}>{t.label}</button>
            );
          })}
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div ref={cardRef} style={{
            width: 360, height: 360, overflow: 'hidden',
            borderRadius: 4,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}>
            {template === 'stamp' && (
              <StampCard total={total} diff={diff} course={course} dateStr={dateStr} photoUrl={photoUrl}/>
            )}
            {template === 'strip' && (
              <StripCard
                total={total} diff={diff} course={course} dateStr={dateStr}
                holes={holes} symbolFor={symbolFor} photoUrl={photoUrl}
              />
            )}
            {template === 'cinema' && (
              <CinemaCard
                total={total} diff={diff} course={course} dateStr={dateStr}
                holes={holes} symbolFor={symbolFor} photoUrl={photoUrl}
              />
            )}
            {template === 'polaroid' && (
              <PolaroidCard
                total={total} diff={diff} course={course} dateStr={dateStr}
                photoUrl={photoUrl}
              />
            )}
          </div>
        </div>

        {/* Photo controls — always shown (all templates use photos) */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onPhotoSelect} style={{ display: 'none' }}/>
          <button onClick={pickPhoto} style={{
            flex: 1, padding: '10px 0',
            background: 'transparent', color: theme.text,
            border: `1px solid ${theme.border}`, borderRadius: 6,
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: FONT.sans,
          }}>{photoUrl ? '写真を変更' : '写真を選ぶ'}</button>
          {photoUrl && (
            <button onClick={clearPhoto} style={{
              padding: '10px 14px',
              background: 'transparent', color: theme.textSec,
              border: `1px solid ${theme.border}`, borderRadius: 6,
              fontSize: 12, cursor: 'pointer', fontFamily: FONT.sans,
            }}>消す</button>
          )}
        </div>

        {/* Save / share */}
        <button onClick={onSave} disabled={saving} style={{
          width: '100%', background: theme.text, color: theme.bg, border: 'none',
          padding: '13px 0', borderRadius: 8,
          fontFamily: FONT.sans, fontSize: 14, fontWeight: 600,
          cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.5 : 1,
        }}>{saving ? '生成中…' : '画像を保存 / シェア'}</button>
        <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer, marginTop: 8, textAlign: 'center' }}>
          対応端末ではネイティブの共有シートが開きます。それ以外は画像がダウンロードされます。
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Card templates — all photo-based, 360×360 at preview size,
// html2canvas scales 3× to produce 1080×1080 PNG.
// Visibility technique: backdrop-blur chips or solid bands.
// ─────────────────────────────────────────────────────────────

const _FAM_SANS = '"Noto Sans JP", "Inter", system-ui, sans-serif';
const _FAM_MONO = '"IBM Plex Mono", ui-monospace, monospace';

// Shared: photo background layer (falls back to subtle gradient).
function _photoBg(photoUrl) {
  return photoUrl
    ? `url(${photoUrl}) center / cover no-repeat`
    : 'linear-gradient(135deg, #223C2E 0%, #0E1B14 60%, #080A09 100%)';
}

// Shared: tiny hole-number + symbol strip used in strip / cinema templates.
function ScoreStripRow({ hs, symbolFor, fontColor = '#fff', numColor = 'rgba(255,255,255,0.5)' }) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: _FAM_MONO, fontSize: 7.5, color: numColor,
        letterSpacing: 0.4, marginBottom: 2,
      }}>
        {hs.map(h => (
          <span key={h.no} style={{ width: 14, textAlign: 'center' }}>{h.no}</span>
        ))}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: _FAM_MONO, fontSize: 13, fontWeight: 500, color: fontColor,
        lineHeight: 1,
      }}>
        {hs.map(h => (
          <span key={h.no} style={{ width: 14, textAlign: 'center' }}>{symbolFor(h)}</span>
        ))}
      </div>
    </div>
  );
}

// ─── 1) Stamp: photo + small score chip, minimal ────────────
function StampCard({ total, diff, course, dateStr, photoUrl }) {
  const diffColor = diff > 0 ? '#FFB88A' : diff < 0 ? '#88E8B5' : '#FFFFFF';
  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative', overflow: 'hidden',
      background: _photoBg(photoUrl),
      color: '#FFFFFF', fontFamily: _FAM_SANS,
    }}>
      {/* Top-right score chip — backdrop blur for visibility */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        padding: '8px 12px',
        background: 'rgba(10,10,10,0.55)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderRadius: 4,
        display: 'flex', alignItems: 'baseline', gap: 8,
      }}>
        <span style={{
          fontFamily: _FAM_MONO, fontSize: 24, fontWeight: 400, letterSpacing: -0.5, lineHeight: 1,
        }}>{total}</span>
        <span style={{
          fontFamily: _FAM_MONO, fontSize: 13, fontWeight: 500,
          color: diffColor,
        }}>{diff >= 0 ? '+' : ''}{diff}</span>
      </div>

      {/* Bottom-left meta chip */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        padding: '7px 10px',
        background: 'rgba(10,10,10,0.5)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderRadius: 4,
      }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: -0.1 }}>{course.name}</div>
        <div style={{
          fontFamily: _FAM_MONO, fontSize: 9.5, opacity: 0.75, marginTop: 2, letterSpacing: 0.3,
        }}>{dateStr}</div>
      </div>

      {/* FAIRWAY brand — bottom-right, subtle */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        padding: '5px 8px',
        background: 'rgba(10,10,10,0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 3,
        fontFamily: _FAM_MONO, fontSize: 8.5, letterSpacing: 1.8,
        fontWeight: 500, opacity: 0.85,
      }}>FAIRWAY</div>
    </div>
  );
}

// ─── 2) Strip: photo + bottom dark band with score + 9+9 ─────
function StripCard({ total, diff, course, dateStr, holes, symbolFor, photoUrl }) {
  const diffColor = diff > 0 ? '#FFB88A' : diff < 0 ? '#88E8B5' : '#FFFFFF';
  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);
  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative', overflow: 'hidden',
      background: _photoBg(photoUrl),
      color: '#FFFFFF', fontFamily: _FAM_SANS,
    }}>
      {/* Bottom detail band with gradient mask */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '70px 20px 18px',
        background: 'linear-gradient(to top, rgba(6,6,6,0.94) 55%, rgba(6,6,6,0.6) 80%, rgba(6,6,6,0))',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          {/* Left: big total */}
          <div style={{ flexShrink: 0 }}>
            <div style={{
              fontFamily: _FAM_MONO, fontSize: 60, fontWeight: 300,
              letterSpacing: -2.5, lineHeight: 0.9,
            }}>{total}</div>
            <div style={{
              fontFamily: _FAM_MONO, fontSize: 17, fontWeight: 500, marginTop: 4,
              color: diffColor,
            }}>{diff >= 0 ? '+' : ''}{diff}</div>
          </div>

          {/* Right: 9+9 symbol strip */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 6 }}>
              <ScoreStripRow hs={front} symbolFor={symbolFor}/>
            </div>
            <ScoreStripRow hs={back} symbolFor={symbolFor}/>
          </div>
        </div>

        <div style={{
          marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: -0.1 }}>{course.name}</span>
          <span style={{ fontFamily: _FAM_MONO, fontSize: 10, opacity: 0.7, letterSpacing: 0.3 }}>
            {dateStr}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 3) Cinema: black letterbox bars, course/date top, score+strip bottom ─
function CinemaCard({ total, diff, course, dateStr, holes, symbolFor, photoUrl }) {
  const diffColor = diff > 0 ? '#FFB88A' : diff < 0 ? '#88E8B5' : '#FFFFFF';
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#000000', color: '#FFFFFF',
      display: 'flex', flexDirection: 'column',
      fontFamily: _FAM_SANS,
    }}>
      {/* Top black bar */}
      <div style={{
        height: 52, padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: _FAM_MONO, fontSize: 10, letterSpacing: 2.2, fontWeight: 500,
          opacity: 0.9, textTransform: 'uppercase',
        }}>{course.name}</span>
        <span style={{
          fontFamily: _FAM_MONO, fontSize: 10, letterSpacing: 1.4, opacity: 0.7,
        }}>{dateStr}</span>
      </div>

      {/* Photo in the middle */}
      <div style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        background: _photoBg(photoUrl),
      }}/>

      {/* Bottom black bar with score + strip */}
      <div style={{
        height: 108, padding: '14px 20px 16px',
        display: 'flex', alignItems: 'flex-end', gap: 16,
        flexShrink: 0,
      }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{
            fontFamily: _FAM_MONO, fontSize: 10, letterSpacing: 2, opacity: 0.55, fontWeight: 500,
          }}>FAIRWAY</div>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 3,
          }}>
            <span style={{
              fontFamily: _FAM_MONO, fontSize: 46, fontWeight: 300,
              letterSpacing: -2, lineHeight: 1,
            }}>{total}</span>
            <span style={{
              fontFamily: _FAM_MONO, fontSize: 16, fontWeight: 500, color: diffColor,
            }}>{diff >= 0 ? '+' : ''}{diff}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 4 }}>
            <ScoreStripRow hs={holes.slice(0, 9)} symbolFor={symbolFor}/>
          </div>
          <ScoreStripRow hs={holes.slice(9, 18)} symbolFor={symbolFor}/>
        </div>
      </div>
    </div>
  );
}

// ─── 4) Polaroid: photo in white frame, score on bottom white margin ─
function PolaroidCard({ total, diff, course, dateStr, photoUrl }) {
  const diffColor = diff > 0 ? '#C2410C' : diff < 0 ? '#2A8D5C' : '#111111';
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#F6F4EF', // warm off-white polaroid stock
      color: '#111111', fontFamily: _FAM_SANS,
      padding: '18px 18px 14px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Photo area — takes ~67% vertical */}
      <div style={{
        flex: '0 0 230px',
        overflow: 'hidden',
        background: _photoBg(photoUrl),
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
      }}/>

      {/* Bottom white margin with score */}
      <div style={{
        flex: 1, paddingTop: 14,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{
            fontFamily: _FAM_MONO, fontSize: 42, fontWeight: 300,
            letterSpacing: -1.6, lineHeight: 1, color: '#111111',
          }}>{total}</span>
          <span style={{
            fontFamily: _FAM_MONO, fontSize: 18, fontWeight: 500, color: diffColor,
          }}>{diff >= 0 ? '+' : ''}{diff}</span>
          <span style={{ flex: 1 }}/>
          <span style={{
            fontFamily: _FAM_MONO, fontSize: 9, letterSpacing: 1.6, color: '#8a8a8a',
          }}>FAIRWAY</span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          paddingTop: 6,
        }}>
          <span style={{
            fontSize: 11.5, fontWeight: 500, letterSpacing: -0.1,
            // Slight handwritten-ish italic for polaroid vibe
            fontStyle: 'italic',
          }}>{course.name}</span>
          <span style={{
            fontFamily: _FAM_MONO, fontSize: 10.5, color: '#6B6B6B', letterSpacing: 0.3,
          }}>{dateStr}</span>
        </div>
      </div>
    </div>
  );
}

window.RoundResultScreen = RoundResultScreen;

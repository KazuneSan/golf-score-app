// screens/animation-gallery.jsx — drill animation direction showcase.
// All 4 variants show the same drill (3m putt) with shared improvements applied:
//  - motion trails (ghost balls)
//  - ease-out physics
//  - impact ripple + flash
//  - squash-stretch
//  - environmental reaction
//  - data overlay
// Users can see all 4 styles side by side and pick one.

function AnimationGalleryScreen({ theme, go }) {
  // Keyframes injected once per screen mount.
  const keyframes = `
    @keyframes agBall {
      0%   { transform: translateX(0) scale(1); opacity: 0; }
      5%   { transform: translateX(4px) scaleX(1.35) scaleY(0.75); opacity: 1; }
      15%  { transform: translateX(30px) scale(1); }
      80%  { transform: translateX(250px); }
      86%  { transform: translateX(258px) scaleX(0.92) scaleY(1.08); opacity: 1; }
      92%  { transform: translateX(260px) scale(1); }
      100% { transform: translateX(260px) scale(1); opacity: 0; }
    }
    @keyframes agBallCubic {
      0%   { transform: translateX(0); opacity: 0; }
      8%   { opacity: 1; }
      100% { transform: translateX(260px); opacity: 1; }
    }
    @keyframes agTrail {
      0%, 100% { opacity: 0; }
      15%,85%  { opacity: 0.45; }
    }
    @keyframes agRipple {
      0%, 80% { opacity: 0; r: 4; }
      84% { opacity: 0.85; r: 4; }
      100% { opacity: 0; r: 34; }
    }
    @keyframes agFlash {
      0%, 80% { opacity: 0; transform: scale(0.4); }
      84%     { opacity: 1; transform: scale(1); }
      95%     { opacity: 0; transform: scale(2.2); }
      100%    { opacity: 0; }
    }
    @keyframes agGridPulse {
      0%,100% { opacity: 0.08; }
      50%     { opacity: 0.16; }
    }
    @keyframes agBeat {
      0%,100% { opacity: 0.5; transform: scale(1); }
      50%     { opacity: 1;   transform: scale(1.2); }
    }
    @keyframes agClubArc {
      0%   { transform: rotate(-18deg); }
      50%  { transform: rotate( 14deg); }
      100% { transform: rotate(-18deg); }
    }
    @keyframes agOnomatopoeia {
      0%, 78% { opacity: 0; transform: translate(-50%, -50%) scale(0.5) rotate(-12deg); }
      84%     { opacity: 1; transform: translate(-50%, -50%) scale(1.1) rotate(-8deg); }
      95%     { opacity: 0.3; transform: translate(-50%, -50%) scale(1) rotate(-5deg); }
      100%    { opacity: 0; transform: translate(-50%, -50%) scale(1.3) rotate(0); }
    }
    @keyframes agSpeedLine {
      0%   { opacity: 0; transform: translateX(0); }
      20%  { opacity: 0.9; }
      80%  { opacity: 0.9; transform: translateX(230px); }
      100% { opacity: 0; transform: translateX(250px); }
    }
    @keyframes agStarBurst {
      0%, 80% { opacity: 0; transform: scale(0.3) rotate(0); }
      85%     { opacity: 1; transform: scale(1.1) rotate(20deg); }
      100%    { opacity: 0; transform: scale(1.8) rotate(60deg); }
    }
    @keyframes agFlag {
      0%,100% { transform: skewX(-2deg); }
      50%     { transform: skewX(3deg); }
    }
    @keyframes agTickHit {
      0%, 80% { fill-opacity: 0.3; }
      85%     { fill-opacity: 1; }
      100%    { fill-opacity: 0.3; }
    }
  `;

  const ANIM_DUR = '2.4s';
  const labelEl = (txt) => (
    <div style={{
      fontFamily: FONT.mono, fontSize: 10, color: theme.textTer,
      letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500,
    }}>{txt}</div>
  );

  return (
    <div style={{ padding: '0 16px 40px', color: theme.text, fontFamily: FONT.sans, letterSpacing: -0.1 }}>
      <style>{keyframes}</style>

      {/* Header */}
      <div style={{ paddingTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => go('home')} style={{
          background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: theme.text,
        }}>{Icon.chevL(theme.text, 16)}</button>
        <div>
          {labelEl('Drill · Animation Gallery')}
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>アニメーション方向性の比較</div>
        </div>
      </div>

      {/* Shared improvements note */}
      <div style={{
        marginTop: 14, padding: '10px 12px',
        background: theme.surfaceAlt, borderRadius: 6,
        fontSize: 11.5, color: theme.textSec, lineHeight: 1.6,
      }}>
        全バリアントに共通適用: モーショントレイル · ease-out物理 · 着弾リップル+フラッシュ · スクワッシュ&ストレッチ · 環境リアクション · データオーバーレイ
      </div>

      {/* All 4 variants */}
      <VariantCard title="A. テクニカル・インストラクター"
        desc="ダーク背景 + 距離マーカー + BPM/レップカウンター。Apple Fitness+ 系。情報量リッチ。"
        theme={theme}
      >
        <VariantATech dur={ANIM_DUR}/>
      </VariantCard>

      <VariantCard title="B. 漫画 · ストーリーボード"
        desc="集中線 + 擬音（「カツッ」）+ 星爆発。紙色の背景、遊び心あり。"
        theme={theme}
      >
        <VariantBManga dur={ANIM_DUR}/>
      </VariantCard>

      <VariantCard title="C. アイソメトリック 3D風"
        desc="斜め視点 + 影 + グリーンの質感 + 旗。深みのある本格派。"
        theme={theme}
      >
        <VariantCIso dur={ANIM_DUR}/>
      </VariantCard>

      <VariantCard title="D. フリップブック · 多重露光"
        desc="動きの軌跡を1枚に静止表示。時間経過を空間で見せる。情報系の見せ方。"
        theme={theme}
      >
        <VariantDFlip dur={ANIM_DUR}/>
      </VariantCard>

      <div style={{
        marginTop: 22, padding: '12px 14px',
        fontSize: 11.5, color: theme.textTer,
        background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 6,
        lineHeight: 1.65,
      }}>
        好きな方向を教えてください。A / B / C / D のどれか、または組み合わせでもOK。
        選んだらドリル詳細画面（drill-detail.jsx）に本格実装します。
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Card wrapper
// ─────────────────────────────────────────────────────────────
function VariantCard({ title, desc, theme, children }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: -0.2 }}>{title}</div>
      <div style={{ fontSize: 11, color: theme.textSec, marginTop: 4, lineHeight: 1.55 }}>{desc}</div>
      <div style={{
        marginTop: 10, borderRadius: 8, overflow: 'hidden',
        border: `1px solid ${theme.border}`,
      }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// A. Technical Instructor
//    Dark navy bg, grid, distance markers, BPM counter, warm accent
// ─────────────────────────────────────────────────────────────
function VariantATech({ dur }) {
  const BG = '#0B1220';
  const GRID = 'rgba(255,255,255,0.09)';
  const INK = '#FAFAFA';
  const ACCENT = '#F59E0B'; // warm amber
  const DIM = 'rgba(255,255,255,0.55)';
  return (
    <svg viewBox="0 0 360 200" style={{ width: '100%', height: 200, display: 'block', background: BG }}>
      {/* Grid */}
      <g style={{ animation: `agGridPulse ${dur} linear infinite` }}>
        {Array.from({ length: 14 }, (_, i) => (
          <line key={`v${i}`} x1={20 + i * 24} x2={20 + i * 24} y1={30} y2={160} stroke={GRID} strokeWidth={0.6}/>
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`h${i}`} x1={20} x2={332} y1={40 + i * 20} y2={40 + i * 20} stroke={GRID} strokeWidth={0.6}/>
        ))}
      </g>

      {/* Baseline with distance ticks */}
      <line x1={40} x2={320} y1={135} y2={135} stroke={DIM} strokeWidth={1}/>
      {[0, 1, 2, 3].map(i => {
        const x = 40 + (i / 3) * 280;
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={130} y2={140} stroke={DIM} strokeWidth={1}/>
            <text x={x} y={154} fontSize={8} fill={DIM} textAnchor="middle" fontFamily='"IBM Plex Mono", monospace' letterSpacing={0.3}>
              {i}m
            </text>
          </g>
        );
      })}

      {/* Target hole with ripple + flash */}
      <g>
        <circle cx={320} cy={135} r={8} fill="none" stroke={ACCENT} strokeWidth={1.5}/>
        <circle cx={320} cy={135} r={4} fill={ACCENT}
          style={{ animation: `agFlash ${dur} linear infinite`, transformOrigin: '320px 135px', transformBox: 'fill-box' }}/>
        <circle cx={320} cy={135} fill="none" stroke={ACCENT} strokeWidth={1.2}
          style={{ animation: `agRipple ${dur} ease-out infinite` }}/>
      </g>

      {/* Motion trail (5 ghosts) */}
      {[0, 1, 2, 3].map(i => (
        <circle key={i} cx={40} cy={135} r={4} fill={INK}
          style={{
            animation: `agBallCubic ${dur} cubic-bezier(0.2, 0.85, 0.2, 1) infinite, agTrail ${dur} linear infinite`,
            animationDelay: `${-0.08 * (i + 1)}s`,
            opacity: 0.5,
          }}/>
      ))}
      {/* Lead ball with squash-stretch */}
      <circle cx={40} cy={135} r={4.5} fill={INK}
        style={{
          transformOrigin: '40px 135px', transformBox: 'fill-box',
          animation: `agBall ${dur} cubic-bezier(0.2, 0.85, 0.2, 1) infinite`,
        }}/>

      {/* Club with pendulum swing */}
      <g style={{ transformOrigin: '40px 50px', animation: `agClubArc 0.79s ease-in-out infinite` }}>
        <line x1={40} y1={50} x2={40} y2={128} stroke={INK} strokeWidth={2}/>
        <rect x={32} y={126} width={20} height={5} rx={1} fill={INK}/>
      </g>

      {/* Data overlay: BPM + rep counter */}
      <g transform="translate(14, 14)">
        <rect width={82} height={22} rx={3} fill="rgba(0,0,0,0.35)" stroke={DIM} strokeWidth={0.5}/>
        <circle cx={10} cy={11} r={3} fill={ACCENT} style={{ animation: `agBeat 0.79s ease-in-out infinite`, transformOrigin: '10px 11px' }}/>
        <text x={20} y={15} fontSize={10} fill={INK} fontFamily='"IBM Plex Mono", monospace' letterSpacing={0.5}>
          BPM 76
        </text>
      </g>
      <g transform="translate(260, 14)">
        <rect width={86} height={22} rx={3} fill="rgba(0,0,0,0.35)" stroke={DIM} strokeWidth={0.5}/>
        <text x={43} y={15} fontSize={10} fill={INK} fontFamily='"IBM Plex Mono", monospace' textAnchor="middle" letterSpacing={0.3}>
          3 / 10 · 67%
        </text>
      </g>

      {/* Angle callout */}
      <text x={48} y={180} fontSize={8} fill={DIM} fontFamily='"IBM Plex Mono", monospace' letterSpacing={0.4}>
        FACE · 0.5° OPEN
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// B. Manga / Storyboard
//    Paper bg, rough strokes, speed lines, onomatopoeia, star burst
// ─────────────────────────────────────────────────────────────
function VariantBManga({ dur }) {
  const BG = '#F4ECDE';  // warm paper
  const INK = '#141414';
  const ACCENT = '#D64545'; // vermillion red
  return (
    <div style={{ position: 'relative', width: '100%', height: 200, background: BG }}>
      <svg viewBox="0 0 360 200" style={{ width: '100%', height: '100%', display: 'block' }}>
        {/* Ground line — wobble drawn path */}
        <path d="M 20 138 Q 90 139 180 137 T 340 138" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round"/>

        {/* Speed lines behind ball (3 horizontal lines, staggered) */}
        {[0, 1, 2].map(i => (
          <line key={i}
            x1={30} y1={130 + i * 6} x2={80} y2={130 + i * 6}
            stroke={INK} strokeWidth={1.6} strokeLinecap="round"
            style={{
              animation: `agSpeedLine ${dur} cubic-bezier(0.2, 0.85, 0.2, 1) infinite`,
              animationDelay: `${-0.05 * i}s`,
            }}/>
        ))}

        {/* Hole + star burst on impact */}
        <g>
          <ellipse cx={320} cy={138} rx={10} ry={4} fill={INK}/>
          <g style={{ transformOrigin: '320px 130px', transformBox: 'fill-box' }}>
            <polygon
              points="320,115 324,127 336,128 326,136 330,148 320,141 310,148 314,136 304,128 316,127"
              fill={ACCENT} stroke={INK} strokeWidth={1.2}
              style={{ animation: `agStarBurst ${dur} ease-out infinite`, transformOrigin: '320px 130px', transformBox: 'fill-box' }}/>
          </g>
        </g>

        {/* Trail ghost balls (brushy) */}
        {[0, 1, 2].map(i => (
          <circle key={i} cx={40} cy={138} r={5} fill="none" stroke={INK} strokeWidth={1.4}
            style={{
              animation: `agBallCubic ${dur} cubic-bezier(0.2, 0.85, 0.2, 1) infinite, agTrail ${dur} linear infinite`,
              animationDelay: `${-0.08 * (i + 1)}s`,
            }}/>
        ))}
        {/* Lead ball — thicker stroke */}
        <circle cx={40} cy={138} r={5.5} fill={BG} stroke={INK} strokeWidth={2}
          style={{
            transformOrigin: '40px 138px', transformBox: 'fill-box',
            animation: `agBall ${dur} cubic-bezier(0.2, 0.85, 0.2, 1) infinite`,
          }}/>

        {/* Club */}
        <g style={{ transformOrigin: '40px 48px', animation: `agClubArc 0.79s ease-in-out infinite` }}>
          <line x1={40} y1={48} x2={40} y2={130} stroke={INK} strokeWidth={2.5}/>
          <rect x={32} y={128} width={22} height={6} rx={1} fill={INK}/>
        </g>

        {/* Concentration lines radiating from hole — drawn as short strokes */}
        {[0, 1, 2, 3, 4, 5].map(i => {
          const ang = (i * 60) * Math.PI / 180;
          const x1 = 320 + Math.cos(ang) * 18;
          const y1 = 130 + Math.sin(ang) * 18;
          const x2 = 320 + Math.cos(ang) * 28;
          const y2 = 130 + Math.sin(ang) * 28;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={INK} strokeWidth={1.4} strokeLinecap="round"
              style={{ animation: `agStarBurst ${dur} ease-out infinite`, transformOrigin: '320px 130px' }}/>
          );
        })}
      </svg>

      {/* Onomatopoeia (HTML for rotation) */}
      <div style={{
        position: 'absolute', left: '88%', top: '45%',
        fontFamily: '"Noto Sans JP", system-ui',
        fontWeight: 900, fontSize: 22, color: INK, fontStyle: 'italic',
        letterSpacing: -0.5,
        animation: `agOnomatopoeia ${dur} ease-out infinite`,
        transformOrigin: 'center', pointerEvents: 'none',
      }}>カツッ</div>

      {/* Data overlay — handwritten feel */}
      <div style={{
        position: 'absolute', top: 10, left: 14,
        fontFamily: '"Noto Sans JP", system-ui', fontStyle: 'italic',
        fontSize: 11, fontWeight: 600, color: INK,
        padding: '3px 7px', background: 'rgba(255,255,255,0.6)',
        border: `1.5px solid ${INK}`, borderRadius: 3,
        transform: 'rotate(-2deg)',
      }}>3/10 成功！</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// C. Isometric 3D-like
//    Angled grid, shadow, green turf tile, flag, depth
// ─────────────────────────────────────────────────────────────
function VariantCIso({ dur }) {
  const BG_TOP = '#DEE5E0';
  const BG_BOT = '#C5CEC8';
  const GRASS = '#7AA889';
  const GRASS_D = '#4F7A61';
  const INK = '#1E1E1E';
  const SHADOW = 'rgba(0,0,0,0.25)';
  return (
    <svg viewBox="0 0 360 200" style={{ width: '100%', height: 200, display: 'block' }}>
      <defs>
        <linearGradient id="agCBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={BG_TOP}/>
          <stop offset="100%" stopColor={BG_BOT}/>
        </linearGradient>
        <linearGradient id="agCGrass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={GRASS}/>
          <stop offset="100%" stopColor={GRASS_D}/>
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={360} height={200} fill="url(#agCBg)"/>

      {/* Isometric turf tile — parallelogram */}
      <polygon points="30,160 330,160 360,190 0,190" fill="url(#agCGrass)" stroke={GRASS_D} strokeWidth={0.6}/>
      {/* Iso grid (parallel lines) */}
      {Array.from({ length: 8 }, (_, i) => {
        const t = i / 7;
        const x1 = 30 + t * 300;
        const x2 = 0 + t * 360;
        return (
          <line key={`g${i}`} x1={x1} y1={160} x2={x2} y2={190}
            stroke="rgba(0,0,0,0.12)" strokeWidth={0.7}/>
        );
      })}
      {Array.from({ length: 3 }, (_, i) => {
        const t = (i + 1) / 4;
        const y = 160 + t * 30;
        const x1 = 30 - t * 30;
        const x2 = 330 + t * 30;
        return (
          <line key={`h${i}`} x1={x1} y1={y} x2={x2} y2={y}
            stroke="rgba(0,0,0,0.12)" strokeWidth={0.7}/>
        );
      })}

      {/* Pin / flag in background */}
      <g transform="translate(310, 80)">
        <line x1={0} y1={85} x2={0} y2={20} stroke={INK} strokeWidth={1.5}/>
        <g style={{ transformOrigin: '0px 20px', animation: 'agFlag 1.8s ease-in-out infinite' }}>
          <polygon points="0,18 20,22 0,30" fill="#D64545" stroke={INK} strokeWidth={0.8}/>
        </g>
        {/* hole on green */}
        <ellipse cx={0} cy={85} rx={10} ry={4} fill={INK}/>
        <ellipse cx={0} cy={83} rx={8.5} ry={3.2} fill="#333"/>
      </g>

      {/* Hole impact — ripple on flat ellipse */}
      <ellipse cx={310} cy={165} rx={4} ry={1.5} fill="none" stroke="#fff" strokeWidth={1.2}
        style={{ animation: `agRipple ${dur} ease-out infinite` }}/>

      {/* Ball shadow — moves with ball */}
      <ellipse cx={40} cy={168} rx={6} ry={2} fill={SHADOW}
        style={{
          transformOrigin: '40px 168px', transformBox: 'fill-box',
          animation: `agBallCubic ${dur} cubic-bezier(0.2, 0.85, 0.2, 1) infinite`,
        }}/>

      {/* Trail balls */}
      {[0, 1, 2, 3].map(i => (
        <circle key={i} cx={40} cy={162} r={4} fill="#fff" stroke={INK} strokeWidth={0.5}
          style={{
            animation: `agBallCubic ${dur} cubic-bezier(0.2, 0.85, 0.2, 1) infinite, agTrail ${dur} linear infinite`,
            animationDelay: `${-0.08 * (i + 1)}s`,
          }}/>
      ))}
      {/* Lead ball */}
      <circle cx={40} cy={162} r={4.5} fill="#fff" stroke={INK} strokeWidth={0.8}
        style={{
          transformOrigin: '40px 162px', transformBox: 'fill-box',
          animation: `agBall ${dur} cubic-bezier(0.2, 0.85, 0.2, 1) infinite`,
        }}/>

      {/* Club (iso-skewed) */}
      <g style={{ transformOrigin: '40px 90px', animation: `agClubArc 0.79s ease-in-out infinite` }}>
        <line x1={40} y1={90} x2={40} y2={155} stroke={INK} strokeWidth={2}/>
        <g transform="translate(32, 152) skewX(-18)">
          <rect width={22} height={6} rx={1} fill={INK}/>
        </g>
      </g>

      {/* Data overlay */}
      <g transform="translate(14, 14)">
        <rect width={88} height={22} rx={3} fill="rgba(255,255,255,0.85)" stroke={INK} strokeWidth={0.6}/>
        <text x={8} y={15} fontSize={10} fill={INK} fontFamily='"IBM Plex Mono", monospace' letterSpacing={0.5}>
          3m · 3/10
        </text>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// D. Flipbook / Multi-exposure
//    Multiple ball stills at once; time axis underneath.
// ─────────────────────────────────────────────────────────────
function VariantDFlip({ dur }) {
  const BG = '#F7F7F5';
  const INK = '#141414';
  const DIM = '#9B9B9B';
  const ACCENT = '#2A8D5C';

  const positions = [
    { x: 40,  opacity: 0.25, t: '0.0s' },
    { x: 90,  opacity: 0.40, t: '0.1s' },
    { x: 140, opacity: 0.55, t: '0.2s' },
    { x: 190, opacity: 0.70, t: '0.4s' },
    { x: 240, opacity: 0.85, t: '0.6s' },
    { x: 290, opacity: 1.00, t: '0.9s' },
  ];

  return (
    <svg viewBox="0 0 360 200" style={{ width: '100%', height: 200, display: 'block', background: BG }}>
      {/* Baseline */}
      <line x1={30} x2={330} y1={115} y2={115} stroke={DIM} strokeWidth={0.8}/>

      {/* Arrow from start to end */}
      <defs>
        <marker id="agDArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill={INK}/>
        </marker>
      </defs>
      <line x1={44} y1={102} x2={300} y2={102} stroke={INK} strokeWidth={1.1} strokeDasharray="2 3"
        markerEnd="url(#agDArr)"/>

      {/* All ball stills */}
      {positions.map((p, i) => (
        <g key={i} style={{
          opacity: p.opacity,
          animation: `agGridPulse ${dur} ease-in-out infinite`,
          animationDelay: `${-0.1 * i}s`,
        }}>
          <circle cx={p.x} cy={115} r={5.2} fill="#fff" stroke={INK} strokeWidth={1.2}/>
          {/* subtle spin indicator */}
          <line x1={p.x - 2.5} y1={115} x2={p.x + 2.5} y2={115} stroke={INK} strokeWidth={0.7}/>
          <text x={p.x} y={98} fontSize={7.5} fill={DIM} textAnchor="middle" fontFamily='"IBM Plex Mono", monospace' letterSpacing={0.3}>
            {p.t}
          </text>
        </g>
      ))}

      {/* Target hole — last position is hole + small celebration */}
      <circle cx={320} cy={115} r={8} fill="none" stroke={ACCENT} strokeWidth={1.5}/>
      <circle cx={320} cy={115} r={4.5} fill={ACCENT}/>

      {/* Bottom time axis */}
      <line x1={30} x2={330} y1={155} y2={155} stroke={DIM} strokeWidth={0.6}/>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const x = 30 + t * 300;
        return (
          <g key={i}>
            <line x1={x} y1={152} x2={x} y2={158} stroke={DIM} strokeWidth={0.6}/>
            <text x={x} y={171} fontSize={8} fill={DIM} textAnchor="middle" fontFamily='"IBM Plex Mono", monospace'>
              {(t * 0.9).toFixed(1)}s
            </text>
          </g>
        );
      })}

      {/* Title / data */}
      <g transform="translate(14, 14)">
        <text fontSize={9} fill={DIM} fontFamily='"IBM Plex Mono", monospace' letterSpacing={1.2}>
          STROBE · 3M PUTT · 1/6 SHUTTER
        </text>
      </g>
      <g transform="translate(14, 30)">
        <text fontSize={11} fill={INK} fontFamily='"Noto Sans JP", system-ui' fontWeight={600} letterSpacing={-0.2}>
          0.9秒でホールイン
        </text>
      </g>

      {/* Impact flash at hole (subtle, since it's static representation) */}
      <circle cx={320} cy={115} fill="none" stroke={ACCENT} strokeWidth={1.1}
        style={{ animation: `agRipple ${dur} ease-out infinite` }}/>
    </svg>
  );
}

window.AnimationGalleryScreen = AnimationGalleryScreen;

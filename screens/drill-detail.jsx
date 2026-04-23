// screens/drill-detail.jsx — individual drill guide with animated diagram

// ─────────────────────────────────────────────────────────────
// Drill diagram — SVG top-down view + setup illustration
// Variants: 'setup-gate' | 'setup-straight' | 'setup-over' | 'setup-metronome' | 'setup-onehand'
// ─────────────────────────────────────────────────────────────
// Reps per drill variant — small cycling counter in top-right data chip.
const DRILL_REPS = {
  'setup-gate':      5,   // "5球 × 3セット" 感
  'setup-straight':  10,  // "10球連続成功まで"
  'setup-over':      5,   // "20球中 16球以上" — 5ずつ表示
  'setup-metronome': 4,   // "5球 × 4セット"
  'setup-onehand':   3,   // "3球"
};

function DrillDiagram({ variant, theme, view }) {
  // view: 'top' (俯瞰) | 'setup' (セットアップ/グリップ図)
  const W = 320, H = 260;
  const green = '#2F7D4A';
  const greenSoft = '#DCEBE2';
  const ink = theme.text;
  const sub = theme.textSec;
  const accent = theme.accent;

  // Live rep counter — cycles during top-view animation.
  // 2.4s = one full ball cycle → counter ticks up with each rep.
  const maxReps = DRILL_REPS[variant] || 5;
  const [rep, setRep] = React.useState(1);
  React.useEffect(() => {
    if (view !== 'top') return;
    const iv = setInterval(() => {
      setRep(r => (r % maxReps) + 1);
    }, 2400);
    return () => clearInterval(iv);
  }, [view, maxReps]);

  // Iso palette — fixed for visual identity regardless of app theme
  const BG_TOP = '#DEE5E0';
  const BG_BOT = '#C5CEC8';
  const GRASS = '#7AA889';
  const GRASS_D = '#4F7A61';
  const ISO_INK = '#1E1E1E';
  const ISO_DIM = 'rgba(0,0,0,0.55)';
  const ISO_GRID = 'rgba(0,0,0,0.12)';
  const SHADOW = 'rgba(0,0,0,0.28)';
  const FLAG_RED = '#D64545';

  // Iso animations: ease-out roll, trails, squash-stretch, ripple, flash, flag sway.
  const animCSS = `
    @keyframes drBallGate {
      0%   { transform: translateX(0) scale(1); opacity: 0; }
      5%   { transform: translateX(3px) scaleX(1.3) scaleY(0.78); opacity: 1; }
      14%  { transform: translateX(18px) scale(1); opacity: 1; }
      85%  { transform: translateX(190px) scale(1); opacity: 1; }
      92%  { transform: translateX(198px) scaleX(0.94) scaleY(1.06); opacity: 1; }
      100% { transform: translateX(200px) scale(1); opacity: 0; }
    }
    @keyframes drBallStraight {
      0%   { transform: translateX(0) scale(1); opacity: 0; }
      5%   { transform: translateX(3px) scaleX(1.3) scaleY(0.78); opacity: 1; }
      14%  { transform: translateX(18px) scale(1); opacity: 1; }
      85%  { transform: translateX(195px) scale(1); opacity: 1; }
      92%  { transform: translateX(203px) scaleX(0.94) scaleY(1.06); opacity: 1; }
      100% { transform: translateX(205px) scale(1); opacity: 0; }
    }
    @keyframes drBallOver {
      0%   { transform: translateX(0) scale(1); opacity: 0; }
      5%   { transform: translateX(3px) scaleX(1.3) scaleY(0.78); opacity: 1; }
      14%  { transform: translateX(18px) scale(1); opacity: 1; }
      70%  { transform: translateX(140px); opacity: 1; }
      82%  { transform: translateX(165px); opacity: 1; }
      92%  { transform: translateX(170px) scaleX(0.92) scaleY(1.1); opacity: 1; }
      100% { transform: translateX(170px) scale(1); opacity: 0; }
    }
    @keyframes drTrail {
      0%, 100% { opacity: 0; }
      18%, 82% { opacity: 0.4; }
    }
    @keyframes drBallShadow {
      0%   { transform: translateX(0); opacity: 0; }
      14%  { opacity: 0.55; }
      85%  { transform: translateX(195px); opacity: 0.55; }
      100% { transform: translateX(205px); opacity: 0; }
    }
    @keyframes drBallShadowGate {
      0%   { transform: translateX(0); opacity: 0; }
      14%  { opacity: 0.55; }
      85%  { transform: translateX(190px); opacity: 0.55; }
      100% { transform: translateX(200px); opacity: 0; }
    }
    @keyframes drBallShadowOver {
      0%   { transform: translateX(0); opacity: 0; }
      14%  { opacity: 0.55; }
      82%  { transform: translateX(165px); opacity: 0.55; }
      100% { transform: translateX(170px); opacity: 0; }
    }
    @keyframes drPendulum {
      0%   { transform: rotate(-18deg); }
      50%  { transform: rotate(18deg); }
      100% { transform: rotate(-18deg); }
    }
    @keyframes drPulse {
      0%,100% { opacity: 0.25; transform: scale(1); }
      50%     { opacity: 1;    transform: scale(1.15); }
    }
    @keyframes drRipple {
      0%, 85% { opacity: 0; r: 5; }
      88% { opacity: 0.9; r: 5; }
      100% { opacity: 0; r: 22; }
    }
    @keyframes drFlash {
      0%, 85% { opacity: 0; transform: scale(0.6); }
      89%     { opacity: 1; transform: scale(1); }
      100%    { opacity: 0; transform: scale(1.7); }
    }
    @keyframes drFlag {
      0%,100% { transform: skewX(-3deg); }
      50%     { transform: skewX(3deg); }
    }
    @keyframes drGateFlash {
      0%, 46% { opacity: 0; }
      50%, 58% { opacity: 1; }
      65%,100% { opacity: 0; }
    }
    @keyframes drZoneFlash {
      0%, 78% { opacity: 0; }
      82%, 90% { opacity: 0.7; }
      100%    { opacity: 0; }
    }
    @keyframes drTeePing {
      0%, 46% { transform: translateY(0); }
      52%     { transform: translateY(-3px); }
      60%     { transform: translateY(0); }
      100%    { transform: translateY(0); }
    }
    @keyframes drRepBadge {
      0%,85% { transform: scale(1); opacity: 1; }
      90%    { transform: scale(1.25); opacity: 1; }
      100%   { transform: scale(1); opacity: 1; }
    }
    @keyframes drBeatBall {
      0%,100% { transform: scale(1); }
      50%     { transform: scale(1.18); }
    }
    @keyframes drTrailingBall {
      0%,30% { transform: translateX(0) scale(1); opacity: 0; }
      35%    { transform: translateX(4px) scaleX(1.25) scaleY(0.8); opacity: 1; }
      45%    { transform: translateX(30px) scale(1); opacity: 1; }
      95%    { transform: translateX(210px); opacity: 1; }
      100%   { transform: translateX(210px); opacity: 0; }
    }
  `;

  // ── shared iso scene primitives (inline SVG snippets) ────────
  // Iso turf tile + perspective grid
  const isoGrass = (
    <g>
      <polygon points="40,150 280,150 320,260 0,260" fill="url(#drGrass)" stroke={GRASS_D} strokeWidth={0.5}/>
      {Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        const xTop = 40 + t * 240;
        const xBot = 0 + t * 320;
        return <line key={`v${i}`} x1={xTop} y1={150} x2={xBot} y2={260} stroke={ISO_GRID} strokeWidth={0.6}/>;
      })}
      {Array.from({ length: 4 }, (_, i) => {
        const t = (i + 1) / 5;
        const y = 150 + t * 110;
        const x1 = 40 - t * 40;
        const x2 = 280 + t * 40;
        return <line key={`h${i}`} x1={x1} y1={y} x2={x2} y2={y} stroke={ISO_GRID} strokeWidth={0.6}/>;
      })}
    </g>
  );
  // Iso hole (at given position). Has depth rim and ripple on impact.
  const isoHole = (cx, cy, ripple = false) => (
    <g>
      <ellipse cx={cx} cy={cy + 1.5} rx={10} ry={4.2} fill={ISO_INK}/>
      <ellipse cx={cx} cy={cy} rx={8.5} ry={3.4} fill="#303030"/>
      {ripple && (
        <ellipse cx={cx} cy={cy} rx={5} ry={2} fill="none" stroke="#fff" strokeWidth={1.2}
          style={{ animation: `drRipple 2.4s ease-out infinite` }}/>
      )}
    </g>
  );
  // Iso flag (pin in background). Subtly sways.
  const isoFlag = (x, y) => (
    <g transform={`translate(${x}, ${y})`}>
      <line x1={0} y1={0} x2={0} y2={-60} stroke={ISO_INK} strokeWidth={1.3}/>
      <g style={{ transformOrigin: '0px -60px', animation: 'drFlag 1.8s ease-in-out infinite' }}>
        <polygon points="0,-60 18,-55 0,-48" fill={FLAG_RED} stroke={ISO_INK} strokeWidth={0.8}/>
      </g>
    </g>
  );
  // Iso club (vertical shaft + iso-skewed head). Pendulum animation.
  const isoClub = (x, pivotY, dur = '0.79s') => (
    <g style={{ transformOrigin: `${x}px ${pivotY}px`, animation: `drPendulum ${dur} ease-in-out infinite` }}>
      <line x1={x} y1={pivotY} x2={x} y2={200} stroke={ISO_INK} strokeWidth={2.2}/>
      <g transform={`translate(${x - 10}, 198)`}>
        <polygon points="0,0 22,0 26,8 4,8" fill={ISO_INK}/>
      </g>
    </g>
  );
  // Defs (gradients) — one-time emit
  const isoDefs = (
    <defs>
      <linearGradient id="drBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={BG_TOP}/>
        <stop offset="100%" stopColor={BG_BOT}/>
      </linearGradient>
      <linearGradient id="drGrass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={GRASS}/>
        <stop offset="100%" stopColor={GRASS_D}/>
      </linearGradient>
    </defs>
  );

  if (view === 'setup') {
    // Setup illustration varies by drill
    if (variant === 'setup-gate') {
      // show gate-from-behind: 2 tees, ball between them, cup behind
      return (
        <svg viewBox="0 0 320 260" width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <radialGradient id="mat1" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor={greenSoft}/>
              <stop offset="100%" stopColor={theme.surface2}/>
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="320" height="260" fill="url(#mat1)"/>
          <text x="160" y="24" fontSize="11" fill={sub} textAnchor="middle" fontFamily="monospace">後方からの視点</text>
          {/* ball */}
          <circle cx="160" cy="200" r="12" fill="#fff" stroke="#000" strokeOpacity="0.15"/>
          <text x="160" y="235" fontSize="10" fill={sub} textAnchor="middle">ボール</text>
          {/* gate tees */}
          <g>
            <rect x="132" y="130" width="4" height="40" rx="2" fill={accent}/>
            <circle cx="134" cy="128" r="4" fill={accent}/>
            <text x="110" y="155" fontSize="10" fill={ink} textAnchor="end" fontWeight="600">ティー</text>
            <line x1="112" y1="152" x2="130" y2="148" stroke={sub} strokeWidth="1"/>
          </g>
          <g>
            <rect x="184" y="130" width="4" height="40" rx="2" fill={accent}/>
            <circle cx="186" cy="128" r="4" fill={accent}/>
          </g>
          {/* gap annotation */}
          <line x1="138" y1="112" x2="184" y2="112" stroke={ink} strokeWidth="1"/>
          <line x1="138" y1="108" x2="138" y2="116" stroke={ink} strokeWidth="1"/>
          <line x1="184" y1="108" x2="184" y2="116" stroke={ink} strokeWidth="1"/>
          <text x="161" y="104" fontSize="11" fill={ink} textAnchor="middle" fontWeight="700">ボール幅+2cm</text>
          {/* cup */}
          <ellipse cx="160" cy="60" rx="10" ry="4" fill="#111" opacity="0.75"/>
          <text x="178" y="63" fontSize="10" fill={sub}>カップ</text>
          {/* distance */}
          <text x="260" y="130" fontSize="10" fill={sub} textAnchor="end">ボールから 20cm 先</text>
        </svg>
      );
    }
    if (variant === 'setup-straight') {
      return (
        <svg viewBox="0 0 320 260" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="260" fill={greenSoft}/>
          <text x="160" y="24" fontSize="11" fill={sub} textAnchor="middle" fontFamily="monospace">真っ平らな 1m</text>
          {/* level indicator */}
          <rect x="40" y="120" width="240" height="20" rx="3" fill="#fff" stroke={theme.border}/>
          <circle cx="160" cy="130" r="6" fill="#7FBF8F" stroke={green}/>
          <line x1="154" y1="130" x2="166" y2="130" stroke={green} strokeWidth="1"/>
          <text x="160" y="166" fontSize="10" fill={sub} textAnchor="middle">水準器で確認</text>
          <circle cx="60" cy="200" r="10" fill="#fff" stroke="#000" strokeOpacity="0.2"/>
          <ellipse cx="260" cy="200" rx="10" ry="4" fill="#111" opacity="0.75"/>
          <line x1="75" y1="200" x2="245" y2="200" stroke={ink} strokeWidth="1" strokeDasharray="3 3"/>
          <text x="160" y="218" fontSize="11" fill={ink} textAnchor="middle" fontWeight="700">1m</text>
        </svg>
      );
    }
    if (variant === 'setup-over') {
      return (
        <svg viewBox="0 0 320 260" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="260" fill={greenSoft}/>
          <text x="160" y="24" fontSize="11" fill={sub} textAnchor="middle" fontFamily="monospace">仮想カップ + 目印</text>
          <circle cx="50" cy="150" r="11" fill="#fff" stroke="#000" strokeOpacity="0.2"/>
          <text x="50" y="182" fontSize="10" fill={sub} textAnchor="middle">スタート</text>
          {/* virtual cup tee */}
          <rect x="200" y="124" width="3" height="30" fill={accent}/>
          <circle cx="201.5" cy="122" r="4" fill={accent}/>
          <text x="201" y="172" fontSize="10" fill={ink} textAnchor="middle" fontWeight="600">カップ</text>
          {/* goal tee */}
          <rect x="248" y="124" width="3" height="30" fill={theme.warn}/>
          <circle cx="249.5" cy="122" r="4" fill={theme.warn}/>
          <text x="249" y="172" fontSize="10" fill={theme.warn} textAnchor="middle" fontWeight="600">+30cm</text>
          {/* distance */}
          <line x1="60" y1="150" x2="200" y2="150" stroke={ink} strokeWidth="1"/>
          <text x="130" y="142" fontSize="10" fill={ink} textAnchor="middle">3m</text>
          <line x1="200" y1="110" x2="249" y2="110" stroke={theme.warn} strokeWidth="1"/>
          <text x="224" y="102" fontSize="10" fill={theme.warn} textAnchor="middle" fontWeight="700">+30cm</text>
        </svg>
      );
    }
    if (variant === 'setup-metronome') {
      return (
        <svg viewBox="0 0 320 260" width="100%" height="100%">
          <style>{animCSS}</style>
          <rect x="0" y="0" width="320" height="260" fill={theme.surfaceAlt}/>
          <text x="160" y="26" fontSize="11" fill={sub} textAnchor="middle" fontFamily="monospace">76 BPM · 2拍ストローク</text>
          {/* Metronome body */}
          <polygon points="160,60 130,210 190,210" fill="#fff" stroke={theme.border} strokeWidth="2"/>
          {/* arm */}
          <g style={{ transformOrigin: '160px 210px', animation: 'drillPendulum 0.79s ease-in-out infinite' }}>
            <line x1="160" y1="210" x2="160" y2="75" stroke={ink} strokeWidth="3"/>
            <circle cx="160" cy="90" r="6" fill={accent}/>
          </g>
          {/* scale */}
          <text x="160" y="234" fontSize="11" fill={ink} textAnchor="middle" fontWeight="700" fontFamily="monospace">♩ = 76</text>
          {/* beat */}
          <g style={{ transformOrigin: '50px 160px' }}>
            <text x="50" y="140" fontSize="11" fill={sub} textAnchor="middle">拍1</text>
            <text x="50" y="155" fontSize="10" fill={sub} textAnchor="middle">バック</text>
            <circle cx="50" cy="175" r="6" fill={accent} style={{ animation: 'drillPulse 0.79s ease-in-out infinite' }}/>
          </g>
          <g>
            <text x="270" y="140" fontSize="11" fill={sub} textAnchor="middle">拍2</text>
            <text x="270" y="155" fontSize="10" fill={sub} textAnchor="middle">インパクト</text>
            <circle cx="270" cy="175" r="6" fill={accent} style={{ animation: 'drillPulse 0.79s ease-in-out infinite', animationDelay: '0.395s' }}/>
          </g>
        </svg>
      );
    }
    if (variant === 'setup-onehand') {
      return (
        <svg viewBox="0 0 320 260" width="100%" height="100%">
          <rect x="0" y="0" width="320" height="260" fill={theme.surfaceAlt}/>
          <text x="160" y="26" fontSize="11" fill={sub} textAnchor="middle" fontFamily="monospace">右手1本グリップ（右利き）</text>
          {/* club shaft */}
          <line x1="160" y1="60" x2="160" y2="210" stroke={ink} strokeWidth="3"/>
          {/* head */}
          <rect x="140" y="205" width="40" height="12" rx="2" fill={ink}/>
          {/* grip */}
          <rect x="154" y="60" width="12" height="70" rx="4" fill={theme.text} opacity="0.15"/>
          {/* hand (simplified) */}
          <ellipse cx="182" cy="100" rx="22" ry="14" fill="#F2C6A3" stroke="#B88250" strokeWidth="1"/>
          <text x="222" y="104" fontSize="11" fill={ink} fontWeight="700">右手のみ</text>
          {/* X over left */}
          <g transform="translate(90,100)">
            <circle r="18" fill="none" stroke={theme.danger} strokeWidth="2"/>
            <line x1="-10" y1="-10" x2="10" y2="10" stroke={theme.danger} strokeWidth="2"/>
            <line x1="-10" y1="10" x2="10" y2="-10" stroke={theme.danger} strokeWidth="2"/>
            <text x="0" y="38" fontSize="10" fill={theme.danger} textAnchor="middle">左手はポケット</text>
          </g>
        </svg>
      );
    }
    return null;
  }

  // view === 'top' : isometric animated scene
  // Common ball-trail + lead ball (DRY)
  const ballWithTrail = (bAnim, shadowAnim) => (
    <g>
      {/* shadow follows the ball, slightly below */}
      <ellipse cx={60} cy={212} rx={6} ry={2} fill={SHADOW}
        style={{
          transformOrigin: '60px 212px', transformBox: 'fill-box',
          animation: `${shadowAnim} 2.4s cubic-bezier(0.2, 0.85, 0.2, 1) infinite`,
        }}/>
      {/* ghost balls (trails) */}
      {[0, 1, 2, 3].map(i => (
        <circle key={i} cx={60} cy={205} r={4.2} fill="#fff" stroke={ISO_INK} strokeWidth={0.5}
          style={{
            animation: `${bAnim} 2.4s cubic-bezier(0.2, 0.85, 0.2, 1) infinite, drTrail 2.4s linear infinite`,
            animationDelay: `${-0.08 * (i + 1)}s`,
          }}/>
      ))}
      {/* lead ball with squash-stretch */}
      <circle cx={60} cy={205} r={5} fill="#fff" stroke={ISO_INK} strokeWidth={0.8}
        style={{
          transformOrigin: '60px 205px', transformBox: 'fill-box',
          animation: `${bAnim} 2.4s cubic-bezier(0.2, 0.85, 0.2, 1) infinite`,
        }}/>
    </g>
  );

  // Data chip (top-left)
  const dataChip = (text) => (
    <g transform="translate(14, 14)">
      <rect width={98} height={22} rx={3} fill="rgba(255,255,255,0.88)" stroke={ISO_INK} strokeWidth={0.5}/>
      <text x={8} y={15} fontSize={10} fill={ISO_INK} fontFamily='"IBM Plex Mono", monospace' letterSpacing={0.3}>
        {text}
      </text>
    </g>
  );

  // Rep badge (top-right) — live counter that ticks with each ball cycle
  const repBadge = (
    <g transform={`translate(${W - 14 - 68}, 14)`}>
      <rect width={68} height={22} rx={3} fill={ISO_INK} stroke={ISO_INK} strokeWidth={0.5}/>
      <text x={6} y={15} fontSize={9} fill="rgba(255,255,255,0.55)" fontFamily='"IBM Plex Mono", monospace' letterSpacing={0.6}>
        REP
      </text>
      <g key={rep} style={{
        transformOrigin: `${28}px ${11}px`, transformBox: 'fill-box',
        animation: 'drRepBadge 400ms ease-out both',
      }}>
        <text x={30} y={15} fontSize={11} fill="#fff"
          fontFamily='"IBM Plex Mono", monospace' fontWeight={600} letterSpacing={0.3}>
          {rep}
        </text>
      </g>
      <text x={42} y={15} fontSize={9} fill="rgba(255,255,255,0.5)" fontFamily='"IBM Plex Mono", monospace'>
        /{maxReps}
      </text>
    </g>
  );

  if (variant === 'setup-gate') {
    return (
      <svg viewBox="0 0 320 260" width="100%" height="100%" style={{ display: 'block' }}>
        <style>{animCSS}</style>
        {isoDefs}
        <rect x={0} y={0} width={320} height={260} fill="url(#drBg)"/>
        {isoGrass}

        {/* Flag in background (behind the hole) */}
        {isoFlag(265, 205)}

        {/* Hole at end */}
        {isoHole(260, 205, true)}

        {/* Gate tees (standing up from grass) */}
        {[150, 180].map(x => (
          <g key={x}>
            <line x1={x} y1={184} x2={x} y2={211} stroke={ISO_INK} strokeWidth={1.8}/>
            <circle cx={x} cy={182} r={3.5} fill={ISO_INK}/>
          </g>
        ))}
        {/* Gate label */}
        <line x1={150} y1={176} x2={180} y2={176} stroke={ISO_INK} strokeWidth={0.8}/>
        <line x1={150} y1={173} x2={150} y2={179} stroke={ISO_INK} strokeWidth={0.8}/>
        <line x1={180} y1={173} x2={180} y2={179} stroke={ISO_INK} strokeWidth={0.8}/>
        <text x={165} y={170} fontSize={9} fill={ISO_INK} textAnchor="middle" fontFamily='"IBM Plex Mono", monospace' fontWeight={600}>
          +2cm
        </text>

        {/* Gate SUCCESS FLASH — green glow between tees when ball passes through */}
        <rect x={148} y={184} width={34} height={28} rx={2}
          fill="rgba(95,196,139,0.85)"
          style={{ animation: `drGateFlash ${'2.4s'} ease-out infinite`, opacity: 0 }}/>
        <text x={165} y={204} fontSize={11} fill="#1A3A2A" textAnchor="middle"
          fontFamily='"IBM Plex Mono", monospace' fontWeight={700}
          style={{ animation: `drGateFlash ${'2.4s'} ease-out infinite`, opacity: 0 }}>
          ✓
        </text>
        {/* Gate tees slightly ping when ball passes */}
        <g style={{ animation: `drTeePing ${'2.4s'} ease-out infinite` }}>
          {[150, 180].map(x => (
            <circle key={`ping-${x}`} cx={x} cy={182} r={5} fill="none"
              stroke="#5FC48B" strokeWidth={1.5}
              style={{ animation: `drGateFlash ${'2.4s'} ease-out infinite`, opacity: 0 }}/>
          ))}
        </g>

        {/* Ball animation (primary + trailing second ball for sequence feel) */}
        {ballWithTrail('drBallGate', 'drBallShadowGate')}

        {dataChip('GATE · 1m')}
        {repBadge}
      </svg>
    );
  }

  if (variant === 'setup-straight') {
    return (
      <svg viewBox="0 0 320 260" width="100%" height="100%" style={{ display: 'block' }}>
        <style>{animCSS}</style>
        {isoDefs}
        <rect x={0} y={0} width={320} height={260} fill="url(#drBg)"/>
        {isoGrass}

        {isoFlag(270, 205)}
        {isoHole(265, 205, true)}

        {/* Subtle guide line on grass */}
        <line x1={60} x2={260} y1={205} y2={205} stroke="rgba(255,255,255,0.35)" strokeWidth={0.8} strokeDasharray="2 4"/>

        {/* Distance marker */}
        <text x={160} y={225} fontSize={9} fill={ISO_INK} textAnchor="middle"
          fontFamily='"IBM Plex Mono", monospace' fontWeight={600} letterSpacing={0.3}>
          ← 1 m →
        </text>

        {ballWithTrail('drBallStraight', 'drBallShadow')}

        {/* Success pop at the hole */}
        <text x={265} y={182} fontSize={14} fill="#5FC48B" textAnchor="middle"
          fontFamily='"IBM Plex Mono", monospace' fontWeight={700}
          style={{ transformOrigin: '265px 190px', transformBox: 'fill-box',
                   animation: `drGateFlash 2.4s ease-out infinite`, opacity: 0 }}>
          ✓
        </text>

        {dataChip('STRAIGHT · 1m')}
        {repBadge}
      </svg>
    );
  }

  if (variant === 'setup-over') {
    return (
      <svg viewBox="0 0 320 260" width="100%" height="100%" style={{ display: 'block' }}>
        <style>{animCSS}</style>
        {isoDefs}
        <rect x={0} y={0} width={320} height={260} fill="url(#drBg)"/>
        {isoGrass}

        {/* Flag further in the distance */}
        {isoFlag(205, 205)}

        {/* Hole at x=195, target marker ring at x=230 */}
        {isoHole(195, 205, false)}

        {/* Target zone band (past hole) */}
        <path d={`M 198 200 Q 230 198 228 212 Q 230 214 198 212 Z`}
          fill={theme.warn} opacity="0.22"/>

        {/* Target marker (dashed circle) */}
        <ellipse cx={230} cy={205} rx={8} ry={3} fill="none" stroke={theme.warn} strokeWidth={1.5} strokeDasharray="3 3"/>
        <text x={230} y={188} fontSize={9} fill={theme.warn} textAnchor="middle" fontFamily='"IBM Plex Mono", monospace' fontWeight={700}>
          +30cm
        </text>

        {/* Zone success flash when ball stops */}
        <ellipse cx={230} cy={205} rx={14} ry={6}
          fill="rgba(95,196,139,0.5)"
          style={{ animation: `drZoneFlash 2.4s ease-out infinite`, opacity: 0 }}/>
        <ellipse cx={230} cy={205} rx={8} ry={3} fill="#5FC48B" stroke="#2A8D5C" strokeWidth={1.2}
          style={{ animation: `drZoneFlash 2.4s ease-out infinite`, opacity: 0 }}/>

        {ballWithTrail('drBallOver', 'drBallShadowOver')}

        {dataChip('OVER · 3m + 30cm')}
        {repBadge}
      </svg>
    );
  }

  if (variant === 'setup-metronome') {
    return (
      <svg viewBox="0 0 320 260" width="100%" height="100%" style={{ display: 'block' }}>
        <style>{animCSS}</style>
        {isoDefs}
        <rect x={0} y={0} width={320} height={260} fill="url(#drBg)"/>
        {isoGrass}

        {/* Ball at center of grass — pulses with the beat */}
        <ellipse cx={160} cy={217} rx={6} ry={2} fill={SHADOW}/>
        <circle cx={160} cy={210} r={5} fill="#fff" stroke={ISO_INK} strokeWidth={0.8}
          style={{ transformOrigin: '160px 210px', transformBox: 'fill-box',
                   animation: 'drBeatBall 0.79s ease-in-out infinite' }}/>

        {/* Pendulum club from top (hinge near top) */}
        <g style={{ transformOrigin: '160px 80px', animation: 'drPendulum 0.79s ease-in-out infinite' }}>
          <line x1={160} y1={80} x2={160} y2={205} stroke={ISO_INK} strokeWidth={2.2}/>
          <g transform="translate(150, 203)">
            <polygon points="0,0 22,0 26,8 4,8" fill={ISO_INK}/>
          </g>
        </g>

        {/* Beat dots on sides (above grass horizon) */}
        <g>
          <circle cx={50} cy={95} r={6} fill={theme.warn}
            style={{ transformOrigin: '50px 95px', transformBox: 'fill-box',
                     animation: 'drPulse 0.79s ease-in-out infinite' }}/>
          <text x={50} y={78} fontSize={9} fill={ISO_INK} textAnchor="middle" fontFamily='"IBM Plex Mono", monospace' fontWeight={600}>
            BEAT 1
          </text>
          <text x={50} y={118} fontSize={9} fill={theme.textSec} textAnchor="middle" fontFamily='"IBM Plex Mono", monospace'>
            back
          </text>
        </g>
        <g>
          <circle cx={270} cy={95} r={6} fill={theme.warn}
            style={{ transformOrigin: '270px 95px', transformBox: 'fill-box',
                     animation: 'drPulse 0.79s ease-in-out infinite', animationDelay: '0.395s' }}/>
          <text x={270} y={78} fontSize={9} fill={ISO_INK} textAnchor="middle" fontFamily='"IBM Plex Mono", monospace' fontWeight={600}>
            BEAT 2
          </text>
          <text x={270} y={118} fontSize={9} fill={theme.textSec} textAnchor="middle" fontFamily='"IBM Plex Mono", monospace'>
            impact
          </text>
        </g>

        {dataChip('METRONOME · ♩=76')}
        {repBadge}
      </svg>
    );
  }

  if (variant === 'setup-onehand') {
    return (
      <svg viewBox="0 0 320 260" width="100%" height="100%" style={{ display: 'block' }}>
        <style>{animCSS}</style>
        {isoDefs}
        <rect x={0} y={0} width={320} height={260} fill="url(#drBg)"/>
        {isoGrass}

        {isoFlag(270, 205)}
        {isoHole(265, 205, false)}

        {/* Ball shadow + ball (stationary) at grass center */}
        <ellipse cx={160} cy={217} rx={6} ry={2} fill={SHADOW}/>
        <circle cx={160} cy={210} r={5} fill="#fff" stroke={ISO_INK} strokeWidth={0.8}/>

        {/* One-handed pendulum club (slightly slower swing) */}
        <g style={{ transformOrigin: '160px 70px', animation: 'drPendulum 1s ease-in-out infinite' }}>
          <line x1={160} y1={70} x2={160} y2={205} stroke={ISO_INK} strokeWidth={2.2}/>
          <g transform="translate(150, 203)">
            <polygon points="0,0 22,0 26,8 4,8" fill={ISO_INK}/>
          </g>
        </g>

        {/* "Left hand off" marker — small badge */}
        <g transform="translate(96, 90)">
          <circle r={14} fill="none" stroke={theme.danger} strokeWidth={1.6}/>
          <line x1={-8} y1={-8} x2={8} y2={8} stroke={theme.danger} strokeWidth={1.6}/>
          <line x1={-8} y1={8}  x2={8} y2={-8} stroke={theme.danger} strokeWidth={1.6}/>
          <text x={0} y={32} fontSize={9} fill={theme.danger} textAnchor="middle"
            fontFamily='"IBM Plex Mono", monospace' fontWeight={600}>LH OFF</text>
        </g>

        {dataChip('ONE-HAND')}
        {repBadge}
      </svg>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Main drill detail screen
// ─────────────────────────────────────────────────────────────
function DrillDetailScreen({ theme, drill, isDone, onToggleDone, onBack }) {
  const [view, setView] = React.useState('top');
  const [tab, setTab] = React.useState('steps'); // steps | mistakes | check

  // Narration ticker — cycles through drill.steps alongside the animation
  const [narIdx, setNarIdx] = React.useState(0);
  React.useEffect(() => {
    if (!drill?.steps || drill.steps.length === 0) return;
    const iv = setInterval(() => {
      setNarIdx(i => (i + 1) % drill.steps.length);
    }, 2800);
    return () => clearInterval(iv);
  }, [drill?.steps]);

  if (!drill) {
    return (
      <div style={{ padding: 40, color: theme.text, fontFamily: FONT.sans }}>
        解説データがまだありません。
        <TapBtn theme={theme} variant="ghost" onClick={onBack} style={{ marginTop: 20 }}>戻る</TapBtn>
      </div>
    );
  }

  const currentStep = drill.steps?.[narIdx];
  const tabs = [
    { k: 'steps',    label: '手順', count: drill.steps?.length || 0 },
    { k: 'mistakes', label: 'ミス', count: drill.mistakes?.length || 0 },
    { k: 'check',    label: 'チェック', count: drill.checkpoints?.length || 0 },
  ].filter(t => t.count > 0);

  // Inject once — narration fade keyframe
  const detailKeyframes = `
    @keyframes ddNarrIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  `;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: theme.text, fontFamily: FONT.sans }}>
      <style>{detailKeyframes}</style>

      {/* Compact header */}
      <div style={{ padding: '4px 16px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, color: theme.textSec, fontSize: 13,
        }}>
          {Icon.chevL(theme.textSec, 16)} 戻る
        </button>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>ドリル解説</div>
        <div style={{ width: 40 }}/>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }} className="hide-scroll">
        {/* Title row — pill + time + name, compact */}
        <div style={{ padding: '2px 16px 10px' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <Pill theme={theme} tone="accent">{drill.condition}</Pill>
            <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: theme.textSec, letterSpacing: 0.3 }}>
              {drill.time}
            </span>
            {drill.equipment?.length > 0 && (
              <span style={{ fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, marginLeft: 4, letterSpacing: 0.3 }}>
                · {drill.equipment.join(' / ')}
              </span>
            )}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.2 }}>
            {drill.name}
          </div>
          {drill.purpose && (
            <div style={{ fontSize: 12, color: theme.textSec, marginTop: 4, lineHeight: 1.55 }}>
              {drill.purpose}
            </div>
          )}
        </div>

        {/* Hero: animated diagram + narration ticker */}
        <div style={{ padding: '0 16px 12px' }}>
          <Card theme={theme} padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ aspectRatio: '320/260', background: theme.surfaceAlt }}>
              <DrillDiagram variant={drill.setup} theme={theme} view={view}/>
            </div>

            {/* Narration row — cycles synchronized with animation loop */}
            {currentStep && (
              <div
                key={narIdx}
                style={{
                  display: 'flex', gap: 12, alignItems: 'center',
                  padding: '10px 14px',
                  background: theme.surface, borderTop: `1px solid ${theme.border}`,
                  animation: 'ddNarrIn 320ms ease-out both',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: theme.text, color: theme.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT.mono, fontSize: 12, fontWeight: 700,
                }}>{currentStep.n}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: -0.1 }}>{currentStep.t}</div>
                  <div style={{
                    fontSize: 11, color: theme.textSec, marginTop: 2, lineHeight: 1.45,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>{currentStep.d}</div>
                </div>
                {/* Step dots */}
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  {drill.steps.map((_, i) => (
                    <div key={i} style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: i === narIdx ? theme.text : theme.border,
                      transition: 'background .2s',
                    }}/>
                  ))}
                </div>
              </div>
            )}

            {/* View toggle */}
            <div style={{ display: 'flex', borderTop: `1px solid ${theme.border}` }}>
              {[
                { k: 'top',   label: '俯瞰' },
                { k: 'setup', label: 'セットアップ' },
              ].map(t => (
                <button key={t.k} onClick={()=>setView(t.k)} style={{
                  flex: 1, padding: '10px 8px',
                  background: view===t.k ? theme.surface : 'transparent',
                  color: view===t.k ? theme.text : theme.textSec,
                  border: 'none',
                  borderRight: t.k==='top' ? `1px solid ${theme.border}` : 'none',
                  fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                }}>{t.label}ビュー</button>
              ))}
            </div>
          </Card>
        </div>

        {/* Pass condition — compact inline banner */}
        {drill.pass && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{
              padding: '10px 12px',
              background: theme.accentSoft, color: theme.accentInk,
              borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: theme.text, color: theme.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}>★</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: FONT.mono, fontSize: 9, letterSpacing: 0.8,
                  textTransform: 'uppercase', opacity: 0.7, fontWeight: 700,
                }}>合格ライン</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{drill.pass.text}</div>
                {drill.pass.sub && (
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{drill.pass.sub}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs — collapse 3 sections into 1 */}
        {tabs.length > 0 && (
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{
              display: 'flex', gap: 0,
              borderBottom: `1px solid ${theme.border}`,
              marginBottom: 10,
            }}>
              {tabs.map(t => {
                const on = tab === t.k;
                return (
                  <button key={t.k} onClick={() => setTab(t.k)} style={{
                    flex: 1, padding: '9px 0',
                    background: 'transparent', border: 'none',
                    color: on ? theme.text : theme.textSec,
                    fontFamily: FONT.sans, fontSize: 12.5,
                    fontWeight: on ? 700 : 500, cursor: 'pointer',
                    borderBottom: `2px solid ${on ? theme.text : 'transparent'}`,
                    marginBottom: -1, letterSpacing: -0.1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <span>{t.label}</span>
                    <span style={{
                      fontFamily: FONT.mono, fontSize: 10,
                      color: on ? theme.textSec : theme.textTer,
                    }}>{t.count}</span>
                  </button>
                );
              })}
            </div>

            {tab === 'steps' && drill.steps && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {drill.steps.map(s => (
                  <div key={s.n} style={{ display: 'flex', gap: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: theme.text, color: theme.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, marginTop: 1,
                    }}>{s.n}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>{s.t}</div>
                      <div style={{ fontSize: 12, color: theme.textSec, marginTop: 2, lineHeight: 1.55 }}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'mistakes' && drill.mistakes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {drill.mistakes.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, padding: '10px 12px',
                    background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 6,
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                      background: 'rgba(178,58,42,0.1)', color: theme.danger,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>×</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{m.t}</div>
                      <div style={{ fontSize: 11.5, color: theme.textSec, marginTop: 2, lineHeight: 1.5 }}>{m.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'check' && drill.checkpoints && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {drill.checkpoints.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
                      background: 'rgba(47,125,74,0.15)', color: theme.good,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{Icon.check(theme.good, 10)}</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.55, flex: 1 }}>{c}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ height: 8 }}/>
      </div>

      {/* Footer — compact */}
      <div style={{ padding: '10px 16px 12px', display: 'flex', gap: 8, borderTop: `1px solid ${theme.border}` }}>
        <TapBtn theme={theme} variant="ghost" onClick={onBack} style={{ minWidth: 68, padding: '11px 0' }}>閉じる</TapBtn>
        <TapBtn theme={theme} variant={isDone ? 'ghost' : 'primary'} full onClick={onToggleDone} style={{ padding: '11px 0' }}>
          {isDone ? '✓ 完了済み（取り消し）' : '完了にする'}
        </TapBtn>
      </div>
    </div>
  );
}

function Section({ theme, label, children }) {
  return (
    <div style={{ padding: '8px 16px 14px' }}>
      <div style={{ fontSize: 11, color: theme.textSec, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

window.DrillDetailScreen = DrillDetailScreen;

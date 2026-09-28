// RUNE WARS — hand-written SVG-иконки узлов карты (НЕ AI-сгенерированные)

import type { NodeType } from "@/game/map/MapGenerator";

const STROKE = "#1a0a1e";
const VIEW = "0 0 48 48";

function Shadow({ id }: { id: string }) {
  return (
    <filter id={`${id}-sh`} x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.6" />
    </filter>
  );
}

export function MapNodeIcon({ type, size = 44 }: { type: NodeType; size?: number }) {
  const id = `mn-${type}`;
  const common = { width: size, height: size, viewBox: VIEW, xmlns: "http://www.w3.org/2000/svg" };
  return (
    <svg {...common} style={{ display: "block" }}>
      <defs>
        <Shadow id={id} />
      </defs>
      <g filter={`url(#${id}-sh)`}>
        {renderIcon(type, id)}
      </g>
    </svg>
  );
}

function renderIcon(type: NodeType, id: string): React.ReactNode {
  switch (type) {
    case "start":
      return (
        <g key="s">
          <polygon
            points="24,4 29,17 43,17 32,26 36,40 24,32 12,40 16,26 5,17 19,17"
            fill="#ffd700"
            stroke={STROKE}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polygon
            points="24,8 27,18 38,18 30,25 33,35 24,29 15,35 18,25 10,18 21,18"
            fill="#fff8dc"
            opacity="0.5"
          />
        </g>
      );
    case "battle":
      return (
        <g key="b">
          {/* меч */}
          <g transform="translate(-4,-2) rotate(-20 24 24)">
            <rect x="21" y="8" width="6" height="28" fill="#a8b8d8" stroke={STROKE} strokeWidth="2" />
            <rect x="16" y="34" width="16" height="4" fill="#c9a227" stroke={STROKE} strokeWidth="1.5" />
            <rect x="22" y="38" width="4" height="6" fill="#5a2a0a" stroke={STROKE} strokeWidth="1" />
          </g>
          {/* щит */}
          <g transform="translate(8,4)">
            <path d="M28 16 L40 18 L40 30 L34 38 L28 30 Z" fill="#d4a52a" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
            <circle cx="34" cy="24" r="3" fill="#8b1a1a" />
          </g>
        </g>
      );
    case "elite":
      return (
        <g key="e">
          {/* череп */}
          <ellipse cx="24" cy="20" rx="13" ry="12" fill="#f0e6d0" stroke={STROKE} strokeWidth="2" />
          <rect x="16" y="28" width="16" height="8" fill="#f0e6d0" stroke={STROKE} strokeWidth="2" />
          <circle cx="19" cy="20" r="4" fill={STROKE} />
          <circle cx="29" cy="20" r="4" fill={STROKE} />
          {/* корона */}
          <path d="M14 8 L18 16 L24 6 L30 16 L34 8 L34 14 L14 14 Z" fill="#b8291a" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          <rect x="14" y="14" width="20" height="3" fill="#b8291a" stroke={STROKE} strokeWidth="1" />
          {/* зубы */}
          <rect x="18" y="28" width="2" height="6" fill="#f0e6d0" />
          <rect x="23" y="28" width="2" height="6" fill="#f0e6d0" />
          <rect x="28" y="28" width="2" height="6" fill="#f0e6d0" />
        </g>
      );
    case "chest":
      return (
        <g key="c">
          {/* сундук */}
          <rect x="8" y="20" width="32" height="20" rx="2" fill="#7a4a1a" stroke={STROKE} strokeWidth="2" />
          <path d="M8 20 L40 20 L40 14 Q40 10 36 10 L12 10 Q8 10 8 14 Z" fill="#5a2a0a" stroke={STROKE} strokeWidth="2" />
          <rect x="20" y="18" width="8" height="8" fill="#c9a227" stroke={STROKE} strokeWidth="1.5" />
          <circle cx="24" cy="22" r="1.5" fill={STROKE} />
          {/* золото сверху */}
          <circle cx="18" cy="8" r="3" fill="#ffd700" stroke={STROKE} strokeWidth="1" />
          <circle cx="28" cy="6" r="2.5" fill="#ffd700" stroke={STROKE} strokeWidth="1" />
          {/* блик */}
          <rect x="12" y="22" width="4" height="14" fill="#fff" opacity="0.15" />
        </g>
      );
    case "shop":
      return (
        <g key="sh">
          {/* мешок */}
          <path d="M16 14 L14 20 Q10 24 12 32 Q14 40 24 40 Q34 40 36 32 Q38 24 34 20 L32 14 Z" fill="#8a5a2a" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 14 Q20 10 24 12 Q28 10 32 14" fill="none" stroke={STROKE} strokeWidth="2" />
          {/* монеты */}
          <circle cx="18" cy="8" r="4" fill="#ffd700" stroke={STROKE} strokeWidth="1.5" />
          <circle cx="28" cy="9" r="4" fill="#ffd700" stroke={STROKE} strokeWidth="1.5" />
          <circle cx="23" cy="5" r="3.5" fill="#ffd700" stroke={STROKE} strokeWidth="1.5" />
          <text x="18" y="10" textAnchor="middle" fontSize="5" fontWeight="bold" fill={STROKE}>G</text>
        </g>
      );
    case "camp":
      return (
        <g key="ca">
          {/* палатка */}
          <path d="M24 8 L8 38 L40 38 Z" fill="#5a1a1a" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M24 8 L24 38" stroke={STROKE} strokeWidth="1.5" />
          <path d="M24 22 L16 38 L32 38 Z" fill="#2a0a0a" />
          {/* костёр */}
          <path d="M20 30 Q24 22 28 30 Q24 28 20 30 Z" fill="#ff6b1a" stroke={STROKE} strokeWidth="1.5" />
          <path d="M22 28 Q24 24 26 28 Q24 26 22 28 Z" fill="#ffd700" />
        </g>
      );
    case "event":
      return (
        <g key="ev">
          {/* кристалл */}
          <polygon points="24,6 36,18 30,40 18,40 12,18" fill="#8a3a9a" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          <polygon points="24,6 30,18 24,40 18,18" fill="#aa5aba" />
          <polygon points="24,6 18,18 24,40" fill="#fff" opacity="0.25" />
          {/* ? */}
          <text x="24" y="30" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff" fontFamily="monospace">?</text>
        </g>
      );
    case "boss":
      return (
        <g key="bo">
          {/* корона */}
          <path d="M8 22 L12 8 L18 18 L24 4 L30 18 L36 8 L40 22 L40 30 L8 30 Z" fill="#ffd700" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M8 30 L40 30 L40 36 L8 36 Z" fill="#c9a227" stroke={STROKE} strokeWidth="2" />
          {/* рубин */}
          <polygon points="24,16 30,22 24,28 18,22" fill="#c0392b" stroke={STROKE} strokeWidth="1.5" />
          <polygon points="24,16 27,22 24,28 21,22" fill="#e55040" />
          {/* камни на короне */}
          <circle cx="12" cy="12" r="2" fill="#3b7be2" stroke={STROKE} strokeWidth="1" />
          <circle cx="36" cy="12" r="2" fill="#3be26a" stroke={STROKE} strokeWidth="1" />
        </g>
      );
  }
}

export function MapNodeIconByName({ type, size = 44 }: { type: NodeType; size?: number }) {
  return <MapNodeIcon type={type} size={size} />;
}

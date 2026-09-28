// RUNE WARS — hand-written SVG-иконки предметов (НЕ AI-сгенерированные)

import type { ItemCategory, Rarity } from "@/game/content/items";
import { RARITIES } from "@/game/content/items";

const STROKE = "#1a0a1e";

interface Props {
  category: ItemCategory;
  subType: string;
  rarity: Rarity;
  size?: number;
}

export function ItemIcon({ category, subType, rarity, size = 44 }: Props) {
  const rd = RARITIES[rarity];
  const common = { width: size, height: size, viewBox: "0 0 48 48", xmlns: "http://www.w3.org/2000/svg" };
  const id = `it-${subType}-${rarity}`;
  return (
    <svg {...common} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rd.color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={rd.color} stopOpacity="0.4" />
        </linearGradient>
        <filter id={`${id}-sh`}>
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.6" />
        </filter>
      </defs>
      <g filter={`url(#${id}-sh)`}>
        {renderShape(category, subType, id, rd.color)}
      </g>
    </svg>
  );
}

function renderShape(category: ItemCategory, subType: string, id: string, rarityColor: string): React.ReactNode {
  if (category === "weapon") {
    return renderWeapon(subType, id, rarityColor);
  }
  if (category === "armor") {
    return renderArmor(subType, id, rarityColor);
  }
  return renderAmulet(subType, id, rarityColor);
}

function renderWeapon(sub: string, id: string, rc: string): React.ReactNode {
  const grad = `url(#${id}-g)`;
  switch (sub) {
    case "sword":
      return (
        <g key="sw">
          {/* лезвие */}
          <path d="M22 6 L26 6 L26 32 L24 36 L22 32 Z" fill="#d8d8e8" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M22 6 L24 6 L24 32 L22 32 Z" fill="#fff" opacity="0.4" />
          {/* гарда */}
          <rect x="14" y="32" width="20" height="4" fill={grad} stroke={STROKE} strokeWidth="1.5" />
          {/* рукоять */}
          <rect x="22" y="36" width="4" height="8" fill="#5a2a0a" stroke={STROKE} strokeWidth="1" />
          {/* навершие */}
          <circle cx="24" cy="44" r="2.5" fill={rc} stroke={STROKE} strokeWidth="1" />
        </g>
      );
    case "axe":
      return (
        <g key="ax">
          {/* топорще */}
          <rect x="22" y="8" width="4" height="36" fill="#5a2a0a" stroke={STROKE} strokeWidth="1.5" />
          {/* лезвие */}
          <path d="M22 10 Q8 12 8 20 Q8 28 22 30 Z" fill={grad} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M26 10 Q40 12 40 20 Q40 28 26 30 Z" fill={grad} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M22 10 Q12 14 12 20 Q12 24 22 26 Z" fill="#fff" opacity="0.3" />
        </g>
      );
    case "staff":
      return (
        <g key="st">
          {/* посох */}
          <rect x="22" y="14" width="4" height="30" fill="#5a2a0a" stroke={STROKE} strokeWidth="1.5" />
          {/* кристалл сверху */}
          <polygon points="24,4 32,14 24,20 16,14" fill={grad} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          <polygon points="24,4 28,14 24,20" fill="#fff" opacity="0.35" />
          {/* обмотка */}
          <rect x="20" y="30" width="8" height="3" fill={rc} stroke={STROKE} strokeWidth="1" />
        </g>
      );
    case "dagger":
      return (
        <g key="dg">
          {/* лезвие */}
          <path d="M23 8 L25 8 L26 26 L24 30 L22 26 Z" fill="#d8d8e8" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M23 8 L24 8 L24 26 L23 26 Z" fill="#fff" opacity="0.4" />
          {/* гарда */}
          <rect x="18" y="26" width="12" height="3" fill={grad} stroke={STROKE} strokeWidth="1" />
          {/* рукоять */}
          <rect x="23" y="29" width="2" height="10" fill="#5a2a0a" stroke={STROKE} strokeWidth="1" />
          <circle cx="24" cy="40" r="2" fill={rc} stroke={STROKE} strokeWidth="1" />
        </g>
      );
  }
  return null;
}

function renderArmor(sub: string, id: string, rc: string): React.ReactNode {
  const grad = `url(#${id}-g)`;
  switch (sub) {
    case "chainmail":
      return (
        <g key="cm">
          {/* кольчуга */}
          <path d="M10 16 L38 16 L40 22 L40 36 L8 36 L8 22 Z" fill={grad} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          {/* кольца */}
          <g fill="none" stroke={STROKE} strokeWidth="1">
            <circle cx="16" cy="22" r="3" />
            <circle cx="24" cy="22" r="3" />
            <circle cx="32" cy="22" r="3" />
            <circle cx="20" cy="28" r="3" />
            <circle cx="28" cy="28" r="3" />
            <circle cx="24" cy="34" r="3" />
          </g>
          {/* блик */}
          <path d="M12 18 L36 18 L36 20 L12 20 Z" fill="#fff" opacity="0.25" />
        </g>
      );
    case "mantle":
      return (
        <g key="mt">
          {/* мантия с капюшоном */}
          <path d="M14 12 Q24 6 34 12 L40 40 L8 40 Z" fill={grad} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 12 Q24 8 32 12 L32 18 L16 18 Z" fill="#2a1a3a" stroke={STROKE} strokeWidth="1.5" />
          {/* застёжка */}
          <circle cx="24" cy="20" r="2.5" fill={rc} stroke={STROKE} strokeWidth="1" />
          {/* блик */}
          <path d="M12 12 Q24 8 36 12" fill="none" stroke="#fff" strokeWidth="2" opacity="0.25" />
        </g>
      );
    case "leather":
      return (
        <g key="lt">
          {/* кожаная броня */}
          <path d="M10 14 L38 14 L38 38 L10 38 Z" fill={grad} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          {/* швы */}
          <path d="M10 22 L38 22 M10 30 L38 30" stroke={STROKE} strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
          {/* наплечники */}
          <circle cx="12" cy="16" r="4" fill={grad} stroke={STROKE} strokeWidth="1.5" />
          <circle cx="36" cy="16" r="4" fill={grad} stroke={STROKE} strokeWidth="1.5" />
          {/* блик */}
          <rect x="12" y="16" width="6" height="18" fill="#fff" opacity="0.15" />
        </g>
      );
  }
  return null;
}

function renderAmulet(sub: string, id: string, rc: string): React.ReactNode {
  const grad = `url(#${id}-g)`;
  switch (sub) {
    case "amulet":
      return (
        <g key="am">
          {/* цепочка */}
          <path d="M14 8 Q24 16 34 8" fill="none" stroke={rc} strokeWidth="2" strokeDasharray="2 2" />
          {/* кулон */}
          <circle cx="24" cy="26" r="10" fill={grad} stroke={STROKE} strokeWidth="2" />
          <polygon points="24,18 30,26 24,34 18,26" fill={rc} stroke={STROKE} strokeWidth="1.5" />
          <circle cx="24" cy="26" r="3" fill="#fff" opacity="0.5" />
        </g>
      );
    case "talisman":
      return (
        <g key="tl">
          <path d="M14 8 Q24 16 34 8" fill="none" stroke={rc} strokeWidth="2" strokeDasharray="2 2" />
          {/* ромб-талисман */}
          <polygon points="24,14 36,26 24,38 12,26" fill={grad} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          <polygon points="24,14 30,26 24,38 18,26" fill="#fff" opacity="0.2" />
          <circle cx="24" cy="26" r="4" fill={rc} stroke={STROKE} strokeWidth="1" />
        </g>
      );
    case "charm":
      return (
        <g key="ch">
          <path d="M14 8 Q24 16 34 8" fill="none" stroke={rc} strokeWidth="2" strokeDasharray="2 2" />
          {/* оберег-капля */}
          <path d="M24 14 C 30 22, 32 28, 24 36 C 16 28, 16 22, 24 14 Z" fill={grad} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="22" cy="22" rx="3" ry="5" fill="#fff" opacity="0.4" transform="rotate(-20 22 22)" />
          <circle cx="24" cy="26" r="2.5" fill={rc} />
        </g>
      );
  }
  return null;
}

/** Иконка-плейсхолдер для пустого слота экипировки. */
export function EmptySlotIcon({ category, size = 40 }: { category: ItemCategory; size?: number }) {
  const label = category === "weapon" ? "Оружие" : category === "armor" ? "Броня" : "Амулет";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: "block" }}>
      <rect x="6" y="6" width="36" height="36" rx="4" fill="none" stroke="#3a2a5a" strokeWidth="2" strokeDasharray="4 3" />
      <text x="24" y="28" textAnchor="middle" fontSize="9" fill="#5a4a6a" fontFamily="monospace">{label}</text>
    </svg>
  );
}

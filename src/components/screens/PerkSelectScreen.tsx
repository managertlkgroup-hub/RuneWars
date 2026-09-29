"use client";

import { RuneButton } from "@/components/ui/RuneButton";
import { getPerkPool, type PerkDef } from "@/game/content/perks";
import { useGameStore } from "@/game/core/GameState";
import { getAudio } from "@/game/core/AudioEngine";

// SVG-иконка для перка по эффекту
function PerkIcon({ perk, size = 48 }: { perk: PerkDef; size?: number }) {
  const stroke = "#1a0a1e";
  // выбираем иконку по эффекту
  const hasMaxHp = perk.effect.maxHp;
  const hasRedDmg = perk.effect.redDamageFlat;
  const hasHeal = perk.effect.healFlat || perk.effect.healMult || perk.effect.regenPerTurn;
  const hasCrit = perk.effect.critChance;
  const hasVamp = perk.effect.vampirePct;
  const hasDodge = perk.effect.dodgeChance;
  const hasUlta = perk.effect.ultaMult;
  const hasShield = perk.effect.autoShield || perk.effect.shieldMult || perk.effect.shieldAbsorb;
  const hasRage = perk.effect.rageMult || perk.effect.startRage;

  if (hasMaxHp) {
    // сердце
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <path d="M24 42 C 8 30, 8 14, 18 10 C 22 8, 24 12, 24 16 C 24 12, 26 8, 30 10 C 40 14, 40 30, 24 42 Z" fill="#e23b3b" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="18" cy="18" rx="5" ry="3" fill="#fff" opacity="0.4" />
      </svg>
    );
  }
  if (hasRedDmg) {
    // меч
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <g transform="translate(-2,-2) rotate(-20 24 24)">
          <rect x="21" y="6" width="6" height="30" fill="#d8d8e8" stroke={stroke} strokeWidth="2" />
          <rect x="15" y="34" width="18" height="5" fill="#c9a227" stroke={stroke} strokeWidth="1.5" />
          <rect x="22" y="39" width="4" height="6" fill="#5a2a0a" stroke={stroke} strokeWidth="1" />
        </g>
        <path d="M32 6 L34 4 L36 6 L34 8 Z" fill="#f4d36a" stroke={stroke} strokeWidth="1" />
      </svg>
    );
  }
  if (hasHeal) {
    // крест-лист
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <path d="M10 38 C 10 20, 24 6, 40 8 C 42 24, 30 40, 10 38 Z" fill="#3be26a" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M10 38 C 18 30, 28 20, 40 8" fill="none" stroke="#1a8b3a" strokeWidth="2" />
      </svg>
    );
  }
  if (hasCrit) {
    // молния
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <path d="M26 4 L14 24 L22 24 L18 44 L34 20 L26 20 L30 4 Z" fill="#e2c93b" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (hasVamp) {
    // капля крови
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <path d="M24 4 C 30 18, 38 24, 38 32 C 38 40, 32 44, 24 44 C 16 44, 10 40, 10 32 C 10 24, 18 18, 24 4 Z" fill="#8b1a1a" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (hasDodge) {
    // тень/облако
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <path d="M14 30 Q8 30 8 22 Q8 14 18 14 Q20 8 28 8 Q38 8 38 18 Q44 18 44 26 Q44 34 36 34 L14 34 Z" fill="#3a2a4a" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="20" cy="22" rx="3" ry="5" fill="#aa44ff" opacity="0.6" />
      </svg>
    );
  }
  if (hasUlta) {
    // корона
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <path d="M8 22 L12 8 L18 18 L24 4 L30 18 L36 8 L40 22 L40 30 L8 30 Z" fill="#ffd700" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <rect x="8" y="30" width="32" height="6" fill="#c9a227" stroke={stroke} strokeWidth="2" />
        <circle cx="16" cy="12" r="2" fill="#3b7be2" stroke={stroke} strokeWidth="1" />
        <circle cx="32" cy="12" r="2" fill="#3be26a" stroke={stroke} strokeWidth="1" />
      </svg>
    );
  }
  if (hasShield) {
    // щит
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <path d="M24 4 L40 10 L40 26 C 40 36, 32 42, 24 44 C 16 42, 8 36, 8 26 L 8 10 Z" fill="#3b7be2" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M24 4 L40 10 L40 26 C 40 36, 32 42, 24 44" fill="#fff" opacity="0.2" />
        <path d="M24 14 L24 34 M14 22 L34 22" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (hasRage) {
    // ярость — кулак/пламя
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <path d="M24 4 C 26 12, 36 14, 36 26 C 36 36, 30 44, 24 44 C 18 44, 12 36, 12 26 C 12 20, 16 18, 18 14 C 19 18, 21 20, 22 16 C 23 12, 22 8, 24 4 Z" fill="#ff6a22" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="24" cy="30" rx="3" ry="5" fill="#ffeebb" />
      </svg>
    );
  }
  // default — звезда
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <polygon points="24,4 29,17 43,17 32,26 36,40 24,32 12,40 16,26 5,17 19,17" fill="#c9a227" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function PerkSelectScreen({
  heroId,
  level,
  onDone,
}: {
  heroId: string;
  level: number;
  onDone: () => void;
}) {
  const choosePerk = useGameStore((s) => s.choosePerk);
  const pool: PerkDef[] = getPerkPool(level);

  const handlePick = (idx: number, perk: PerkDef) => {
    choosePerk(heroId, level, idx);
    getAudio().play("levelUp");
    onDone();
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-md rounded-lg p-4 z-50">
      <div className="font-pixel text-rune-gold text-glow-gold text-base sm:text-xl uppercase tracking-widest text-center">
        Уровень {level} — выбор перка
      </div>
      <div className="font-body text-[11px] text-rune-muted text-center max-w-md">
        Выбери одну из способностей. Действует до конца забега.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {pool.map((perk, idx) => (
          <button
            key={perk.id}
            onClick={() => handlePick(idx, perk)}
            onContextMenu={(e) => e.preventDefault()}
            className="group flex flex-col items-center gap-2 p-4 rounded-lg border-2 bg-gradient-to-b from-[#1f1638]/90 to-[#0a0718]/90 transition-all hover:scale-[1.03] hover:border-rune-gold"
            style={{ borderColor: "#3a5a8a" }}
          >
            {/* SVG-иконка перка вместо цифры */}
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[#0a0718] border-2 border-rune-gold/40">
              <PerkIcon perk={perk} size={44} />
            </div>
            <div className="font-pixel text-[10px] text-rune-text text-center">{perk.name}</div>
            <div className="font-body text-[9px] text-rune-muted text-center leading-snug min-h-[2.5em]">
              {perk.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

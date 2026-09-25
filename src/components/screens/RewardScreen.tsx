"use client";

import { useMemo } from "react";
import { RuneButton } from "@/components/ui/RuneButton";
import { RunePanel } from "@/components/ui/RunePanel";
import { RuneIcon } from "@/components/icons/RuneIcons";
import { RUNES, RARITY_COLOR, type RuneId, type RuneRarity } from "@/game/content/runes";
import { useGameStore, type OwnedRune } from "@/game/core/GameState";

export interface RewardOption {
  kind: "rune" | "gold" | "heal" | "upgrade";
  runeId?: RuneId;
  rarity?: RuneRarity;
  amount?: number;
  label: string;
  description: string;
}

function randomRarity(): RuneRarity {
  const r = Math.random();
  if (r < 0.6) return "common";
  if (r < 0.85) return "rare";
  return "epic";
}

/**
 * Генерация 3 наград с точными вероятностями:
 * - руна: 50% (ТОЛЬКО если есть свободный слот экипировки < 3)
 * - золото: 20%
 * - лечение: 15%
 * - апгрейд случайной руны: 7.5%
 * - апгрейд конкретной (выбор): 7.5%
 * Если слот занят (3 экипировано) — веса перераспределены.
 */
export function generateRewards(
  ownedRunes: OwnedRune[],
  equippedCount: number,
  hasUpgradable: boolean
): RewardOption[] {
  const runeAllowed = equippedCount < 3;
  // веса
  const weights: { kind: RewardOption["kind"]; w: number }[] = [];
  if (runeAllowed) weights.push({ kind: "rune", w: 50 });
  weights.push({ kind: "gold", w: 20 });
  weights.push({ kind: "heal", w: 15 });
  if (hasUpgradable) {
    weights.push({ kind: "upgrade", w: 7.5 }); // апгрейд случайной
    weights.push({ kind: "upgrade", w: 7.5 }); // апгрейд конкретной (логически то же)
  } else {
    // нет апгрейдабельных — отдать вес золоту и лечению
    weights.push({ kind: "gold", w: 7.5 });
    weights.push({ kind: "heal", w: 7.5 });
  }
  if (!runeAllowed) {
    // перераспределить 50% веса руны на золото/лечение
    weights.push({ kind: "gold", w: 25 });
    weights.push({ kind: "heal", w: 25 });
  }

  const opts: RewardOption[] = [];
  const usedRuneIds = new Set<RuneId>();
  const pickedKinds = new Set<RewardOption["kind"]>();

  const pickOne = (): RewardOption | null => {
    // фильтруем уже использованные kind (кроме rune — можно разные руны, но не тут)
    const avail = weights.filter((w) => {
      if (w.kind !== "rune" && pickedKinds.has(w.kind)) return false;
      return true;
    });
    if (avail.length === 0) return null;
    const total = avail.reduce((s, w) => s + w.w, 0);
    let r = Math.random() * total;
    let chosen = avail[0];
    for (const w of avail) {
      r -= w.w;
      if (r <= 0) {
        chosen = w;
        break;
      }
    }
    if (chosen.kind === "rune") {
      const availRunes = RUNES.filter((ru) => !usedRuneIds.has(ru.id));
      if (availRunes.length === 0) return null;
      const def = availRunes[Math.floor(Math.random() * availRunes.length)];
      usedRuneIds.add(def.id);
      return {
        kind: "rune",
        runeId: def.id,
        rarity: randomRarity(),
        label: `Руна: ${def.name}`,
        description: def.description,
      };
    } else if (chosen.kind === "gold") {
      return {
        kind: "gold",
        amount: 20 + Math.floor(Math.random() * 60),
        label: "Золото",
        description: "Дополнительное золото для Лагеря.",
      };
    } else if (chosen.kind === "heal") {
      return {
        kind: "heal",
        amount: 40,
        label: "Лечение",
        description: "Восстановить HP в следующем бою (+золото).",
      };
    } else {
      return {
        kind: "upgrade",
        label: "Улучшить руну",
        description: "+1 уровень к одной из ваших рун.",
      };
    }
  };

  for (let i = 0; i < 3; i++) {
    const opt = pickOne();
    if (opt) {
      opts.push(opt);
      if (opt.kind !== "rune") pickedKinds.add(opt.kind);
    }
  }
  return opts;
}

export default function RewardScreen({
  rewards,
  onPick,
  onSkip,
}: {
  rewards: RewardOption[];
  onPick: (opt: RewardOption) => void;
  onSkip: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-md rounded-lg p-4">
      <div className="font-pixel text-rune-gold text-glow-gold text-xl sm:text-3xl tracking-widest text-center">
        НАГРАДА
      </div>
      <div className="font-body text-rune-muted text-xs text-center max-w-md">
        Выбери одну из трёх карточек. Руны добавляются в инвентарь.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {rewards.map((opt, i) => (
          <RewardCard key={i} option={opt} onPick={() => onPick(opt)} />
        ))}
      </div>
      <RuneButton variant="ghost" onClick={onSkip} className="text-[10px]">
        Пропустить
      </RuneButton>
    </div>
  );
}

function RewardCard({
  option,
  onPick,
}: {
  option: RewardOption;
  onPick: () => void;
}) {
  const rarity = option.rarity
    ? RARITY_COLOR[option.rarity]
    : { border: "#3a2a5a", glow: "rgba(58,42,90,0.5)", label: "" };
  return (
    <button
      onClick={onPick}
      onContextMenu={(e) => e.preventDefault()}
      className="group relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 bg-gradient-to-b from-[#1f1638]/90 to-[#0a0718]/90 transition-all duration-150 hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(201,162,39,0.4)] cursor-pointer"
      style={{
        borderColor: rarity.border,
        boxShadow: `0 0 12px ${rarity.glow}`,
      }}
    >
      {option.rarity && (
        <span
          className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[7px] font-pixel uppercase"
          style={{
            background: rarity.border,
            color: "#0a0718",
          }}
        >
          {rarity.label}
        </span>
      )}
      <div className="flex items-center justify-center w-16 h-16">
        {option.kind === "rune" && option.runeId ? (
          <RuneIcon rune={option.runeId} size={56} />
        ) : option.kind === "gold" ? (
          <CoinIcon size={48} />
        ) : option.kind === "heal" ? (
          <HeartIcon size={48} />
        ) : (
          <UpgradeIcon size={48} />
        )}
      </div>
      <div className="font-pixel text-[10px] text-rune-gold text-center">
        {option.label}
      </div>
      <div className="font-body text-[9px] text-rune-muted text-center leading-snug min-h-[2.5em]">
        {option.description}
      </div>
      {option.amount && option.kind !== "rune" && (
        <div className="font-pixel text-[12px] text-rune-warm">
          +{option.amount}
        </div>
      )}
    </button>
  );
}

function CoinIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="18" fill="#c9a227" stroke="#1a0a1e" strokeWidth="2" />
      <circle cx="24" cy="24" r="13" fill="none" stroke="#8b6a14" strokeWidth="2" />
      <ellipse cx="20" cy="18" rx="6" ry="3" fill="#fff" opacity="0.5" transform="rotate(-30 20 18)" />
      <text x="24" y="30" textAnchor="middle" fontSize="16" fontFamily="monospace" fontWeight="bold" fill="#1a0a1e">
        G
      </text>
    </svg>
  );
}

function HeartIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path
        d="M24 42 C 8 30, 8 14, 18 10 C 22 8, 24 12, 24 16 C 24 12, 26 8, 30 10 C 40 14, 40 30, 24 42 Z"
        fill="#3be26a"
        stroke="#1a0a1e"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse cx="18" cy="18" rx="5" ry="3" fill="#fff" opacity="0.5" />
    </svg>
  );
}

function UpgradeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path d="M24 6 L 34 18 L 28 18 L 28 38 L 20 38 L 20 18 L 14 18 Z" fill="#c9a227" stroke="#1a0a1e" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 6 L 34 18 L 28 18 L 28 38 L 20 38 L 20 18 L 14 18 Z" fill="#fff" opacity="0.25" />
    </svg>
  );
}

export function useRewards(): RewardOption[] {
  const ownedRunes = useGameStore((s) => s.ownedRunes);
  const equippedRunes = useGameStore((s) => s.equippedRunes);
  return useMemo(() => {
    const hasUpgradable = ownedRunes.some((r) => r.level < 3);
    return generateRewards(ownedRunes, equippedRunes.length, hasUpgradable);
  }, [ownedRunes, equippedRunes.length]);
}

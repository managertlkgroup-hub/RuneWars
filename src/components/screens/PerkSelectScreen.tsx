"use client";

import { RuneButton } from "@/components/ui/RuneButton";
import { getPerkPool, type PerkDef } from "@/game/content/perks";
import { useGameStore } from "@/game/core/GameState";
import { getAudio } from "@/game/core/AudioEngine";

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
        Выбери одну из способностей. Она действует до конца забега.
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
            {/* иконка-символ */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#0a0718] border-2 border-rune-gold/40">
              <span className="font-pixel text-[16px] text-rune-gold">{idx + 1}</span>
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

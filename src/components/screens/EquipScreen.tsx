"use client";

import { useState } from "react";
import { RuneButton } from "@/components/ui/RuneButton";
import { RunePanel, PanelTitle } from "@/components/ui/RunePanel";
import { RuneIcon } from "@/components/icons/RuneIcons";
import { RUNES, RARITY_COLOR } from "@/game/content/runes";
import { useGameStore } from "@/game/core/GameState";
import type { RuneId } from "@/game/content/runes";
import { useToast } from "@/hooks/use-toast";
import { Check, Lock } from "lucide-react";

export default function EquipScreen({ onStart }: { onStart: () => void }) {
  const ownedRunes = useGameStore((s) => s.ownedRunes);
  const equipped = useGameStore((s) => s.equippedRunes);
  const setEquipped = useGameStore((s) => s.setEquippedRunes);
  const { toast } = useToast();

  const toggle = (id: RuneId, owned: boolean) => {
    if (!owned) return;
    if (equipped.includes(id)) {
      setEquipped(equipped.filter((x) => x !== id));
    } else if (equipped.length < 3) {
      setEquipped([...equipped, id]);
    } else {
      toast({
        title: "Слоты заняты",
        description: "Сними одну из рун, чтобы экипировать новую. Максимум 3 руны.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 backdrop-blur-md rounded-lg p-3 overflow-y-auto rune-scroll">
      <div className="font-pixel text-rune-gold text-glow-gold text-lg sm:text-2xl tracking-widest text-center">
        ЭКИПИРОВКА РУН
      </div>
      <div className="font-body text-rune-muted text-[11px] text-center max-w-md">
        Выбери до 3 рун для забега. Каждая руна — 1 раз за ход.
      </div>

      {/* Слоты экипировки */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => {
          const id = equipped[i];
          const def = id ? RUNES.find((r) => r.id === id) : null;
          return (
            <div
              key={i}
              className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center relative"
              style={{
                borderColor: def ? "#c9a227" : "#3a2a5a",
                background: def ? "rgba(201,162,39,0.12)" : "rgba(31,22,56,0.5)",
                boxShadow: def ? "0 0 12px rgba(201,162,39,0.4)" : "none",
              }}
            >
              {def ? <RuneIcon rune={def.id} size={44} /> : (
                <span className="font-pixel text-[10px] text-rune-muted">{i + 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Сетка всех 9 рун */}
      <RunePanel className="w-full max-w-lg">
        <PanelTitle>Руны ({ownedRunes.length} в инвентаре)</PanelTitle>
        <div className="p-3 grid grid-cols-3 gap-2 max-h-72 overflow-y-auto rune-scroll">
          {RUNES.map((def) => {
            const owned = ownedRunes.find((r) => r.id === def.id);
            const isEquipped = equipped.includes(def.id);
            const rarity = owned ? RARITY_COLOR[owned.rarity] : RARITY_COLOR[def.rarity];
            return (
              <button
                key={def.id}
                onClick={() => toggle(def.id, !!owned)}
                onContextMenu={(e) => e.preventDefault()}
                disabled={!owned}
                className="group relative flex flex-col items-center gap-1 p-2 rounded-lg border-2 bg-[#0a0718]/80 transition-all hover:scale-[1.04] disabled:opacity-35 disabled:hover:scale-100 disabled:cursor-not-allowed"
                style={{
                  borderColor: isEquipped ? "#c9a227" : rarity.border,
                  boxShadow: isEquipped ? `0 0 12px ${rarity.glow}` : owned ? `0 0 4px ${rarity.glow}` : "none",
                }}
              >
                {owned && owned.level > 0 && (
                  <span className="absolute top-0.5 right-0.5 font-pixel text-[7px] text-rune-gold">
                    ур.{owned.level}
                  </span>
                )}
                {!owned && (
                  <span className="absolute top-0.5 right-0.5">
                    <Lock size={10} className="text-rune-muted" />
                  </span>
                )}
                {isEquipped && (
                  <span className="absolute top-0.5 left-0.5">
                    <Check size={12} className="text-rune-gold" />
                  </span>
                )}
                <RuneIcon rune={def.id} size={34} />
                <span className="font-pixel text-[8px] text-rune-text text-center leading-tight">
                  {def.name}
                </span>
                <span className="font-body text-[6.5px] text-rune-muted text-center leading-tight line-clamp-3">
                  {def.description}
                </span>
              </button>
            );
          })}
        </div>
      </RunePanel>

      <div className="flex gap-2">
        <RuneButton variant="ghost" onClick={() => setEquipped([])} className="text-[10px]">
          Снять все
        </RuneButton>
        <RuneButton variant="gold" onClick={onStart} className="text-xs px-6">
          В бой ({equipped.length}/3)
        </RuneButton>
      </div>
    </div>
  );
}

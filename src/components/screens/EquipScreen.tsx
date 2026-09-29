"use client";

import { useState } from "react";
import { RuneButton } from "@/components/ui/RuneButton";
import { RunePanel, PanelTitle } from "@/components/ui/RunePanel";
import { RuneIcon } from "@/components/icons/RuneIcons";
import { RUNES, RARITY_COLOR, type RuneId } from "@/game/content/runes";
import { useGameStore, type OwnedRune } from "@/game/core/GameState";
import { useToast } from "@/hooks/use-toast";

// Текст эффекта по уровню руны
function runeEffectText(runeId: RuneId, level: number): string {
  const def = RUNES.find((r) => r.id === runeId);
  if (!def) return "";
  // бонус = (power - 1) * (1 + (level-1)*0.5)
  const baseBonus = def.power - 1;
  const scaledBonus = baseBonus * (1 + (level - 1) * 0.5);
  const pct = Math.round(scaledBonus * 100);
  switch (runeId) {
    case "fire": return `+${pct}% к урону красных (3-4)`;
    case "ice": return level === 1 ? "Заморозка на синем 4+" : `Заморозка +бонус ×${(1 + (level-1)*0.5).toFixed(1)}`;
    case "life": return `Лечение ×${(1 + scaledBonus).toFixed(1)} + реген`;
    case "wrath": return `Ярость ×${(1 + scaledBonus).toFixed(1)}, ульта ×${level === 3 ? 3 : 2}`;
    case "chaos": return "Каждый 5-й обмен — перекраска";
    case "smith": return "Красный 5+ → бомба 3×3";
    case "vampire": return `${pct}% урона → HP`;
    case "guardian": return `${pct}% щита после боя`;
    case "sage": return "+1 к длине (множитель)";
  }
  return def.description;
}

export default function EquipScreen({ onStart }: { onStart: () => void }) {
  const ownedRunes = useGameStore((s) => s.ownedRunes);
  const equipped = useGameStore((s) => s.equippedRunes);
  const setEquipped = useGameStore((s) => s.setEquippedRunes);
  const upgradeRune = useGameStore((s) => s.upgradeRune);
  const accountGold = useGameStore((s) => s.accountGold);
  const { toast } = useToast();

  const toggle = (id: RuneId) => {
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

  const handleUpgrade = (rune: OwnedRune) => {
    if (rune.copies < 3) {
      toast({ title: "Недостаточно копий", description: `Нужно 3 копии (сейчас ${rune.copies}).`, variant: "destructive" });
      return;
    }
    if (rune.level >= 3) {
      toast({ title: "Максимум", description: "Руника уже максимального уровня." });
      return;
    }
    const cost = rune.level === 1 ? 200 : 500;
    if (accountGold < cost) {
      toast({ title: "Недостаточно золота", description: `Нужно ${cost} золота аккаунта.`, variant: "destructive" });
      return;
    }
    upgradeRune(rune.id);
    toast({ title: "Рунина улучшена!", description: `${RUNES.find(r=>r.id===rune.id)?.name} ур.${rune.level + 1} (−${cost} золота, −3 копии)` });
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 backdrop-blur-md rounded-lg p-3 overflow-y-auto rune-scroll">
      <div className="font-pixel text-rune-gold text-glow-gold text-lg sm:text-2xl tracking-widest text-center">
        ЭКИПИРОВКА РУН
      </div>
      <div className="font-body text-rune-muted text-[11px] text-center max-w-md">
        Выбери до 3 рун для забега. Собери 3 копии руны для улучшения уровня.
      </div>

      {/* Слоты экипировки */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => {
          const id = equipped[i];
          const def = id ? RUNES.find((r) => r.id === id) : null;
          return (
            <div
              key={i}
              className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center"
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

      {/* Сетка всех 9 рун с уровнями и копиями */}
      <RunePanel className="w-full max-w-lg">
        <PanelTitle>Руны ({ownedRunes.length} в инвентаре · {accountGold} золота)</PanelTitle>
        <div className="p-3 grid grid-cols-3 gap-2 max-h-72 overflow-y-auto rune-scroll">
          {RUNES.map((def) => {
            const owned = ownedRunes.find((r) => r.id === def.id);
            const isEquipped = equipped.includes(def.id);
            const rarity = owned ? RARITY_COLOR[owned.rarity] : RARITY_COLOR[def.rarity];
            const canUpgrade = owned && owned.copies >= 3 && owned.level < 3;
            const upgradeCost = owned ? (owned.level === 1 ? 200 : 500) : 0;
            const levelColor = !owned ? "#6a5a7a" : owned.level === 1 ? "#8a8a8a" : owned.level === 2 ? "#4a9e5c" : "#ffd700";
            return (
              <div
                key={def.id}
                className="relative flex flex-col items-center gap-1 p-2 rounded-lg border-2 bg-[#0a0718]/80"
                style={{
                  borderColor: isEquipped ? "#c9a227" : owned ? rarity.border : "#3a2a5a",
                  boxShadow: isEquipped ? `0 0 12px ${rarity.glow}` : "none",
                }}
              >
                {/* уровень (звёзды) */}
                {owned && (
                  <div className="absolute top-0.5 left-0.5 flex gap-0.5">
                    {owned.level >= 2 && <span style={{ color: levelColor, fontSize: 8 }}>★</span>}
                    {owned.level >= 3 && <span style={{ color: levelColor, fontSize: 8 }}>★</span>}
                  </div>
                )}
                {/* копии */}
                {owned && owned.copies > 1 && (
                  <span className="absolute top-0.5 right-0.5 font-pixel text-[7px] text-rune-muted">
                    ×{owned.copies}
                  </span>
                )}
                <button
                  onClick={() => owned && toggle(def.id)}
                  onContextMenu={(e) => e.preventDefault()}
                  disabled={!owned}
                  className="flex flex-col items-center gap-0.5"
                  style={{ opacity: owned ? 1 : 0.35, cursor: owned ? "pointer" : "default" }}
                >
                  <RuneIcon rune={def.id} size={34} />
                  <span className="font-pixel text-[7px] text-rune-text text-center leading-tight">{def.name}</span>
                  {owned ? (
                    <span className="font-pixel text-[6px] text-center leading-tight" style={{ color: levelColor }}>
                      ур.{owned.level} · {runeEffectText(def.id, owned.level)}
                    </span>
                  ) : (
                    <span className="font-pixel text-[6px] text-rune-muted text-center leading-tight">закрыто</span>
                  )}
                </button>
                {/* кнопка улучшить */}
                {owned && canUpgrade && (
                  <RuneButton
                    variant="gold"
                    onClick={() => handleUpgrade(owned)}
                    className="text-[7px] py-0.5 px-1 mt-0.5 w-full"
                  >
                    Улучшить ({upgradeCost}з)
                  </RuneButton>
                )}
                {owned && owned.copies >= 3 && owned.level >= 3 && (
                  <span className="font-pixel text-[6px] text-rune-gold-light">МАКС</span>
                )}
              </div>
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

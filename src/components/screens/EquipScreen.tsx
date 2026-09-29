"use client";

import { useState } from "react";
import { RuneButton } from "@/components/ui/RuneButton";
import { RunePanel, PanelTitle } from "@/components/ui/RunePanel";
import { RuneIcon } from "@/components/icons/RuneIcons";
import { RUNES, RARITY_COLOR, type RuneId } from "@/game/content/runes";
import { useGameStore, type OwnedRune } from "@/game/core/GameState";
import { useToast } from "@/hooks/use-toast";

function runeEffectText(runeId: RuneId, level: number): string {
  const def = RUNES.find((r) => r.id === runeId);
  if (!def) return "";
  const baseBonus = def.power - 1;
  const scaledBonus = baseBonus * (1 + (level - 1) * 0.5);
  const pct = Math.round(scaledBonus * 100);
  switch (runeId) {
    case "fire": return `+${pct}% к урону красных (3-4)`;
    case "ice": return level === 1 ? "Заморозка на синем 4+" : `Заморозка ×${(1 + (level-1)*0.5).toFixed(1)}`;
    case "life": return `Лечение ×${(1 + scaledBonus).toFixed(1)}`;
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
      toast({ title: "Слоты заняты", description: "Сними одну из рун. Максимум 3.", variant: "destructive" });
    }
  };

  const handleUpgrade = (rune: OwnedRune) => {
    if (rune.copies < 3) { toast({ title: "Недостаточно копий", description: `Нужно 3 (сейчас ${rune.copies}).`, variant: "destructive" }); return; }
    if (rune.level >= 3) { toast({ title: "Максимум" }); return; }
    const cost = rune.level === 1 ? 200 : 500;
    if (accountGold < cost) { toast({ title: "Недостаточно золота", description: `Нужно ${cost}.`, variant: "destructive" }); return; }
    upgradeRune(rune.id);
    const def = RUNES.find(r => r.id === rune.id);
    toast({ title: "Рунина улучшена!", description: `${def?.name} ур.${rune.level + 1}! Эффект: ${runeEffectText(rune.id, rune.level + 1)}` });
    // авто-экипировка если есть свободный слот
    const st = useGameStore.getState();
    if (!st.equippedRunes.includes(rune.id) && st.equippedRunes.length < 3) {
      st.setEquippedRunes([...st.equippedRunes, rune.id]);
      toast({ title: "Авто-экипировка", description: `${def?.name} экипирован.` });
    }
  };

  // цвет фона карточки по уровню
  const cardBg = (level: number) => {
    if (level >= 3) return "rgba(255,215,0,0.12)";
    if (level === 2) return "rgba(74,158,92,0.12)";
    return "rgba(31,22,56,0.5)";
  };
  const cardBorder = (level: number, isEquipped: boolean) => {
    if (isEquipped) return "#c9a227";
    if (level >= 3) return "#ffd700";
    if (level === 2) return "#4a9e5c";
    return "#3a2a5a";
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 backdrop-blur-md rounded-lg p-3 overflow-y-auto rune-scroll">
      <div className="font-pixel text-rune-gold text-glow-gold text-lg sm:text-2xl tracking-widest text-center">
        ЭКИПИРОВКА РУН
      </div>
      <div className="font-body text-rune-muted text-[11px] text-center max-w-md">
        Экипируй до 3 рун. Собери 3 копии для улучшения уровня (ур.2 = +50% к эффекту, ур.3 = ×2).
      </div>

      {/* Слоты экипировки — БОЛЬШИЕ иконки */}
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => {
          const id = equipped[i];
          const def = id ? RUNES.find((r) => r.id === id) : null;
          const owned = id ? ownedRunes.find(r => r.id === id) : null;
          return (
            <div
              key={i}
              className="w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5"
              style={{
                borderColor: def ? "#c9a227" : "#3a2a5a",
                background: def ? "rgba(201,162,39,0.15)" : "rgba(31,22,56,0.5)",
                boxShadow: def ? "0 0 16px rgba(201,162,39,0.5)" : "none",
              }}
            >
              {def ? (
                <>
                  <RuneIcon rune={def.id} size={48} />
                  {owned && owned.level > 1 && (
                    <span className="font-pixel text-[7px]" style={{ color: owned.level === 3 ? "#ffd700" : "#4a9e5c" }}>
                      {"★".repeat(owned.level - 1)}
                    </span>
                  )}
                </>
              ) : (
                <span className="font-pixel text-[10px] text-rune-muted">{i + 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Сетка всех 9 рун */}
      <RunePanel className="w-full max-w-lg">
        <PanelTitle>Руны ({ownedRunes.length} в инвентаре · {accountGold} золота)</PanelTitle>
        <div className="p-3 grid grid-cols-3 gap-2 max-h-72 overflow-y-auto rune-scroll">
          {RUNES.map((def) => {
            const owned = ownedRunes.find((r) => r.id === def.id);
            const isEquipped = equipped.includes(def.id);
            const rarity = owned ? RARITY_COLOR[owned.rarity] : RARITY_COLOR[def.rarity];
            const canUpgrade = owned && owned.copies >= 3 && owned.level < 3;
            const upgradeCost = owned ? (owned.level === 1 ? 200 : 500) : 0;
            const lvl = owned?.level ?? 0;
            const levelColor = lvl === 0 ? "#6a5a7a" : lvl === 1 ? "#8a8a8a" : lvl === 2 ? "#4a9e5c" : "#ffd700";
            return (
              <div
                key={def.id}
                className="relative flex flex-col items-center gap-1 p-2 rounded-lg border-2"
                style={{
                  borderColor: cardBorder(lvl, isEquipped),
                  background: cardBg(lvl),
                  boxShadow: isEquipped ? `0 0 12px ${rarity.glow}` : "none",
                  opacity: owned ? 1 : 0.4,
                }}
              >
                {/* звёзды уровня — крупные, видимые */}
                {owned && lvl >= 2 && (
                  <div className="absolute top-1 left-1 flex gap-0.5">
                    {lvl >= 2 && <span style={{ color: levelColor, fontSize: 10 }}>★</span>}
                    {lvl >= 3 && <span style={{ color: levelColor, fontSize: 10 }}>★</span>}
                  </div>
                )}
                {/* копии */}
                {owned && owned.copies > 1 && (
                  <span className="absolute top-1 right-1 font-pixel text-[8px] text-rune-warm">×{owned.copies}</span>
                )}
                <button
                  onClick={() => owned && toggle(def.id)}
                  onContextMenu={(e) => e.preventDefault()}
                  disabled={!owned}
                  className="flex flex-col items-center gap-1"
                  style={{ cursor: owned ? "pointer" : "default" }}
                >
                  {/* БОЛЬШАЯ иконка руны */}
                  <div className="rounded-lg p-1" style={{ background: owned ? "rgba(0,0,0,0.3)" : "transparent" }}>
                    <RuneIcon rune={def.id} size={44} />
                  </div>
                  <span className="font-pixel text-[8px] text-rune-text text-center leading-tight">{def.name}</span>
                  {owned ? (
                    <span className="font-pixel text-[7px] text-center leading-tight" style={{ color: levelColor }}>
                      ур.{lvl} · {runeEffectText(def.id, lvl)}
                    </span>
                  ) : (
                    <span className="font-pixel text-[7px] text-rune-muted text-center leading-tight">закрыто</span>
                  )}
                </button>
                {/* кнопка улучшить */}
                {owned && canUpgrade && (
                  <RuneButton
                    variant="gold"
                    onClick={() => handleUpgrade(owned)}
                    className="text-[8px] py-0.5 px-1 mt-0.5 w-full"
                  >
                    Улучшить ({upgradeCost}з)
                  </RuneButton>
                )}
                {owned && lvl >= 3 && (
                  <span className="font-pixel text-[7px] text-rune-gold-light">МАКС</span>
                )}
              </div>
            );
          })}
        </div>
      </RunePanel>

      <div className="flex gap-2">
        <RuneButton variant="ghost" onClick={() => setEquipped([])} className="text-[10px]">Снять все</RuneButton>
        <RuneButton variant="gold" onClick={onStart} className="text-xs px-6">В бой ({equipped.length}/3)</RuneButton>
      </div>
    </div>
  );
}

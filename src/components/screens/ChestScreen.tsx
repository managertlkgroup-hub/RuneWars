"use client";

import { useEffect, useState } from "react";
import { RuneButton } from "@/components/ui/RuneButton";
import { ItemIcon } from "@/components/icons/ItemIcons";
import {
  CHESTS,
  RARITIES,
  type ChestType,
  type Item,
} from "@/game/content/items";
import { getAudio } from "@/game/core/AudioEngine";

export interface ChestResult {
  items: Item[];
  newPity: number;
  guaranteed: boolean;
  initialPity: number;
}

export default function ChestScreen({
  chestType,
  result,
  onDone,
}: {
  chestType: ChestType;
  result: ChestResult;
  onDone: () => void;
}) {
  const chest = CHESTS[chestType] ?? CHESTS.wooden;
  const items = result.items;
  const initialPity = result.initialPity;

  // звук по лучшей редкости
  useEffect(() => {
    try {
      const best = items.reduce((acc, it) =>
        RARITIES[it.rarity].order > RARITIES[acc].order ? it.rarity : acc, "common" as const);
      if (best === "legendary") getAudio().play("victory");
      else if (best === "epic") getAudio().play("levelUp");
      else getAudio().play("rune");
    } catch { /* ignore */ }
  }, [items]);

  const [collected, setCollected] = useState(false);

  const handleCollect = () => {
    if (collected) { onDone(); return; }
    // добавление предметов в инвентарь — через store напрямую (event handler, можно)
    const st = (window as unknown as { __store?: { getState: () => { addItem: (it: Item) => void } } }).__store;
    if (st) {
      const s = st.getState();
      items.forEach((it) => s.addItem(it));
    }
    setCollected(true);
    getAudio().play("click");
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-md rounded-lg p-4 z-50">
      {/* сундук SVG */}
      <div className="relative" style={{ width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 48 48">
          <rect x="6" y="20" width="36" height="22" rx="2" fill={chest.color} stroke="#1a0a1e" strokeWidth="2" />
          <path d="M6 20 L42 20 L42 14 Q42 8 36 8 L12 8 Q6 8 6 14 Z" fill={chest.color} stroke="#1a0a1e" strokeWidth="2"
            style={{ transformOrigin: "6px 20px", transition: "transform 0.4s", transform: items.length ? "rotate(-50deg)" : "rotate(0deg)" }} />
          <rect x="20" y="22" width="8" height="8" fill="#c9a227" stroke="#1a0a1e" strokeWidth="1.5" />
          <rect x="10" y="22" width="4" height="16" fill="#fff" opacity="0.2" />
        </svg>
        {items.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-28 h-28 rounded-full" style={{
              background: "radial-gradient(circle, rgba(255,215,0,0.4), transparent 70%)",
            }} />
          </div>
        )}
      </div>

      <div className="font-pixel text-sm text-rune-gold text-glow-gold uppercase tracking-widest text-center">
        {chest.label}
      </div>

      {initialPity >= 20 && items.length === 0 && (
        <div className="font-pixel text-[9px] text-rune-gold-light text-glow-gold animate-pulse text-center">
          ГАРАНТИРОВАННЫЙ ЭПИЧЕСКИЙ!
        </div>
      )}

      {/* предметы */}
      <div className="flex flex-wrap gap-2 justify-center max-w-2xl min-h-[120px] items-center">
        {items.length === 0 && (
          <div className="font-body text-rune-muted text-xs animate-pulse">Открываем...</div>
        )}
        {items.map((it, i) => {
          const rd = RARITIES[it.rarity];
          return (
            <div key={it.uid} className="flex flex-col items-center gap-1 p-2 rounded-lg border-2 bg-[#0a0718]/90 item-pop"
              style={{ borderColor: rd.color, boxShadow: `0 0 14px ${rd.glow}`, animationDelay: `${i * 0.12}s` }}>
              <ItemIcon category={it.category} subType={it.subType} rarity={it.rarity} size={48} />
              <span className="font-pixel text-[8px] text-rune-text text-center leading-tight">{it.name}</span>
              <span className="font-body text-[7px] uppercase tracking-wider" style={{ color: rd.color }}>{rd.label}</span>
              <span className="font-body text-[7px] text-rune-muted text-center leading-tight max-w-[110px]">{it.description}</span>
            </div>
          );
        })}
      </div>

      {items.length > 0 && (
        <div className="flex gap-2">
          {!collected ? (
            <>
              <RuneButton variant="gold" onClick={handleCollect} className="text-xs px-6 py-2">
                Забрать всё
              </RuneButton>
              <RuneButton variant="ghost" onClick={onDone} className="text-[10px]">
                Пропустить
              </RuneButton>
            </>
          ) : (
            <RuneButton variant="gold" onClick={handleCollect} className="text-xs px-6 py-2">
              Продолжить
            </RuneButton>
          )}
        </div>
      )}
    </div>
  );
}

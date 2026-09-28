"use client";

import { useState } from "react";
import { RuneButton } from "@/components/ui/RuneButton";
import { RunePanel, PanelTitle } from "@/components/ui/RunePanel";
import { ItemIcon, EmptySlotIcon } from "@/components/icons/ItemIcons";
import { RARITIES, type Item, type ItemCategory } from "@/game/content/items";
import { useGameStore } from "@/game/core/GameState";
import { useToast } from "@/hooks/use-toast";

const CAT_LABEL: Record<ItemCategory, string> = {
  weapon: "Оружие",
  armor: "Броня",
  amulet: "Амулет",
};

export default function InventoryScreen({ onClose }: { onClose: () => void }) {
  const inventory = useGameStore((s) => s.inventory);
  const equippedItems = useGameStore((s) => s.equippedItems);
  const equipItem = useGameStore((s) => s.equipItem);
  const unequipSlot = useGameStore((s) => s.unequipSlot);
  const { toast } = useToast();
  const [hovered, setHovered] = useState<Item | null>(null);

  const handleEquip = (it: Item) => {
    const cur = equippedItems[it.category];
    if (cur?.uid === it.uid) {
      unequipSlot(it.category);
      toast({ title: "Снято", description: `${it.name} снят.` });
      return;
    }
    equipItem(it);
    toast({ title: "Экипировано", description: `${it.name} → ${CAT_LABEL[it.category]}.` });
  };

  const slots: { cat: ItemCategory; item: Item | null }[] = [
    { cat: "weapon", item: equippedItems.weapon },
    { cat: "armor", item: equippedItems.armor },
    { cat: "amulet", item: equippedItems.amulet },
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center gap-3 bg-black/90 backdrop-blur-md rounded-lg p-3 overflow-y-auto rune-scroll">
      {/* шапка */}
      <div className="w-full flex items-center justify-between gap-2 max-w-3xl">
        <div className="font-pixel text-rune-gold text-glow-gold text-base sm:text-xl tracking-widest">
          ИНВЕНТАРЬ
        </div>
        <RuneButton variant="ghost" onClick={onClose} className="text-[10px]">
          Закрыть
        </RuneButton>
      </div>

      {/* слоты экипировки */}
      <div className="flex gap-3">
        {slots.map(({ cat, item }) => {
          const rd = item ? RARITIES[item.rarity] : null;
          return (
            <div
              key={cat}
              className="flex flex-col items-center gap-1"
              onMouseEnter={() => item && setHovered(item)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="font-pixel text-[8px] text-rune-muted uppercase">{CAT_LABEL[cat]}</span>
              <button
                onClick={() => item && handleEquip(item)}
                onContextMenu={(e) => e.preventDefault()}
                className="w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-all hover:scale-105"
                style={{
                  borderColor: rd ? rd.color : "#3a2a5a",
                  borderStyle: item ? "solid" : "dashed",
                  background: rd ? `radial-gradient(circle, ${rd.glow}, rgba(8,5,18,0.9))` : "rgba(31,22,56,0.4)",
                  boxShadow: rd ? `0 0 12px ${rd.glow}` : "none",
                }}
              >
                {item ? (
                  <ItemIcon category={item.category} subType={item.subType} rarity={item.rarity} size={44} />
                ) : (
                  <EmptySlotIcon category={cat} size={36} />
                )}
              </button>
              {item && (
                <span className="font-pixel text-[7px] text-rune-text text-center leading-tight max-w-[64px] truncate">
                  {item.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* тултип — абсолют, не двигает layout */}
      {hovered && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20 max-w-md px-3 py-2 rounded-lg border-2 bg-[#0a0718]/95 text-center pointer-events-none"
          style={{ borderColor: RARITIES[hovered.rarity].color, boxShadow: `0 0 10px ${RARITIES[hovered.rarity].glow}` }}
        >
          <div className="font-pixel text-[10px]" style={{ color: RARITIES[hovered.rarity].color }}>
            {hovered.name}
          </div>
          <div className="font-body text-[9px] uppercase tracking-wider text-rune-muted mb-1">
            {CAT_LABEL[hovered.category]} · {RARITIES[hovered.rarity].label}
          </div>
          <div className="font-body text-[10px] text-rune-text">{hovered.description}</div>
        </div>
      )}

      {/* сетка инвентаря */}
      <RunePanel className="w-full max-w-2xl">
        <PanelTitle>Предметы ({inventory.length})</PanelTitle>
        <div className="p-3 grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto rune-scroll">
          {inventory.length === 0 && (
            <div className="col-span-full text-center font-body text-[11px] text-rune-muted py-6">
              Инвентарь пуст. Открой сундук на карте или победи элиту/босса.
            </div>
          )}
          {inventory.map((it) => {
            const rd = RARITIES[it.rarity];
            const isEquipped = equippedItems[it.category]?.uid === it.uid;
            return (
              <button
                key={it.uid}
                onClick={() => handleEquip(it)}
                onContextMenu={(e) => e.preventDefault()}
                onMouseEnter={() => setHovered(it)}
                onMouseLeave={() => setHovered((h) => (h?.uid === it.uid ? null : h))}
                className="relative flex flex-col items-center gap-0.5 p-1.5 rounded-lg border-2 bg-[#0a0718]/80"
                style={{
                  borderColor: rd.color,
                  boxShadow: isEquipped ? `0 0 10px ${rd.glow}` : "none",
                }}
              >
                {isEquipped && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rune-gold flex items-center justify-center text-[8px] font-bold text-[#1a0a1e]">
                    E
                  </span>
                )}
                <ItemIcon category={it.category} subType={it.subType} rarity={it.rarity} size={32} />
                <span className="font-pixel text-[6px] text-rune-text text-center leading-tight line-clamp-1 max-w-[52px]">
                  {it.name}
                </span>
              </button>
            );
          })}
        </div>
      </RunePanel>

      <div className="font-body text-[9px] text-rune-muted text-center max-w-md">
        Клик по предмету — экипировать/снять. Наведи для описания. Предметы с буквой E экипированы.
      </div>
    </div>
  );
}

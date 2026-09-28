"use client";

import { useState } from "react";
import { RuneButton } from "@/components/ui/RuneButton";
import { generateShopOffers, type ShopOffer } from "@/game/content/shop";
import { useGameStore } from "@/game/core/GameState";
import { getAudio } from "@/game/core/AudioEngine";
import { RUNES, type RuneId } from "@/game/content/runes";
import { useToast } from "@/hooks/use-toast";

// простые SVG-иконки для товаров
function ShopItemIcon({ icon, size = 40 }: { icon: string; size?: number }) {
  const stroke = "#1a0a1e";
  switch (icon) {
    case "heart":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48">
          <path d="M24 42 C 8 30, 8 14, 18 10 C 22 8, 24 12, 24 16 C 24 12, 26 8, 30 10 C 40 14, 40 30, 24 42 Z" fill="#e23b3b" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="18" cy="18" rx="5" ry="3" fill="#fff" opacity="0.5" />
        </svg>
      );
    case "shield":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48">
          <path d="M24 4 L 40 10 L 40 26 C 40 36, 32 42, 24 44 C 16 42, 8 36, 8 26 L 8 10 Z" fill="#3b7be2" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M24 4 L 40 10 L 40 26 C 40 36, 32 42, 24 44" fill="#fff" opacity="0.2" />
        </svg>
      );
    case "rage":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48">
          <path d="M26 4 L 14 24 L 22 24 L 18 44 L 34 20 L 26 20 L 30 4 Z" fill="#e2c93b" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "key":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48">
          <circle cx="14" cy="14" r="8" fill="#c9a227" stroke={stroke} strokeWidth="2" />
          <circle cx="14" cy="14" r="3" fill={stroke} />
          <rect x="18" y="14" width="22" height="4" fill="#c9a227" stroke={stroke} strokeWidth="1.5" />
          <rect x="34" y="18" width="3" height="6" fill="#c9a227" stroke={stroke} strokeWidth="1" />
          <rect x="28" y="18" width="3" height="6" fill="#c9a227" stroke={stroke} strokeWidth="1" />
        </svg>
      );
    case "rune":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48">
          <polygon points="24,4 40,24 24,44 8,24" fill="#a855f7" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <polygon points="24,4 32,24 24,44 16,24" fill="#fff" opacity="0.2" />
          <text x="24" y="29" textAnchor="middle" fontSize="14" fill="#fff" fontFamily="monospace" fontWeight="bold">R</text>
        </svg>
      );
    case "whetstone":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48">
          <rect x="8" y="18" width="32" height="14" rx="2" fill="#6a6a7a" stroke={stroke} strokeWidth="2" />
          <rect x="10" y="20" width="28" height="3" fill="#fff" opacity="0.3" />
          <path d="M16 10 L 20 18 M28 10 L 32 18" stroke="#c9a227" strokeWidth="2" fill="none" />
        </svg>
      );
    case "regen":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="18" fill="#3be26a" stroke={stroke} strokeWidth="2" />
          <path d="M24 14 L 24 34 M14 24 L 34 24" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    default:
      return <svg width={size} height={size} viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#c9a227" stroke={stroke} strokeWidth="2" /></svg>;
  }
}

export default function ShopScreen({ onDone }: { onDone: () => void }) {
  const dungeonGold = useGameStore((s) => s.dungeonGold);
  const equippedRunes = useGameStore((s) => s.equippedRunes);
  const shopPurchases = useGameStore((s) => s.shopPurchases);
  const addDungeonGold = useGameStore((s) => s.addDungeonGold);
  const setHeroHp = useGameStore((s) => s.setHeroHp);
  const heroHp = useGameStore((s) => s.heroHp);
  const heroMaxHp = useGameStore((s) => s.heroMaxHp);
  const applyRunBonus = useGameStore((s) => s.applyRunBonus);
  const incShopPurchase = useGameStore((s) => s.incShopPurchase);
  const addOwnedRune = useGameStore((s) => s.addOwnedRune);
  const { toast } = useToast();

  const [offers] = useState<ShopOffer[]>(() =>
    generateShopOffers(equippedRunes.length, shopPurchases)
  );
  const [sold, setSold] = useState<Record<number, boolean>>({});

  const handleBuy = (idx: number) => {
    const offer = offers[idx];
    if (sold[idx] || dungeonGold < offer.price) return;
    addDungeonGold(-offer.price);
    incShopPurchase(offer.def.id);
    // применить эффект
    const eff = offer.def.effect;
    switch (eff.kind) {
      case "heal":
        setHeroHp(Math.min(heroMaxHp, heroHp + (eff.amount ?? 0)));
        toast({ title: "Куплено", description: `+${eff.amount} HP (теперь ${Math.min(heroMaxHp, heroHp + (eff.amount ?? 0))}/${heroMaxHp})` });
        break;
      case "shield":
        applyRunBonus({ startShield: eff.amount });
        toast({ title: "Куплено", description: `+${eff.amount} щит в следующем бою` });
        break;
      case "rage":
        applyRunBonus({ startRage: eff.amount });
        toast({ title: "Куплено", description: `+${eff.amount} ярость в следующем бою` });
        break;
      case "key":
        applyRunBonus({ keys: eff.amount });
        toast({ title: "Куплено", description: `+${eff.amount} ключ` });
        break;
      case "rune": {
        const def = RUNES[Math.floor(Math.random() * RUNES.length)];
        addOwnedRune({ id: def.id as RuneId, level: 1, rarity: def.rarity });
        toast({ title: "Куплено", description: `Получена руна: ${def.name}` });
        break;
      }
      case "redDamage":
        applyRunBonus({ redDamageFlat: eff.amount });
        toast({ title: "Куплено", description: `+${eff.amount} к урону красных до конца забега` });
        break;
      case "maxHp":
        applyRunBonus({ maxHpBonus: eff.amount });
        setHeroHp(Math.min(heroMaxHp + (eff.amount ?? 0), heroHp + (eff.amount ?? 0)));
        toast({ title: "Куплено", description: `+${eff.amount} макс HP и лечение` });
        break;
      case "regen":
        applyRunBonus({ regenPerTurn: eff.amount });
        toast({ title: "Куплено", description: `+${eff.amount} HP/ход до конца забега` });
        break;
    }
    setSold({ ...sold, [idx]: true });
    getAudio().play("click");
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-md rounded-lg p-4 z-50">
      <div className="font-pixel text-rune-gold text-glow-gold text-base sm:text-xl uppercase tracking-widest">
        Торговец подземелья
      </div>
      <div className="font-pixel text-[10px] text-rune-gold-light flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#c9a227" stroke="#1a0a1e" strokeWidth="3" /></svg>
        {dungeonGold} золота
      </div>

      <div className="flex flex-col gap-2 w-full max-w-md">
        {offers.map((offer, idx) => {
          const isSold = sold[idx];
          const canAfford = dungeonGold >= offer.price;
          return (
            <div
              key={idx}
              className="flex items-center gap-3 p-2 rounded-lg border-2 bg-[#0a0718]/90"
              style={{
                borderColor: isSold ? "#3a2a5a" : offer.discounted ? "#4a9e5c" : "#3a2a5a",
                opacity: isSold ? 0.5 : 1,
              }}
            >
              <ShopItemIcon icon={offer.def.icon} size={44} />
              <div className="flex-1 min-w-0">
                <div className="font-pixel text-[10px] text-rune-text">{offer.def.name}</div>
                <div className="font-body text-[9px] text-rune-muted leading-tight">{offer.def.description}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {offer.discounted && (
                    <span className="font-pixel text-[8px] text-rune-muted line-through">{offer.originalPrice}</span>
                  )}
                  <span className={`font-pixel text-[9px] ${offer.discounted ? "text-rune-green" : "text-rune-gold"}`}>
                    {offer.price} зол.
                  </span>
                  {offer.discounted && (
                    <span className="font-pixel text-[7px] text-rune-green bg-rune-green/20 px-1 rounded">-20%</span>
                  )}
                </div>
              </div>
              {!isSold ? (
                <RuneButton
                  variant={canAfford ? "gold" : "ghost"}
                  onClick={() => handleBuy(idx)}
                  disabled={!canAfford}
                  className="text-[9px] py-1 px-3"
                >
                  Купить
                </RuneButton>
              ) : (
                <span className="font-pixel text-[8px] text-rune-muted px-2">Продано</span>
              )}
            </div>
          );
        })}
      </div>

      <RuneButton variant="ghost" onClick={onDone} className="text-[10px] mt-1">
        Уйти
      </RuneButton>
    </div>
  );
}

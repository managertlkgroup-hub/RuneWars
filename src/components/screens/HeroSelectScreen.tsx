"use client";

import { RuneButton } from "@/components/ui/RuneButton";
import { RunePanel } from "@/components/ui/RunePanel";
import { HEROES } from "@/game/content/heroes";
import { useGameStore } from "@/game/core/GameState";
import { getAudio } from "@/game/core/AudioEngine";
import { AssetLoader } from "@/game/core/AssetLoader";
import { useToast } from "@/hooks/use-toast";

// PNG-спрайт героя из AssetLoader (chroma-keyed, прозрачный фон)
function HeroPortrait({ id, size = 56 }: { id: string; size?: number }) {
  const img = AssetLoader.getHero(id);
  const src = img?.src ?? `/assets/hero-${id}.png`;
  return (
    <img
      src={src}
      alt={id}
      width={size}
      height={size}
      className="rounded-lg object-contain"
      style={{ imageRendering: "pixelated" }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

export default function HeroSelectScreen({ onClose }: { onClose: () => void }) {
  const unlockedHeroes = useGameStore((s) => s.unlockedHeroes);
  const activeHero = useGameStore((s) => s.activeHero);
  const accountGold = useGameStore((s) => s.accountGold);
  const heroLevels = useGameStore((s) => s.heroLevels);
  const heroPrestige = useGameStore((s) => s.heroPrestige);
  const unlockHero = useGameStore((s) => s.unlockHero);
  const setActiveHero = useGameStore((s) => s.setActiveHero);
  const { toast } = useToast();

  const handleUnlock = (id: string, cost: number, name: string) => {
    const ok = unlockHero(id, cost);
    if (ok) {
      toast({ title: "Герой открыт", description: `${name} теперь доступен!` });
      getAudio().play("victory");
    } else {
      toast({ title: "Недостаточно золота", description: `Нужно ${cost} золота аккаунта.`, variant: "destructive" });
    }
  };

  const handleSelect = (id: string, name: string) => {
    setActiveHero(id);
    toast({ title: "Активный герой", description: `${name} выбран для следующего забега.` });
    getAudio().play("click");
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center gap-3 bg-black/95 backdrop-blur-md rounded-lg p-3 overflow-y-auto rune-scroll">
      <div className="w-full flex items-center justify-between max-w-3xl">
        <div className="font-pixel text-rune-gold text-glow-gold text-base sm:text-xl uppercase tracking-widest">
          Выбор героя
        </div>
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[9px] text-rune-gold-light flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#c9a227" stroke="#1a0a1e" strokeWidth="3" /></svg>
            {accountGold}
          </span>
          <RuneButton variant="ghost" onClick={onClose} className="text-[10px]">Закрыть</RuneButton>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-3xl">
        {HEROES.map((h) => {
          const unlocked = unlockedHeroes.includes(h.id);
          const isActive = activeHero === h.id;
          const level = heroLevels[h.id] ?? 1;
          const prestige = heroPrestige[h.id] ?? 0;
          const canAfford = accountGold >= h.unlockCost;
          return (
            <div
              key={h.id}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border-2 bg-[#0a0718]/90 transition-all"
              style={{
                borderColor: isActive ? "#c9a227" : unlocked ? "#3a5a8a" : "#3a2a5a",
                boxShadow: isActive ? "0 0 14px rgba(201,162,39,0.5)" : "none",
                opacity: unlocked ? 1 : 0.7,
              }}
            >
              <div className="relative">
                <HeroPortrait id={h.id} size={56} />
                {prestige > 0 && (
                  <span className="absolute -top-1 -right-1 font-pixel text-[7px] text-rune-gold-light bg-[#1a0a1e] px-1 rounded">
                    {prestige}★
                  </span>
                )}
              </div>
              <div className="font-pixel text-[9px] text-rune-text text-center">{h.title}</div>
              <div className="font-pixel text-[8px] text-rune-gold text-center">{h.name}</div>
              <div className="font-body text-[7px] text-rune-muted text-center leading-tight min-h-[3em] max-w-[140px]">
                {h.mechanicDesc}
              </div>
              {unlocked ? (
                <div className="flex flex-col items-center gap-0.5 w-full">
                  <div className="font-pixel text-[7px] text-rune-warm">Ур. {level} · {h.baseHp} HP</div>
                  {isActive ? (
                    <span className="font-pixel text-[8px] text-rune-gold-light text-glow-gold">Активен</span>
                  ) : (
                    <RuneButton variant="ghost" onClick={() => handleSelect(h.id, h.name)} className="text-[8px] py-1 px-2 w-full">
                      Выбрать
                    </RuneButton>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5 w-full">
                  <div className="font-pixel text-[8px] text-rune-gold flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#c9a227" stroke="#1a0a1e" strokeWidth="3" /></svg>
                    {h.unlockCost}
                  </div>
                  <RuneButton
                    variant={canAfford ? "gold" : "ghost"}
                    onClick={() => handleUnlock(h.id, h.unlockCost, h.name)}
                    disabled={!canAfford}
                    className="text-[8px] py-1 px-2 w-full"
                  >
                    Открыть
                  </RuneButton>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="font-body text-[9px] text-rune-muted text-center max-w-md">
        Каждый герой имеет уникальную механику цветов. Прокачивай уровни в бою — на 5/10/15/20/25/30 выбор перка.
      </div>
    </div>
  );
}

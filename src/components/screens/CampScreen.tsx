"use client";

import { useState } from "react";
import { RuneButton } from "@/components/ui/RuneButton";
import { useGameStore } from "@/game/core/GameState";
import { getAudio } from "@/game/core/AudioEngine";
import { useToast } from "@/hooks/use-toast";

export default function CampScreen({ onDone, onAmbush }: { onDone: () => void; onAmbush: () => void }) {
  const heroHp = useGameStore((s) => s.heroHp);
  const heroMaxHp = useGameStore((s) => s.heroMaxHp);
  const setHeroHp = useGameStore((s) => s.setHeroHp);
  const addDungeonGold = useGameStore((s) => s.addDungeonGold);
  const applyRunBonus = useGameStore((s) => s.applyRunBonus);
  const { toast } = useToast();
  const [action, setAction] = useState<"none" | "rest" | "inspect">("none");
  const [restResult, setRestResult] = useState<string | null>(null);

  const handleRest = () => {
    const healAmount = Math.floor(heroMaxHp * 0.3);
    const ambush = Math.random() < 0.15;
    if (ambush) {
      setRestResult("ЗАСАДА! Ночью на лагерь напали враги.");
      getAudio().play("enemyAttack");
      setTimeout(() => onAmbush(), 1200);
      return;
    }
    const newHp = Math.min(heroMaxHp, heroHp + healAmount);
    setHeroHp(newHp);
    setRestResult(`Отдых восстановил силы. +${healAmount} HP (теперь ${newHp}/${heroMaxHp}).`);
    getAudio().play("heal");
    setAction("rest");
  };

  const handleInspect = () => {
    const r = Math.random();
    if (r < 0.5) {
      const gold = 15;
      addDungeonGold(gold);
      setRestResult(`В золе костра найдено ${gold} золота!`);
      getAudio().play("rune");
    } else if (r < 0.8) {
      applyRunBonus({ startShield: 5 });
      setRestResult("Угли укрепили твой щит. +5 щит в следующем бою.");
      getAudio().play("shield");
    } else {
      setRestResult("В костре ничего не нашлось. Только пепел и тишина.");
    }
    setAction("inspect");
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-md rounded-lg p-4 z-50">
      {/* костёр SVG */}
      <svg width="80" height="80" viewBox="0 0 48 48">
        {/* палатка */}
        <path d="M24 8 L8 38 L40 38 Z" fill="#5a1a1a" stroke="#1a0a1e" strokeWidth="2" strokeLinejoin="round" />
        <path d="M24 8 L24 38" stroke="#1a0a1e" strokeWidth="1.5" />
        {/* костёр */}
        <path d="M18 30 Q24 20 30 30 Q24 26 18 30 Z" fill="#ff6b1a" stroke="#1a0a1e" strokeWidth="1.5">
          <animate attributeName="d" values="M18 30 Q24 20 30 30 Q24 26 18 30 Z;M18 30 Q24 16 30 30 Q24 28 18 30 Z;M18 30 Q24 20 30 30 Q24 26 18 30 Z" dur="0.5s" repeatCount="indefinite" />
        </path>
        <path d="M22 28 Q24 22 26 28 Q24 26 22 28 Z" fill="#ffd700" />
      </svg>

      <div className="font-pixel text-rune-gold text-glow-gold text-base sm:text-xl uppercase tracking-widest">
        Лагерь
      </div>
      <div className="font-pixel text-[10px] text-rune-warm">
        HP: {heroHp}/{heroMaxHp}
      </div>

      {restResult && (
        <div className="font-body text-[11px] text-rune-text text-center max-w-sm p-2 rounded border border-[#3a2a5a] bg-[#0a0718]/60">
          {restResult}
        </div>
      )}

      {action === "none" && !restResult && (
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <RuneButton variant="gold" onClick={handleRest} className="text-xs py-2">
            Отдохнуть (+30% HP, 15% засада)
          </RuneButton>
          <RuneButton variant="ghost" onClick={handleInspect} className="text-[10px] py-2">
            Осмотреть костёр
          </RuneButton>
          <RuneButton variant="ghost" onClick={onDone} className="text-[10px] py-2">
            Идти дальше без отдыха
          </RuneButton>
        </div>
      )}

      {restResult && !restResult.includes("ЗАСАДА") && (
        <RuneButton variant="gold" onClick={onDone} className="text-xs py-2 px-6">
          Продолжить путь
        </RuneButton>
      )}
    </div>
  );
}

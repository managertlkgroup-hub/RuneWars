"use client";

import { useState } from "react";
import { RuneButton } from "@/components/ui/RuneButton";
import { useGameStore } from "@/game/core/GameState";
import { getAudio } from "@/game/core/AudioEngine";
import { RUNES, type RuneId } from "@/game/content/runes";

interface EventChoice {
  label: string;
  apply: (st: ReturnType<typeof useGameStore.getState>) => string;
}

interface EventDef {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

const EVENT_POOL: EventDef[] = [
  {
    id: "blood_altar",
    title: "Кровавый жертвенник",
    description: "Древний алтарь жаждет крови. Пожертвовать HP за силу?",
    choices: [
      {
        label: "Пожертвовать 12 HP за +1 урон красных",
        apply: (st) => {
          st.setHeroHp(Math.max(1, st.heroHp - 12));
          st.applyRunBonus({ redDamageFlat: 1 });
          return "Жертвенник принял кровь. +1 к урону красных до конца забега.";
        },
      },
      { label: "Отказаться", apply: () => "Ты уходишь от алтаря. Он недоволен." },
    ],
  },
  {
    id: "strange_merchant",
    title: "Странный торговец",
    description: "Торговец предлагает сделку за золото подземелья.",
    choices: [
      {
        label: "Купить за 30 золота: +15 макс HP",
        apply: (st) => {
          if (st.dungeonGold < 30) return "Недостаточно золота!";
          st.addDungeonGold(-30);
          st.applyRunBonus({ maxHpBonus: 15 });
          st.setHeroHp(Math.min(st.heroMaxHp + 15, st.heroHp + 15));
          return "Торговец доволен. +15 макс HP и лечение.";
        },
      },
      { label: "Отказаться", apply: () => "Ты уходишь. Сделка не состоялась." },
    ],
  },
  {
    id: "rune_altar",
    title: "Забытый алтарь рун",
    description: "Алтарь предлагает руну за здоровье.",
    choices: [
      {
        label: "Взять руну за −8 HP (если есть слот)",
        apply: (st) => {
          if (st.equippedRunes.length >= 3) return "Все слоты рун заняты!";
          const def = RUNES[Math.floor(Math.random() * RUNES.length)];
          st.addOwnedRune({ id: def.id as RuneId, level: 1, rarity: def.rarity });
          st.setHeroHp(Math.max(1, st.heroHp - 8));
          return `Алтарь дал руну: ${def.name}. −8 HP.`;
        },
      },
      { label: "Уйти", apply: () => "Ты оставляешь алтарь в покое." },
    ],
  },
  {
    id: "broken_chest",
    title: "Разбитый сундук",
    description: "Старый сундук. Внутри может быть золото... или что-то хуже.",
    choices: [
      {
        label: "Открыть (50% золото, 50% мимик-бой)",
        apply: (st) => {
          if (Math.random() < 0.5) {
            const gold = 30;
            st.addDungeonGold(gold);
            return `В сундуке ${gold} золота!`;
          }
          return "МИМИК! Сундук ожил и атакует!";
        },
      },
      { label: "Пройти мимо", apply: () => "Ты обходишь сундук стороной." },
    ],
  },
];

export default function EventScreen({ onDone, onMimic }: { onDone: () => void; onMimic: () => void }) {
  const [event] = useState<EventDef>(() => EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]);
  const [result, setResult] = useState<string | null>(null);

  const handleChoice = (choice: EventChoice) => {
    const st = useGameStore.getState();
    const msg = choice.apply(st);
    setResult(msg);
    getAudio().play("rune");
    if (msg.includes("МИМИК")) {
      setTimeout(() => onMimic(), 1200);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-md rounded-lg p-4 z-50">
      {/* кристалл-событие */}
      <svg width="70" height="70" viewBox="0 0 48 48">
        <polygon points="24,4 36,18 30,40 18,40 12,18" fill="#8a3a9a" stroke="#1a0a1e" strokeWidth="2" strokeLinejoin="round" />
        <polygon points="24,4 30,18 24,40 18,18" fill="#aa5aba" />
        <text x="24" y="30" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff" fontFamily="monospace">?</text>
      </svg>

      <div className="font-pixel text-rune-gold text-glow-gold text-base sm:text-xl uppercase tracking-widest text-center">
        {event.title}
      </div>
      <div className="font-body text-[11px] text-rune-muted text-center max-w-sm">
        {event.description}
      </div>

      {!result ? (
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {event.choices.map((c, i) => (
            <RuneButton key={i} variant={i === 0 ? "gold" : "ghost"} onClick={() => handleChoice(c)} className="text-[10px] py-2">
              {c.label}
            </RuneButton>
          ))}
        </div>
      ) : (
        <>
          <div className="font-body text-[11px] text-rune-text text-center max-w-sm p-2 rounded border border-[#3a2a5a] bg-[#0a0718]/60">
            {result}
          </div>
          {!result.includes("МИМИК") && (
            <RuneButton variant="gold" onClick={onDone} className="text-xs py-2 px-6">
              Продолжить путь
            </RuneButton>
          )}
        </>
      )}
    </div>
  );
}

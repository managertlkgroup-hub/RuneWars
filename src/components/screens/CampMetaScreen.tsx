"use client";

import { useState } from "react";
import { RuneButton } from "@/components/ui/RuneButton";
import { RunePanel, PanelTitle } from "@/components/ui/RunePanel";
import { HEROES } from "@/game/content/heroes";
import { CAMP_UPGRADES, computeCampUpgradeEffects } from "@/game/content/campUpgrades";
import { useGameStore } from "@/game/core/GameState";
import { getAudio, getAudio as getAudioSingleton } from "@/game/core/AudioEngine";
import { useToast } from "@/hooks/use-toast";

type Tab = "heroes" | "upgrades" | "settings";

function HeroPortrait({ palette, size = 48 }: { palette: { body: string; accent: string; eye: string; cape: string }; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path d="M14 12 Q24 6 34 12 L40 40 L8 40 Z" fill={palette.cape} stroke="#1a0a1e" strokeWidth="1.5" />
      <rect x="18" y="18" width="12" height="14" rx="2" fill={palette.body} stroke="#1a0a1e" strokeWidth="1.5" />
      <circle cx="24" cy="14" r="6" fill="#e8c8a8" stroke="#1a0a1e" strokeWidth="1.5" />
      <path d="M18 14 Q24 6 30 14" fill={palette.accent} stroke="#1a0a1e" strokeWidth="1" />
      <circle cx="22" cy="14" r="1.2" fill={palette.eye} />
      <circle cx="26" cy="14" r="1.2" fill={palette.eye} />
    </svg>
  );
}

export default function CampMetaScreen({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("heroes");
  const accountGold = useGameStore((s) => s.accountGold);
  const unlockedHeroes = useGameStore((s) => s.unlockedHeroes);
  const heroLevels = useGameStore((s) => s.heroLevels);
  const heroXp = useGameStore((s) => s.heroXp);
  const heroPrestige = useGameStore((s) => s.heroPrestige);
  const campUpgrades = useGameStore((s) => s.campUpgrades);
  const settings = useGameStore((s) => s.settings);
  const unlockHero = useGameStore((s) => s.unlockHero);
  const prestigeHero = useGameStore((s) => s.prestigeHero);
  const buyCampUpgrade = useGameStore((s) => s.buyCampUpgrade);
  const setSettings = useGameStore((s) => s.setSettings);
  const resetAll = useGameStore((s) => s.resetAll);
  const { toast } = useToast();

  const handlePrestige = (heroId: string, name: string) => {
    const lvl = heroLevels[heroId] ?? 1;
    if (lvl < 30) {
      toast({ title: "Недостаточно уровня", description: `Нужен 30 уровень (сейчас ${lvl}).`, variant: "destructive" });
      return;
    }
    const prest = heroPrestige[heroId] ?? 0;
    if (prest >= 5) {
      toast({ title: "Максим престижа", description: "Престиж достиг 5 звёзд.", variant: "destructive" });
      return;
    }
    prestigeHero(heroId);
    toast({ title: "Престиж!", description: `${name} возродился! +1 звезда престижа, уровень сброшен. Бонусы сохранены навсегда.` });
    getAudio().play("levelUp");
  };

  const handleBuyUpgrade = (def: typeof CAMP_UPGRADES[number]) => {
    const cur = campUpgrades[def.id] ?? 0;
    if (cur >= def.maxLevel) {
      toast({ title: "Максим", description: "Улучшение максимального уровня." });
      return;
    }
    const cost = def.cost + cur * Math.floor(def.cost * 0.5);
    const ok = buyCampUpgrade(def.id, cost);
    if (ok) {
      toast({ title: "Куплено", description: `${def.name} ур.${cur + 1} (−${cost} золота)` });
      getAudio().play("click");
    } else {
      toast({ title: "Недостаточно золота", description: `Нужно ${cost} золота.`, variant: "destructive" });
    }
  };

  const handleReset = () => {
    resetAll();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("runeWars_meta_v1");
    }
    toast({ title: "Сброшено", description: "Весь прогресс очищен." });
  };

  const upgradeEffects = computeCampUpgradeEffects(campUpgrades);

  return (
    <div className="absolute inset-0 flex flex-col items-center gap-2 bg-black/95 backdrop-blur-md rounded-lg p-3 overflow-y-auto rune-scroll">
      {/* шапка */}
      <div className="w-full flex items-center justify-between max-w-3xl">
        <div className="font-pixel text-rune-gold text-glow-gold text-base sm:text-xl uppercase tracking-widest">
          Лагерь
        </div>
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[9px] text-rune-gold-light flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#c9a227" stroke="#1a0a1e" strokeWidth="3" /></svg>
            {accountGold}
          </span>
          <RuneButton variant="ghost" onClick={onClose} className="text-[10px]">Закрыть</RuneButton>
        </div>
      </div>

      {/* вкладки */}
      <div className="flex gap-1 w-full max-w-3xl">
        <RuneButton variant={tab === "heroes" ? "gold" : "ghost"} onClick={() => setTab("heroes")} className="text-[10px] flex-1">Герои</RuneButton>
        <RuneButton variant={tab === "upgrades" ? "gold" : "ghost"} onClick={() => setTab("upgrades")} className="text-[10px] flex-1">Улучшения</RuneButton>
        <RuneButton variant={tab === "settings" ? "gold" : "ghost"} onClick={() => setTab("settings")} className="text-[10px] flex-1">Настройки</RuneButton>
      </div>

      {/* контент вкладок */}
      {tab === "heroes" && (
        <div className="w-full max-w-3xl flex flex-col gap-2">
          {HEROES.map((h) => {
            const unlocked = unlockedHeroes.includes(h.id);
            const lvl = heroLevels[h.id] ?? 1;
            const xp = heroXp[h.id] ?? 0;
            const need = 100 + lvl * 100;
            const pct = Math.min(100, (xp / need) * 100);
            const prest = heroPrestige[h.id] ?? 0;
            const canPrestige = lvl >= 30 && prest < 5;
            return (
              <div key={h.id} className="flex items-center gap-3 p-2 rounded-lg border-2 bg-[#0a0718]/80"
                style={{ borderColor: prest > 0 ? "#ffd700" : unlocked ? "#3a5a8a" : "#3a2a5a" }}>
                <HeroPortrait palette={h.palette} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-[9px] text-rune-text">{h.title} {h.name}</span>
                    {prest > 0 && <span className="font-pixel text-[7px] text-rune-gold">{prest}★</span>}
                    <span className="font-pixel text-[7px] text-rune-muted">ур.{lvl}</span>
                  </div>
                  <div className="font-body text-[7px] text-rune-muted leading-tight mb-1">{h.mechanicDesc}</div>
                  {unlocked ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-sm bg-[#0a0718] overflow-hidden border border-[#3a2a5a]">
                        <div className="h-full bg-gradient-to-r from-rune-green to-rune-warm" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-pixel text-[7px] text-rune-green">{xp}/{need}</span>
                    </div>
                  ) : (
                    <span className="font-pixel text-[8px] text-rune-gold">Цена: {h.unlockCost}</span>
                  )}
                </div>
                {unlocked ? (
                  canPrestige ? (
                    <RuneButton variant="gold" onClick={() => handlePrestige(h.id, h.name)} className="text-[9px] py-1 px-2">Престиж</RuneButton>
                  ) : prest >= 5 ? (
                    <span className="font-pixel text-[7px] text-rune-gold-light">МАКС★</span>
                  ) : (
                    <span className="font-pixel text-[7px] text-rune-muted">{lvl < 30 ? `до престижа: ${30 - lvl}` : ""}</span>
                  )
                ) : (
                  <RuneButton variant={accountGold >= h.unlockCost ? "gold" : "ghost"} onClick={() => {
                    const ok = unlockHero(h.id, h.unlockCost);
                    if (ok) { toast({ title: "Герой открыт", description: h.name }); getAudio().play("victory"); }
                    else toast({ title: "Недостаточно золота", variant: "destructive" });
                  }} disabled={accountGold < h.unlockCost} className="text-[9px] py-1 px-2">Открыть</RuneButton>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "upgrades" && (
        <div className="w-full max-w-3xl flex flex-col gap-2">
          <div className="font-body text-[9px] text-rune-muted text-center mb-1">
            Улучшения действуют на ВСЕХ героев. Цена растёт с каждым уровнем.
          </div>
          {CAMP_UPGRADES.map((def) => {
            const cur = campUpgrades[def.id] ?? 0;
            const maxed = cur >= def.maxLevel;
            const cost = def.cost + cur * Math.floor(def.cost * 0.5);
            const canAfford = accountGold >= cost;
            return (
              <div key={def.id} className="flex items-center gap-3 p-2 rounded-lg border-2 bg-[#0a0718]/80"
                style={{ borderColor: maxed ? "#ffd700" : "#3a5a8a" }}>
                <div className="flex-1">
                  <div className="font-pixel text-[9px] text-rune-text">{def.name}</div>
                  <div className="font-body text-[8px] text-rune-muted">{def.description}</div>
                  <div className="font-pixel text-[7px] text-rune-green">Ур. {cur}/{def.maxLevel}</div>
                </div>
                {!maxed ? (
                  <RuneButton variant={canAfford ? "gold" : "ghost"} onClick={() => handleBuyUpgrade(def)} disabled={!canAfford} className="text-[9px] py-1 px-2">
                    {cost} зол.
                  </RuneButton>
                ) : (
                  <span className="font-pixel text-[7px] text-rune-gold-light">МАКС</span>
                )}
              </div>
            );
          })}
          <RunePanel className="mt-2">
            <PanelTitle>Текущие бонусы</PanelTitle>
            <div className="p-2 font-body text-[10px] text-rune-text">
              {Object.keys(upgradeEffects).length === 0 ? "Нет купленных улучшений." : 
                `+${upgradeEffects.maxHpBonus ?? 0} HP, +${upgradeEffects.redDamageFlat ?? 0} урон, +${upgradeEffects.healFlat ?? 0} лечение, +${upgradeEffects.startShield ?? 0} старт.щит`}
            </div>
          </RunePanel>
        </div>
      )}

      {tab === "settings" && (
        <div className="w-full max-w-3xl flex flex-col gap-3">
          <RunePanel>
            <PanelTitle>Звук</PanelTitle>
            <div className="p-3 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-body text-[11px] text-rune-text">Звуковые эффекты</span>
                <input type="checkbox" checked={settings.sound} onChange={(e) => {
                  setSettings({ sound: e.target.checked });
                  getAudioSingleton().setMuted(!e.target.checked);
                }} className="w-5 h-5 accent-rune-gold" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-body text-[11px] text-rune-text">Музыка</span>
                <input type="checkbox" checked={settings.music} onChange={(e) => setSettings({ music: e.target.checked })} className="w-5 h-5 accent-rune-gold" />
              </label>
            </div>
          </RunePanel>
          <RunePanel>
            <PanelTitle>Сброс прогресса</PanelTitle>
            <div className="p-3">
              <div className="font-body text-[10px] text-rune-muted mb-2">Удалить весь прогресс: золото, герои, уровни, перки, руны, инвентарь.</div>
              <RuneButton variant="danger" onClick={handleReset} className="text-[10px]">Сбросить весь прогресс</RuneButton>
            </div>
          </RunePanel>
        </div>
      )}
    </div>
  );
}

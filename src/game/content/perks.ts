// RUNE WARS — перки: выбор каждые 5 уровней

export interface PerkDef {
  id: string;
  level: number; // на каком уровне предлагается
  name: string;
  description: string;
  // эффект — применяется к герою в бою
  effect: {
    maxHp?: number; // +макс HP
    redDamageFlat?: number; // +к урону красных
    healFlat?: number; // +к лечению
    rageMult?: number; // множитель ярости
    shieldMult?: number; // множитель щита
    healMult?: number; // множитель лечения
    critChance?: number; // шанс крита красных (0..1)
    vampirePct?: number; // вампиризм (0..1)
    dodgeChance?: number; // уклонение (0..1)
    ultaMult?: number; // множитель ярость-удара (×3)
    autoShield?: number; // стартовый щит
    startRage?: number; // стартовая ярость
    doubleStrike?: boolean; // двойной удар красных
    regenPerTurn?: number; // реген HP/ход
    shieldAbsorb?: number; // множитель поглощения щита
    legendaryPassive?: string; // уникальный пассив (престиж/30)
  };
}

// Пул перков по уровням (3 варианта на каждый)
export const PERK_POOLS: Record<number, PerkDef[]> = {
  5: [
    { id: "hp5", level: 5, name: "Закалка", description: "+10 макс HP", effect: { maxHp: 10 } },
    { id: "dmg5", level: 5, name: "Острота", description: "+2 к урону красных", effect: { redDamageFlat: 2 } },
    { id: "heal5", level: 5, name: "Целитель", description: "+1 к лечению", effect: { healFlat: 1 } },
  ],
  10: [
    { id: "rage10", level: 10, name: "Ярость боя", description: "+20% ярости", effect: { rageMult: 0.2 } },
    { id: "shield10", level: 10, name: "Стойкость", description: "+15% щита", effect: { shieldMult: 0.15 } },
    { id: "heal10", level: 10, name: "Восстановление", description: "+10% лечения", effect: { healMult: 0.1 } },
  ],
  15: [
    { id: "crit15", level: 15, name: "Критический удар", description: "10% шанс крита красных (×1.5)", effect: { critChance: 0.1 } },
    { id: "vamp15", level: 15, name: "Вампиризм", description: "5% урона красных → HP", effect: { vampirePct: 0.05 } },
    { id: "dodge15", level: 15, name: "Уклонение", description: "10% шанс уклониться от атаки", effect: { dodgeChance: 0.1 } },
  ],
  20: [
    { id: "ulta20", level: 20, name: "Ульта ×3", description: "Ярость-удар ×3 вместо ×2", effect: { ultaMult: 3 } },
    { id: "autoshield20", level: 20, name: "Авто-щит", description: "+10 стартового щита в бою", effect: { autoShield: 10 } },
    { id: "startrage20", level: 20, name: "Боевой задор", description: "Старт с +20 ярости", effect: { startRage: 20 } },
  ],
  25: [
    { id: "double25", level: 25, name: "Двойной удар", description: "Красный матч бьёт дважды (упрощённо: +50% урона)", effect: { redDamageFlat: 5 } },
    { id: "regen25", level: 25, name: "Регенерация", description: "+1 HP за ход", effect: { regenPerTurn: 1 } },
    { id: "absorb25", level: 25, name: "Поглощение", description: "Щит поглощает на 20% больше (×1.2)", effect: { shieldAbsorb: 0.2 } },
  ],
  30: [
    { id: "leg30", level: 30, name: "Легендарный дар", description: "+20 макс HP, +5 урон красным, +2 реген/ход", effect: { maxHp: 20, redDamageFlat: 5, regenPerTurn: 2, legendaryPassive: "ascended" } },
  ],
};

export function getPerkPool(level: number): PerkDef[] {
  return PERK_POOLS[level] ?? [];
}

/** Вычислить суммарные эффекты выбранных перков героя. */
export function computePerkEffects(
  heroId: string,
  heroPerks: Record<string, number[]>,
  heroPrestige: Record<string, number>
): PerkDef["effect"] {
  const result: PerkDef["effect"] = {};
  const levels = [5, 10, 15, 20, 25, 30];
  for (const lvl of levels) {
    const key = `${heroId}-${lvl}`;
    const chosen = heroPerks[key];
    if (!chosen || chosen.length === 0) continue;
    const pool = PERK_POOLS[lvl];
    for (const idx of chosen) {
      const perk = pool[idx];
      if (!perk) continue;
      const e = perk.effect;
      result.maxHp = (result.maxHp ?? 0) + (e.maxHp ?? 0);
      result.redDamageFlat = (result.redDamageFlat ?? 0) + (e.redDamageFlat ?? 0);
      result.healFlat = (result.healFlat ?? 0) + (e.healFlat ?? 0);
      result.rageMult = (result.rageMult ?? 0) + (e.rageMult ?? 0);
      result.shieldMult = (result.shieldMult ?? 0) + (e.shieldMult ?? 0);
      result.healMult = (result.healMult ?? 0) + (e.healMult ?? 0);
      result.critChance = (result.critChance ?? 0) + (e.critChance ?? 0);
      result.vampirePct = (result.vampirePct ?? 0) + (e.vampirePct ?? 0);
      result.dodgeChance = (result.dodgeChance ?? 0) + (e.dodgeChance ?? 0);
      result.ultaMult = Math.max(result.ultaMult ?? 2, e.ultaMult ?? 0);
      result.autoShield = (result.autoShield ?? 0) + (e.autoShield ?? 0);
      result.startRage = (result.startRage ?? 0) + (e.startRage ?? 0);
      result.doubleStrike = result.doubleStrike || e.doubleStrike;
      result.regenPerTurn = (result.regenPerTurn ?? 0) + (e.regenPerTurn ?? 0);
      result.shieldAbsorb = (result.shieldAbsorb ?? 0) + (e.shieldAbsorb ?? 0);
      if (e.legendaryPassive) result.legendaryPassive = e.legendaryPassive;
    }
  }
  // престиж: +5% к урону за каждый престиж
  const prestige = heroPrestige[heroId] ?? 0;
  if (prestige > 0) {
    result.redDamageFlat = (result.redDamageFlat ?? 0) + prestige * 2;
    result.maxHp = (result.maxHp ?? 0) + prestige * 10;
  }
  return result;
}

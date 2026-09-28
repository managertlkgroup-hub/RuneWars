// RUNE WARS — улучшения лагеря (мета-покупки за accountGold)

export interface CampUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
  // эффект — применяется к герою в бою
  effect: {
    maxHpBonus?: number;
    redDamageFlat?: number;
    healFlat?: number;
    startShield?: number;
  };
}

export const CAMP_UPGRADES: CampUpgradeDef[] = [
  {
    id: "hp_boost",
    name: "Сердце дракона",
    description: "+10 макс HP для всех героев",
    cost: 100,
    maxLevel: 10,
    effect: { maxHpBonus: 10 },
  },
  {
    id: "dmg_boost",
    name: "Точильный камень",
    description: "+2 к урону красных матчей",
    cost: 150,
    maxLevel: 10,
    effect: { redDamageFlat: 2 },
  },
  {
    id: "heal_boost",
    name: "Святая вода",
    description: "+1 к лечению зелёных матчей",
    cost: 120,
    maxLevel: 10,
    effect: { healFlat: 1 },
  },
  {
    id: "shield_boost",
    name: "Каменный щит",
    description: "+1 стартовый щит в бою",
    cost: 200,
    maxLevel: 5,
    effect: { startShield: 1 },
  },
];

/** Суммарные эффекты улучшений лагеря (по всем купленным уровням). */
export function computeCampUpgradeEffects(
  campUpgrades: Record<string, number>
): CampUpgradeDef["effect"] {
  const result: CampUpgradeDef["effect"] = {};
  for (const def of CAMP_UPGRADES) {
    const lvl = campUpgrades[def.id] ?? 0;
    if (lvl <= 0) continue;
    result.maxHpBonus = (result.maxHpBonus ?? 0) + (def.effect.maxHpBonus ?? 0) * lvl;
    result.redDamageFlat = (result.redDamageFlat ?? 0) + (def.effect.redDamageFlat ?? 0) * lvl;
    result.healFlat = (result.healFlat ?? 0) + (def.effect.healFlat ?? 0) * lvl;
    result.startShield = (result.startShield ?? 0) + (def.effect.startShield ?? 0) * lvl;
  }
  return result;
}

// RUNE WARS — предметы, редкости, сундуки, pity-таймер

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type ItemCategory = "weapon" | "armor" | "amulet";
export type ChestType = "wooden" | "silver" | "gold" | "legendary";

export interface RarityDef {
  id: Rarity;
  label: string;
  color: string; // рамка/свечение
  glow: string;
  chance: number; // базовый шанс (0..1)
  order: number;
}

export const RARITIES: Record<Rarity, RarityDef> = {
  common: { id: "common", label: "Обычный", color: "#8a8a8a", glow: "rgba(138,138,138,0.5)", chance: 0.6, order: 0 },
  uncommon: { id: "uncommon", label: "Необычный", color: "#4a9e5c", glow: "rgba(74,158,92,0.55)", chance: 0.25, order: 1 },
  rare: { id: "rare", label: "Редкий", color: "#4a8bff", glow: "rgba(74,139,255,0.6)", chance: 0.1, order: 2 },
  epic: { id: "epic", label: "Эпический", color: "#a855f7", glow: "rgba(168,85,247,0.65)", chance: 0.04, order: 3 },
  legendary: { id: "legendary", label: "Легендарный", color: "#ffd700", glow: "rgba(255,215,0,0.7)", chance: 0.01, order: 4 },
};

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export interface ItemBonus {
  damageBonus?: number; // +X к урону красных (множитель, 0.2 = +20%)
  maxHpBonus?: number; // +X к макс HP
  shieldBonus?: number; // +X щит за синий матч
  ragePerTurn?: number; // +X ярости за ход
  healPerTurn?: number; // +X HP за ход
  legendaryEffect?: string; // ключ уникального эффекта
}

export interface Item {
  uid: string; // уникальный id экземпляра
  category: ItemCategory;
  subType: string; // sword/axe/staff/dagger/chainmail/mantle/leather/amulet/talisman/charm
  name: string;
  rarity: Rarity;
  baseValue: number;
  description: string;
  bonus: ItemBonus;
}

export interface ChestDef {
  id: ChestType;
  label: string;
  itemCount: number;
  rarityCap: Rarity; // максимально возможная редкость
  guaranteedLegendary?: boolean;
  color: string;
}

export const CHESTS: Record<ChestType, ChestDef> = {
  wooden: { id: "wooden", label: "Деревянный сундук", itemCount: 1, rarityCap: "uncommon", color: "#7a4a1a" },
  silver: { id: "silver", label: "Серебряный сундук", itemCount: 2, rarityCap: "rare", color: "#b8b8c8" },
  gold: { id: "gold", label: "Золотой сундук", itemCount: 3, rarityCap: "epic", color: "#ffd700" },
  legendary: { id: "legendary", label: "Легендарный сундук", itemCount: 4, rarityCap: "legendary", guaranteedLegendary: true, color: "#a855f7" },
};

/** Определить тип сундука по этажу. */
export function chestTypeForFloor(floor: number, isBoss: boolean): ChestType {
  if (isBoss) return Math.random() < 0.5 ? "gold" : "legendary";
  if (floor <= 2) return Math.random() < 0.5 ? "wooden" : "silver";
  return Math.random() < 0.5 ? "silver" : "gold";
}

let itemUidCounter = 1;
function nextUid(): string {
  return `item_${Date.now().toString(36)}_${itemUidCounter++}`;
}

const WEAPON_BASES: { sub: string; name: string }[] = [
  { sub: "sword", name: "меч" },
  { sub: "axe", name: "топор" },
  { sub: "staff", name: "посох" },
  { sub: "dagger", name: "кинжал" },
];
const ARMOR_BASES: { sub: string; name: string }[] = [
  { sub: "chainmail", name: "кольчуга" },
  { sub: "mantle", name: "мантия" },
  { sub: "leather", name: "кожа" },
];
const AMULET_BASES: { sub: string; name: string }[] = [
  { sub: "amulet", name: "амулет" },
  { sub: "talisman", name: "талисман" },
  { sub: "charm", name: "оберег" },
];

const RARITY_PREFIX: Record<Rarity, string[]> = {
  common: ["Простой", "Обычный"],
  uncommon: ["Крепкий", "Острый", "Надёжный"],
  rare: ["Зачарованный", "Рунный", "Боевой"],
  epic: ["Эпический", "Рунический", "Древний"],
  legendary: ["Легендарный", "Божественный", "Проклятый"],
};

const RARITY_VALUE: Record<Rarity, [number, number]> = {
  common: [1, 3],
  uncommon: [3, 6],
  rare: [6, 10],
  epic: [10, 15],
  legendary: [15, 22],
};

const LEGENDARY_EFFECTS: { category: ItemCategory; effect: string; description: string }[] = [
  { category: "weapon", effect: "fury_strike", description: "Каждый 3-й красный матч наносит +50% урона." },
  { category: "armor", effect: "iron_skin", description: "+15% к сохранению щита после боя." },
  { category: "amulet", effect: "endless_rage", description: "+2 ярости каждый ход." },
  { category: "amulet", effect: "regen_aura", description: "Регенерация 3 HP каждый ход." },
];

function randRange(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Случайная редкость по базовым шансам, с учётом капа. */
function rollRarity(cap: Rarity, forceMin?: Rarity): Rarity {
  if (forceMin) {
    // clamp forceMin к cap (если forceMin выше капа — понизить до капа)
    const minOrder = Math.min(RARITIES[forceMin].order, RARITIES[cap].order);
    const capOrder = RARITIES[cap].order;
    const order = RARITY_ORDER.filter(
      (x) => RARITIES[x].order >= minOrder && RARITIES[x].order <= capOrder
    );
    if (order.length === 0) return cap;
    const total = order.reduce((s, r) => s + RARITIES[r].chance, 0);
    if (total <= 0) return order[order.length - 1];
    const r = Math.random();
    let roll = r * total;
    for (const r2 of order) {
      roll -= RARITIES[r2].chance;
      if (roll <= 0) return r2;
    }
    return order[order.length - 1];
  }
  const r = Math.random();
  let acc = 0;
  for (const rar of RARITY_ORDER) {
    if (RARITIES[rar].order > RARITIES[cap].order) break;
    acc += RARITIES[rar].chance;
    if (r <= acc) return rar;
  }
  return "common";
}

function makeItem(category: ItemCategory, rarity: Rarity): Item {
  let bases: { sub: string; name: string }[];
  if (category === "weapon") bases = WEAPON_BASES;
  else if (category === "armor") bases = ARMOR_BASES;
  else bases = AMULET_BASES;
  const base = pick(bases);
  const prefix = pick(RARITY_PREFIX[rarity]);
  const [vmin, vmax] = RARITY_VALUE[rarity];
  const baseValue = randRange(vmin, vmax);
  const bonus: ItemBonus = {};
  let description = "";
  let legendaryEffect: string | undefined;

  if (category === "weapon") {
    bonus.damageBonus = baseValue * 0.05; // +5% за единицу
    description = `+${Math.round(bonus.damageBonus * 100)}% к урону красных матчей`;
    if (rarity === "legendary") {
      const le = pick(LEGENDARY_EFFECTS.filter((e) => e.category === "weapon"));
      legendaryEffect = le.effect;
      description += `. ${le.description}`;
    }
  } else if (category === "armor") {
    bonus.maxHpBonus = baseValue * 2;
    if (rarity !== "common") bonus.shieldBonus = Math.floor(baseValue / 2);
    description = `+${bonus.maxHpBonus} макс. HP`;
    if (bonus.shieldBonus) description += `, +${bonus.shieldBonus} щит за синий`;
    if (rarity === "legendary") {
      const le = pick(LEGENDARY_EFFECTS.filter((e) => e.category === "armor"));
      legendaryEffect = le.effect;
      description += `. ${le.description}`;
    }
  } else {
    // amulet
    if (Math.random() < 0.5) {
      bonus.ragePerTurn = Math.max(1, Math.floor(baseValue / 3));
      description = `+${bonus.ragePerTurn} ярости каждый ход`;
    } else {
      bonus.healPerTurn = Math.max(1, Math.floor(baseValue / 3));
      description = `+${bonus.healPerTurn} HP каждый ход`;
    }
    if (rarity === "legendary") {
      const le = pick(LEGENDARY_EFFECTS.filter((e) => e.category === "amulet"));
      legendaryEffect = le.effect;
      description += `. ${le.description}`;
      if (le.effect === "endless_rage") bonus.ragePerTurn = (bonus.ragePerTurn ?? 0) + 2;
      if (le.effect === "regen_aura") bonus.healPerTurn = (bonus.healPerTurn ?? 0) + 3;
    }
  }

  return {
    uid: nextUid(),
    category,
    subType: base.sub,
    name: `${prefix} ${base.name}`,
    rarity,
    baseValue,
    description,
    bonus: { ...bonus, legendaryEffect },
  };
}

export interface ChestOpenResult {
  items: Item[];
  newPityCounter: number;
  guaranteedEpic: boolean;
}

/**
 * Открыть сундук. Возвращает предметы и обновлённый pity-счётчик.
 * pityCounter >= 20 → гарантирован минимум эпический.
 */
export function openChest(chestType: ChestType, pityCounter: number): ChestOpenResult {
  const chest = CHESTS[chestType];
  const guaranteedEpic = pityCounter >= 20;
  let newPity = pityCounter;
  const items: Item[] = [];

  for (let i = 0; i < chest.itemCount; i++) {
    let rarity: Rarity;
    if (chest.guaranteedLegendary && i === 0) {
      rarity = "legendary";
    } else if (guaranteedEpic && i === 0) {
      rarity = rollRarity(chest.rarityCap, "epic");
    } else {
      rarity = rollRarity(chest.rarityCap);
    }
    // категория случайная
    const cat = pick(["weapon", "armor", "amulet"] as ItemCategory[]);
    items.push(makeItem(cat, rarity));
  }

  // pity: если ни одного эпического+ → счётчик растёт; иначе сброс
  const hasEpicPlus = items.some((it) => RARITIES[it.rarity].order >= RARITIES.epic.order);
  if (hasEpicPlus) {
    newPity = 0;
  } else {
    newPity = pityCounter + 1;
  }

  return { items, newPityCounter: newPity, guaranteedEpic };
}

/** Гарантированный дроп с элиты (редкий+). */
export function dropEliteLoot(): Item {
  const cat = pick(["weapon", "armor", "amulet"] as ItemCategory[]);
  const rarity = rollRarity("epic", "rare");
  return makeItem(cat, rarity);
}

/** Гарантированный дроп с босса (эпический+). */
export function dropBossLoot(): Item {
  const cat = pick(["weapon", "armor", "amulet"] as ItemCategory[]);
  const rarity = rollRarity("legendary", "epic");
  return makeItem(cat, rarity);
}

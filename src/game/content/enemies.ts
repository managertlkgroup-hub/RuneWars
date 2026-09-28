// RUNE WARS — контент: враги и подземелья

export type EnemyArchetype =
  | "goblin_warrior"
  | "goblin_archer"
  | "slime"
  | "goblin_shaman"
  | "skeleton_warrior"
  | "skeleton_archer"
  | "skeleton_mage"
  | "bone_slime"
  | "water_golem"
  | "mutant_fish"
  | "blue_slime"
  | "drowned_zombie"
  | "shadow_creature"
  | "ghost"
  | "lesser_demon"
  | "nightmare_horse"
  | "demon_blacksmith"
  | "fire_elemental"
  | "magma_golem"
  | "infernal_guardian";

export type BossArchetype =
  | "goblin_king"
  | "lich"
  | "stone_golem"
  | "dark_priest"
  | "ancient_master";

export interface EnemyDef {
  id: string;
  name: string;
  archetype: EnemyArchetype | BossArchetype;
  hp: number;
  attack: number;
  attackInterval: number; // каждые N ходов игрока
  isBoss: boolean;
  // особые механики (для этапа 2 упрощены)
  trait?: "resurrect" | "split" | "dodge" | "shieldbreak";
  // палитра для рендера
  palette: { body: string; accent: string; eye: string };
}

export interface DungeonDef {
  id: number;
  name: string;
  subtitle: string;
  enemyHp: number;
  enemyAttack: number;
  bossHp: number;
  bossAttack: number;
  regularEnemies: EnemyDef[];
  boss: EnemyDef;
}

// Хелперы для масштабирования по этажам
export const FLOOR_HP_MULT = [1.0, 1.1, 1.25, 1.4, 1.0];
export const FLOOR_ATK_MULT = [1.0, 1.05, 1.15, 1.25, 1.0];

export function floorScale(floor: number, hp: number, atk: number) {
  const i = Math.min(Math.max(floor - 1, 0), 4);
  return {
    hp: Math.round(hp * FLOOR_HP_MULT[i]),
    atk: Math.round(atk * FLOOR_ATK_MULT[i]),
  };
}

function mkEnemy(
  id: string,
  name: string,
  archetype: EnemyArchetype,
  hp: number,
  attack: number,
  palette: EnemyDef["palette"],
  interval = 3,
  trait?: EnemyDef["trait"]
): EnemyDef {
  return { id, name, archetype, hp, attack, attackInterval: interval, isBoss: false, trait, palette };
}

function mkBoss(
  id: string,
  name: string,
  archetype: BossArchetype,
  hp: number,
  attack: number,
  palette: EnemyDef["palette"],
  interval = 3
): EnemyDef {
  return { id, name, archetype, hp, attack, attackInterval: interval, isBoss: true, palette };
}

export const DUNGEONS: DungeonDef[] = [
  {
    id: 1,
    name: "Крипта Гоблинов",
    subtitle: "Этаж I · Подземелье костей",
    enemyHp: 30,
    enemyAttack: 5,
    bossHp: 100,
    bossAttack: 10,
    regularEnemies: [
      mkEnemy("goblin_warrior", "Гоблин-воин", "goblin_warrior", 30, 5, { body: "#6a8a4a", accent: "#8b3a1a", eye: "#ffcc33" }),
      mkEnemy("goblin_archer", "Гоблин-лучник", "goblin_archer", 26, 6, { body: "#5a7a3a", accent: "#3a2a1a", eye: "#ffaa22" }, 3),
      mkEnemy("slime", "Слизень", "slime", 34, 4, { body: "#4aa86a", accent: "#2a6a4a", eye: "#ffeebb" }, 4, "split"),
      mkEnemy("goblin_shaman", "Гоблин-шаман", "goblin_shaman", 28, 7, { body: "#7a5a3a", accent: "#c9a227", eye: "#aa44ff" }, 4),
    ],
    boss: mkBoss("goblin_king", "Король Гоблинов", "goblin_king", 100, 10, { body: "#8a6a2a", accent: "#c9a227", eye: "#ff3333" }, 3),
  },
  {
    id: 2,
    name: "Кости Древних",
    subtitle: "Этаж II · Залы праха",
    enemyHp: 45,
    enemyAttack: 7,
    bossHp: 150,
    bossAttack: 14,
    regularEnemies: [
      mkEnemy("skeleton_warrior", "Скелет-воин", "skeleton_warrior", 45, 7, { body: "#d8c8a8", accent: "#6a5a4a", eye: "#ff5522" }, 3, "resurrect"),
      mkEnemy("skeleton_archer", "Скелет-лучник", "skeleton_archer", 40, 8, { body: "#c8b898", accent: "#4a3a2a", eye: "#ff6633" }, 3),
      mkEnemy("skeleton_mage", "Скелет-маг", "skeleton_mage", 38, 9, { body: "#a898c8", accent: "#5a3a8a", eye: "#66aaff" }, 4),
      mkEnemy("bone_slime", "Костяной слизень", "bone_slime", 50, 6, { body: "#c8b8a8", accent: "#6a4a3a", eye: "#ffeebb" }, 4, "split"),
    ],
    boss: mkBoss("lich", "Лич", "lich", 150, 14, { body: "#9a8aca", accent: "#5a3a8a", eye: "#66ddff" }, 3),
  },
  {
    id: 3,
    name: "Затонувший Зал",
    subtitle: "Этаж III · Пучины",
    enemyHp: 65,
    enemyAttack: 9,
    bossHp: 210,
    bossAttack: 18,
    regularEnemies: [
      mkEnemy("water_golem", "Водный голем", "water_golem", 65, 9, { body: "#3a7ab8", accent: "#1a4a8a", eye: "#aaeeff" }, 3, "shieldbreak"),
      mkEnemy("mutant_fish", "Мутант-рыба", "mutant_fish", 58, 10, { body: "#4a8aa8", accent: "#2a5a6a", eye: "#ffaa44" }, 3),
      mkEnemy("blue_slime", "Синий слизень", "blue_slime", 70, 7, { body: "#3a8ad8", accent: "#1a4a8a", eye: "#ddf4ff" }, 4, "split"),
      mkEnemy("drowned_zombie", "Утопленник", "drowned_zombie", 60, 11, { body: "#4a6a5a", accent: "#2a3a2a", eye: "#88ffaa" }, 3),
    ],
    boss: mkBoss("stone_golem", "Голем-Хранитель", "stone_golem", 210, 18, { body: "#8a8a9a", accent: "#3a3a4a", eye: "#ffaa22" }, 3),
  },
  {
    id: 4,
    name: "Обитель Теней",
    subtitle: "Этаж IV · Сумрак",
    enemyHp: 90,
    enemyAttack: 12,
    bossHp: 290,
    bossAttack: 24,
    regularEnemies: [
      mkEnemy("shadow_creature", "Теневик", "shadow_creature", 90, 12, { body: "#3a2a4a", accent: "#6a4a9a", eye: "#cc66ff" }, 3, "dodge"),
      mkEnemy("ghost", "Призрак", "ghost", 80, 13, { body: "#aab8d8", accent: "#5a6a8a", eye: "#88ccff" }, 3, "dodge"),
      mkEnemy("lesser_demon", "Малый демон", "lesser_demon", 95, 14, { body: "#8a2a2a", accent: "#c9a227", eye: "#ff5522" }, 3),
      mkEnemy("nightmare_horse", "Кошмар-конь", "nightmare_horse", 100, 11, { body: "#2a1a3a", accent: "#5a3a6a", eye: "#ff44aa" }, 3),
    ],
    boss: mkBoss("dark_priest", "Тёмный Жрец", "dark_priest", 290, 24, { body: "#5a2a5a", accent: "#c9a227", eye: "#ff44aa" }, 3),
  },
  {
    id: 5,
    name: "Сердце Кузни",
    subtitle: "Этаж V · Кузница рун",
    enemyHp: 120,
    enemyAttack: 15,
    bossHp: 400,
    bossAttack: 30,
    regularEnemies: [
      mkEnemy("demon_blacksmith", "Демон-кузнец", "demon_blacksmith", 120, 15, { body: "#6a3a1a", accent: "#ff6a22", eye: "#ffaa22" }, 3),
      mkEnemy("fire_elemental", "Огненный элементаль", "fire_elemental", 110, 16, { body: "#c94a1a", accent: "#ffaa33", eye: "#ffeebb" }, 3),
      mkEnemy("magma_golem", "Магмовый голем", "magma_golem", 130, 13, { body: "#8a3a2a", accent: "#ff5a2a", eye: "#ffcc44" }, 3, "shieldbreak"),
      mkEnemy("infernal_guardian", "Инфернальный страж", "infernal_guardian", 125, 17, { body: "#5a1a1a", accent: "#c9a227", eye: "#ff3333" }, 3),
    ],
    boss: mkBoss("ancient_master", "Первый Мастер", "ancient_master", 400, 30, { body: "#2a1a3a", accent: "#c9a227", eye: "#ffaa22" }, 3),
  },
];

export function getDungeon(id: number): DungeonDef {
  return DUNGEONS[Math.min(Math.max(id - 1, 0), DUNGEONS.length - 1)];
}

/** Выбор врага для боя на этаже. floor 1..5, isBoss для босса. */
export function pickEnemyForFloor(dungeonId: number, floor: number, isBoss: boolean): EnemyDef {
  const d = getDungeon(dungeonId);
  if (isBoss) {
    return d.boss;
  }
  const pool = d.regularEnemies;
  const idx = (floor - 1) % pool.length;
  const base = pool[idx];
  const scaled = floorScale(floor, d.enemyHp, d.enemyAttack);
  return {
    ...base,
    hp: scaled.hp,
    attack: scaled.atk,
  };
}

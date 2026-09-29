// scripts/test-runes.ts
// RUNE WARS — Автотест масштабирования рун по уровню.
// Проверяем: Хаос, Кузнец, Мудрец, Лёд, Вампир, Страж, Гнев (×3 уровня каждая).
// Запуск: npx tsx scripts/test-runes.ts

import { BattleEngine, type BattleEvent } from "../src/game/battle/BattleEngine";
import { Hero } from "../src/game/battle/Hero";
import { RuneState } from "../src/game/battle/Rune";
import { getRune, type RuneId } from "../src/game/content/runes";
import { getHero } from "../src/game/content/heroes";
import { DUNGEONS } from "../src/game/content/enemies";
import { GEM_BASE, lengthMultiplier } from "../src/game/content/balance";

// ============================================================
// Хелперы
// ============================================================

const PASS: string[] = [];
const FAIL: string[] = [];

const EPS = 1e-9;

function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS;
}

function check(name: string, condition: boolean, expected: string, actual: string) {
  const mark = condition ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}`);
  if (!condition) console.log(`       ожидали: ${expected} | получили: ${actual}`);
  if (condition) PASS.push(name);
  else FAIL.push(name);
}

function checkNum(name: string, actual: number, expected: number) {
  check(name, approxEqual(actual, expected), `${expected}`, `${actual}`);
}

/** Создать BattleEngine с одной экипированной руной заданного уровня. */
function makeBattleEngine(runeId: RuneId, level: number): BattleEngine {
  const heroDef = getHero("warrior");
  // Босс 250 HP — переживёт несколько крупных матчей.
  const enemyDef = DUNGEONS[0].boss;
  const rune = getRune(runeId);
  const engine = new BattleEngine(
    heroDef,
    enemyDef,
    1, // hero level
    [{ def: rune, level }],
  );
  engine.start();
  return engine;
}

/** Скармливает синтетический матч (без реальной доски — эмитит событие в listener). */
function feedMatch(
  engine: BattleEngine,
  color: 0 | 1 | 2 | 3,
  length: number,
  row = 3,
  startCol = 0,
): void {
  const cells: { row: number; col: number }[] = [];
  for (let i = 0; i < length; i++) cells.push({ row, col: startCol + i });
  const group = { color, cells, length, axis: "h" as const };
  engine.board.listener({ type: "match" as any, groups: [group], cascadeLevel: 0 });
}

/** Скармливает turnEnd — вызывает endTurn() движка (хаос, враг, реген). */
function feedTurnEnd(engine: BattleEngine): void {
  engine.board.listener({
    type: "turnEnd" as any,
    totalRemoved: 0,
    cascadeCount: 0,
  });
}

// ============================================================
// 1. effectivePower: прямая проверка формулы для всех рун
// ============================================================
console.log("\n=== 1. effectivePower: формула масштабирования ===");
const expectedPowers: Record<RuneId, [number, number, number]> = {
  fire:     [1.5,  1.75, 2.0],
  ice:      [1.0,  1.0,  1.0],
  life:     [2.0,  2.5,  3.0],
  wrath:    [2.0,  2.5,  3.0],
  chaos:    [1.0,  1.0,  1.0],
  smith:    [1.0,  1.0,  1.0],
  vampire:  [0.2,  0.3,  0.4],
  guardian: [0.5,  0.75, 1.0],
  sage:     [1.0,  1.0,  1.0],
};
for (const rid of Object.keys(expectedPowers) as RuneId[]) {
  for (const lvl of [1, 2, 3] as const) {
    const rs = new RuneState(getRune(rid), lvl);
    const exp = expectedPowers[rid][lvl - 1];
    const act = rs.effectivePower;
    checkNum(`${rid} effectivePower ур.${lvl} = ${act}`, act, exp);
  }
}

// ============================================================
// 2. Гнев: rageStrikeMultiplier (×3/×3.5/×4 на ур.1/2/3)
// ============================================================
console.log("\n=== 2. Гнев: rageStrikeMultiplier ===");
const expectedRageStrikes = [3, 3.5, 4];
for (const lvl of [1, 2, 3] as const) {
  const hero = new Hero(getHero("warrior"), 1);
  hero.equipRunes([getRune("wrath")], [lvl]);
  const mult = hero.rageStrikeMultiplier();
  const exp = expectedRageStrikes[lvl - 1];
  checkNum(`Гнев rageStrike ур.${lvl} = ×${mult}`, mult, exp);
}

// ============================================================
// 3. Хаос: триггеры перекраски за 10 ходов
// ============================================================
console.log("\n=== 3. Хаос: триггеры за 10 ходов ===");
// ур.1 (КД 5): ходы 5, 10 → 2 раза
// ур.2 (КД 4): ходы 4, 8  → 2 раза
// ур.3 (КД 3): ходы 3, 6, 9 → 3 раза
const chaosExpected = [2, 2, 3];
for (const lvl of [1, 2, 3] as const) {
  const engine = makeBattleEngine("chaos", lvl);
  let triggers = 0;
  engine.setBattleListener((e: BattleEvent) => {
    if (e.type === "runeTriggered" && e.rune === "chaos") triggers++;
  });
  for (let i = 0; i < 10; i++) feedTurnEnd(engine);
  const exp = chaosExpected[lvl - 1];
  check(
    `Хаос ур.${lvl}: сработал ${triggers} раз за 10 ходов`,
    triggers === exp,
    `${exp} раз`,
    `${triggers} раз`,
  );
}

// ============================================================
// 4. Кузнец: бомба при красном матче длины N+
// ============================================================
console.log("\n=== 4. Кузнец: порог бомбы (5/4/3 на ур.1/2/3) ===");
const smithThresholds = [5, 4, 3];
for (const lvl of [1, 2, 3] as const) {
  const threshold = smithThresholds[lvl - 1];
  for (const len of [3, 4, 5, 6]) {
    const engine = makeBattleEngine("smith", lvl);
    let bomb = false;
    engine.setBattleListener((e: BattleEvent) => {
      if (e.type === "bombVfx") bomb = true;
    });
    feedMatch(engine, 0, len);
    const shouldBomb = len >= threshold;
    check(
      `Кузнец ур.${lvl}, красный ${len}-матч → бомба=${bomb ? "да" : "нет"}`,
      bomb === shouldBomb,
      shouldBomb ? "бомба" : "нет бомбы",
      bomb ? "бомба" : "нет бомбы",
    );
  }
}

// ============================================================
// 5. Мудрец: +N к эффективной длине (3→4/5/6)
// ============================================================
console.log("\n=== 5. Мудрец: +N к длине для множителя ===");
const sageBonuses = [1, 2, 3];
for (const lvl of [1, 2, 3] as const) {
  const bonus = sageBonuses[lvl - 1];
  const effLen = 3 + bonus;
  const expectedMult = lengthMultiplier(effLen);
  // base.damage[3] = 8, favored 1.25 (warrior красный), cascadeBonus(0) = 0 → mult 1
  const expectedDmg = GEM_BASE.damage[3] * expectedMult * 1.0 * 1.25;

  const engine = makeBattleEngine("sage", lvl);
  let actualDmg = 0;
  engine.setBattleListener((e: BattleEvent) => {
    if (e.type === "playerDamage") actualDmg += e.amount;
  });
  feedMatch(engine, 0, 3); // красный length 3
  checkNum(
    `Мудрец ур.${lvl}: длина 3+${bonus}=${effLen} → множитель ×${expectedMult}, урон=${actualDmg}`,
    actualDmg,
    expectedDmg,
  );
}

// ============================================================
// 6. Лёд: кулдаун после заморозки (2/1/0)
// ============================================================
console.log("\n=== 6. Лёд: КД после заморозки ===");
const iceCds = [2, 1, 0];
for (const lvl of [1, 2, 3] as const) {
  const engine = makeBattleEngine("ice", lvl);
  engine.setBattleListener(() => {});
  feedMatch(engine, 1, 4); // синий 4+
  const ice = engine.hero.getRune("ice");
  const cd = ice?.cooldown ?? -1;
  const exp = iceCds[lvl - 1];
  check(
    `Лёд ур.${lvl}: КД=${cd}`,
    cd === exp,
    `${exp}`,
    `${cd}`,
  );
}

// ============================================================
// 7. Вампир: cap лечения за ход (5/8/12)
// ============================================================
console.log("\n=== 7. Вампир: cap лечения за ход ===");
const vampireCaps = [5, 8, 12];
for (const lvl of [1, 2, 3] as const) {
  const engine = makeBattleEngine("vampire", lvl);
  engine.hero.hp = 1; // опустить HP, чтобы лечение прошло полностью
  let healed = 0;
  engine.setBattleListener((e: BattleEvent) => {
    if (e.type === "playerHeal") healed += e.amount;
  });
  // Красный length 7 → 90 урона (24 × 3 × 1.25), applied cap 50/ход
  // Вампир: heal = min(cap, applied × effectivePower)
  //   ур.1 (ef=0.2): min(5, 50×0.2=10) = 5
  //   ур.2 (ef=0.3): min(8, 50×0.3=15) = 8
  //   ур.3 (ef=0.4): min(12,50×0.4=20) = 12
  feedMatch(engine, 0, 7);
  const exp = vampireCaps[lvl - 1];
  check(
    `Вампир ур.${lvl}: лечение=${healed} (cap=${exp})`,
    healed === exp,
    `${exp}`,
    `${healed}`,
  );
}

// ============================================================
// 8. Страж: сохранение щита после победы (50/75/100%)
// ============================================================
console.log("\n=== 8. Страж: фактор сохранения щита ===");
const guardianFactors = [0.5, 0.75, 1.0];
for (const lvl of [1, 2, 3] as const) {
  const hero = new Hero(getHero("warrior"), 1);
  hero.equipRunes([getRune("guardian")], [lvl]);
  hero.shield = 20;
  hero.preserveShieldOnVictory();
  const factor = guardianFactors[lvl - 1];
  const exp = Math.floor(20 * factor);
  const act = hero.carriedShield;
  check(
    `Страж ур.${lvl}: сохранено ${act}/20 щита (фактор ${factor})`,
    act === exp,
    `${exp}`,
    `${act}`,
  );
}

// ============================================================
// ИТОГ
// ============================================================
console.log("\n" + "=".repeat(60));
console.log(`PASS: ${PASS.length}   FAIL: ${FAIL.length}`);
if (FAIL.length > 0) {
  console.log("\nНЕ ПРОШЛИ:");
  for (const f of FAIL) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log("\nВсе тесты прошли!");
  process.exit(0);
}

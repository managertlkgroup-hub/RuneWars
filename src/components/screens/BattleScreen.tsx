"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BattleEngine, type BattleEvent, type BattleState } from "@/game/battle/BattleEngine";
import { BoardRenderer } from "@/game/render/BoardRenderer";
import { CharacterRenderer } from "@/game/render/CharacterRenderer";
import { ParticlePool } from "@/game/render/VFX";
import { useCanvasLoop } from "@/hooks/useCanvas";
import { useGameStore } from "@/game/core/GameState";
import { getAudio } from "@/game/core/AudioEngine";
import { RunePanel, PanelTitle } from "@/components/ui/RunePanel";
import { RuneButton } from "@/components/ui/RuneButton";
import { RuneIcon } from "@/components/icons/RuneIcons";
import RewardScreen, { generateRewards, type RewardOption } from "@/components/screens/RewardScreen";
import { generateDungeonMap } from "@/game/map/MapGenerator";
import { dropBossLoot, dropEliteLoot } from "@/game/content/items";
import { computePerkEffects } from "@/game/content/perks";
import { computeCampUpgradeEffects } from "@/game/content/campUpgrades";
import { getYandexSDK } from "@/game/core/YandexSDK";
import EquipScreen from "@/components/screens/EquipScreen";
import {
  BOARD_SIZE,
  GEM_COLOR_HEX,
  cascadeBonus,
} from "@/game/content/balance";
import { HEROES, getHero, type HeroMechanicId } from "@/game/content/heroes";
import { pickEnemyForFloor } from "@/game/content/enemies";
import { RUNES, getRune, type RuneDef, type RuneId } from "@/game/content/runes";
import type { RuneState } from "@/game/battle/Rune";
import type { PendingBattle } from "@/game/core/GameState";
import type { RunBonuses } from "@/game/battle/BattleEngine";

const CW = 1152;
const CH = 648;

function computeMetrics() {
  const cellSize = 60;
  const boardW = cellSize * BOARD_SIZE;
  const boardH = cellSize * BOARD_SIZE;
  const originX = Math.floor((CW - boardW) / 2);
  const originY = Math.floor((CH - boardH) / 2 + 6);
  return { cellSize, originX, originY, boardW, boardH };
}

function makeBattle(
  metrics: ReturnType<typeof computeMetrics>,
  equippedRunes: RuneId[],
  pending: PendingBattle | null
): BattleEngine {
  const heroDef = getHero("warrior"); // fallback
  let floor = 1;
  let isBoss = false;
  let dungeonId = 1;
  if (pending) {
    floor = pending.floor;
    isBoss = pending.isBoss;
    dungeonId = pending.dungeonId;
  } else {
    const floors = [1, 1, 2, 2, 3];
    floor = floors[Math.floor(Math.random() * floors.length)];
    isBoss = Math.random() < 0.25;
  }
  const enemyDef = pickEnemyForFloor(dungeonId, floor, isBoss);
  const runeDefs = equippedRunes.map((id) => getRune(id));
  const st = useGameStore.getState();
  // активный герой из мета-прогрессии
  const activeHeroDef = getHero(st.activeHero as HeroMechanicId);
  // эффекты перков
  const perkEffects = computePerkEffects(st.activeHero, st.heroPerks, st.heroPrestige);
  // эффекты улучшений лагеря (мета-бонусы ко всем героям)
  const campEffects = computeCampUpgradeEffects(st.campUpgrades);
  // объединить runBonuses + campEffects
  const combinedRunBonuses: RunBonuses = {
    ...st.runBonuses,
    redDamageFlat: (st.runBonuses.redDamageFlat ?? 0) + (campEffects.redDamageFlat ?? 0),
    maxHpBonus: (st.runBonuses.maxHpBonus ?? 0) + (campEffects.maxHpBonus ?? 0),
    startShield: (st.runBonuses.startShield ?? 0) + (campEffects.startShield ?? 0),
  };
  // campEffects.healFlat → добавить к perkEffects.healFlat
  if (campEffects.healFlat) perkEffects.healFlat = (perkEffects.healFlat ?? 0) + campEffects.healFlat;
  const b = new BattleEngine(
    activeHeroDef,
    enemyDef,
    st.heroLevels[st.activeHero] ?? 1,
    runeDefs,
    metrics,
    st.equippedItems,
    st.heroHp,
    combinedRunBonuses,
    perkEffects
  );
  b.start();
  return b;
}

type Phase = "loading" | "fighting" | "victory" | "defeat" | "reward" | "equip";

export default function BattleScreen() {
  const metrics = useMemo(() => computeMetrics(), []);
  const [particles] = useState(() => new ParticlePool());
  const equippedRunes = useGameStore((s) => s.equippedRunes);
  const pendingBattle = useGameStore((s) => s.pendingBattle);
  const [battle, setBattle] = useState<BattleEngine>(() => makeBattle(metrics, [], pendingBattle));
  const [snap, setSnap] = useState<BattleState | null>(() => battle.snapshot());
  const [phase, setPhase] = useState<Phase>("fighting");
  const [rewards, setRewards] = useState<RewardOption[]>([]);
  const [, forceTick] = useState(0);
  const [rewardedUsed, setRewardedUsed] = useState(false);

  const boardRendererRef = useRef<BoardRenderer | null>(null);
  const charRendererRef = useRef<CharacterRenderer | null>(null);
  const phaseRef = useRef<Phase>("loading");

  const addScore = useGameStore((s) => s.addScore);
  const setCombo = useGameStore((s) => s.setCombo);
  const bumpMaxCombo = useGameStore((s) => s.bumpMaxCombo);
  const incMatches = useGameStore((s) => s.incMatches);
  const addGold = useGameStore((s) => s.addGold);
  const addOwnedRune = useGameStore((s) => s.addOwnedRune);
  const upgradeRune = useGameStore((s) => s.upgradeRune);
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const maxCombo = useGameStore((s) => s.maxCombo);
  const totalMatches = useGameStore((s) => s.totalMatches);
  const gold = useGameStore((s) => s.accountGold);
  const setDebugReady = useGameStore((s) => s.setDebugReady);

  const setPhaseSafe = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // Единый обработчик событий боя
  const handleBattleEvent = useCallback(
    (e: BattleEvent) => {
      const charR = charRendererRef.current;
      const boardR = boardRendererRef.current;
      const audio = getAudio();
      const b = battle;

      if (e.type === "matchVfx") {
        for (const g of e.groups) {
          const color = GEM_COLOR_HEX[g.color];
          for (const cell of g.cells) {
            const { x, y } = b.board.cellCenter(cell.row, cell.col);
            particles.burst(x, y, 6, color.light, "spark", 200, 5);
            particles.spawn(x, y, { vx: 0, vy: -60, maxLife: 0.5, size: 8, color: color.glow, type: "magic" });
          }
        }
        incMatches(e.groups.length);
        setCombo(e.cascadeLevel + 1);
        bumpMaxCombo(e.cascadeLevel + 1);
        const soundMap = ["matchRed", "matchBlue", "matchGreen", "matchYellow"] as const;
        audio.play(soundMap[e.groups[0]?.color ?? 0]);
        if (e.cascadeLevel >= 1) {
          audio.play("cascade", { cascadeLevel: e.cascadeLevel });
          boardR?.addShake(4 + e.cascadeLevel * 2);
          const m = b.board.metrics;
          particles.burst(m.originX + m.boardW / 2, m.originY + m.boardH / 2, 12, "#f4d36a", "combo", 320, 8);
        }
        addScore(e.groups.reduce((acc, g) => acc + g.length * 10, 0) * (1 + cascadeBonus(e.cascadeLevel)));
      } else if (e.type === "playerDamage") {
        if (e.dodged) {
          charR?.spawnFloat("enemy", 0, "miss");
        } else {
          charR?.spawnFloat("enemy", e.amount, "enemyDamage");
          charR?.triggerEnemyHit();
          charR?.triggerHeroAttack();
          audio.play(e.crit ? "rageStrike" : "enemyHit");
          boardR?.addShake(e.crit ? 8 : 3);
        }
      } else if (e.type === "playerHeal") {
        if (e.amount > 0) {
          charR?.spawnFloat("hero", e.amount, "heal");
          audio.play("heal");
        }
      } else if (e.type === "playerShield") {
        if (e.amount > 0) {
          charR?.spawnFloat("hero", e.amount, "shield");
          audio.play("shield");
        }
      } else if (e.type === "playerRage") {
        if (e.amount > 0) {
          charR?.spawnFloat("hero", e.amount, "rage");
          audio.play("rage");
        }
      } else if (e.type === "enemyAttack") {
        if (e.hpDamage > 0) charR?.spawnFloat("hero", e.hpDamage, "damage");
        if (e.shieldAbsorbed > 0) charR?.spawnFloat("hero", e.shieldAbsorbed, "shield");
        charR?.triggerHeroHit();
        charR?.triggerEnemyAttack();
        boardR?.addShake(e.brokeShield ? 12 : 7);
        audio.play("enemyAttack");
      } else if (e.type === "runeTriggered") {
        // VFX активации руны: вспышка в центре поля
        const m = b.board.metrics;
        const cx = m.originX + m.boardW / 2;
        const cy = m.originY + m.boardH / 2;
        const def = getRune(e.rune);
        const glow = GEM_COLOR_HEX[def.color]?.glow ?? "rgba(201,162,39,0.6)";
        particles.burst(cx, cy, 16, "#f4d36a", "star", 280, 8);
        particles.burst(cx, cy, 10, GEM_COLOR_HEX[def.color]?.light ?? "#fff", "magic", 200, 6);
        // для хаоса — искры на изменённых клетках
        if (e.rune === "chaos" && e.cells) {
          for (const c of e.cells) {
            const { x, y } = b.board.cellCenter(c.row, c.col);
            particles.burst(x, y, 8, GEM_COLOR_HEX[c.color]?.light ?? "#aa44ff", "spark", 220, 6);
            particles.spawn(x, y, { vx: 0, vy: -40, maxLife: 0.6, size: 10, color: glow, type: "magic" });
          }
        }
        audio.play("rune");
      } else if (e.type === "bombVfx") {
        // взрыв 3×3
        const { x, y } = b.board.cellCenter(e.row, e.col);
        const cs = b.board.metrics.cellSize;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const px = x + dc * cs;
            const py = y + dr * cs;
            particles.burst(px, py, 8, "#ff6a22", "explosion", 300, 8);
            particles.burst(px, py, 5, "#ffeebb", "spark", 200, 5);
          }
        }
        boardR?.addShake(10);
        audio.play("bomb");
      } else if (e.type === "enemyFrozen") {
        // ледяная вспышка на враге
        const cx = 968;
        const cy = 300;
        particles.burst(cx, cy, 16, "#aaddff", "star", 240, 8);
        particles.burst(cx, cy, 10, "#7fb0ff", "magic", 180, 6);
        charR?.triggerEnemyHit();
        audio.play("freeze");
      } else if (e.type === "victory") {
        setPhaseSafe("victory");
        audio.play("victory");
        // сохранить переносимый HP после боя + выдать золото подземелья
        const st = useGameStore.getState();
        st.setHeroHp(b.hero.hp);
        st.setHeroMaxHp(b.hero.maxHp);
        // награда dungeonGold: 3 + floor*1 (элита ×1.5, босс 30+floor*5)
        const pb2 = st.pendingBattle;
        let goldReward = 3 + (pb2?.floor ?? 1) * 1;
        if (pb2?.nodeType === "elite") goldReward = Math.round(goldReward * 1.5);
        if (pb2?.isBoss) goldReward = 30 + (pb2?.floor ?? 5) * 5;
        st.addDungeonGold(goldReward);
        const cx = 968;
        const cy = 300;
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            particles.burst(cx, cy, 14, "#f4d36a", "star", 300, 8);
            particles.burst(cx, cy, 8, "#c9a227", "spark", 260, 6);
          }, i * 120);
        }
        // гарантированный дроп с элиты/босса
        const pb = st.pendingBattle;
        if (pb && (pb.nodeType === "elite" || pb.nodeType === "boss")) {
          const drop = pb.nodeType === "boss" ? dropBossLoot() : dropEliteLoot();
          st.addItem(drop);
          st.setPendingDrop(drop);
        }
      } else if (e.type === "defeat") {
        setPhaseSafe("defeat");
        audio.play("defeat");
        boardR?.addShake(14);
      }
      setSnap(b.snapshot());
      forceTick((n) => n + 1);
    },
    [battle, particles, addScore, bumpMaxCombo, incMatches, setCombo, setPhaseSafe]
  );

  // Подписка на события боя + debug + audio focus
  useEffect(() => {
    battle.setBattleListener(handleBattleEvent);
    if (typeof window !== "undefined") {
      (window as unknown as { __rune?: { battle: BattleEngine; particles: ParticlePool } }).__rune = {
        battle,
        particles,
      };
      (window as unknown as { __store?: typeof useGameStore }).__store = useGameStore;
    }
    setDebugReady(true);
    const readyT = setTimeout(() => setDebugReady(false), 90000);

    const onBlur = () => getAudio().suspendOnBlur();
    const onFocus = () => getAudio().resumeOnFocus();
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    const onVis = () => {
      if (document.hidden) getAudio().suspendOnBlur();
      else getAudio().resumeOnFocus();
    };
    document.addEventListener("visibilitychange", onVis);

    phaseRef.current = "fighting";

    return () => {
      clearTimeout(readyT);
      battle.setBattleListener(() => {});
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      if (typeof window !== "undefined") {
        delete (window as unknown as { __rune?: unknown }).__rune;
      }
    };
  }, [battle, handleBattleEvent, particles, setDebugReady]);

  // Игровой цикл
  const canvasRef = useCanvasLoop({
    width: CW,
    height: CH,
    onUpdate: (dt) => {
      battle.board.update(dt);
      particles.update(dt);
    },
    onRender: (ctx, w, h, dt) => {
      if (!boardRendererRef.current) {
        boardRendererRef.current = new BoardRenderer(ctx, battle.board, particles);
        boardRendererRef.current.dungeonId = pendingBattle?.dungeonId ?? 1;
      }
      if (!charRendererRef.current) {
        charRendererRef.current = new CharacterRenderer(battle, particles);
      }
      boardRendererRef.current.ctx = ctx;
      charRendererRef.current.ctx = ctx;
      boardRendererRef.current.render(w, h, dt);
      charRendererRef.current.render(w, h, dt);
    },
  });

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    getAudio().resume();
    if (phaseRef.current !== "fighting") return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const clicked = battle.board.handleClick(px, py);
    if (clicked) getAudio().play("click");
  };

  // Перезапуск боя с pendingBattle (из карты) или fallback
  const startNewBattle = useCallback(() => {
    particles.clear();
    charRendererRef.current?.clear();
    boardRendererRef.current = null;
    charRendererRef.current = null;
    const st = useGameStore.getState();
    const b = makeBattle(metrics, st.equippedRunes, st.pendingBattle);
    st.resetRun();
    setSnap(b.snapshot());
    setBattle(b);
    setPhaseSafe("fighting");
  }, [metrics, particles, setPhaseSafe]);

  // Victory → награда
  const handleClaimReward = () => {
    const st = useGameStore.getState();
    const hasUpgradable = st.ownedRunes.some((r) => r.level < 3);
    setRewards(generateRewards(st.ownedRunes, st.equippedRunes.length, hasUpgradable));
    setPhaseSafe("reward");
  };

  // Выбор награды → возврат на карту (босс → новое подземелье)
  const handlePickReward = (opt: RewardOption) => {
    if (opt.kind === "rune" && opt.runeId && opt.rarity) {
      addOwnedRune({ id: opt.runeId, level: 1, rarity: opt.rarity });
    } else if (opt.kind === "gold" && opt.amount) {
      addGold(opt.amount);
    } else if (opt.kind === "heal") {
      addGold(Math.floor(opt.amount / 2));
    } else if (opt.kind === "upgrade") {
      const owned = useGameStore.getState().ownedRunes;
      const upgradable = owned.find((r) => r.level < 3);
      if (upgradable) upgradeRune(upgradable.id);
    }
    // возврат на карту
    const st = useGameStore.getState();
    if (st.pendingBattle?.isBoss) {
      // босс повержен: 50% dungeonGold конвертируется в accountGold + новое подземелье
      st.addGold(Math.floor(st.dungeonGold * 0.5));
      const nextId = Math.min((st.pendingBattle.dungeonId || 1) + 1, 5);
      st.setDungeonId(nextId);
      st.setMap(generateDungeonMap(nextId));
      st.resetDungeonRun();
    }
    // XP за убийство: враг 10×floor, элита 30×floor, босс 100×floor
    const pb = st.pendingBattle;
    if (pb) {
      const floor = pb.floor || 1;
      let xp = 15 * floor;
      if (pb.nodeType === "elite") xp = 40 * floor;
      if (pb.isBoss) xp = 150 * floor;
      // бонус за прохождение этажа
      xp += 50;
      // бонус за прохождение подземелья (босс)
      if (pb.isBoss) xp += 300;
      const xpResult = st.addHeroXp(st.activeHero, xp);
      if (xpResult.perksToChoose.length > 0) {
        st.setPendingPerkLevel(xpResult.perksToChoose[0]);
        st.setPendingBattle(null);
        st.setScreen("perkSelect");
        return;
      }
    }
    st.setPendingBattle(null);
    st.setScreen("map");
    // полноэкранная реклама между этажами (throttled, no-op если SDK недоступен)
    getYandexSDK().showFullscreenAdv();
  };

  // Поражение / сброс → возврат на карту
  const handleQuickRestart = () => {
    const st = useGameStore.getState();
    // при поражении: 25% dungeonGold сохраняется как accountGold
    st.addGold(Math.floor(st.dungeonGold * 0.25));
    st.setPendingBattle(null);
    st.resetRun();
    st.setScreen("map");
    setRewardedUsed(false);
  };

  const equippedDefs: RuneDef[] = equippedRunes.map((id) => getRune(id));

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-rune-bg overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 rune-bg-glow"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, rgba(106,74,154,0.25) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[1280px] px-2 sm:px-4 py-2 flex flex-col items-center gap-2">
        {/* Заголовок + этаж + золото */}
        <div className="w-full flex items-center justify-between gap-2">
          <div className="font-pixel text-rune-gold text-glow-gold text-[10px] sm:text-sm uppercase tracking-widest">
            RUNE WARS
          </div>
          <div className="flex items-center gap-3">
            <span className="font-pixel text-[9px] text-rune-gold-light flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#c9a227" stroke="#1a0a1e" strokeWidth="3" /></svg>
              {gold}
            </span>
            <span className="font-pixel text-[8px] sm:text-[10px] text-rune-muted uppercase">
              {snap?.enemyIsBoss ? "БОСС" : "Бой"} · {snap?.enemyName ?? ""}
            </span>
          </div>
        </div>

        {/* Поле + боковые HUD */}
        <div className="w-full flex flex-col lg:flex-row gap-2 items-center justify-center">
          {/* Левая панель — герой + руны */}
          <div className="hidden lg:flex w-56 flex-col gap-2">
            <RunePanel glow>
              <PanelTitle>{battle.hero.def.title} — {battle.hero.def.name} (ур.{battle.hero.level})</PanelTitle>
              <div className="p-3 space-y-1.5 font-body text-[11px]">
                <Row label="HP" value={`${snap?.heroHp ?? 0}/${snap?.heroMaxHp ?? 0}`} />
                <Row label="Щит" value={`${snap?.heroShield ?? 0}`} accent="text-rune-blue" />
                <Row label="Ярость" value={`${snap?.heroRage ?? 0}/60`} accent="text-rune-yellow" />
                <Row label="Ход" value={`${snap?.turn ?? 0}`} />
                <XpBar heroId={useGameStore.getState().activeHero} />
                <Row
                  label="Атака врага"
                  value={snap?.enemyFrozen ? "ЗАМОРОЖЕН" : `через ${snap?.enemyAttackIn ?? 0}`}
                  accent={snap?.enemyFrozen ? "text-rune-blue" : snap && snap.enemyAttackIn <= 1 ? "text-rune-red" : "text-rune-text"}
                />
                {snap?.heroRageStrikeReady && (
                  <div className="mt-1 text-center font-pixel text-[8px] text-rune-gold-light text-glow-gold animate-pulse">
                    УЛЬТА ×{battle.hero.rageStrikeMultiplier()}
                  </div>
                )}
              </div>
            </RunePanel>
            {/* Экипированные руны с живыми статусами */}
            <RunePanel>
              <PanelTitle>Руны ({equippedDefs.length}/3)</PanelTitle>
              <div className="p-2 flex flex-col gap-1">
                {equippedDefs.length === 0 && (
                  <span className="font-body text-[10px] text-rune-muted py-2 text-center">нет рун</span>
                )}
                {equippedDefs.map((d) => {
                  const st = battle.hero.getRune(d.id);
                  const status = st ? runeStatusText(d.id, st, battle) : null;
                  const ready = st ? st.canUse() : false;
                  return (
                    <div key={d.id} className="flex items-center gap-2 px-1 py-0.5 rounded" style={{ background: ready ? "rgba(201,162,39,0.08)" : "transparent" }}>
                      <RuneIcon rune={d.id} size={26} />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-pixel text-[7px] text-rune-text leading-tight">{d.name}</span>
                        {status && (
                          <span className={`font-body text-[8px] leading-tight ${status.accent ?? "text-rune-muted"}`}>{status.text}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </RunePanel>
            <ColorLegend />
          </div>

          {/* Canvas + overlays */}
          <div
            className="relative w-full max-w-[720px]"
            style={{ aspectRatio: `${CW} / ${CH}` }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              onClick={handleCanvasClick}
              className="w-full h-full rounded-lg border-2 border-[#3a2a5a] shadow-[0_0_40px_rgba(0,0,0,0.8)] cursor-pointer touch-none"
            />

            {phase === "victory" && (
              <Overlay
                title={pendingBattle?.isBoss ? "ПОДЗЕМЬЕ ПРОЙДЕНО" : "ПОБЕДА"}
                titleColor="text-rune-gold text-glow-gold"
                subtitle={pendingBattle?.isBoss ? "Босс повержен! Откроется следующее подземелье." : snap ? `Враг повержен за ${snap.turn} ходов` : ""}
                score={score}
                goldEarned={useGameStore.getState().dungeonGold}
                onAction={handleClaimReward}
                actionLabel="Забрать награду"
                extraActions={
                  <RuneButton
                    variant={rewardedUsed ? "ghost" : "gold"}
                    onClick={() => {
                      if (rewardedUsed) return;
                      getYandexSDK().showRewardedVideo(
                        () => {
                          const st = useGameStore.getState();
                          st.addDungeonGold(st.dungeonGold);
                          getAudio().play("victory");
                          setRewardedUsed(true);
                        }
                      );
                    }}
                    disabled={rewardedUsed}
                    className="text-[10px] py-2 px-4"
                  >
                    {rewardedUsed ? "Уже использовано" : "Смотреть рекламу x2 золота"}
                  </RuneButton>
                }
              />
            )}
            {phase === "defeat" && (
              <Overlay
                title="ПОРАЖЕНИЕ"
                titleColor="text-rune-red text-glow-blood"
                subtitle="Герой пал в бою"
                score={score}
                onAction={handleQuickRestart}
                actionLabel="Вернуться на карту"
                extraActions={
                  <RuneButton
                    variant="gold"
                    onClick={() => {
                      getYandexSDK().showRewardedVideo(
                        () => {
                          // возрождение с 50% HP
                          const st = useGameStore.getState();
                          st.setHeroHp(Math.floor(st.heroMaxHp * 0.5));
                          st.setScreen("map");
                          getAudio().play("heal");
                        }
                      );
                    }}
                    className="text-[10px] py-2 px-4"
                  >
                    Возродиться (реклама)
                  </RuneButton>
                }
              />
            )}
            {phase === "reward" && (
              <RewardScreen
                rewards={rewards}
                onPick={handlePickReward}
                onSkip={() => {
                  const st = useGameStore.getState();
                  st.setPendingBattle(null);
                  st.setScreen("map");
                }}
              />
            )}
            {phase === "equip" && null}
          </div>

          {/* Правая панель — статистика */}
          <div className="w-full lg:w-56 flex flex-col gap-2">
            <RunePanel>
              <PanelTitle>Статистика</PanelTitle>
              <div className="p-3 space-y-2 font-body text-sm">
                <Stat label="Очки" value={score} color="text-rune-gold" />
                <Stat label="Каскад" value={`×${combo || 1}`} color={combo >= 2 ? "text-rune-warm" : "text-rune-text"} />
                <Stat label="Макс." value={maxCombo} color="text-rune-text" />
                <Stat label="Матчей" value={totalMatches} color="text-rune-text" />
              </div>
            </RunePanel>
            <RunePanel>
              <PanelTitle>Подсказки</PanelTitle>
              <div className="p-3 space-y-1.5 font-body text-[10px] text-rune-muted leading-snug">
                <div><span className="text-rune-red">Красный</span> — атака врага</div>
                <div><span className="text-rune-blue">Синий</span> — щит (макс 50)</div>
                <div><span className="text-rune-green">Зелёный</span> — лечение</div>
                <div><span className="text-rune-yellow">Жёлтый</span> — ярость (×2 при 30+)</div>
                <div className="pt-1 border-t border-[#3a2a5a]/60 text-rune-text">
                  Враг атакует каждые 3 хода. Урон сначала в щит.
                </div>
              </div>
            </RunePanel>
          </div>
        </div>

        {/* Debug bar */}
        <div className="w-full flex items-center justify-between gap-2 text-[10px] font-body text-rune-muted">
          <div className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" style={{ boxShadow: "0 0 6px #22c55e" }} />
            <span>Engine Ready</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" style={{ boxShadow: "0 0 8px #22c55e" }} />
            <span>Game Ready (90s)</span>
          </div>
          <div className="hidden sm:block">1152×648 · {BOARD_SIZE}×{BOARD_SIZE}</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-rune-muted">{label}</span>
      <span className={`font-pixel text-[11px] ${color ?? "text-rune-text"}`}>{value}</span>
    </div>
  );
}

/** Живой статус руны для боевого HUD. */
function runeStatusText(
  id: RuneId,
  st: RuneState,
  battle: BattleEngine
): { text: string; accent?: string } | null {
  switch (id) {
    case "ice":
      if (st.cooldown > 0) return { text: `КД ${st.cooldown} х.`, accent: "text-rune-blue" };
      if (battle.enemy.frozen) return { text: "Враг заморожен", accent: "text-rune-blue" };
      return { text: "Готова", accent: "text-rune-green" };
    case "chaos": {
      const turnsToChaos = 5 - (battle.turn % 5);
      return { text: `Перекраска через ${turnsToChaos} х.`, accent: "text-rune-yellow" };
    }
    case "smith":
      if (st.bombsThisTurn >= 1) return { text: "Бомба выставлена", accent: "text-rune-warm" };
      if (st.canUse()) return { text: "Бомба готова (5+)", accent: "text-rune-green" };
      return { text: "Использована", accent: "text-rune-muted" };
    case "life":
      if (st.lifeRegenStacks > 0) return { text: `Реген ${st.lifeRegenStacks} х.`, accent: "text-rune-green" };
      return { text: "Готова", accent: "text-rune-green" };
    case "wrath":
      return { text: `Ярость ×2, ульта ×3`, accent: "text-rune-yellow" };
    case "vampire":
      return { text: `Вампир +${Math.floor(st.effectivePower * 100)}% урона`, accent: "text-rune-red" };
    case "guardian":
      return { text: `Щит ${Math.floor(st.effectivePower * 100)}% переходит`, accent: "text-rune-blue" };
    case "fire":
      return { text: `+${Math.floor((st.effectivePower - 1) * 100)}% к красным 3-4`, accent: "text-rune-red" };
    case "sage":
      return { text: `+1 к длине (множитель)`, accent: "text-rune-green" };
  }
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-rune-muted">{label}</span>
      <span className={`font-pixel text-[10px] ${accent ?? "text-rune-text"}`}>{value}</span>
    </div>
  );
}

function XpBar({ heroId }: { heroId: string }) {
  const level = useGameStore((s) => s.heroLevels[heroId] ?? 1);
  const xp = useGameStore((s) => s.heroXp[heroId] ?? 0);
  const need = 100 + level * 100;
  const pct = Math.min(100, (xp / need) * 100);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-rune-muted">XP</span>
        <span className="font-pixel text-[8px] text-rune-green">{xp}/{need}</span>
      </div>
      <div className="h-1.5 w-full rounded-sm bg-[#0a0718] overflow-hidden border border-[#3a2a5a]">
        <div className="h-full bg-gradient-to-r from-rune-green to-rune-warm" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ColorLegend() {
  const labels = ["Атака", "Щит", "Лечение", "Ярость"];
  return (
    <RunePanel>
      <PanelTitle>Кристаллы</PanelTitle>
      <div className="p-3 grid grid-cols-2 gap-1.5 font-body text-[10px]">
        {([0, 1, 2, 3] as const).map((c) => {
          const col = GEM_COLOR_HEX[c];
          return (
            <div key={c} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-sm border border-[#0a0718]"
                style={{ background: col.base, boxShadow: `0 0 6px ${col.glow}` }}
              />
              <span className="text-rune-text">{labels[c]}</span>
            </div>
          );
        })}
      </div>
    </RunePanel>
  );
}

function Overlay({
  title,
  titleColor,
  subtitle,
  score,
  goldEarned,
  onAction,
  actionLabel,
  extraActions,
}: {
  title: string;
  titleColor: string;
  subtitle: string;
  score: number;
  goldEarned?: number;
  onAction: () => void;
  actionLabel: string;
  extraActions?: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm rounded-lg">
      <div className={`font-pixel text-2xl sm:text-4xl tracking-widest ${titleColor}`}>
        {title}
      </div>
      <div className="font-body text-rune-muted text-sm">{subtitle}</div>
      <div className="font-pixel text-rune-gold text-base">Очки: {score}</div>
      {goldEarned !== undefined && goldEarned > 0 && (
        <div className="font-pixel text-rune-warm text-sm">+{goldEarned} золота</div>
      )}
      <RuneButton variant="gold" onClick={onAction} className="text-xs px-6 py-3">
        {actionLabel}
      </RuneButton>
      {extraActions}
    </div>
  );
}

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
import {
  BOARD_SIZE,
  GEM_COLOR_HEX,
  cascadeBonus,
} from "@/game/content/balance";
import { HEROES, getHero } from "@/game/content/heroes";
import { pickEnemyForFloor } from "@/game/content/enemies";

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

function makeBattle(metrics: ReturnType<typeof computeMetrics>): BattleEngine {
  const heroDef = getHero("warrior");
  const floors = [1, 1, 2, 2, 3];
  const floor = floors[Math.floor(Math.random() * floors.length)];
  const isBoss = Math.random() < 0.25;
  const enemyDef = pickEnemyForFloor(1, floor, isBoss);
  const b = new BattleEngine(heroDef, enemyDef, 1, metrics);
  b.start();
  return b;
}

type Phase = "loading" | "fighting" | "victory" | "defeat";

export default function BattleScreen() {
  const metrics = useMemo(() => computeMetrics(), []);
  const [particles] = useState(() => new ParticlePool());
  const [battle, setBattle] = useState<BattleEngine>(() => makeBattle(metrics));
  const [snap, setSnap] = useState<BattleState | null>(() => battle.snapshot());
  const [phase, setPhase] = useState<Phase>("fighting");
  const [, forceTick] = useState(0);

  const boardRendererRef = useRef<BoardRenderer | null>(null);
  const charRendererRef = useRef<CharacterRenderer | null>(null);
  const phaseRef = useRef<Phase>("loading");

  const addScore = useGameStore((s) => s.addScore);
  const setCombo = useGameStore((s) => s.setCombo);
  const bumpMaxCombo = useGameStore((s) => s.bumpMaxCombo);
  const incMatches = useGameStore((s) => s.incMatches);
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const maxCombo = useGameStore((s) => s.maxCombo);
  const totalMatches = useGameStore((s) => s.totalMatches);
  const setDebugReady = useGameStore((s) => s.setDebugReady);

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
      } else if (e.type === "victory") {
        phaseRef.current = "victory";
        setPhase("victory");
        audio.play("victory");
        const cx = 968;
        const cy = 300;
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            particles.burst(cx, cy, 14, "#f4d36a", "star", 300, 8);
            particles.burst(cx, cy, 8, "#c9a227", "spark", 260, 6);
          }, i * 120);
        }
      } else if (e.type === "defeat") {
        phaseRef.current = "defeat";
        setPhase("defeat");
        audio.play("defeat");
        boardR?.addShake(14);
      } else if (e.type === "turnStart") {
        // UI обновится через setSnap ниже
      }
      setSnap(b.snapshot());
      forceTick((n) => n + 1);
    },
    [battle, particles, addScore, bumpMaxCombo, incMatches, setCombo]
  );

  // Подписка на события боя + debug + audio focus
  useEffect(() => {
    battle.setBattleListener(handleBattleEvent);
    if (typeof window !== "undefined") {
      (window as unknown as { __rune?: { battle: BattleEngine; particles: ParticlePool } }).__rune = {
        battle,
        particles,
      };
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

  // Клик по канвасу
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

  // Перезапуск боя
  const handleRestart = () => {
    particles.clear();
    charRendererRef.current?.clear();
    boardRendererRef.current = null;
    charRendererRef.current = null;
    const b = makeBattle(metrics);
    useGameStore.getState().resetRun();
    phaseRef.current = "fighting";
    setPhase("fighting");
    setSnap(b.snapshot());
    setBattle(b);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-rune-bg overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 rune-bg-glow"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, rgba(106,74,154,0.25) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[1280px] px-2 sm:px-4 py-2 flex flex-col items-center gap-2">
        {/* Заголовок + этаж */}
        <div className="w-full flex items-center justify-between gap-2">
          <div className="font-pixel text-rune-gold text-glow-gold text-[10px] sm:text-sm uppercase tracking-widest">
            RUNE WARS
          </div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[8px] sm:text-[10px] text-rune-muted uppercase">
              {snap?.enemyIsBoss ? "БОСС" : "Бой"} · {snap?.enemyName ?? ""}
            </span>
            <RuneButton variant="ghost" onClick={handleRestart} className="text-[10px] py-1 px-2">
              Новый бой
            </RuneButton>
          </div>
        </div>

        {/* Поле + боковые HUD */}
        <div className="w-full flex flex-col lg:flex-row gap-2 items-center justify-center">
          {/* Левая панель — герой */}
          <div className="hidden lg:flex w-56 flex-col gap-2">
            <RunePanel glow>
              <PanelTitle>{HEROES[0].title} — {HEROES[0].name}</PanelTitle>
              <div className="p-3 space-y-1.5 font-body text-[11px]">
                <Row label="HP" value={`${snap?.heroHp ?? 0}/${snap?.heroMaxHp ?? 0}`} />
                <Row label="Щит" value={`${snap?.heroShield ?? 0}`} accent="text-rune-blue" />
                <Row label="Ярость" value={`${snap?.heroRage ?? 0}/60`} accent="text-rune-yellow" />
                <Row label="Ход" value={`${snap?.turn ?? 0}`} />
                <Row
                  label="Атака врага"
                  value={`через ${snap?.enemyAttackIn ?? 0}`}
                  accent={snap && snap.enemyAttackIn <= 1 ? "text-rune-red" : "text-rune-text"}
                />
                {snap?.heroRageStrikeReady && (
                  <div className="mt-1 text-center font-pixel text-[8px] text-rune-gold-light text-glow-gold animate-pulse">
                    УЛЬТА ×2
                  </div>
                )}
              </div>
            </RunePanel>
            <ColorLegend />
          </div>

          {/* Canvas */}
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
                title="ПОБЕДА"
                titleColor="text-rune-gold text-glow-gold"
                subtitle={snap ? `Враг повержен за ${snap.turn} ходов` : ""}
                score={score}
                onAction={handleRestart}
                actionLabel="Новый бой"
              />
            )}
            {phase === "defeat" && (
              <Overlay
                title="ПОРАЖЕНИЕ"
                titleColor="text-rune-red text-glow-blood"
                subtitle="Герой пал в бою"
                score={score}
                onAction={handleRestart}
                actionLabel="Попробовать снова"
              />
            )}
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

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-rune-muted">{label}</span>
      <span className={`font-pixel text-[10px] ${accent ?? "text-rune-text"}`}>{value}</span>
    </div>
  );
}

function ColorLegend() {
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
              <span className="text-rune-text">{col.name}</span>
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
  onAction,
  actionLabel,
}: {
  title: string;
  titleColor: string;
  subtitle: string;
  score: number;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm rounded-lg">
      <div className={`font-pixel text-2xl sm:text-4xl tracking-widest ${titleColor}`}>
        {title}
      </div>
      <div className="font-body text-rune-muted text-sm">{subtitle}</div>
      <div className="font-pixel text-rune-gold text-base">Очки: {score}</div>
      <RuneButton variant="gold" onClick={onAction} className="text-xs px-6 py-3">
        {actionLabel}
      </RuneButton>
    </div>
  );
}

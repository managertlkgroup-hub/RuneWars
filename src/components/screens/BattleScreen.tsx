"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BoardEngine, type BoardMetrics } from "@/game/battle/BoardEngine";
import { BoardRenderer } from "@/game/render/BoardRenderer";
import { ParticlePool } from "@/game/render/VFX";
import { useCanvasLoop } from "@/hooks/useCanvas";
import { useGameStore } from "@/game/core/GameState";
import { RunePanel, PanelTitle } from "@/components/ui/RunePanel";
import { RuneButton } from "@/components/ui/RuneButton";
import { HpBar } from "@/components/ui/HpBar";
import {
  BOARD_SIZE,
  GEM_COLOR_HEX,
  lengthMultiplier,
  cascadeBonus,
  CAPS,
} from "@/game/content/balance";
import type { MatchGroup, BoardEvent } from "@/game/battle/types";

// Внутреннее разрешение canvas
const CW = 1152;
const CH = 648;

function computeMetrics(): BoardMetrics {
  const cellSize = 72;
  const boardW = cellSize * BOARD_SIZE; // 504
  const boardH = cellSize * BOARD_SIZE;
  // доска по центру, чуть левее чтобы оставить HUD справа на десктопе
  const originX = Math.floor((CW - boardW) / 2);
  const originY = Math.floor((CH - boardH) / 2 + 18);
  return { cellSize, originX, originY, boardW, boardH };
}

export default function BattleScreen() {
  const [ready, setReady] = useState(false);
  const engineRef = useRef<BoardEngine | null>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);
  const particlesRef = useRef<ParticlePool | null>(null);

  const metrics = useMemo(() => computeMetrics(), []);

  // store actions
  const addScore = useGameStore((s) => s.addScore);
  const setCombo = useGameStore((s) => s.setCombo);
  const bumpMaxCombo = useGameStore((s) => s.bumpMaxCombo);
  const incMatches = useGameStore((s) => s.incMatches);
  const setLastMatchSummary = useGameStore((s) => s.setLastMatchSummary);
  const setDebugReady = useGameStore((s) => s.setDebugReady);
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const maxCombo = useGameStore((s) => s.maxCombo);
  const totalMatches = useGameStore((s) => s.totalMatches);
  const lastMatch = useGameStore((s) => s.lastMatchSummary);

  // инициализация движка и частиц (один раз)
  if (!engineRef.current) {
    const engine = new BoardEngine(metrics);
    engineRef.current = engine;
    const particles = new ParticlePool();
    particlesRef.current = particles;
  }

  // обработчик событий движка
  useEffect(() => {
    const engine = engineRef.current;
    const particles = particlesRef.current;
    if (!engine || !particles) return;

    const onEvent = (e: BoardEvent) => {
      if (e.type === "match") {
        // спавн частиц на клетках
        for (const g of e.groups) {
          const color = GEM_COLOR_HEX[g.color];
          for (const cell of g.cells) {
            const { x, y } = engine.cellCenter(cell.row, cell.col);
            particles.burst(x, y, 6, color.light, "spark", 200, 5);
            particles.spawn(x, y, {
              vx: 0,
              vy: -60,
              maxLife: 0.5,
              size: 8,
              color: color.glow,
              type: "magic",
            });
          }
        }
        incMatches(e.groups.length);
        const curCombo = e.cascadeLevel + 1;
        setCombo(curCombo);
        bumpMaxCombo(curCombo);
        // подсчёт превью эффекта
        let damage = 0,
          shield = 0,
          heal = 0,
          rage = 0;
        for (const g of e.groups) {
          const m = lengthMultiplier(g.length);
          damage += g.color === 0 ? 8 * m : 0;
          shield += g.color === 1 ? 5 * m : 0;
          heal += g.color === 2 ? 4 * m : 0;
          rage += g.color === 3 ? 8 * m : 0;
        }
        const cb = cascadeBonus(e.cascadeLevel);
        const mult = 1 + cb;
        damage *= mult;
        shield *= mult;
        heal *= mult;
        rage *= mult;
        // накладываем ограничения (для превью)
        damage = Math.min(damage, CAPS.damagePerTurn);
        shield = Math.min(shield, CAPS.shieldPerTurn);
        heal = Math.min(heal, CAPS.healPerTurn);
        rage = Math.min(rage, CAPS.ragePerTurn);
        setLastMatchSummary({
          color: e.groups[0]?.color ?? 0,
          length: e.groups[0]?.length ?? 0,
          damage: Math.round(damage),
          shield: Math.round(shield),
          heal: Math.round(heal),
          rage: Math.round(rage),
          cascadeLevel: e.cascadeLevel,
        });
        // тряска на каскаде
        if (e.cascadeLevel >= 1) {
          rendererRef.current?.addShake(4 + e.cascadeLevel * 2);
          // combo flash частицы в центре
          const { originX, originY, boardW, boardH } = engine.metrics;
          particles.burst(
            originX + boardW / 2,
            originY + boardH / 2,
            12,
            "#f4d36a",
            "combo",
            320,
            8
          );
        }
        // очки
        addScore(e.groups.reduce((acc, g) => acc + g.length * 10, 0) * (1 + cb));
      } else if (e.type === "turnEnd") {
        setCombo(0);
      }
    };
    engine.listener = onEvent;
    setReady(true);

    // debug-доступ к движку (для автотестов)
    if (typeof window !== "undefined") {
      (window as unknown as { __rune?: { engine: BoardEngine; particles: ParticlePool } }).__rune = {
        engine,
        particles: particles,
      };
    }

    // Game Ready индикатор — зелёный 90 сек
    setDebugReady(true);
    const t = setTimeout(() => setDebugReady(false), 90000);
    return () => {
      clearTimeout(t);
      engine.listener = null;
      if (typeof window !== "undefined") {
        delete (window as unknown as { __rune?: unknown }).__rune;
      }
    };
  }, [addScore, bumpMaxCombo, incMatches, setCombo, setDebugReady, setLastMatchSummary, metrics]);

  // игровой цикл
  const canvasRef = useCanvasLoop({
    width: CW,
    height: CH,
    onUpdate: (dt) => {
      engineRef.current?.update(dt);
      particlesRef.current?.update(dt);
    },
    onRender: (ctx, w, h, dt) => {
      // ленивое создание рендерера при первом кадре
      if (!rendererRef.current && engineRef.current && particlesRef.current) {
        rendererRef.current = new BoardRenderer(ctx, engineRef.current, particlesRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.ctx = ctx;
        rendererRef.current.render(w, h, dt);
      }
    },
  });

  // клик по канвасу
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    engine.handleClick(px, py);
  };

  const handleReset = () => {
    const engine = engineRef.current;
    const particles = particlesRef.current;
    if (!engine || !particles) return;
    particles.clear();
    engine.reset();
    useGameStore.getState().resetRun();
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-rune-bg overflow-hidden">
      {/* фон с туманом */}
      <div className="pointer-events-none absolute inset-0 rune-bg-glow" style={{
        background: "radial-gradient(ellipse at 50% 30%, rgba(106,74,154,0.25) 0%, transparent 60%)"
      }} />

      <div className="relative z-10 w-full max-w-[1280px] px-2 sm:px-4 py-2 flex flex-col items-center gap-2">
        {/* Заголовок */}
        <div className="w-full flex items-center justify-between gap-2">
          <div className="font-pixel text-rune-gold text-glow-gold text-[10px] sm:text-sm uppercase tracking-widest">
            RUNE WARS
          </div>
          <div className="flex items-center gap-2">
            <RuneButton variant="ghost" onClick={handleReset} className="text-[10px] py-1 px-2">
              Новая партия
            </RuneButton>
          </div>
        </div>

        {/* Игровое поле + HUD */}
        <div className="w-full flex flex-col lg:flex-row gap-2 items-center justify-center">
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
          </div>

          {/* HUD */}
          <div className="w-full lg:w-72 flex flex-col gap-2">
            <RunePanel glow>
              <PanelTitle>Статистика</PanelTitle>
              <div className="p-3 space-y-2 font-body text-sm">
                <Stat label="Очки" value={score} color="text-rune-gold" />
                <Stat label="Каскад" value={`×${combo || 1}`} color={combo >= 2 ? "text-rune-warm" : "text-rune-text"} />
                <Stat label="Макс. каскад" value={maxCombo} color="text-rune-text" />
                <Stat label="Всего матчей" value={totalMatches} color="text-rune-text" />
              </div>
            </RunePanel>

            {lastMatch && (
              <RunePanel>
                <PanelTitle>Последний ход</PanelTitle>
                <div className="p-3 space-y-2 font-body text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-rune-muted">Длина</span>
                    <span className="text-rune-text">{lastMatch.length}+ ({(lengthMultiplier(lastMatch.length) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-rune-muted">Каскад</span>
                    <span className="text-rune-warm">+{(cascadeBonus(lastMatch.cascadeLevel) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <EffectChip color="red" label="Атака" value={lastMatch.damage} cap={CAPS.damagePerTurn} />
                    <EffectChip color="blue" label="Щит" value={lastMatch.shield} cap={CAPS.shieldPerTurn} />
                    <EffectChip color="green" label="Лечение" value={lastMatch.heal} cap={CAPS.healPerTurn} />
                    <EffectChip color="yellow" label="Ярость" value={lastMatch.rage} cap={CAPS.ragePerTurn} />
                  </div>
                </div>
              </RunePanel>
            )}

            <RunePanel>
              <PanelTitle>Кристаллы</PanelTitle>
              <div className="p-3 grid grid-cols-2 gap-2 font-body text-[11px]">
                {([0, 1, 2, 3] as const).map((c) => {
                  const col = GEM_COLOR_HEX[c];
                  return (
                    <div key={c} className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-sm border border-[#0a0718]"
                        style={{ background: col.base, boxShadow: `0 0 6px ${col.glow}` }}
                      />
                      <span className="text-rune-text">{col.name}</span>
                    </div>
                  );
                })}
              </div>
              <div className="px-3 pb-3 font-body text-[10px] text-rune-muted leading-snug">
                Нажми кристалл, затем соседний, чтобы поменять их местами. Собери 3+ в линию.
              </div>
            </RunePanel>
          </div>
        </div>

        {/* Bottom bar: debug Game Ready */}
        <div className="w-full flex items-center justify-between gap-2 text-[10px] font-body text-rune-muted">
          <div className="flex items-center gap-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${ready ? "bg-green-500" : "bg-red-500"}`}
              style={{ boxShadow: ready ? "0 0 6px #22c55e" : "none" }}
            />
            <span>Engine {ready ? "Ready" : "Init"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${useGameStore.getState().debugReady ? "bg-green-500" : "bg-zinc-600"}`}
              style={{ boxShadow: useGameStore.getState().debugReady ? "0 0 8px #22c55e" : "none" }}
            />
            <span>Game Ready (90s)</span>
          </div>
          <div className="hidden sm:block">Сборка 1152×648 · {BOARD_SIZE}×{BOARD_SIZE} поле</div>
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

function EffectChip({
  color,
  label,
  value,
  cap,
}: {
  color: "red" | "blue" | "green" | "yellow";
  label: string;
  value: number;
  cap: number;
}) {
  const colorMap = {
    red: "text-rune-red border-[#8b1a1a]",
    blue: "text-rune-blue border-[#1a4a8b]",
    green: "text-rune-green border-[#1a8b3a]",
    yellow: "text-rune-yellow border-[#8b7a1a]",
  };
  return (
    <div className={`rounded border px-2 py-1 ${colorMap[color]} bg-[#0a0718]/60`}>
      <div className="text-rune-muted text-[9px] uppercase">{label}</div>
      <div className="font-pixel text-[11px]">
        {value}
        {value >= cap && <span className="text-rune-warm ml-1">MAX</span>}
      </div>
    </div>
  );
}

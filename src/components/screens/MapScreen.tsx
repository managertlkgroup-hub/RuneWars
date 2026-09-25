"use client";

import { useEffect, useMemo, useState } from "react";
import { RuneButton } from "@/components/ui/RuneButton";
import { RunePanel } from "@/components/ui/RunePanel";
import { MapNodeIcon } from "@/components/icons/MapIcons";
import {
  useGameStore,
} from "@/game/core/GameState";
import {
  generateDungeonMap,
  moveToNode,
  refreshStatuses,
  type DungeonMap,
  type MapNode,
  type NodeType,
} from "@/game/map/MapGenerator";
import { getDungeon } from "@/game/content/enemies";
import { useToast } from "@/hooks/use-toast";

const CW = 1152;
const CH = 648;

const TYPE_LABEL: Record<NodeType, string> = {
  start: "Старт",
  battle: "Бой",
  elite: "Элита",
  chest: "Сундук",
  shop: "Магазин",
  camp: "Лагерь",
  event: "Событие",
  boss: "Босс",
};

const TYPE_COLOR: Record<NodeType, string> = {
  start: "#ffd700",
  battle: "#6b8ab8",
  elite: "#b8291a",
  chest: "#c9a227",
  shop: "#8a5a2a",
  camp: "#ff6b1a",
  event: "#8a3a9a",
  boss: "#c0392b",
};

export default function MapScreen() {
  const currentMap = useGameStore((s) => s.currentMap);
  const currentDungeonId = useGameStore((s) => s.currentDungeonId);
  const setMap = useGameStore((s) => s.setMap);
  const setScreen = useGameStore((s) => s.setScreen);
  const setPendingBattle = useGameStore((s) => s.setPendingBattle);
  const setLastNodeReward = useGameStore((s) => s.setLastNodeReward);
  const addGold = useGameStore((s) => s.addGold);
  const equippedRunes = useGameStore((s) => s.equippedRunes);
  const gold = useGameStore((s) => s.gold);
  const { toast } = useToast();
  const [, forceTick] = useState(0);

  // генерация карты при отсутствии
  const map: DungeonMap = useMemo(() => {
    if (currentMap) return currentMap;
    const m = generateDungeonMap(currentDungeonId);
    setMap(m);
    return m;
  }, [currentMap, currentDungeonId, setMap]);

  useEffect(() => {
    refreshStatuses(map);
    forceTick((n) => n + 1);
  }, [map]);

  const dungeon = getDungeon(currentDungeonId);

  const handleNodeClick = (node: MapNode) => {
    if (node.status === "completed" || node.visited) {
      toast({ title: "Уже пройдено", description: "Этот узел уже исследован." });
      return;
    }
    if (node.status === "locked") {
      toast({ title: "Недоступно", description: "Сначала пройди предыдущие узлы." });
      return;
    }
    if (node.status !== "available" && node.status !== "current") return;

    // переход на узел
    const ok = moveToNode(map, node.id);
    if (!ok) {
      toast({ title: "Нельзя перейти", description: "Нет связи от текущего узла." });
      return;
    }
    refreshStatuses(map);
    forceTick((n) => n + 1);

    // обработка типа узла
    switch (node.type) {
      case "battle":
      case "elite":
      case "boss":
        setPendingBattle({
          floor: node.floor,
          isBoss: node.type === "boss",
          nodeType: node.type,
          nodeId: node.id,
          dungeonId: currentDungeonId,
        });
        useGameStore.getState().resetRun();
        setScreen("battle");
        break;
      case "chest": {
        const g = node.data?.gold ?? 20;
        addGold(g);
        setLastNodeReward({ kind: "chest", amount: g, label: "Золото из сундука" });
        toast({ title: "Сундук открыт", description: `Получено ${g} золота.` });
        break;
      }
      case "camp": {
        // +30% HP, 15% засада
        const ambush = Math.random() < 0.15;
        if (ambush) {
          setPendingBattle({
            floor: node.floor,
            isBoss: false,
            nodeType: "battle",
            nodeId: node.id,
            dungeonId: currentDungeonId,
          });
          useGameStore.getState().resetRun();
          setScreen("battle");
          toast({ title: "Засада!", description: "Ночью на лагерь напали враги." });
        } else {
          setLastNodeReward({ kind: "camp", label: "Отдых: +30% HP в следующем бою" });
          toast({ title: "Отдых", description: "Герой восстановил силы. +30% HP в следующем бою." });
        }
        break;
      }
      case "shop": {
        setLastNodeReward({ kind: "shop", label: "Магазин" });
        toast({ title: "Магазин", description: "Товары доступны в Лагере (Этап 6)." });
        break;
      }
      case "event": {
        // простой вариант: первый выбор — +20 HP
        setLastNodeReward({ kind: "event", amount: 20, label: "Событие: +20 HP" });
        toast({ title: "Событие", description: "Странник благодарит вас. +20 HP в следующем бою." });
        break;
      }
      case "start":
        break;
    }
  };

  const currentNode = map.nodes.find((n) => n.id === map.currentNodeId);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-rune-bg overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(106,74,154,0.25) 0%, transparent 60%)",
        }}
      />
      <div className="relative z-10 w-full max-w-[1100px] px-2 sm:px-4 py-2 flex flex-col items-center gap-2 h-full">
        {/* шапка */}
        <div className="w-full flex items-center justify-between gap-2">
          <div className="font-pixel text-rune-gold text-glow-gold text-[10px] sm:text-sm uppercase tracking-widest">
            {dungeon.name}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-pixel text-[9px] text-rune-gold-light flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#c9a227" stroke="#1a0a1e" strokeWidth="3" /></svg>
              {gold}
            </span>
            <RuneButton
              variant="ghost"
              onClick={() => {
                const m = generateDungeonMap(currentDungeonId);
                setMap(m);
                useGameStore.getState().resetRun();
              }}
              className="text-[10px] py-1 px-2"
            >
              Новая карта
            </RuneButton>
          </div>
        </div>
        <div className="font-body text-[10px] text-rune-muted uppercase tracking-widest text-center">
          {dungeon.subtitle}
        </div>

        {/* карта — canvas-соединения + узлы-кнопки */}
        <div
          className="relative w-full"
          style={{ aspectRatio: `${CW} / ${CH}`, maxHeight: "78vh" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${CW} ${CH}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* фон */}
            <defs>
              <radialGradient id="map-bg" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#1a0f2e" />
                <stop offset="100%" stopColor="#070510" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width={CW} height={CH} fill="url(#map-bg)" />
            {/* соединения */}
            {map.nodes.map((n) =>
              n.connectsTo.map((tid) => {
                const t = map.nodes.find((x) => x.id === tid);
                if (!t) return null;
                const x1 = n.x * CW;
                const y1 = n.y * CH * 0.92 + CH * 0.04;
                const x2 = t.x * CW;
                const y2 = t.y * CH * 0.92 + CH * 0.04;
                const isPath =
                  n.status === "completed" && (t.status === "available" || t.status === "current");
                const isLocked = t.status === "locked";
                return (
                  <line
                    key={`${n.id}-${tid}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isPath ? "#c9a227" : isLocked ? "#3a2a5a" : "#6a4a9a"}
                    strokeWidth={isPath ? 3 : 2}
                    strokeDasharray={isLocked ? "6 6" : undefined}
                    opacity={isLocked ? 0.4 : 0.9}
                  />
                );
              })
            )}
          </svg>

          {/* узлы */}
          {map.nodes.map((n) => {
            const left = `${n.x * 100}%`;
            const top = `${n.y * 92 + 4}%`;
            const isCurrent = n.status === "current";
            const isAvailable = n.status === "available";
            const isCompleted = n.status === "completed";
            const isLocked = n.status === "locked";
            const color = TYPE_COLOR[n.type];
            return (
              <button
                key={n.id}
                onClick={() => handleNodeClick(n)}
                onContextMenu={(e) => e.preventDefault()}
                disabled={isLocked}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-transform"
                style={{
                  left,
                  top,
                  opacity: isLocked ? 0.45 : 1,
                  cursor: isLocked ? "default" : "pointer",
                }}
              >
                <div
                  className="relative flex items-center justify-center rounded-full transition-all"
                  style={{
                    width: 56,
                    height: 56,
                    border: `3px ${isLocked ? "dashed" : "solid"} ${isCurrent ? "#c9a227" : isAvailable ? "#d8d8e8" : isCompleted ? "#3a8b3a" : "#3a2a5a"}`,
                    background: isCurrent
                      ? "radial-gradient(circle, rgba(201,162,39,0.35), rgba(8,5,18,0.9))"
                      : "radial-gradient(circle, rgba(31,22,56,0.9), rgba(8,5,18,0.95))",
                    boxShadow: isCurrent
                      ? "0 0 18px rgba(201,162,39,0.7)"
                      : isAvailable
                      ? `0 0 10px ${color}99`
                      : "none",
                    animation: isCurrent ? "rune-pulse 1.2s ease-in-out infinite" : undefined,
                  }}
                >
                  {isCompleted ? (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#3a8b3a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <MapNodeIcon type={n.type} size={n.type === "boss" || n.type === "start" ? 44 : 38} />
                  )}
                </div>
                <span
                  className="font-pixel text-[7px] uppercase tracking-wider"
                  style={{ color: isCurrent ? "#f4d36a" : isAvailable ? "#e8dcc0" : "#6a5a7a" }}
                >
                  {TYPE_LABEL[n.type]}
                </span>
              </button>
            );
          })}
        </div>

        {/* инфо текущего узла */}
        <RunePanel className="w-full max-w-xl">
          <div className="p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[9px] text-rune-gold uppercase">Текущий:</span>
              <span className="font-body text-[11px] text-rune-text">
                {currentNode ? TYPE_LABEL[currentNode.type] : "—"}
                {currentNode?.floor !== undefined && currentNode.floor > 0 && ` · Этаж ${currentNode.floor}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[8px] text-rune-muted">
                Руны: {equippedRunes.length}/3
              </span>
              <RuneButton
                variant="ghost"
                onClick={() => setScreen("equip")}
                className="text-[9px] py-1 px-2"
              >
                Руны
              </RuneButton>
            </div>
          </div>
        </RunePanel>
      </div>
    </div>
  );
}

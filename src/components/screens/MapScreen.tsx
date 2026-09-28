"use client";

import { useEffect, useMemo, useState } from "react";
import { RuneButton } from "@/components/ui/RuneButton";
import { RunePanel } from "@/components/ui/RunePanel";
import { MapNodeIcon } from "@/components/icons/MapIcons";
import ChestScreen from "@/components/screens/ChestScreen";
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
import { chestTypeForFloor, CHESTS, openChest, type ChestType } from "@/game/content/items";
import type { ChestResult } from "@/components/screens/ChestScreen";
import ShopScreen from "@/components/screens/ShopScreen";
import CampScreen from "@/components/screens/CampScreen";
import EventScreen from "@/components/screens/EventScreen";
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
  const dungeonGold = useGameStore((s) => s.dungeonGold);
  const heroHp = useGameStore((s) => s.heroHp);
  const heroMaxHp = useGameStore((s) => s.heroMaxHp);
  const { toast } = useToast();
  const [, forceTick] = useState(0);
  const [chestModal, setChestModal] = useState<{ chestType: ChestType; nodeId: number; result: ChestResult } | null>(null);
  const [shopModal, setShopModal] = useState<{ nodeId: number } | null>(null);
  const [campModal, setCampModal] = useState<{ nodeId: number } | null>(null);
  const [eventModal, setEventModal] = useState<{ nodeId: number } | null>(null);

  // генерация карты при отсутствии — в эффекте (не в рендере)
  const map: DungeonMap = useMemo(() => {
    if (currentMap) return currentMap;
    // временный пустой объект до генерации в эффекте
    return { nodes: [], floors: [], currentNodeId: 0, dungeonId: currentDungeonId };
  }, [currentMap, currentDungeonId]);

  useEffect(() => {
    if (!currentMap) {
      const m = generateDungeonMap(currentDungeonId);
      setMap(m);
      return;
    }
    refreshStatuses(currentMap);
    // форс-рендер после мутации статусов узлов
    // eslint-disable-next-line react-hooks/set-state-in-effect
    forceTick((n) => n + 1);
    if (typeof window !== "undefined") {
      (window as unknown as { __store?: typeof useGameStore }).__store = useGameStore;
    }
  }, [currentMap, currentDungeonId, setMap]);

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
        // открыть сундук: вычислить результат в event handler (можно setState)
        let ct = chestTypeForFloor(node.floor, false);
        const st = useGameStore.getState();
        const initialPity = st.pityCounter;
        // pity-гарантия: апгрейд сундука до gold (cap=epic) если кап ниже epic
        const capOrder = CHESTS[ct].rarityCap;
        if (initialPity >= 20 && (capOrder === "common" || capOrder === "uncommon" || capOrder === "rare")) {
          ct = "gold";
        }
        let r;
        try {
          r = openChest(ct, initialPity);
        } catch (err) {
          console.error("openChest error", err, { ct, initialPity });
          toast({ title: "Ошибка сундука", description: String(err) });
          break;
        }
        st.setPityCounter(r.newPityCounter);
        setChestModal({ chestType: ct, nodeId: node.id, result: { ...r, initialPity } });
        break;
      }
      case "camp": {
        setCampModal({ nodeId: node.id });
        break;
      }
      case "shop": {
        setShopModal({ nodeId: node.id });
        break;
      }
      case "event": {
        setEventModal({ nodeId: node.id });
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
            <span className="font-pixel text-[9px] text-rune-warm flex items-center gap-1" title="Золото подземелья">
              <svg width="10" height="10" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#c9a227" stroke="#1a0a1e" strokeWidth="3" /></svg>
              {dungeonGold}
            </span>
            <span className="font-pixel text-[8px] text-rune-red" title="HP героя (переносимый)">
              HP {heroHp}/{heroMaxHp}
            </span>
            <RuneButton
              variant="ghost"
              onClick={() => {
                const m = generateDungeonMap(currentDungeonId);
                setMap(m);
                useGameStore.getState().resetRun();
                useGameStore.getState().resetDungeonRun();
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
                onClick={() => setScreen("inventory")}
                className="text-[9px] py-1 px-2"
              >
                Инвентарь
              </RuneButton>
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

      {/* модалка сундука */}
      {chestModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-2">
          <ChestScreen
            chestType={chestModal.chestType}
            result={chestModal.result}
            onDone={() => {
              setChestModal(null);
              refreshStatuses(map);
              forceTick((n) => n + 1);
            }}
          />
        </div>
      )}
      {/* модалка магазина */}
      {shopModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-2">
          <ShopScreen
            onDone={() => {
              setShopModal(null);
              refreshStatuses(map);
              forceTick((n) => n + 1);
            }}
          />
        </div>
      )}
      {/* модалка лагеря */}
      {campModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-2">
          <CampScreen
            onDone={() => {
              setCampModal(null);
              refreshStatuses(map);
              forceTick((n) => n + 1);
            }}
            onAmbush={() => {
              setCampModal(null);
              const node = map.nodes.find((n) => n.id === campModal.nodeId);
              setPendingBattle({
                floor: node?.floor ?? 1,
                isBoss: false,
                nodeType: "battle",
                nodeId: campModal.nodeId,
                dungeonId: currentDungeonId,
              });
              useGameStore.getState().resetRun();
              setScreen("battle");
            }}
          />
        </div>
      )}
      {/* модалка события */}
      {eventModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-2">
          <EventScreen
            onDone={() => {
              setEventModal(null);
              refreshStatuses(map);
              forceTick((n) => n + 1);
            }}
            onMimic={() => {
              setEventModal(null);
              const node = map.nodes.find((n) => n.id === eventModal.nodeId);
              setPendingBattle({
                floor: node?.floor ?? 1,
                isBoss: false,
                nodeType: "battle",
                nodeId: eventModal.nodeId,
                dungeonId: currentDungeonId,
              });
              useGameStore.getState().resetRun();
              setScreen("battle");
            }}
          />
        </div>
      )}
    </div>
  );
}

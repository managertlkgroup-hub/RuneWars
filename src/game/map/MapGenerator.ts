// RUNE WARS — процедурная генерация карты подземелья с ветвлением

export type NodeType =
  | "start"
  | "battle"
  | "elite"
  | "chest"
  | "shop"
  | "camp"
  | "event"
  | "boss";

export type NodeStatus = "current" | "available" | "completed" | "locked";

export interface MapNode {
  id: number;
  floor: number; // 0 = start, 1..4 = средние, 5 = boss
  x: number; // 0..1 горизонталь
  y: number; // 0..1 вертикаль (1 = низ, 0 = верх)
  type: NodeType;
  connectsTo: number[]; // ids на следующем этаже
  connectsFrom: number[]; // ids на предыдущем
  status: NodeStatus;
  visited: boolean;
  // данные точки (золото сундука, товары магазина и т.д.)
  data?: { gold?: number; shopItems?: { name: string; cost: number; kind: string }[]; eventChoices?: { label: string; effect: string }[] };
}

export interface DungeonMap {
  nodes: MapNode[];
  floors: number[][]; // node ids по этажам
  currentNodeId: number;
  dungeonId: number;
}

let nextNodeId = 1;

const FLOOR_HP_MULT = [1.0, 1.0, 1.1, 1.25, 1.4, 1.0];
const FLOOR_ATK_MULT = [1.0, 1.0, 1.05, 1.15, 1.25, 1.0];

export function floorScale(floor: number, hp: number, atk: number) {
  const i = Math.min(Math.max(floor, 0), 5);
  return {
    hp: Math.round(hp * FLOOR_HP_MULT[i]),
    atk: Math.round(atk * FLOOR_ATK_MULT[i]),
  };
}

const NODE_POOL_BY_FLOOR: Record<number, NodeType[]> = {
  1: ["battle", "battle", "battle", "chest"],
  2: ["battle", "battle", "chest", "event", "shop"],
  3: ["battle", "elite", "shop", "event", "camp"],
  4: ["battle", "elite", "elite", "camp", "chest"],
};

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randRange(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function generateDungeonMap(dungeonId: number): DungeonMap {
  nextNodeId = 1;
  const nodes: MapNode[] = [];
  const floors: number[][] = [];

  // старт (floor 0) внизу по центру
  const startNode: MapNode = {
    id: nextNodeId++,
    floor: 0,
    x: 0.5,
    y: 0.95,
    type: "start",
    connectsTo: [],
    connectsFrom: [],
    status: "current",
    visited: false,
  };
  nodes.push(startNode);
  floors.push([startNode.id]);

  // этажи 1..4 (этаж 1 = 2 узла гарантированно)
  for (let floor = 1; floor <= 4; floor++) {
    const count = floor === 1 ? 2 : randRange(2, 4);
    const floorNodeIds: number[] = [];
    const pool = NODE_POOL_BY_FLOOR[floor];
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? 0.5 : (i + 0.5) / count + (Math.random() - 0.5) * 0.08;
      const y = 0.95 - (floor / 6) * 0.9;
      const type = randItem(pool);
      const node: MapNode = {
        id: nextNodeId++,
        floor,
        x: Math.max(0.08, Math.min(0.92, x)),
        y,
        type,
        connectsTo: [],
        connectsFrom: [],
        status: "locked",
        visited: false,
        data: makeNodeData(type, floor),
      };
      nodes.push(node);
      floorNodeIds.push(node.id);
    }
    floors.push(floorNodeIds);
  }

  // босс (floor 5) вверху по центру
  const bossNode: MapNode = {
    id: nextNodeId++,
    floor: 5,
    x: 0.5,
    y: 0.05,
    type: "boss",
    connectsTo: [],
    connectsFrom: [],
    status: "locked",
    visited: false,
  };
  nodes.push(bossNode);
  floors.push([bossNode.id]);

  // связи: каждый узел floor N соединяется с 1-2 узлами floor N+1 (|Δx| ≤ 0.3)
  for (let f = 0; f < 5; f++) {
    const curFloor = floors[f];
    const nextFloor = floors[f + 1];
    for (const nid of curFloor) {
      const node = nodes.find((n) => n.id === nid)!;
      if (f === 0) {
        // старт → все узлы этажа 1
        node.connectsTo = [...nextFloor];
      } else {
        // до 2 связей, ближайшие по x
        const candidates = nextFloor
          .map((tid) => {
            const tn = nodes.find((n) => n.id === tid)!;
            return { id: tid, dx: Math.abs(tn.x - node.x) };
          })
          .filter((c) => c.dx <= 0.35)
          .sort((a, b) => a.dx - b.dx);
        // гарантия хотя бы 1 связи (если нет близких — взять ближайший)
        const picks = candidates.slice(0, Math.min(2, candidates.length || 1));
        if (picks.length === 0 && nextFloor.length > 0) {
          picks.push({ id: nextFloor[0], dx: 1 });
        }
        node.connectsTo = picks.map((p) => p.id);
      }
    }
  }

  // обратные связи
  for (const n of nodes) {
    for (const tid of n.connectsTo) {
      const tn = nodes.find((x) => x.id === tid)!;
      tn.connectsFrom.push(n.id);
    }
  }

  // гарантия: каждый узел (кроме старта) достижим. Если у узла нет connectsFrom —
  // привязать к ближайшему узлу предыдущего этажа.
  for (let f = 1; f <= 5; f++) {
    for (const nid of floors[f]) {
      const node = nodes.find((n) => n.id === nid)!;
      if (node.connectsFrom.length === 0 && floors[f - 1].length > 0) {
        // найти ближайший по x на предыдущем этаже и привязать
        const prev = floors[f - 1]
          .map((pid) => {
            const pn = nodes.find((n) => n.id === pid)!;
            return { id: pid, dx: Math.abs(pn.x - node.x) };
          })
          .sort((a, b) => a.dx - b.dx)[0];
        const pn = nodes.find((n) => n.id === prev.id)!;
        if (!pn.connectsTo.includes(node.id)) pn.connectsTo.push(node.id);
        node.connectsFrom.push(prev.id);
      }
    }
  }

  // активируем узлы этажа 1 (доступны из старта)
  refreshStatuses({ nodes, floors, currentNodeId: startNode.id, dungeonId });
  return { nodes, floors, currentNodeId: startNode.id, dungeonId };
}

function makeNodeData(type: NodeType, floor: number): MapNode["data"] {
  if (type === "chest") {
    const tier = floor <= 2 ? 1 : floor === 3 ? 2 : 3;
    return { gold: tier === 1 ? randRange(15, 30) : tier === 2 ? randRange(35, 60) : randRange(70, 120) };
  }
  if (type === "shop") {
    return {
      shopItems: [
        { name: "Лечение +25 HP", cost: 20, kind: "heal" },
        { name: "Золото +50", cost: 30, kind: "gold" },
        { name: "Случайная руна", cost: 60, kind: "rune" },
      ],
    };
  }
  if (type === "event") {
    return {
      eventChoices: [
        { label: "Помочь страннику", effect: "+20 HP" },
        { label: "Грабить", effect: "+30 золота, -10 HP" },
        { label: "Уйти", effect: "ничего" },
      ],
    };
  }
  return undefined;
}

/** Пересчитать статусы узлов на основе currentNodeId. */
export function refreshStatuses(map: DungeonMap): void {
  const current = map.nodes.find((n) => n.id === map.currentNodeId);
  for (const n of map.nodes) {
    if (n.id === map.currentNodeId) {
      n.status = "current";
    } else if (current && current.connectsTo.includes(n.id)) {
      n.status = "available";
    } else if (n.visited || (current && isAncestorCompleted(n, map, current))) {
      n.status = "completed";
    } else {
      n.status = "locked";
    }
  }
  // старт и пройденные бои — completed (не current после прохождения)
  for (const n of map.nodes) {
    if (n.visited && n.id !== map.currentNodeId) n.status = "completed";
  }
}

function isAncestorCompleted(node: MapNode, map: DungeonMap, current: MapNode): boolean {
  // упрощённо: если узел на этаже ниже текущего и его этаж пройден
  if (node.floor < current.floor) return true;
  return false;
}

/** Перейти на узел. Возвращает true если переход разрешён. */
export function moveToNode(map: DungeonMap, nodeId: number): boolean {
  const current = map.nodes.find((n) => n.id === map.currentNodeId);
  if (!current) return false;
  if (!current.connectsTo.includes(nodeId)) return false;
  const target = map.nodes.find((n) => n.id === nodeId);
  if (!target || target.visited) return false;
  // помечаем текущий как посещённый (completed)
  current.visited = true;
  current.status = "completed";
  // новый текущий
  map.currentNodeId = nodeId;
  target.status = "current";
  target.visited = true;
  refreshStatuses(map);
  return true;
}

import { ADJACENCY, feltAt, HEAT_RANGE, NODES, type Coord, type GraphNode } from './phoenix';

const WALK_MPS = 1.32;

export type RouteResult = {
  nodeIds: string[];
  coords: Coord[];
  meters: number;
  minutes: number;
  meanC: number;
  peakC: number;
  dose: number;
};

export type RouteMode = 'cool' | 'fast';

function haversine(a: GraphNode, b: GraphNode) {
  const R = 6371000;
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dp = ((b.lat - a.lat) * Math.PI) / 180;
  const dl = ((b.lon - a.lon) * Math.PI) / 180;
  const x =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function edgeHeat(a: GraphNode, b: GraphNode) {
  return feltAt((a.lat + b.lat) / 2, (a.lon + b.lon) / 2);
}

function cost(a: GraphNode, b: GraphNode, mode: RouteMode) {
  const meters = haversine(a, b);
  if (mode === 'fast') return meters;
  const felt = edgeHeat(a, b);
  const norm = (felt - HEAT_RANGE.min) / Math.max(0.01, HEAT_RANGE.max - HEAT_RANGE.min);
  return meters * (1 + 3.4 * norm ** 1.35);
}

function astar(startId: string, goalId: string, mode: RouteMode): string[] | null {
  const start = NODES[startId];
  const goal = NODES[goalId];
  if (!start || !goal) return null;

  const open = new Set<string>([startId]);
  const came = new Map<string, string>();
  const g = new Map<string, number>([[startId, 0]]);
  const f = new Map<string, number>([[startId, haversine(start, goal)]]);

  while (open.size) {
    let current = '';
    let best = Infinity;
    for (const id of open) {
      const score = f.get(id) ?? Infinity;
      if (score < best) {
        best = score;
        current = id;
      }
    }
    if (!current) break;
    if (current === goalId) {
      const path = [current];
      while (came.has(path[0])) path.unshift(came.get(path[0])!);
      return path;
    }
    open.delete(current);
    const here = NODES[current];
    for (const nextId of ADJACENCY[current] ?? []) {
      const next = NODES[nextId];
      const tentative = (g.get(current) ?? Infinity) + cost(here, next, mode);
      if (tentative < (g.get(nextId) ?? Infinity)) {
        came.set(nextId, current);
        g.set(nextId, tentative);
        f.set(nextId, tentative + haversine(next, goal));
        open.add(nextId);
      }
    }
  }
  return null;
}

function toResult(nodeIds: string[]): RouteResult {
  const nodes = nodeIds.map((id) => NODES[id]);
  const coords = nodes.map((n) => ({ latitude: n.lat, longitude: n.lon }));
  let meters = 0;
  let dose = 0;
  let peakC = -Infinity;
  let heatSum = 0;
  let heatN = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const d = haversine(a, b);
    const felt = edgeHeat(a, b);
    const minutes = d / WALK_MPS / 60;
    meters += d;
    dose += felt * minutes;
    peakC = Math.max(peakC, felt);
    heatSum += felt;
    heatN += 1;
  }
  const minutes = meters / WALK_MPS / 60;
  return {
    nodeIds,
    coords,
    meters,
    minutes,
    meanC: heatN ? heatSum / heatN : feltAt(nodes[0].lat, nodes[0].lon),
    peakC: Number.isFinite(peakC) ? peakC : feltAt(nodes[0].lat, nodes[0].lon),
    dose,
  };
}

export function planRoutes(fromId: string, toId: string) {
  const coolIds = astar(fromId, toId, 'cool');
  const fastIds = astar(fromId, toId, 'fast');
  if (!coolIds || !fastIds) {
    throw new Error(`No route between ${fromId} and ${toId}`);
  }
  return {
    cool: toResult(coolIds),
    fast: toResult(fastIds),
  };
}

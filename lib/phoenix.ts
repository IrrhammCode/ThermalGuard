export type Coord = { latitude: number; longitude: number };

export type GraphNode = {
  id: string;
  lat: number;
  lon: number;
  street: string;
  avenue: string;
};

export type HeatTile = {
  id: string;
  t2m: number;
  felt: number;
  coordinates: Coord[];
};

export type RefugeKind = 'park' | 'ac' | 'shade' | 'transit';

export type Refuge = {
  id: string;
  name: string;
  kind: RefugeKind;
  lat: number;
  lon: number;
  nodeId: string;
  trap?: boolean;
  note: string;
};

export type Trip = {
  id: string;
  label: string;
  fromId: string;
  toId: string;
  holdMinutes?: number;
  holdReason?: string;
};

export const BOUNDS = {
  south: 33.4462,
  north: 33.4599,
  west: -112.0796,
  east: -112.0684,
};

export const DEMO_POINT: Coord = { latitude: 33.454, longitude: -112.0742 };

const AVENUES = [
  { id: '3rdave', name: '3rd Ave', lon: -112.07835 },
  { id: '2ndave', name: '2nd Ave', lon: -112.07685 },
  { id: '1stave', name: '1st Ave', lon: -112.0754 },
  { id: 'central', name: 'Central Ave', lon: -112.074 },
  { id: '1stst', name: '1st St', lon: -112.07255 },
  { id: '2ndst', name: '2nd St', lon: -112.0711 },
  { id: '3rdst', name: '3rd St', lon: -112.06965 },
] as const;

const STREETS = [
  { id: 'jefferson', name: 'Jefferson', lat: 33.44705 },
  { id: 'washington', name: 'Washington', lat: 33.4484 },
  { id: 'adams', name: 'Adams', lat: 33.4497 },
  { id: 'monroe', name: 'Monroe', lat: 33.451 },
  { id: 'vanburen', name: 'Van Buren', lat: 33.45225 },
  { id: 'fillmore', name: 'Fillmore', lat: 33.45365 },
  { id: 'mckinley', name: 'McKinley', lat: 33.45505 },
  { id: 'portland', name: 'Portland', lat: 33.4565 },
  { id: 'roosevelt', name: 'Roosevelt', lat: 33.45875 },
] as const;

function nid(streetId: string, aveId: string) {
  return `${streetId}-${aveId}`;
}

function gauss(lat: number, lon: number, cy: number, cx: number, sigma: number, amp: number) {
  const dlat = lat - cy;
  const dlon = (lon - cx) * Math.cos((lat * Math.PI) / 180);
  const d2 = dlat * dlat + dlon * dlon;
  return amp * Math.exp(-d2 / (2 * sigma * sigma));
}

function ridgeLat(lat: number, streetLat: number, amp: number, sigma = 0.00055) {
  const d = lat - streetLat;
  return amp * Math.exp(-(d * d) / (2 * sigma * sigma));
}

function ridgeLon(lon: number, aveLon: number, amp: number, sigma = 0.00042) {
  const d = lon - aveLon;
  return amp * Math.exp(-(d * d) / (2 * sigma * sigma));
}

/** 2 m air temperature (°C) — Phoenix, 15 Jul 2024, 14:00, FortyGuard-style layer. */
export function airTempAt(lat: number, lon: number): number {
  let t = 41.3;
  t += gauss(lat, lon, 33.454, -112.0742, 0.00185, -6.4); // Civic Space Park canopy
  t += gauss(lat, lon, 33.4528, -112.0696, 0.00115, -3.6); // Arizona Center
  t += gauss(lat, lon, 33.4476, -112.0739, 0.001, -2.4); // CityScape
  t += gauss(lat, lon, 33.4485, -112.0711, 0.0009, -1.6); // Convention Center
  t += gauss(lat, lon, 33.4466, -112.0688, 0.0021, 4.9); // Chase Field lots
  t += gauss(lat, lon, 33.45225, -112.074, 0.00075, 3.4); // Van Buren / Central trap
  t += ridgeLat(lat, 33.45225, 2.5); // Van Buren asphalt
  t += ridgeLat(lat, 33.44705, 1.8); // Jefferson
  t += ridgeLon(lon, -112.0754, -2.3); // 1st Ave shade canyon
  t += ridgeLon(lon, -112.06965, 1.5); // 3rd St
  t += ridgeLon(lon, -112.0711, 1.15); // 2nd St
  t += ridgeLon(lon, -112.074, 0.7); // Central / light rail
  return t;
}

/** Perceived temperature — air + radiant load from open pavement. */
export function feltAt(lat: number, lon: number): number {
  const air = airTempAt(lat, lon);
  const parkRelief = -gauss(lat, lon, 33.454, -112.0742, 0.00185, 1);
  const openness = Math.max(0, Math.min(1, 0.55 + (air - 41.3) / 10 + parkRelief));
  return air + 1.4 + 5.2 * openness;
}

export const NODES: Record<string, GraphNode> = Object.fromEntries(
  STREETS.flatMap((street) =>
    AVENUES.map((ave) => {
      const id = nid(street.id, ave.id);
      const node: GraphNode = {
        id,
        lat: street.lat,
        lon: ave.lon,
        street: street.name,
        avenue: ave.name,
      };
      return [id, node];
    }),
  ),
);

export const ADJACENCY: Record<string, string[]> = {};
for (let s = 0; s < STREETS.length; s++) {
  for (let a = 0; a < AVENUES.length; a++) {
    const id = nid(STREETS[s].id, AVENUES[a].id);
    const next: string[] = [];
    if (s > 0) next.push(nid(STREETS[s - 1].id, AVENUES[a].id));
    if (s < STREETS.length - 1) next.push(nid(STREETS[s + 1].id, AVENUES[a].id));
    if (a > 0) next.push(nid(STREETS[s].id, AVENUES[a - 1].id));
    if (a < AVENUES.length - 1) next.push(nid(STREETS[s].id, AVENUES[a + 1].id));
    ADJACENCY[id] = next;
  }
}

function buildTiles(): HeatTile[] {
  const rows = 8;
  const cols = 9;
  const tiles: HeatTile[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const south = BOUNDS.south + ((BOUNDS.north - BOUNDS.south) * r) / rows;
      const north = BOUNDS.south + ((BOUNDS.north - BOUNDS.south) * (r + 1)) / rows;
      const west = BOUNDS.west + ((BOUNDS.east - BOUNDS.west) * c) / cols;
      const east = BOUNDS.west + ((BOUNDS.east - BOUNDS.west) * (c + 1)) / cols;
      const lat = (south + north) / 2;
      const lon = (west + east) / 2;
      tiles.push({
        id: `${r}-${c}`,
        t2m: airTempAt(lat, lon),
        felt: feltAt(lat, lon),
        coordinates: [
          { latitude: south, longitude: west },
          { latitude: south, longitude: east },
          { latitude: north, longitude: east },
          { latitude: north, longitude: west },
        ],
      });
    }
  }
  return tiles;
}

export const TILES = buildTiles();

const felts = TILES.map((t) => t.felt);
export const HEAT_RANGE = {
  min: Math.min(...felts),
  max: Math.max(...felts),
};

export const REFUGES: Refuge[] = [
  {
    id: 'civic',
    name: 'Civic Space Park',
    kind: 'park',
    lat: 33.454,
    lon: -112.0742,
    nodeId: 'fillmore-1stave',
    note: 'Dense canopy. Strongest cool corridor in the downtown grid.',
  },
  {
    id: 'azcenter',
    name: 'Arizona Center',
    kind: 'ac',
    lat: 33.4528,
    lon: -112.0696,
    nodeId: 'vanburen-3rdst',
    note: 'Air-conditioned holding zone next to the hot Van Buren platform.',
  },
  {
    id: 'cityscape',
    name: 'CityScape',
    kind: 'ac',
    lat: 33.4476,
    lon: -112.0739,
    nodeId: 'washington-1stave',
    note: 'Shaded retail courtyard on Washington.',
  },
  {
    id: 'pcc',
    name: 'Phoenix Convention Center',
    kind: 'ac',
    lat: 33.4485,
    lon: -112.0711,
    nodeId: 'washington-2ndst',
    note: 'Indoor start point. Step outside into a 2 m heat trap.',
  },
  {
    id: 'vanburen',
    name: 'Van Buren / Central Station',
    kind: 'transit',
    lat: 33.45225,
    lon: -112.074,
    nodeId: 'vanburen-central',
    trap: true,
    note: 'Exposed platform. Crowds bottleneck in the last strip of shade.',
  },
  {
    id: 'roosevelt',
    name: 'Roosevelt Row',
    kind: 'shade',
    lat: 33.45875,
    lon: -112.074,
    nodeId: 'roosevelt-central',
    note: 'Gallery strip with intermittent awnings. Cooler than Central further south.',
  },
];

export const TRIPS: Trip[] = [
  {
    id: 'shade-park',
    label: 'Convention Center → Civic Space Park',
    fromId: 'washington-2ndst',
    toId: 'fillmore-1stave',
  },
  {
    id: 'hold-zone',
    label: 'Van Buren Station → Arizona Center',
    fromId: 'vanburen-central',
    toId: 'vanburen-3rdst',
    holdMinutes: 11,
    holdReason:
      'Next Valley Metro arrives in 11 min. Hold inside Arizona Center instead of the exposed platform.',
  },
  {
    id: 'roosevelt',
    label: 'CityScape → Roosevelt Row',
    fromId: 'washington-1stave',
    toId: 'roosevelt-central',
  },
];

export function inDemoBounds(lat: number, lon: number) {
  return (
    lat >= BOUNDS.south - 0.02 &&
    lat <= BOUNDS.north + 0.02 &&
    lon >= BOUNDS.west - 0.02 &&
    lon <= BOUNDS.east + 0.02
  );
}

export function nearestNode(lat: number, lon: number): GraphNode {
  let best: GraphNode = Object.values(NODES)[0];
  let bestD = Infinity;
  for (const node of Object.values(NODES)) {
    const dlat = node.lat - lat;
    const dlon = node.lon - lon;
    const d = dlat * dlat + dlon * dlon;
    if (d < bestD) {
      bestD = d;
      best = node;
    }
  }
  return best;
}

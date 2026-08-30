import { NODES } from '@/lib/phoenix';

export type PlaceKind = 'platform' | 'ac' | 'park' | 'venue' | 'street';

export type Place = {
  id: string;
  name: string;
  kind: PlaceKind;
  indoor: boolean;
  lat: number;
  lon: number;
  aliases: string[];
};

const LANDMARKS: { id: string; name: string; kind: PlaceKind; indoor: boolean; aliases: string[] }[] = [
  {
    id: 'vanburen-central',
    name: 'Van Buren / Central',
    kind: 'platform',
    indoor: false,
    aliases: ['van buren station', 'metro station', 'light rail', 'platform', 'central station'],
  },
  {
    id: 'vanburen-3rdst',
    name: 'Arizona Center',
    kind: 'ac',
    indoor: true,
    aliases: ['az center', 'arizona center mall'],
  },
  {
    id: 'washington-1stave',
    name: 'CityScape',
    kind: 'ac',
    indoor: true,
    aliases: ['cityscape phoenix', 'city scape'],
  },
  {
    id: 'washington-2ndst',
    name: 'Convention Center',
    kind: 'ac',
    indoor: true,
    aliases: ['phoenix convention center', 'pcc', 'convention'],
  },
  {
    id: 'fillmore-1stave',
    name: 'Civic Space Park',
    kind: 'park',
    indoor: false,
    aliases: ['civic space', 'civic park', 'asudt'],
  },
  {
    id: 'roosevelt-central',
    name: 'Roosevelt Row',
    kind: 'street',
    indoor: false,
    aliases: ['roosevelt', 'roosevelt row arts'],
  },
];

export const PLACES: Place[] = Object.values(NODES).map((n) => {
  const land = LANDMARKS.find((l) => l.id === n.id);
  if (land) return { ...land, lat: n.lat, lon: n.lon };
  return {
    id: n.id,
    name: `${n.street} / ${n.avenue}`,
    kind: 'street' as const,
    indoor: false,
    lat: n.lat,
    lon: n.lon,
    aliases: [n.street, n.avenue, `${n.street} and ${n.avenue}`, `${n.street} ${n.avenue}`],
  };
});

export const FEATURED: Place[] = LANDMARKS.map((l) => PLACES.find((p) => p.id === l.id)).filter(
  (p): p is Place => Boolean(p),
);

export function placeById(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

export function placeLabel(id: string): string {
  return placeById(id)?.name ?? id;
}

export function kindLabel(kind: PlaceKind): string {
  if (kind === 'platform') return 'EXPOSED PLATFORM';
  if (kind === 'ac') return 'INDOOR AC';
  if (kind === 'park') return 'CANOPY';
  if (kind === 'venue') return 'VENUE';
  return 'STREET';
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scorePlace(place: Place, q: string): number {
  if (!q) return 0;
  const name = norm(place.name);
  const hay = [name, place.id.replace(/-/g, ' '), ...place.aliases.map(norm)].join(' ');
  if (name === q || place.id === q) return 100;
  if (name.startsWith(q)) return 90;
  if (hay.includes(q)) return 75;
  const tokens = q.split(' ').filter(Boolean);
  if (tokens.length && tokens.every((t) => hay.includes(t))) return 60;
  return 0;
}

export function searchStops(query: string, excludeId?: string, limit = 8): Place[] {
  const q = norm(query);
  const pool = PLACES.filter((p) => p.id !== excludeId);
  if (!q) {
    const featured = FEATURED.filter((p) => p.id !== excludeId);
    return featured.slice(0, limit);
  }
  return pool
    .map((p) => ({ p, score: scorePlace(p, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
    .slice(0, limit)
    .map((x) => x.p);
}

export function nearestStop(lat: number, lon: number, excludeId?: string): Place {
  const pool = PLACES.filter((p) => p.id !== excludeId);
  let best = pool[0] ?? PLACES[0];
  let bestD = Infinity;
  for (const p of pool) {
    const dlat = p.lat - lat;
    const dlon = p.lon - lon;
    const d = dlat * dlat + dlon * dlon;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** Resolve typed text to a downtown grid node. Local match first, then geocode + snap. */
export async function resolvePlaceQuery(query: string, excludeId?: string): Promise<Place | null> {
  const raw = query.trim();
  if (!raw) return null;
  const q = norm(raw);
  const exact = PLACES.find(
    (p) => p.id !== excludeId && (norm(p.name) === q || p.id === raw || p.id === q.replace(/ /g, '-')),
  );
  if (exact) return exact;
  const hits = searchStops(raw, excludeId, 5);
  if (hits[0] && scorePlace(hits[0], q) >= 75) return hits[0];
  try {
    const Location = await import('expo-location');
    const tagged = /phoenix/i.test(raw) ? raw : `${raw}, Phoenix AZ`;
    const geo = await Location.geocodeAsync(tagged);
    const hit = geo[0];
    if (hit?.latitude && hit?.longitude) return nearestStop(hit.latitude, hit.longitude, excludeId);
  } catch {
    // Simulator / web may lack geocoder — fall through to local search.
  }
  return hits[0] ?? null;
}

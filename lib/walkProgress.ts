import type { Coord } from '@/lib/types';

function dist(a: Coord, b: Coord) {
  return Math.hypot(a.latitude - b.latitude, a.longitude - b.longitude);
}

/** t in [0, 1] along the polyline. Prefix is the drawn trail including the walker. */
export function alongPath(coords: Coord[], t: number): { point: Coord; prefix: Coord[] } {
  if (!coords.length) {
    return { point: { latitude: 0, longitude: 0 }, prefix: [] };
  }
  if (coords.length === 1 || t <= 0) {
    return { point: coords[0], prefix: [coords[0]] };
  }
  if (t >= 1) {
    return { point: coords[coords.length - 1], prefix: coords };
  }

  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = dist(coords[i - 1], coords[i]);
    segs.push(d);
    total += d;
  }
  if (total === 0) {
    return { point: coords[coords.length - 1], prefix: coords };
  }

  let remain = t * total;
  const prefix: Coord[] = [coords[0]];
  for (let i = 0; i < segs.length; i++) {
    const len = segs[i];
    if (remain <= len) {
      const f = len === 0 ? 1 : remain / len;
      const a = coords[i];
      const b = coords[i + 1];
      const point = {
        latitude: a.latitude + (b.latitude - a.latitude) * f,
        longitude: a.longitude + (b.longitude - a.longitude) * f,
      };
      prefix.push(point);
      return { point, prefix };
    }
    remain -= len;
    prefix.push(coords[i + 1]);
  }
  return { point: coords[coords.length - 1], prefix: coords };
}

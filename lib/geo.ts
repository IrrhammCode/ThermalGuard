export const BOUNDS = {
  south: 33.4462,
  north: 33.4599,
  west: -112.0796,
  east: -112.0684,
};

export const DEMO_POINT = { latitude: 33.454, longitude: -112.0742 };

export function inDemoBounds(lat: number, lon: number) {
  return lat >= BOUNDS.south && lat <= BOUNDS.north && lon >= BOUNDS.west && lon <= BOUNDS.east;
}

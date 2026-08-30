export type RiskLevel = 'Moderate' | 'Strong' | 'Very Strong' | 'Extreme';

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

const STOPS: { t: number; rgb: [number, number, number] }[] = [
  { t: 0, rgb: [76, 201, 240] },
  { t: 0.35, rgb: [255, 214, 10] },
  { t: 0.68, rgb: [255, 107, 53] },
  { t: 1, rgb: [193, 18, 31] },
];

export function heatColor(value: number, min: number, max: number, alpha = 0.46): string {
  const x = clamp((value - min) / Math.max(0.01, max - min), 0, 1);
  let rgb: [number, number, number] = STOPS[0].rgb;
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (x >= a.t && x <= b.t) {
      rgb = mix(a.rgb, b.rgb, (x - a.t) / (b.t - a.t));
      break;
    }
  }
  return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${alpha})`;
}

export function riskLevel(feltC: number): RiskLevel {
  if (feltC < 32) return 'Moderate';
  if (feltC < 38) return 'Strong';
  if (feltC < 46) return 'Very Strong';
  return 'Extreme';
}

export function formatC(n: number) {
  return `${n.toFixed(1)}°C`;
}

export function formatF(c: number) {
  return `${((c * 9) / 5 + 32).toFixed(0)}°F`;
}

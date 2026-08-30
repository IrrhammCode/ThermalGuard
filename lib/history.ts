import { placeLabel } from '@/lib/places';
import { SYMPTOM_OPTIONS, type Symptom } from '@/lib/profile';

export type WalkRecord = {
  id: string;
  at: string;
  fromId: string;
  toId: string;
  walkMin: number | null;
  walkMeters: number | null;
  peakC: number | null;
  meanC: number | null;
  dose: number | null;
  hold: boolean;
  verdict: string | null;
  preferred: string | null;
  maxPlatformMin: number | null;
  source: string | null;
  symptomsBefore: Symptom[] | null;
  symptomsAfter: Symptom[] | null;
};

export function walkTitle(row: WalkRecord): string {
  return `${placeLabel(row.fromId)} → ${placeLabel(row.toId)}`;
}

export function verdictLabel(row: WalkRecord): string {
  if (row.verdict === 'indoor_only') return 'Indoor only';
  if (row.verdict === 'ok_with_hold') return 'Hold';
  if (row.verdict === 'watch') return 'Watch';
  if (row.hold) return 'Hold';
  return 'Street';
}

export function feelLabel(ids: Symptom[] | null | undefined): string {
  if (!ids?.length || (ids.length === 1 && ids[0] === 'none')) return 'None now';
  const real = ids.filter((id) => id !== 'none');
  if (!real.length) return 'None now';
  return real.map((id) => SYMPTOM_OPTIONS.find((o) => o.id === id)?.label ?? id).join(', ');
}

export function formatMeters(m: number | null | undefined): string {
  if (m == null) return '—';
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

export function formatWalkMin(min: number | null | undefined): string {
  if (min == null) return '—';
  if (min < 1) return '<1 min';
  return `${min.toFixed(0)} min`;
}

export function healthResult(row: WalkRecord): { label: string; detail: string; tone: 'heat' | 'hold' | 'ok' } {
  const after = feelLabel(row.symptomsAfter);
  const acute = (row.symptomsAfter ?? []).some((s) =>
    ['cramps', 'dizzy', 'nausea', 'nosweat', 'confusion'].includes(s),
  );
  if (acute) {
    return {
      label: 'Body worse',
      detail: `${after}. Indoor AC. Not a diagnosis.`,
      tone: 'heat',
    };
  }
  if (row.verdict === 'indoor_only') {
    return {
      label: 'Indoor only',
      detail: after === 'None now' ? 'Stay in AC. Not a diagnosis.' : `${after}. Stay in AC.`,
      tone: 'heat',
    };
  }
  if (row.hold || row.verdict === 'ok_with_hold') {
    return {
      label: 'Hold',
      detail: row.preferred
        ? `Go to ${row.preferred}. After: ${after}.`
        : `Dwell indoors. After: ${after}.`,
      tone: 'hold',
    };
  }
  if (row.verdict === 'watch') {
    return { label: 'Watch', detail: `After: ${after}. Not a diagnosis.`, tone: 'hold' };
  }
  return { label: 'Street walk', detail: `After: ${after}.`, tone: 'ok' };
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

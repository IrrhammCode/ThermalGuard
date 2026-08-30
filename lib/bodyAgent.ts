import type { HoldPlan, SwarmLine } from '@/lib/types';
import { ageLabel, triageProfile, type BodyProfile } from '@/lib/profile';
import { placeLabel } from '@/lib/places';

/** Client body agent. Uses the operator file + live hold numbers. Does not invent FortyGuard tiles. */
export function bodySwarmLines(profile: BodyProfile, hold: HoldPlan | null): SwarmLine[] {
  const t = triageProfile(profile);
  const trap = hold?.trap_name ?? 'the exposed platform';
  const indoor = hold?.assignments.filter((a) => a.indoor).map((a) => a.name) ?? [];
  const lines: SwarmLine[] = [
    {
      agent: 'body',
      tool: 'body.profile',
      text:
        `Operator file on this iPhone: ${ageLabel(profile.ageBand)}. ` +
        `Trip ${placeLabel(profile.fromId)} → ${placeLabel(profile.toId)}. ` +
        (t.symptomLabels.length ? `Symptoms: ${t.symptomLabels.join(', ')}. ` : 'No acute symptoms logged. ') +
        'Not a diagnosis. Used to refuse platform dwell.',
    },
  ];

  if (t.acute) {
    lines.push({
      agent: 'body',
      tool: 'symptom.triage',
      text:
        `Heat signs present (${t.symptomLabels.join(', ')}). ` +
        `Do not finish the wait on ${trap}. Indoor AC only. Canopy is last resort.`,
    });
  } else if (t.vulnerable) {
    lines.push({
      agent: 'body',
      tool: 'symptom.triage',
      text:
        `Higher heat sensitivity on file. ${trap} dwell is the dose, not the walk. ` +
        'Prefer indoor hold even if the park looks greener on Felt.',
    });
  }

  if (t.preferIndoor && indoor.length) {
    lines.push({
      agent: 'infra',
      tool: 'body.assign',
      text:
        `Body → infra: keep the split in ${indoor.join(' + ')}. ` +
        (t.skipPark ? 'Refuse park overflow for this operator. ' : '') +
        (hold ? `Platform dose ${hold.platform_dose.toFixed(0)} °C·min if they stay put.` : ''),
    });
  }

  return lines;
}

export function mergeSwarmLines(api: SwarmLine[], extra: SwarmLine[]): SwarmLine[] {
  const idx = api.findIndex((l) => l.tool === 'crowd.dwell');
  if (idx < 0) return [...api, ...extra];
  return [...api.slice(0, idx + 1), ...extra, ...api.slice(idx + 1)];
}

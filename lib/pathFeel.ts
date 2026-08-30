import { formatC } from '@/lib/heat';
import { placeById, placeLabel } from '@/lib/places';
import { triageProfile, tripIsHold, type BodyProfile } from '@/lib/profile';
import type { HoldPlan, RoutePair } from '@/lib/types';

export type PathBeat = { kicker: string; text: string; heat?: boolean };

/** What this From→To walk does to THIS operator. Uses route + hold numbers, not invented tiles. */
export function pathFeel(
  profile: BodyProfile,
  route: RoutePair | null,
  hold: HoldPlan | null,
): PathBeat[] {
  const t = triageProfile(profile);
  const from = placeById(profile.fromId);
  const to = placeById(profile.toId);
  const cool = route?.cool;
  const holdTrip = Boolean(route?.hold || tripIsHold(profile.fromId, profile.toId));
  const beats: PathBeat[] = [
    {
      kicker: 'THIS WALK',
      text: `${placeLabel(profile.fromId)} → ${placeLabel(profile.toId)}. Walk is a rounding error. Dwell is the dose.`,
    },
  ];

  if (cool) {
    beats.push({
      kicker: 'ON THE STREET',
      text: `About ${cool.minutes.toFixed(0)} min, peak felt ${formatC(cool.peak_c)}. 2 m air is still a bath — cooler sidewalks are theater.`,
    });
  }

  if (holdTrip) {
    beats.push({
      kicker: 'PLATFORM',
      text: hold
        ? `This trip touches ${hold.trap_name}. Felt ${formatC(hold.trap_felt_c)}. Do not finish the wait in the sun.`
        : 'This trip touches Van Buren / Central. Do not finish the wait on the exposed platform.',
      heat: true,
    });
  }

  if (t.acute) {
    beats.push({
      kicker: 'BODY NOW',
      text: `${t.symptomLabels.join(', ')} on file. Indoor AC only. Not a diagnosis.`,
      heat: true,
    });
  } else if (t.symptomLabels.length) {
    beats.push({
      kicker: 'BODY NOW',
      text: `${t.symptomLabels.join(', ')}. Prefer indoor hold. Not a diagnosis.`,
    });
  }

  if (to?.kind === 'park' && t.skipPark) {
    beats.push({
      kicker: 'CANOPY',
      text: `${to.name} looks green on satellite. For this file, park overflow is refused.`,
      heat: true,
    });
  }
  if (to?.indoor) {
    beats.push({
      kicker: 'ARRIVAL',
      text: `${to.name} is indoor AC. That is the hold — not a cooler last block.`,
    });
  }
  if (from?.kind === 'platform' || to?.kind === 'platform') {
    const go = hold?.body?.preferred_refuge;
    beats.push({
      kicker: 'DO THIS',
      text: go
        ? `Walk into ${go}. Max platform dwell ${hold?.body?.max_platform_min ?? 0} min.`
        : 'Split into indoor AC. Do not pin to one shade strip.',
      heat: true,
    });
  }
  if (hold?.body?.if_worse) {
    beats.push({ kicker: 'IF WORSE', text: hold.body.if_worse, heat: true });
  }
  return beats;
}

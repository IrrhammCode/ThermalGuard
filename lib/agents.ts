import { formatC, riskLevel } from './heat';
import type { RouteResult } from './routing';
import type { Trip } from './phoenix';

export type AgentId = 'meteo' | 'psych' | 'infra';

export type SwarmLine = {
  agent: AgentId;
  text: string;
};

export const AGENT_META: Record<AgentId, { name: string; role: string; color: string }> = {
  meteo: { name: 'Meteorological Agent', role: '2 m UTCI + solar', color: '#4CC9F0' },
  psych: { name: 'Spatial Psychology Agent', role: 'Crowd friction', color: '#FFB703' },
  infra: { name: 'Infrastructure Actuator', role: 'Wayfinding + hold zones', color: '#2EC4B6' },
};

export function buildSwarm(trip: Trip, cool: RouteResult, fast: RouteResult): SwarmLine[] {
  const risk = riskLevel(fast.peakC);
  const saved = fast.meanC - cool.meanC;
  const extraMin = Math.max(0, cool.minutes - fast.minutes);
  const lines: SwarmLine[] = [
    {
      agent: 'meteo',
      text: `UTCI anomaly on this corridor. Peak felt ${formatC(fast.peakC)} (${risk}). 2 m air is not the satellite LST — this is pedestrian-level load.`,
    },
    {
      agent: 'psych',
      text: trip.holdMinutes
        ? `Platform dwell ${trip.holdMinutes} min in direct radiant heat. High bottleneck risk as people pin to the last strip of shade and spill toward the curb.`
        : `Fastest path mean ${formatC(fast.meanC)}. Pedestrians will self-cluster in shade, shrinking walkable width and raising aggression.`,
    },
    {
      agent: 'infra',
      text: trip.holdMinutes
        ? `Hold crowd in Arizona Center (AC). Suppress the hot-platform countdown; surface arrivals inside the cool zone ${trip.holdMinutes} min before boarding.`
        : `Reweight wayfinding to the 1st Ave / Civic Space canopy. Cool corridor is ${formatC(saved)} lower mean felt, +${extraMin.toFixed(0)} min walk.`,
    },
    {
      agent: 'meteo',
      text: `Cool path peak ${formatC(cool.peakC)} vs fastest ${formatC(fast.peakC)}. Thermal dose drops ${Math.max(0, fast.dose - cool.dose).toFixed(0)} °C·min.`,
    },
    {
      agent: 'psych',
      text: `Do not push a heat warning. Make the cooler path the path of least resistance — quieter arrows, shorter perceived time.`,
    },
    {
      agent: 'infra',
      text: `APPROVED. Payload: update_signage → Route_B_via_canopy; hold_zone=${trip.holdMinutes ? 'Arizona_Center' : 'Civic_Space_Park'}; duration_mins=15.`,
    },
  ];
  return lines;
}

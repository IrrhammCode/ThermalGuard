/* eslint-disable @typescript-eslint/no-unused-vars */

export type AgeBand = 'u18' | '18-39' | '40-64' | '65+';
export type Condition =
  | 'none'
  | 'asthma'
  | 'copd'
  | 'heart'
  | 'hypertension'
  | 'kidney'
  | 'diabetes'
  | 'pregnancy'
  | 'mobility'
  | 'meds';
export type Allergy = 'none' | 'pollen' | 'dust' | 'mold' | 'bees' | 'smoke';
export type Symptom =
  | 'none'
  | 'cramps'
  | 'dizzy'
  | 'nausea'
  | 'headache'
  | 'fatigue'
  | 'nosweat'
  | 'confusion'
  | 'swelling';

/** Permanent health data — stored in SecureStore. */
export type HealthProfile = {
  ageBand: AgeBand;
  conditions: Condition[];
  allergies: Allergy[];
  completedAt: string;
};

/** Full operator payload — health + per-trip data merged at walk time. */
export type BodyProfile = HealthProfile & {
  symptoms: Symptom[];
  fromId: string;
  toId: string;
};

export const AGE_OPTIONS: { id: AgeBand; label: string }[] = [
  { id: 'u18', label: 'Under 18' },
  { id: '18-39', label: '18–39' },
  { id: '40-64', label: '40–64' },
  { id: '65+', label: '65+' },
];

export const CONDITION_OPTIONS: { id: Condition; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'asthma', label: 'Asthma' },
  { id: 'copd', label: 'COPD / lung' },
  { id: 'heart', label: 'Heart' },
  { id: 'hypertension', label: 'High blood pressure' },
  { id: 'kidney', label: 'Kidney' },
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'pregnancy', label: 'Pregnancy' },
  { id: 'mobility', label: 'Limited mobility' },
  { id: 'meds', label: 'Heat-sensitive meds' },
];

export const ALLERGY_OPTIONS: { id: Allergy; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'pollen', label: 'Pollen / outdoor' },
  { id: 'dust', label: 'Dust / AC vents' },
  { id: 'mold', label: 'Mold' },
  { id: 'bees', label: 'Bees / stings' },
  { id: 'smoke', label: 'Smoke / haze' },
];

export const SYMPTOM_OPTIONS: { id: Symptom; label: string; hint: string }[] = [
  { id: 'none', label: 'None now', hint: 'No acute heat signs' },
  { id: 'cramps', label: 'Heat cramps', hint: 'Muscles locking / kepicut' },
  { id: 'dizzy', label: 'Dizzy', hint: 'Lightheaded standing' },
  { id: 'nausea', label: 'Nausea', hint: 'Stomach heat-sick' },
  { id: 'headache', label: 'Headache', hint: 'Pressure, not a cold' },
  { id: 'fatigue', label: 'Heavy fatigue', hint: 'Can’t finish the wait' },
  { id: 'nosweat', label: 'Stopped sweating', hint: 'Skin hot, dry' },
  { id: 'confusion', label: 'Confusion', hint: 'Can’t think clearly' },
  { id: 'swelling', label: 'Swelling', hint: 'Hands, feet, ankles' },
];

export const DEMO_HEALTH: Omit<HealthProfile, 'completedAt'> = {
  ageBand: '18-39',
  conditions: ['none'],
  allergies: ['none'],
};

/** Convenience: full demo profile for backward compat. */
export const DEMO_PROFILE: Omit<BodyProfile, 'completedAt'> = {
  ...DEMO_HEALTH,
  symptoms: ['none'],
  fromId: 'vanburen-central',
  toId: 'vanburen-3rdst',
};

export type BodyTriage = {
  acute: boolean;
  vulnerable: boolean;
  preferIndoor: boolean;
  skipPark: boolean;
  symptomLabels: string[];
};

export function toggleExclusive<T extends string>(current: T[], id: T, noneId: T): T[] {
  if (id === noneId) return [noneId];
  const withoutNone = current.filter((x) => x !== noneId);
  const next = withoutNone.includes(id) ? withoutNone.filter((x) => x !== id) : [...withoutNone, id];
  return next.length ? next : [noneId];
}

export function triageProfile(profile: HealthProfile & { symptoms?: Symptom[] }): BodyTriage {
  const symptoms = (profile.symptoms ?? []).filter((s) => s !== 'none');
  const conditions = profile.conditions.filter((c) => c !== 'none');
  const allergies = profile.allergies.filter((a) => a !== 'none');
  const acute = symptoms.some(
    (s) => s === 'cramps' || s === 'dizzy' || s === 'nausea' || s === 'confusion' || s === 'nosweat',
  );
  const vulnerable =
    profile.ageBand === 'u18' ||
    profile.ageBand === '65+' ||
    conditions.some((c) =>
      ['heart', 'pregnancy', 'asthma', 'diabetes', 'copd', 'kidney', 'hypertension', 'mobility', 'meds'].includes(c),
    );
  const skipPark =
    acute ||
    vulnerable ||
    allergies.some((a) => a === 'pollen' || a === 'mold' || a === 'bees' || a === 'smoke');
  return {
    acute,
    vulnerable,
    preferIndoor: skipPark || allergies.includes('dust'),
    skipPark,
    symptomLabels: symptoms.map((s) => SYMPTOM_OPTIONS.find((o) => o.id === s)?.label ?? s),
  };
}

export function ageLabel(band: AgeBand): string {
  return AGE_OPTIONS.find((o) => o.id === band)?.label ?? band;
}

export function tripIsHold(fromId: string, toId: string): boolean {
  return fromId === 'vanburen-central' || toId === 'vanburen-central';
}

/** Build the operator payload from stored health + per-trip data. */
export function operatorPayload(
  health: HealthProfile,
  trip: { symptoms: Symptom[]; fromId: string; toId: string },
) {
  return {
    ageBand: health.ageBand,
    conditions: health.conditions,
    allergies: health.allergies,
    symptoms: trip.symptoms,
    fromId: trip.fromId,
    toId: trip.toId,
  };
}

export function profileSummary(health: HealthProfile): string {
  const conditions = health.conditions.filter((c) => c !== 'none');
  const condText = conditions.length
    ? conditions.map((c) => CONDITION_OPTIONS.find((o) => o.id === c)?.label ?? c).join(', ')
    : 'no conditions';
  return `${ageLabel(health.ageBand)} · ${condText}`;
}

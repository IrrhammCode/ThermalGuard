import { ChipSelect } from '@/components/ui/ChipSelect';
import { colors } from '@/constants/theme';
import {
  AGE_OPTIONS,
  ALLERGY_OPTIONS,
  CONDITION_OPTIONS,
  toggleExclusive,
  type AgeBand,
  type Allergy,
  type Condition,
  type HealthProfile,
} from '@/lib/profile';
import { StyleSheet, Text, View } from 'react-native';

export type HealthDraft = Omit<HealthProfile, 'completedAt'>;

export function BodyBasics({ value, onChange }: { value: HealthDraft; onChange: (next: HealthDraft) => void }) {
  return (
    <View style={styles.block}>
      <Text style={styles.section}>Age band</Text>
      <ChipSelect
        options={AGE_OPTIONS}
        selected={[value.ageBand]}
        onToggle={(id) => onChange({ ...value, ageBand: id as AgeBand })}
      />
      <Text style={[styles.section, { marginTop: 22 }]}>Conditions that change heat risk</Text>
      <ChipSelect
        options={CONDITION_OPTIONS}
        selected={value.conditions}
        onToggle={(id) =>
          onChange({ ...value, conditions: toggleExclusive(value.conditions, id as Condition, 'none') })
        }
      />
    </View>
  );
}

export function BodyAllergies({ value, onChange }: { value: HealthDraft; onChange: (next: HealthDraft) => void }) {
  return (
    <View style={styles.block}>
      <Text style={styles.section}>Allergies</Text>
      <Text style={styles.note}>
        Pollen, dust, mold — these change whether the system routes you through parks or indoor AC only.
      </Text>
      <ChipSelect
        options={ALLERGY_OPTIONS}
        selected={value.allergies}
        onToggle={(id) =>
          onChange({ ...value, allergies: toggleExclusive(value.allergies, id as Allergy, 'none') })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 12 },
  section: { color: colors.text, fontSize: 16, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});

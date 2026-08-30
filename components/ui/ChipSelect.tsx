import { colors } from '@/constants/theme';
import { PressScale } from '@/components/ui/PressScale';
import { StyleSheet, Text, View } from 'react-native';

type Opt = { id: string; label: string; hint?: string };

export function ChipSelect({
  options,
  selected,
  onToggle,
}: {
  options: Opt[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <PressScale key={o.id} onPress={() => onToggle(o.id)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
            {o.hint ? <Text style={[styles.hint, on && styles.hintOn]}>{o.hint}</Text> : null}
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  chipOn: { borderColor: colors.cool2, backgroundColor: 'rgba(46,196,182,0.14)' },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  labelOn: { color: colors.cool2 },
  hint: { color: colors.muted, fontSize: 11, marginTop: 3 },
  hintOn: { color: colors.muted },
});

import { BodyBasics, BodyAllergies, type HealthDraft } from '@/components/body/BodyForm';
import { FadeInView } from '@/components/FadeIn';
import { AuthButton } from '@/components/auth/AuthButton';
import { FieldOverlay } from '@/components/ui/FieldOverlay';
import { colors } from '@/constants/theme';
import { useProfile } from '@/context/Profile';
import { DEMO_HEALTH } from '@/lib/profile';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TITLES = [
  { kicker: 'HEALTH FILE  1 / 2', title: 'Who is walking', deck: 'Age and pre-existing conditions change how long you can dwell in ~40°C air. These stay on your profile.' },
  { kicker: 'HEALTH FILE  2 / 2', title: 'Allergies', deck: 'Pollen, dust, or mold allergies change whether we route through parks or indoor AC. Symptoms are asked before each walk.' },
];

export default function OnboardScreen() {
  const insets = useSafeAreaInsets();
  const { save, saveDemo } = useProfile();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<HealthDraft>({ ...DEMO_HEALTH });

  function next() {
    void Haptics.selectionAsync();
    if (step < 1) {
      setStep(step + 1);
      return;
    }
    save({ ...draft, completedAt: new Date().toISOString() });
  }

  const copy = TITLES[step];

  return (
    <View style={styles.root}>
      <FieldOverlay mode="quiet" opacity={0.1} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled">
        <FadeInView key={step}>
          <Text style={styles.kicker}>{copy.kicker}</Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.deck}>{copy.deck}</Text>
        </FadeInView>

        <View style={{ marginTop: 24 }}>
          {step === 0 ? <BodyBasics value={draft} onChange={setDraft} /> : null}
          {step === 1 ? <BodyAllergies value={draft} onChange={setDraft} /> : null}
        </View>

        <View style={{ flex: 1 }} />

        <AuthButton
          label={step < 1 ? 'Continue' : 'Start walking'}
          icon={step < 1 ? 'arrow.right' : 'figure.walk'}
          onPress={next}
          style={{ marginTop: 28 }}
        />
        {step > 0 ? (
          <Pressable onPress={() => setStep(step - 1)} style={styles.back}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              saveDemo();
            }}
            style={styles.back}>
            <Text style={styles.backText}>Judge demo body — skip form</Text>
          </Pressable>
        )}
        <Text style={styles.legal}>Not medical advice. FortyGuard numbers stay on the Mac.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  kicker: { color: colors.cool, fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '600', marginTop: 8, letterSpacing: -0.4 },
  deck: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  back: { alignItems: 'center', paddingVertical: 14 },
  backText: { color: colors.muted, fontSize: 13 },
  legal: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});

import { BodyBasics, BodyAllergies, type HealthDraft } from '@/components/body/BodyForm';
import { AuthButton } from '@/components/auth/AuthButton';
import { colors } from '@/constants/theme';
import { useProfile } from '@/context/Profile';
import { DEMO_HEALTH } from '@/lib/profile';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BodyEditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, save } = useProfile();
  const [draft, setDraft] = useState<HealthDraft>(() => {
    if (!profile) return { ...DEMO_HEALTH };
    const { completedAt: _, ...rest } = profile;
    return rest;
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Health profile',
          headerTintColor: colors.cool,
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}>
        <Text style={styles.deck}>
          Pre-existing conditions and allergies. Agents read this before each walk. Symptoms are asked per trip.
        </Text>
        <BodyBasics value={draft} onChange={setDraft} />
        <Text style={{ height: 20 }} />
        <BodyAllergies value={draft} onChange={setDraft} />
        <AuthButton
          label="Save health profile"
          icon="checkmark.seal.fill"
          style={{ marginTop: 28 }}
          onPress={() => {
            save({ ...draft, completedAt: new Date().toISOString() });
            router.back();
          }}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  deck: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 24 },
});

import { FadeInView } from '@/components/FadeIn';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthField } from '@/components/auth/AuthField';
import { FieldOverlay } from '@/components/ui/FieldOverlay';
import { PhotoBand } from '@/components/ui/PhotoBand';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/Auth';
import { art } from '@/lib/art';
import { isEmail } from '@/lib/authStore';
import * as Haptics from 'expo-haptics';
import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signInEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = email.includes('@') && password.length > 0;

  async function onSubmit() {
    setError(null);
    if (!isEmail(email)) {
      setError('Enter a valid email.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setBusy(true);
    try {
      await signInEmail(email, password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t sign in.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FieldOverlay mode="quiet" opacity={0.1} />
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerTransparent: true,
          headerTintColor: colors.cool,
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 56,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled">
        <FadeInView>
          <Text style={styles.eyebrow}>OPERATOR ACCESS</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.deck}>Email and password, stored on this iPhone.</Text>
          <PhotoBand source={art.rail} height={128} style={{ marginTop: 20 }} />
        </FadeInView>

        <FadeInView delay={80}>
          <AuthField
            label="Email"
            icon="envelope.fill"
            value={email}
            onChangeText={setEmail}
            placeholder="name@agency.gov"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoComplete="email"
            returnKeyType="next"
            style={{ marginTop: 28 }}
          />
          <AuthField
            label="Password"
            icon="lock.fill"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            password
            textContentType="password"
            autoComplete="password"
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
            style={{ marginTop: 16 }}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AuthButton
            label="Sign in"
            icon="arrow.right"
            loading={busy}
            disabled={!canSubmit}
            onPress={() => void onSubmit()}
            style={{ marginTop: 24 }}
          />

          <View style={styles.footer}>
            <Text style={styles.muted}>No account? </Text>
            <Link href="./sign-up" style={styles.link}>
              Create one
            </Link>
          </View>
          <Text style={styles.hint}>Judge email: judge@thermalguard.demo  /  hold-36</Text>
        </FadeInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 28, fontWeight: '600', marginTop: 8 },
  deck: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  error: { color: colors.heat, fontSize: 13, marginTop: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  muted: { color: colors.muted, fontSize: 15 },
  link: { color: colors.cool, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 20 },
});

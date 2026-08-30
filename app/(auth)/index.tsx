import { FadeInView } from '@/components/FadeIn';
import { Icon } from '@/components/Icon';
import { AuthButton } from '@/components/auth/AuthButton';
import { Art } from '@/components/ui/Art';
import { FieldOverlay } from '@/components/ui/FieldOverlay';
import { Glass } from '@/components/ui/Glass';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/Auth';
import { art } from '@/lib/art';
import { GOOGLE_CONFIGURED, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@/lib/config';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

function emailFromJwt(token: string | undefined) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const withPad = padded + '='.repeat((4 - (padded.length % 4)) % 4);
    const json = JSON.parse(globalThis.atob(withPad)) as { email?: string; name?: string; sub?: string };
    return json;
  } catch {
    return null;
  }
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { signInOAuth, signInJudge } = useAuth();
  const [busy, setBusy] = useState<'apple' | 'google' | 'judge' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleOk, setAppleOk] = useState(Platform.OS === 'ios');

  const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID || GOOGLE_IOS_CLIENT_ID || 'unconfigured.apps.googleusercontent.com',
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    selectAccount: true,
  });

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setAppleOk(false);
      return;
    }
    AppleAuthentication.isAvailableAsync().then(setAppleOk).catch(() => setAppleOk(false));
  }, []);

  useEffect(() => {
    if (googleResponse?.type !== 'success') {
      if (googleResponse?.type === 'error') {
        setBusy(null);
        setError('Google sign-in didn’t finish. Try again.');
      }
      return;
    }
    const idToken = googleResponse.params.id_token;
    const claims = emailFromJwt(idToken);
    void signInOAuth({
      provider: 'google',
      userId: claims?.sub || `g_${Date.now()}`,
      email: claims?.email,
      name: claims?.name,
    }).finally(() => setBusy(null));
  }, [googleResponse, signInOAuth]);

  async function onApple() {
    setError(null);
    setBusy('apple');
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
      await signInOAuth({
        provider: 'apple',
        userId: cred.user,
        email: cred.email,
        name: name || null,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-in didn’t finish. Try email instead.');
      }
    } finally {
      setBusy(null);
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy('google');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!GOOGLE_CONFIGURED) {
      Alert.alert('Continue with Google', 'This Expo Go build has no Google client ID yet. Enter with a demo Gmail?', [
        { text: 'Cancel', style: 'cancel', onPress: () => setBusy(null) },
        {
          text: 'Continue',
          onPress: () => {
            void signInOAuth({
              provider: 'google',
              userId: 'demo-google',
              email: 'operator@gmail.com',
              name: 'Google',
            }).finally(() => setBusy(null));
          },
        },
      ]);
      return;
    }
    const result = await promptGoogle();
    if (result.type !== 'success') setBusy(null);
  }

  async function onJudge() {
    setError(null);
    setBusy('judge');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await signInJudge();
    } catch {
      setError('Couldn’t start the demo session.');
      setBusy(null);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Art source={art.welcome} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(7,9,12,0.5)', 'rgba(7,9,12,0.12)', 'rgba(7,9,12,0.9)', colors.bg]}
        locations={[0, 0.2, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <FieldOverlay mode="tcm" opacity={0.16} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 24,
          justifyContent: 'space-between',
        }}
        keyboardShouldPersistTaps="handled">
        <View>
          <FadeInView from="fade">
            <Text style={styles.eyebrow}>PHOENIX  ·  2 M AIR + CANOPY</Text>
            <View style={styles.brandRow}>
              <Icon name="sun.max.fill" size={22} color={colors.heat} pulse />
              <Text style={styles.wordmark}>ATA</Text>
              <Text style={styles.squared}>²</Text>
            </View>
            <Text style={styles.product}>Thermal Hold</Text>
            <View style={styles.chips}>
              <View style={[styles.chip, { borderColor: colors.heat, backgroundColor: 'rgba(7,9,12,0.55)' }]}>
                <Icon name="xmark" size={10} color={colors.heat} />
                <Text style={[styles.chipText, { color: colors.heat }]}>TCM REFUSED</Text>
              </View>
              <View style={[styles.chip, { borderColor: colors.cool2, backgroundColor: 'rgba(7,9,12,0.55)' }]}>
                <Icon name="checkmark.seal.fill" size={10} color={colors.cool2} />
                <Text style={[styles.chipText, { color: colors.cool2 }]}>HOLD APPROVED</Text>
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={90}>
            <Text style={styles.title}>Don’t wait in the sun.</Text>
            <Text style={styles.deck}>
              Sign in to see the Phoenix heat layers and the indoor hold split. One tap is enough.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </FadeInView>
        </View>

        <FadeInView delay={160} from="up">
          <Glass style={styles.panel}>
            {Platform.OS === 'ios' && (
              <>
                {appleOk ? (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={12}
                    style={styles.appleNative}
                    onPress={() => {
                      if (!busy) void onApple();
                    }}
                  />
                ) : (
                  <AuthButton
                    label="Continue with Apple"
                    variant="apple"
                    icon="apple.logo"
                    loading={busy === 'apple'}
                    onPress={onApple}
                  />
                )}
              </>
            )}

            <AuthButton
              label="Continue with Google"
              variant="google"
              icon="g.circle.fill"
              loading={busy === 'google'}
              onPress={onGoogle}
            />

            <Link href="./sign-in" asChild>
              <Pressable style={styles.emailBtn} onPress={() => Haptics.selectionAsync()}>
                <Icon name="envelope.fill" size={16} color={colors.text} />
                <Text style={styles.emailText}>Use email</Text>
              </Pressable>
            </Link>

            <Pressable
              onPress={() => {
                Alert.alert('Skip for judges', 'Enter the app without an account?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Enter demo', onPress: () => void onJudge() },
                ]);
              }}
              disabled={!!busy}
              style={styles.skipRow}
              accessibilityRole="button"
              accessibilityLabel="Hackathon judge skip gate">
              <Icon name="rectangle.portrait.and.arrow.right" size={14} color={colors.muted} />
              <Text style={styles.skip}>Skip — hackathon demo</Text>
            </Pressable>

            <Text style={styles.legal}>Local demo. FortyGuard keys stay on the Mac.</Text>
          </Glass>
        </FadeInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  wordmark: { color: colors.text, fontSize: 28, fontWeight: '600', letterSpacing: -0.4 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 16 },
  chip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  squared: { color: colors.cool2, fontSize: 18, fontWeight: '600', marginTop: 2 },
  product: { color: colors.muted, fontSize: 15, marginTop: 6 },
  title: { color: colors.text, fontSize: 28, fontWeight: '600', letterSpacing: -0.4, marginTop: 36, lineHeight: 34 },
  deck: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 12 },
  error: { color: colors.heat, fontSize: 13, marginTop: 12 },
  panel: { gap: 12, padding: 14 },
  appleNative: { width: '100%', height: 52 },
  emailBtn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(7,9,12,0.35)',
  },
  emailText: { color: colors.text, fontSize: 17, fontWeight: '600' },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  skip: { color: colors.muted, fontSize: 13 },
  legal: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 4 },
});

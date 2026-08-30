import { AuthProvider, useAuth } from '@/context/Auth';
import { ProfileProvider, useProfile } from '@/context/Profile';
import { colors } from '@/constants/theme';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(auth)',
};

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AuthProvider>
        <ProfileProvider>
          <SplashController />
          <StatusBar style="light" />
          <WebFrame>
            <RootNavigator />
          </WebFrame>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function SplashController() {
  const { isLoading } = useAuth();
  const { ready } = useProfile();
  if (!isLoading && ready) {
    void SplashScreen.hideAsync();
  }
  return null;
}

function RootNavigator() {
  const { session } = useAuth();
  const { profile, ready } = useProfile();
  if (!ready) return null;
  const signedIn = !!session;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Protected guard={signedIn && !profile}>
        <Stack.Screen name="(onboard)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !!profile}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="body-edit" options={{ headerShown: true, animation: 'slide_from_right' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * WebFrame — On wide screens (laptops), constrains the app to a phone-sized
 * frame centered on screen with a branded background. On mobile/narrow, it
 * renders children fullscreen as normal. Only activates on Web platform.
 */
function WebFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();

  // Only apply frame on web and wide screens
  if (Platform.OS !== 'web' || width < 768) {
    return <>{children}</>;
  }

  return (
    <View style={wf.outer}>
      {/* Left branding panel */}
      <View style={wf.brand}>
        <Text style={wf.brandTitle}>ThermalGuard</Text>
        <Text style={wf.brandSub}>Adaptive Thermal Advisor</Text>
        <View style={wf.divider} />
        <Text style={wf.brandDesc}>
          AI-powered heat-safe routing for Phoenix, AZ.{'\n'}
          Real-time thermal data • Cool corridor navigation{'\n'}
          Personalized heat risk assessment
        </Text>
        <View style={wf.badgeRow}>
          <View style={wf.badge}><Text style={wf.badgeText}>FortyGuard API</Text></View>
          <View style={wf.badge}><Text style={wf.badgeText}>Llama 3 AI</Text></View>
          <View style={wf.badge}><Text style={wf.badgeText}>React Native</Text></View>
        </View>
      </View>

      {/* Phone frame */}
      <View style={wf.phoneOuter}>
        <View style={wf.notch} />
        <View style={wf.phoneInner}>
          {children}
        </View>
        <View style={wf.homeBar} />
      </View>
    </View>
  );
}

const wf = StyleSheet.create({
  outer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#05070a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 60,
  },
  brand: {
    maxWidth: 420,
    paddingRight: 20,
  },
  brandTitle: {
    color: colors.cool,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandSub: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.9,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: colors.cool,
    borderRadius: 2,
    marginVertical: 20,
    opacity: 0.6,
  },
  brandDesc: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: 'rgba(76,201,240,0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(76,201,240,0.2)',
  },
  badgeText: {
    color: colors.cool,
    fontSize: 12,
    fontWeight: '600',
  },
  phoneOuter: {
    width: 393,
    height: 852,
    backgroundColor: '#1a1a1a',
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#333',
    overflow: 'hidden',
    alignItems: 'center',
    // Subtle shadow glow
    shadowColor: colors.cool,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
  },
  notch: {
    width: 130,
    height: 32,
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 100,
  },
  phoneInner: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    marginTop: -2,
  },
  homeBar: {
    width: 140,
    height: 5,
    backgroundColor: '#666',
    borderRadius: 3,
    marginBottom: 10,
    marginTop: 6,
  },
});


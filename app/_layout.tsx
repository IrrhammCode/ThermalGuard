import { AuthProvider, useAuth } from '@/context/Auth';
import { ProfileProvider, useProfile } from '@/context/Profile';
import { colors } from '@/constants/theme';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
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
          <RootNavigator />
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

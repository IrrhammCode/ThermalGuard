import { Icon } from '@/components/Icon';
import { AppDataProvider } from '@/context/AppData';
import { HistoryProvider } from '@/context/History';
import { colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

function TabIcon({ name, color, focused }: { name: SFSymbol; color: string; focused: boolean }) {
  return <Icon name={name} size={24} color={color} bounce={focused} />;
}

export default function TabLayout() {
  return (
    <HistoryProvider>
      <AppDataProvider>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.cool,
            tabBarInactiveTintColor: colors.muted,
            tabBarBackground: () => (
              <BlurView intensity={54} tint="systemChromeMaterialDark" style={StyleSheet.absoluteFill} />
            ),
            tabBarStyle: {
              backgroundColor: 'transparent',
              borderTopColor: 'rgba(42,51,64,0.55)',
              borderTopWidth: StyleSheet.hairlineWidth,
              elevation: 0,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          }}>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Walk',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="figure.walk" color={color} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: 'History',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="clock.arrow.circlepath" color={color} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="gearshape.fill" color={color} focused={focused} />
              ),
            }}
          />
        </Tabs>
      </AppDataProvider>
    </HistoryProvider>
  );
}

import { colors } from '@/constants/theme';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SFSymbol } from 'sf-symbols-typescript';

const FALLBACK: Partial<Record<string, string>> = {
  'sun.max.fill': '☀',
  'thermometer.sun.fill': '°',
  'snowflake': '❄',
  'tree.fill': '♣',
  'building.2.fill': '⌂',
  'person.2.fill': '☺',
  'heart.fill': '♥',
  'stethoscope': '+',
  'bell.fill': '⚑',
  'location.fill': '⌖',
  'envelope.fill': '@',
  'lock.fill': '•',
  'apple.logo': '',
  'g.circle.fill': 'G',
  'plus': '+',
  'minus': '−',
  'arrow.clockwise': '↻',
  'checkmark.seal.fill': '✓',
  'xmark': '×',
  'cloud.sun.fill': '☁',
  'brain.head.profile': '◉',
  'cpu.fill': '▣',
  'map.fill': '▦',
  'square.3.layers.3d': '☰',
  'figure.walk': '→',
  'rectangle.portrait.and.arrow.right': '→',
  'leaf.fill': '♣',
  'door.left.hand.open': '⌂',
  'rectangle.split.2x1': '↔',
  'arrow.right': '→',
  'person.crop.circle': '☺',
  'eye.fill': '◉',
  'eye.slash.fill': '◌',
  'chevron.down': '▾',
  'chevron.right': '▸',
  'exclamationmark.triangle.fill': '!',
  'clock.fill': '◷',
  'clock.arrow.circlepath': '↻',
  'gearshape.fill': '⚙',
  'trash.fill': '⌫',
};

type Props = {
  name: SFSymbol;
  size?: number;
  color?: string;
  pulse?: boolean;
  bounce?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 20, color = colors.text, pulse, bounce, style }: Props) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (pulse) {
      opacity.value = withRepeat(withTiming(0.38, { duration: 640 }), -1, true);
    } else {
      opacity.value = withTiming(1, { duration: 180 });
    }
  }, [pulse, opacity]);

  useEffect(() => {
    if (bounce) {
      scale.value = withSequence(withTiming(1.16, { duration: 140 }), withSpring(1, { damping: 12 }));
    } else {
      scale.value = 1;
    }
  }, [bounce, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animStyle, style]}>
      <SymbolView
        name={name}
        size={size}
        tintColor={color}
        weight="semibold"
        fallback={
          <View style={[styles.fallback, { width: size, height: size }]}>
            <Text style={{ color, fontSize: size * 0.72, fontWeight: '700' }}>{FALLBACK[name] ?? '•'}</Text>
          </View>
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});

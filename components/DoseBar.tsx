import { colors } from '@/constants/theme';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export function DoseBar({ value, max, color }: { value: number; max: number; color: string }) {
  const track = useSharedValue(1);
  const fill = useSharedValue(0);

  useEffect(() => {
    const next = max > 0 ? Math.min(1, value / max) : 0;
    fill.value = withTiming(next, { duration: 700 });
  }, [value, max, fill]);

  const bar = useAnimatedStyle(() => ({
    width: track.value * fill.value,
    backgroundColor: color,
  }));

  return (
    <View
      style={styles.track}
      onLayout={(e) => {
        track.value = e.nativeEvent.layout.width;
      }}>
      <Animated.View style={[styles.fill, bar]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 99,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: 8,
  },
  fill: { height: 6, borderRadius: 99 },
});

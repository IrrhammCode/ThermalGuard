import { Art } from '@/components/ui/Art';
import { colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { type ImageProps } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  source: ImageProps['source'];
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Contained photo. Gradient keeps type above it readable. */
export function PhotoBand({ source, height = 148, style }: Props) {
  return (
    <View style={[styles.band, { height }, style]}>
      <Art source={source} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(7,9,12,0.15)', 'rgba(7,9,12,0.55)', colors.bg]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});

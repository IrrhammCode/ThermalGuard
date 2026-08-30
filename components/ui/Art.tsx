import { Image, type ImageProps } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  source: ImageProps['source'];
  style?: StyleProp<ViewStyle>;
  intensity?: number;
};

export function Art({ source, style, intensity = 1 }: Props) {
  return (
    <View style={[styles.clip, style, { opacity: intensity }]} pointerEvents="none">
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={320} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});

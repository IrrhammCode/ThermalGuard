import { colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
};

export function Glass({ children, style, intensity = 46 }: Props) {
  return (
    <BlurView intensity={intensity} tint="systemThickMaterialDark" style={[styles.box, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(18,23,30,0.42)',
    flexDirection: 'column',
  },
});

import { type ReactNode } from 'react';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  from?: 'down' | 'up' | 'fade';
};

export function FadeInView({ children, delay = 0, style, from = 'down' }: Props) {
  const entering =
    from === 'up'
      ? FadeInUp.delay(delay).duration(420)
      : from === 'fade'
        ? FadeIn.delay(delay).duration(380)
        : FadeInDown.delay(delay).duration(420);
  return (
    <Animated.View entering={entering} exiting={FadeOut.duration(180)} style={style}>
      {children}
    </Animated.View>
  );
}

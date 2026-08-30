import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { colors } from '@/constants/theme';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

type Variant = 'primary' | 'outline' | 'ghost' | 'apple' | 'google';

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: Variant;
  icon?: SFSymbol;
  style?: StyleProp<ViewStyle>;
};

export function AuthButton({
  label,
  loading,
  variant = 'primary',
  icon,
  disabled,
  style,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  const onDark = variant === 'primary';
  const lightFill = variant === 'apple' || variant === 'google';
  const iconColor = onDark || lightFill ? colors.bg : colors.cool2;
  return (
    <PressScale
      accessibilityRole="button"
      disabled={isDisabled}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        variant === 'apple' && styles.apple,
        variant === 'google' && styles.google,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={onDark || lightFill ? colors.bg : colors.text} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={18} color={iconColor} /> : null}
          <Text
            style={[
              styles.label,
              (variant === 'outline' || variant === 'ghost') && { color: colors.cool2 },
              lightFill && { color: colors.bg },
            ]}>
            {label}
          </Text>
        </View>
      )}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: { backgroundColor: colors.cool2 },
  outline: { backgroundColor: 'transparent', borderColor: colors.cool2 },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent', height: 44 },
  apple: { backgroundColor: '#F4F1EA', borderColor: '#F4F1EA' },
  google: { backgroundColor: '#F4F1EA', borderColor: '#F4F1EA' },
  disabled: { opacity: 0.35 },
  label: { color: colors.bg, fontSize: 17, fontWeight: '600' },
});

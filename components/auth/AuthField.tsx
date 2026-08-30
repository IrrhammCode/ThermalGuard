import { Icon } from '@/components/Icon';
import { colors } from '@/constants/theme';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  helper?: string;
  password?: boolean;
  icon?: SFSymbol;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: ReturnKeyTypeOptions;
  style?: StyleProp<ViewStyle>;
};

export function AuthField({
  label,
  error,
  helper,
  password,
  icon,
  style,
  ...rest
}: Props) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocus,
          error ? styles.fieldError : null,
        ]}>
        {icon ? <Icon name={icon} size={16} color={focused ? colors.cool : colors.muted} /> : null}
        <TextInput
          {...rest}
          placeholderTextColor={colors.muted}
          secureTextEntry={password ? hidden : false}
          style={styles.input}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
        />
        {password ? (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={12} style={styles.eye}>
            <Icon name={hidden ? 'eye.slash.fill' : 'eye.fill'} size={16} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  field: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldFocus: { borderColor: colors.cool, backgroundColor: colors.surface2 },
  fieldError: { borderColor: colors.heat },
  input: { flex: 1, color: colors.text, fontSize: 17, padding: 0 },
  eye: { paddingLeft: 4, height: 44, justifyContent: 'center' },
  error: { color: colors.heat, fontSize: 13, marginTop: 6 },
  helper: { color: colors.muted, fontSize: 13, marginTop: 6 },
});

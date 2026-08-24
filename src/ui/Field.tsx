import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import theme, { color, radius, sizing, space, text } from '../design/theme';

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export function Field({ label, hint, error, required, style, ...rest }: FieldProps) {
  return (
    <View style={{ gap: space[2] }}>
      <View style={styles.labelRow}>
        <Text style={text.bodyStrong}>{label}</Text>
        {required ? <Text style={[text.caption, { color: color.brand[600] }]}>필수</Text> : null}
      </View>
      <TextInput
        style={[styles.input, !!error && styles.inputError, style]}
        placeholderTextColor={color.ink[300]}
        accessibilityLabel={label}
        {...rest}
      />
      {error ? (
        <Text style={[text.caption, { color: color.danger[500] }]}>{error}</Text>
      ) : hint ? (
        <Text style={text.caption}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** 선택형 카드. 홍보 목적 4종, 얼굴 노출 모드 등 단일 선택에 씁니다. */
export function OptionRow({
  title,
  description,
  selected,
  onPress,
  trailing,
}: {
  title: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <View
      style={[styles.option, selected && styles.optionOn]}
      accessible
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected }}
      onTouchEnd={onPress}
    >
      <View style={styles.optionBody}>
        <Text style={text.bodyStrong}>{title}</Text>
        {description ? <Text style={text.bodySmall}>{description}</Text> : null}
      </View>
      {trailing ?? (
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  input: {
    minHeight: sizing.inputHeight,
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
    paddingHorizontal: space[4],
    ...text.body,
  },
  inputError: { borderColor: color.danger[500], borderWidth: theme.border.thick },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    padding: space[4],
    minHeight: sizing.touchTargetMin,
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
  },
  optionOn: { borderColor: color.brand[600], borderWidth: theme.border.thick, backgroundColor: color.brand[50] },
  optionBody: { flex: 1, gap: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: theme.border.thick,
    borderColor: color.ink[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: color.brand[600] },
  radioDot: { width: 12, height: 12, borderRadius: radius.pill, backgroundColor: color.brand[600] },
});

/**
 * Field / OptionRow — 시안 `AuthField`·`SignupField`·`ShootTopic` 타일 대조 이식.
 *
 * 시안 사양
 *   라벨   13 · semibold · slate-muted · mb-1.5
 *   입력   h52 · rounded-xl(12) · border-hairline · **bg-surface** · px-4 · 15·medium
 *          placeholder slate-muted / 오류일 때 border-heart (굵기는 그대로 1px)
 *   타일   rounded-2xl(16) · 1px border · 비활성 bg-surface / 활성 border-brand + bg-brand-tint
 *
 * ⚠️ 입력 배경이 흰색이 아니라 surface 입니다. 흰 화면 위 흰 입력칸은 테두리 1px 만으로
 *    구분되는데, 시안은 배경을 한 톤 낮춰 "여기 쓰는 칸" 을 먼저 보이게 합니다.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Check } from 'lucide-react-native';
import theme, { color, radius, sizing, space, text } from '../design/theme';
import { pressTap } from './press';

interface FieldProps extends TextInputProps {
  label: string;
  /**
   * 라벨과 입력칸 사이. 기본 8 입니다.
   * 시안 프로필 수정만 mb-1.5(6) 이라 그 화면에서만 좁힙니다.
   */
  labelGap?: number;
  hint?: string;
  error?: string;
  required?: boolean;
}

export function Field({ label, hint, error, required, labelGap, style, ...rest }: FieldProps) {
  return (
    <View style={{ gap: labelGap ?? space[2] }}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required ? <Text style={[text.micro, { color: color.brand[600] }]}>필수</Text> : null}
      </View>
      <TextInput
        style={[styles.input, !!error && styles.inputError, style]}
        placeholderTextColor={color.ink[500]}
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
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionOn, pressTap(pressed, 'card')]}
    >
      <View style={styles.optionBody}>
        <Text style={text.bodyStrong}>{title}</Text>
        {description ? <Text style={text.bodySmall}>{description}</Text> : null}
      </View>
      {trailing ?? (
        // 시안 PermCheckbox: 선택되면 브랜드색으로 채우고 흰 체크를 넣습니다.
        <View style={[styles.mark, selected ? styles.markOn : styles.markOff]}>
          {selected ? <Check size={14} strokeWidth={3} color={color.paper} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  // 시안: 13 · semibold · slate-muted
  label: {
    ...text.caption,
    fontFamily: theme.text.chipLabel.fontFamily,
    fontWeight: theme.text.chipLabel.fontWeight,
    color: color.ink[500],
  },
  input: {
    height: sizing.inputHeight,
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
    paddingHorizontal: space[4],
    ...text.body,
    color: color.ink[900],
  },
  // 시안은 오류에도 테두리를 굵히지 않고 색만 바꿉니다.
  inputError: { borderColor: color.danger[500] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    padding: space[4],
    minHeight: sizing.touchTargetMin,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.surface,
  },
  optionOn: { borderColor: color.brand[600], backgroundColor: color.brand[50] },
  optionBody: { flex: 1, gap: 2 },
  mark: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOff: {
    backgroundColor: color.canvas,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
  },
  markOn: { backgroundColor: color.brand[600] },
});

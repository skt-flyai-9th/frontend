/**
 * Chip / Badge — 시안 `ui/reals.tsx` 대조 이식.
 *
 * 시안 사양
 *   Chip   h-8(32) · rounded-full · px-3.5(14) · 13·semibold
 *          활성 bg-brand + 흰 글자 / 비활성 border-hairline + bg-canvas + text-ink-3
 *          active:scale-95
 *   Badge  rounded-full · px-2.5(10) py-1(4) · 11·semibold
 *
 * 접근성: 시각 높이는 32 지만 hitSlop 으로 터치 영역 44 를 보전합니다
 * (눈에는 시안, 손끝에는 접근성).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import theme, { color, radius, sizing, space, text } from '../design/theme';
import { pressTap } from './press';

type Tone = 'neutral' | 'brand' | 'done' | 'warn' | 'danger';

const TONE = {
  neutral: { bg: color.ink[50], fg: color.ink[500] },
  brand: { bg: color.brand[50], fg: color.brand[600] },
  done: { bg: color.done[100], fg: color.done[500] },
  warn: { bg: color.warn[100], fg: color.warn[500] },
  danger: { bg: color.danger[100], fg: color.danger[500] },
} as const;

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {/* 시안 배지는 11·semibold 입니다. micro 는 medium 이라 굵기만 올립니다. */}
      <Text style={[text.micro, styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipOn : styles.chipOff,
        pressTap(pressed, 'chip'),
      ]}
    >
      <Text style={[text.chipLabel, { color: selected ? color.paper : color.ink[700] }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** 신뢰도 표기. 명세 전반의 "표본이 적으면 신뢰도 낮음으로 표시" 규칙용. */
export function Confidence({ level }: { level: 'high' | 'medium' | 'low' }) {
  const map = {
    high: { label: '근거 충분', tone: 'done' as Tone },
    medium: { label: '참고용', tone: 'neutral' as Tone },
    low: { label: '자료 부족', tone: 'warn' as Tone },
  };
  return <Badge label={map[level].label} tone={map[level].tone} />;
}

const styles = StyleSheet.create({
  badge: {
    // 시안: px-2.5 py-1
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontFamily: theme.text.chipLabel.fontFamily },
  chip: {
    minHeight: sizing.chipHeight,
    // 시안: px-3.5
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
  },
  chipOn: { backgroundColor: color.brand[600], borderColor: color.brand[600] },
  chipOff: { backgroundColor: color.canvas, borderColor: color.ink[200] },
});

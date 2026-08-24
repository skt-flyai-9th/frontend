import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import theme, { color, radius, sizing, space, text } from '../design/theme';

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
      <Text style={[text.micro, { color: t.fg }]}>{label}</Text>
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
        pressed && { opacity: theme.opacity.pressed },
      ]}
    >
      <Text
        style={[
          text.bodySmall,
          { color: selected ? color.paper : color.ink[700], fontFamily: theme.text.bodyStrong.fontFamily },
        ]}
      >
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
    paddingHorizontal: space[2],
    paddingVertical: 3,
    // 가이드라인 §3.1·§5.5: 배지는 완전 pill
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  chip: {
    /**
     * 디자인 1차수정 (2026-08-24, "시안 우선" 지시): 칩 높이 32 · 글자 13.
     * 접근성: 시각 높이는 32 지만 hitSlop 으로 터치 영역 44 를 보전합니다
     * (기능명세 하한 44 — 눈에는 시안, 손끝에는 접근성).
     */
    minHeight: sizing.chipHeight,
    paddingHorizontal: space[4],
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
  },
  // 가이드라인 §5.3: 활성 칩은 브랜드색 배경 + 흰 글자
  chipOn: { backgroundColor: color.brand[600], borderColor: color.brand[600] },
  chipOff: { backgroundColor: color.paper, borderColor: color.ink[200] },
});

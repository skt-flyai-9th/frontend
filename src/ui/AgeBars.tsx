/**
 * AgeBars — 연령대 분포를 **가로 막대**로.
 *
 * 시안 `최최종.html` 의 `AgeBars` 를 옮긴 것입니다 (2026-08-30 지시 ⑨-2: "소비층
 * 분석 구성 변경"). 예전에는 연령도 도넛이었는데, 다섯 칸짜리 도넛은 조각이 잘게
 * 쪼개져 어느 쪽이 큰지 한눈에 안 들어왔습니다. 막대는 길이로 바로 읽힙니다.
 *
 * 시안 실측값
 *   점 6 · 라벨 11(폭 28) · 막대 높이 6 · 트랙 #F1F5F9 · 값 11 semibold(폭 26)
 *   가장 큰 칸만 값 글자를 브랜드색으로
 *
 * 움직임 — 시안 `width 760ms cubic-bezier(.16,1,.3,1)` 에 칸마다 80ms 씩 늦춰
 * 차례로 차오릅니다. 지시 ⑨ 의 "조회수 그래프 그려지듯이 각각의 그래프 애니메이션".
 *
 * ⚠️ 폭은 레이아웃 값이라 **네이티브 드라이버를 못 씁니다**(CLAUDE.md §5-④).
 *    한 번짜리 timing 이라 `Animated.loop` 함정과는 무관합니다.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import theme, { color, radius, space } from '../design/theme';

export interface AgeBar {
  label: string;
  value: number;
  color: string;
}

export function AgeBars({ segs }: { segs: AgeBar[] }) {
  const total = segs.reduce((a, s) => a + s.value, 0) || 100;
  const max = Math.max(...segs.map((s) => s.value), 1);

  /* 칸 수가 바뀌어도 그릇은 그대로 씁니다 — 훅 개수가 변하면 안 됩니다. */
  const grow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    grow.setValue(0);
    Animated.timing(grow, {
      toValue: 1,
      duration: 760 + (segs.length - 1) * 80,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false,
    }).start();
  }, [grow, segs.length]);

  return (
    <View style={styles.wrap}>
      {segs.map((s, i) => {
        /* 칸마다 늦게 출발합니다 — 하나의 시계를 구간으로 잘라 씁니다. */
        const span = 760 + (segs.length - 1) * 80;
        const from = (i * 80) / span;
        const width = grow.interpolate({
          inputRange: [from, 1],
          outputRange: ['0%', `${Math.round((s.value / max) * 100)}%`],
          extrapolate: 'clamp',
        });
        return (
          <View key={s.label} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.label} numberOfLines={1}>
              {s.label}
            </Text>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, { width, backgroundColor: s.color }]} />
            </View>
            <Text style={[styles.value, s.value === max && styles.valueTop]}>
              {Math.round((s.value / total) * 100)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  label: { ...theme.text.micro, width: 30, flexShrink: 0, color: color.ink[700] },
  track: {
    flex: 1,
    minWidth: 0,
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: color.ink[50],
  },
  fill: { height: '100%', borderRadius: radius.pill },
  value: {
    ...theme.text.micro,
    width: 30,
    flexShrink: 0,
    textAlign: 'right',
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[500],
  },
  valueTop: { color: color.brand[600] },
});

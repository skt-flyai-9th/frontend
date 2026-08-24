/**
 * Shutter — 시안 `Shutter` 대조 이식. 카메라·안무카메라가 **같은 것**을 씁니다.
 *
 * 시안 사양
 *   바깥 76 원 · 테두리 4px — 대기 흰색 80% / 녹화 중 하트 빨강
 *   안쪽 대기 58 흰 원 → 녹화 30 빨간 라운드 사각(8)
 *   변형은 spring(400/30)
 *
 * 이전에는 두 화면이 각자 셔터를 그렸고 값이 서로 달랐습니다(안쪽 60 vs 34,
 * 색도 브랜드 파랑). 촬영 화면마다 셔터가 다르게 생기면 같은 앱으로 안 보입니다.
 *
 * ⚠️ 크기·모서리·배경색은 네이티브 드라이버가 못 다루는 속성이라 JS 드라이버입니다.
 *    누를 때 한 번 도는 애니메이션이라 부담이 없습니다.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { color, motion, radius, sizing } from '../design/theme';

interface Props {
  recording: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function Shutter({ recording, disabled, onPress }: Props) {
  const t = useRef(new Animated.Value(recording ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(t, {
      toValue: recording ? 1 : 0,
      ...motion.spring.shutter,
      useNativeDriver: false,
    }).start();
  }, [recording, t]);

  const size = t.interpolate({
    inputRange: [0, 1],
    outputRange: [sizing.shutterInner, sizing.shutterStop],
  });
  const corner = t.interpolate({ inputRange: [0, 1], outputRange: [sizing.shutterInner / 2, 8] });
  const bg = t.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgb(255,255,255)', 'rgb(239,68,68)'],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={recording ? '녹화 멈추기' : '녹화 시작'}
      accessibilityState={{ disabled: !!disabled, busy: recording }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outer,
        // 시안: 녹화 중에는 바깥 링이 빨강으로 바뀝니다.
        { borderColor: recording ? color.danger[500] : 'rgba(255,255,255,0.8)' },
        pressed && { transform: [{ scale: motion.tapScale.shutter }] },
        disabled && styles.disabled,
      ]}
    >
      <Animated.View style={{ width: size, height: size, borderRadius: corner, backgroundColor: bg }} />
    </Pressable>
  );
}

/** 셔터 자리를 비워둘 때(리뷰 시트가 떠 있을 때 등) 레이아웃이 튀지 않게 합니다. */
export function ShutterSpacer() {
  return <View style={styles.outer} />;
}

const styles = StyleSheet.create({
  outer: {
    width: sizing.shutterOuter,
    height: sizing.shutterOuter,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
});

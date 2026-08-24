/**
 * BrandMark — 시안 `PlaceMark` · `InstaMark` · `YoutubeMark` 대조 이식.
 *
 * 시안 원문
 *   place+     h-18 · rounded · bg #5CA4F8 · px-1.5 · 10·bold · 흰 글자
 *   instagram  size 정사각 · rounded-md · 45° 그라디언트(#f96600 → #e900ce → #7614ff)
 *              안쪽에 흰 테두리 1.5 사각형(절반 크기)
 *   youtube    16×22 · rounded · bg #ff0000 · 흰 재생 삼각형(9)
 *
 * ⚠️ 그라디언트는 네이티브 모듈(expo-linear-gradient) 없이 그려야 해서
 *    react-native-svg 의 linearGradient 로 냅니다. 이미 있는 의존성이라
 *    새로 추가되는 것이 없습니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import theme, { color, radius } from '../design/theme';

export type BrandKind = 'place' | 'instagram' | 'youtube';

export function BrandMark({ kind, size = 18 }: { kind: BrandKind; size?: number }) {
  if (kind === 'place') {
    return (
      <View style={styles.place}>
        <Text style={styles.placeText}>place+</Text>
      </View>
    );
  }

  if (kind === 'instagram') {
    const inner = size / 2;
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityLabel="인스타그램">
        <Defs>
          <LinearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#f96600" />
            <Stop offset="0.5" stopColor="#e900ce" />
            <Stop offset="1" stopColor="#7614ff" />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={size * 0.28} fill="url(#ig)" />
        <Rect
          x={(size - inner) / 2}
          y={(size - inner) / 2}
          width={inner}
          height={inner}
          rx={inner * 0.3}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      </Svg>
    );
  }

  // youtube — 시안은 가로로 넓은 16×22 입니다.
  const w = Math.round(size * 1.22);
  const h = Math.round(size * 0.89);
  return (
    <Svg width={w} height={h} viewBox="0 0 22 16" accessibilityLabel="유튜브">
      <Rect width={22} height={16} rx={3.5} fill="#FF0000" />
      <Path d="M9 4.5 15 8 9 11.5Z" fill="#ffffff" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  place: {
    height: 18,
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: radius.xs,
    backgroundColor: '#5CA4F8',
  },
  placeText: {
    ...theme.text.nano,
    fontFamily: theme.text.heading.fontFamily,
    fontWeight: theme.text.heading.fontWeight,
    color: color.paper,
  },
});

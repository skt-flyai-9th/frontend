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

export function BrandMark({
  kind,
  size = 18,
  boxed = false,
}: {
  kind: BrandKind;
  /** boxed 일 때는 **심볼** 크기입니다. 타일은 시안대로 size + 14 가 됩니다. */
  size?: number;
  /**
   * 시안 v3 `BrandMark` 의 타일형 (프로필 수정 화면).
   *   타일 size+14 정사각 · rounded-xl(12) · 인스타 45° 그라디언트 / 유튜브 #FF0000
   *   안쪽 심볼: 인스타는 흰 테두리 사각형 size*0.55, 유튜브는 흰 삼각형 size*0.5
   */
  boxed?: boolean;
}) {
  if (boxed && kind !== 'place') return <BoxedMark kind={kind} size={size} />;

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

/** 시안 v3 타일형. 두 플랫폼 모두 같은 정사각 타일이라 한 곳에서 그립니다. */
function BoxedMark({ kind, size }: { kind: Exclude<BrandKind, 'place'>; size: number }) {
  const tile = size + 14;
  const rx = 12; // 시안 rounded-xl
  const inner = size * 0.55;
  return (
    <Svg
      width={tile}
      height={tile}
      viewBox={`0 0 ${tile} ${tile}`}
      accessibilityLabel={kind === 'instagram' ? '인스타그램' : '유튜브'}
    >
      {kind === 'instagram' ? (
        <>
          <Defs>
            <LinearGradient id="igbox" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor="#f96600" />
              <Stop offset="0.5" stopColor="#e900ce" />
              <Stop offset="1" stopColor="#7614ff" />
            </LinearGradient>
          </Defs>
          <Rect width={tile} height={tile} rx={rx} fill="url(#igbox)" />
          <Rect
            x={(tile - inner) / 2}
            y={(tile - inner) / 2}
            width={inner}
            height={inner}
            rx={2}
            fill="none"
            stroke="#ffffff"
            strokeWidth={2}
          />
        </>
      ) : (
        <>
          <Rect width={tile} height={tile} rx={rx} fill="#FF0000" />
          {/* 시안 PlayTri: viewBox 24 의 "M6 3 20 12 6 21Z" 를 size*0.5 로 줄여 가운데에 */}
          <Path
            d="M6 3 20 12 6 21Z"
            fill="#ffffff"
            transform={`translate(${(tile - size * 0.5) / 2 + 1}, ${(tile - size * 0.5) / 2}) scale(${(size * 0.5) / 24})`}
          />
        </>
      )}
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

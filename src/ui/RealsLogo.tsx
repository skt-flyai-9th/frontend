/**
 * RealsLogo — 브랜드 워드마크.
 *
 * ─────────────────────────────────────────────────────────────
 * 2026-08-26 — 새 로고 이미지로 교체했습니다 (사장님 제공 `로고.jpg`)
 * ─────────────────────────────────────────────────────────────
 * 예전에는 "Reals" 글자 + 빨간 삼각형(PlayTri)을 코드로 그렸습니다.
 * 새 로고는 글자 모양 자체가 커스텀이라 폰트로 흉내 낼 수 없어 이미지로 넣습니다.
 *
 * 원본이 흰 배경 JPG 라 그대로 쓰면 흰 사각형이 됩니다. 그래서 굽는 단계에서
 * **밝기를 알파로 바꿔** 잉크만 남기고 여백을 잘라냈습니다(`assets/logo-wordmark.png`).
 * 검정 + 알파라 `tintColor` 로 색을 바꿀 수 있습니다 — 어두운 배경에서는 흰색으로.
 *
 * ⚠️ `size` 는 예전과 같이 **글자 크기 자리**이지만 이제 이미지 높이입니다.
 *    바깥 상자 높이는 `size * 1.5` 로 **그대로 뒀습니다.** 예전 로고의 줄상자가
 *    글자크기 × 1.5 였고(시안 규칙), 로그인처럼 세로 가운데 정렬인 화면은 이 높이가
 *    줄면 아래 내용이 통째로 올라갑니다. 시안 대조 수치를 지키려고 상자를 남겼습니다.
 *
 * `PlayTri` 는 로고에서 빠졌지만 **지우지 않았습니다** — 영상 썸네일의 재생 표시와
 * BrandMark 가 아직 씁니다.
 */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { color } from '../design/theme';

/** 시안 PlayTri — 24 뷰박스 안의 재생 삼각형. 기본색은 하트 빨강입니다. */
export function PlayTri({ size = 12, fill = color.danger[500] }: { size?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 3 20 12 6 21Z" fill={fill} />
    </Svg>
  );
}

/** 구운 이미지의 잉크 비율(813x263) — 폭을 높이에서 계산합니다. */
const ASPECT = 813 / 263;
const WORDMARK = require('../../assets/logo-wordmark.png');

export function RealsLogo({ size = 18, tint }: { size?: number; tint?: string }) {
  return (
    <View
      style={[styles.box, { height: size * 1.5 }]}
      accessibilityRole="header"
      accessibilityLabel="Reals"
    >
      <Image
        source={WORDMARK}
        style={{ width: Math.round(size * ASPECT), height: size }}
        resizeMode="contain"
        tintColor={tint ?? color.ink[900]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 예전 로고의 줄상자(글자크기 × 1.5)를 그대로 재현합니다 — 위 머리말 참고.
  box: { justifyContent: 'center', alignItems: 'flex-start' },
});

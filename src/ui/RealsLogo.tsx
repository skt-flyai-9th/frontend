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
 * ⚠️ `size` 는 **글자 크기 자리**이고, 실제 이미지 높이는 **`size × 0.86`** 입니다.
 *    시안 원문이 그렇습니다 (`js/shell.jsx:134` — `const h = Math.round(size * 0.86)`).
 *    워드마크의 잉크 높이가 같은 자리에 있던 글자보다 그만큼 낮기 때문입니다.
 *
 *    2026-08-27 정정: 이 계수를 빠뜨려 **앱의 로고가 전부 시안보다 16% 컸습니다.**
 *    size 는 시안과 같은 값을 넘기고 있었는데 높이를 그대로 써서, 헤더·로그인·스플래시가
 *    한꺼번에 어긋나 있었습니다. 눈으로는 "좀 큰가?" 수준이라 캡처 % 로도 안 잡힙니다.
 *
 *    바깥 상자 높이는 `size * 1.5`(예전 로고의 줄상자) 로 **그대로 뒀습니다** —
 *    헤더가 그 높이에 맞춰져 있습니다. 시안처럼 상자 없이 이미지만 놓아야 하는
 *    자리(로그인)는 `lineBox={false}` 로 끕니다.
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

export function RealsLogo({
  size = 18,
  tint,
  lineBox = true,
}: {
  size?: number;
  tint?: string;
  /**
   * 예전 글자 로고의 줄상자(`size × 1.5`)를 유지할지. 기본 유지입니다.
   *
   * 시안은 이미지를 그냥 놓습니다(`<img>`·마스크 span). 로그인처럼 **바로 아래 문구와의
   * 간격이 `mt-2`(8) 로 정해진 자리**는 상자의 위아래 여백이 그 간격에 더해지므로 끕니다.
   */
  lineBox?: boolean;
}) {
  // 시안 `js/shell.jsx:134` — 이미지 높이는 size 가 아니라 size × 0.86 입니다
  const h = Math.round(size * 0.86);
  return (
    <View
      style={[styles.box, { height: lineBox ? size * 1.5 : h }]}
      accessibilityRole="header"
      accessibilityLabel="Reals"
    >
      <Image
        source={WORDMARK}
        style={{ width: Math.round(h * ASPECT), height: h }}
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

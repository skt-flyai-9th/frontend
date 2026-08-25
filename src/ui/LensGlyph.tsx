/**
 * LensGlyph — 시안 v3 `LensGlyph` 대조 이식.
 *
 * 시안 원문 주석: "사장님 제공 Figma 백택(camera-lens, node 5:203) 구조 그대로:
 *                 118 박스 · 3중 원 · stroke 4.25"
 *
 * 홈 피드 카드의 "촬영 준비" 진입 아이콘입니다. 세 번 바뀌었습니다.
 *   1차  send (종이비행기)
 *   2차  clapperboard (슬레이트)
 *   3차  **이 렌즈** — 색도 브랜드 파랑이 아니라 slate(ink 500) 입니다
 *
 * 뷰박스를 118 그대로 두는 이유: stroke 4.25 와 반지름 49.167/44.25/19.667 이
 * 그 좌표계에서 나온 값이라, 24 로 환산하면 획 굵기가 미세하게 어긋납니다.
 */
import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { color } from '../design/theme';

export function LensGlyph({ size = 22, tint }: { size?: number; tint?: string }) {
  const stroke = tint ?? color.ink[500];
  return (
    <Svg width={size} height={size} viewBox="0 0 118 118" fill="none">
      <Circle cx={59} cy={59} r={49.167} stroke={stroke} strokeWidth={4.25} />
      <Circle cx={59} cy={59} r={44.25} stroke={stroke} strokeWidth={4.25} />
      <Circle cx={59} cy={59} r={19.667} stroke={stroke} strokeWidth={4.25} />
    </Svg>
  );
}

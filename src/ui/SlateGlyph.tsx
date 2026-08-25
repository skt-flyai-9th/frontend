/**
 * SlateGlyph — 시안 V4 `SlateGlyph` 대조 이식.
 *
 * 시안 V4 에서 피드 카드의 "촬영하기" 아이콘이 **카메라 렌즈 → 슬레이트(클랩보드)** 로
 * 바뀌었습니다. 시안은 사장님이 준 원본 PNG 를 CSS 마스크로 찍어 씁니다
 * (다시 그리지 않는다는 뜻) — 우리도 같은 PNG 를 그대로 쓰고 색만 입힙니다.
 *
 * 원본 비율 144 × 158 이라 높이는 size × 158/144 입니다.
 */
import React from 'react';
import { Image } from 'react-native';
import { color } from '../design/theme';

const SLATE = require('../../assets/icons/slate.png');

export function SlateGlyph({ size = 24, tint }: { size?: number; tint?: string }) {
  return (
    <Image
      source={SLATE}
      // tintColor 가 마스크 역할을 합니다 — 원본 실루엣 그대로, 색만 바뀝니다.
      style={{ width: size, height: Math.round((size * 158) / 144), tintColor: tint ?? color.ink[500] }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

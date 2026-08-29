/**
 * SlateEditGlyph — 시안 `튜토리얼,홈UI,촬영화면UI.html` 의 촬영 버튼 아이콘.
 *
 * **슬레이트(클래퍼보드) + 연필.** "찍어서 만든다" 를 한 그림으로 말합니다.
 * 홈 카드에서 예전에 쓰던 재생 삼각형(`PlayGlyph`)을 이걸로 바꿨습니다 —
 * 삼각형은 "영상을 튼다" 로 읽혀서, 누르면 촬영 준비로 간다는 게 안 보였습니다.
 *
 * 시안 원문 그대로입니다(`viewBox 0 0 24 24` · `strokeWidth 1.7` ·
 * `strokeLinecap="butt"` · `strokeLinejoin="miter"`).
 *
 * ⚠️ 끝이 **각진** 아이콘입니다. lucide 기본값(round)으로 그리면 슬레이트 모서리와
 *    연필 촉이 뭉툭해져 다른 그림이 됩니다 — cap·join 을 시안값으로 고정합니다.
 */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export function SlateEditGlyph({
  size = 24,
  color = '#334155',
  strokeWidth = 1.7,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 슬레이트 몸통 */}
      <Rect
        x={3}
        y={4}
        width={13.4}
        height={14}
        rx={0.7}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      {/* 위쪽 가로 띠 + 사선 두 개 (클래퍼) */}
      <Path
        d="M3 7.9h13.4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      <Path
        d="M5.6 7.9 9.3 4M9.6 7.9 13.3 4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      {/* 왼쪽 경첩 */}
      <Circle cx={3} cy={5.9} r={1.15} stroke={color} strokeWidth={strokeWidth} />
      {/* 연필 몸통 */}
      <Path
        d="M12.1 21.7 12.5 19.1 18.2 13.4 20.4 15.6 14.7 21.3Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      {/* 연필 촉·깃 선 */}
      <Path
        d="M12.5 19.1 14.7 21.3M17.1 14.5 19.3 16.7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </Svg>
  );
}

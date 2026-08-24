/**
 * TabGlyph — 시안 `TAB_PATHS` 를 그대로 옮긴 탭 아이콘 4종.
 *
 * ⚠️ lucide 아이콘을 쓰지 않습니다.
 *    시안의 탭 글리프는 lucide 가 아니라 직접 그린 path 입니다. lucide 의 Home·Heart·
 *    MessageCircle·Store 로 대체하면 획 굵기와 모서리 반경이 달라 탭바만 다른 앱처럼
 *    보입니다(특히 4번째 — 시안은 '가게'가 아니라 **사람** 아이콘입니다).
 *
 * 시안 원문: strokeWidth 1.5 · linecap/linejoin round · fill 은 활성일 때만.
 */
import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

export type TabGlyphName = 'home' | 'heart' | 'chat' | 'account';

interface Props {
  name: TabGlyphName;
  size?: number;
  color: string;
  /** 시안: 채움은 관심목록 탭이 활성일 때만 씁니다. */
  filled?: boolean;
}

export function TabGlyph({ name, size = 26, color, filled }: Props) {
  const fill = filled ? color : 'none';
  const common = {
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      {name === 'home' && (
        <Path d="M3.7 11.3 12 4.9l8.3 6.4v7.4a1.5 1.5 0 0 1-1.5 1.5H5.2a1.5 1.5 0 0 1-1.5-1.5z" {...common} />
      )}
      {/* v3: 하트 path 가 통째로 교체됐습니다. 도형이 커져 크기 보정(29)이 필요 없어졌습니다. */}
      {name === 'heart' && (
        <Path d="M20.8 5.9a5.2 5.2 0 0 0-7.3 0L12 7.4l-1.5-1.5a5.2 5.2 0 0 0-7.3 7.3l1.5 1.5L12 21.3l7.3-6.6 1.5-1.5a5.2 5.2 0 0 0 0-7.3z" {...common} />
      )}
      {name === 'chat' && (
        <Path d="M12 4.4c-4.5 0-8.1 2.8-8.1 6.3 0 2.3 1.5 4.3 3.8 5.4l-.8 3.5 3.8-2.1c.4 0 .8.1 1.3.1 4.5 0 8.1-2.8 8.1-6.9S16.5 4.4 12 4.4z" {...common} />
      )}
      {name === 'account' && (
        <G>
          <Circle cx={12} cy={12} r={8.3} {...common} />
          <Circle cx={12} cy={10} r={2.7} {...common} />
          <Path d="M6.7 18.4a5.6 5.6 0 0 1 10.6 0" {...common} fill="none" />
        </G>
      )}
    </Svg>
  );
}

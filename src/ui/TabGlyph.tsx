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
      {name === 'heart' && (
        <Path d="M12 20.1s-7.4-4.5-7.4-9.4A4.3 4.3 0 0 1 12 8.2a4.3 4.3 0 0 1 7.4 2.5c0 4.9-7.4 9.4-7.4 9.4z" {...common} />
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

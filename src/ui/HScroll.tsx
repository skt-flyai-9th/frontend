/**
 * HScroll — 탭 안에서 안전한 **가로 스크롤**.
 *
 * 탭 트랙 자체가 가로 ScrollView 라, 화면 안에 또 다른 가로 스크롤을 그냥 두면
 * 안드로이드에서 바깥이 제스처를 먼저 먹습니다. AI 추천의 추천 카드를 넘기려고
 * 밀면 **카드가 아니라 탭이 넘어가 마이페이지로 가 버렸습니다** (사장님 보고).
 *
 * 손가락이 이 안에 닿아 있는 동안만 탭 넘김을 끕니다. 떼거나 관성이 끝나면 되돌립니다.
 * `onTouchStart` 는 **움직이기 전에** 불리므로, 바깥이 스크롤을 시작하기 전에 막힙니다.
 *
 * 탭 바깥(스택 화면)에서 써도 안전합니다 — 그때는 잠글 대상이 없어 아무 일도 없습니다.
 */
import React from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { useSwipeTabsLock } from '../navigation/SwipeTabs';

export function HScroll({ children, ...rest }: ScrollViewProps) {
  const { lock, unlock } = useSwipeTabsLock();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // 카드 단위로 딱딱 멈춥니다 (시안 snap-x snap-mandatory)
      decelerationRate="fast"
      onTouchStart={lock}
      onTouchEnd={unlock}
      onTouchCancel={unlock}
      onScrollEndDrag={unlock}
      onMomentumScrollEnd={unlock}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

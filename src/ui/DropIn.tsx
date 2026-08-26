/**
 * DropIn — 위에서 떨어지듯 하나씩 나타나는 등장 애니메이션.
 *
 * 시안 5차(`수정5차.html`)에 새로 생긴 것입니다. 원문 주석에 쓰는 자리가 그대로 적혀
 * 있습니다 — **"Staggered fade-in & slide-down — 매장 검색 결과·지도·바텀시트"**.
 *
 * ```css
 * @keyframes drop{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
 * .drop-in{animation:drop .34s cubic-bezier(.16,1,.3,1) both}
 * ```
 *
 * 위 세 값(-10px · 340ms · 곡선)은 시안 원문 그대로입니다.
 *
 * ⚠️ **항목 사이 지연(stagger)은 시안에 없습니다.** 5차 파일은 껍데기만 와서
 *    `.drop-in` 을 어디에 몇 ms 간격으로 붙이는지가 담긴 화면 코드(`js/screens-*.jsx`)가
 *    빠져 있습니다. 45ms 는 제가 고른 값입니다 — 다섯 줄이 떨어지는 데 총 520ms 로,
 *    "차례로 온다" 가 읽히면서 기다린다는 느낌은 안 드는 지점입니다.
 *    화면 코드가 오면 그 값으로 맞추세요.
 *
 * 네이티브 드라이버를 씁니다. CLAUDE.md §5-④ 가 경고하는 건 `Animated.loop` 이고,
 * 이건 **한 번짜리 timing** 이라 웹에서도 멀쩡합니다. opacity·transform 둘 다
 * 레이아웃 속성이 아니라 드라이버를 섞는 문제도 없습니다.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';

/** 시안 원문 */
const DURATION = 340;
const RISE = 10;
/** 시안에 없는 값 — 위 머리말 참고 */
const STEP = 45;

export function DropIn({
  index = 0,
  style,
  children,
}: {
  /** 목록에서 몇 번째인지. 이 순서만큼 늦게 떨어집니다. */
  index?: number;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: DURATION,
      delay: index * STEP,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [t, index]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-RISE, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

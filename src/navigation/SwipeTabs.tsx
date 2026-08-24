/**
 * SwipeTabs — 좌우로 넘기는 탭. 시안 `TabPager` 대조 이식.
 *
 * ─────────────────────────────────────────────────────────────
 * 왜 새 네비게이터를 만들었나
 * ─────────────────────────────────────────────────────────────
 * 시안은 4개 탭 화면을 가로 트랙에 나란히 두고 손가락으로 밀어 넘깁니다.
 * 그런데 `createBottomTabNavigator` 는 활성 화면 하나만 보여주는 구조라
 * 트랙을 만들 수 없습니다.
 *
 * 흔한 해법인 `createMaterialTopTabNavigator` 는 **react-native-pager-view 라는
 * 네이티브 모듈**을 요구합니다. 그걸 넣으면 지금 쓰는 dev client·APK 가
 * 재빌드 전까지 실행되지 않습니다. 그래서 쓰지 않았습니다.
 *
 * 대신 react-navigation 이 공식으로 열어 둔 `useNavigationBuilder` + `TabRouter` 로
 * **JS 만으로** 탭 네비게이터를 직접 만듭니다. 라우팅(탭 상태·뒤로가기·
 * `navigate('Main', { screen: 'My' })`)은 전부 라이브러리가 그대로 처리하고,
 * 화면을 어떻게 그릴지만 우리가 정합니다 — 가로 ScrollView 트랙으로.
 *
 * 새 의존성 0개입니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 캡슐이 손가락을 따라오게 하는 법
 * ─────────────────────────────────────────────────────────────
 * 시안은 스크롤 진행률(0~3)을 버스로 흘려 탭바 캡슐이 같은 프레임에 움직입니다.
 * 여기서는 Animated 값 **두 개**를 씁니다.
 *
 *   progressX  네이티브 드라이버 → 캡슐 **위치**(transform). 60fps 로 붙습니다.
 *   progressJS JS 드라이버       → 캡슐 **색**(backgroundColor). 관심목록에
 *                                 가까울수록 파랑→빨강으로 보간됩니다.
 *
 * ⚠️ 한 노드의 style 에 네이티브·JS 드라이버 값을 섞으면 RN 이 예외를 냅니다.
 *    그래서 TabBar 는 바깥(위치)과 안쪽(색)을 **다른 View** 로 나눠 그립니다.
 *    색까지 네이티브로 올리려면 색 보간을 포기해야 해서 이렇게 나눴습니다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  createNavigatorFactory,
  TabActions,
  TabRouter,
  useNavigationBuilder,
  type DefaultNavigatorOptions,
  type NavigationProp,
  type NavigatorTypeBagBase,
  type ParamListBase,
  type StaticConfig,
  type TabActionHelpers,
  type TabNavigationState,
  type TabRouterOptions,
  type TypedNavigator,
} from '@react-navigation/native';

import { RealsTabBar } from '../ui/TabBar';

type SwipeTabOptions = {
  /** 이 화면만 스와이프를 막고 싶을 때. 지금 쓰는 곳은 없습니다. */
  swipeEnabled?: boolean;
};

type SwipeTabEventMap = {
  tabPress: { data: undefined; canPreventDefault: true };
  tabLongPress: { data: undefined };
};

/**
 * 네비게이터 컴포넌트가 받는 props.
 * 마지막 제네릭은 화면들이 받는 navigation prop 타입입니다 —
 * bottom-tabs 가 BottomTabNavigationProp 을 넣는 자리와 같습니다.
 */
type SwipeTabNavigationProp = NavigationProp<
  ParamListBase,
  string,
  string | undefined,
  TabNavigationState<ParamListBase>,
  SwipeTabOptions,
  SwipeTabEventMap
>;

type SwipeTabProps = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  TabNavigationState<ParamListBase>,
  SwipeTabOptions,
  SwipeTabEventMap,
  SwipeTabNavigationProp
> &
  TabRouterOptions;

function SwipeTabNavigator({
  id,
  initialRouteName,
  children,
  screenOptions,
  screenListeners,
  backBehavior,
}: SwipeTabProps) {
  /**
   * 제네릭 순서는 라이브러리 시그니처 그대로입니다:
   *   <State, RouterOptions, ActionHelpers, ScreenOptions, EventMap>
   * 세 번째가 화면 옵션이 아니라 **액션 헬퍼**입니다(jumpTo 등).
   */
  const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
    TabNavigationState<ParamListBase>,
    TabRouterOptions,
    TabActionHelpers<ParamListBase>,
    SwipeTabOptions,
    SwipeTabEventMap
  >(TabRouter, {
    id,
    initialRouteName,
    backBehavior,
    children,
    screenOptions,
    screenListeners,
  });

  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewHandle>(null);

  /**
   * 탭바에 넘길 최소 인터페이스.
   *
   * useNavigationBuilder 의 emit 은 이벤트 이름이 리터럴로 좁혀진 제네릭이라,
   * 라우트를 런타임에 순회하는 탭바와 맞지 않습니다. 여기서 한 번만 좁혀 넘깁니다 —
   * 실제로 보내는 이벤트는 tabPress·tabLongPress 둘뿐이고 둘 다 EventMap 에 있습니다.
   */
  const tabBarNavigation = useMemo(
    () => ({
      emit: (e: {
        type: 'tabPress' | 'tabLongPress';
        target: string;
        canPreventDefault?: boolean;
      }) => (navigation.emit as (o: unknown) => { defaultPrevented: boolean })(e),
      dispatch: navigation.dispatch,
    }),
    [navigation]
  );

  /**
   * 트랙 높이.
   *
   * 가로 ScrollView 는 자식을 세로로 늘려주는 게 기본이지만, 페이지 안에 네이티브
   * 스택(마이 탭)이 들어 있어 높이가 확정되지 않으면 빈 화면이 될 수 있습니다.
   * 한 번 재서 명시해 둡니다. 재기 전(0)에는 기본 stretch 동작에 맡깁니다.
   */
  const [trackHeight, setTrackHeight] = useState(0);

  const progressX = useRef(new Animated.Value(0)).current; // 네이티브 — 위치
  const progressJS = useRef(new Animated.Value(0)).current; // JS — 색

  /**
   * 마운트할 페이지.
   *
   * 4개를 전부 처음부터 그리면 앱을 켜자마자 네 탭의 조회가 동시에 나갑니다.
   * 그렇다고 방문한 것만 그리면 넘기는 도중에 빈 화면이 보입니다.
   * 그래서 **이웃 한 칸까지** 미리 그리고, 한 번 그린 페이지는 유지합니다
   * (화면 상태가 날아가지 않게).
   */
  const [mounted, setMounted] = useState<number[]>(() => neighbors(state.index, state.routes.length));
  useEffect(() => {
    setMounted((prev) => {
      const next = new Set(prev);
      for (const i of neighbors(state.index, state.routes.length)) next.add(i);
      return next.size === prev.length ? prev : Array.from(next).sort((a, b) => a - b);
    });
  }, [state.index, state.routes.length]);

  /** 탭을 눌러 바뀌었을 때 트랙도 그 자리로 보냅니다. */
  const settledIndex = useRef(state.index);
  useEffect(() => {
    if (settledIndex.current === state.index) return;
    settledIndex.current = state.index;
    scrollRef.current?.scrollTo({ x: state.index * width, animated: true });
  }, [state.index, width]);

  // 회전·폭 변화에 트랙 위치를 맞춥니다(앱은 세로 고정이라 사실상 최초 1회).
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: state.index * width, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  return (
    <NavigationContent>
      <View style={styles.fill}>
        <Animated.ScrollView
          ref={scrollRef as never}
          horizontal
          pagingEnabled
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          /**
           * 세로 스크롤은 안쪽 목록이 가져가야 합니다. 가로 ScrollView 는 축이 달라
           * 서로 뺏지 않지만, 안드로이드에서 대각선 제스처가 애매할 때를 위해
           * 방향을 명시해 둡니다.
           */
          directionalLockEnabled
          onLayout={(e) => setTrackHeight(e.nativeEvent.layout.height)}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: progressX } } }], {
            useNativeDriver: true,
            // 네이티브로 올려도 listener 는 JS 에서 그대로 불립니다. 색 보간용 값만 갱신합니다.
            listener: (e: { nativeEvent: { contentOffset: { x: number } } }) =>
              progressJS.setValue(e.nativeEvent.contentOffset.x),
          })}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
            const route = state.routes[i];
            if (!route || i === state.index) return;
            settledIndex.current = i;
            // 라우터에 "이 탭으로 옮겼다" 고 알립니다. 뒤로가기 동작도 이걸 따릅니다.
            navigation.dispatch({ ...TabActions.jumpTo(route.name), target: state.key });
          }}
        >
          {state.routes.map((route, i) => (
            <View key={route.key} style={{ width, height: trackHeight || undefined }}>
              {mounted.includes(i) ? descriptors[route.key].render() : null}
            </View>
          ))}
        </Animated.ScrollView>

        <RealsTabBar
          state={state}
          navigation={tabBarNavigation}
          progressX={progressX}
          progressJS={progressJS}
          pageWidth={width}
        />
      </View>
    </NavigationContent>
  );
}

/** 현재 위치와 좌우 한 칸. 범위를 벗어난 값은 버립니다. */
function neighbors(index: number, count: number): number[] {
  return [index - 1, index, index + 1].filter((i) => i >= 0 && i < count);
}

/** Animated.ScrollView 의 ref 타입이 공개되지 않아 필요한 메서드만 좁혀 씁니다. */
type ScrollViewHandle = { scrollTo: (o: { x: number; animated?: boolean }) => void };

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

/**
 * v7 은 네비게이터 타입을 "TypeBag" 으로 묶어 전달합니다.
 * 이걸 갖춰야 `<Tab.Screen name="HomeFeed">` 의 라우트 이름이 타입 검사를 받습니다.
 * (bottom-tabs 의 createBottomTabNavigator 와 같은 형태를 그대로 따랐습니다)
 */
export type SwipeTabTypeBag<
  ParamList extends ParamListBase = ParamListBase,
  NavigatorID extends string | undefined = string | undefined,
> = {
  ParamList: ParamList;
  NavigatorID: NavigatorID;
  State: TabNavigationState<ParamList>;
  ScreenOptions: SwipeTabOptions;
  EventMap: SwipeTabEventMap;
  NavigationList: {
    [RouteName in keyof ParamList]: NavigationProp<
      ParamList,
      RouteName,
      NavigatorID,
      TabNavigationState<ParamList>,
      SwipeTabOptions,
      SwipeTabEventMap
    >;
  };
  Navigator: typeof SwipeTabNavigator;
};

export function createSwipeTabNavigator<
  const ParamList extends ParamListBase,
  const NavigatorID extends string | undefined = string | undefined,
  const TypeBag extends NavigatorTypeBagBase = SwipeTabTypeBag<ParamList, NavigatorID>,
  const Config extends StaticConfig<TypeBag> = StaticConfig<TypeBag>,
>(config?: Config): TypedNavigator<TypeBag, Config> {
  return createNavigatorFactory(SwipeTabNavigator)(config);
}

/**
 * TabBar — 시안 `TabBar.jsx` 대조 이식.
 *
 * 시안 사양
 *   행 49 · 아이콘 26 · **라벨 없음** · border-t hairline/60 · 흰 반투명 + blur
 *   캡슐: 32×4 pill, 활성 탭 중앙 위. 위치는 spring(450/32) 으로 따라오고,
 *         관심목록에 가까울수록 색이 파랑 → 하트빨강 으로 **보간**됩니다.
 *   활성 아이콘: scale 1.08 (spring 420/26). 관심목록만 채움 100%.
 *
 * ⚠️ 라벨을 뺀 건 시안 그대로입니다. 대신 accessibilityLabel 로 이름을 남겨
 *    스크린리더에서는 여전히 "홈/관심목록/AI 추천/마이" 로 읽힙니다.
 *
 * ⚠️ 애니메이션은 JS 드라이버입니다.
 *    캡슐이 색(backgroundColor)과 위치(left)를 함께 바꾸는데 둘 다 네이티브 드라이버가
 *    지원하지 않는 속성입니다. 4px 짜리 막대 하나라 JS 드라이버로 충분합니다 —
 *    억지로 네이티브로 올리면 색 보간을 포기해야 합니다.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { CoachTarget, type CoachName } from './coach/CoachContext';

/** 라우트 이름 → 시안 코치마크 이름표. */
const COACH_TAB: Record<string, CoachName | undefined> = {
  HomeFeed: 'tab-home',
  Favorites: 'tab-saved',
  AiChat: 'tab-chat',
  My: 'tab-mypage',
};
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { CommonActions } from '@react-navigation/native';

import theme, { color, motion, radius, sizing, space } from '../design/theme';
import { TabGlyph, type TabGlyphName } from './TabGlyph';
import { useChrome } from './ChromeContext';

/** 라우트 이름 → 시안 글리프·라벨. 라우트가 늘면 여기만 고칩니다. */
const TAB_META: Record<
  string,
  { glyph: TabGlyphName; label: string; accent?: 'heart'; size?: number }
> = {
  HomeFeed: { glyph: 'home', label: '홈' },
  // v3: 하트 path 가 커져 보정이 사라졌습니다. 네 탭 모두 26 입니다.
  Favorites: { glyph: 'heart', label: '관심목록', accent: 'heart' },
  AiChat: { glyph: 'chat', label: 'AI 추천' },
  My: { glyph: 'account', label: '마이' },
};

const BRAND_RGB = 'rgb(37,99,235)';
const HEART_RGB = 'rgb(239,68,68)';

/** 활성 아이콘만 1.08 로 커집니다 (시안 spring 420/26). */
function TabIcon({ glyph, focused, tint, filled, size }: { glyph: TabGlyphName; focused: boolean; tint: string; filled: boolean; size?: number }) {
  const scale = useRef(new Animated.Value(focused ? 1.08 : 1)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.08 : 1,
      ...motion.spring.pop,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TabGlyph name={glyph} size={size ?? sizing.tabIconSize} color={tint} filled={filled} />
    </Animated.View>
  );
}

/**
 * 탭바가 실제로 쓰는 것만 요구합니다.
 * bottom-tabs 의 BottomTabBarProps 에 묶어두면 우리 커스텀 네비게이터(SwipeTabs)가
 * 못 쓰게 됩니다. 구조만 맞으면 어느 쪽이든 붙습니다.
 */
export interface RealsTabBarProps {
  state: {
    index: number;
    key: string;
    routes: readonly { key: string; name: string }[];
  };
  navigation: {
    emit: (e: { type: 'tabPress' | 'tabLongPress'; target: string; canPreventDefault?: boolean }) => {
      defaultPrevented: boolean;
    };
    dispatch: (action: { type: string; payload?: object; source?: string; target?: string }) => void;
  };
  /** 페이저 진행률(px). 네이티브 드라이버 — 캡슐 **위치**용. */
  progressX?: Animated.Value;
  /** 같은 진행률의 JS 드라이버 사본 — 캡슐 **색**용 (색은 네이티브가 못 다룹니다). */
  progressJS?: Animated.Value;
  /** 한 페이지 폭. progressX 를 탭 인덱스로 환산하는 데 씁니다. */
  pageWidth?: number;
}

export function RealsTabBar({ state, navigation, progressX, progressJS, pageWidth }: RealsTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  /**
   * 탭바가 기기 제스처 바 위에 겹치면 터치가 씹힙니다.
   * 높이를 고정하지 않고 안전영역만큼 늘린 뒤 그만큼 아래 여백을 줍니다.
   * insets.bottom 은 제스처 기기에서 20~34, 버튼 방식이면 0 이라 최소 8 은 확보합니다.
   */
  const bottomInset = Math.max(insets.bottom, space[2]);
  /* 홈이 영상을 안 자르려고 잠깐 치워 둔 상태인지 — ui/ChromeContext.tsx */
  const { hidden } = useChrome();
  const tabWidth = width / state.routes.length;
  const capsuleW = sizing.tabCapsuleWidth;

  /**
   * 페이저가 진행률을 주면 그걸 따르고(손가락과 같은 프레임),
   * 없으면 인덱스 변화에 스프링으로 붙습니다. 둘 다 지원해야
   * 탭바를 페이저 밖에서도 쓸 수 있습니다.
   */
  const fallback = useRef(new Animated.Value(state.index)).current;
  const driven = !!progressX && !!pageWidth;
  useEffect(() => {
    if (driven) return;
    Animated.spring(fallback, {
      toValue: state.index,
      ...motion.spring.capsule,
      useNativeDriver: true,
    }).start();
  }, [state.index, fallback, driven]);

  // interpolate 는 입력이 2개 이상이어야 합니다. 탭이 하나면 캡슐을 고정합니다.
  const canInterpolate = state.routes.length > 1;
  const baseX = tabWidth / 2 - capsuleW / 2;

  /** 캡슐 위치 — 네이티브 드라이버(transform). */
  const capsuleX = driven
    ? progressX!.interpolate({
        // 페이지 폭만큼 스크롤하면 캡슐은 탭 한 칸만큼 이동합니다 (선형이라 두 점이면 충분).
        inputRange: [0, pageWidth!],
        outputRange: [baseX, baseX + tabWidth],
      })
    : fallback.interpolate({
        inputRange: [0, 1],
        outputRange: [baseX, baseX + tabWidth],
      });

  /**
   * 캡슐 색 — JS 드라이버. 관심목록에 가까울수록 빨강으로 보간됩니다.
   * 진행률이 없으면 보간할 게 없으므로 현재 탭 색을 그대로 씁니다.
   */
  const colorRange = state.routes.map((r) =>
    TAB_META[r.name]?.accent === 'heart' ? HEART_RGB : BRAND_RGB
  );
  const capsuleColor =
    driven && progressJS && canInterpolate
      ? progressJS.interpolate({
          inputRange: state.routes.map((_, i) => i * pageWidth!),
          outputRange: colorRange,
        })
      : colorRange[state.index] ?? BRAND_RGB;

  return (
    /*
      🔴 **치워지면 아이콘 줄만 접습니다** (2026-08-30, 홈 영상 잘림 대책).

      아래 안전영역(`bottomInset`)은 **남깁니다** — 홈 인디케이터 자리라 영상이
      그 밑으로 들어가면 안 됩니다. 접는 건 아이콘 줄 49 뿐입니다.
      `wrap` 에 `overflow: 'hidden'` 이 있어 안쪽 줄은 그대로 두고 높이만 줄여도
      깔끔하게 잘립니다. 근거와 산수는 `ui/ChromeContext.tsx` 머리말.
    */
    <View
      style={[
        styles.wrap,
        {
          height: (hidden ? 0 : sizing.tabRowHeight) + bottomInset,
          paddingBottom: bottomInset,
          borderTopWidth: hidden ? 0 : theme.border.hairline,
        },
      ]}
    >
      <BlurView intensity={32} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.glass]} />

      {/*
        ⚠️ 접을 때는 **줄을 아예 그리지 않습니다.** 높이만 0 으로 두면 가운데
           정렬된 아이콘이 위아래로 삐져나와 반쪽이 남습니다(실제로 그렇게 나왔습니다).
      */}
      <View style={[styles.row, hidden && styles.rowGone]}>
        {/*
          ⚠️ 위치(네이티브)와 색(JS)을 **한 노드에 같이 두면 RN 이 예외를 냅니다.**
             바깥이 움직이고 안쪽이 색을 칠하도록 두 겹으로 나눕니다.
        */}
        <Animated.View
          pointerEvents="none"
          style={[styles.capsule, { transform: [{ translateX: capsuleX }] }]}
        >
          <Animated.View style={[styles.capsuleFill, { backgroundColor: capsuleColor }]} />
        </Animated.View>

        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name] ?? { glyph: 'home' as TabGlyphName, label: route.name };
          const focused = state.index === index;
          const tint = focused
            ? meta.accent === 'heart'
              ? color.danger[500]
              : color.brand[600]
            : color.ink[500];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (focused || event.defaultPrevented) return;
            /**
             * 라이브러리 기본 탭바와 같은 방식입니다.
             * navigate(name) 은 라우트 이름을 리터럴 유니온으로 요구해서 런타임 순회와
             * 맞지 않습니다. merge:true 라야 탭 안에 쌓인 스택 상태가 보존됩니다.
             */
            navigation.dispatch({
              ...CommonActions.navigate({ name: route.name, merge: true }),
              target: state.key,
            });
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          /*
            코치마크가 짚을 이름표. 시안 `data-coach="tab-home"` 과 같은 이름입니다.
            라우트 이름(HomeFeed…)과 시안 이름(tab-home…)이 달라 여기서 잇습니다.
          */
          const coachName = COACH_TAB[route.name];

          const button = (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              // 라벨을 화면에서 뺐으므로 이름은 여기로 옮깁니다.
              accessibilityLabel={meta.label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              <TabIcon
                glyph={meta.glyph}
                focused={focused}
                tint={tint}
                // 시안: 채움은 관심목록 탭이 활성일 때만
                filled={focused && meta.accent === 'heart'}
                size={meta.size}
              />
            </Pressable>
          );

          return coachName ? (
            <CoachTarget key={route.key} name={coachName} style={styles.tabWrap}>
              {button}
            </CoachTarget>
          ) : (
            button
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: theme.border.hairline,
    borderTopColor: color.hairlineSoft,
    overflow: 'hidden',
  },
  glass: { backgroundColor: 'rgba(255,255,255,0.9)' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rowGone: { display: 'none' },
  capsule: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: sizing.tabCapsuleWidth,
    height: sizing.tabCapsuleHeight,
  },
  capsuleFill: { flex: 1, borderRadius: radius.pill },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  /* 코치마크 이름표 상자 — 버튼이 차지하던 자리를 그대로 물려받습니다. */
  tabWrap: { flex: 1, alignSelf: 'stretch' },
});

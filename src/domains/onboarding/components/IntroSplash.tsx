/**
 * IntroSplash — 시안 `SplashScreen` (`js/screens-onboarding.jsx:4`).
 *
 * **앱을 켤 때마다 짧게 지나가는 화면**입니다. 로고가 숨 쉬듯 커졌다 작아지고,
 * 그 아래 한 줄이 살짝 떠오릅니다. 2.2초 뒤 알아서 넘어가고, 누르면 바로 넘어갑니다.
 *
 * 시안 원문
 * ```jsx
 * uE(() => { const t = setTimeout(first, 2200); return () => clearTimeout(t); }, []);
 * <button className="flex flex-1 flex-col items-center justify-center gap-3">
 *   <div style={{ animation: "splash-pulse 2s ease-in-out infinite" }}><RealsLogo size={44} /></div>
 *   <p className="text-[14px] font-medium text-slate-muted rise-in" style={{ animationDelay: ".4s" }}>
 *     소상공인을 위한 AI 숏폼 스튜디오</p>
 * </button>
 * ```
 * ```css
 * @keyframes splash-pulse{0%,100%{transform:scale(.94);opacity:.6}50%{transform:scale(1);opacity:1}}
 * @keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
 * .rise-in{animation:rise .3s cubic-bezier(.16,1,.3,1) both}
 * ```
 *
 * ⚠️ 시안은 이 화면에서 `auth` 로 갑니다. 우리는 **넘어갈 곳을 부르는 쪽이 정합니다** —
 *    이미 로그인한 분은 로그인 화면으로 보내면 안 되기 때문입니다. 그래서 화면이 아니라
 *    `App.tsx` 가 네비게이터 앞에 덮는 **덮개**입니다. 켤 때마다 뜨는 것도 그래서입니다.
 *
 * ⚠️ 반복 애니는 `useNativeDriver: false` 입니다 — `Animated.loop` 는 반복을 네이티브
 *    모듈에 맡기는데 웹에는 그게 없어 **한 바퀴만 돌고 멈춥니다** (CLAUDE.md §5-④).
 *    시계는 **하나**입니다. 둘로 쪼개면 서로 어긋납니다.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { RealsLogo } from '../../../ui/RealsLogo';
import theme, { color, space } from '../../../design/theme';

/** 시안 `setTimeout(first, 2200)`. */
export const INTRO_MS = 2200;

export function IntroSplash({
  onDone,
  /** 폰트가 아직이면 한 줄을 감춥니다 — 없는 패밀리로 그리면 글자가 잠깐 깨집니다. */
  showTagline = true,
}: {
  onDone: () => void;
  showTagline?: boolean;
}) {
  /** 0 → 2 를 2초에 도는 시계 하나. 1 이 한가운데(가장 큼)입니다. */
  const pulse = useRef(new Animated.Value(0)).current;
  /** rise-in — 한 번짜리라 네이티브 드라이버를 그대로 씁니다. */
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 2,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (!showTagline) return;
    // 시안 animationDelay .4s · rise .3s cubic-bezier(.16,1,.3,1)
    const anim = Animated.timing(rise, {
      toValue: 1,
      delay: 400,
      duration: 300,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [rise, showTagline]);

  useEffect(() => {
    const t = setTimeout(onDone, INTRO_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="시작하기"
      onPress={onDone}
      style={styles.screen}
    >
      <Animated.View
        style={{
          // 시안 splash-pulse: 0%·100% scale .94 / opacity .6 → 50% scale 1 / opacity 1
          opacity: pulse.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, 1, 0.6] }),
          transform: [
            { scale: pulse.interpolate({ inputRange: [0, 1, 2], outputRange: [0.94, 1, 0.94] }) },
          ],
        }}
      >
        <RealsLogo size={44} lineBox={false} />
      </Animated.View>

      {showTagline ? (
        <Animated.View
          style={{
            opacity: rise,
            transform: [
              { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            ],
          }}
        >
          <Text style={styles.tagline}>소상공인을 위한 AI 숏폼 스튜디오</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 시안: bg-canvas · flex-1 가운데 정렬 · gap-3(12)
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    backgroundColor: color.canvas,
  },
  // 시안: 14 · font-medium · slate-muted. leading 이 없어 14 × 1.5 = 21 (CLAUDE.md §5-①)
  tagline: {
    ...theme.text.bodySmall,
    lineHeight: 21,
    fontWeight: '500',
    color: color.ink[500],
  },
});

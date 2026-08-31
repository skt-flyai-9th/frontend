/**
 * TutorialScreen.tsx — 최초 실행 튜토리얼 (시안 `Onboarding.html`).
 *
 * 앱을 **처음 켰을 때 딱 한 번** 보이는 안내 화면입니다. "우리 앱은 이렇게
 * 작동합니다" 를 네 장으로 보여주고 회원가입으로 넘깁니다.
 * 서버에서 받아오는 값이 없습니다 — 문구·삽화가 전부 시안에 박혀 있습니다.
 *
 * 다시 보이지 않게 하는 장치는 `lib/appState.ts` 의 `tutorialSeen` 입니다.
 * 어느 경로로 나가든(다음·건너뛰기 후 시작) 표시하고 나갑니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 시안과 다른 곳 (의도한 것)
 * ─────────────────────────────────────────────────────────────
 * ① 마지막 버튼이 **토스트 대신 실제 회원가입 이동**입니다.
 *    시안의 "회원가입으로 이동" 토스트는 갈 곳이 없는 시안에서 동작을
 *    글로 대신 보여준 것입니다. 앱에는 갈 곳이 있으므로 실제로 갑니다.
 * ② 카피 **A안만** 넣었습니다. 시안에 B·C안이 들어 있지만 고르는 토글 UI 가
 *    DOM 에 없고(`data-vbtn` 핸들러만 남아 있습니다) 기본값이 A 입니다.
 * ③ 애니메이션이 0% 부터 재생됩니다 — 이유는 `components/TutorialArt.tsx` 첫머리.
 *
 * ⚠️ 시안 04번 화면은 제목이 A/B/C 컨테이너 **밖으로 빠져 있습니다**(편집 중
 *    어긋난 흔적). B·C 를 골라도 A 의 제목이 남아 두 개가 겹칩니다.
 *    A 안이 기준이므로 그 제목을 04 의 제목으로 옮겨 적었습니다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Screen } from '../../../ui/Screen';
import { pressTap } from '../../../ui/press';
import { color, motion, radius, space, text } from '../../../design/theme';
import { useAppState } from '../../../lib/appState';
import type { RootStackParamList } from '../../../navigation/types';
import { Art01, Art02, Art03, Art04, Art05 } from '../components/TutorialArt';

/* ────────────────────────────────────────────────────────────
 * 내용 — 시안 A안 원문 그대로
 * ──────────────────────────────────────────────────────────── */

/** 제목 한 조각. `brand` 면 시안에서 파랑으로 강조된 부분입니다. */
type Piece = { t: string; brand?: boolean };

interface Slide {
  /** 시안 `data-screen-label`. 화면을 대조할 때 짝을 찾는 이름입니다. */
  label: string;
  Art: (p: { active: boolean }) => React.JSX.Element;
  title: Piece[];
  caption: string;
  /**
   * 03 만 시안이 **글을 위, 그림을 아래**로 뒤집어 놨습니다
   * (`온보딩최종.html` 의 `03 영상 가이드` 섹션 — `padding-top:6` 인 글 블록이 먼저).
   */
  copyFirst?: boolean;
}

const SLIDES: Slide[] = [
  {
    label: '01 매장 등록',
    Art: Art01,
    title: [{ t: '한 번', brand: true }, { t: ' 입력하면\n준비 끝' }],
    caption: '매장 이름만 검색하면 업종·메뉴 정보가 자동으로 입력돼요.',
  },
  {
    label: '02 AI 대화',
    Art: Art02,
    // 시안 원문의 `AI&nbsp;와` — 줄바꿈으로 갈라지지 않게 붙임공백입니다.
    title: [{ t: 'AI', brand: true }, { t: ' 와 대화하고\n숏폼을 추천 받아요' }],
    caption: '몇 가지 질문에 답하면 사장님 맞춤으로 숏폼을 추천해줘요.',
  },
  {
    label: '03 영상 가이드',
    Art: Art03,
    title: [{ t: '컷마다', brand: true }, { t: ' 어떻게 찍을지\n미리 알려줘요' }],
    caption: '컷마다 가이드 영상을 넘겨보며 촬영 포인트를 쉽게 연습할 수 있어요.',
    // 🔴 이 장만 시안이 **글을 위, 그림을 아래**로 뒤집어 놨습니다.
    copyFirst: true,
  },
  {
    label: '04 자동 편집',
    Art: Art04,
    title: [{ t: '사장님은 ' }, { t: '찍기만,', brand: true }, { t: '\n편집은 자동으로' }],
    caption: '가이드 영상을 보면서 컷마다 촬영하면, AI가 편집해줘요.',
  },
  {
    label: '05 인사이트',
    Art: Art05,
    title: [
      { t: '매장 인사이트', brand: true },
      { t: ' 분석,\n' },
      { t: '다음', brand: true },
      { t: ' 숏폼 추천까지' },
    ],
    caption: '좋아요·조회수·소비층 분석 지표를 제공해줘요.',
  },
];

const LAST = SLIDES.length - 1;

/* ────────────────────────────────────────────────────────────
 * 움직임
 * ──────────────────────────────────────────────────────────── */

/**
 * 시안 페이지 전환 곡선.
 *
 * 시안은 `linear(0, .0322 3.6%, .1091 7.1%, …)` 로 감쇠 스프링을 표본점 29개에
 * 적어 뒀습니다. RN 의 `Easing` 은 **아무 함수나** 받고 네이티브 드라이버에서도
 * 미리 샘플링해 쓰므로, 베지어로 흉내 내지 않고 표본을 그대로 옮겼습니다.
 * 근사치가 아니라 같은 곡선입니다. 표본이 균등 간격(1/28)이라 선형 보간이면 됩니다.
 */
const SPRING_SAMPLES = [
  0, 0.0322, 0.1091, 0.2082, 0.3148, 0.4196, 0.517, 0.6043, 0.6802, 0.7448, 0.7988, 0.8432,
  0.8792, 0.908, 0.9308, 0.9486, 0.9623, 0.9728, 0.9808, 0.9867, 0.991, 0.9941, 0.9964, 0.9979,
  0.999, 0.9997, 1.0001, 1.0004, 1,
];

function springEasing(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const seg = SPRING_SAMPLES.length - 1;
  const p = t * seg;
  const i = Math.floor(p);
  return SPRING_SAMPLES[i] + (SPRING_SAMPLES[i + 1] - SPRING_SAMPLES[i]) * (p - i);
}

/** 시안: `transform 357ms <spring>` */
const SLIDE_MS = 357;

/** 시안 점 전환: `width .3s cubic-bezier(.16,1,.3,1)` */
const DOT_MS = 300;
const DOT_EASING = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * 스와이프 판정값은 전부 토큰입니다 — `motion.pager` 가 시안과 같은 값을
 * 이미 담고 있습니다 (25% · 500px/s · 30°).
 */
const SNAP_RATIO = motion.pager.snapRatio;
/** RN 의 `vx` 는 px/ms 라 초당 값을 1000 으로 나눕니다. */
const SNAP_VELOCITY = motion.pager.snapVelocity / 1000;
/** 시안 `CONE = Math.tan(30 * Math.PI / 180)` — 세로로 더 많이 움직이면 넘기지 않습니다. */
const CONE = Math.tan((motion.pager.gestureCone * Math.PI) / 180);
/** 시안: 손가락이 6px 는 움직여야 방향을 정합니다. */
const DEAD_ZONE = 6;
/** 시안: 양 끝에서 끌면 0.35 만 따라옵니다. */
const RUBBER = 0.35;

/* ────────────────────────────────────────────────────────────
 * 화면
 * ──────────────────────────────────────────────────────────── */

export default function TutorialScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setTutorialSeen = useAppState((s) => s.setTutorialSeen);
  const { width } = useWindowDimensions();

  const [index, setIndex] = useState(0);

  // PanResponder 는 한 번만 만들어지므로 최신 값은 ref 로 읽습니다.
  const indexRef = useRef(0);
  const widthRef = useRef(width);
  const trackX = useRef(new Animated.Value(0)).current;

  const go = useCallback(
    (to: number) => {
      const next = Math.max(0, Math.min(LAST, to));
      indexRef.current = next;
      setIndex(next);
      Animated.timing(trackX, {
        toValue: -next * widthRef.current,
        duration: SLIDE_MS,
        easing: springEasing,
        useNativeDriver: true,
      }).start();
    },
    [trackX]
  );

  // 기기를 돌리면 페이지 폭이 바뀝니다. 트랙을 그 자리에 다시 맞춥니다.
  useEffect(() => {
    widthRef.current = width;
    trackX.setValue(-indexRef.current * width);
  }, [width, trackX]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => {
          // 시안: 6px 데드존 뒤 30° 원뿔로 가로/세로를 가릅니다.
          if (Math.abs(g.dx) + Math.abs(g.dy) < DEAD_ZONE) return false;
          return Math.abs(g.dy) <= Math.abs(g.dx) * CONE;
        },
        onPanResponderMove: (_e, g) => {
          const w = widthRef.current;
          const min = -LAST * w;
          let x = -indexRef.current * w + g.dx;
          // 시안: 양 끝을 넘기면 저항이 걸립니다.
          if (x > 0) x *= RUBBER;
          else if (x < min) x = min + (x - min) * RUBBER;
          trackX.setValue(x);
        },
        onPanResponderRelease: (_e, g) => {
          const w = widthRef.current;
          if (g.dx < -w * SNAP_RATIO || g.vx < -SNAP_VELOCITY) go(indexRef.current + 1);
          else if (g.dx > w * SNAP_RATIO || g.vx > SNAP_VELOCITY) go(indexRef.current - 1);
          else go(indexRef.current);
        },
        // 손가락이 중간에 뺏기면(예: 시스템 제스처) 제자리로 돌립니다.
        onPanResponderTerminate: () => go(indexRef.current),
      }),
    [go, trackX]
  );

  /** 마지막 화면의 "무료로 시작하기". 다시 보이지 않게 표시하고 회원가입으로 갑니다. */
  const start = useCallback(() => {
    setTutorialSeen(true);
    nav.replace('Auth', { screen: 'SignUp' });
  }, [nav, setTutorialSeen]);

  const last = index === LAST;

  return (
    <Screen scroll={false} padded={false} edges={['top']} background={color.canvas}>
      {/* 시안: h-44 · 오른쪽 정렬 · px-20 */}
      <View style={styles.header}>
        <SkipButton hidden={last} onPress={() => go(LAST)} />
      </View>

      <View style={styles.pager} {...pan.panHandlers}>
        <Animated.View
          style={[styles.track, { width: width * SLIDES.length, transform: [{ translateX: trackX }] }]}
        >
          {SLIDES.map((s, i) => (
            <Page key={s.label} slide={s} width={width} active={i === index} />
          ))}
        </Animated.View>
      </View>

      {/*
       * 시안: `linear-gradient(to top,#fff 62%,rgba(255,255,255,0))`.
       * 화면이 짧은 기기에서 삽화가 버튼 영역까지 내려와도 딱 잘리지 않고 흐려집니다.
       */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space[4]) }]}>
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="tutorialFade" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={color.canvas} stopOpacity={1} />
              <Stop offset="0.62" stopColor={color.canvas} stopOpacity={1} />
              <Stop offset="1" stopColor={color.canvas} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#tutorialFade)" />
        </Svg>

        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <Dot key={s.label} step={i} active={i === index} onPress={() => go(i)} />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => (last ? start() : go(index + 1))}
          // 시안 CTA 는 active:scale-[0.97] — 토큰의 card 와 같은 값입니다.
          style={({ pressed }) => [styles.cta, pressTap(pressed, 'card')]}
        >
          <Text style={styles.ctaText}>{last ? '무료로 시작하기' : '다음'}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

/* ────────────────────────────────────────────────────────────
 * 조각
 * ──────────────────────────────────────────────────────────── */

function Page({ slide, width, active }: { slide: Slide; width: number; active: boolean }) {
  const { Art } = slide;

  const copy = (
    <View style={slide.copyFirst ? styles.copyTop : styles.copy}>
      <Text style={styles.title}>
        {slide.title.map((p, i) => (
          <Text key={i} style={p.brand ? styles.titleBrand : undefined}>
            {p.t}
          </Text>
        ))}
      </Text>
      <Text style={styles.caption}>{slide.caption || ' '}</Text>
    </View>
  );

  const art = (
    <View style={[styles.artArea, slide.copyFirst && styles.artAreaLow]}>
      <Art active={active} />
    </View>
  );

  /*
    시안은 장마다 순서가 다릅니다 — 01·02·04·05 는 그림이 위, **03 만 글이 위**
    입니다. 그림 영역이 `flex:1` 이라 순서만 바꾸면 그대로 따라옵니다.
  */
  return (
    <View style={[styles.page, { width }]}>
      {slide.copyFirst ? copy : art}
      {slide.copyFirst ? art : copy}
    </View>
  );
}

function SkipButton({ hidden, onPress }: { hidden: boolean; onPress: () => void }) {
  const fade = useRef(new Animated.Value(1)).current;

  // 시안: `transition: opacity .22s ease` — 마지막 화면에서 사라집니다.
  useEffect(() => {
    Animated.timing(fade, {
      toValue: hidden ? 0 : 1,
      duration: motion.fade,
      // CSS `ease` = cubic-bezier(.25,.1,.25,1). RN 의 Easing.ease 는 다른 곡선이라 직접 적습니다.
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start();
  }, [hidden, fade]);

  return (
    <Animated.View style={{ opacity: fade }} pointerEvents={hidden ? 'none' : 'auto'}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="건너뛰기"
        onPress={onPress}
        style={({ pressed }) => [styles.skip, pressTap(pressed, 'button')]}
      >
        <Text style={styles.skipText}>건너뛰기</Text>
      </Pressable>
    </Animated.View>
  );
}

function Dot({ step, active, onPress }: { step: number; active: boolean; onPress: () => void }) {
  const on = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(on, {
      toValue: active ? 1 : 0,
      duration: DOT_MS,
      easing: DOT_EASING,
      // 폭이 레이아웃 속성이라 네이티브 드라이버를 못 씁니다. 색도 같은 노드라 함께 JS 입니다.
      useNativeDriver: false,
    }).start();
  }, [active, on]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${step + 1}단계`}
      accessibilityState={{ selected: active }}
      hitSlop={10}
      onPress={onPress}
    >
      {/* 시안: 활성 20×6 브랜드색 · 비활성 6×6 회색 */}
      <Animated.View
        style={[
          styles.dot,
          {
            width: on.interpolate({ inputRange: [0, 1], outputRange: [6, 20] }),
            backgroundColor: on.interpolate({
              inputRange: [0, 1],
              outputRange: [color.ink[300], color.brand[600]],
            }),
          },
        ]}
      />
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────
 * 값 — `Onboarding.html` 실측입니다.
 *
 * 이 화면은 시안이 크기를 직접 지정한 곳이 많아(제목 32, 버튼 16.5) 토큰을
 * 덮습니다. 덮은 자리마다 시안 원문 값을 주석에 남겼습니다 (CLAUDE.md §6).
 * ──────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  // 시안: h-44 · justify-end · px-20 (그 위 54 는 상태바 — SafeAreaView 가 먹습니다)
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: space[5],
  },
  // 시안: h-32 · px-10
  skip: { height: 32, paddingHorizontal: 10, justifyContent: 'center' },
  // 시안: 14 · 600 · -.01em · #64748B
  skipText: {
    ...text.subheading,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: color.ink[500],
  },

  pager: { flex: 1, overflow: 'hidden' },
  track: { flexDirection: 'row', height: '100%' },

  // 시안: px-34
  page: { height: '100%', paddingHorizontal: 34 },
  // 시안: flex-1 · 가운데 정렬 · min-h-0
  artArea: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 },
  // 시안 03: 그림이 아래라 버튼 자리만큼(130) 띄웁니다
  artAreaLow: { paddingBottom: 130 },
  /*
   * 시안: pb-150.
   * 아래 버튼 영역이 138(점 36 + 12 + 버튼 56 + 하단 34)이라 그 위로 12 를 띄웁니다.
   */
  copy: { paddingBottom: 150 },
  // 시안 03: 글이 위 — pt-6
  copyTop: { paddingTop: 6 },
  // 시안: 32 · 700 · line-height 1.24 · -.028em
  // (CLAUDE.md §5-① 의 ×1.5 규칙은 시안에 line-height 가 **없을 때**입니다. 여기는 명시돼 있습니다.)
  title: { ...text.display, fontSize: 32, lineHeight: 39.68, letterSpacing: -0.9 },
  titleBrand: { color: color.brand[600] },
  // 시안: 14 · 500 · line-height 1.5 · #64748B · margin-top 12
  caption: {
    ...text.caption,
    fontSize: 14,
    lineHeight: 21,
    color: color.ink[500],
    marginTop: space[3],
  },

  // 시안: absolute inset-x-0 bottom-0 · px-34 · pb-34
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 34 },
  // 시안: h-36 · gap-6
  dots: { flexDirection: 'row', alignItems: 'center', gap: space[1.5], height: 36 },
  dot: { height: 6, borderRadius: radius.pill },
  /*
    시안 `온보딩최종.html`: h-52 · radius 14 · #2563EB · margin-top 12
    (예전 시안은 h-56 · radius 999 · #0F172A 였습니다 — 새 시안에서 바뀌었습니다)
  */
  cta: {
    height: 52,
    marginTop: space[3],
    borderRadius: 14,
    backgroundColor: color.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시안: 16 · 600 · -.01em
  ctaText: {
    ...text.display,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.16,
    color: color.paper,
  },
});

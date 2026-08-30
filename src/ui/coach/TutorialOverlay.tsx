/**
 * TutorialOverlay — **화면을 가리지 않고 짚어 주는 안내 오버레이.**
 *
 * 단계 목록(`TutorialStep[]`)만 주면 어느 화면에서든 씁니다. 홈 코치마크가 첫
 * 사용처이고(`CoachMarks.tsx`), 나중에 편집·촬영 화면에 안내를 붙일 때도 이걸 씁니다 —
 * 그때 이 파일을 고치는 게 아니라 **단계 목록만 새로 씁니다.**
 *
 * ─────────────────────────────────────────────────────────────
 * 구조
 * ─────────────────────────────────────────────────────────────
 *   tutorialTheme.ts   값(색·블러·여백)          — 디자인팀 요청서
 *   TutorialOverlay    그리는 일 전부            — 이 파일
 *   CoachMarks.tsx     "홈 튜토리얼은 7단계"     — 단계 목록 + 언제 뜰지
 *
 * 짚을 곳은 `CoachTarget` 이 이름표로 등록합니다(`CoachContext.tsx`).
 *
 * ─────────────────────────────────────────────────────────────
 * ⚠️ 구멍은 **마스크가 아니라 네모 여덟 개**입니다
 * ─────────────────────────────────────────────────────────────
 * 웹 시안은 CSS 마스크로 구멍을 뚫습니다. RN 에서 같은 걸 하려면 `react-native-svg`
 * 의 `Mask` 인데, 안드로이드에서 **화면 크기 비트맵을 따로 떠서** 그립니다. 구멍이
 * 미끄러지는 280ms 동안 그걸 매 프레임 다시 떠서 눈에 띄게 끊겼습니다
 * (2026-08-29 사장님 지적, 세 번에 걸쳐 고침).
 *
 * 그래서 구멍 **바깥**을 채웁니다.
 *   · 위·아래·왼·오른 네 장  → 네모난 구멍
 *   · 모서리 네 조각        → 둥근 구멍
 *
 * 모서리 조각은 네모난 귀퉁이와 둥근 호 사이의 **오목한 초승달**입니다. borderRadius
 * 는 귀퉁이를 깎아내는 것이라 볼록한 모양만 남아서, 그걸로 만들면 정확히 반대가
 * 칠해집니다(2026-08-29 "안쪽으로 파먹은 모양"). 대신 **두꺼운 테두리**로 만듭니다 —
 * 4R×4R 에 모서리 2R·두께 R 을 주면 안쪽 반지름 R, 바깥 반지름 2R 짜리 고리가 되고,
 * 안쪽 구멍을 구멍의 모서리 호에 겹쳐 R×R 상자로 잘라내면 초승달만 남습니다.
 *
 * ⚠️ 조각끼리 **겹치면 안 됩니다.** 반투명이라 겹친 곳만 두 배로 진해집니다.
 *
 * ─────────────────────────────────────────────────────────────
 * ⚠️ 블러 — 켜는 시점과 안드로이드에서 조용히 꺼지는 함정
 * ─────────────────────────────────────────────────────────────
 * 요청서는 배경에 `blur(14px)` 를 씁니다.
 *
 * **안드로이드는 흐릴 대상을 지정해야 켜집니다.** 안 주면 예외도 없이 색만 덮습니다
 * — `blurTarget.ts` 머리말에 소스와 함께 적어 뒀습니다. 두 번 놓쳤던 자리입니다.
 *
 * **켜는 시점**은 셋으로 갈립니다.
 *   · 처음 뜰 때        바로 켭니다. 미끄러질 곳이 없어 기다릴 이유가 없습니다.
 *   · 빠른 기기         계속 켜 둡니다(안드로이드 12+ · iOS · 웹).
 *   · 느린 기기의 이동  잠깐 끄고 멈추면 걸쳐 올립니다 — 비트맵을 매 프레임 뜨면
 *                       어제 걷어낸 그 비용이 그대로 돌아옵니다.
 * 가르는 값은 `tutorialTheme.ts` 의 `BLUR_WHILE_MOVING` 입니다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCoach, type CoachName } from './CoachContext';
import { ANDROID_BLUR_METHOD, BLUR_WHILE_MOVING, TUTORIAL } from './tutorialTheme';
import { blurTargetRef } from './blurTarget';
import { pressTap } from '../press';
import theme, { color } from '../../design/theme';

/** 다이아몬드가 붙는 자리. 카드에서 **타겟을 향한 쪽**입니다. */
export type PointerPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * 단계 하나.
 *
 * ⚠️ 요청서에는 `step` · `totalSteps` 가 필수로 적혀 있는데 **선택으로 두었습니다.**
 *    배열 순서에서 그대로 나오는 값이라 손으로 적으면 언젠가 어긋납니다 — 중간에 한
 *    단계를 끼우면 그 아래를 전부 고쳐야 하고, 안 고치면 화면에 `3/7` 이 두 번 뜹니다.
 *    기본은 배열에서 세고, 정말 다르게 보여야 할 때만 덮어씁니다.
 */
export interface TutorialStep {
  /** 짚을 곳의 이름표 — `<CoachTarget name="...">` 와 같아야 합니다. */
  targetId: CoachName;
  title: string;
  description: string;
  /** 안 주면 자리를 보고 알아서 정합니다(위/아래 중 들어가는 쪽). */
  pointerPosition?: PointerPosition;
  /** 짚을 곳 둘레 여백. 화면 밖으로 나가면 양쪽에서 같이 줄입니다. */
  pad?: number;
  /**
   * 잰 자리를 **안쪽으로 좁힙니다.** 여백(`pad`)의 반대입니다.
   *
   * 탭 버튼이 그렇습니다 — 이름표는 칸 전체(98)에 붙어 있는데, 정작 짚고 싶은 건
   * 가운데 아이콘입니다. 칸째로 뚫으면 넓고 납작해서 **모서리가 각져 보입니다**
   * (2026-08-30 지시 ⑧: "포커싱되는 부분 경계 미세한 수정 필수. 둥글게!").
   * 좁혀서 뚫으면 같은 반지름이라도 훨씬 둥글게 읽힙니다.
   */
  inset?: { x?: number; y?: number };
  /** 구멍 모서리. `999` 면 완전한 원입니다. */
  radius?: number;
  /** 이 단계로 넘어갈 때 호스트에게 알릴 값 — 탭 이동 등에 씁니다. */
  meta?: unknown;
  /** 손으로 덮고 싶을 때만 (위 주석) */
  step?: number;
  totalSteps?: number;
}

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);

/** 45° 돌린 정사각형의 중심에서 꼭짓점까지 */
const HALF_DIAGONAL = TUTORIAL.pointer.size * Math.SQRT1_2;

/**
 * 막 + 구멍. **일부러 따로 떼어 `memo` 로 감쌌습니다.**
 *
 * 오버레이 본체는 위치를 다시 잴 때마다 그려집니다. 그때 이 여덟 장까지 같이 그리면
 * 튜토리얼이 도는 내내 끕니다. 받는 값이 전부 고정된 것들(`Animated.Value` 그릇)이라
 * 여기는 **한 번만** 그려지고, 구멍이 움직이는 건 그릇 안 숫자로만 처리됩니다.
 *
 * 🔴 **구멍이 없을 때도 같은 여덟 장을 씁니다** (2026-08-30, 블러 딜레이).
 *
 *    예전에는 아직 못 쟀을 때 "막 한 장" 을 따로 그리고, 측정이 끝나면 그걸 버리고
 *    여덟 장을 새로 달았습니다. 그 순간 **BlurView 가 통째로 다시 붙습니다** — 대상을
 *    다시 찾고 처음부터 흐려야 해서, 화면이 뜬 뒤 한 박자 늦게 흐려졌습니다.
 *    (`BlurView` 는 `componentDidMount` 에서 `blurTargetId` 를 state 로 넣기 때문에
 *     붙을 때마다 최소 한 프레임은 대상 없이 그려집니다.)
 *
 *    값이 전부 0 이면 아래 장이 화면을 통째로 덮습니다 — 구멍 없는 막과 같은 그림이
 *    나오고, 나중에 구멍이 잡혀도 **같은 판을 옮길 뿐** 다시 만들지 않습니다.
 */
const Scrim = React.memo(function Scrim({
  ax,
  ay,
  aw,
  ah,
  ar,
  blurOn,
  blurOpacity,
}: {
  ax: Animated.Value;
  ay: Animated.Value;
  aw: Animated.Value;
  ah: Animated.Value;
  ar: Animated.Value;
  blurOn: boolean;
  blurOpacity: Animated.Value;
}) {
  const right = Animated.add(ax, aw);
  const bottom = Animated.add(ay, ah);
  const cornerX = Animated.subtract(right, ar);
  const cornerY = Animated.subtract(bottom, ar);
  /* 고리 — 바깥 4R, 모서리 2R, 두께 R. 안쪽 구멍이 반지름 R 이 됩니다(머리말). */
  const ringSize = Animated.multiply(ar, 4);
  const ringRadius = Animated.multiply(ar, 2);
  const negR = Animated.multiply(ar, -1);
  const neg2R = Animated.multiply(ar, -2);

  /** 딤 + (멈춰 있으면) 블러. 네 장이 같은 몸을 씁니다. */
  const bar = (key: string, style: Animated.WithAnimatedObject<object>) => (
    <Animated.View key={key} style={[styles.piece, style]}>
      {blurOn ? (
        <AnimatedBlur
          intensity={TUTORIAL.backdrop.blurIntensity}
          tint={TUTORIAL.backdrop.tint}
          // 안드로이드는 이걸 안 주면 흐려지지 않고 색만 덮입니다(tutorialTheme 머리말)
          blurMethod={ANDROID_BLUR_METHOD}
          // 안드로이드는 흐릴 대상을 지정해야 켜집니다 (blurTarget.ts 머리말)
          blurTarget={blurTargetRef}
          style={[StyleSheet.absoluteFill, { opacity: blurOpacity }]}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
    </Animated.View>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      {/* 구멍 안을 눌러도 아래 화면이 안 눌리게 받아 둡니다(색 없는 판). */}
      <View style={StyleSheet.absoluteFill} />

      {bar('top', { left: 0, right: 0, top: 0, height: ay })}
      {bar('bottom', { left: 0, right: 0, top: bottom, bottom: 0 })}
      {bar('left', { left: 0, top: ay, width: ax, height: ah })}
      {bar('right', { left: right, right: 0, top: ay, height: ah })}

      {/*
        모서리 네 곳. R×R 로 잘라낸 상자 안에 고리를 하나씩 넣고, 고리의 **안쪽 구멍**을
        구멍의 모서리 호에 겹쳐 둡니다 — 남는 초승달만 칠해집니다. 고리 자리는 안쪽
        구멍의 중심이 상자의 **구멍 쪽 귀퉁이**에 오도록 밀어 넣은 값입니다.
      */}
      <Animated.View style={[styles.clip, { left: ax, top: ay, width: ar, height: ar }]}>
        <Animated.View
          style={[
            styles.ringPiece,
            { left: negR, top: negR, width: ringSize, height: ringSize, borderRadius: ringRadius, borderWidth: ar },
          ]}
        />
      </Animated.View>
      <Animated.View style={[styles.clip, { left: cornerX, top: ay, width: ar, height: ar }]}>
        <Animated.View
          style={[
            styles.ringPiece,
            { left: neg2R, top: negR, width: ringSize, height: ringSize, borderRadius: ringRadius, borderWidth: ar },
          ]}
        />
      </Animated.View>
      <Animated.View style={[styles.clip, { left: ax, top: cornerY, width: ar, height: ar }]}>
        <Animated.View
          style={[
            styles.ringPiece,
            { left: negR, top: neg2R, width: ringSize, height: ringSize, borderRadius: ringRadius, borderWidth: ar },
          ]}
        />
      </Animated.View>
      <Animated.View style={[styles.clip, { left: cornerX, top: cornerY, width: ar, height: ar }]}>
        <Animated.View
          style={[
            styles.ringPiece,
            { left: neg2R, top: neg2R, width: ringSize, height: ringSize, borderRadius: ringRadius, borderWidth: ar },
          ]}
        />
      </Animated.View>
    </View>
  );
});

export function TutorialOverlay({
  steps,
  visible,
  onFinish,
  onEnterStep,
}: {
  steps: TutorialStep[];
  visible: boolean;
  /** 건너뛰기·완료. 다시 안 뜨게 하는 일은 호스트가 합니다. */
  onFinish: () => void;
  /** 단계가 바뀔 때. 탭을 옮겨야 하면 여기서 합니다. */
  onEnterStep?: (step: TutorialStep, index: number) => void;
}) {
  const coach = useCoach();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = Dimensions.get('window');

  const [index, setIndex] = useState(0);
  /** 말풍선을 한 번 그려 보고 잰 실제 높이. 0 이면 아직 못 잰 것입니다. */
  const [tipH, setTipH] = useState(0);
  /** 블러를 켤 때가 됐는가. 느린 기기에서만 이동 중에 잠깐 꺼집니다(`BLUR_WHILE_MOVING`). */
  const [settled, setSettled] = useState(true);
  /** 처음 뜨는 순간인가 — 그때는 기다리지 않습니다. */
  const firstShow = useRef(true);

  const cur = visible ? steps[index] : undefined;
  const total = cur?.totalSteps ?? steps.length;
  const shown = cur?.step ?? index + 1;
  const last = index === steps.length - 1;

  /* 지금 짚는 곳 하나와 **다음에 짚을 곳**만 잽니다(미리 재 두기 — CoachContext). */
  useEffect(() => {
    coach?.setActive(cur ? cur.targetId : null, visible ? (steps[index + 1]?.targetId ?? null) : null);
  }, [coach, cur?.targetId, visible, index, steps]);

  /** 위치가 바뀌면 **이 컴포넌트만** 다시 그립니다. */
  const [, redraw] = useState(0);
  useEffect(() => {
    if (!coach) return;
    return coach.subscribe(() => redraw((n) => n + 1));
  }, [coach]);

  /** 단계가 바뀌면 호스트에게 알립니다 — 탭 이동은 호스트 몫입니다. */
  useEffect(() => {
    if (!cur) return;
    onEnterStep?.(cur, index);
    // onEnterStep 은 매번 새로 만들어질 수 있어 의존성에서 뺍니다 — 단계가 기준입니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.targetId]);

  /*
    블러를 켜는 시점.

    · 처음 뜰 때        → **바로** 켭니다. 미끄러질 곳이 없어 기다릴 이유가 없습니다.
    · 빠른 기기         → 계속 켜 둡니다(`BLUR_WHILE_MOVING`).
    · 느린 기기의 이동  → 잠깐 끄고, 멈추면 걸쳐 올립니다.
  */
  const blurOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!visible) {
      firstShow.current = true;
      return;
    }
    if (BLUR_WHILE_MOVING || firstShow.current) {
      firstShow.current = false;
      blurOpacity.setValue(1);
      setSettled(true);
      return;
    }
    setSettled(false);
    blurOpacity.setValue(0);
    const t = setTimeout(() => setSettled(true), TUTORIAL.motion.moveMs + 40);
    return () => clearTimeout(t);
  }, [index, visible, blurOpacity]);
  useEffect(() => {
    if (!settled) return;
    Animated.timing(blurOpacity, {
      toValue: 1,
      duration: TUTORIAL.motion.blurFadeMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [settled, blurOpacity]);

  const rect = cur ? coach?.rectsRef.current[cur.targetId] : undefined;

  /**
   * 직전 구멍. 다음 자리를 아직 못 쟀을 때 **그 자리를 그대로 붙들어 둡니다.**
   * 안 그러면 구멍이 한 번 사라졌다가 새 자리에 나타나 — 미끄러지는 게 아니라
   * 깜빡이는 것으로 보입니다.
   */
  const held = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  /**
   * 구멍 = 짚을 곳 + 여백.
   *
   * 🔴 **화면 안으로 밀어 넣지 않습니다 — 여백을 양쪽에서 똑같이 줄입니다.**
   *    `x` 를 0 아래로 못 가게 막고 폭을 그대로 두면 구멍이 통째로 옆으로 밀립니다.
   *    맨 왼쪽·맨 오른쪽 탭에서 8pt·4pt 씩 쏠렸습니다(2026-08-29 실측).
   *    시안은 아예 안 자르지만(원문 4029행) 잘리는 것도 원치 않으셔서, 나가는 쪽만큼
   *    여백을 양쪽에서 같이 줄입니다. 중앙도 맞고 화면 밖으로도 안 나갑니다.
   */
  const hole = useMemo(() => {
    if (!cur) return null;
    if (!rect) return held.current;
    /* 먼저 안쪽으로 좁히고(`inset`), 그 다음 바깥으로 여백을 줍니다(`pad`). */
    const ix = Math.min(cur.inset?.x ?? 0, rect.w / 2 - 8);
    const iy = Math.min(cur.inset?.y ?? 0, rect.h / 2 - 8);
    const box = {
      x: rect.x + Math.max(0, ix),
      y: rect.y + Math.max(0, iy),
      w: rect.w - Math.max(0, ix) * 2,
      h: rect.h - Math.max(0, iy) * 2,
    };

    const pad = cur.pad ?? 0;
    const padX = Math.max(0, Math.min(pad, box.x, winW - (box.x + box.w)));
    const padY = Math.max(0, Math.min(pad, box.y, winH - (box.y + box.h)));
    const x = Math.max(0, box.x - padX);
    const y = Math.max(0, box.y - padY);
    return {
      x,
      y,
      w: Math.max(0, Math.min(winW - x, box.w + padX * 2)),
      h: Math.max(0, Math.min(winH - y, box.h + padY * 2)),
    };
  }, [cur, rect, winW, winH]);

  useEffect(() => {
    held.current = hole;
  }, [hole]);

  /*
    구멍이 다음 자리로 **미끄러져 갑니다** (시안 transition .28s).
    자리·크기·모서리를 한 시계로 함께 움직여야 도중에 모양이 어긋나지 않습니다.
    ⚠️ 레이아웃 값이라 네이티브 드라이버를 못 씁니다(CLAUDE.md §5-④ 의 loop 함정과는
       다른 이야기입니다 — 한 번짜리 timing 이라 무관합니다).
  */
  const ax = useRef(new Animated.Value(0)).current;
  const ay = useRef(new Animated.Value(0)).current;
  const aw = useRef(new Animated.Value(0)).current;
  const ah = useRef(new Animated.Value(0)).current;
  const ar = useRef(new Animated.Value(0)).current;
  /** 첫 등장은 미끄러질 곳이 없습니다 — 그 자리에 바로 놓습니다. */
  const placed = useRef(false);

  const targetRadius =
    cur && hole ? ((cur.radius ?? 0) === 999 ? Math.max(hole.w, hole.h) / 2 : cur.radius ?? 0) : 0;

  useEffect(() => {
    if (!hole) return;
    const to = [
      [ax, hole.x],
      [ay, hole.y],
      [aw, hole.w],
      [ah, hole.h],
      [ar, targetRadius],
    ] as const;
    if (!placed.current) {
      to.forEach(([v, n]) => v.setValue(n));
      placed.current = true;
      return;
    }
    Animated.parallel(
      to.map(([v, n]) =>
        Animated.timing(v, {
          toValue: n,
          duration: TUTORIAL.motion.moveMs,
          easing: Easing.bezier(...TUTORIAL.motion.bezier),
          useNativeDriver: false,
        })
      )
    ).start();
  }, [hole?.x, hole?.y, hole?.w, hole?.h, targetRadius]);

  /** 말풍선은 단계가 바뀔 때마다 떠오릅니다 (시안 pop-in). */
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    pop.setValue(0);
    Animated.timing(pop, {
      toValue: 1,
      duration: TUTORIAL.motion.popMs,
      easing: Easing.bezier(...TUTORIAL.motion.bezier),
      useNativeDriver: true,
    }).start();
  }, [index, pop]);

  /** 튜토리얼이 닫히면 다음에 처음부터 다시 시작합니다. */
  useEffect(() => {
    if (visible) return;
    setIndex(0);
    placed.current = false;
  }, [visible]);

  const next = useCallback(() => {
    if (last) onFinish();
    else setIndex((i) => i + 1);
  }, [last, onFinish]);

  if (!visible || !cur) return null;

  /*
    🔴 **말풍선 자리는 "구멍이 위냐 아래냐" 가 아니라 "들어갈 자리가 있느냐" 로 정합니다.**

    시안은 `hole.y < 340` 이면 아래에 둡니다. 그런데 영상 단계는 구멍이 화면을 거의 다
    차지해서, 아래에 남은 자리가 없는데도 아래에 두어 **버튼이 화면 밖으로 밀려났습니다**
    (2026-08-29). 위·아래 남은 자리를 재서 들어가는 쪽에 둡니다. 둘 다 모자라면 화면
    아래에 붙입니다 — 구멍을 조금 가려도 버튼이 보이는 쪽이 낫습니다.

    🔴 **높이는 어림수가 아니라 잰 값입니다.** 200 으로 찍어 두면 글자 크기를 크게 쓰시는
       분 화면에서 그만큼 버튼이 밖으로 밀립니다.
  */
  const TIP_H = tipH || 200;
  const EDGE = Math.max(TUTORIAL.card.margin, insets.bottom + 8);
  const GAP = TUTORIAL.card.gap;
  const roomBelow = hole ? winH - (hole.y + hole.h) - GAP : 0;
  const roomAbove = hole ? hole.y - GAP : 0;

  const below = !hole ? false : roomBelow >= TIP_H ? true : roomAbove >= TIP_H ? false : false;
  const wanted = !hole
    ? winH - TIP_H - EDGE
    : below
      ? hole.y + hole.h + GAP
      : roomAbove >= TIP_H
        ? hole.y - TIP_H - GAP
        : winH - TIP_H - EDGE;
  const tipTop = Math.max(EDGE, Math.min(wanted, winH - TIP_H - EDGE));

  /*
    다이아몬드. 카드가 구멍 **아래**면 카드 위쪽에, **위**면 카드 아래쪽에 답니다.
    단계에서 `pointerPosition` 을 주면 그걸 그대로 씁니다.

    좌우(`left`·`right`)는 **카드가 화면 폭을 거의 다 쓰기 때문에** 자리가 안 나옵니다.
    지금 짚는 것들(탭·영상·카드)이 전부 가로로 넓어 위아래가 맞는 자리입니다.
    좁은 카드를 짚는 단계가 생기면 그때 카드 폭을 줄이고 좌우를 열면 됩니다.
  */
  const autoSide: 'top' | 'bottom' = below ? 'top' : 'bottom';
  /* 좌우를 주더라도 지금은 위아래로 접습니다(위 주석) — 카드가 화면 폭을 다 씁니다. */
  const pointerSide: 'top' | 'bottom' =
    cur.pointerPosition === 'top' || cur.pointerPosition === 'bottom' ? cur.pointerPosition : autoSide;

  /** 다이아몬드는 짚는 곳 **한가운데**를 가리킵니다. 카드 안에서 벗어나지 않게 자릅니다. */
  const cardLeft = TUTORIAL.card.margin;
  const cardW = winW - TUTORIAL.card.margin * 2;
  const targetCx = hole ? hole.x + hole.w / 2 : winW / 2;
  const pointerLeft = Math.max(
    TUTORIAL.card.radius,
    Math.min(targetCx - cardLeft - TUTORIAL.pointer.width / 2, cardW - TUTORIAL.card.radius - TUTORIAL.pointer.width)
  );
  /** 카드가 구멍을 가리는 자리면(둘 다 자리가 없을 때) 다이아몬드는 안 답니다. */
  const showPointer = !!hole && (below ? roomBelow >= TIP_H : roomAbove >= TIP_H);

  return (
    <View style={styles.fill} pointerEvents="box-none">
      <Scrim ax={ax} ay={ay} aw={aw} ah={ah} ar={ar} blurOn={settled} blurOpacity={blurOpacity} />

      {/* 스포트라이트 테두리 — 시안 1.5 white/50 + 바깥 흰 빛 */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { left: ax, top: ay, width: aw, height: ah, borderRadius: ar },
          !hole && styles.hidden,
        ]}
      />

      {/* 말풍선 */}
      <Animated.View
        style={[
          styles.tipWrap,
          {
            top: tipTop,
            opacity: pop,
            transform: [
              { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
              { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
            ],
          },
        ]}
        pointerEvents="box-none"
      >
        {showPointer ? <Pointer side={pointerSide} left={pointerLeft} /> : null}

        <View
          style={styles.tip}
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            setTipH((v) => (Math.abs(v - h) > 1 ? h : v));
          }}
        >
          {/*
            카드는 **불투명 흰색**입니다 (2026-08-30 지시 ⑧). 어두운 유리였을 때는
            블러를 깔았는데, 흰 판에는 뒤가 비칠 일이 없어 뺐습니다 — 블러 한 겹이
            통째로 사라지니 그만큼 가볍기도 합니다.
          */}
          <View style={styles.tipHead}>
            <Text style={styles.count}>
              {shown}/{total}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onFinish}
              hitSlop={8}
              style={({ pressed }) => pressTap(pressed, 'icon')}
            >
              <Text style={styles.skip}>건너뛰기</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>{cur.title}</Text>
          <Text style={styles.body}>{cur.description}</Text>

          <View style={styles.btnRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: index === 0 }}
              disabled={index === 0}
              onPress={() => setIndex((i) => Math.max(0, i - 1))}
              style={({ pressed }) => [styles.btn, styles.btnGhost, pressTap(pressed, 'button')]}
            >
              <Text style={[styles.btnGhostText, index === 0 && styles.btnDim]}>이전</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={next}
              style={({ pressed }) => [styles.btn, styles.btnPrimary, pressTap(pressed, 'button')]}
            >
              <Text style={styles.btnPrimaryText}>{last ? '완료' : '다음'}</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * 다이아몬드 — 45° 돌린 정사각형을 **잘라내서** 삼각형만 남깁니다.
 *
 * 통째로 두면 카드와 겹치는데, 카드도 다이아몬드도 반투명이라 겹친 곳만 두 배로
 * 진해집니다. 잘라낸 상자(`overflow: hidden`)로 바깥 삼각형만 남기고, 카드 테두리
 * 선이 밑에서 비치지 않게 1pt 만 겹칩니다.
 */
function Pointer({ side, left }: { side: 'top' | 'bottom'; left: number }) {
  const up = side === 'top';
  const { size, height, width, overlap } = TUTORIAL.pointer;
  /* 꼭짓점이 잘라낸 상자의 바깥 변에 닿도록 밀어 넣습니다. */
  const top = up ? HALF_DIAGONAL - size / 2 : height - HALF_DIAGONAL - size / 2;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.pointerClip,
        { left, width, height },
        up ? { top: -(height - overlap) } : { bottom: -(height - overlap) },
      ]}
    >
      <View
        style={[
          styles.pointerBody,
          { left: (width - size) / 2, top, width: size, height: size },
          up ? styles.pointerBorderUp : styles.pointerBorderDown,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  hidden: { opacity: 0 },

  /* 막 조각. 겹치지 않게 놓습니다 — 겹치면 그 자리만 두 배로 진해집니다. */
  piece: { position: 'absolute', overflow: 'hidden' },
  dim: { backgroundColor: TUTORIAL.backdrop.dim },
  /* 모서리 조각을 R×R 로 잘라내는 상자. 안 자르면 고리가 구멍 안으로 삐져나옵니다. */
  clip: { position: 'absolute', overflow: 'hidden' },
  /* 안쪽이 뚫린 고리. 색은 테두리에만 있습니다 — 가운데가 비어야 구멍이 뚫립니다. */
  ringPiece: {
    position: 'absolute',
    borderColor: TUTORIAL.backdrop.cornerFill,
    backgroundColor: 'transparent',
  },

  ring: {
    position: 'absolute',
    borderWidth: TUTORIAL.spotlight.borderWidth,
    borderColor: TUTORIAL.spotlight.borderColor,
    shadowColor: TUTORIAL.spotlight.glowColor,
    shadowOpacity: TUTORIAL.spotlight.glowOpacity,
    shadowRadius: TUTORIAL.spotlight.glowRadius,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },

  tipWrap: { position: 'absolute', left: TUTORIAL.card.margin, right: TUTORIAL.card.margin },
  tip: {
    borderRadius: TUTORIAL.card.radius,
    borderWidth: TUTORIAL.card.borderWidth,
    borderColor: TUTORIAL.card.borderColor,
    backgroundColor: TUTORIAL.card.bg,
    padding: TUTORIAL.card.padding,
    ...TUTORIAL.cardShadow,
  },

  pointerClip: { position: 'absolute', overflow: 'hidden', zIndex: 1 },
  pointerBody: {
    position: 'absolute',
    backgroundColor: TUTORIAL.card.bg,
    transform: [{ rotate: '45deg' }],
  },
  /* 흰 카드에는 테두리 선이 거의 안 보여, 다이아몬드는 면만 씁니다(시안 최최종). */
  /* 돌린 뒤 바깥을 향하는 두 변에만 테두리를 둡니다 */
  pointerBorderUp: {
    borderTopWidth: TUTORIAL.card.borderWidth,
    borderLeftWidth: TUTORIAL.card.borderWidth,
    borderColor: TUTORIAL.card.borderColor,
  },
  pointerBorderDown: {
    borderBottomWidth: TUTORIAL.card.borderWidth,
    borderRightWidth: TUTORIAL.card.borderWidth,
    borderColor: TUTORIAL.card.borderColor,
  },

  tipHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: {
    ...theme.text.label,
    fontFamily: theme.text.heading.fontFamily,
    fontWeight: theme.text.heading.fontWeight,
    color: TUTORIAL.text.count,
  },
  skip: {
    ...theme.text.label,
    fontSize: 12.5,
    fontFamily: theme.text.chipLabel.fontFamily,
    fontWeight: theme.text.chipLabel.fontWeight,
    color: TUTORIAL.text.sub,
  },
  title: {
    ...theme.text.subheading,
    marginTop: 10,
    lineHeight: TUTORIAL.text.titleLineHeight,
    fontFamily: theme.text.heading.fontFamily,
    fontWeight: theme.text.heading.fontWeight,
    color: TUTORIAL.text.title,
  },
  body: {
    ...theme.text.caption,
    fontSize: 13.5,
    lineHeight: TUTORIAL.text.bodyLineHeight,
    marginTop: 6,
    color: TUTORIAL.text.body,
  },

  btnRow: { flexDirection: 'row', gap: TUTORIAL.button.gap, marginTop: 16 },
  btn: {
    height: TUTORIAL.button.height,
    borderRadius: TUTORIAL.button.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    flex: TUTORIAL.button.secondaryFlex,
    backgroundColor: TUTORIAL.button.secondaryBg,
    borderWidth: 1,
    borderColor: TUTORIAL.button.secondaryBorder,
  },
  btnGhostText: {
    ...theme.text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: TUTORIAL.button.secondaryText,
  },
  btnDim: { color: TUTORIAL.button.secondaryTextDim },
  btnPrimary: {
    flex: TUTORIAL.button.primaryFlex,
    backgroundColor: TUTORIAL.button.primaryBg,
  },
  btnPrimaryText: {
    ...theme.text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: TUTORIAL.button.primaryText,
  },
});

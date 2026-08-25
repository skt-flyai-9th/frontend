/**
 * TutorialArt.tsx — 최초 실행 튜토리얼의 화면별 일러스트 4종.
 *
 * ─────────────────────────────────────────────────────────────
 * 시안 원문에는 이미지가 한 장도 없습니다
 * ─────────────────────────────────────────────────────────────
 * `Onboarding.html` 의 일러스트는 전부 CSS `@keyframes` 로 그린 도형입니다.
 * 그래서 이 파일이 하는 일은 그림을 옮기는 게 아니라 **타임라인을 옮기는 것**입니다.
 *
 * 시안 키프레임 28개가 전부 `2.5s linear infinite` 로 같은 시계에 물려 있습니다.
 * 그래서 화면마다 0→1 을 무한 반복하는 값 하나만 두고, 도형마다 % 구간을
 * `interpolate` 로 꺼내 씁니다. 시안의 `0%,14%{…}22%,44%{…}` 가
 * `kf(v, [0,14,22,44], [...])` 로 1:1 대응합니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 여기서 네이티브 드라이버를 쓰지 마세요
 * ─────────────────────────────────────────────────────────────
 * `Animated.loop` 는 네이티브 드라이버 애니메이션의 **반복을 네이티브 모듈에
 * 넘깁니다.** 그 모듈이 없는 react-native-web 에서는 **한 바퀴만 돌고 멈춥니다.**
 *
 * 2026-08-25 에 실제로 그렇게 났습니다 — 첫 화면 삽화가 텅 비어 있길래 인라인
 * 스타일을 시간차로 떠 보니, 폭(JS 드라이버)은 계속 변하는데 opacity·transform
 * (네이티브 드라이버)만 진행도 1 에 굳어 있었습니다. 화면을 넘겼다 돌아오면
 * `.start()` 가 다시 불려 한 바퀴 더 도는 바람에 "가끔 된다" 로 보였습니다.
 *
 * 시안의 폭(`bF1~3`·`bCapline`)·높이(`bC1~7`) 애니는 **레이아웃 속성이라 어차피
 * 네이티브 드라이버를 못 씁니다** (scaleX/scaleY 로 바꾸면 `borderRadius` 가 같이
 * 늘어나 막대 끝 모양이 시안과 달라집니다). 값을 둘로 쪼개면 두 시계가 어긋날
 * 위험만 생기고, 한 노드에 두 드라이버를 섞으면 RN 이 예외를 냅니다
 * (`navigation/SwipeTabs.tsx` 주석). 그래서 **시계 하나로 통일**했습니다.
 *
 * 손가락을 따라오는 페이지 전환(`TutorialScreen` 의 `trackX`)은 반복이 아니라
 * 한 번짜리 timing 이라 그대로 네이티브 드라이버입니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 시안과 일부러 다른 곳 하나 — 음수 지연
 * ─────────────────────────────────────────────────────────────
 * 시안은 `-2.2s` 음수 지연이라 2.5초 주기의 88% 지점에서 시작합니다.
 * 화면을 열면 **끝난 상태가 0.3초 보이고 되감겨** 처음부터 재생됩니다.
 * 튜토리얼은 순서를 보여주는 게 목적이라 결론부터 보여주고 되감는 게 어긋나서,
 * 사장님 확인을 받고 **0% 부터 재생**하도록 뺐습니다 (2026-08-25).
 *
 * 애니메이션은 **현재 화면에서만** 돕니다. 넘어올 때마다 0 부터 다시 시작해서
 * 위 규칙이 지켜지고, 안 보이는 화면 3개의 JS 드라이버 애니도 함께 멈춥니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';

import { color, radius, space, text } from '../../../design/theme';

/** 시안: `2.5s linear infinite` — 키프레임 28개가 전부 이 주기입니다. */
const CYCLE = 2500;

/** 시안 무대: 300×300 안에 지름 284 원. 네 화면이 모두 같습니다. */
const STAGE = 300;
const HALO = 284;

interface ArtProps {
  /** 지금 보고 있는 화면인지. false 면 애니메이션이 멈추고 0% 로 돌아갑니다. */
  active: boolean;
}

/* ────────────────────────────────────────────────────────────
 * 타임라인
 * ──────────────────────────────────────────────────────────── */

/**
 * 시안 `@keyframes` 를 그대로 옮기는 헬퍼.
 *
 *   시안  `bF1{0%,10%{width:0}20%,92%{width:76%}97%,100%{width:0}}`
 *   여기  kf(v, [0, 10, 20, 92, 97, 100], ['0%', '0%', '76%', '76%', '0%', '0%'])
 *
 * `at` 은 시안과 같은 **퍼센트**로 적습니다. 눈으로 대조할 수 있어야 해서
 * 0~1 로 미리 환산하지 않습니다.
 */
function kf(v: Animated.Value, at: readonly number[], to: readonly number[] | readonly string[]) {
  return v.interpolate({
    inputRange: at.map((p) => p / 100),
    outputRange: to as number[],
    extrapolate: 'clamp',
  });
}

/**
 * 화면 하나의 시계 — 0→1 을 2.5초마다 반복합니다.
 * `useNativeDriver` 를 켜면 안 되는 이유는 파일 첫머리 주석에 있습니다.
 */
function useCycle(active: boolean): Animated.Value {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: CYCLE,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => {
      loop.stop();
      v.setValue(0);
    };
  }, [active, v]);

  return v;
}

/**
 * 삽화 전용 그림자.
 *
 * 시안 카드는 `0 18px 44px -12px rgba(37,99,235,.28)`, 완료 도장은
 * `0 10px 28px -8px rgba(16,185,129,.55)` — 둘 다 **색이 있는 글로우**입니다.
 * theme 의 elevation 토큰은 전부 ink 계열에 opacity .04~.06 이라 이 그림이
 * 나오지 않습니다(거의 안 보입니다). 그래서 여기서만 시안 값을 직접 씁니다
 * (CLAUDE.md §6 — 덮되 근거를 남깁니다).
 *
 * CSS 의 spread(-12·-8)는 RN 에 대응이 없어 뺐습니다. 글로우가 시안보다
 * 아주 조금 넓게 퍼집니다.
 */
function glow(hex: string, shadowOpacity: number, blur: number, offsetY: number, android: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: hex,
      shadowOpacity,
      shadowRadius: blur / 2,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: { elevation: android, shadowColor: hex },
    default: {},
  })!;
}

/** 무대 — 300×300 + 지름 284 원. */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.stage}>
      <View style={styles.halo} />
      {children}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────
 * 01 매장 등록 — 입력이 채워지고 → 승인되고 → 결과가 뜬다
 * ──────────────────────────────────────────────────────────── */

/** 시안 `bF1~3`: 카드 안쪽 폭(150 − 좌우 20) 기준 비율입니다. */
const FIELDS = [
  { at: [0, 10, 20, 92, 97, 100], w: '76%', bg: color.ink[900] },
  { at: [0, 17, 27, 92, 97, 100], w: '52%', bg: color.brand[600] },
  { at: [0, 24, 34, 92, 97, 100], w: '66%', bg: color.ink[300] },
] as const;

/** 시안 `bFd1~3`: 카드가 비켜난 자리에 결과 버튼이 차례로 올라옵니다. */
const FOUND = [
  { in: 48, out: 58, bg: color.brand[600], to: 1 },
  { in: 54, out: 64, bg: color.brand[300], to: 1 },
  // 시안 bFd3 만 opacity .45 — 목록이 아래로 이어진다는 표시입니다.
  { in: 60, out: 70, bg: color.ink[100], to: 0.45 },
] as const;

export function Art01({ active }: ArtProps) {
  const v = useCycle(active);

  // 시안 bBox: scale(1.22) rotate(-7deg) 로 등장 → 46% 에 위로 축소 이동.
  const card = {
    opacity: kf(v, [0, 9, 92, 97, 100], [0, 1, 1, 0, 0]),
    transform: [
      { translateY: kf(v, [0, 32, 46, 100], [0, 0, -86, -86]) },
      { scale: kf(v, [0, 9, 32, 46, 100], [1.22, 1, 1, 0.62, 0.62]) },
      { rotate: kf(v, [0, 9, 100], ['-7deg', '0deg', '0deg']) },
    ],
  };

  // 시안 bTick: 네이버 스마트플레이스 승인. scale .3 → 1.2 → 1 로 튑니다.
  const tick = {
    opacity: kf(v, [0, 34, 42, 92, 97, 100], [0, 0, 1, 1, 0, 0]),
    transform: [{ scale: kf(v, [0, 34, 42, 48, 100], [0.3, 0.3, 1.2, 1, 1]) }],
  };

  return (
    <Stage>
      <Animated.View style={[styles.card, card]}>
        <View style={styles.cardFields}>
          {FIELDS.map((f) => (
            <Animated.View
              key={f.bg}
              style={[styles.field, { backgroundColor: f.bg, width: kf(v, f.at, ['0%', '0%', f.w, f.w, '0%', '0%']) }]}
            />
          ))}
        </View>

        <Animated.View style={[styles.tick, tick]}>
          {/* 시안 svg: stroke-width 3.4 · 19px — lucide Check 와 같은 path 입니다. */}
          <Check size={19} color={color.canvas} strokeWidth={3.4} />
        </Animated.View>
      </Animated.View>

      <View style={styles.foundWrap}>
        {FOUND.map((f) => (
          <Animated.View
            key={f.bg}
            style={[
              styles.foundBar,
              { backgroundColor: f.bg },
              {
                opacity: kf(v, [0, f.in, f.out, 92, 97, 100], [0, 0, f.to, f.to, 0, 0]),
                transform: [
                  { translateY: kf(v, [0, f.in, f.out, 100], [40, 40, 0, 0]) },
                  { scaleX: kf(v, [0, f.in, f.out, 100], [0.8, 0.8, 1, 1]) },
                ],
              },
            ]}
          />
        ))}
      </View>
    </Stage>
  );
}

/* ────────────────────────────────────────────────────────────
 * 02 AI 추천 — 말하면 → 후보가 뜨고 → 하나로 좁혀지고 → 리스트가 된다
 * ──────────────────────────────────────────────────────────── */

/**
 * 시안 `bP1~3`. 절대배치 + 부모가 가운데 정렬이라 가로 중앙에 섭니다.
 * RN 은 그 규칙이 없어 left 를 (300 − 폭) / 2 로 직접 계산했습니다.
 */
const PICKS = [
  { top: 120, w: 196, bg: color.ink[900] },
  { top: 168, w: 176, bg: color.brand[400] },
  { top: 216, w: 156, bg: color.brand[300] },
] as const;

export function Art02({ active }: ArtProps) {
  const v = useCycle(active);

  // 시안 bP1: 1번 후보만 살아남아 위로 축소 이동합니다.
  const kept = {
    opacity: kf(v, [0, 14, 22, 92, 97, 100], [0, 0, 1, 1, 0, 0]),
    transform: [
      { translateY: kf(v, [0, 14, 22, 44, 54, 100], [16, 16, 0, 0, -58, -58]) },
      { scale: kf(v, [0, 44, 54, 100], [1, 1, 0.8, 0.8]) },
    ],
  };
  // 시안 bP2·bP3: 2·3번은 44~52% 에 사라집니다.
  const dropped = (appear: number, shown: number) => ({
    opacity: kf(v, [0, appear, shown, 44, 52, 100], [0, 0, 1, 1, 0, 0]),
    transform: [{ translateY: kf(v, [0, appear, shown, 44, 52, 100], [16, 16, 0, 0, -8, -8]) }],
  });

  return (
    <Stage>
      {/* 시안 bSay — 사장님이 말한 내용. 원문 문구 그대로입니다. */}
      <Animated.View
        style={[
          styles.bubble,
          {
            opacity: kf(v, [0, 8, 92, 97, 100], [0, 1, 1, 0, 0]),
            transform: [{ translateY: kf(v, [0, 8, 100], [10, 0, 0]) }],
          },
        ]}
      >
        <Text style={styles.bubbleText}>딸기 크림 라떼요</Text>
      </Animated.View>

      {PICKS.map((p, i) => (
        <Animated.View
          key={p.top}
          style={[
            styles.pick,
            { top: p.top, width: p.w, left: (STAGE - p.w) / 2, backgroundColor: p.bg },
            i === 0 ? kept : dropped(i === 1 ? 20 : 26, i === 1 ? 28 : 34),
          ]}
        />
      ))}

      {/* 시안 bL1~4 — 좁혀진 결과가 촬영 체크리스트가 됩니다. 6% 씩 밀려 등장합니다. */}
      <View style={styles.listWrap}>
        {[56, 62, 68, 74].map((start) => (
          <Animated.View
            key={start}
            style={[
              styles.listRow,
              {
                opacity: kf(v, [0, start, start + 6, 92, 97, 100], [0, 0, 1, 1, 0, 0]),
                transform: [{ translateX: kf(v, [0, start, start + 6, 100], [-14, -14, 0, 0]) }],
              },
            ]}
          >
            <View style={styles.listDot} />
            <View style={styles.listBar} />
          </Animated.View>
        ))}
      </View>
    </Stage>
  );
}

/* ────────────────────────────────────────────────────────────
 * 03 자동 편집 — 흩어진 클립이 모이고 → 자막이 붙고 → 완료
 * ──────────────────────────────────────────────────────────── */

/** 시안 `bR1~4`: 넓게 흩어진 클립이 30~44% 에 가운데로 모입니다. */
const CLIPS = [
  { show: 8, from: -84, to: -42, sy: 0.7, bg: color.ink[900] },
  { show: 11, from: -28, to: -14, sy: 1.15, bg: color.ink[700] },
  { show: 14, from: 28, to: 14, sy: 0.85, bg: color.brand[600] },
  { show: 17, from: 84, to: 42, sy: 1.1, bg: color.brand[400] },
] as const;

/** 시안 bCapdot: 자막 조각 3개. 마지막 한 조각만 브랜드색입니다. */
const CAP_DOTS = [
  { w: 26, bg: color.ink[300] },
  { w: 40, bg: color.ink[300] },
  { w: 22, bg: color.brand[600] },
] as const;

export function Art03({ active }: ArtProps) {
  const v = useCycle(active);

  return (
    <Stage>
      {CLIPS.map((c) => (
        <Animated.View
          key={c.from}
          style={[
            styles.clip,
            { backgroundColor: c.bg },
            {
              opacity: kf(v, [0, c.show, 92, 97, 100], [0, 1, 1, 0, 0]),
              transform: [
                { translateX: kf(v, [0, 30, 44, 100], [c.from, c.from, c.to, c.to]) },
                { scaleY: kf(v, [0, 30, 44, 100], [c.sy, c.sy, 1, 1]) },
              ],
            },
          ]}
        />
      ))}

      {/* 시안 bCapline — 자막 줄이 0 에서 126 으로 늘어납니다. */}
      <View style={styles.capLineWrap}>
        <Animated.View
          style={[
            styles.capLine,
            {
              opacity: kf(v, [0, 50, 60, 92, 97, 100], [0, 0, 1, 1, 0, 0]),
              width: kf(v, [0, 50, 60, 92, 97, 100], [0, 0, 126, 126, 0, 0]),
            },
          ]}
        />
      </View>

      <Animated.View
        style={[
          styles.capDots,
          {
            opacity: kf(v, [0, 64, 70, 92, 97, 100], [0, 0, 1, 1, 0, 0]),
            transform: [{ scale: kf(v, [0, 64, 70, 76, 100], [0.4, 0.4, 1.18, 1, 1]) }],
          },
        ]}
      >
        {CAP_DOTS.map((d) => (
          <View key={d.w} style={[styles.capDot, { width: d.w, backgroundColor: d.bg }]} />
        ))}
      </Animated.View>

      {/* 시안 bSeal — 편집 완료 도장. */}
      <Animated.View
        style={[
          styles.seal,
          {
            opacity: kf(v, [0, 78, 85, 92, 97, 100], [0, 0, 1, 1, 0, 0]),
            transform: [{ scale: kf(v, [0, 78, 85, 90, 100], [0.5, 0.5, 1.12, 1, 1]) }],
          },
        ]}
      >
        <Check size={24} color={color.canvas} strokeWidth={3.2} />
      </Animated.View>
    </Stage>
  );
}

/* ────────────────────────────────────────────────────────────
 * 04 성과 — 숫자가 오르고 → 배지가 튀고 → 막대가 자란다
 * ──────────────────────────────────────────────────────────── */

/** 시안 `bC1~7`: 막대 7개가 4px 에서 제 높이로 자랍니다. 6번째만 브랜드색입니다. */
const BARS = [
  { start: 8, grow: 20, h: 39, bg: color.brand[300] },
  { start: 12, grow: 24, h: 59, bg: color.brand[300] },
  { start: 16, grow: 28, h: 51, bg: color.brand[300] },
  { start: 20, grow: 32, h: 76, bg: color.brand[400] },
  { start: 24, grow: 36, h: 71, bg: color.brand[400] },
  { start: 28, grow: 42, h: 96, bg: color.brand[600] },
  { start: 34, grow: 46, h: 78, bg: color.brand[400] },
] as const;

/** 시안이 세는 목표치. 튜토리얼 삽화의 예시 숫자이지 사장님 데이터 자리가 아닙니다. */
const VIEWS_TARGET = 3820;

/**
 * 천단위 쉼표.
 *
 * 시안은 `toLocaleString()` 을 쓰지만, RN 은 기기·엔진에 따라 Intl 이 없어
 * 쉼표가 사라질 수 있습니다. 숫자가 세 자리씩 끊겨 보이는 게 이 삽화의 요점이라
 * 직접 찍습니다.
 */
function comma(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function Art04({ active }: ArtProps) {
  const v = useCycle(active);
  const [views, setViews] = useState(0);

  /**
   * 시안은 이 숫자만 CSS 가 아니라 JS 로 셉니다 — 40ms 간격, ease-out-cubic,
   * 주기의 4%~48% 구간(`(t - .04) / .44`). 원문 계산을 그대로 옮겼습니다.
   * 60fps 로 setState 하면 낭비라 시안과 같은 40ms 를 유지합니다.
   */
  useEffect(() => {
    if (!active) {
      setViews(0);
      return;
    }
    const t0 = Date.now();
    const id = setInterval(() => {
      const t = ((Date.now() - t0) % CYCLE) / CYCLE;
      const p = Math.min(1, Math.max(0, (t - 0.04) / 0.44));
      setViews(Math.round(VIEWS_TARGET * (1 - Math.pow(1 - p, 3))));
    }, 40);
    return () => clearInterval(id);
  }, [active]);

  return (
    <Stage>
      <Animated.View style={[styles.countRow, { opacity: kf(v, [0, 6, 92, 97, 100], [0, 1, 1, 0, 0]) }]}>
        <View style={styles.countValue}>
          <Text style={styles.countNumber}>{comma(views)}</Text>
          <Text style={styles.countUnit}>회</Text>
        </View>

        {/* 시안 bLift — 증가 배지가 살짝 튀어오릅니다. */}
        <Animated.View
          style={[
            styles.lift,
            {
              opacity: kf(v, [0, 44, 54, 92, 97, 100], [0, 0, 1, 1, 0, 0]),
              transform: [
                { translateY: kf(v, [0, 44, 54, 100], [10, 10, 0, 0]) },
                { scale: kf(v, [0, 44, 54, 60, 100], [0.8, 0.8, 1.1, 1, 1]) },
              ],
            },
          ]}
        >
          <Text style={styles.liftText}>+12%</Text>
        </Animated.View>
      </Animated.View>

      <View style={styles.chart}>
        {BARS.map((b) => (
          <Animated.View
            key={b.start}
            style={[
              styles.bar,
              { backgroundColor: b.bg },
              { height: kf(v, [0, b.start, b.grow, 92, 97, 100], [4, 4, b.h, b.h, 4, 4]) },
            ]}
          />
        ))}
      </View>
    </Stage>
  );
}

/* ────────────────────────────────────────────────────────────
 * 값
 *
 * 아래 숫자는 대부분 `Onboarding.html` 실측값입니다. 토큰으로 옮길 수 있는
 * 색·간격은 토큰을 쓰고, 삽화 좌표처럼 이 화면에만 있는 값은 시안 원문을
 * 주석에 남겼습니다 (CLAUDE.md §6).
 * ──────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  // 시안: 300×300. 좁은 기기에서 줄어들면 절대좌표가 어긋나므로 고정합니다
  // (좌우 34 패딩 쪽으로 조금 넘칠 뿐 잘리지 않습니다).
  stage: {
    width: STAGE,
    height: STAGE,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: HALO,
    height: HALO,
    borderRadius: radius.pill,
    backgroundColor: color.brand[50],
  },

  // ── 01 ──
  // 시안: w-150 · p-20 · radius 26 · shadow 0 18px 44px -12px rgba(37,99,235,.28)
  card: {
    position: 'absolute',
    width: 150,
    padding: space[5],
    borderRadius: 26,
    backgroundColor: color.canvas,
    ...glow(color.brand[600], 0.28, 44, 18, 6),
  },
  cardFields: { gap: 11 },
  // 시안: h-11 · radius 6. 폭이 애니메이션이라 늘어나지 않도록 왼쪽에 붙입니다.
  field: { height: 11, borderRadius: 6, alignSelf: 'flex-start' },
  // 시안: 34 원 · right/bottom -11 · 네이버 승인색
  tick: {
    position: 'absolute',
    right: -11,
    bottom: -11,
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: color.naver,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시안: left/right 46 · bottom 56 · gap 9
  foundWrap: { position: 'absolute', left: 46, right: 46, bottom: 56, gap: 9 },
  foundBar: { height: 38, borderRadius: radius.md },

  // ── 02 ──
  // 시안: top/right 16 · max-w 170 · padding 11 14 · radius 16 16 5 16
  bubble: {
    position: 'absolute',
    top: space[4],
    right: space[4],
    maxWidth: 170,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: 5,
    borderBottomLeftRadius: radius.lg,
    backgroundColor: color.brand[600],
  },
  // 시안: 12 · 600 · line-height 1.4
  bubbleText: { ...text.label, color: color.canvas, lineHeight: 16.8 },
  pick: { position: 'absolute', height: 38, borderRadius: radius.md },
  // 시안: left/right 62 · bottom 40 · gap 9
  listWrap: { position: 'absolute', left: 62, right: 62, bottom: space[10], gap: 9 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  listDot: { width: 18, height: 18, borderRadius: radius.pill, backgroundColor: color.done[500] },
  listBar: { flex: 1, height: 9, borderRadius: 5, backgroundColor: color.ink[300] },

  // ── 03 ──
  // 시안: top 62 · 52×96 · radius 12 (좌우 이동은 transform 이라 중앙 기준입니다)
  clip: { position: 'absolute', top: 62, width: 52, height: 96, borderRadius: radius.md },
  capLineWrap: { position: 'absolute', top: 180, left: 0, right: 0, alignItems: 'center' },
  capLine: { height: 12, borderRadius: 6, backgroundColor: color.ink[900] },
  // 시안: top 204 · left 50% margin-left -50 → 폭 100 이라 left 100 이 중앙입니다.
  capDots: { position: 'absolute', top: 204, left: 100, flexDirection: 'row', gap: 6 },
  capDot: { height: 8, borderRadius: 4 },
  // 시안: top 230 · 44 원 · shadow 0 10px 28px -8px rgba(16,185,129,.55)
  seal: {
    position: 'absolute',
    top: 230,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.done[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...glow(color.done[500], 0.55, 28, 10, 6),
  },

  // ── 04 ──
  // 시안: top 56 · gap 9
  countRow: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  countValue: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  // 시안: 50 · 700 · letter-spacing -.035em · tabular-nums
  countNumber: { ...text.display, fontSize: 50, lineHeight: 50, letterSpacing: -1.75 },
  countUnit: { ...text.heading },
  // 시안: padding 5 10 · radius 999
  lift: {
    paddingVertical: 5,
    paddingHorizontal: space[2] + 2,
    borderRadius: radius.pill,
    backgroundColor: color.done[500],
  },
  // 시안: 12 · 700
  liftText: { ...text.display, fontSize: 12, lineHeight: 16, letterSpacing: 0, color: color.canvas },
  // 시안: left/right 56 · bottom 72 · height 96
  chart: {
    position: 'absolute',
    left: 56,
    right: 56,
    bottom: 72,
    height: 96,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bar: { width: 18, borderRadius: 5 },
});

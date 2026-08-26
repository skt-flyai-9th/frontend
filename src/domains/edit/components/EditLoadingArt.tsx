/**
 * EditLoadingArt — AI 자동 편집이 도는 동안 보여 주는 그림. **시안 9차 신규.**
 *
 * ─────────────────────────────────────────────────────────────
 * 무엇이 바뀌었나
 * ─────────────────────────────────────────────────────────────
 * 8차까지는 190px 짜리 9:16 회색 상자에 "촬영된 영상" 이라고만 적혀 있었고, 그 위에
 * 자막칩·위치칩이 단계에 따라 얹혔습니다. 9차에서 **상자가 통째로 교체**됐습니다 —
 * 자막칩·위치칩도 함께 사라집니다.
 *
 *   클립 3개가 위아래로 흔들리다 → 가운데로 빨려 들어가고 → 파란 덩어리가 되었다가
 *   → 세로 영상 모양으로 늘어나고 → 이퀄라이저가 뛰고 → 재생 삼각형으로 끝납니다
 *
 * 3.2초에 한 바퀴입니다. 편집은 몇 분씩 걸리는데 진행바만 보고 있으면 멈춘 것처럼
 * 느껴집니다. "지금 뭘 하는 중" 을 그림으로 말해 주는 자리입니다.
 *
 * ─────────────────────────────────────────────────────────────
 * ⚠️ 여기서 지킨 것 셋 (CLAUDE.md §5-④, §5-④-1)
 * ─────────────────────────────────────────────────────────────
 * ① **`Animated.loop` 을 쓰지 않습니다.** 웹에서 한 바퀴만 돌고 굳습니다. 끝나면
 *    다음 바퀴를 우리가 직접 겁니다 (`Marquee.tsx` 와 같은 방식).
 * ② **네이티브 드라이버를 못 씁니다.** 파란 덩어리가 `width`·`height`·`margin`·
 *    `borderRadius` 를 바꾸는데 전부 레이아웃 속성입니다. `scale` 로 바꾸면
 *    모서리 둥글기가 같이 늘어나 끝 모양이 시안과 달라집니다.
 * ③ **시계는 하나입니다.** 값을 둘로 쪼개면 두 시계가 어긋나 클립이 덩어리와
 *    따로 놉니다. 이퀄라이저 막대만 주기가 달라(0.6초) 시계를 하나 더 씁니다.
 *
 * ⚠️ 시안은 각 구간마다 `cubic-bezier(.34,1.5,.5,1)` 로 **튕기는 느낌**을 줍니다.
 *    RN 의 `interpolate` 는 구간 사이를 직선으로 잇기 때문에 그 탄력은 재현되지
 *    않습니다. 시안이 키프레임을 촘촘히 박아 둬서(덩어리만 12개) 움직임의 모양은
 *    그대로 남습니다. 곡선까지 맞추려면 구간마다 값을 더 쪼개야 하는데, 로딩
 *    그림에 들일 품은 아니라고 판단했습니다.
 *
 * 시안 원문 수치
 *   상자 h-[212px] w-full rounded-[32px] bg-surface · 안쪽 170×200
 *   후광 120 원 #dbe7fd · 클립 40×72 r16 (#c3cedd · 가운데 #aab8ca) gap 10
 *   덩어리 #2563eb · 이퀄라이저 막대 w7 흰색 9↔30 · 재생 삼각형 32 흰색
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { color, radius } from '../../../design/theme';

/** 시안: 3.2s 한 바퀴 */
const CYCLE = 3200;
/** 이퀄라이저 막대는 0.6s 왕복 — 위아래 한 번이 1.2s 입니다 */
const BAR_CYCLE = 1200;

type Stop = [number, number];

/** 시안 키프레임(%)을 그대로 옮겨 적기 위한 도우미. 입력은 0~100 입니다. */
function kf(clock: Animated.Value, stops: Stop[]) {
  return clock.interpolate({
    inputRange: stops.map((s) => s[0] / 100),
    outputRange: stops.map((s) => s[1]),
  });
}

/** 각도는 문자열이라 따로 만듭니다. */
function kfDeg(clock: Animated.Value, stops: Stop[]) {
  return clock.interpolate({
    inputRange: stops.map((s) => s[0] / 100),
    outputRange: stops.map((s) => `${s[1]}deg`),
  });
}

/**
 * 스스로 반복하는 시계.
 * `Animated.loop` 을 안 쓰는 이유는 위 머리말 ①.
 */
function useClock(duration: number, active: boolean, restAt = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      v.setValue(restAt);
      return;
    }
    let stopped = false;
    let cur: Animated.CompositeAnimation | null = null;
    const run = () => {
      if (stopped) return;
      v.setValue(0);
      cur = Animated.timing(v, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: false, // 머리말 ②
      });
      cur.start(({ finished }) => finished && run());
    };
    run();
    return () => {
      stopped = true;
      cur?.stop();
    };
  }, [active, duration, restAt, v]);
  return v;
}

/** 클립 한 장. 좌·우 클립은 방향만 반대라 부호로 나눕니다. */
function Clip({
  t,
  side,
  tone,
}: {
  t: Animated.Value;
  /** -1 왼쪽 · 0 가운데 · 1 오른쪽 */
  side: -1 | 0 | 1;
  tone: string;
}) {
  if (side === 0) {
    // 시안 vplC2 — 가운데 클립은 옆으로 안 가고 눌리면서 사라집니다
    return (
      <Animated.View
        style={[
          styles.clip,
          { backgroundColor: tone },
          {
            opacity: kf(t, [
              [0, 1],
              [42, 1],
              [48, 0],
              [90, 0],
              [96, 0.4],
              [100, 1],
            ]),
            transform: [
              {
                translateY: kf(t, [
                  [0, 4],
                  [14, -4],
                  [25, 2],
                  [42, 0],
                  [100, 4],
                ]),
              },
              {
                scaleX: kf(t, [
                  [0, 1],
                  [25, 1],
                  [42, 1.22],
                  [48, 1.1],
                  [90, 1.1],
                  [96, 0.94],
                  [100, 1],
                ]),
              },
              {
                scaleY: kf(t, [
                  [0, 1],
                  [25, 1],
                  [42, 0.78],
                  [48, 0.6],
                  [90, 0.6],
                  [96, 0.94],
                  [100, 1],
                ]),
              },
            ],
          },
        ]}
      />
    );
  }

  // 시안 vplC1(오른쪽으로) · vplC3(왼쪽으로) — 부호만 다릅니다
  const s = side;
  return (
    <Animated.View
      style={[
        styles.clip,
        { backgroundColor: tone },
        {
          opacity: kf(t, [
            [0, 1],
            [40, 1],
            [46, 0],
            [90, 0],
            [96, 0.4],
            [100, 1],
          ]),
          transform: [
            {
              translateX: kf(t, [
                [0, 0],
                [25, 0],
                [40, 50 * s],
                [46, 58 * s],
                [90, 58 * s],
                [96, 16 * s],
                [100, 0],
              ]),
            },
            {
              translateY: kf(t, [
                [0, -4],
                [14, 4],
                [25, -2],
                [40, 0],
                [100, -4],
              ]),
            },
            {
              rotate: kfDeg(t, [
                [0, 0],
                [25, 0],
                [40, -10 * s],
                [46, -12 * s],
                [90, 0],
                [100, 0],
              ]),
            },
            {
              scaleX: kf(t, [
                [0, 1],
                [25, 1],
                [40, 0.78],
                [46, 0.5],
                [90, 0.5],
                [96, 0.9],
                [100, 1],
              ]),
            },
            {
              scaleY: kf(t, [
                [0, 1],
                [25, 1],
                [40, 1.16],
                [46, 1.24],
                [90, 1.24],
                [96, 0.9],
                [100, 1],
              ]),
            },
          ],
        },
      ]}
    />
  );
}

/** 이퀄라이저 막대 하나. phase 는 시안의 음수 delay 를 한 바퀴 비율로 옮긴 값입니다. */
function Bar({ b, phase }: { b: Animated.Value; phase: number }) {
  // 시작 높이 — 삼각파의 phase 지점 (9 에서 30 까지 절반 만에 오릅니다)
  const at = 9 + 42 * phase;
  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height: b.interpolate({
            inputRange: [0, 0.5 - phase, 1 - phase, 1],
            outputRange: [at, 30, 9, at],
          }),
        },
      ]}
    />
  );
}

export function EditLoadingArt({ done = false }: { done?: boolean }) {
  /*
   * 편집이 끝나면 **멈춥니다.**
   *
   * 시안은 끝난 뒤에도 계속 돌립니다. 그런데 우리 화면은 그때 위 문구가
   * "숏폼이 완성됐어요." 로 바뀝니다 — 다 됐다고 적어 놓고 아래에서 계속
   * 만드는 시늉을 하면 서로 어긋납니다.
   *
   * 멈추는 자리는 **90%** 입니다. 그 지점이 마침 세로 영상 모양 + 재생
   * 삼각형이라, 애니메이션의 결말이 그대로 "완성" 그림이 됩니다.
   */
  const t = useClock(CYCLE, !done, 0.9);
  const b = useClock(BAR_CYCLE, !done);

  return (
    <View style={styles.box}>
      <View style={styles.stage}>
        {/* 후광 */}
        <Animated.View
          style={[
            styles.halo,
            {
              opacity: kf(t, [
                [0, 0],
                [42, 0],
                [52, 1],
                [68, 1],
                [76, 0.5],
                [84, 0],
                [100, 0],
              ]),
              transform: [
                {
                  scale: kf(t, [
                    [0, 0.6],
                    [42, 0.6],
                    [52, 1],
                    [60, 1.12],
                    [68, 1],
                    [76, 1.3],
                    [84, 1.4],
                    [100, 1.4],
                  ]),
                },
              ],
            },
          ]}
        />

        {/* 클립 3개 */}
        <View style={styles.row} pointerEvents="none">
          <Clip t={t} side={1} tone="#C3CEDD" />
          <Clip t={t} side={0} tone="#AAB8CA" />
          <Clip t={t} side={-1} tone="#C3CEDD" />
        </View>

        {/*
          파란 덩어리 — 여기만 레이아웃 속성을 움직입니다(머리말 ②).
          시안은 `margin` 으로 가운데를 잡는데, RN 에서도 같은 방식이 제일 단순합니다.
        */}
        <Animated.View
          style={[
            styles.blob,
            {
              opacity: kf(t, [
                [0, 0],
                [40, 0],
                [47, 1],
                [93, 1],
                [97, 0.6],
                [100, 0],
              ]),
              width: kf(t, [
                [0, 60],
                [40, 60],
                [47, 82],
                [53, 66],
                [60, 76],
                [68, 68],
                [76, 96],
                [82, 84],
                [88, 88],
                [93, 88],
                [97, 60],
                [100, 60],
              ]),
              height: kf(t, [
                [0, 60],
                [40, 60],
                [47, 56],
                [53, 66],
                [60, 62],
                [68, 68],
                [76, 132],
                [82, 156],
                [88, 150],
                [93, 150],
                [97, 80],
                [100, 60],
              ]),
              marginLeft: kf(t, [
                [0, -30],
                [40, -30],
                [47, -41],
                [53, -33],
                [60, -38],
                [68, -34],
                [76, -48],
                [82, -42],
                [88, -44],
                [93, -44],
                [97, -30],
                [100, -30],
              ]),
              marginTop: kf(t, [
                [0, -30],
                [40, -30],
                [47, -28],
                [53, -33],
                [60, -31],
                [68, -34],
                [76, -66],
                [82, -78],
                [88, -75],
                [93, -75],
                [97, -40],
                [100, -30],
              ]),
              borderRadius: kf(t, [
                [0, 999],
                [68, 999],
                [76, 40],
                [82, 26],
                [88, 28],
                [93, 28],
                [97, 20],
                [100, 999],
              ]),
            },
          ]}
        />

        {/* 이퀄라이저 — 덩어리가 영상 모양이 된 동안만 보입니다 */}
        <Animated.View
          style={[
            styles.eq,
            {
              opacity: kf(t, [
                [0, 0],
                [48, 0],
                [55, 1],
                [72, 1],
                [76, 0],
                [100, 0],
              ]),
            },
          ]}
          pointerEvents="none"
        >
          {/* 시안의 -.06s · -.26s · -.4s 를 1.2초 한 바퀴 비율로 옮긴 값입니다 */}
          <Bar b={b} phase={0.05} />
          <Bar b={b} phase={0.2167} />
          <Bar b={b} phase={0.3333} />
        </Animated.View>

        {/*
          재생 삼각형. 시안은 `clip-path` 인데 RN 에 없어 SVG 로 그립니다 —
          꼭짓점은 시안 백분율(26/10 · 88/50 · 26/90)을 32 기준으로 옮긴 값입니다.
        */}
        <Animated.View
          style={[
            styles.play,
            {
              opacity: kf(t, [
                [0, 0],
                [80, 0],
                [86, 1],
                [94, 1],
                [97, 0],
                [100, 0],
              ]),
              transform: [
                {
                  scale: kf(t, [
                    [0, 0.2],
                    [80, 0.2],
                    [86, 1.32],
                    [90, 1],
                    [94, 1],
                    [97, 0.5],
                    [100, 0.5],
                  ]),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Svg width={32} height={32} viewBox="0 0 32 32">
            <Polygon points="8.32,3.2 28.16,16 8.32,28.8" fill={color.paper} />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 시안: h-[212px] w-full rounded-[32px] bg-surface
  box: {
    height: 212,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  // 시안: h-[170px] w-[200px]
  stage: { height: 170, width: 200, alignItems: 'center', justifyContent: 'center' },

  // 시안: 120 원 · left/top 50% 에 margin -60
  halo: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    borderRadius: radius.pill,
    backgroundColor: '#DBE7FD',
  },

  // 시안: flex gap-10, 가운데 정렬
  row: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 10 },
  // 시안: 40×72 rounded-2xl(16)
  clip: { width: 40, height: 72, borderRadius: 16 },

  blob: { position: 'absolute', left: '50%', top: '50%', backgroundColor: color.brand[600] },

  // 시안: gap-6(6) · height 36 가운데
  eq: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6, height: 36 },
  bar: { width: 7, borderRadius: radius.pill, backgroundColor: color.paper },

  // 시안: translate(-42%,-50%) → 32 기준 -13.44 / -16
  play: { position: 'absolute', left: '50%', top: '50%', marginLeft: -13.44, marginTop: -16 },
});

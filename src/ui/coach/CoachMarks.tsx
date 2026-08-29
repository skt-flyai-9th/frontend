/**
 * CoachMarks — 시안 `튜토리얼,홈UI,촬영화면UI.html` 의 스팟라이트 튜토리얼.
 *
 * **온보딩과 다릅니다.** 가입할 때 넘기는 소개가 아니라, 앱을 **쓰는 화면 위에**
 * 흐린 막을 덮고 짚어줄 곳만 구멍을 뚫어 "여기가 뭐다" 를 알려 줍니다.
 * 7단계이고 탭을 옮겨 가며 짚습니다.
 *
 * 시안 실측값
 *   막      rgba(15,18,25,0.3) + blur 5
 *   구멍    타겟 + pad, 모서리 radius(단계마다 다름) · 테두리 1.5 white/50
 *           바깥 그림자 0 0 15 white/25
 *   말풍선  좌우 16 · 유리 카드 radius 16 · 테두리 white/25
 *           `1/7` 12 bold white/70 · 건너뛰기 12.5 semibold
 *           제목 16 bold white/95 · 본문 13.5 white/70
 *           버튼 h40 — 이전(유리) : 다음(흰 배경) = 1 : 1.4
 *   자리    타겟이 위쪽(y<340)이면 말풍선을 **아래**, 아니면 **위**
 *
 * ⚠️ **구멍은 SVG 마스크로 뚫습니다 — 흐림 대신 둥근 모서리를 택했습니다.**
 *
 *    웹 시안은 막을 흐리게 하고(`blur 5`) CSS 마스크로 구멍을 뚫습니다. RN 에는
 *    그 조합이 없습니다 — `BlurView` 는 마스킹이 안 돼서, 처음에는 구멍 사방에
 *    흐린 판 네 개를 둘러 깔았습니다. 그랬더니 **구멍이 각지게 나왔습니다**
 *    (사장님 지적, 2026-08-29).
 *
 *    둘 다는 안 되므로 **모양**을 택했습니다. `react-native-svg` 의 `Mask` 로
 *    둥근 사각형 구멍을 정확히 뚫고, 흐림이 빠진 만큼 막을 조금 더 어둡게 합니다.
 *    흐림이 꼭 필요하면 네이티브 모듈(`@react-native-masked-view`)을 넣어야 하고
 *    그건 APK 재빌드가 필요합니다.
 *
 * 움직임 — 시안 `transition .28s cubic-bezier(.22,1,.36,1)`.
 *    단계를 넘기면 구멍이 다음 자리로 **미끄러져 갑니다.** 자리·크기·모서리가
 *    함께 움직입니다. 말풍선은 `pop-in` 으로 떠오릅니다.
 *    ⚠️ 위치·크기는 레이아웃 값이라 **네이티브 드라이버를 못 씁니다**
 *       (`useNativeDriver: false`). 한 번짜리 timing 이라 `Animated.loop` 함정
 *       (CLAUDE.md §5-④)과는 무관합니다.
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
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 구멍이 미끄러지려면 SVG 사각형의 값도 애니메이션을 받아야 합니다. */
const AnimatedRect = Animated.createAnimatedComponent(Rect);

import { useCoach, type CoachName } from './CoachContext';
import { navRef } from '../../navigation/navRef';
import { COACH_VERSION, useAppState } from '../../lib/appState';
import { pressTap } from '../press';
import theme, { color, radius as rad, space } from '../../design/theme';

/** 시안 `COACH_STEPS` 원문 그대로입니다 — 문구도 손대지 않았습니다. */
const STEPS: {
  name: CoachName;
  tab: 'HomeFeed' | 'Favorites' | 'AiChat' | 'My';
  title: string;
  body: string;
  pad: number;
  radius: number;
}[] = [
  {
    name: 'tab-home',
    tab: 'HomeFeed',
    title: '홈',
    body: '인기 숏폼을 보고 마음에 드는 구성을 그대로 따라 촬영해요.',
    pad: 8,
    radius: 16,
  },
  {
    name: 'video',
    tab: 'HomeFeed',
    title: '숏폼 미리보기',
    body: '영상을 직접 눌러 재생하고 소리를 켤 수 있어요.',
    pad: 0,
    radius: 0,
  },
  {
    name: 'make',
    tab: 'HomeFeed',
    title: '촬영 준비',
    body: '누르면 해당 숏폼의 촬영 가이드를 보고 따라 촬영할 수 있어요. 이어서 AI가 자동으로 편집해줘요.',
    pad: 6,
    radius: 999,
  },
  {
    name: 'tab-saved',
    tab: 'Favorites',
    title: '관심 목록',
    body: '좋아요한 숏폼을 모아 두고 언제든 촬영할 수 있어요.',
    pad: 8,
    radius: 16,
  },
  {
    name: 'tab-chat',
    tab: 'AiChat',
    title: 'AI 추천 숏폼',
    body: '몇 가지 질문에 답하면 매장에 맞는 촬영 구성을 추천해줘요.',
    pad: 8,
    radius: 16,
  },
  {
    name: 'tab-mypage',
    tab: 'My',
    title: '마이페이지',
    body: '사장님이 만든 숏폼을 보관해뒀어요. 편집하던 숏폼이 있다면 이어서 편집할 수도 있어요.',
    pad: 8,
    radius: 16,
  },
  {
    name: 'insight',
    tab: 'My',
    title: '매장 인사이트 분석 탭',
    body: '조회수·타깃 지표·AI 추천 숏폼을 한 화면에서 확인해요.',
    pad: 6,
    radius: 18,
  },
];

export function CoachMarks() {
  const coach = useCoach();
  const seen = useAppState((s) => s.coachSeen) === COACH_VERSION;
  const setCoachSeen = useAppState((s) => s.setCoachSeen);
  const signedIn = useAppState((s) => s.signedIn);

  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  /** 말풍선을 한 번 그려 보고 잰 실제 높이. 0 이면 아직 못 잰 것입니다. */
  const [tipH, setTipH] = useState(0);
  const { width: winW, height: winH } = Dimensions.get('window');
  /* 화면 맨 아래에 붙일 때 홈 인디케이터를 침범하지 않게 합니다(CLAUDE.md §3). */
  const insets = useSafeAreaInsets();

  /*
    🔴 **업데이트를 받으면 한 번 저절로 뜹니다** (2026-08-29 사장님 요청).

    `coachSeen` 이 기기에 저장돼 있고, 그 값이 `COACH_VERSION` 과 다르면 다시 뜹니다.
    이번 판이 처음이라 **모든 기기에서 한 번** 뜹니다. 다음에 다시 보여 주고 싶으면
    `appState.ts` 의 `COACH_VERSION` 만 올리면 됩니다.

    로그인 전에는 띄우지 않습니다 — 짚을 탭이 아직 없습니다.
  */
  useEffect(() => {
    if (!signedIn || seen) return;
    // 첫 화면이 자리를 잡은 뒤에 켭니다. 바로 켜면 위치를 0 으로 잽니다.
    const t = setTimeout(() => setRunning(true), 900);
    return () => clearTimeout(t);
  }, [signedIn, seen]);

  const cur = running ? STEPS[step] : null;

  /*
    지금 짚는 곳만 재게 합니다 — 나머지 여섯은 타이머조차 걸지 않습니다
    (`CoachContext` 머리말: 일곱 개가 다 보고해서 앱이 버벅였습니다).
  */
  useEffect(() => {
    coach?.setActive(cur ? cur.name : null);
  }, [coach, cur?.name]);

  /** 위치가 바뀌면 **이 컴포넌트만** 다시 그립니다. */
  const [, redraw] = useState(0);
  useEffect(() => {
    if (!coach) return;
    return coach.subscribe(() => redraw((n) => n + 1));
  }, [coach]);

  /** 단계의 탭으로 먼저 옮깁니다 — 짚을 곳이 화면에 없으면 뚫을 수가 없습니다. */
  useEffect(() => {
    if (!cur || !navRef.isReady()) return;
    // @ts-expect-error 중첩 라우트라 타입이 좁게 잡힙니다 — 이름은 실제 탭과 같습니다.
    navRef.navigate('Main', { screen: cur.tab });
  }, [cur?.tab, step]);

  const finish = useCallback(() => {
    setRunning(false);
    setCoachSeen();
  }, [setCoachSeen]);

  const rect = cur ? coach?.rectsRef.current[cur.name] : undefined;

  /** 구멍 = 짚을 곳 + 여백. 화면 밖으로 나가지 않게 잘라 둡니다. */
  const hole = useMemo(() => {
    if (!cur || !rect) return null;
    const x = Math.max(0, rect.x - cur.pad);
    const y = Math.max(0, rect.y - cur.pad);
    /*
      화면 밖으로 나가지 않게 자르되 **음수가 되지 않게** 막습니다.
      짚을 곳을 잘못 잰 값이 들어오면 높이가 음수가 되어 구멍이 뒤집힙니다.
    */
    return {
      x,
      y,
      w: Math.max(0, Math.min(winW - x, rect.w + cur.pad * 2)),
      h: Math.max(0, Math.min(winH - y, rect.h + cur.pad * 2)),
    };
  }, [cur, rect, winW, winH]);

  /*
    구멍이 다음 자리로 **미끄러져 갑니다** (시안 transition .28s).
    자리·크기·모서리를 한 시계로 함께 움직여야 도중에 모양이 어긋나지 않습니다.
  */
  const ax = useRef(new Animated.Value(0)).current;
  const ay = useRef(new Animated.Value(0)).current;
  const aw = useRef(new Animated.Value(0)).current;
  const ah = useRef(new Animated.Value(0)).current;
  const ar = useRef(new Animated.Value(0)).current;
  /** 첫 등장은 미끄러질 곳이 없습니다 — 그 자리에 바로 놓습니다. */
  const placed = useRef(false);

  const targetRadius = cur && hole ? (cur.radius === 999 ? Math.max(hole.w, hole.h) / 2 : cur.radius) : 0;

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
    const anims = to.map(([v, n]) =>
      Animated.timing(v, {
        toValue: n,
        duration: 280,
        // 시안 cubic-bezier(.22,1,.36,1) — 빠르게 나갔다 부드럽게 안착합니다.
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        // ⚠️ 위치·크기는 레이아웃 값이라 네이티브 드라이버를 못 씁니다.
        useNativeDriver: false,
      })
    );
    Animated.parallel(anims).start();
  }, [hole?.x, hole?.y, hole?.w, hole?.h, targetRadius]);

  /** 말풍선은 단계가 바뀔 때마다 떠오릅니다 (시안 pop-in). */
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    pop.setValue(0);
    Animated.timing(pop, {
      toValue: 1,
      duration: 260,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [step, pop]);

  if (!running || !cur) return null;

  const last = step === STEPS.length - 1;

  /*
    🔴 **말풍선 자리는 "구멍이 위냐 아래냐" 가 아니라 "들어갈 자리가 있느냐" 로 정합니다.**

    시안은 `hole.y < 340` 이면 아래에 둡니다. 그런데 2단계(영상 영역)는 구멍이
    **화면을 거의 다 차지**합니다 — 구멍 위쪽이라 아래에 두는데, 아래에 남은 자리가
    없어서 **버튼이 화면 밖으로 밀려났습니다**(사장님 지적, 2026-08-29).

    그래서 위·아래 남은 자리를 재서 들어가는 쪽에 둡니다. 둘 다 모자라면
    **화면 아래에 붙입니다** — 구멍을 조금 가려도 버튼이 보이는 쪽이 낫습니다.
  */
  /*
    🔴 **말풍선 높이는 재서 씁니다 — 어림수로 두면 버튼이 밖으로 나갑니다.**

    처음에는 190 으로 찍어 두고 계산했습니다. 실제 높이는 글자 수와 **사장님 폰의
    글자 크기 설정**에 따라 달라집니다. 크게 쓰시는 분이면 220 을 넘고, 그만큼
    아래 버튼이 화면 밖으로 밀립니다. 한 번 그려 본 값이 들어오면 그걸 씁니다.
  */
  const TIP_H = tipH || 200;
  const EDGE = Math.max(space[6], insets.bottom + space[2]);
  const roomBelow = hole ? winH - (hole.y + hole.h) - 12 : 0;
  const roomAbove = hole ? hole.y - 12 : 0;

  /**
   * 말풍선 위치를 **하나의 숫자(top)로** 정하고 화면 안으로 밀어 넣습니다.
   *
   * ⚠️ 처음에는 `top` / `bottom` 을 갈아 쓰며 놓았는데, 2단계에서 버튼이 화면
   *    밖으로 나갔습니다. 짚을 곳을 잰 값이 틀어지면(스크롤이 있는 화면 등)
   *    어느 쪽으로 놓든 밖으로 나갈 수 있습니다. **마지막에 무조건 잘라 넣는**
   *    방식이라야 어떤 값이 와도 버튼이 보입니다.
   */
  const wanted = !hole
    ? // 짚을 곳을 아직 못 쟀으면 아래에 둡니다 — 구멍이 늦게 뚫려도 버튼은 먼저 보입니다.
      winH - TIP_H - EDGE
    : roomBelow >= TIP_H
      ? hole.y + hole.h + 12
      : roomAbove >= TIP_H
        ? hole.y - TIP_H - 12
        : // 위아래 어디에도 안 들어가면 화면 아래에 붙입니다(2단계처럼 구멍이 클 때).
          winH - TIP_H - EDGE;
  const tipTop = Math.max(EDGE, Math.min(wanted, winH - TIP_H - EDGE));

  return (
    <View style={styles.fill} pointerEvents="box-none">
      {/*
        막 + 구멍. 흰 곳은 남기고 검은 곳(구멍)은 지웁니다 — `Mask` 의 규칙입니다.
        막을 눌러도 아래 화면이 눌리지 않게 이 층이 손가락을 받습니다.
      */}
      <View style={StyleSheet.absoluteFill} pointerEvents="auto">
        {/* 짚을 곳을 아직 못 쟀으면 구멍 없는 막만 깔립니다. */}
        <Svg width={winW} height={winH}>
          <Defs>
            <Mask id="coachHole">
              <Rect x={0} y={0} width={winW} height={winH} fill="#fff" />
              {hole ? (
                <AnimatedRect x={ax} y={ay} width={aw} height={ah} rx={ar} ry={ar} fill="#000" />
              ) : null}
            </Mask>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={winW}
            height={winH}
            fill="rgba(15,18,25,0.62)"
            mask="url(#coachHole)"
          />
        </Svg>
      </View>

      {/* 구멍 테두리 — 시안 1.5 white/50 + 바깥 흰 그림자 */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { left: ax, top: ay, width: aw, height: ah, borderRadius: ar },
          !hole && styles.hidden,
        ]}
      />

      {/* 말풍선 — 유리 카드 */}
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
        <View
          style={styles.tip}
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            setTipH((cur0) => (Math.abs(cur0 - h) > 1 ? h : cur0));
          }}
        >
          <View style={styles.tipHead}>
            <Text style={styles.count}>
              {step + 1}/{STEPS.length}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={finish}
              hitSlop={8}
              style={({ pressed }) => pressTap(pressed, 'icon')}
            >
              <Text style={styles.skip}>건너뛰기</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>{cur.title}</Text>
          <Text style={styles.body}>{cur.body}</Text>

          <View style={styles.btnRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: step === 0 }}
              disabled={step === 0}
              onPress={() => setStep((s) => Math.max(0, s - 1))}
              style={({ pressed }) => [styles.btn, styles.btnGhost, pressTap(pressed, 'button')]}
            >
              <Text style={[styles.btnGhostText, step === 0 && styles.btnDim]}>이전</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => (last ? finish() : setStep((s) => s + 1))}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                pressTap(pressed, 'button'),
              ]}
            >
              <Text style={styles.btnPrimaryText}>{last ? '완료' : '다음'}</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  hidden: { opacity: 0 },

  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    // 바깥으로 번지는 흰 빛 — 시안 boxShadow 0 0 15 white/25
    shadowColor: '#ffffff',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },

  tipWrap: { position: 'absolute', left: space[4], right: space[4] },
  /* 시안: radius 16 · 테두리 white/25 · px-4 pt-3 pb-3.5 */
  tip: {
    borderRadius: rad.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    // 흐림을 못 쓰므로(머리말 참고) 유리 느낌을 색으로 냅니다 — 시안보다 조금 진하게.
    backgroundColor: 'rgba(38,44,56,0.92)',
    paddingHorizontal: space[4],
    paddingTop: space[3],
    paddingBottom: 14,
    overflow: 'hidden',
  },
  tipHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: {
    ...theme.text.label,
    fontFamily: theme.text.heading.fontFamily,
    fontWeight: theme.text.heading.fontWeight,
    color: 'rgba(255,255,255,0.7)',
  },
  skip: {
    ...theme.text.label,
    fontSize: 12.5,
    fontFamily: theme.text.chipLabel.fontFamily,
    fontWeight: theme.text.chipLabel.fontWeight,
    color: 'rgba(255,255,255,0.7)',
  },
  /* 시안: 16 bold leading-tight */
  title: {
    ...theme.text.subheading,
    marginTop: space[2],
    lineHeight: 20,
    fontFamily: theme.text.heading.fontFamily,
    fontWeight: theme.text.heading.fontWeight,
    color: 'rgba(255,255,255,0.95)',
  },
  /* 시안: 13.5 leading-relaxed(×1.625) */
  body: {
    ...theme.text.caption,
    fontSize: 13.5,
    lineHeight: 22,
    marginTop: 4,
    color: 'rgba(255,255,255,0.7)',
  },

  btnRow: { flexDirection: 'row', gap: space[2], marginTop: 14 },
  btn: { height: 40, borderRadius: rad.md, alignItems: 'center', justifyContent: 'center' },
  /* 시안 비율 1 : 1.4 — "다음" 이 더 넓습니다 */
  btnGhost: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  btnGhostText: {
    ...theme.text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: 'rgba(255,255,255,0.85)',
  },
  btnDim: { color: 'rgba(255,255,255,0.35)' },
  btnPrimary: {
    flex: 1.4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  btnPrimaryText: {
    ...theme.text.bodySmall,
    fontFamily: theme.text.bodyStrong.fontFamily,
    fontWeight: theme.text.bodyStrong.fontWeight,
    color: color.ink[900],
  },
});

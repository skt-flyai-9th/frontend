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
 * ⚠️ **구멍은 마스크가 아니라 네 조각으로 만듭니다.**
 *    웹 시안은 CSS `mask-composite: exclude` 로 막에 구멍을 뚫습니다. RN 에는 그
 *    조합이 없고, `BlurView` 는 마스킹도 안 됩니다. 그래서 구멍의 위·아래·왼·오른쪽
 *    **네 개의 흐린 판**을 둘러 깝니다 — 가운데만 선명하게 남아 결과가 같습니다.
 *    (구멍 모서리는 각지지만 그 위에 얹는 둥근 테두리가 형태를 잡아 줍니다.)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';

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
  const { width: winW, height: winH } = Dimensions.get('window');

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

  useEffect(() => {
    coach?.setMeasuring(running);
  }, [running, coach]);

  const cur = running ? STEPS[step] : null;

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

  const rect = cur ? coach?.rects[cur.name] : undefined;

  /** 구멍 = 짚을 곳 + 여백. 화면 밖으로 나가지 않게 잘라 둡니다. */
  const hole = useMemo(() => {
    if (!cur || !rect) return null;
    const x = Math.max(0, rect.x - cur.pad);
    const y = Math.max(0, rect.y - cur.pad);
    return {
      x,
      y,
      w: Math.min(winW - x, rect.w + cur.pad * 2),
      h: Math.min(winH - y, rect.h + cur.pad * 2),
    };
  }, [cur, rect, winW, winH]);

  if (!running || !cur) return null;

  /*
    아직 짚을 곳을 못 쟀으면 **막만** 깔아 둡니다. 아무것도 안 그리면 튜토리얼이
    안 뜬 것처럼 보이고, 구멍 없이 막만 있으면 곧 뚫린다는 게 전해집니다.
  */
  if (!hole) {
    return <BlurView intensity={18} tint="dark" style={styles.fill} pointerEvents="auto" />;
  }

  const ringRadius = cur.radius === 999 ? Math.max(hole.w, hole.h) / 2 : cur.radius;
  /** 시안: 짚을 곳이 위쪽이면 말풍선을 아래에 둡니다. */
  const below = hole.y < winH * 0.4;
  const last = step === STEPS.length - 1;

  /** 구멍을 둘러싸는 네 조각. 가운데만 선명하게 남습니다. */
  const pieces: ViewStyle[] = [
    { left: 0, top: 0, right: 0, height: hole.y },
    { left: 0, top: hole.y + hole.h, right: 0, bottom: 0 },
    { left: 0, top: hole.y, width: hole.x, height: hole.h },
    { left: hole.x + hole.w, top: hole.y, right: 0, height: hole.h },
  ];

  return (
    <View style={styles.fill} pointerEvents="box-none">
      {pieces.map((p, i) => (
        <BlurView
          key={i}
          intensity={18}
          tint="dark"
          style={[styles.piece, p]}
          // 막을 눌러도 아래 화면이 눌리지 않게 막습니다.
          pointerEvents="auto"
        />
      ))}

      {/* 구멍 테두리 — 시안 1.5 white/50 + 바깥 흰 그림자 */}
      <View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            left: hole.x,
            top: hole.y,
            width: hole.w,
            height: hole.h,
            borderRadius: ringRadius,
          },
        ]}
      />

      {/* 말풍선 — 유리 카드 */}
      <View
        style={[
          styles.tipWrap,
          below ? { top: hole.y + hole.h + 12 } : { bottom: winH - hole.y + 12 },
        ]}
        pointerEvents="box-none"
      >
        <BlurView intensity={30} tint="dark" style={styles.tip}>
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
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  /* 시안 막 색 — blur 위에 옅게 덧칠해 대비를 만듭니다. */
  piece: { position: 'absolute', backgroundColor: 'rgba(15,18,25,0.30)' },

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
    backgroundColor: 'rgba(255,255,255,0.14)',
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

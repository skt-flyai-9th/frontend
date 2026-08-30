/**
 * CoachMarks — **홈 튜토리얼이 무엇을 짚는가.** 그리는 일은 하지 않습니다.
 *
 * 시안 `튜토리얼,홈UI,촬영화면UI.html` 의 스팟라이트 튜토리얼입니다.
 * **온보딩과 다릅니다** — 가입할 때 넘기는 소개가 아니라, 앱을 **쓰는 화면 위에**
 * 흐린 막을 덮고 짚어줄 곳만 뚫어 "여기가 뭐다" 를 알려 줍니다.
 *
 * 이 파일에 남은 건 셋뿐입니다.
 *   ① 단계 목록 (시안 `COACH_STEPS` 원문 — 문구도 손대지 않았습니다)
 *   ② 언제 뜰지 (업데이트를 받으면 한 번 · 설정에서 다시 보기)
 *   ③ 단계마다 어느 탭으로 옮길지
 *
 * 그리는 값과 방법은 각각 `tutorialTheme.ts` · `TutorialOverlay.tsx` 에 있습니다.
 * 다른 화면에 안내를 붙일 때도 **이 파일을 고치는 게 아니라** 같은 모양의 단계
 * 목록을 하나 더 쓰고 `TutorialOverlay` 에 넘기면 됩니다.
 */
import React, { useCallback, useEffect, useState } from 'react';

import { TutorialOverlay, type TutorialStep } from './TutorialOverlay';
import { useCoach } from './CoachContext';
import { navRef } from '../../navigation/navRef';
import { COACH_VERSION, useAppState } from '../../lib/appState';

type TabName = 'HomeFeed' | 'Favorites' | 'AiChat' | 'My';

/** 시안 `COACH_STEPS` 원문 그대로입니다 — `sel` 이 `targetId`, `body` 가 `description`. */
const STEPS: (TutorialStep & { meta: TabName })[] = [
  {
    targetId: 'tab-home',
    /* 칸(98) 말고 가운데 아이콘을 짚습니다 — 좁힐수록 둥글게 읽힙니다. */
    inset: { x: 20 },
    meta: 'HomeFeed',
    title: '홈',
    description: '인기 숏폼을 보고 마음에 드는 구성을 그대로 따라 촬영해요.',
    pad: 4,
    radius: 16,
  },
  {
    targetId: 'video',
    meta: 'HomeFeed',
    title: '숏폼 미리보기',
    description: '영상을 직접 눌러 재생하고 소리를 켤 수 있어요.',
    pad: 0,
    radius: 0,
  },
  {
    targetId: 'make',
    meta: 'HomeFeed',
    title: '촬영 준비',
    description:
      '누르면 해당 숏폼의 촬영 가이드를 보고 따라 촬영할 수 있어요. 이어서 AI가 자동으로 편집해줘요.',
    pad: 6,
    radius: 999,
  },
  {
    targetId: 'tab-saved',
    /* 칸(98) 말고 가운데 아이콘을 짚습니다 — 좁힐수록 둥글게 읽힙니다. */
    inset: { x: 20 },
    meta: 'Favorites',
    title: '관심 목록',
    description: '좋아요한 숏폼을 모아 두고 언제든 촬영할 수 있어요.',
    pad: 4,
    radius: 16,
  },
  {
    targetId: 'tab-chat',
    /* 칸(98) 말고 가운데 아이콘을 짚습니다 — 좁힐수록 둥글게 읽힙니다. */
    inset: { x: 20 },
    meta: 'AiChat',
    title: 'AI 추천 숏폼',
    description: '몇 가지 질문에 답하면 매장에 맞는 촬영 구성을 추천해줘요.',
    pad: 4,
    radius: 16,
  },
  {
    targetId: 'tab-mypage',
    /* 칸(98) 말고 가운데 아이콘을 짚습니다 — 좁힐수록 둥글게 읽힙니다. */
    inset: { x: 20 },
    meta: 'My',
    title: '마이페이지',
    description:
      '사장님이 만든 숏폼을 보관해뒀어요. 편집하던 숏폼이 있다면 이어서 편집할 수도 있어요.',
    pad: 4,
    radius: 16,
  },
  {
    targetId: 'insight',
    meta: 'My',
    title: '매장 인사이트 분석 탭',
    description: '조회수·타깃 지표·AI 추천 숏폼을 한 화면에서 확인해요.',
    pad: 6,
    radius: 18,
  },
];

export function CoachMarks() {
  const seen = useAppState((s) => s.coachSeen) === COACH_VERSION;
  const setCoachSeen = useAppState((s) => s.setCoachSeen);
  const signedIn = useAppState((s) => s.signedIn);

  const [running, setRunning] = useState(false);
  const coach = useCoach();

  /*
    🔴 **업데이트를 받으면 한 번 저절로 뜹니다** (2026-08-29 사장님 요청).

    기기에 저장된 `coachSeen` 이 `COACH_VERSION` 과 다르면 다시 뜹니다. 안내 내용을
    바꿨을 때 그 값을 올리면 모든 기기에서 한 번 더 뜹니다.

    설정의 **"앱 사용법 다시 보기"** 는 저장된 값을 지웁니다(`replayCoach`) — 그러면
    여기 조건이 다시 참이 되어 뜹니다. 판 번호를 올리지 않고도 보는 길입니다
    (2026-08-30 사장님 요청: "맨날 판번호 올리기 귀찮네").

    로그인 전에는 띄우지 않습니다 — 짚을 탭이 아직 없습니다.
  */
  useEffect(() => {
    if (!signedIn || seen) {
      setRunning(false);
      return;
    }
    // 첫 화면이 자리를 잡은 뒤에 켭니다. 바로 켜면 위치를 0 으로 잽니다.
    const t = setTimeout(() => setRunning(true), 900);
    return () => clearTimeout(t);
  }, [signedIn, seen]);

  /*
    뜨기 **전에** 1단계 자리를 미리 재 둡니다 (2026-08-30).

    안 재 두면 오버레이가 뜬 첫 순간에는 구멍을 몰라서 화면 전체가 막힌 채로 있다가,
    측정이 돌아온 뒤에야 구멍이 뚫립니다. 그 사이가 "뜨고 나서 한 박자" 로 보입니다.
    `setActive` 의 **두 번째 자리(다음에 짚을 곳)** 에 넣으면, 아직 짚지 않으면서
    자리만 재 둡니다 — 위 900ms 를 기다리는 동안 값이 채워집니다.
  */
  useEffect(() => {
    if (!signedIn || seen || running) return;
    coach?.setActive(null, STEPS[0].targetId);
  }, [coach, signedIn, seen, running]);

  /** 단계의 탭으로 옮깁니다 — 짚을 곳이 화면에 없으면 뚫을 수가 없습니다. */
  const goTab = useCallback((step: TutorialStep) => {
    const tab = step.meta as TabName | undefined;
    if (!tab || !navRef.isReady()) return;
    // @ts-expect-error 중첩 라우트라 타입이 좁게 잡힙니다 — 이름은 실제 탭과 같습니다.
    navRef.navigate('Main', { screen: tab });
  }, []);

  const finish = useCallback(() => {
    setRunning(false);
    setCoachSeen();
  }, [setCoachSeen]);

  return <TutorialOverlay steps={STEPS} visible={running} onFinish={finish} onEnterStep={goTab} />;
}

import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 로고 splash 는 인트로 화면(IntroSplash)이 대신합니다 — Image·View 를 여기서 쓰지 않습니다
import RootNavigator from './src/navigation/RootNavigator';
import { BlurTargetView } from 'expo-blur';
import { CoachProvider } from './src/ui/coach/CoachContext';
import { blurTargetRef } from './src/ui/coach/blurTarget';
import { CoachMarks } from './src/ui/coach/CoachMarks';
import { useAppFonts } from './src/design/fonts';
import { useHydrated } from './src/lib/appState';
import { usePushNotifications } from './src/lib/push';
import { IntroSplash } from './src/domains/onboarding/components/IntroSplash';
import { ApiError } from './src/api/http';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * 디자인 QA 캡처용 안전영역.
 *
 * 시안은 iPhone 프레임(393x852) 기준으로 상단 상태바 몫 54px 을 비워 두고
 * 그 아래에서 화면이 시작합니다. 실기기에서는 SafeAreaView 가 같은 일을 하지만,
 * **헤드리스 브라우저에는 상태바가 없어 inset 이 0** 입니다. 그대로 찍으면
 * 앱 화면이 시안보다 통째로 위에 붙어, 레이아웃이 맞는데도 전부 어긋나 보입니다.
 *
 * 그래서 캡처 모드에서만 기기와 같은 inset 을 주입합니다.
 * 실제 배포 빌드에는 이 값이 실리지 않습니다(플래그 없음 → undefined → 기기값 사용).
 */
const QA_CAPTURE = process.env.EXPO_PUBLIC_QA_NAV === '1';
const QA_FRAME = { x: 0, y: 0, width: 393, height: 852 };
const QA_INSETS = { top: 54, left: 0, right: 0, bottom: 34 };

/**
 * 캡처 모드에서는 기기와 같은 안전영역을 **고정**합니다.
 * SafeAreaProvider 의 initialMetrics 는 초기값일 뿐이라, 웹에서는 곧바로
 * 실제 측정값(0)으로 덮어써집니다. 그래서 컨텍스트를 직접 감쌉니다.
 */
function CaptureSafeArea({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaFrameContext.Provider value={QA_FRAME}>
      <SafeAreaInsetsContext.Provider value={QA_INSETS}>{children}</SafeAreaInsetsContext.Provider>
    </SafeAreaFrameContext.Provider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 사장님은 가게에서 신호가 나쁜 곳에 있을 수 있습니다.
      // 무한 재시도는 배터리만 먹으므로 두 번까지만 합니다.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

/**
 * 켤 때 새 코드가 있으면 **그 자리에서 갈아끼웁니다** (2026-08-26).
 *
 * expo-updates 의 기본 동작은 "일단 켜고, 뒤에서 받아 두고, **다음 실행**에 적용" 입니다.
 * 그러면 고친 걸 보려고 앱을 두 번 껐다 켜야 합니다 — 사장님이 바로 지적하신 부분입니다.
 *
 * 그 대기 시간(`fallbackToCacheTimeout`)은 **APK 안에 구워져 있어** 바꾸려면 빌드를
 * 다시 해야 합니다. 그래서 같은 일을 여기 JS 에서 합니다 — 이 코드 자체가 OTA 로 갑니다.
 *
 * 규칙 두 가지:
 *   · **켤 때만** 합니다. 촬영 중에 백그라운드 갔다 돌아왔다고 새로고침하면
 *     찍던 것이 날아갑니다. 시작 시점에는 잃을 것이 없습니다.
 *   · **{UPDATE_WAIT_MS}ms 만 기다립니다.** 신호가 나쁜 가게에서 splash 가 하염없이
 *     붙잡히면 안 됩니다. 못 받으면 그냥 지금 코드로 켜고, 받아둔 건 다음에 적용됩니다.
 */
const UPDATE_WAIT_MS = 4000;

async function applyUpdateIfAny(): Promise<void> {
  if (__DEV__ || !Updates.isEnabled) return;
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return;
  await Updates.fetchUpdateAsync();
  // 여기서 JS 가 새 묶음으로 다시 시작합니다 — 아래 코드는 실행되지 않습니다.
  await Updates.reloadAsync();
}

export default function App() {
  const fontsReady = useAppFonts();

  /**
   * 업데이트 확인이 끝났는지(또는 기다리기를 포기했는지).
   * 폰트·저장값 복원과 **같은 splash 뒤에서** 함께 기다리므로 체감 시간이 겹칩니다.
   */
  const [updateSettled, setUpdateSettled] = useState(false);
  useEffect(() => {
    let done = false;
    const settle = () => {
      if (!done) {
        done = true;
        setUpdateSettled(true);
      }
    };
    const timer = setTimeout(settle, UPDATE_WAIT_MS);
    applyUpdateIfAny()
      .catch(() => {})
      .finally(settle);
    return () => clearTimeout(timer);
  }, []);
  /**
   * 기기에 저장된 값(로그인 여부·가게·튜토리얼)이 올라올 때까지 기다립니다.
   *
   * `RootNavigator` 는 `initialRouteName` 을 **첫 렌더에 딱 한 번** 정합니다.
   * 그 시점에 persist 복원이 안 끝나 있으면 전부 초기값으로 읽혀,
   * 이미 튜토리얼을 본 사람에게도 켤 때마다 다시 뜹니다.
   * 폰트 로딩과 같은 splash 뒤에서 함께 기다리므로 체감 시간은 늘지 않습니다.
   */
  const hydrated = useHydrated();

  /*
    편집 완료 알림 — 토큰 등록과 "알림을 눌렀을 때 이동" 을 답니다.
    ⚠️ 조건부로 부르면 안 됩니다(훅 순서). 아래 splash 조기 반환보다 위에 둡니다.
       알림이 안 붙어도 화면은 그대로 뜹니다 — push.ts 가 실패를 삼키고 로그만 남깁니다.
  */
  usePushNotifications();

  const ready = fontsReady && hydrated && updateSettled;

  /*
    인트로 — 시안 `SplashScreen`. **켤 때마다** 2.2 초 지나갑니다 (누르면 바로 넘어갑니다).

    화면이 아니라 네비게이터 **앞을 덮는 방식**입니다. 시안은 이 화면에서 `auth` 로
    보내지만, 우리는 이미 로그인한 분을 로그인 화면으로 보내면 안 되기 때문입니다.
    덮개라 그 뒤에서 네비게이터가 정상적으로 첫 화면을 정합니다.
  */
  /*
    ⚠️ 캡처 모드에서는 인트로를 건너뜁니다. 이 덮개가 떠 있는 동안은 RootNavigator 가
       아직 없어서 `__realsNav` 도 없습니다 — 캡처 스크립트가 바로 라우트를 부르면
       2.2초 동안 실패합니다 (CLAUDE.md §3 의 QA 전역).
  */
  const [introDone, setIntroDone] = useState(QA_CAPTURE);
  const endIntro = useCallback(() => setIntroDone(true), []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  /*
    폰트·저장값이 아직이면 **한 줄 없이** 로고만 돌립니다 — Pretendard 가 없는 상태에서
    글자를 그리면 잠깐 깨져 보입니다. 준비되면 같은 화면에 한 줄이 떠오릅니다.
    타이머는 이 컴포넌트가 처음 붙는 순간부터라, 로딩이 길어도 인트로가 늘어지지 않습니다.
  */
  if (!ready || !introDone) {
    return <IntroSplash onDone={endIntro} showTagline={ready} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        {/*
          코치마크는 **화면 위에 덮는 막**이라 네비게이터 밖(가장 바깥)에 둡니다.
          안에 두면 탭을 옮길 때 같이 사라지는데, 이 튜토리얼은 탭을 옮겨 가며
          짚어야 해서 화면이 바뀌어도 살아 있어야 합니다.

          `CoachProvider` 는 짚을 곳들이 자기 위치를 보고할 곳이라 더 바깥입니다.
        */}
        <CoachProvider>
          {/*
            🔴 **튜토리얼 블러가 흐릴 대상**입니다 (`ui/coach/blurTarget.ts` 머리말).
               안드로이드는 이 그릇을 지정하지 않으면 블러가 조용히 꺼집니다.
               다른 플랫폼에서는 그냥 `View` 라 아무 영향이 없습니다.
          */}
          <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
            {QA_CAPTURE ? (
              <CaptureSafeArea>
                <RootNavigator />
              </CaptureSafeArea>
            ) : (
              <>
                <StatusBar style="dark" />
                <RootNavigator />
              </>
            )}
          </BlurTargetView>
          <CoachMarks />
        </CoachProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

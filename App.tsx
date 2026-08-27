import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Image, View } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { useAppFonts } from './src/design/fonts';
import { useHydrated } from './src/lib/appState';
import { usePushNotifications } from './src/lib/push';
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

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    /**
     * splash — 폰트·저장값이 올라오는 공백을 빈 화면 대신 로고로 채웁니다.
     *
     * 2026-08-26: 새 로고 이미지로 바꾸면서 **폰트 걱정이 없어졌습니다.**
     * 예전에는 글자로 그렸는데, 이 화면은 Pretendard 가 아직 로딩되기 전이라
     * 없는 패밀리를 지정하면 글자가 잠깐 깨져 보였습니다. 이미지는 그 문제가 없습니다.
     * 폭 168 은 예전 글자(34) 로고와 눈으로 같은 무게가 되는 값입니다.
     */
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('./assets/logo-wordmark.png')}
          style={{ width: 168, height: 168 / (813 / 263) }}
          resizeMode="contain"
          tintColor="#0F172A"
        />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

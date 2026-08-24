import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Text, View } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { useAppFonts } from './src/design/fonts';
import { ApiError } from './src/api/http';
import { PlayTri } from './src/ui/RealsLogo';

SplashScreen.preventAutoHideAsync().catch(() => {});

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

export default function App() {
  const fontsReady = useAppFonts();

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  if (!fontsReady) {
    /**
     * 시안 splash — 폰트 로딩 공백을 빈 화면 대신 로고(Reals▶)로 채웁니다.
     *
     * ⚠️ 여기서는 ui/RealsLogo 를 쓰지 않습니다.
     *    그 컴포넌트는 Pretendard 패밀리를 지정하는데, 이 화면이 그려지는 시점은
     *    폰트가 **아직 로딩되기 전**입니다. 없는 패밀리를 지정하면 기기에 따라
     *    글자가 잠깐 깨져 보입니다. 그래서 글자는 시스템 폰트로 두고,
     *    삼각형만 시안과 같은 도형(PlayTri)을 씁니다.
     *    시안 비율: 삼각형 = 글자 크기 × 0.31 → 34 × 0.31 ≈ 11
     */
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 34, fontWeight: '600', letterSpacing: -0.68, color: '#0F172A' }}>Reals</Text>
          <View style={{ marginLeft: 34 * 0.06, marginBottom: 34 * 0.1 }}>
            <PlayTri size={11} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

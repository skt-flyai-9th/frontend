import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Text, View } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { useAppFonts } from './src/design/fonts';
import { ApiError } from './src/api/http';

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
    // 시안 splash — 폰트 로딩 공백을 빈 화면 대신 로고(Reals▶)로 채웁니다.
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 34, fontWeight: '600', letterSpacing: -0.7, color: '#0F172A' }}>Reals</Text>
          <View style={{ width: 0, height: 0, marginLeft: 3, marginBottom: 7, borderTopWidth: 5.5, borderBottomWidth: 5.5, borderLeftWidth: 9.5, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#EF4444' }} />
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

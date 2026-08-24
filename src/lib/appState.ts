/**
 * appState.ts — 서버가 아닌 기기 로컬 상태.
 *
 * 서버 데이터는 react-query 가 관리합니다. 여기 두는 건 그 외의 것뿐입니다.
 *   - 지금 보고 있는 가게 id
 *   - 카메라 가이드 표시 설정
 *   - 로그인 여부 (토큰 존재 캐시)
 *
 * 서버에 있는 값을 여기 복사해 두면 두 곳이 어긋납니다. 하지 않습니다.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  /** 로그인 후 등록·선택한 가게 */
  storeId: number | null;
  signedIn: boolean;

  /** 카메라 가이드 (기기 설정) */
  guideVisible: boolean;
  guideOpacity: number;

  /**
   * 포맷 피드 필터 (명세 S05.2.2 "선택값 세션 유지").
   * 화면을 나갔다 와도 고른 조건이 남아야 합니다.
   * 매번 처음부터 다시 고르게 하면 탐색을 포기합니다.
   */
  formatFilters: {
    formatType?: string;
    faceExposureLevel?: string;
    sort: string;
    period: string;
    keyword: string;
  };

  setStoreId: (id: number | null) => void;
  setSignedIn: (v: boolean) => void;
  toggleGuide: () => void;
  setGuideOpacity: (v: number) => void;
  setFormatFilters: (f: Partial<AppState['formatFilters']>) => void;
  resetFormatFilters: () => void;
  reset: () => void;
}

export const useAppState = create<AppState>()(
  persist(
    (set) => ({
      storeId: null,
      signedIn: false,
      guideVisible: true,
      guideOpacity: 0.8,
      formatFilters: { sort: 'trending', period: '7d', keyword: '' },

      setStoreId: (storeId) => set({ storeId }),
      setSignedIn: (signedIn) => set({ signedIn }),
      toggleGuide: () => set((s) => ({ guideVisible: !s.guideVisible })),
      setGuideOpacity: (guideOpacity) => set({ guideOpacity }),

      setFormatFilters: (f) =>
        set((s) => ({ formatFilters: { ...s.formatFilters, ...f } })),
      resetFormatFilters: () =>
        set({ formatFilters: { sort: 'trending', period: '7d', keyword: '' } }),
      reset: () => set({ storeId: null, signedIn: false }),
    }),
    {
      name: 'reals.app',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** 화면에서 자주 쓰는 축약 */
export function useCurrentStore(): number | undefined {
  return useAppState((s) => s.storeId) ?? undefined;
}

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
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 코치마크 판 번호. 기기에 저장된 값이 이것과 다르면 **한 번 더** 뜹니다.
 * 안내 내용을 바꿨을 때 올리세요 (`v1` → `v2`).
 */
export const COACH_VERSION = 'v1';

interface AppState {
  /** 로그인 후 등록·선택한 가게 */
  storeId: number | null;
  signedIn: boolean;

  /**
   * 최초 실행 튜토리얼을 본 적이 있는지 (`domains/onboarding`).
   *
   * **계정이 아니라 기기 기준**입니다. 그래서 `reset()`(로그아웃)이 건드리지
   * 않습니다 — 로그아웃할 때마다 튜토리얼이 다시 뜨면 안내가 아니라 방해입니다.
   */
  tutorialSeen: boolean;

  /**
   * 스팟라이트 코치마크(`ui/coach`)를 본 판(版). 안 봤으면 `null` 입니다.
   *
   * ⚠️ **불린이 아니라 판 번호입니다.** `COACH_VERSION` 과 다르면 다시 뜹니다 —
   *    안내할 내용이 바뀌면 그 상수만 올리면 모두에게 한 번 더 보입니다.
   *    (2026-08-29: 이번 판이 처음이라 **모든 기기에서 한 번** 뜹니다.)
   *
   * `tutorialSeen` 과 마찬가지로 **기기 기준**이라 로그아웃이 건드리지 않습니다.
   */
  coachSeen: string | null;

  /**
   * 마케팅 수신 동의 (약관 화면에서 받습니다).
   *
   * 받는 곳(약관)과 서버로 보내는 곳(1.2 회원가입)이 달라서 여기를 거칩니다.
   * 예전에는 회원가입 화면에서 한 번 더 물었는데, 시안에는 그 체크박스가 없고
   * 같은 동의를 두 번 받는 것도 이상합니다. 약관에서 받은 값을 그대로 씁니다.
   */
  marketingAgreed: boolean;

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
    requiresFace?: boolean;
    sort: string;
    period: string;
    keyword: string;
  };

  setStoreId: (id: number | null) => void;
  setSignedIn: (v: boolean) => void;
  setTutorialSeen: (v: boolean) => void;
  /** 지금 판을 봤다고 표시합니다(코치마크). */
  setCoachSeen: () => void;
  setMarketingAgreed: (v: boolean) => void;
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
      tutorialSeen: false,
      coachSeen: null,
      marketingAgreed: false,
      guideVisible: true,
      guideOpacity: 0.8,
      formatFilters: { sort: 'trending', period: '7d', keyword: '' },

      setStoreId: (storeId) => set({ storeId }),
      setSignedIn: (signedIn) => set({ signedIn }),
      setTutorialSeen: (tutorialSeen) => set({ tutorialSeen }),
      setCoachSeen: () => set({ coachSeen: COACH_VERSION }),
      setMarketingAgreed: (marketingAgreed) => set({ marketingAgreed }),
      toggleGuide: () => set((s) => ({ guideVisible: !s.guideVisible })),
      setGuideOpacity: (guideOpacity) => set({ guideOpacity }),

      setFormatFilters: (f) =>
        set((s) => ({ formatFilters: { ...s.formatFilters, ...f } })),
      resetFormatFilters: () =>
        set({ formatFilters: { sort: 'trending', period: '7d', keyword: '' } }),
      // tutorialSeen 은 일부러 빠져 있습니다 (위 필드 주석 참고).
      reset: () => set({ storeId: null, signedIn: false }),
    }),
    {
      name: 'reals.app',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/**
 * AsyncStorage 에서 값이 실제로 올라왔는지.
 *
 * ⚠️ persist 는 **비동기**입니다. 복원되기 전 한 프레임 동안은 위의 초기값
 *    (signedIn false · tutorialSeen false)이 그대로 보입니다. 그 순간에 첫 화면을
 *    정하면 **이미 본 튜토리얼이 켤 때마다 다시 뜹니다.**
 *    그래서 `App.tsx` 가 이 값이 true 가 될 때까지 splash 를 붙잡습니다.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAppState.persist.hasHydrated());

  useEffect(() => {
    // 구독을 걸기 전에 이미 끝났을 수 있어 양쪽을 다 봅니다.
    const done = useAppState.persist.onFinishHydration(() => setHydrated(true));
    if (useAppState.persist.hasHydrated()) setHydrated(true);
    return done;
  }, []);

  return hydrated;
}

/** 화면에서 자주 쓰는 축약 */
export function useCurrentStore(): number | undefined {
  return useAppState((s) => s.storeId) ?? undefined;
}

/**
 * ChromeContext — 홈에서 **바를 한 번에 하나만** 띄우는 스위치.
 *
 * ─────────────────────────────────────────────────────────────
 * 홈에서는 선반과 탭바 **둘 중 하나만** 뜹니다 (2026-08-31, 사장님 지시)
 * ─────────────────────────────────────────────────────────────
 * 홈 앱바(리얼스 로고 · 햄버거)는 뺐습니다. 남은 둘은 **번갈아** 띄웁니다.
 *
 *   shelf  선반만   무대 708 → 영상 393×699 · 선반 65
 *   tabs   탭바만   무대 699 → 영상 393×699 · 탭바 65 (49 + 남는 16)
 *
 * **두 모드 다 영상이 393×699 입니다** — 옆 여백 0 · 잘림 0 · 위아래 틈 0.
 * 둘을 같이 띄우면(56 + 49 = 105) 예산 65 를 넘겨 영상이 370 으로 줄고 옆에
 * 여백이 생깁니다. 그래서 **하나만** 띄웁니다.
 *
 * 왜 예산이 65인가 —
 *
 *   852 − 상태바 54 − 홈 인디케이터 34 = 764   ← 나눠 쓸 수 있는 전부
 *   폭을 꽉 채운 9:16                   = 699
 *                                       ────
 *   바 예산                             =  65
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 **바를 영상 위로 띄우면 안 됩니다**
 * ─────────────────────────────────────────────────────────────
 * 자리를 비우는 방법은 밀어내기와 덮기 둘인데, **덮기는 약관 위반**입니다.
 *
 *   "You must not display overlays, frames, or other visual elements in front of
 *    any part of a YouTube embedded player, including player controls."
 *      — Required Minimum Functionality · Overlays and frames
 *
 * 같은 이유로 **영상 위에 투명한 터치 판도 못 놓습니다.** 가려서가 아니라
 * 쇼츠 자체 조작을 막게 되어서입니다 — Developer Policies III.I.6
 * ("block any portion or **functionality** of a YouTube player").
 * 그래서 모드 전환은 영상이 아니라 **목록 스크롤**에 얹었습니다.
 *
 * 자세한 근거는 CLAUDE.md §8-1.
 */
import { sizing, space } from '../design/theme';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ChromeMode = 'shelf' | 'tabs' | 'all';

type ChromeApi = {
  mode: ChromeMode;
  /** 홈이 바꿉니다. 잠겨 있으면 기억만 하고 화면은 그대로 둡니다. */
  setMode: (m: ChromeMode) => void;
  /**
   * 튜토리얼이 **단계마다 필요한 모드로** 잠급니다 (`null` 이면 잠금 해제).
   *
   * ⚠️ 코치마크는 단계마다 **짚는 곳이 다릅니다** — 탭 아이콘을 짚는 단계는 탭바가,
   *    촬영 버튼을 짚는 단계는 선반이 화면에 있어야 합니다. 하나라도 없으면 구멍이
   *    엉뚱한 자리에 뚫립니다(2026-08-31: "이상한 타원으로 포커싱").
   *
   *    한때 둘을 **같이** 띄웠는데, 그러면 실제 화면과 달라집니다 — 홈은 늘 둘 중
   *    하나만 뜹니다. 그래서 **단계가 원하는 쪽 하나만** 띄웁니다
   *    (2026-08-31 지시: "실제 화면과 가장 닮도록").
   */
  setLock: (m: ChromeMode | null) => void;
};

const Ctx = createContext<ChromeApi | null>(null);

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeRaw] = useState<ChromeMode>('shelf');
  const [locked, setLockedRaw] = useState<ChromeMode | null>(null);
  /** 잠금이 풀렸을 때 돌아갈 자리 */
  const wanted = useRef<ChromeMode>('shelf');

  const setMode = useCallback((m: ChromeMode) => {
    wanted.current = m;
    setModeRaw(m);
  }, []);

  const setLock = useCallback((m: ChromeMode | null) => {
    setLockedRaw(m);
    setModeRaw(m ?? wanted.current);
  }, []);

  const api = useMemo<ChromeApi>(
    () => ({ mode: locked ?? mode, setMode, setLock }),
    [mode, locked, setMode, setLock]
  );

  /*
    캡처(QA) 전용 통로 — `EXPO_PUBLIC_QA_NAV=1` 일 때만 답니다.
    모드는 **오버스크롤과 넘김이 끝나는 순간**에 바뀌는데, 웹에는 고무줄
    오버스크롤이 없어서 앱바 모드를 손으로 만들 수가 없습니다. 시안 대조용으로
    세 모드를 직접 세우려고 둔 것이고, 앱 동작에는 영향이 없습니다
    (`api/mock/server.ts` 의 `__realsShotAll` 과 같은 방식입니다).
  */
  useEffect(() => {
    if (process.env.EXPO_PUBLIC_QA_NAV !== '1') return;
    (globalThis as { __realsChrome?: (m: ChromeMode) => ChromeMode }).__realsChrome = (m) => {
      setMode(m);
      return m;
    };
  }, [setMode]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/**
 * Provider 밖에서도 죽지 않습니다 — 그때는 `all` 로 굳어집니다.
 * (설정·촬영처럼 탭 밖에 있는 화면들이 이 훅을 몰라도 되게 하려는 것입니다)
 */
export function useChrome(): ChromeApi {
  return useContext(Ctx) ?? FALLBACK;
}

const FALLBACK: ChromeApi = { mode: 'all', setMode: () => {}, setLock: () => {} };

/**
 * 🔴 **폭을 꽉 채웠을 때의 영상 높이. 한 곳에서만 계산합니다** (2026-08-31).
 *
 * `GuidePlayer` 는 `Math.round(width * 16 / 9)` 로 자기 높이를 정합니다. 무대를
 * `Math.ceil` 로 잡았더니 **기기 폭이 정수가 아닐 때 1pt 가 어긋났고**, 그 틈이
 * 영상을 감싸는 **흰 줄**로 보였습니다. 393 처럼 딱 떨어지는 폭에서는 두 식이 같은
 * 값이라 웹 캡처로는 안 잡혔습니다 — 실제 안드로이드 폭은 392.72 · 411.43 같은 소수입니다.
 *
 * 그래서 **플레이어와 똑같은 식**을 여기 하나만 두고 무대가 이걸 씁니다.
 */
export const videoHeightFor = (winW: number) => Math.round((winW * 16) / 9);

/**
 * 🔴 **아래 안전영역은 이 값 하나로 통일합니다** (2026-08-31).
 *
 * 탭바는 `Math.max(insets.bottom, 8)` 을 쓰는데 홈은 `insets.bottom` 을 그대로
 * 빼고 있었습니다. 폰의 `insets.bottom` 이 8 보다 작으면(버튼 내비 기기에서 0 인
 * 경우가 있습니다) **그 차이만큼 한 장이 화면보다 커져서**, 아래쪽에 다음 영상이
 * 삐져나오고 선반이 밀려 잘립니다.
 *
 * 393×852(안전영역 34)에서는 두 값이 같아 **웹 캡처로는 절대 안 잡힙니다.**
 */
export const bottomInsetFor = (insetBottom: number) => Math.max(insetBottom, space[2]);

/**
 * 🔴 **탭바가 남는 세로를 먹습니다** (2026-08-31, "검은 줄 안 생기게").
 *
 * 영상은 폭이 정해져 있어 자리가 넓어도 **699 를 넘지 않습니다.** 탭바만 있을 때
 * 쓸 수 있는 세로는 715 라 **16pt 가 남고**, 그 남는 자리가 영상과 탭바 사이에
 * 줄로 보입니다. 그래서 탭바가 그만큼 더 자랍니다 — 자라는 자리는 **아래쪽**
 * (홈 인디케이터 쪽)이라 티가 안 나고, **탭바 윗면이 영상에 딱 닿습니다.**
 *
 *   탭바 49 + 16 = 65   ·   선반 56 + 9 = 65   ← 둘 다 예산과 같아집니다
 */
export function tabSlackFor(
  mode: ChromeMode,
  winW: number,
  winH: number,
  insetTop: number,
  insetBottom: number
): number {
  if (mode !== 'tabs') return 0;   // 선반과 같이 뜰 때(all)는 남는 게 없습니다
  const room = winH - insetTop - bottomInsetFor(insetBottom) - videoHeightFor(winW);
  return Math.max(0, room - sizing.tabRowHeight);
}

/** 이 모드에서 탭바를 그리나 */
export const showsTabs = (m: ChromeMode) => m === 'tabs' || m === 'all';
/** 이 모드에서 선반을 그리나 — 둘 중 하나만 뜹니다 */
export const showsShelf = (m: ChromeMode) => m === 'shelf' || m === 'all';

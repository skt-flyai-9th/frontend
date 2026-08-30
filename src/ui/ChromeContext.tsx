/**
 * ChromeContext — 홈에서 **바를 한 번에 하나만** 띄우는 스위치.
 *
 * ─────────────────────────────────────────────────────────────
 * 왜 하나만인가 (2026-08-31, 사장님 안)
 * ─────────────────────────────────────────────────────────────
 * 홈은 세로 영상 한 편이 한 화면입니다. 영상이 **폭을 꽉 채우면서 안 잘리려면**
 * 무대가 699 여야 합니다. 그런데 쓸 수 있는 세로는 764 뿐입니다.
 *
 *   852 − 상태바 54 − 홈 인디케이터 34 = 764   ← 우리가 나눠 쓸 수 있는 전부
 *   폭을 꽉 채운 9:16                   = 699
 *                                       ────
 *   바에 줄 수 있는 예산                =  65
 *
 * 앱바 44 · 선반 56 · 탭바 49 는 **하나씩이면 전부 65 안에 들어갑니다.**
 * 둘만 겹쳐도(가장 작은 조합 44+49=93) 예산을 넘겨 영상이 줄거나 잘립니다.
 *
 * 그래서 세 모드를 **번갈아** 띄웁니다. 어느 모드에서든 영상은 393×699 입니다.
 *
 *   shelf   선반만 (기본)   무대 708 → 영상 393×699 · 남는 9 는 선반이 먹음
 *   tabs    탭바만          무대 715 → 영상 393×699 · 위아래 8 씩 남음
 *   appbar  앱바만          무대 720 → 영상 393×699 · 위아래 10.5 씩 남음
 *   all     셋 다 (잠금)    무대 615 → 영상 345×613 · 옆 24 씩. 튜토리얼 전용
 *
 * 기본을 **선반**으로 둔 이유는 거기에 **촬영 버튼과 제목**이 있어서입니다.
 * 이 화면에 온 이유가 그것이라, 주 동작이 한 단계 뒤로 가면 안 됩니다.
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
import { sizing } from '../design/theme';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ChromeMode = 'shelf' | 'tabs' | 'appbar' | 'all';

type ChromeApi = {
  mode: ChromeMode;
  /** 홈이 바꿉니다. 잠겨 있으면 기억만 하고 화면은 그대로 둡니다. */
  setMode: (m: ChromeMode) => void;
  /**
   * 튜토리얼처럼 **바가 전부 보여야 하는** 동안 `all` 로 잠급니다.
   * 코치마크가 탭바 아이콘 넷과 선반의 촬영 버튼을 짚기 때문에, 둘 중 하나라도
   * 없으면 화살표가 허공을 가리킵니다. 풀면 원래 모드로 돌아갑니다.
   */
  setLocked: (v: boolean) => void;
};

const Ctx = createContext<ChromeApi | null>(null);

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeRaw] = useState<ChromeMode>('shelf');
  const [locked, setLockedRaw] = useState(false);
  /** 잠금이 풀렸을 때 돌아갈 자리 */
  const wanted = useRef<ChromeMode>('shelf');

  const setMode = useCallback((m: ChromeMode) => {
    wanted.current = m;
    setModeRaw(m);
  }, []);

  const setLocked = useCallback((v: boolean) => {
    setLockedRaw(v);
    setModeRaw(v ? 'all' : wanted.current);
  }, []);

  const api = useMemo<ChromeApi>(
    () => ({ mode: locked ? 'all' : mode, setMode, setLocked }),
    [mode, locked, setMode, setLocked]
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

const FALLBACK: ChromeApi = { mode: 'all', setMode: () => {}, setLocked: () => {} };

/**
 * 🔴 **혼자 있는 바는 남는 세로를 먹습니다** (2026-08-31 지적: "하얀 줄").
 *
 * 영상은 폭이 393 으로 정해져 있어 아무리 자리가 넓어도 **699 를 넘지 않습니다.**
 * 그런데 탭바만 있을 때 쓸 수 있는 세로는 715, 앱바만 있을 때는 720 이라
 * 8~21pt 가 남습니다. 그 남는 자리가 영상과 바 사이에 **흰 틈**으로 보입니다
 * (바탕이 흰색이라 검은 줄은 아니지만, 탭바 위 실선 때문에 줄처럼 읽힙니다).
 *
 * 그래서 **혼자 있는 바가 그만큼 더 자랍니다.** 자라는 자리는 바의 바깥쪽입니다 —
 * 탭바는 아래로(홈 인디케이터 쪽), 앱바는 위로(상태바 쪽). 둘 다 흰색이라
 * 티가 안 나고, **바의 안쪽 모서리가 영상에 딱 닿습니다.**
 *
 *   탭바만 : 49 + 16 = 65   →  영상 699 + 바 65 = 764  틈 0
 *   앱바만 : 44 + 21 = 65   →  영상 699 + 바 65 = 764  틈 0
 *   선반만 : 56 +  9 = 65   →  (선반은 예전부터 이렇게 먹고 있었습니다)
 *
 * 셋이 같이 나올 때(튜토리얼)는 이미 예산을 넘겨 남는 게 없으므로 0 입니다.
 */
export function barSlack(
  mode: ChromeMode,
  which: 'appbar' | 'tabs',
  winW: number,
  winH: number,
  insetTop: number,
  insetBottom: number
): number {
  if (mode !== which) return 0; // 혼자 있을 때만 먹습니다
  const videoH = Math.ceil((winW * 16) / 9);
  const room = winH - insetTop - insetBottom - videoH;
  const own = which === 'appbar' ? sizing.appBarHeight : sizing.tabRowHeight;
  return Math.max(0, room - own);
}

/** 이 모드에서 탭바를 그리나 */
export const showsTabs = (m: ChromeMode) => m === 'tabs' || m === 'all';
/** 이 모드에서 앱바를 그리나 */
export const showsAppBar = (m: ChromeMode) => m === 'appbar' || m === 'all';
/** 이 모드에서 선반을 그리나 */
export const showsShelf = (m: ChromeMode) => m === 'shelf' || m === 'all';

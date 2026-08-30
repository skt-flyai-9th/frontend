/**
 * ChromeContext — 홈에서 **앱바와 탭바를 잠깐 치우는** 스위치 하나.
 *
 * ─────────────────────────────────────────────────────────────
 * 왜 필요한가 (2026-08-30, 사장님 지시)
 * ─────────────────────────────────────────────────────────────
 * 홈은 세로 영상 한 편이 한 화면입니다. 폭을 꽉 채우면 9:16 높이가 화면보다
 * 커서 위아래가 잘립니다. 393×852 에서 **84pt(12.0%)** 입니다.
 *
 * 자를 수밖에 없는 이유는 산수입니다.
 *
 *   852 − 상태바 54 − 홈 인디케이터 34 = 764   ← 우리가 나눠 쓸 수 있는 전부
 *   폭을 꽉 채운 9:16                   = 699   ← 안 자르려면 필요한 높이
 *                                       ────
 *   바에 줄 수 있는 예산                =  65
 *
 * 그런데 앱바 44 + 선반 56 + 탭바 49 = **149** 입니다. 예산의 두 배가 넘습니다.
 * 상태바와 홈 인디케이터는 시스템 몫이라 건드릴 수 없습니다.
 *
 * 그래서 **셋 중 하나만 남길 수 있습니다.** 남긴 것 기준 무대 높이:
 *
 *   선반만  708 (+9)   ← 이걸 택했습니다
 *   탭바만  715 (+16)
 *   앱바만  720 (+21)
 *   둘 남기면 659~671 → 28~40pt 가 여전히 잘립니다
 *
 * 선반을 남긴 이유는 거기에 **촬영 버튼과 제목**이 있어서입니다. 이 화면에 온
 * 이유가 그것입니다. 탭바가 사라져도 **탭 전환은 그대로 됩니다** — SwipeTabs 가
 * 가로 트랙이라 좌우로 밀면 넘어갑니다(navigation/SwipeTabs.tsx 머리말).
 *
 * 제일 빡빡한 기기가 갤럭시 S23(360×780)인데 거기서도 "하나만" 규칙이 그대로
 * 성립합니다. 넓은 기기(412×915, 360×800)는 둘 남겨도 안 잘립니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 **바를 영상 위로 띄우면 안 됩니다**
 * ─────────────────────────────────────────────────────────────
 * 자리를 비우는 방법은 두 가지입니다 — 밀어내기와 덮기. **덮기는 약관 위반입니다.**
 *
 *   "You must not display overlays, frames, or other visual elements in front of
 *    any part of a YouTube embedded player, including player controls."
 *      — YouTube API Services · Required Minimum Functionality · Overlays and frames
 *
 * 그래서 이 스위치는 바의 **높이를 0 으로 만들어** 자리를 내주는 방식입니다.
 * 절대로 `position: absolute` 로 영상 위에 얹지 마세요. 자세한 근거는
 * `domains/feed/FeedPage.tsx` 머리말과 CLAUDE.md §8-1.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ChromeApi = {
  /** 지금 앱바·탭바가 치워져 있는지 */
  hidden: boolean;
  /** 홈이 켜고 끕니다. 잠겨 있으면 무시됩니다. */
  setHidden: (v: boolean) => void;
  /**
   * 튜토리얼처럼 **바를 반드시 보여야 하는** 동안 잠급니다.
   * 코치마크가 탭바 아이콘을 짚기 때문에, 그때 탭바가 없으면 화살표가 허공을
   * 가리킵니다. 잠그면 즉시 나타나고 풀 때까지 그대로 있습니다.
   */
  setLocked: (v: boolean) => void;
};

const Ctx = createContext<ChromeApi | null>(null);

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHiddenRaw] = useState(false);
  const [locked, setLockedRaw] = useState(false);
  /** 잠금이 풀렸을 때 되돌아갈 자리 */
  const wanted = useRef(false);

  const setHidden = useCallback((v: boolean) => {
    wanted.current = v;
    setHiddenRaw(v);
  }, []);

  const setLocked = useCallback((v: boolean) => {
    setLockedRaw(v);
    // 잠그면 무조건 보이고, 풀면 홈이 원하던 자리로 돌아갑니다.
    setHiddenRaw(v ? false : wanted.current);
  }, []);

  const api = useMemo<ChromeApi>(
    () => ({ hidden: locked ? false : hidden, setHidden, setLocked }),
    [hidden, locked, setHidden, setLocked]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/**
 * Provider 밖에서도 죽지 않습니다 — 그때는 "안 숨김" 으로 굳어집니다.
 * (설정·촬영처럼 탭 밖에 있는 화면들이 이 훅을 몰라도 되게 하려는 것입니다)
 */
export function useChrome(): ChromeApi {
  return useContext(Ctx) ?? FALLBACK;
}

const FALLBACK: ChromeApi = {
  hidden: false,
  setHidden: () => {},
  setLocked: () => {},
};

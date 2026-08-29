/**
 * 코치마크가 **어디를 짚을지** 알아내는 장치.
 *
 * 시안(`튜토리얼,홈UI,촬영화면UI.html`)은 웹이라 `document.querySelector('[data-coach="…"]')`
 * 로 짚을 곳을 찾고 `getBoundingClientRect` 로 좌표를 잽니다. 앱에는 셀렉터가 없으므로
 * **이름표를 붙여 등록**하는 방식으로 바꿉니다.
 *
 *   <CoachTarget name="tab-home">…</CoachTarget>
 *
 * ⚠️ **재는 값을 state 에 두면 앱 전체가 느려집니다** (2026-08-29 사장님 지적).
 *
 *    처음에는 등록된 곳 **일곱 개가 전부** 120ms 마다 자기 위치를 보고했고, 그 보고를
 *    context state 에 담았습니다. 이 provider 가 `RootNavigator` 를 감싸고 있어서
 *    **보고 한 번에 앱 화면 전체가 다시 그려졌습니다** — 초당 쉰 번 넘게요.
 *    튜토리얼에서만 버벅인 이유가 이것입니다.
 *
 *    그래서 둘을 바꿨습니다.
 *      ① 값을 **ref 에 담고** 바뀌었다고 알리기만 합니다. 오버레이만 그 소식을 듣고
 *         자기 안에서 다시 그립니다 — provider 아래 화면들은 그대로 있습니다.
 *      ② **지금 짚는 곳 하나만** 잽니다. 나머지 여섯은 놀립니다.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, type ViewProps } from 'react-native';

/** 시안 `data-coach` 값과 같은 이름들입니다. */
export type CoachName =
  | 'tab-home'
  | 'tab-saved'
  | 'tab-chat'
  | 'tab-mypage'
  | 'video'
  | 'make'
  | 'insight';

export interface CoachRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CoachApi {
  /**
   * 지금 짚는 곳. 이 이름을 가진 상자만 자기 위치를 잽니다.
   *
   * ⚠️ **ref 가 아니라 값이어야 합니다.** ref 로 두었더니 상자들이 자기 차례가
   *    된 걸 모르고 아무도 위치를 보고하지 않아 **구멍이 아예 안 뚫렸습니다**
   *    (2026-08-29). provider 가 다시 그려져도 `children` 은 같은 것이라 React 가
   *    아래를 건너뛰기 때문입니다. context 값으로 두면 이 값을 쓰는 여덟(상자 7 +
   *    오버레이)만 다시 그려집니다 — 화면 전체는 그대로입니다.
   */
  activeName: CoachName | null;
  /** 마지막으로 잰 위치. **state 가 아니라 ref 입니다** (머리말 참고). */
  rectsRef: React.MutableRefObject<Partial<Record<CoachName, CoachRect>>>;
  report: (name: CoachName, rect: CoachRect) => void;
  /** 값이 바뀌면 알려 달라는 신청. 오버레이 하나만 신청합니다. */
  subscribe: (fn: () => void) => () => void;
  /** 지금 재고 있는지. 튜토리얼이 떠 있을 때만 켭니다 — 평소에는 아무것도 안 합니다. */
  setActive: (name: CoachName | null) => void;
}

const Ctx = createContext<CoachApi | null>(null);

export function CoachProvider({ children }: { children: React.ReactNode }) {
  const rectsRef = useRef<Partial<Record<CoachName, CoachRect>>>({});
  const subs = useRef(new Set<() => void>());
  /** 지금 짚는 곳 — 이것만 state 입니다(위 `activeName` 주석). */
  const [activeName, setActiveName] = useState<CoachName | null>(null);

  const report = useCallback((name: CoachName, rect: CoachRect) => {
    const old = rectsRef.current[name];
    // 0.5 안쪽 변화는 무시합니다 — 안 그러면 매 프레임 알림이 갑니다.
    if (
      old &&
      Math.abs(old.x - rect.x) < 0.5 &&
      Math.abs(old.y - rect.y) < 0.5 &&
      Math.abs(old.w - rect.w) < 0.5 &&
      Math.abs(old.h - rect.h) < 0.5
    ) {
      return;
    }
    rectsRef.current = { ...rectsRef.current, [name]: rect };
    subs.current.forEach((f) => f());
  }, []);

  const subscribe = useCallback((fn: () => void) => {
    subs.current.add(fn);
    return () => subs.current.delete(fn);
  }, []);

  const setActive = useCallback((name: CoachName | null) => {
    setActiveName((cur) => (cur === name ? cur : name));
  }, []);

  /*
    단계가 바뀔 때만 값이 바뀝니다. 위치 보고는 ref + 알림이라 여기를 건드리지
    않습니다 — 그래서 구멍이 움직여도 화면은 다시 그려지지 않습니다.
  */
  const value = useMemo(
    () => ({ rectsRef, activeName, report, subscribe, setActive }),
    [activeName, report, subscribe, setActive]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCoach(): CoachApi | null {
  return useContext(Ctx);
}

/**
 * 짚을 곳을 감싸는 상자. 자리만 알려 줄 뿐 그림에는 영향을 주지 않습니다.
 *
 * **자기 차례일 때만** 잽니다. 차례가 아니면 타이머조차 걸지 않습니다.
 */
export function CoachTarget({
  name,
  enabled = true,
  children,
  style,
  ...rest
}: {
  name: CoachName;
  /**
   * 같은 이름표가 화면에 여럿 있을 때 어느 것이 진짜인지 가릅니다.
   *
   * 홈 피드는 장(page)마다 `CoachTarget name="video"` 를 그립니다. 전부 보고하면
   * **마지막 장이 이겨서** 화면 밖 좌표가 들어옵니다 — 실제로 구멍 높이가 음수로
   * 나왔습니다(2026-08-29 실측: y=1441 h=-589). 지금 보고 있는 장만 보고합니다.
   */
  enabled?: boolean;
} & ViewProps) {
  const coach = useCoach();
  const ref = useRef<View>(null);
  const mine = enabled && coach?.activeName === name;

  const measure = useCallback(() => {
    if (!ref.current) return;
    ref.current.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) coach?.report(name, { x, y, w, h });
    });
  }, [coach, name]);

  /*
    자기 차례인 동안만 다시 잽니다 — 탭이 넘어가는 중에도 구멍이 따라가야 하고,
    화면 전환이 끝난 뒤의 최종 위치도 잡아야 합니다(시안도 같은 이유로 다시 잽니다).
    간격을 250ms 로 둡니다. 120ms 는 필요 이상으로 잦았습니다.
  */
  useEffect(() => {
    if (!mine) return;
    measure();
    const t = setInterval(measure, 250);
    return () => clearInterval(t);
  }, [mine, measure]);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={style}
      // 자기 차례일 때만 반응합니다. 평소에는 아무 일도 하지 않습니다.
      onLayout={mine ? measure : undefined}
      {...rest}
    >
      {children}
    </View>
  );
}

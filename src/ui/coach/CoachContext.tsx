/**
 * 코치마크가 **어디를 짚을지** 알아내는 장치.
 *
 * 시안(`튜토리얼,홈UI,촬영화면UI.html`)은 웹이라 `document.querySelector('[data-coach="…"]')`
 * 로 짚을 곳을 찾고 `getBoundingClientRect` 로 좌표를 잽니다. 앱에는 셀렉터가 없으므로
 * **이름표를 붙여 등록**하는 방식으로 바꿉니다.
 *
 *   <CoachTarget name="tab-home">…</CoachTarget>
 *
 * 등록된 곳은 화면에 그려질 때마다 자기 위치를 재서 여기 보관합니다. 오버레이는
 * 그 값을 읽어 구멍을 뚫습니다.
 *
 * ⚠️ **탭을 옮기면 위치가 달라집니다.** 그래서 한 번 재고 끝내지 않고, 오버레이가
 *    켜져 있는 동안 주기적으로 다시 잽니다(시안도 80ms 간격으로 다시 잽니다).
 *    화면 전환 애니메이션이 끝나기 전에 재면 엉뚱한 자리에 구멍이 뚫립니다.
 */
import React, {
  createContext,
  useCallback,
  useContext,
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
  /** 이름표가 붙은 곳의 마지막 위치. 아직 안 재었으면 없습니다. */
  rects: Partial<Record<CoachName, CoachRect>>;
  report: (name: CoachName, rect: CoachRect) => void;
  /** 지금 오버레이가 켜져 있는지. 켜져 있을 때만 다시 잽니다 — 평소에는 놀립니다. */
  measuring: boolean;
  setMeasuring: (on: boolean) => void;
}

const Ctx = createContext<CoachApi | null>(null);

export function CoachProvider({ children }: { children: React.ReactNode }) {
  const [rects, setRects] = useState<Partial<Record<CoachName, CoachRect>>>({});
  const [measuring, setMeasuring] = useState(false);

  const report = useCallback((name: CoachName, rect: CoachRect) => {
    setRects((prev) => {
      const old = prev[name];
      // 0.5 안쪽 변화는 무시합니다 — 매 프레임 새 객체를 만들면 화면이 계속 다시 그려집니다.
      if (
        old &&
        Math.abs(old.x - rect.x) < 0.5 &&
        Math.abs(old.y - rect.y) < 0.5 &&
        Math.abs(old.w - rect.w) < 0.5 &&
        Math.abs(old.h - rect.h) < 0.5
      ) {
        return prev;
      }
      return { ...prev, [name]: rect };
    });
  }, []);

  const value = useMemo(
    () => ({ rects, report, measuring, setMeasuring }),
    [rects, report, measuring]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCoach(): CoachApi | null {
  return useContext(Ctx);
}

/**
 * 짚을 곳을 감싸는 상자. 자리만 알려 줄 뿐 그림에는 영향을 주지 않습니다
 * (`View` 하나가 더 생기므로 레이아웃에 영향이 없도록 `style` 을 그대로 넘깁니다).
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
   * 🔴 **같은 이름표가 화면에 여럿 있을 때 어느 것이 진짜인지 가릅니다.**
   *
   * 홈 피드는 장(page)마다 `CoachTarget name="video"` 를 그립니다. 전부 보고하면
   * **마지막 장이 이겨서** 화면 밖 좌표가 들어옵니다 — 실제로 구멍 높이가 음수로
   * 나왔습니다(2026-08-29 실측: y=1441 h=-589). 지금 보고 있는 장만 보고하게 합니다.
   */
  enabled?: boolean;
} & ViewProps) {
  const coach = useCoach();
  const ref = useRef<View>(null);

  const measure = useCallback(() => {
    if (!coach?.measuring || !enabled) return;
    ref.current?.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) coach.report(name, { x, y, w, h });
    });
  }, [coach, name, enabled]);

  /*
    오버레이가 켜져 있는 동안 계속 다시 잽니다. 탭이 넘어가는 중에도 구멍이
    따라가야 하고, 화면 전환이 끝난 뒤의 최종 위치도 잡아야 합니다.
    (시안도 같은 이유로 80ms 간격으로 다시 잽니다.)
  */
  React.useEffect(() => {
    if (!coach?.measuring || !enabled) return;
    measure();
    const t = setInterval(measure, 120);
    return () => clearInterval(t);
  }, [coach?.measuring, enabled, measure]);

  return (
    <View ref={ref} collapsable={false} style={style} onLayout={measure} {...rest}>
      {children}
    </View>
  );
}

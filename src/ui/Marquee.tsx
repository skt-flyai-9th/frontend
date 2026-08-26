/**
 * Marquee — 한 줄에 안 들어가는 글자를 **전광판처럼 옆으로 흘려서 전부 보여줍니다.**
 *
 * ─────────────────────────────────────────────────────────────
 * 왜 만들었나 (2026-08-26, 사장님 지시)
 * ─────────────────────────────────────────────────────────────
 * `numberOfLines={1}` 은 넘치는 글자를 `…` 로 잘라 버립니다. 그런데 잘린 자리에
 * 들어 있던 게 **사장님이 지금 봐야 하는 값**인 경우가 있었습니다.
 *
 *   · 홈 피드 태그 — `#촬영30초 #난이도하 #얼…` 에서 얼굴 촬영 여부가 사라집니다
 *   · 카메라 컷 이름 — 지금 무엇을 찍어야 하는지가 잘립니다. 촬영 중에는
 *     길게 눌러 확인할 방법도 없습니다
 *
 * 글자를 줄이거나 칸을 넓히는 건 답이 아닙니다. 컷 이름은 AI 가 만들어서
 * 길이를 우리가 못 정하고, 칸은 시안이 정한 폭입니다. **흘려서 다 보여줍니다.**
 *
 * ─────────────────────────────────────────────────────────────
 * 속도는 **고정 시간이 아니라 고정 속도**입니다 — 사장님이 짚으신 부분
 * ─────────────────────────────────────────────────────────────
 * "한 바퀴 N초" 로 두면 **짧은 글은 느리게, 긴 글은 빠르게** 지나갑니다. 정작 길어서
 * 읽기 힘든 쪽이 더 빨라지는, 정반대 결과입니다.
 *
 * 그래서 **초당 몇 pt** 를 고정합니다. 글이 길면 그만큼 오래 돌 뿐, 흘러가는 빠르기는
 * 어느 화면에서나 똑같습니다.
 *
 *   40 pt/s  ≈ 13pt 글자로 초당 3자. 지하철 안내 전광판과 비슷한 빠르기입니다.
 *             주 사용자가 40~60대라 읽는 속도(초당 5~8자)보다 넉넉히 느리게 잡았습니다.
 *
 * 한 바퀴가 끝나면 **처음에서 1.2초 멈춥니다.** 계속 흐르기만 하면 글의 시작이
 * 어디인지 놓칩니다. 멈추는 지점이 곧 "여기가 처음" 이라는 표시입니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 주의 두 가지
 * ─────────────────────────────────────────────────────────────
 * ① **넘칠 때만 움직입니다.** 다 들어가면 평범한 글자입니다 — 안 그러면 멀쩡한 짧은
 *    글까지 흔들려서 화면이 소란스러워집니다.
 * ② `Animated.loop` + 네이티브 드라이버는 **웹에서 한 바퀴만 돌고 멈춥니다**
 *    (CLAUDE.md §5-④). 기기에서는 네이티브로 부드럽게, 웹 QA 에서는 JS 로 돌립니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

/** 초당 흘러가는 거리(pt). 글 길이와 무관하게 **일정합니다** — 위 머리말 참고. */
const SPEED_PX_PER_SEC = 40;
/** 한 바퀴 끝나고 처음에서 쉬는 시간. 시작 지점을 알아볼 수 있게 합니다. */
const REST_MS = 1200;
/** 두 벌 사이 간격. 이만큼 비어야 이어붙은 자리가 "다시 처음" 으로 읽힙니다. */
const GAP = 40;

export function Marquee({
  children,
  style,
  containerStyle,
  speed = SPEED_PX_PER_SEC,
}: {
  children: string;
  /** 글자 스타일. 잘릴 때와 안 잘릴 때 모양이 같아야 하므로 한 곳에만 줍니다. */
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  speed?: number;
}) {
  const [boxW, setBoxW] = useState(0);
  const [textW, setTextW] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const x = useRef(new Animated.Value(0)).current;

  // 기기 설정에서 "동작 줄이기" 를 켠 분에게는 흘리지 않습니다.
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => alive && setReduceMotion(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);

  // 0.5 는 측정 오차입니다. 이 여유가 없으면 딱 맞는 글이 미세하게 떨립니다.
  const overflow = boxW > 0 && textW > boxW + 0.5;
  const moving = overflow && !reduceMotion;
  /*
   * 잰 값 **그대로** 폭을 주면 끝 글자에 `…` 가 붙습니다. 소수점 아래가 깎이면서
   * 글자가 제 폭보다 아주 조금 좁은 칸에 들어가기 때문입니다.
   * 2026-08-26 웹 QA 에서 `…판 잡…` 으로 실제로 나왔습니다. 2pt 는 그 여유입니다.
   */
  const copyW = Math.ceil(textW) + 2;
  const travel = copyW + GAP;

  useEffect(() => {
    if (!moving) {
      x.setValue(0);
      return;
    }
    let stopped = false;
    let cur: Animated.CompositeAnimation | null = null;
    /*
     * 한 바퀴 = 첫 벌이 왼쪽으로 완전히 빠지고 둘째 벌이 그 자리에 오는 것.
     * 끝난 순간의 그림이 시작과 똑같아서 값을 0 으로 되돌려도 눈에 안 띕니다.
     *
     * duration 을 **거리 ÷ 속도** 로 잡는 것이 이 컴포넌트의 핵심입니다.
     *
     * ⚠️ `Animated.loop` 를 쓰지 않습니다 — 실제로 한 바퀴만 돌고 멈췄습니다
     *    (2026-08-26 웹 QA 에서 확인: 태그가 -217 에서 굳은 채 안 움직임).
     *    loop 는 반복을 네이티브 모듈에 넘기는데 웹에는 그게 없습니다 (CLAUDE.md §5-④).
     *    끝나면 다음 바퀴를 **우리가 직접 겁니다.** 어느 쪽에서나 똑같이 돕니다.
     */
    const cycle = () => {
      if (stopped) return;
      x.setValue(0);
      cur = Animated.sequence([
        Animated.delay(REST_MS),
        Animated.timing(x, {
          toValue: 1,
          duration: (travel / speed) * 1000,
          easing: Easing.linear, // 전광판은 일정한 속도입니다. 가감속을 넣으면 읽다 놓칩니다.
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]);
      // finished 가 false 면 화면을 벗어나 멈춘 것입니다 — 다시 걸지 않습니다.
      cur.start(({ finished }) => finished && cycle());
    };
    cycle();
    return () => {
      stopped = true;
      cur?.stop();
    };
  }, [moving, travel, speed, x]);

  const onBox = (e: LayoutChangeEvent) => setBoxW(e.nativeEvent.layout.width);
  const onText = (e: LayoutChangeEvent) => setTextW(e.nativeEvent.layout.width);

  /*
   * ⚠️ 재는 자리를 따로 둡니다 — 여기서 한 번 크게 틀렸습니다.
   *
   * 보이는 글자를 그대로 재면 **항상 "안 넘친다" 가 나옵니다.** 그 글자는 이미 칸에
   * 맞춰 `…` 로 잘린 뒤라서, 재 봐야 칸 너비가 그대로 돌아옵니다. 잘린 것을 재서
   * 잘렸는지 판단하려는 셈입니다.
   *
   * 그래서 **폭이 9999 인 투명한 자리**에 같은 글자를 한 벌 더 두고 그것을 잽니다.
   * 넓으니 잘릴 일이 없어 글자의 **원래 길이**가 나옵니다. absolute 라 자리를
   * 차지하지 않고, 눈에도 안 보이고, 읽어 주는 기능에서도 숨깁니다.
   */
  const ghost = (
    <View
      style={styles.measure}
      pointerEvents="none"
      /*
        세 속성이 다 필요합니다 — 안드로이드·iOS·웹이 각각 다른 것을 봅니다.
        2026-08-26 웹 QA 에서 `aria-hidden` 없이 태그가 **세 번** 읽혔습니다
        (재는 벌 + 흐르는 두 벌). 눈에 안 보이는 글자를 읽어 주면 안 됩니다.
      */
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      aria-hidden
    >
      <Text style={style} numberOfLines={1} onLayout={onText}>
        {children}
      </Text>
    </View>
  );

  // 넘치지 않으면 평범한 한 줄입니다. 멀쩡한 글까지 흔들면 화면이 소란스러워집니다.
  if (!moving) {
    return (
      <View style={[styles.clip, containerStyle]} onLayout={onBox}>
        {ghost}
        <Text style={style} numberOfLines={1}>
          {children}
        </Text>
      </View>
    );
  }

  /*
   * 흐르는 두 벌에는 **잰 길이를 폭으로 못 박습니다.** 폭을 안 주면 좁은 칸에 맞춰
   * 다시 잘려서, 잘린 글자가 흘러가는 우스운 모양이 됩니다.
   */
  const copy = (hidden: boolean) => (
    <Text
      style={[style, { width: copyW }]}
      numberOfLines={1}
      // 둘째 벌은 첫 벌과 같은 글자라 읽어 주는 기능에서는 숨깁니다.
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={hidden}
      aria-hidden={hidden}
    >
      {children}
    </Text>
  );

  return (
    <View
      style={[styles.clip, containerStyle]}
      onLayout={onBox}
      accessible
      accessibilityLabel={children}
    >
      {ghost}
      <Animated.View
        style={[
          styles.row,
          {
            transform: [
              { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, -travel] }) },
            ],
          },
        ]}
      >
        {copy(false)}
        {/* 둘째 벌은 첫 벌이 빠져나가는 동안 뒤를 메웁니다. 빈 화면이 스치면 글이 끊긴 줄 압니다. */}
        <View style={{ width: GAP }} />
        {copy(true)}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 넘치는 부분을 잘라내는 창. 이게 없으면 옆 칸을 침범합니다.
  clip: { overflow: 'hidden' },
  /*
   * 재기만 하는 자리. 9999 는 "잘릴 일 없는 넉넉한 폭" 이라는 뜻입니다.
   * alignItems 를 flex-start 로 둬야 글자가 9999 로 늘어나지 않고 제 길이로 잽니다.
   */
  measure: { position: 'absolute', top: 0, left: 0, width: 9999, opacity: 0, alignItems: 'flex-start' },
  /*
   * alignSelf: 'flex-start' 라야 줄이 **글자만큼만** 넓어집니다.
   * 창 너비로 늘어나면 둘째 벌이 밀려나 이어붙은 자리가 벌어집니다.
   */
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});

/**
 * PipGuide — 시안 V4 `PipGuide`. 촬영하면서 참고 영상을 곁눈질하는 작은 창입니다.
 *
 * ⚠️ 유튜브 약관: 임베드 플레이어 **앞을 가리는 요소를 두면 안 됩니다.**
 *    시안은 플레이어 위에 반투명 막과 재생·확대 버튼을 얹지만 우리는 그럴 수 없습니다.
 *    그래서 재생·일시정지·배속은 **유튜브 자체 컨트롤**에 맡기고, 우리 것은 전부
 *    영상 **위쪽 띠**에 둡니다 — 영상 화면은 한 픽셀도 가리지 않습니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 2026-08-26 — 사장님 피드백 세 가지를 반영했습니다
 * ─────────────────────────────────────────────────────────────
 * ① **확대 버튼이 안 눌린다** → 고장이 아니라 과녁이 작았습니다.
 *    버튼 20×20 에 hitSlop 8 을 줬지만 바깥 상자가 `overflow: hidden` 이라
 *    위아래가 잘려 실제로 닿는 영역이 약 24×28pt(안드로이드 권장 48×48 의 절반).
 *    → 띠를 32 로 키우고 **띠 전체를 버튼**으로 만들었습니다 (창 폭 × 32).
 *
 * ② **작은 창을 옮기고 싶다** → 띠를 잡고 끌면 따라옵니다.
 *    영상 화면을 잡아서 끌 수는 없습니다 — 플레이어 위에 손가락을 받는 층을 올리면
 *    약관 위반이고 유튜브 자체 컨트롤도 막힙니다. 그래서 손잡이는 띠입니다.
 *    띠를 **탭하면 확대**, **끌면 이동**입니다(움직임이 6pt 넘어야 끌기로 봅니다).
 *
 * ③ **확대하면 영상이 두 개** → 확대 중에는 작은 창을 아예 내립니다.
 *    예전에는 둘 다 살아 있어 같은 영상이 두 WebView 에서 동시에 돌았습니다(소리 겹침).
 *    대신 **재생 위치를 주고받습니다** — 확대하면 보던 지점부터, 줄이면 그 지점부터.
 *    위치는 `guidePlayerBridge` 의 `time` 메시지로 옵니다(우리가 묻지 않습니다).
 *
 * ⚠️ 작은 창에서는 **유튜브가 자기 컨트롤을 그리지 않습니다.**
 *    실측: 폭 220 까지 `ytp-tiny-mode` 가 붙고 240 에서 풀립니다(아래 DEFAULT_WIDTH 참고).
 *    그래서 되감기·배속은 **확대해서** 유튜브 컨트롤로 하는 것이 맞습니다.
 *    우리가 재생 버튼을 따로 만들지 않는 이유입니다(예전에 만들었다가 계속 안 먹어서 걷어냈습니다).
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Maximize2, Minimize2, X } from 'lucide-react-native';
import { GuidePlayer } from './GuidePlayer';
import { pressTap } from './press';
import theme, { color, elevation, radius, space, text } from '../design/theme';

/**
 * 창 폭. **시안(98·110)보다 크게 잡았습니다** — 사장님 지시입니다 (2026-08-26).
 *
 * "영상이 너무 작아서 안 보인다. 절반 이상 차지하라는 건 아니지만 눈에 보이는
 * 수준으로 키워 달라." → 카메라 98 → **170**, 안무 카메라 110 → **180**.
 * 화면 폭 393 의 43~46% 이고, 세로는 띠까지 합쳐 334~352 로 셔터를 안 가립니다.
 *
 * ⚠️ 그래도 **유튜브 자체 컨트롤은 안 나옵니다.** 실측 결과 tiny-mode 가 풀리는
 *    경계는 폭 **220~240 사이**입니다(98·110·130·150·165·180·200·220 전부 tiny,
 *    240 에서 풀림). 240 은 화면 폭의 61% 라 "절반 이상" 이 됩니다.
 *    되감기·배속은 지금처럼 **확대해서** 유튜브 컨트롤로 하는 것이 맞습니다.
 */
const DEFAULT_WIDTH = 170;
/**
 * 우리 버튼이 앉는 띠. 영상 위를 가리지 않기 위한 자리입니다.
 *
 * 2026-08-28 — 시안 `촬영부분수정` 이 이 띠를 **영상 아래**로 내리고 "확대" 버튼으로
 * 바꿨습니다(h26 · 영상과 간격 6). 위에 있던 것을 아래로 옮긴 것뿐이라
 * **끌어서 옮기는 동작은 그대로**입니다 — 영상 위에는 여전히 아무것도 없습니다.
 *
 * ⚠️ 시안은 창 폭을 90 으로 줄이지만 **170 을 유지합니다**(사장님 지시).
 *    90 이면 유튜브가 자기 컨트롤을 안 그려(`ytp-tiny-mode`) 되감기·배속을
 *    확대해서만 쓸 수 있게 됩니다.
 */
const BAR = 26;
/** 영상과 확대 버튼 사이 — 시안 `mt-1.5` */
const BAR_GAP = 6;
/** 시안 자리: absolute left-4 top-[110] */
const HOME_LEFT = space[4];
const HOME_TOP = 110;
/** 이만큼 움직이면 탭이 아니라 끌기로 봅니다. */
const DRAG_SLOP = 8;
/*
  🔴 **탭으로 쳐 주는 최대 흔들림** (2026-08-31 지적: "접기 버튼 안 먹히는 건
     간헐적으로 계속 그래").

  6pt 는 **손가락한테 너무 빡빡했습니다.** 사람이 26pt 짜리 띠를 누르면 그 정도는
  예사로 밀립니다 — 특히 창이 화면 아래에 있어 엄지를 뻗어 누를 때 그렇습니다.
  그만큼만 밀려도 "끌기" 로 쳐서 접기가 안 먹혔고, 밀리냐 마냐는 그때그때라
  **간헐적**으로 보였습니다.

  RN 이 누름을 취소하는 기준도 대략 이 언저리입니다. 시간까지 함께 봐서,
  **짧고 조금 밀린 것**은 탭으로 봅니다. 끌기는 8pt 부터 창이 따라오기 시작하되,
  그 정도만 밀리고 끝났으면 창을 **제자리로 되돌리고** 탭으로 처리합니다.
*/
const TAP_SLOP = 16;
const TAP_MS = 500;

export function PipGuide({
  url,
  loopStart,
  loopEnd,
  startSec,
  width: pipWidth = DEFAULT_WIDTH,
}: {
  url?: string | null;
  /**
   * 구간 반복 — 지금 찍는 컷에 해당하는 부분만 되풀이합니다.
   * 작은 창과 확대 화면 **둘 다** 같은 구간을 씁니다.
   * 서버가 `start_ms`·`end_ms` 를 주면 초로 바꿔 넣으면 됩니다 (BE §2-1).
   */
  loopStart?: number | null;
  loopEnd?: number | null;
  startSec?: number;
  /** 창 폭. 기본 170(카메라) · 안무 카메라는 180 을 넘겨줍니다 — 위 머리말 참고. */
  width?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  /*
    ─────────────────────────────────────────────────────────────
    🔴 **참고 영상을 접었다 펼 수 있습니다** (2026-08-31 지시)
    ─────────────────────────────────────────────────────────────
    영상 **위**에 아래 확대 띠와 **똑같이 생긴 알약**을 하나 더 두고, 거기 닫기(×)를
    답니다. 누르면 창이 **왼쪽 위 알약 자리로 날아가며 작아지고** 사라집니다.
    그 자리에 다시 펴는 버튼이 생깁니다 — 카메라 오른쪽 위 뒤로가기 알약과
    **같은 크기·같은 여백**이라 좌우가 짝을 이룹니다. 아이콘은 확대(Maximize2).

    ⚠️ 접는 버튼은 **영상 위에 얹지 않습니다.** 영상 바깥 띠입니다 — 확대 띠를
       아래에 둔 것과 같은 이유입니다(머리말의 유튜브 약관).
  */
  const [folded, setFolded] = useState(false);
  /** 접히고 펴지는 동안의 진행도. 1 = 펼침, 0 = 접힘(왼쪽 위로 빨려 들어간 상태). */
  const fold = useRef(new Animated.Value(1)).current;
  const [flying, setFlying] = useState(false);

  const runFold = useCallback(
    (next: boolean) => {
      setFlying(true);
      if (!next) setFolded(false);   // 펼 때는 먼저 그려 놓고 날아옵니다
      Animated.timing(fold, {
        toValue: next ? 0 : 1,
        duration: 260,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setFlying(false);
        setFolded(next);
      });
    },
    [fold]
  );
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  /**
   * 마지막으로 확인한 재생 위치(초). 작은 창과 확대 화면이 번갈아 채웁니다.
   * ref 인 이유 — 1초에 한 번 들어오는 값이라 state 로 두면 그때마다 다시 그립니다.
   */
  const lastSec = useRef(startSec ?? 0);
  /** 지금 띄울 플레이어가 시작할 지점. 확대/축소 순간에만 바뀝니다. */
  const [smallStart, setSmallStart] = useState(startSec ?? 0);
  const [bigStart, setBigStart] = useState(startSec ?? 0);

  // ── 끌어서 옮기기 ────────────────────────────────
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  /** 놓은 자리(누적 이동량). 다음 끌기의 기준이 됩니다. */
  const offset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  /** 이번 손짓이 이동이었나 — 창이 따라 움직이기 시작했는지. */
  const moved = useRef(false);
  /** 손이 닿은 시각. 탭인지 가릴 때 씁니다. */
  const touchedAt = useRef(0);

  /* 영상 + **위아래 띠 둘** (접기 · 확대). 끌기 범위를 재는 데 씁니다. */
  const pipHeight = Math.round((pipWidth * 16) / 9) + (BAR_GAP + BAR) * 2;

  /** 화면 밖으로 나가지 않게 잡아 둡니다. 기준은 시안 자리(HOME)에서의 이동량입니다. */
  const clamp = (x: number, y: number) => {
    const minX = -HOME_LEFT;
    const maxX = width - pipWidth - HOME_LEFT;
    const minY = insets.top - HOME_TOP;
    const maxY = height - insets.bottom - pipHeight - HOME_TOP;
    return {
      x: Math.min(Math.max(x, minX), Math.max(minX, maxX)),
      y: Math.min(Math.max(y, minY), Math.max(minY, maxY)),
    };
  };

  /*
    ─────────────────────────────────────────────────────────────
    🔴 **탭 판정을 끌기와 같은 자리로 옮겼습니다** (2026-08-31 지적:
       "접기 버튼이 특정 장소에서만 작동 … 이동은 문제없어")
    ─────────────────────────────────────────────────────────────
    "끌기는 되는데 탭만 안 된다" 가 결정적인 단서였습니다. 손가락이 이 띠에
    **닿는 것 자체는 언제나 되고 있었다**는 뜻이니까요.

    갈라진 이유는 **탭과 끌기를 서로 다른 것이 맡고 있었기** 때문입니다.

      끌기 → 바깥 View 의 PanResponder
      탭   → 안쪽 Pressable

    RN 의 제스처는 **하나만 이깁니다.** 손가락이 6pt 만 흔들려도 바깥이
    가로채고, 그 순간 안쪽 Pressable 은 **취소**됩니다 — 눌렀는데 아무 일도
    안 일어납니다. 손이 얼마나 흔들리냐는 창이 어디 있느냐(엄지를 뻗는 각도)에
    따라 달라져서, 사장님께는 "특정 장소에서만 되는 것" 으로 보였습니다.

    이제 **하나가 둘 다 맡습니다.** 처음부터 우리가 받고, 손을 뗄 때 지나온
    거리로 가릅니다.

      6pt 넘게 움직였다  → 이동
      아니다             → 탭 (접기 / 확대)

    누른 느낌은 `pressedBar` 가 대신 냅니다 — Pressable 을 뺐다고 눌린 표시까지
    없어지면 안 됩니다.
  */
  /** 지금 눌려 있는 띠. 눌린 표시(어두워짐)에만 씁니다. */
  const [pressedBar, setPressedBar] = useState<'top' | 'bottom' | null>(null);
  /** 띠를 탭했을 때 할 일. 리스폰더를 다시 만들지 않으려고 ref 로 넘깁니다. */
  const onTapTop = useRef<() => void>(() => {});
  const onTapBottom = useRef<() => void>(() => {});

  const responders = useMemo(() => {
    const make = (kind: 'top' | 'bottom', tap: React.RefObject<() => void>) =>
      PanResponder.create({
        // **처음부터 우리가 받습니다.** 안쪽에 다른 손이 없어야 서로 뺏지 않습니다.
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          moved.current = false;
          touchedAt.current = Date.now();
          setPressedBar(kind);
        },
        onPanResponderMove: (_e, g) => {
          if (!moved.current && Math.abs(g.dx) <= DRAG_SLOP && Math.abs(g.dy) <= DRAG_SLOP) return;
          moved.current = true;
          dragging.current = true;
          pan.setValue(clamp(offset.current.x + g.dx, offset.current.y + g.dy));
        },
        onPanResponderRelease: (_e, g) => {
          setPressedBar(null);
          /*
            **탭이냐 이동이냐는 지나온 거리와 걸린 시간으로 가릅니다.**
            조금 밀렸어도 짧게 끝났으면 탭입니다 — 그동안 창이 몇 pt 따라왔더라도
            제자리로 돌려놓고 버튼을 누른 것으로 칩니다.
          */
          const travel = Math.hypot(g.dx, g.dy);
          if (travel <= TAP_SLOP && Date.now() - touchedAt.current <= TAP_MS) {
            pan.setValue(offset.current);
            dragging.current = false;
            tap.current?.();
            return;
          }
          offset.current = clamp(offset.current.x + g.dx, offset.current.y + g.dy);
          pan.setValue(offset.current);
          // 손을 뗀 직후의 탭 판정과 겹치지 않게 한 박자 뒤에 풉니다.
          setTimeout(() => {
            dragging.current = false;
          }, 50);
        },
        onPanResponderTerminate: () => {
          setPressedBar(null);
          dragging.current = false;
        },
      });
    return { top: make('top', onTapTop), bottom: make('bottom', onTapBottom) };
    // clamp 는 화면 크기·안전영역이 바뀔 때만 달라집니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, insets.top, insets.bottom, pipWidth]);

  if (!url) return null;

  // 확대: 세로 영상이 화면에 다 들어오도록 폭을 높이에서 되돌려 잡습니다.
  const bigWidth = Math.min(width, Math.round(((height - 160) * 9) / 16));

  const openBig = () => {
    // 끌던 손가락이 떨어질 때 확대되지 않게 합니다.
    if (dragging.current) return;
    setBigStart(lastSec.current);
    setExpanded(true);
  };

  // 리스폰더는 다시 만들지 않고 **할 일만** 갈아 끼웁니다 (위 머리말 참고).
  onTapTop.current = () => runFold(true);
  onTapBottom.current = openBig;

  const closeBig = () => {
    setSmallStart(lastSec.current);
    setExpanded(false);
  };

  return (
    <>
      {/*
        확대 중에는 작은 창을 **아예 내립니다.** 남겨 두면 같은 영상이 두 곳에서
        동시에 재생돼 소리가 겹칩니다.
      */}
      {/*
        접혔을 때 다시 펴는 알약. 카메라 **오른쪽 위 뒤로가기와 같은 규격**입니다 —
        높이 42 · 안쪽 버튼 36 · 좌우 여백 space[4] · 위에서 44 높이 줄 안 가운데.
        창이 열려 있으면 **그리지 않습니다**(지시).
      */}
      {folded && !expanded && !flying && (
        <View style={[styles.restoreRow, { top: insets.top }]} pointerEvents="box-none">
          <View style={styles.restorePill}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="참고 영상 다시 보기"
              hitSlop={12}
              onPress={() => runFold(false)}
              style={({ pressed }) => [styles.restoreBtn, pressTap(pressed, 'icon')]}
            >
              <Maximize2 size={20} strokeWidth={2} color={color.paper} />
            </Pressable>
          </View>
        </View>
      )}

      {!expanded && (!folded || flying) && (
        <Animated.View
          style={[
            styles.pip,
            {
              width: pipWidth,
              transform: [
                ...pan.getTranslateTransform(),
                /*
                  접힐 때 **왼쪽 위 알약 자리로 날아가며 작아집니다.**
                  창의 왼쪽 위(HOME_LEFT, HOME_TOP + pan)에서 알약 가운데까지가
                  이동량입니다. `scale` 은 왼쪽 위를 기준으로 줄어들도록
                  이동과 함께 계산하지 않고, 작아진 뒤 남는 만큼만 더 밀어 줍니다.
                */
                {
                  translateX: fold.interpolate({
                    inputRange: [0, 1],
                    outputRange: [space[4] + 21 - HOME_LEFT - pipWidth / 2, 0],
                  }),
                },
                {
                  translateY: fold.interpolate({
                    inputRange: [0, 1],
                    outputRange: [insets.top + 22 - HOME_TOP - pipHeight / 2, 0],
                  }),
                },
                { scale: fold.interpolate({ inputRange: [0, 1], outputRange: [0.12, 1] }) },
              ],
              opacity: fold.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.6, 1] }),
            },
          ]}
        >
          {/*
            🔴 **접기 띠** — 아래 확대 띠와 **똑같이 생긴 알약**입니다 (2026-08-31 지시).
               영상 **위**에 두되 영상을 덮지 않습니다(바깥 띠).
          */}
          {/*
            🔴 **위 띠도 손잡이입니다** (2026-08-31 지적: "하단으로만 움직이게 하면
               이동이 불편해서 — 특히 태스크 바 1 2 3 에 겹치면 작동 불가").

            아래 띠만 손잡이면, 창을 화면 아래로 내렸을 때 그 띠가 컷 번호줄과
            겹쳐 **잡을 데가 없어집니다.** 위 띠에도 같은 제스처를 달아 두면
            위아래 어느 쪽으로 몰아도 반대쪽으로 잡아 끌 수 있습니다.
              탭  → 접기
              끌기 → 창 이동
          */}
          <View
            accessibilityRole="button"
            accessibilityLabel="참고 영상 접기 (끌면 창이 움직입니다)"
            hitSlop={{ top: 6, left: 6, right: 6, bottom: 4 }}
            style={styles.barTop}
            {...responders.top.panHandlers}
          >
            <View style={[styles.barInner, pressTap(pressedBar === 'top', 'icon')]}>
              <X size={12} strokeWidth={2.5} color={color.paper} />
              <Text style={styles.barLabel}>접기</Text>
            </View>
          </View>

          {/* 영상 상자 — 시안: radius 14 · 테두리 1 white/20 · 그림자 */}
          <View style={styles.frame}>
            <GuidePlayer
              // 시작 지점이 바뀌면 플레이어를 새로 띄웁니다(확대했다 돌아온 경우).
              key={`small-${smallStart}`}
              url={url}
              startSec={smallStart}
              width={pipWidth}
              portrait
              compact
              loopStart={loopStart}
              loopEnd={loopEnd}
              onTime={(s) => {
                lastSec.current = s;
              }}
            />
          </View>

          {/*
            띠 **전체**가 손잡이 겸 버튼입니다. 시안이 이걸 영상 아래로 내렸습니다.
              탭  → 크게 보기
              끌기 → 창 이동
            손가락은 띠 어디를 눌러도 됩니다. 영상 화면은 여전히 안 가립니다
            (유튜브 약관 — 머리말 참고).
          */}
          <View
            accessibilityRole="button"
            accessibilityLabel="참고 영상 크게 보기 (끌면 창이 움직입니다)"
            hitSlop={{ top: 4, left: 6, right: 6, bottom: 6 }}
            style={styles.bar}
            {...responders.bottom.panHandlers}
          >
            <View style={[styles.barInner, pressTap(pressedBar === 'bottom', 'icon')]}>
              <Maximize2 size={12} strokeWidth={2.5} color={color.paper} />
              <Text style={styles.barLabel}>확대</Text>
            </View>
          </View>
        </Animated.View>
      )}

      <Modal visible={expanded} animationType="fade" transparent={false} onRequestClose={closeBig}>
        <View style={styles.full}>
          <GuidePlayer
            key={`big-${bigStart}`}
            url={url}
            startSec={bigStart}
            width={bigWidth}
            portrait
            loopStart={loopStart}
            loopEnd={loopEnd}
            onTime={(s) => {
              lastSec.current = s;
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="작게 보기"
            onPress={closeBig}
            style={({ pressed }) => [styles.shrink, pressTap(pressed, 'button')]}
          >
            <Minimize2 size={18} strokeWidth={2} color={color.paper} />
            <Text style={styles.shrinkText}>작게 보기</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // 시안: absolute left-4 top-[110] · w98 · rounded-2xl · 흰 테두리 40%
  // 자리만 잡는 껍데기입니다. 테두리·배경은 아래 frame 이 갖습니다.
  pip: {
    position: 'absolute',
    left: HOME_LEFT,
    top: HOME_TOP,
    zIndex: 30,
  },
  // 시안: rounded 14 · 테두리 1 white/20 · 그림자 0 10 28 rgba(0,0,0,.35)
  frame: {
    borderRadius: 14,
    borderWidth: theme.border.hairline,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: color.mediaBlack,
    overflow: 'hidden',
    ...elevation('card'),
  },
  // 영상 **아래** 확대 버튼 겸 손잡이. 영상 위에는 아무것도 올리지 않습니다.
  bar: { height: BAR, marginTop: BAR_GAP },
  // 영상 **위** 접기 버튼. 아래 띠와 같은 규격입니다.
  barTop: { height: BAR, marginBottom: BAR_GAP },
  /* 카메라 오른쪽 위 뒤로가기 알약과 같은 규격 — 높이 44 줄 · px space[4] · 알약 42 */
  restoreRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    zIndex: 31,
  },
  restorePill: {
    height: 42,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
  },
  restoreBtn: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  // 시안: h26 전체폭 pill · 테두리 white/15 · bg rgba(20,20,30,.65) · gap-1
  barInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(20, 20, 30, 0.65)',
  },
  // 시안: 11 semibold 흰색
  barLabel: { ...theme.text.micro, fontFamily: theme.text.chipLabel.fontFamily, fontWeight: theme.text.chipLabel.fontWeight, lineHeight: 16.5, color: color.paper },
  full: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.mediaBlack },
  shrink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[6],
    paddingHorizontal: space[5],
    paddingVertical: space[3],
    borderRadius: radius.pill,
    backgroundColor: color.overlay.cameraChrome,
  },
  shrinkText: { ...text.button, color: color.paper },
});

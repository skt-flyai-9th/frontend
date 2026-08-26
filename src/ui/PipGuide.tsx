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
 *    → 띠를 32 로 키우고 **띠 전체를 버튼**으로 만들었습니다 (98×32 · 안무 110×32).
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
 * ⚠️ 작은 창(98·110pt)에서는 **유튜브가 자기 컨트롤을 그리지 않습니다.**
 *    실측: 98×174·110×196 은 `ytp-tiny-mode` 가 붙고, 389×691 은 안 붙습니다.
 *    그래서 되감기·배속은 **확대해서** 유튜브 컨트롤로 하는 것이 맞습니다.
 *    우리가 재생 버튼을 따로 만들지 않는 이유입니다(예전에 만들었다가 계속 안 먹어서 걷어냈습니다).
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GripVertical, Maximize2, Minimize2 } from 'lucide-react-native';
import { GuidePlayer } from './GuidePlayer';
import { pressTap } from './press';
import theme, { color, radius, space, text } from '../design/theme';

/** 시안 기본 폭. 화면마다 다릅니다 — 카메라 98, 안무 카메라 110. */
const DEFAULT_WIDTH = 98;
/** 우리 버튼이 앉는 띠. 영상 위를 가리지 않기 위한 자리입니다. */
const BAR = 32;
/** 시안 자리: absolute left-4 top-[110] */
const HOME_LEFT = space[4];
const HOME_TOP = 110;
/** 이만큼 움직이면 탭이 아니라 끌기로 봅니다. */
const DRAG_SLOP = 6;

export function PipGuide({
  url,
  startSec,
  width: pipWidth = DEFAULT_WIDTH,
}: {
  url?: string | null;
  startSec?: number;
  /** 시안 화면별 폭. 카메라 98 · 안무 카메라 110. */
  width?: number;
}) {
  const [expanded, setExpanded] = useState(false);
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

  const pipHeight = BAR + Math.round((pipWidth * 16) / 9);

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

  const responder = useMemo(
    () =>
      PanResponder.create({
        // 탭은 그대로 버튼에 갑니다. 손가락이 움직이기 시작할 때만 우리가 가로챕니다.
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > DRAG_SLOP || Math.abs(g.dy) > DRAG_SLOP,
        onPanResponderGrant: () => {
          dragging.current = true;
        },
        onPanResponderMove: (_e, g) => {
          const next = clamp(offset.current.x + g.dx, offset.current.y + g.dy);
          pan.setValue(next);
        },
        onPanResponderRelease: (_e, g) => {
          offset.current = clamp(offset.current.x + g.dx, offset.current.y + g.dy);
          pan.setValue(offset.current);
          // 손을 뗀 직후의 탭 판정과 겹치지 않게 한 박자 뒤에 풉니다.
          setTimeout(() => {
            dragging.current = false;
          }, 50);
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
        },
      }),
    // clamp 는 화면 크기·안전영역이 바뀔 때만 달라집니다.
    [width, height, insets.top, insets.bottom, pipWidth]
  );

  if (!url) return null;

  // 확대: 세로 영상이 화면에 다 들어오도록 폭을 높이에서 되돌려 잡습니다.
  const bigWidth = Math.min(width, Math.round(((height - 160) * 9) / 16));

  const openBig = () => {
    // 끌던 손가락이 떨어질 때 확대되지 않게 합니다.
    if (dragging.current) return;
    setBigStart(lastSec.current);
    setExpanded(true);
  };

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
      {!expanded && (
        <Animated.View
          style={[
            styles.pip,
            { width: pipWidth, transform: pan.getTranslateTransform() },
          ]}
        >
          {/*
            띠 **전체**가 손잡이 겸 버튼입니다.
              탭  → 크게 보기
              끌기 → 창 이동
            눈에 보이는 건 왼쪽 손잡이 표시와 오른쪽 동그라미지만, 손가락은
            98×32(안무 110×32) 어디를 눌러도 됩니다. 영상 화면은 안 가립니다.
          */}
          <View style={styles.bar} {...responder.panHandlers}>
            {/*
              끌 수 있다는 표시. 토큰에 없는 값이라 직접 씁니다 — 바로 위 pip 테두리가
              쓰는 흰색 40% 와 같은 계열로, 있는 듯 없는 듯 보이게 45% 입니다.
            */}
            <GripVertical size={12} strokeWidth={2} color="rgba(255,255,255,0.45)" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="참고 영상 크게 보기 (끌면 창이 움직입니다)"
              hitSlop={{ top: 6, left: 6, right: 6, bottom: 2 }}
              onPress={openBig}
              style={styles.barPress}
            >
              {({ pressed }) => (
                <View style={[styles.barBtn, pressTap(pressed, 'icon')]}>
                  <Maximize2 size={15} strokeWidth={2.5} color={color.paper} />
                </View>
              )}
            </Pressable>
          </View>

          <GuidePlayer
            // 시작 지점이 바뀌면 플레이어를 새로 띄웁니다(확대했다 돌아온 경우).
            key={`small-${smallStart}`}
            url={url}
            startSec={smallStart}
            width={pipWidth}
            portrait
            compact
            onTime={(s) => {
              lastSec.current = s;
            }}
          />
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
  pip: {
    position: 'absolute',
    left: HOME_LEFT,
    top: HOME_TOP,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: color.mediaBlack,
    overflow: 'hidden',
    zIndex: 30,
  },
  // 영상 위가 아니라 영상 위쪽 띠. 여기에만 우리 것이 올라갑니다.
  bar: {
    height: BAR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 4,
    paddingRight: 4,
  },
  // 오른쪽 절반을 눌러도 확대되도록 남는 폭을 전부 먹습니다.
  barPress: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  barBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.overlay.badge,
  },
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

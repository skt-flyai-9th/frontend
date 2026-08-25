/**
 * PipGuide — 시안 V4 `PipGuide`. 촬영하면서 참고 영상을 곁눈질하는 작은 창입니다.
 *
 * ⚠️ 유튜브 약관: 임베드 플레이어 **앞을 가리는 요소를 두면 안 됩니다.**
 *    시안은 플레이어 위에 반투명 막과 재생·확대 버튼을 얹지만 우리는 그럴 수 없습니다.
 *    그래서 재생·일시정지·배속은 **유튜브 자체 컨트롤**에 맡기고(플레이어 안에 이미
 *    있습니다), 우리가 더하는 건 확대 버튼 하나입니다. 그마저도 영상 위가 아니라
 *    영상 **바로 위 띠**에 둡니다 — 사장님 지시("가장자리 우측 상단")를 지키면서
 *    영상 화면은 한 픽셀도 가리지 않습니다.
 *
 * 확대하면 화면 전체를 덮고, 축소 버튼은 영상 **아래**에 따로 둡니다.
 */
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Maximize2, Minimize2 } from 'lucide-react-native';
import { GuidePlayer } from './GuidePlayer';
import { pressTap } from './press';
import theme, { color, radius, space, text } from '../design/theme';

/** 시안 기본 폭. 화면마다 다릅니다 — 카메라 98, 안무 카메라 110. */
const DEFAULT_WIDTH = 98;
/** 확대 버튼이 앉는 띠. 영상 위를 가리지 않기 위한 자리입니다. */
const BAR = 24;

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

  if (!url) return null;

  // 확대: 세로 영상이 화면에 다 들어오도록 폭을 높이에서 되돌려 잡습니다.
  const bigWidth = Math.min(width, Math.round(((height - 160) * 9) / 16));

  return (
    <>
      <View style={[styles.pip, { width: pipWidth }]}>
        <View style={styles.bar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="참고 영상 크게 보기"
            hitSlop={8}
            onPress={() => setExpanded(true)}
            style={({ pressed }) => [styles.barBtn, pressTap(pressed, 'icon')]}
          >
            <Maximize2 size={12} strokeWidth={2.5} color={color.paper} />
          </Pressable>
        </View>
        <GuidePlayer url={url} startSec={startSec} width={pipWidth} portrait compact />
      </View>

      <Modal visible={expanded} animationType="fade" transparent={false} onRequestClose={() => setExpanded(false)}>
        <View style={styles.full}>
          <GuidePlayer url={url} startSec={startSec} width={bigWidth} portrait />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="작게 보기"
            onPress={() => setExpanded(false)}
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
    left: space[4],
    top: 110,
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: color.mediaBlack,
    overflow: 'hidden',
    zIndex: 30,
  },
  // 영상 위가 아니라 영상 위쪽 띠. 여기에만 우리 버튼이 올라갑니다.
  bar: { height: BAR, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingRight: 4 },
  barBtn: {
    width: 20,
    height: 20,
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

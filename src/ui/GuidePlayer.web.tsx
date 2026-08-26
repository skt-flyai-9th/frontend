/**
 * GuidePlayer.web.tsx — **디자인 QA 전용 웹 대체본**
 *
 * react-native-webview 는 웹 빌드가 없습니다. 원본 GuidePlayer 를 그대로 두면
 * 브라우저에서 번들은 되어도 실행 시 터집니다.
 *
 * ⚠️ Metro 는 웹 번들에서만 이 파일을 고릅니다. 네이티브는 원본을 씁니다 —
 *    실제 앱의 유튜브 재생 로직은 하나도 바뀌지 않습니다.
 *
 * 시안도 이 자리를 "유튜브 임베딩 영상" 회색 판으로 그립니다. 레이아웃 비교가
 * 목적이므로 같은 크기·같은 자리를 차지하는 자리표시로 충분합니다.
 */
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { color, radius, space, text } from '../design/theme';

export function extractVideoId(url?: string | null): string | null {
  if (!url) return null;
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/\/embed\/([\w-]{11})/) ||
    url.match(/\/shorts\/([\w-]{11})/);
  return m ? m[1] : null;
}

interface Props {
  url?: string | null;
  startSec?: number;
  compact?: boolean;
  /** 원본과 같은 규칙 — 화면 폭을 다 쓰고 3:4 자리를 차지합니다. */
  fullBleed?: boolean;
  /**
   * 폭을 직접 정합니다. 카메라 위 작은 창(PiP)처럼 화면 폭과 무관한 자리에 씁니다.
   * 주면 세로도 이 폭 기준으로 잡습니다.
   */
  width?: number;
  /** 세로형(9:16) 자리에 넣을 때. 기본은 16:9 입니다. */
  portrait?: boolean;
  /*
   * 아래 셋은 웹 자리표시자에서 **쓰지 않습니다.** 그래도 받아 둡니다 —
   * 네이티브와 타입이 갈라지면 화면 쪽에서 넘기다 컴파일이 깨집니다.
   */
  onTime?: (sec: number) => void;
  autoPlay?: boolean;
  loopStart?: number | null;
  loopEnd?: number | null;
}

export function GuidePlayer({ url, compact = false, fullBleed = false, width: fixedWidth, portrait = false }: Props) {
  const { width } = useWindowDimensions();
  // fullBleed 는 화면 폭을 그대로 쓰고 3:4 자리를 차지합니다(원본과 같은 규칙).
  const playerWidth = fixedWidth ?? (fullBleed ? width : Math.max(200, width - space[5] * 2));
  const playerHeight = portrait
    ? Math.round((playerWidth * 16) / 9)
    : fullBleed
    ? Math.round((playerWidth * 4) / 3)
    : compact
      ? Math.min(210, Math.round((playerWidth * 9) / 16))
      : Math.max(200, Math.round((playerWidth * 9) / 16));

  return (
    <View
      /*
       * 어떤 영상이 걸렸는지 확인할 수 있게 id 를 달아 둡니다. 자리표시자라 화면에는
       * 안 보이고(픽셀 변화 없음), 대표/가이드 주소가 화면별로 제대로 갈리는지
       * 캡처 스크립트가 이걸로 확인합니다. **이 파일은 웹 디자인 QA 전용**이라
       * 실제 앱에는 나가지 않습니다.
       */
      testID={`guide-player:${extractVideoId(url) ?? 'none'}`}
      style={[styles.box, { width: playerWidth, height: playerHeight }, fullBleed && { borderRadius: 0 }]}
    >
      <Text style={[text.bodySmall, { color: color.ink[500] }]}>유튜브 임베딩 영상</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: color.ink[200],
  },
});

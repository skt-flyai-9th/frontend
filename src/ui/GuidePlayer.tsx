/**
 * GuidePlayer.tsx — 안무·동작 가이드용 YouTube 플레이어 (S10.1.1~S10.1.3)
 *
 * ─────────────────────────────────────────────────────────────────
 * 2026-08-26 — 재생 제어를 유튜브에 돌려줬습니다
 * ─────────────────────────────────────────────────────────────────
 * 이전에는 플레이어 **바깥에** 우리가 만든 재생/배속(0.5·0.75·1)/구간반복 버튼을
 * 두고, 주입한 스크립트로 문서 안의 <video> 를 조종했습니다. 그런데 그 버튼들이
 * 자주 안 먹었습니다 — 영상마다 준비 시점이 다르고, 유튜브가 내부적으로 <video>
 * 요소를 갈아끼우면 잡아둔 참조가 끊깁니다. 그때마다 "눌러도 아무 일 없음" 입니다.
 * 죽은 버튼을 안 만들겠다고 큐·확인 타이머까지 넣었지만, 결국 우리가 유튜브 플레이어를
 * 흉내 내는 구조 자체가 문제였습니다.
 *
 * 지금은 `controls=1` 로 **유튜브 자체 컨트롤을 그대로** 씁니다.
 *   · 하단 진행바(스크럽) · 재생/일시정지 · 영상 탭하면 멈춤
 *   · 설정(⚙) → **배속** — 유튜브가 그 영상에 실제로 허용하는 속도만 나옵니다
 *   · 자막(CC)·화질 등 유튜브가 주는 나머지도 함께
 * 우리가 만들 수 있는 것보다 정확하고, 무엇보다 안 먹는 일이 없습니다.
 *
 * 구간반복은 없어졌습니다. 유튜브 임베드가 제공하지 않는 기능이라 우리가 흉내 내야
 * 하는데, 바로 그 흉내가 위 문제의 근원이었습니다. 안무는 진행바를 뒤로 끌어
 * 다시 보는 것으로 대신합니다.
 *
 * 남은 우리 몫은 **실패를 정확히 말하는 것** 하나입니다.
 *   apifail(통신) / 101·150(업로더가 임베드 금지) / 152·153(임베드 환경 거부)
 *   / 2·5·100(잘못된·없는 영상) — 어느 쪽이든 유튜브로 나갈 길을 함께 줍니다.
 *
 * ⚠️ 약관: 플레이어 위에는 아무것도 올리지 않습니다. 로딩 표시는 준비되는 즉시 걷히고,
 *    오류 화면은 플레이어를 **대신** 그립니다(겹치지 않습니다).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { color, radius, space, text } from '../design/theme';
import { GUIDE_PLAYER_BRIDGE, buildEmbedUrl } from './guidePlayerBridge';

/** 준비 신호가 안 와도 이만큼 지나면 로딩 표시를 걷습니다. 유튜브 자체 로딩이 이어받습니다. */
const LOADING_GIVE_UP_MS = 8000;

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
  /** 유튜브 start 파라미터. 이 지점부터 재생을 시작합니다. */
  startSec?: number;
  /**
   * 안무 카메라처럼 화면을 카메라와 나눠 쓰는 곳용.
   * 플레이어 높이를 낮추고 전체화면 버튼을 끕니다 — 촬영 중에 전체화면으로
   * 튀어나가면 카메라가 가려집니다.
   */
  compact?: boolean;
}

/** 페이지 → RN 메시지 (guidePlayerBridge.ts 의 규약) */
type PageMsg = { t: 'boot' } | { t: 'ready' } | { t: 'err'; c: number | string } | { t: 'apifail' };

type Phase = 'loading' | 'ready' | 'apiFailed' | 'embedBlocked' | 'videoBad';

export function GuidePlayer({ url, startSec, compact = false }: Props) {
  const { width } = useWindowDimensions();
  const videoId = extractVideoId(url);

  const [phase, setPhase] = useState<Phase>('loading');
  /** 마지막 플레이어 오류 코드 — 화면에 그대로 보여 다음 진단을 한 줄로 만듭니다. */
  const [errCode, setErrCode] = useState<number | null>(null);

  const playerWidth = Math.max(200, width - space[5] * 2);
  // compact: 16:9 폭 기준 높이가 화면을 다 먹으므로 상한을 둡니다.
  const playerHeight = compact
    ? Math.min(210, Math.round((playerWidth * 9) / 16))
    : Math.max(200, Math.round((playerWidth * 9) / 16));

  const embedUrl = useMemo(
    () => (videoId ? buildEmbedUrl(videoId, { startSec, allowFullscreen: !compact }) : ''),
    [videoId, startSec, compact]
  );

  // 영상이 바뀌면 초기화 (명세 S10.1.2)
  useEffect(() => {
    setPhase('loading');
    setErrCode(null);
    if (!videoId) return;
    // 준비 신호가 안 와도 로딩 표시가 영원히 남지 않게 합니다.
    const t = setTimeout(() => setPhase((p) => (p === 'loading' ? 'ready' : p)), LOADING_GIVE_UP_MS);
    return () => clearTimeout(t);
  }, [videoId]);

  const onMessage = useCallback((ev: WebViewMessageEvent) => {
    let m: PageMsg;
    try {
      m = JSON.parse(ev.nativeEvent.data) as PageMsg;
    } catch {
      return;
    }

    if (m.t === 'ready') {
      setPhase('ready');
      return;
    }
    if (m.t === 'apifail') {
      setPhase('apiFailed');
      return;
    }
    if (m.t === 'err') {
      // 브리지가 유튜브 오류 UI 에서 숫자를 못 찾으면 'embed' 를 보냅니다.
      if (m.c === 'embed') {
        setPhase('embedBlocked');
        return;
      }
      const code = Number(m.c);
      setErrCode(Number.isFinite(code) ? code : null);
      /*
       * 101/150 = 업로더가 임베드 금지. 152/153 = 임베드 환경 거부
       * (origin·referrer 불일치 등 — 2026-08-24 실기기에서 152-4 확인).
       * 어느 쪽이든 앱 안 재생은 불가라 같은 화면으로 안내합니다.
       */
      if (code === 101 || code === 150 || code === 152 || code === 153) setPhase('embedBlocked');
      // 모르는 코드도 숨기지 않습니다 — 화면의 코드가 다음 버그리포트의 진단입니다.
      else setPhase('videoBad');
    }
  }, []);

  // ── 화면 ──
  if (!videoId) {
    return (
      <View style={[styles.fallback, { height: playerHeight }]}>
        <Text style={[text.bodySmall, { color: color.ink[400] }]}>참고 영상이 없습니다</Text>
      </View>
    );
  }

  // 실패는 종류별로 다르게 — 전부 유튜브로 나갈 길이 있습니다.
  if (phase === 'apiFailed' || phase === 'embedBlocked' || phase === 'videoBad') {
    const codeTail = errCode != null ? ` (코드 ${errCode})` : '';
    const msg =
      phase === 'apiFailed'
        ? '통신 문제로 영상을 불러오지 못했습니다'
        : phase === 'embedBlocked'
          ? `이 영상은 앱 안에서 재생할 수 없습니다${codeTail}`
          : `영상을 재생할 수 없습니다${codeTail}`;
    return (
      <View style={[styles.fallback, { height: playerHeight }]}>
        <Text style={[text.bodySmall, { color: color.ink[500], textAlign: 'center' }]}>{msg}</Text>
        {url ? (
          <Pressable onPress={() => Linking.openURL(url).catch(() => {})} hitSlop={8}>
            <Text style={[text.bodySmall, { color: color.brand[600] }]}>유튜브에서 보기</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.playerBox, { width: playerWidth, height: playerHeight }]}>
      <WebView
        /*
         * embed 페이지를 **최상위 문서로 직접** 엽니다. origin = 진짜 youtube.com.
         * 위장(baseUrl 트릭)이 아니므로 152 계열 위장 검증에 걸릴 것이 없습니다.
         * 주입 스크립트는 오류 감지·준비 통지만 하고 재생에는 관여하지 않습니다.
         */
        source={{ uri: embedUrl }}
        injectedJavaScript={GUIDE_PLAYER_BRIDGE}
        originWhitelist={['*']}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        // ⚠️ 이 둘이 없으면 인라인 재생이 안 되고 전체화면으로 튀어나갑니다.
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        // 카메라와 화면을 나눠 쓰는 compact 에서는 전체화면을 막습니다.
        allowsFullscreenVideo={!compact}
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        style={styles.web}
        // 유튜브 로고 등을 눌러 밖으로 나가려 하면 외부 브라우저로 보냅니다.
        onShouldStartLoadWithRequest={(req) => {
          const u = req.url;
          const inPlayer =
            u === 'about:blank' ||
            u.includes('youtube.com') ||
            u.includes('youtube-nocookie.com') ||
            u.includes('ytimg.com') ||
            u.includes('google.com') ||
            u.includes('googlevideo.com');
          if (!inPlayer) {
            void Linking.openURL(u).catch(() => {});
            return false;
          }
          return true;
        }}
      />

      {/*
        로딩 표시.
        ⚠️ 준비되면 즉시 사라집니다. 플레이어 위에 무언가가 남아 있으면 약관 위반이고,
           탭이 가로채여 유튜브 컨트롤이 안 먹습니다.
      */}
      {phase === 'loading' ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={color.paper} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  playerBox: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.mediaBlack,
    alignSelf: 'center',
  },
  web: { backgroundColor: color.mediaBlack },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.mediaBlack,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingHorizontal: space[5],
    borderRadius: radius.md,
    backgroundColor: color.surface,
    alignSelf: 'stretch',
  },
});

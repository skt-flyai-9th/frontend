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
 * (2026-08-25) 구조를 한 번 더 바꿨습니다 — 자세한 근거는 guidePlayerBridge.ts 머리말.
 *   embed 를 최상위 문서로 열던 4차 방식이 **오류 153** 을 냈습니다. 실측 결과 유튜브는
 *   ① iframe 안일 것 ② 문서에 진짜 origin 이 있을 것 을 요구합니다. 그래서 우리 origin 을
 *   가진 호스트 문서를 만들고 그 안에 embed 를 iframe 으로 넣습니다.
 *
 * 재생 제어는 4차와 같이 `controls=1` 로 **유튜브 자체 컨트롤을 그대로** 씁니다.
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
import { buildEmbedUrl, buildFrameHtml, extractVideoId } from './guidePlayerBridge';
import { BASE_URL } from '../api/http';

/** 준비 신호가 안 와도 이만큼 지나면 로딩 표시를 걷습니다. 유튜브 자체 로딩이 이어받습니다. */
const LOADING_GIVE_UP_MS = 8000;

/**
 * 호스트 문서에 부여할 출처.
 *
 * 유튜브 임베드는 문서에 **진짜 origin 이 있어야** 재생됩니다 (없으면 오류 153).
 * 우리 서버 주소를 그대로 씁니다 — 값이 한 곳에서만 오도록 api/http 의 BASE_URL 을
 * 재사용하고, 경로가 붙어 있으면 origin 만 남깁니다.
 */
const APP_ORIGIN = (() => {
  const m = /^(https?:\/\/[^/]+)/.exec(BASE_URL);
  return m ? m[1] : 'https://sarils.p-e.kr';
})();

/**
 * 영상 id 추출은 guidePlayerBridge 가 단일 출처입니다.
 * 여기서 다시 구현하면 두 곳이 어긋납니다 (watch·youtu.be·embed·shorts·live 지원).
 */
export { extractVideoId };

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
  /**
   * 시안 V4: 촬영 준비(포맷)·안무 가이드의 참고 영상 자리는 **좌우 여백 없는 3:4** 입니다.
   * 유튜브 영상 자체는 16:9 라 3:4 로 늘리면 잘립니다. 그래서 3:4 는 **자리(검은 판)** 가
   * 갖고, 영상은 그 안에서 16:9 를 지킨 채 가운데에 놓입니다.
   */
  fullBleed?: boolean;
  /**
   * 폭을 직접 정합니다. 카메라 위 작은 창(PiP)처럼 화면 폭과 무관한 자리에 씁니다.
   * 주면 세로도 이 폭 기준으로 잡습니다.
   */
  width?: number;
  /** 세로형(9:16) 자리에 넣을 때. 기본은 16:9 입니다. */
  portrait?: boolean;
  /**
   * 재생 위치(초)를 알려 줍니다. 초가 바뀔 때만 불립니다.
   * PiP 와 확대 화면이 서로 위치를 이어받는 데 씁니다 — 그 외에는 안 써도 됩니다.
   */
  onTime?: (sec: number) => void;
  /**
   * 자동재생(소리 없음). 홈 피드처럼 **화면에 하나만** 트는 자리에서만 씁니다 —
   * 유튜브 약관은 한 화면에 자동재생 플레이어를 하나로 제한합니다.
   */
  autoPlay?: boolean;
  /**
   * 구간 반복 — 이 구간만 되풀이합니다. 촬영 화면에서 **지금 찍을 컷**에 해당하는
   * 부분만 보여 주려는 것입니다. 둘 중 하나라도 없으면 전체를 그대로 재생합니다.
   *
   * ⚠️ 값이 바뀌어도 **영상을 다시 받지 않습니다.** 주소를 갈아끼우면 iframe 이
   *    새로 뜨면서 검은 화면이 스칩니다 — 컷을 넘길 때마다 그러면 안 됩니다.
   *    대신 프레임 안의 `__setLoop` 만 부릅니다 (guidePlayerBridge.ts).
   *
   * 서버가 `start_ms`·`end_ms` 를 주면 그것을 초로 바꿔 넣으면 됩니다.
   * 9.1 `GET /tasks/{id}/guide` 의 `reference_video` 에 **키는 생겼고 값이 아직
   * `null`** 입니다 (2026-08-27 재확인 · BE_전달사항 §2-1).
   */
  loopStart?: number | null;
  loopEnd?: number | null;
  /**
   * 잠깐 세워 둡니다. 튜토리얼처럼 **화면을 덮어 두는 동안** 쓰는 값입니다 —
   * 안 보이는 영상을 계속 디코딩하면 그만큼 앱이 끕니다.
   *
   * ⚠️ `autoPlay` 와 달리 **영상을 다시 받지 않습니다.** `autoPlay` 는 주소에
   *    들어가는 값이라 바꾸면 iframe 이 새로 뜹니다. 이 값은 프레임 안의
   *    `__setPaused` 만 부릅니다 (구간 반복과 같은 방식).
   */
  paused?: boolean;
}

/** 페이지 → RN 메시지 (guidePlayerBridge.ts 의 규약) */
type PageMsg =
  | { t: 'boot' }
  | { t: 'ready' }
  | { t: 'err'; c: number | string }
  | { t: 'apifail' }
  | { t: 'time'; s: number };

type Phase = 'loading' | 'ready' | 'apiFailed' | 'embedBlocked' | 'videoBad';

export function GuidePlayer({
  url,
  startSec,
  compact = false,
  fullBleed = false,
  width: fixedWidth,
  portrait = false,
  onTime,
  autoPlay = false,
  loopStart,
  loopEnd,
  paused = false,
}: Props) {
  const { width } = useWindowDimensions();
  const videoId = extractVideoId(url);

  const [phase, setPhase] = useState<Phase>('loading');
  /** 마지막 플레이어 오류 코드 — 화면에 그대로 보여 다음 진단을 한 줄로 만듭니다. */
  const [errCode, setErrCode] = useState<number | null>(null);

  // fullBleed 는 화면 폭을 그대로 씁니다(시안: -mx-5 로 좌우 여백을 없앰).
  const playerWidth = fixedWidth ?? (fullBleed ? width : Math.max(200, width - space[5] * 2));
  // 영상 자체는 언제나 16:9 입니다. compact 는 화면을 카메라와 나눠 쓰므로 상한을 둡니다.
  const videoHeight = portrait
    ? Math.round((playerWidth * 16) / 9)
    : compact
    ? Math.min(210, Math.round((playerWidth * 9) / 16))
    : Math.max(200, Math.round((playerWidth * 9) / 16));
  // 시안 V4 의 3:4 자리. 그 안에서 영상은 16:9 를 지키고 위아래가 검게 남습니다.
  const playerHeight = portrait
    ? Math.round((playerWidth * 16) / 9)
    : fullBleed
      ? Math.round((playerWidth * 4) / 3)
      : videoHeight;

  /**
   * 재생할 주소는 **서버(DB)가 준 url 하나뿐**입니다.
   * 앱에 기본 영상이나 대체 주소를 두지 않습니다 — 그런 게 있으면 서버가 주소를 안 줬을 때
   * 엉뚱한 영상이 조용히 재생되고, 아무도 데이터가 비었다는 걸 모르게 됩니다.
   * url 이 없거나 유튜브 주소가 아니면 아래에서 "참고 영상이 없습니다" 로 끝냅니다.
   */
  const frameHtml = useMemo(() => {
    if (!videoId) return '';
    const embedUrl = buildEmbedUrl(videoId, {
      startSec,
      allowFullscreen: !compact,
      origin: APP_ORIGIN,
      autoPlay,
    });
    return buildFrameHtml(embedUrl);
  }, [videoId, startSec, compact, autoPlay]);

  // 영상이 바뀌면 초기화 (명세 S10.1.2)
  useEffect(() => {
    setPhase('loading');
    setErrCode(null);
    if (!videoId) return;
    // 준비 신호가 안 와도 로딩 표시가 영원히 남지 않게 합니다.
    const t = setTimeout(() => setPhase((p) => (p === 'loading' ? 'ready' : p)), LOADING_GIVE_UP_MS);
    return () => clearTimeout(t);
  }, [videoId]);

  /** 최신 콜백을 담아 둡니다 — onMessage 를 매번 새로 만들지 않기 위해서입니다. */
  const onTimeRef = useRef(onTime);
  onTimeRef.current = onTime;

  /*
   * 구간 반복을 프레임에 밀어 넣습니다.
   *
   * 플레이어가 **준비된 뒤**에 걸어야 합니다 — 준비 전에 seekTo 를 보내면 유튜브가
   * 무시합니다. 그래서 `phase` 도 함께 봅니다.
   *
   * 영상 주소(frameHtml)는 이 값에 의존하지 않습니다. 그래야 컷이 바뀌어도 iframe 이
   * 그대로 남아 검은 화면이 안 스칩니다 (실측: 컷 3개를 넘겨도 재로딩 0회).
   */
  const webRef = useRef<WebView>(null);
  useEffect(() => {
    if (phase !== 'ready') return;
    const ok = typeof loopStart === 'number' && typeof loopEnd === 'number' && loopEnd > loopStart;
    const js = ok
      ? `window.__setLoop && window.__setLoop(${loopStart}, ${loopEnd}); true;`
      : 'window.__clearLoop && window.__clearLoop(); true;';
    webRef.current?.injectJavaScript(js);
  }, [phase, loopStart, loopEnd]);

  /* 세우기·다시 틀기. 주소를 안 건드리므로 iframe 은 그대로 남습니다. */
  useEffect(() => {
    if (phase !== 'ready') return;
    webRef.current?.injectJavaScript(
      `window.__setPaused && window.__setPaused(${paused ? 'true' : 'false'}); true;`
    );
  }, [phase, paused]);

  const onMessage = useCallback((ev: WebViewMessageEvent) => {
    let m: PageMsg;
    try {
      m = JSON.parse(ev.nativeEvent.data) as PageMsg;
    } catch {
      return;
    }

    if (m.t === 'time') {
      onTimeRef.current?.(m.s);
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
    <View
      style={[
        styles.playerBox,
        { width: playerWidth, height: playerHeight },
        // 3:4 자리 안에 16:9 영상을 가운데 두려면 바깥이 그만큼 커야 합니다.
        fullBleed && styles.fullBleedBox,
      ]}
    >
      <WebView
        ref={webRef}
        /*
         * ⚠️ baseUrl 은 필수입니다. 이게 없으면 문서 origin 이 null 이 되어
         *    유튜브가 임베드를 거부합니다(오류 153, 2026-08-25 실측).
         *    값은 우리 서버 주소 — 남을 사칭하는 게 아니라 우리 출처를 밝히는 것입니다.
         */
        source={{ html: frameHtml, baseUrl: APP_ORIGIN }}
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
        style={[styles.web, { width: playerWidth, height: videoHeight }]}
        // 유튜브 로고 등을 눌러 밖으로 나가려 하면 외부 브라우저로 보냅니다.
        onShouldStartLoadWithRequest={(req) => {
          const u = req.url;
          const inPlayer =
            u === 'about:blank' ||
            // 호스트 문서 자신. baseUrl 로 준 우리 origin 이라 반드시 통과시켜야 합니다.
            u.startsWith(APP_ORIGIN) ||
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
    justifyContent: 'center',
  },
  // 시안: 화면 끝까지 붙으므로 모서리를 둥글리지 않습니다.
  fullBleedBox: { borderRadius: 0 },
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

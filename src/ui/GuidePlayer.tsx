/**
 * GuidePlayer.tsx — 안무·동작 가이드용 YouTube 플레이어 (S10.1.1~S10.1.3)
 *
 * ─────────────────────────────────────────────────────────────────
 * 2026-08-23 전면 교체 — 배속·일시정지가 계속 죽어 있던 진짜 원인
 * ─────────────────────────────────────────────────────────────────
 * 이전 구현(react-native-youtube-iframe)은 플레이어 페이지를 **제3자
 * GitHub Pages 에서 원격 로드**했습니다. 그 페이지가 기기·통신망 사정으로
 * 안 열리면 ready 가 영영 오지 않고, 라이브러리는 모든 명령을 조용히
 * 버립니다. 그 위에서 우리는 두 번 틀렸습니다:
 *   1차: ready 안 왔는데 4초 뒤 버튼을 강제로 살림 → "눌러도 아무 일 없음"
 *   2차: ready 전 버튼을 잠금 → 그 기기에선 ready 가 안 오니 "아예 안 눌림"
 * 어느 쪽도 원인이 아니라 증상을 만졌습니다.
 *
 * 이번 구조: 플레이어 페이지를 **앱 안에 내장**(guidePlayerHtml.ts)하고
 * WebView 로 직접 띄웁니다. 외부 의존은 유튜브 공식 API 와 영상뿐입니다.
 * 검증(2026-08-23, 실제 크로미움 + 실제 유튜브 API):
 *   ready·지원배속목록 수신 ✅ / setPlaybackRate(0.5→이벤트로 적용 확인) ✅
 *   에러가 코드로 도착(err:150) ✅ / 계약 스텁으로 play·pause·seek·구간반복 ✅
 *
 * ─────────────────────────────────────────────────────────────────
 * 버튼 정책 — 다시는 죽은 버튼을 만들지 않습니다
 * ─────────────────────────────────────────────────────────────────
 * • 버튼은 **항상 눌립니다.** ready 전에 누르면 의도를 큐에 저장하고
 *   "준비되면 바로 적용할게요" 라고 말한 뒤, ready 오는 순간 실행합니다.
 * • 칩·재생 아이콘은 요청값이 아니라 **플레이어가 보낸 이벤트**로만 칠합니다.
 *   (rate 이벤트, state 이벤트) — UI 가 거짓말할 길을 구조적으로 없앱니다.
 * • 명령을 보냈는데 1.6초 안에 이벤트가 안 오면 요청 표시를 되돌리고
 *   이유를 말합니다. 조용한 실패는 없습니다.
 * • 실패는 종류별로 다르게 말합니다:
 *   apifail(통신) / 101·150(임베드 금지) / 2·5·100(잘못된·없는 영상)
 *
 * ⚠️ 약관: 플레이어 위에 아무것도 올리지 않습니다. 모든 버튼은 아래 바깥.
 *    기본 컨트롤(controls:1)도 남깁니다 — 우리 버튼은 "추가" 입니다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Pause, Play } from 'lucide-react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import theme, { color, radius, space, text } from '../design/theme';
import { clock } from '../lib/format';
import { buildGuidePlayerHtml } from './guidePlayerHtml';

const SPEEDS = [0.5, 0.75, 1] as const;
type Speed = (typeof SPEEDS)[number];

/** 구간반복 최소 길이. 이보다 짧으면 반복이 무의미합니다. */
const MIN_LOOP_SEC = 2;
/** 명령 후 이벤트 확인 대기. 넘기면 "안 됐다" 고 말합니다. */
const CONFIRM_MS = 1600;

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
  endSec?: number;
  /** 화면에 절반 이상 보일 때만 true. 약관 요건입니다. */
  autoPlay?: boolean;
  /**
   * 안무 카메라처럼 화면을 카메라와 나눠 쓰는 곳용.
   * 플레이어 높이를 낮추고(9:16 화면에서도 카메라가 절반 이상 남게)
   * 구간반복·안내문을 숨겨 재생/배속만 남깁니다.
   * 실기기(2026-08-24): 플레이어가 커서 카메라 영역이 눌리고 전환 버튼을
   * 넣을 자리도 없다는 보고 → 이 모드가 그 답입니다.
   */
  compact?: boolean;
}

/** 페이지 → RN 메시지 (guidePlayerHtml.ts 의 규약) */
type PageMsg =
  | { t: 'boot' }
  | { t: 'ready'; d: number; rates: number[] }
  | { t: 'state'; s: number }
  | { t: 'rate'; r: number }
  | { t: 'time'; p: number; d: number }
  | { t: 'err'; c: number | string }
  | { t: 'apifail' }
  | { t: 'notReady'; c: string };

type Phase = 'loading' | 'ready' | 'apiFailed' | 'embedBlocked' | 'videoBad';

export function GuidePlayer({ url, startSec, endSec, autoPlay = false, compact = false }: Props) {
  const webRef = useRef<WebView>(null);
  const { width } = useWindowDimensions();
  const videoId = extractVideoId(url);

  const [phase, setPhase] = useState<Phase>('loading');
  const [slowLoad, setSlowLoad] = useState(false);
  /** 마지막 플레이어 오류 코드 — 화면에 그대로 보여 다음 진단을 한 줄로 만듭니다. */
  const [errCode, setErrCode] = useState<number | null>(null);

  /** 재생 상태 — 페이지의 state 이벤트로만 바뀝니다. */
  const [playing, setPlaying] = useState(false);
  /** 사장님이 마지막으로 요청한 배속 (칩 테두리 강조용). */
  const [requested, setRequested] = useState<Speed>(1);
  /** 플레이어가 **실제 적용**했다고 알려온 배속 — 칩 채움은 이 값만 씁니다. */
  const [applied, setApplied] = useState<number>(1);
  const [available, setAvailable] = useState<number[] | null>(null);

  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const [loopOn, setLoopOn] = useState(false);
  const [loopStart, setLoopStart] = useState(startSec ?? 0);
  const [loopEnd, setLoopEnd] = useState(endSec ?? 0);

  const [hint, setHint] = useState<string | null>(null);

  /**
   * ready 전에 누른 의도. 죽은 버튼 대신, 받아 두었다가 ready 순간 실행합니다.
   * "눌리지도 않는 버튼" 재발 방지의 핵심입니다.
   */
  const pendingRef = useRef<{ play?: boolean; rate?: Speed }>({});
  /** 명령→이벤트 확인 타이머들 */
  const rateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playerWidth = Math.max(200, width - space[5] * 2);
  // compact: 16:9 폭 기준 높이가 화면을 다 먹으므로 상한을 둡니다.
  const playerHeight = compact
    ? Math.min(210, Math.round((playerWidth * 9) / 16))
    : Math.max(200, Math.round((playerWidth * 9) / 16));

  const html = useMemo(
    () => (videoId ? buildGuidePlayerHtml(videoId, startSec ?? 0) : ''),
    [videoId, startSec]
  );

  const showHint = useCallback((msg: string) => {
    setHint(msg);
    setTimeout(() => setHint(null), 2600);
  }, []);

  const cmd = useCallback((c: Record<string, unknown>) => {
    webRef.current?.injectJavaScript(`window.__cmd(${JSON.stringify(c)}); true;`);
  }, []);

  // 영상이 바뀌면 초기화 (명세 S10.1.2)
  useEffect(() => {
    setPhase('loading');
    setSlowLoad(false);
    setErrCode(null);
    setPlaying(false);
    setRequested(1);
    setApplied(1);
    setAvailable(null);
    setDuration(0);
    setPosition(0);
    setLoopOn(false);
    setLoopStart(startSec ?? 0);
    setLoopEnd(endSec ?? 0);
    setHint(null);
    pendingRef.current = {};
    const t = setTimeout(() => setSlowLoad(true), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  /** 페이지에서 온 모든 메시지가 여기로 모입니다. */
  const onMessage = useCallback(
    (ev: WebViewMessageEvent) => {
      let m: PageMsg;
      try {
        m = JSON.parse(ev.nativeEvent.data) as PageMsg;
      } catch {
        return;
      }

      switch (m.t) {
        case 'ready': {
          setPhase('ready');
          setSlowLoad(false);
          if (m.d > 0) {
            setDuration(m.d);
            if (!endSec) setLoopEnd((prev) => (prev > 0 ? prev : m.d));
          }
          if (Array.isArray(m.rates) && m.rates.length > 0) setAvailable(m.rates);

          // ready 전에 눌러 둔 의도를 지금 실행합니다.
          const q = pendingRef.current;
          pendingRef.current = {};
          if (q.rate) applyRate(q.rate, true);
          if (q.play) doPlayPause(true);
          if (autoPlay) {
            cmd({ k: 'mute' }); // 자동재생은 무음으로 — 약관·플랫폼 정책 준수
            cmd({ k: 'play' });
          }
          break;
        }
        case 'state': {
          if (m.s === 1) {
            setPlaying(true);
            if (playTimer.current) clearTimeout(playTimer.current);
          }
          if (m.s === 2 || m.s === 0) {
            setPlaying(false);
            if (playTimer.current) clearTimeout(playTimer.current);
          }
          break;
        }
        case 'rate': {
          const r = Number(m.r);
          if (!Number.isFinite(r)) break;
          if (rateTimer.current) clearTimeout(rateTimer.current);
          setApplied((prev) => {
            if (prev !== r) showHint(r === 1 ? '보통 속도로 봅니다' : `${r}배속으로 봅니다`);
            return r;
          });
          setRequested((prev) => (SPEEDS.includes(r as Speed) ? (r as Speed) : prev));
          break;
        }
        case 'time': {
          setPosition(m.p);
          if (m.d > 0) setDuration((prev) => (prev > 0 ? prev : m.d));
          break;
        }
        case 'apifail': {
          setPhase('apiFailed');
          break;
        }
        case 'err': {
          const code = Number(m.c);
          setErrCode(Number.isFinite(code) ? code : null);
          /*
           * 101/150 = 업로더가 임베드 금지. 152/153 = 임베드 환경 거부
           * (origin·referrer 불일치 등 — 2026-08-24 실기기에서 152-4 확인).
           * 어느 쪽이든 앱 안 재생은 불가라 같은 화면으로 안내합니다.
           */
          if (code === 101 || code === 150 || code === 152 || code === 153) {
            setPhase('embedBlocked');
          } else if (code === 2 || code === 5 || code === 100) {
            setPhase('videoBad');
          } else if (Number.isFinite(code)) {
            // 모르는 코드도 숨기지 않습니다 — 화면의 코드가 다음 버그리포트의 진단입니다.
            setPhase('videoBad');
          } else {
            showHint('영상 쪽에서 오류가 났습니다. 다시 눌러 주세요');
          }
          break;
        }
        case 'notReady': {
          // 이 케이스는 정상 흐름에선 안 옵니다(큐가 먼저 막음). 방어용.
          showHint('영상을 준비하는 중입니다');
          break;
        }
        case 'boot':
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [autoPlay, endSec, cmd, showHint]
  );

  /** 배속 적용 + 1.6초 안에 확인 이벤트가 없으면 되돌리고 말합니다. */
  const applyRate = useCallback(
    (s: Speed, silent = false) => {
      if (available && !available.includes(s)) {
        // 유튜브가 이 영상에서 허용하는 속도 목록에 없음 — 사실대로 말합니다.
        showHint(`이 영상은 ${s}배속을 지원하지 않습니다`);
        return;
      }
      setRequested(s);
      cmd({ k: 'rate', v: s });
      if (rateTimer.current) clearTimeout(rateTimer.current);
      rateTimer.current = setTimeout(() => {
        setRequested(SPEEDS.includes(applied as Speed) ? (applied as Speed) : 1);
        if (!silent) showHint('속도를 바꾸지 못했습니다. 한 번 더 눌러 주세요');
      }, CONFIRM_MS);
    },
    [available, applied, cmd, showHint]
  );

  /** 재생/정지 + 확인 감시. 아이콘은 state 이벤트로만 바뀝니다. */
  const doPlayPause = useCallback(
    (silent = false) => {
      const wantPlay = !playing;
      cmd({ k: wantPlay ? 'play' : 'pause' });
      if (playTimer.current) clearTimeout(playTimer.current);
      playTimer.current = setTimeout(() => {
        if (!silent)
          showHint(
            wantPlay
              ? '재생이 되지 않습니다. 화면의 영상 버튼을 직접 눌러 보세요'
              : '멈추지 못했습니다. 한 번 더 눌러 주세요'
          );
      }, CONFIRM_MS);
    },
    [playing, cmd, showHint]
  );

  /**
   * ready 전에는 의도를 큐에 넣습니다. 버튼은 절대 죽지 않습니다.
   * (이전 두 실패 — 강제 활성화 / 잠금 — 의 교훈)
   */
  const press = {
    playPause: () => {
      if (phase !== 'ready') {
        pendingRef.current.play = true;
        showHint('영상을 준비하는 중입니다. 준비되면 바로 재생할게요');
        return;
      }
      doPlayPause();
    },
    rate: (s: Speed) => {
      if (phase !== 'ready') {
        pendingRef.current.rate = s;
        setRequested(s);
        showHint(`영상을 준비하는 중입니다. 준비되면 ${s === 1 ? '보통' : `${s}배`} 속도로 틀게요`);
        return;
      }
      applyRate(s);
    },
  };

  // ── 구간 반복 ──
  const markStart = () => {
    const t = Math.max(0, Math.floor(position));
    setLoopStart(t);
    if (loopEnd < t + MIN_LOOP_SEC) setLoopEnd(Math.min(duration || t + 5, t + 5));
    showHint(`${clock(t)} 부터 반복합니다`);
  };
  const markEnd = () => {
    const t = Math.ceil(position);
    if (t - loopStart < MIN_LOOP_SEC) {
      showHint(`${MIN_LOOP_SEC}초보다 긴 구간을 잡아 주세요`);
      return;
    }
    setLoopEnd(Math.min(t, duration || t));
    showHint(`${clock(loopStart)} ~ ${clock(t)} 반복합니다`);
  };
  const toggleLoop = () => {
    const next = !loopOn;
    const end = loopEnd > loopStart ? loopEnd : duration || loopStart + 5;
    setLoopOn(next);
    setLoopEnd(end);
    // 반복 판정은 페이지 안에서 돕니다 (경계에서 튀지 않게)
    cmd({ k: 'loop', on: next, start: loopStart, end });
    if (next) {
      cmd({ k: 'play' });
      showHint(`${clock(loopStart)} ~ ${clock(end)} 를 반복합니다`);
    } else {
      showHint('반복을 껐습니다');
    }
  };

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
        <Text style={[text.bodySmall, { color: color.ink[500] }]}>{msg}</Text>
        {url ? (
          <Pressable onPress={() => Linking.openURL(url)} hitSlop={8}>
            <Text style={[text.bodySmall, { color: color.brand[600] }]}>유튜브에서 보기</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const ready = phase === 'ready';
  const loopRatioStart = duration > 0 ? loopStart / duration : 0;
  const loopRatioWidth = duration > 0 ? Math.max(0.02, (loopEnd - loopStart) / duration) : 0;
  const posRatio = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View style={styles.wrap}>
      {/* ── 플레이어. 이 위에는 아무것도 올리지 않습니다 (약관) ── */}
      <View style={[styles.playerBox, { width: playerWidth, height: playerHeight }]}>
        <WebView
          ref={webRef}
          /*
           * 내장 페이지 + baseUrl.
           *
           * 2026-08-24 실기기 오류 152-4 조사 결과:
           *  - baseUrl 없음(origin null) → 유튜브 API 핸드셰이크 자체가 안 됨
           *    (크로미움 재현: ready 미도달). 탈락.
           *  - baseUrl + playerVars.origin 동시 지정 → 실기기 152-4. origin 은
           *    유튜브가 위장 검증에 쓰는 값이라 **넣지 않습니다**(페이지 쪽 주석).
           *  - baseUrl 만(origin 파라미터 없음) → 임베드에 정상 referrer 가 실리는,
           *    RN 커뮤니티에서 널리 검증된 조합. 이걸 씁니다.
           * 그래도 막히면 이제 화면에 코드가 뜹니다(152/153 → 안내 + 유튜브로).
           */
          source={{ html, baseUrl: 'https://www.youtube.com' }}
          originWhitelist={['*']}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          // ⚠️ 이 둘이 없으면 스크립트 재생 명령이 무시됩니다 (사용자 제스처 요건)
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          allowsFullscreenVideo={false}
          setSupportMultipleWindows={false}
          androidLayerType="hardware"
          style={{ backgroundColor: color.mediaBlack }}
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
              void Linking.openURL(u);
              return false;
            }
            return true;
          }}
        />
      </View>

      {/* ── 여기부터 플레이어 바깥 ── */}
      <View style={styles.controls}>
        {/* 진행 막대 + 반복 구간 표시 */}
        <View style={styles.timelineWrap}>
          <View style={styles.timeline}>
            {duration > 0 && (
              <View
                style={[
                  styles.loopRange,
                  {
                    left: `${loopRatioStart * 100}%`,
                    width: `${Math.min(1 - loopRatioStart, loopRatioWidth) * 100}%`,
                  },
                  loopOn && styles.loopRangeOn,
                ]}
              />
            )}
            <View style={[styles.playhead, { left: `${posRatio * 100}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={[text.micro, styles.mono]}>{clock(position)}</Text>
            <Text style={[text.micro, styles.mono]}>{clock(duration)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          {/* 재생/정지 — 아이콘은 플레이어가 보낸 상태로만 바뀝니다 */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? '멈추기' : '재생'}
            onPress={press.playPause}
            style={({ pressed }) => [styles.playBtn, pressed && styles.pressed]}
          >
            {playing ? (
              <Pause size={18} strokeWidth={2} color={color.paper} fill={color.paper} />
            ) : (
              <Play size={18} strokeWidth={2} color={color.paper} fill={color.paper} />
            )}
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={text.micro}>
              {ready ? '재생 속도' : slowLoad ? '영상 준비가 느립니다' : '영상을 준비하는 중'}
            </Text>
            <View style={[styles.row, { marginTop: space[1] }]}>
              {SPEEDS.map((s) => {
                // 채움 = 실제 적용값(applied). 테두리 강조 = 요청값(requested).
                // 요청했는데 아직 적용 전이면 테두리만 파랗게 — 상태가 눈에 보입니다.
                const on = applied === s;
                const wanted = requested === s && !on;
                const unsupported = ready && available !== null && !available.includes(s);
                return (
                  <Pressable
                    key={s}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => press.rate(s)}
                    style={({ pressed }) => [
                      styles.pill,
                      on && styles.pillOn,
                      wanted && styles.pillWanted,
                      unsupported && { opacity: 0.45 },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        text.bodySmall,
                        { color: on ? color.paper : color.ink[700] },
                        { fontFamily: theme.text.bodyStrong.fontFamily },
                      ]}
                    >
                      {s === 1 ? '보통' : `${s}배`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* 구간 반복 — compact(안무 카메라)에선 숨깁니다. 찍는 중엔 어차피 손이 없습니다. */}
        {compact ? null : (
        <View style={styles.group}>
          <View style={styles.rowBetween}>
            <Text style={text.micro}>반복할 구간</Text>
            <Text style={[text.micro, styles.mono]}>
              {clock(loopStart)} ~ {clock(loopEnd)}
            </Text>
          </View>

          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: loopOn }}
              onPress={() =>
                ready ? toggleLoop() : showHint('영상을 준비하는 중입니다. 준비되면 반복을 켤 수 있어요')
              }
              style={({ pressed }) => [styles.pill, loopOn && styles.pillOn, pressed && styles.pressed]}
            >
              <Text
                style={[
                  text.bodySmall,
                  { color: loopOn ? color.paper : color.ink[700] },
                  { fontFamily: theme.text.bodyStrong.fontFamily },
                ]}
              >
                {loopOn ? '반복 중' : '반복'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="지금 위치를 시작점으로"
              onPress={markStart}
              style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
            >
              <Text style={text.bodySmall}>여기부터</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="지금 위치를 끝점으로"
              onPress={markEnd}
              style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
            >
              <Text style={text.bodySmall}>여기까지</Text>
            </Pressable>
          </View>
        </View>
        )}

        {/* 버튼을 눌렀을 때 뭐가 바뀌었는지 항상 알려 줍니다 */}
        {(hint || !compact) && (
          <Text style={[text.caption, hint ? { color: color.brand[600] } : null]}>
            {hint ??
              (!ready && slowLoad
                ? '영상 준비가 오래 걸립니다. 통신 상태를 확인하시거나 유튜브에서 바로 보실 수 있습니다.'
                : '영상을 보다가 어려운 부분에서 "여기부터"를 누르고, 끝나는 곳에서 "여기까지"를 누르세요.')}
          </Text>
        )}

        {/* 준비가 오래 걸리면 탈출구 — 죽은 버튼 대신 진짜 길 */}
        {!ready && slowLoad && url ? (
          <Pressable onPress={() => Linking.openURL(url)} hitSlop={8}>
            <Text style={[text.bodySmall, { color: color.brand[600] }]}>유튜브에서 보기</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  playerBox: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.mediaBlack,
    alignSelf: 'center',
  },
  fallback: {
    borderRadius: radius.md,
    backgroundColor: color.ink[50],
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  controls: {
    gap: space[4],
    padding: space[4],
    borderRadius: radius.md,
    backgroundColor: color.ink[50],
  },
  group: { gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  timelineWrap: { gap: space[1] },
  timeline: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: color.ink[200],
    overflow: 'hidden',
    justifyContent: 'center',
  },
  loopRange: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: color.brand[100],
  },
  loopRangeOn: { backgroundColor: color.brand[500] },
  playhead: {
    position: 'absolute',
    width: 3,
    top: -3,
    bottom: -3,
    borderRadius: radius.pill,
    backgroundColor: color.ink[900],
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  mono: { fontVariant: ['tabular-nums'] },

  playBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: color.ink[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    minHeight: 44,
    paddingHorizontal: space[4],
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
  },
  pillOn: { backgroundColor: color.ink[900], borderColor: color.ink[900] },
  /** 요청했지만 아직 플레이어 확인 전 — 테두리로만 표시 (거짓 채움 금지) */
  pillWanted: { borderColor: color.brand[600], borderWidth: theme.border.thick },
  pressed: { opacity: theme.opacity.pressed },
});

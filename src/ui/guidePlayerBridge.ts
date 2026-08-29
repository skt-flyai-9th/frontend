/**
 * guidePlayerBridge.ts — 유튜브 임베드를 담는 **호스트 문서**와 그 안의 통신 스크립트.
 *
 * ─────────────────────────────────────────────────────────────
 * 5차 구조 전환 (2026-08-25) — iframe + 우리 origin
 * ─────────────────────────────────────────────────────────────
 * 1차: 라이브러리(원격 페이지) — 페이지가 죽으면 조용히 실패.
 * 2차: 내장 HTML + iframe API + `baseUrl:'https://www.youtube.com'` 위장 → **오류 152**.
 *      유튜브가 "youtube.com 이라 주장하지만 아닌" 문서를 위장으로 판정.
 * 3·4차: 위장을 없애려고 embed 를 **최상위 문서**로 열었습니다. 152 는 사라졌지만
 *      이번엔 **오류 153** 이 났습니다.
 * 5차(현재): 실측으로 조건을 특정했습니다.
 *
 *   측정 (2026-08-25, Chrome 실기 · headless/headful 동일 · 같은 영상 dQw4w9WgXcQ)
 *   ┌────────────────────────────────────┬──────────────┬────────┐
 *   │ 구성                                │ origin        │ 결과   │
 *   ├────────────────────────────────────┼──────────────┼────────┤
 *   │ embed 를 최상위 문서로 (4차)        │ youtube.com  │ 153    │
 *   │ iframe + about:blank (origin 없음)  │ null         │ 153    │
 *   │ iframe + 진짜 origin                │ http://…     │ 정상   │
 *   └────────────────────────────────────┴──────────────┴────────┘
 *
 *   → 유튜브 임베드가 요구하는 것은 두 가지입니다.
 *     ① **iframe 안에 있을 것** (embed 페이지는 프레임 전제로 만들어져 있습니다)
 *     ② **문서에 진짜 origin 이 있을 것** (null origin 은 거부)
 *
 *   영상 길이·숏츠 여부는 무관합니다 — 위 세 줄 모두 **같은 3분 43초 일반 영상**입니다.
 *
 * 그래서 5차는 **우리 앱 origin 을 가진 호스트 문서**를 만들고 그 안에 embed 를
 * iframe 으로 넣습니다. baseUrl 은 우리 서버 주소입니다 — 남을 사칭하는 게 아니라
 * 우리 출처를 정직하게 밝히는 것이라 2차의 152 와는 성격이 다릅니다.
 *
 * ⚠️ 대가: iframe 은 교차 출처라 **문서 안의 <video>·오류 UI 를 읽을 수 없습니다.**
 *    그래서 오류 감지를 DOM 긁기에서 **IFrame Player API 의 postMessage** 로 바꿉니다.
 *    (`enablejsapi=1` + `origin` → `onReady`·`onError` 를 유튜브가 직접 보내줍니다)
 *
 * 나가는 메시지: { t: 'boot' | 'ready' | 'err' | 'apifail' | 'time' }
 *
 * `time` 은 2026-08-26 에 더했습니다. 작은 창(PiP)과 확대 화면이 **재생 위치를
 * 이어받게** 하려고 씁니다 — 유튜브가 `infoDelivery` 로 계속 보내 주는 값을
 * 초 단위로 바뀔 때만 올립니다(1초에 한 번꼴). 우리가 따로 물어보지 않습니다.
 */

/** DB(명세 9.1 reference_video.reference_url)가 주는 주소에서 영상 id 를 꺼냅니다. */
export function extractVideoId(url?: string | null): string | null {
  if (!url) return null;
  const u = String(url).trim();
  const m =
    u.match(/[?&]v=([\w-]{11})/) ||        // watch?v=…
    u.match(/youtu\.be\/([\w-]{11})/) ||   // 단축 링크
    u.match(/\/embed\/([\w-]{11})/) ||     // 이미 embed 형태
    u.match(/\/shorts\/([\w-]{11})/) ||    // 숏츠
    u.match(/\/live\/([\w-]{11})/);        // 라이브 다시보기
  return m ? m[1] : null;
}

/**
 * embed URL. **iframe 의 src 로만** 씁니다 (최상위 문서로 열면 153).
 *
 * controls=1        하단 진행바 · 재생/일시정지 · 설정(⚙)의 배속 메뉴
 * playsinline=1     자리에서 재생 (전체화면으로 튀지 않음)
 * rel=0             끝났을 때 남의 채널 추천을 줄임
 * iv_load_policy=3  주석 숨김
 * fs                전체화면 버튼. 카메라와 화면을 나눠 쓰는 곳에서는 끔.
 * enablejsapi=1     onReady·onError 를 postMessage 로 받기 위해 필요
 * origin            우리 문서의 출처. 이게 있어야 API 메시지가 옵니다.
 */
export function buildEmbedUrl(
  videoId: string,
  opts: {
    startSec?: number;
    allowFullscreen?: boolean;
    origin?: string;
    /**
     * 자동재생. **소리는 끄고 시작합니다.**
     *
     * 모바일 브라우저·WebView 는 소리가 있는 자동재생을 막습니다 — `mute=1` 이 없으면
     * 재생 자체가 시작되지 않습니다. 홈 피드처럼 화면에 **하나만** 자동재생하는
     * 자리에서만 쓰세요 (유튜브 약관: 한 화면에 자동재생 플레이어는 하나).
     */
    autoPlay?: boolean;
  } = {}
): string {
  const vid = /^[\w-]{11}$/.test(videoId) ? videoId : '';
  const start = Math.max(0, Math.floor(opts.startSec ?? 0));
  const fs = opts.allowFullscreen ? 1 : 0;
  const origin = opts.origin ? `&origin=${encodeURIComponent(opts.origin)}` : '';
  const auto = opts.autoPlay ? '&autoplay=1&mute=1&loop=1&playlist=' + vid : '';
  return (
    `https://www.youtube.com/embed/${vid}` +
    `?playsinline=1&controls=1&rel=0&iv_load_policy=3&fs=${fs}&start=${start}` +
    `&enablejsapi=1&widgetid=1${origin}${auto}`
  );
}

/**
 * 호스트 문서 안에서 도는 스크립트.
 *
 * 하는 일은 4차와 같습니다 — **준비 알리기**와 **오류 코드 전달** 둘뿐이고,
 * 재생 제어는 유튜브 자체 컨트롤에 그대로 맡깁니다.
 * 달라진 건 정보를 얻는 경로입니다: DOM 긁기(불가) → IFrame API postMessage.
 */
const FRAME_SCRIPT = `
(function () {
  'use strict';
  function post(o) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) {}
  }
  post({ t: 'boot' });

  var frame = document.getElementById('yt');
  var ready = false, settled = false, lastSec = -1;

  /**
   * 구간 반복. null 이면 끄고 전체를 그대로 재생합니다.
   * 값은 **밖에서 바꿉니다** — 컷이 넘어갈 때마다 iframe 을 다시 만들면 검은 화면이
   * 스치므로, 주소를 갈아끼우지 않고 이 변수만 바꾸고 그 자리로 보냅니다.
   */
  var loop = null;
  /**
   * 되감을 시각을 **미리 예약해 둔 타이머**. 유튜브가 위치를 알려주기를 기다리지
   * 않습니다 — 아래 armFrom 머리말 참고.
   */
  var loopTimer = null;
  /** 지금 재생 중인가 (playerState 1). 멈춰 있으면 되감지 않습니다. */
  var playing = false;
  /** 배속. 사장님이 확대 화면에서 유튜브 설정으로 바꿀 수 있어 남은 시간 계산에 씁니다. */
  var rate = 1;

  /** IFrame API 명령 채널. 문서 안 <video> 를 잡지 않습니다 — 그 방식이 예전에 먹통이었습니다. */
  function cmd(func, args) {
    try {
      frame.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: func, args: args || [] }), '*'
      );
    } catch (e) {}
  }

  function clearLoopTimer() {
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
  }

  /** 구간 처음으로 되감고 다음 바퀴를 다시 예약합니다. */
  function rewind() {
    clearLoopTimer();
    if (!loop) return;
    cmd('seekTo', [loop.start, true]);
    // 되감은 직후에는 유튜브가 잠시 옛 위치를 보고하므로 구간 전체 길이로 다시 겁니다.
    armFrom(loop.start);
  }

  /**
   * 🔴 **되감기를 위치로 판단하지 않고 시간으로 예약합니다** (2026-08-28).
   *
   * 유튜브는 재생 위치를 ~0.25초 간격으로만 알려줍니다. 그 보고를 보고 되감으면
   * 끝점을 0.1~0.2초 지나치게 됩니다. 3초짜리 구간이면 티가 안 나지만 서버가 주는
   * 안무 구간은 **1초짜리가 절반이 넘어서**(실측: 1·3·1·3·1·2·1초) 20% 를 넘겨
   * 눈에 띄게 덜컥거립니다.
   *
   * 그래서 끝점까지 **남은 시간만큼 타이머를 걸어 둡니다.** 위치 보고가 올 때마다
   * 다시 걸리므로 배속을 바꾸거나 버퍼링이 껴서 어긋나도 곧바로 맞춰집니다.
   * 위치 감시는 타이머가 못 돌았을 때를 위한 **보조**로만 남깁니다(아래 infoDelivery).
   */
  function armFrom(t) {
    clearLoopTimer();
    if (!loop || !playing) return;
    var left = (loop.end - t) / (rate > 0 ? rate : 1);
    if (left <= 0) { rewind(); return; }
    loopTimer = setTimeout(rewind, Math.max(16, left * 1000));
  }

  window.__setLoop = function (s, e) {
    clearLoopTimer();
    if (typeof s !== 'number' || typeof e !== 'number' || !(e > s)) { loop = null; return; }
    loop = { start: s, end: e };
    cmd('seekTo', [s, true]);
    cmd('playVideo');
    // playVideo 를 방금 보냈으니 재생 중으로 봅니다. 곧 오는 playerState 가 바로잡습니다.
    playing = true;
    armFrom(s);
  };
  window.__clearLoop = function () { clearLoopTimer(); loop = null; };

  /**
   * 잠깐 세우기 / 다시 틀기.
   *
   * 튜토리얼처럼 **화면을 덮어 두는 동안** 영상을 세워 두려는 것입니다. 보이지도
   * 않는 영상을 계속 디코딩하면 그만큼 앱이 끕니다(2026-08-29 사장님 지적).
   *
   * ⚠️ 주소를 갈아끼우지 않습니다 — iframe 을 다시 만들면 검은 화면이 스치고
   *    처음부터 다시 받습니다. 구간 반복(__setLoop)과 같은 이유·같은 방식입니다.
   *
   * 다시 틀 때 되감기를 여기서 걸지 않습니다. 곧 오는 위치 보고(infoDelivery)가
   * armFrom 을 다시 걸어 줍니다 — 한 곳에서만 걸어야 두 번 걸리지 않습니다.
   */
  window.__setPaused = function (p) {
    if (p) {
      clearLoopTimer();
      playing = false;
      cmd('pauseVideo');
    } else {
      cmd('playVideo');
      playing = true;
    }
  };

  /** 유튜브에 "이 프레임의 이벤트를 보내달라" 고 신청합니다. */
  function listen() {
    try {
      frame.contentWindow.postMessage(
        JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'
      );
    } catch (e) {}
  }

  function markReady() {
    if (ready) return;
    ready = true; settled = true;
    post({ t: 'ready' });
  }

  window.addEventListener('message', function (e) {
    if (typeof e.data !== 'string') return;
    var m;
    try { m = JSON.parse(e.data); } catch (_) { return; }
    if (!m || !m.event) return;

    if (m.event === 'onError') {
      // 101·150 = 업로더가 임베드 금지 / 2·5·100 = 잘못된·없는 영상
      settled = true;
      post({ t: 'err', c: Number(m.info) });
      return;
    }
    if (m.event === 'onReady' || m.event === 'initialDelivery') { markReady(); return; }
    if (m.event === 'infoDelivery' && m.info) {
      if (typeof m.info.playbackRate === 'number' && m.info.playbackRate > 0) {
        rate = m.info.playbackRate;
      }
      if (typeof m.info.playerState === 'number') {
        markReady();
        // 1 = 재생 중. 멈춰 있는 동안 타이머가 살아 있으면 정지 상태에서 되감깁니다.
        playing = m.info.playerState === 1;
        if (!playing) clearLoopTimer();
      }
      if (typeof m.info.currentTime === 'number') {
        var t = m.info.currentTime;
        /*
         * 구간 반복은 **여기 프레임 안에서** 판단합니다. 밖으로 올리는 time 은 초 단위로
         * 깎여 있어(아래) 3초짜리 컷에서는 쓸 수가 없습니다. 여기 t 는 원본 그대로입니다.
         *
         * 되감는 일 자체는 armFrom 이 예약해 둔 타이머가 합니다. 여기서는
         *   · 위치가 올 때마다 타이머를 **다시 걸어** 어긋남을 지웁니다
         *   · 타이머가 못 돈 경우(끝점을 한참 지남)와 사장님이 진행바를 구간 밖으로
         *     끌어간 경우를 **주워 담습니다**
         * 끝점을 살짝 지난 정도는 방금 되감기를 보냈는데 옛 위치가 도착한 것이라
         * 다시 보내지 않습니다(0.25 여유).
         */
        if (loop) {
          if (t >= loop.end + 0.25 || t < loop.start - 0.5) rewind();
          else armFrom(t);
        }
        // 재생 위치. 초가 바뀔 때만 올려 메시지가 쏟아지지 않게 합니다.
        var sec = Math.floor(t);
        if (sec !== lastSec) { lastSec = sec; post({ t: 'time', s: sec }); }
      }
    }
  });

  frame.addEventListener('load', listen);

  var ticks = 0;
  var timer = setInterval(function () {
    ticks++;
    if (!ready) listen();
    // 12초 안에 준비도 오류도 없으면 통신 문제로 봅니다 (4차와 같은 기준).
    if (!settled && ticks === 30) { post({ t: 'apifail' }); settled = true; }
    if (ready || ticks > 40) clearInterval(timer);
  }, 400);
})();
`;

/**
 * WebView 에 실을 호스트 문서.
 *
 * ⚠️ 이 문자열을 `source={{ html, baseUrl }}` 로 넘길 때 **baseUrl 을 반드시 함께** 주세요.
 *    baseUrl 이 없으면 문서 origin 이 null 이 되어 유튜브가 153 으로 거부합니다.
 */
export function buildFrameHtml(embedUrl: string): string {
  return `<!doctype html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; }
  #yt { display: block; width: 100%; height: 100%; border: 0; }
</style>
</head><body>
<iframe id="yt" src="${embedUrl}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>
<script>${FRAME_SCRIPT}</script>
</body></html>`;
}

/** 4차까지 쓰던 이름. 지금은 호스트 문서에 인라인으로 들어가므로 주입하지 않습니다. */
export const GUIDE_PLAYER_BRIDGE = FRAME_SCRIPT;

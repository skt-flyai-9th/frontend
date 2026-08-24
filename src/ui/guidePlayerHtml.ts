/**
 * guidePlayerHtml.ts — GuidePlayer 가 WebView 에 싣는 플레이어 페이지.
 *
 * ⚠️ 왜 이 파일이 존재하는가 (배속·일시정지가 계속 죽어 있던 진짜 원인)
 *
 *   이전에 쓰던 react-native-youtube-iframe 은 플레이어 페이지를
 *   **제3자 GitHub Pages** 에서 원격 로드합니다:
 *     https://lonelycpp.github.io/react-native-youtube-iframe/iframe.html
 *   이 페이지가 기기·통신사·DNS 사정으로 안 열리면 onReady 가 영영 오지 않고,
 *   라이브러리는 ready 전의 모든 명령(재생·정지·배속)을 조용히 버립니다.
 *   → "버튼이 눌려도 아무 일이 없다 / 아예 안 눌린다" 의 뿌리가 이것입니다.
 *
 *   그래서 페이지를 **앱 안에 통째로 내장**합니다. 밖에서 받아오는 것은
 *   유튜브 공식 API(https://www.youtube.com/iframe_api)와 영상 자체뿐이며,
 *   이 둘이 안 되면 유튜브 앱에서도 그 영상은 안 나옵니다. 제3자 의존은 0 입니다.
 *
 * 통신 규약 (page → RN, ReactNativeWebView.postMessage 로 JSON 문자열)
 *   {t:'boot'}                        페이지 스크립트가 살아 있다는 신호
 *   {t:'ready', d, rates}             플레이어 준비 완료. d=길이(초), rates=지원 배속 목록
 *   {t:'state', s}                    -1미시작 0끝 1재생 2일시정지 3버퍼 5큐됨
 *   {t:'rate', r}                     **실제 적용된** 배속 (칩은 이 값으로만 칠합니다)
 *   {t:'time', p, d}                  0.4초마다 현재 위치
 *   {t:'err', c}                      2/5잘못된요청 100없는영상 101/150임베드금지
 *   {t:'apifail'}                     유튜브 API 스크립트 로드 실패 (통신 문제)
 *   {t:'notReady', c}                 ready 전에 온 명령 — RN 이 큐에 넣고 재시도합니다
 *
 * (RN → page, injectJavaScript 로 window.__cmd({...}) 호출)
 *   {k:'play'} {k:'pause'} {k:'seek', sec} {k:'rate', v} {k:'mute'}
 *   {k:'loop', on, start, end}        구간반복은 페이지 안에서 처리합니다.
 *                                     RN 왕복(0.25s 폴링)으로 하면 경계에서 튑니다.
 *
 * ⚠️ 약관: 플레이어 위에 아무것도 올리지 않습니다. 이 페이지는 플레이어
 *    하나만 담고, 모든 버튼은 RN 쪽(플레이어 바깥 아래)에 있습니다.
 */

export function buildGuidePlayerHtml(videoId: string, startSec = 0): string {
  // videoId 는 extractVideoId 로 뽑은 [\w-]{11} 만 들어오지만, 한 번 더 조입니다.
  const vid = /^[\w-]{11}$/.test(videoId) ? videoId : '';
  const start = Math.max(0, Math.floor(startSec));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  html, body { margin: 0; padding: 0; background: #000; height: 100%; overflow: hidden; }
  /* 플레이어가 화면을 꽉 채웁니다. 위에 겹치는 요소는 없습니다(약관). */
  #p { position: absolute; inset: 0; }
  iframe { width: 100%; height: 100%; border: 0; }
</style>
</head>
<body>
<div id="p"></div>
<script>
(function () {
  'use strict';

  function post(o) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(o));
      }
    } catch (e) { /* 통신 실패는 여기서 할 수 있는 게 없습니다 */ }
  }

  post({ t: 'boot' });

  var player = null;
  var isReady = false;
  var loop = { on: false, start: 0, end: 0 };

  // ── RN 이 부르는 단일 진입점 ──
  window.__cmd = function (c) {
    if (!c || !c.k) return;
    if (!isReady || !player) {
      // 조용히 버리지 않습니다. RN 이 큐에 넣었다가 ready 후 다시 보냅니다.
      post({ t: 'notReady', c: c.k });
      return;
    }
    try {
      switch (c.k) {
        case 'play':  player.playVideo(); break;
        case 'pause': player.pauseVideo(); break;
        case 'seek':  player.seekTo(Number(c.sec) || 0, true); break;
        case 'rate':  player.setPlaybackRate(Number(c.v) || 1); break;
        case 'mute':  player.mute(); break;
        case 'loop':
          loop.on = !!c.on;
          loop.start = Number(c.start) || 0;
          loop.end = Number(c.end) || 0;
          if (loop.on) player.seekTo(loop.start, true);
          break;
      }
    } catch (e) {
      post({ t: 'err', c: 'cmd:' + c.k });
    }
  };

  // ── 위치 통지 + 구간반복 (페이지 안에서 처리해야 경계가 안 튑니다) ──
  setInterval(function () {
    if (!isReady || !player || !player.getCurrentTime) return;
    try {
      var p = player.getCurrentTime();
      var d = player.getDuration();
      post({ t: 'time', p: p, d: d });
      if (loop.on && loop.end > loop.start && p >= loop.end - 0.15) {
        player.seekTo(loop.start, true);
      }
    } catch (e) { /* 플레이어 전환 중이면 다음 틱에 */ }
  }, 400);

  // ── 유튜브 공식 API 로드. 여기가 유일한 외부 의존입니다 ──
  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('p', {
      videoId: '${vid}',
      playerVars: {
        playsinline: 1,
        controls: 1,      // 약관: 기본 컨트롤을 없애지 않습니다. 우리 버튼은 "추가" 입니다.
        rel: 0,
        fs: 0,
        start: ${start}
        /*
         * origin 을 넣지 않습니다 (2026-08-24 실기기: 오류 152-4).
         * baseUrl 로 유튜브인 척한 문서에서 origin=https://www.youtube.com 을
         * 보내면 유튜브가 위장을 감지하고 152/153 계열로 거부할 수 있습니다.
         * 원격 페이지(lonelycpp)와 라이브러리 local-HTML 모드 — 실기기에서
         * 재생이 실제로 됐던 두 방식 — 모두 origin 을 보내지 않습니다.
         */
      },
      events: {
        onReady: function () {
          isReady = true;
          var rates = [1];
          try { rates = player.getAvailablePlaybackRates() || [1]; } catch (e) {}
          var d = 0;
          try { d = player.getDuration() || 0; } catch (e) {}
          post({ t: 'ready', d: d, rates: rates });
        },
        onStateChange: function (ev) {
          post({ t: 'state', s: ev.data });
          // 끝났는데 반복이 켜져 있으면 처음으로 — 여기서 해야 씹히지 않습니다.
          if (ev.data === 0 && loop.on) {
            try { player.seekTo(loop.start, true); player.playVideo(); } catch (e) {}
          }
        },
        onPlaybackRateChange: function (ev) {
          // "실제 적용된" 배속. RN 칩은 이 값으로만 칠합니다.
          post({ t: 'rate', r: ev.data });
        },
        onError: function (ev) {
          post({ t: 'err', c: ev.data });
        }
      }
    });
  };

  var s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.onerror = function () { post({ t: 'apifail' }); };
  document.head.appendChild(s);

  // 스크립트 로드가 8초 안에 안 되면 통신 문제로 봅니다.
  setTimeout(function () {
    if (!window.YT || !window.YT.Player) post({ t: 'apifail' });
  }, 8000);
})();
</script>
</body>
</html>`;
}

/**
 * guidePlayerBridge.ts — 유튜브 embed 문서에 주입하는 다리 스크립트.
 *
 * ─────────────────────────────────────────────────────────────
 * 3차 구조 전환 (2026-08-24, 실기기 오류 152)
 * ─────────────────────────────────────────────────────────────
 * 1차: 라이브러리 — 제3자 원격 페이지가 죽거나 프로토콜이 어긋나 조용히 실패.
 * 2차: 내장 HTML + iframe API — baseUrl 로 유튜브인 척했더니 실기기에서
 *      유튜브가 위장을 감지, 오류 152 로 거부. (origin 파라미터를 빼도 동일)
 * 3차(현재): **유튜브 embed 페이지를 WebView 최상위 문서로 직접 엽니다.**
 *      https://www.youtube.com/embed/{id} — origin 이 "진짜" youtube.com 입니다.
 *      위장이 아니므로 152 계열 검증에 걸릴 것이 없고, iframe API 스크립트도,
 *      핸드셰이크도 없습니다. 사장님 폰 브라우저에서 유튜브가 열리는 것과
 *      같은 조건입니다.
 *
 * 제어는 embed 문서 안의 HTML5 <video> 요소를 직접 씁니다:
 *   video.play() / pause() / playbackRate / currentTime — 웹 표준이라
 *   유튜브 내부 구현이 바뀌어도 <video> 태그 자체는 사라질 수 없습니다.
 *
 * 나가는 메시지 규약은 2차와 동일합니다 (GuidePlayer 쪽 로직 재사용):
 *   {t:'boot'|'ready'|'state'|'rate'|'time'|'err'|'apifail'|'notReady'}
 *   state: 1 재생 / 2 멈춤 (iframe API 숫자를 그대로 따릅니다)
 *
 * 오류: embed 가 거부되면 유튜브가 화면에 자체 오류 UI(.ytp-error)를 그립니다.
 *   그 안의 코드 숫자(예: "152")를 **긁어서 그대로 전달**합니다 — 화면에 뜨는
 *   숫자가 곧 다음 버그리포트의 진단이 되게.
 */

/** WebView injectedJavaScript 로 들어갑니다. 문서 로드 직후 1회 실행. */
export const GUIDE_PLAYER_BRIDGE = `
(function () {
  'use strict';
  if (window.__realsBridge) return; // 재주입 방지
  window.__realsBridge = true;

  function post(o) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) {}
  }
  post({ t: 'boot' });

  var video = null;
  var loop = { on: false, start: 0, end: 0 };
  var readySent = false;

  function hookVideo(v) {
    if (!v || v.__hooked) return;
    v.__hooked = true;
    video = v;

    v.addEventListener('loadedmetadata', maybeReady);
    v.addEventListener('durationchange', maybeReady);
    v.addEventListener('play', function () { post({ t: 'state', s: 1 }); });
    v.addEventListener('playing', function () { post({ t: 'state', s: 1 }); });
    v.addEventListener('pause', function () { post({ t: 'state', s: 2 }); });
    v.addEventListener('ended', function () {
      post({ t: 'state', s: 0 });
      if (loop.on) { try { v.currentTime = loop.start; v.play(); } catch (e) {} }
    });
    v.addEventListener('ratechange', function () { post({ t: 'rate', r: v.playbackRate }); });
    maybeReady();
  }

  function maybeReady() {
    if (readySent || !video) return;
    var d = Number(video.duration);
    if (!isFinite(d) || d <= 0) return;
    readySent = true;
    // HTML5 video 는 임의 배속을 지원합니다. 앱이 쓰는 표준 목록을 알립니다.
    post({ t: 'ready', d: d, rates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] });
  }

  /** 유튜브 자체 오류 UI 에서 코드 숫자를 긁어냅니다 (예: "오류 코드: 152"). */
  function scrapeError() {
    var el = document.querySelector('.ytp-error');
    if (!el) return false;
    var txt = (el.textContent || '').trim();
    var m = txt.match(/(\\d{2,3})/);
    post({ t: 'err', c: m ? Number(m[1]) : 'embed' });
    return true;
  }

  // 감시: 영상 요소 등장 / 오류 UI 등장 / 시간 통지 / 구간반복
  var ticks = 0;
  setInterval(function () {
    ticks++;
    if (!video) {
      var v = document.querySelector('video');
      if (v) hookVideo(v);
    }
    if (scrapeError()) return;
    if (!readySent && ticks >= 30) {
      // 12초 안에 영상도 오류 UI 도 없으면 통신 문제로 봅니다. (한 번만)
      if (ticks === 30) post({ t: 'apifail' });
      return;
    }
    if (video && readySent) {
      var p = video.currentTime;
      post({ t: 'time', p: p, d: video.duration });
      if (loop.on && loop.end > loop.start && p >= loop.end - 0.15) {
        try { video.currentTime = loop.start; } catch (e) {}
      }
    }
  }, 400);

  window.__cmd = function (c) {
    if (!c || !c.k) return;
    if (!video || !readySent) { post({ t: 'notReady', c: c.k }); return; }
    try {
      switch (c.k) {
        case 'play':  video.play(); break;
        case 'pause': video.pause(); break;
        case 'seek':  video.currentTime = Number(c.sec) || 0; break;
        case 'rate':  video.playbackRate = Number(c.v) || 1; break;
        case 'mute':  video.muted = true; break;
        case 'loop':
          loop.on = !!c.on; loop.start = Number(c.start) || 0; loop.end = Number(c.end) || 0;
          if (loop.on) { try { video.currentTime = loop.start; } catch (e) {} }
          break;
      }
    } catch (e) { post({ t: 'err', c: 'cmd:' + c.k }); }
  };
})();
true;`;

/** embed 최상위 문서 URL. origin 이 진짜 youtube.com 이 됩니다. */
export function buildEmbedUrl(videoId: string, startSec = 0): string {
  const vid = /^[\w-]{11}$/.test(videoId) ? videoId : '';
  const start = Math.max(0, Math.floor(startSec));
  return `https://www.youtube.com/embed/${vid}?playsinline=1&controls=1&rel=0&fs=0&start=${start}`;
}

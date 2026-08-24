/**
 * guidePlayerBridge.ts — 유튜브 embed 문서에 주입하는 **진단 전용** 스크립트.
 *
 * ─────────────────────────────────────────────────────────────
 * 4차 구조 전환 (2026-08-26) — 재생 제어를 유튜브에 돌려줍니다
 * ─────────────────────────────────────────────────────────────
 * 1차: 라이브러리(원격 페이지) — 페이지가 죽으면 조용히 실패.
 * 2차: 내장 HTML + iframe API — baseUrl 위장이 감지돼 오류 152.
 * 3차: embed 를 최상위 문서로 열고 <video> 를 직접 제어 — origin 문제는 풀렸지만,
 *      **바깥에 우리가 만든 재생/배속/구간반복 버튼이 자주 안 먹었습니다.**
 *      영상마다 준비 시점이 다르고, 유튜브가 내부적으로 <video> 를 갈아끼우면
 *      우리가 잡아둔 참조가 끊깁니다. 그때마다 "눌러도 아무 일 없음" 이 됩니다.
 * 4차(현재): **유튜브 자체 컨트롤을 그대로 씁니다.**
 *      controls=1 이면 하단 진행바·재생/일시정지·설정(⚙)의 **배속 메뉴**가 전부
 *      유튜브 것으로 붙습니다. 영상 탭하면 멈추는 것도 유튜브 기본 동작입니다.
 *      우리가 흉내 내던 것보다 정확하고, 무엇보다 **안 먹는 일이 없습니다.**
 *
 * 그래서 이 스크립트에는 더 이상 재생 명령(__cmd)이 없습니다. 하는 일은 둘뿐입니다.
 *   1. 영상이 실제로 준비됐는지 알려주기 (로딩 표시를 걷기 위해)
 *   2. 유튜브가 자체 오류 UI 를 띄우면 그 **코드 숫자를 긁어 전달** —
 *      화면에 뜨는 숫자가 곧 다음 버그리포트의 진단이 되게.
 *
 * 나가는 메시지: { t: 'boot' | 'ready' | 'err' | 'apifail' }
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

  var readySent = false;

  /** 유튜브 자체 오류 UI 에서 코드 숫자를 긁어냅니다 (예: "오류 코드: 152"). */
  function scrapeError() {
    var el = document.querySelector('.ytp-error');
    if (!el) return false;
    var txt = (el.textContent || '').trim();
    var m = txt.match(/(\\d{2,3})/);
    post({ t: 'err', c: m ? Number(m[1]) : 'embed' });
    return true;
  }

  var ticks = 0;
  var timer = setInterval(function () {
    ticks++;
    if (scrapeError()) { clearInterval(timer); return; }

    if (!readySent) {
      var v = document.querySelector('video');
      var d = v && Number(v.duration);
      if (v && isFinite(d) && d > 0) {
        readySent = true;
        post({ t: 'ready' });
        // 준비됐고 오류도 없으면 더 볼 일이 없습니다. 타이머를 놓아 줍니다.
        clearInterval(timer);
        return;
      }
      // 12초 안에 영상도 오류 UI 도 없으면 통신 문제로 봅니다.
      if (ticks >= 30) { post({ t: 'apifail' }); clearInterval(timer); }
    }
  }, 400);
})();
true;`;

/**
 * embed 최상위 문서 URL. origin 이 진짜 youtube.com 이 됩니다.
 *
 * controls=1  하단 진행바 · 재생/일시정지 · 설정(⚙) 안의 **배속 메뉴**
 * playsinline=1  전체화면으로 튀어나가지 않고 자리에서 재생
 * rel=0          끝났을 때 남의 채널 영상 추천을 줄입니다
 * iv_load_policy=3  주석(annotation) 숨김
 * fs             전체화면 버튼. 카메라와 화면을 나눠 쓰는 곳에서는 끕니다.
 */
export function buildEmbedUrl(
  videoId: string,
  opts: { startSec?: number; allowFullscreen?: boolean } = {}
): string {
  const vid = /^[\w-]{11}$/.test(videoId) ? videoId : '';
  const start = Math.max(0, Math.floor(opts.startSec ?? 0));
  const fs = opts.allowFullscreen ? 1 : 0;
  return (
    `https://www.youtube.com/embed/${vid}` +
    `?playsinline=1&controls=1&rel=0&iv_load_policy=3&fs=${fs}&start=${start}`
  );
}

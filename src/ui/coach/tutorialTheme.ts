import { Platform } from 'react-native';
import type { BlurMethod } from 'expo-blur';

/**
 * 튜토리얼(코치마크) 값 한 곳 — **디자인팀 요청서 그대로입니다** (2026-08-30).
 *
 * 화면 코드에 숫자를 흩어 두면 다음에 "블러 20 이었나 14 였나" 를 코드에서 찾게 됩니다.
 * 요청서에 적힌 값을 그 이름 그대로 여기 둡니다 — 바꿀 일이 생기면 여기만 봅니다.
 *
 * ⚠️ `design/theme.ts` 의 토큰은 38 개 화면이 함께 씁니다. 튜토리얼은 **어두운 유리**
 *    한 벌이라 앱 본문과 색 체계가 다릅니다. 그래서 토큰을 덮지 않고 여기 따로 둡니다
 *    (CLAUDE.md §6: 덮는 건 괜찮되 근거를 남길 것).
 *
 * ─────────────────────────────────────────────────────────────
 * 웹 CSS 값을 RN 으로 옮길 때
 * ─────────────────────────────────────────────────────────────
 * `backdrop-filter: blur(14px)` 은 RN 에 없습니다. `expo-blur` 의 `intensity`(0~100)로
 * 옮기는데 **픽셀과 1:1 이 아닙니다.** 눈으로 맞춘 값이라 그 근거를 적어 둡니다 —
 * 14px ≈ intensity 40, 20px ≈ intensity 55 로 뒀습니다. 기기에서 보고 조정하세요.
 */
/**
 * 🔴 **안드로이드는 블러를 따로 켜 줘야 합니다.**
 *
 * `expo-blur` 의 `blurMethod` 기본값이 안드로이드에서 **`'none'`** 입니다. 즉 그냥
 * 쓰면 흐려지지 않고 **색만 덮입니다** — 웹(CSS `backdrop-filter`)과 iOS 는 그대로
 * 흐려지기 때문에, 캡처로는 멀쩡해 보이고 폰에서만 안 걸립니다. 실제로 2026-08-30 에
 * 그렇게 올렸다가 사장님께 "블러 안 해뒀잖아" 를 들었습니다.
 *
 *   dimezisBlurViewSdk31Plus  안드로이드 12+ — 시스템 RenderEffect. 빠릅니다.
 *   dimezisBlurView           그 아래 — 뷰를 비트맵으로 떠서 흐립니다. 무겁습니다.
 *
 * 무거운 쪽을 쓰는 기기도 있으므로 **멈춰 있을 때만** 블러를 켭니다
 * (`TutorialOverlay` 의 `settled`). 튜토리얼이 도는 동안 홈 영상도 세워 두기 때문에
 * 밑그림이 정지 화면이라, 다시 뜨는 비용이 계속 들지는 않습니다.
 *
 * ⚠️ 앱바·탭바(`AppBar`·`TabBar`)의 BlurView 는 **일부러 안 건드렸습니다.** 거기까지
 *    켜면 앱 전체 그림이 바뀌고 비용도 늘 붙습니다. 필요하면 따로 판단할 일입니다.
 */
export const ANDROID_BLUR_METHOD: BlurMethod | undefined =
  Platform.OS === 'android'
    ? Number(Platform.Version) >= 31
      ? 'dimezisBlurViewSdk31Plus'
      : 'dimezisBlurView'
    : undefined;

/**
 * 구멍이 **움직이는 동안에도** 블러를 켜 둘지.
 *
 * 흐리는 값이 기기마다 다릅니다.
 *   · 안드로이드 12+ · iOS · 웹  시스템이 GPU 로 흐립니다. 움직여도 견딥니다.
 *   · 안드로이드 11 이하        뷰를 비트맵으로 떠서 흐립니다. 매 프레임이면 끕니다.
 *
 * 그래서 느린 쪽에서만 **이동 중에 잠깐 끕니다.** 나머지는 계속 켜 둡니다 —
 * 껐다 켜면 단계를 넘길 때마다 배경이 또렷해졌다 흐려져 그게 더 거슬립니다.
 *
 * ⚠️ 어느 쪽이든 **처음 뜨는 순간에는 기다리지 않습니다.** 첫 등장은 미끄러질 곳이
 *    없어서 기다릴 이유가 없는데, 처음엔 여기서도 320ms 를 기다렸습니다 —
 *    "화면 뜨고 딜레이 있다가 블러처리된다" 는 지적이 그것입니다(2026-08-30).
 */
export const BLUR_WHILE_MOVING =
  Platform.OS !== 'android' || Number(Platform.Version) >= 31;

export const TUTORIAL = {
  /** 전체 배경 — 딤 + 블러 */
  backdrop: {
    /** 시안 최최종 원문 `rgba(15,18,25,0.3)`. 카드가 흰색이 되어 막을 옅게 둡니다. */
    dim: 'rgba(15, 18, 25, 0.3)',
    /** 시안 최최종 원문 blur(5px) */
    blurIntensity: 22,
    tint: 'dark' as const,
    /**
     * 구멍 모서리를 메우는 조각에 쓰는 색.
     *
     * 모서리 조각은 **두꺼운 테두리로 만든 고리**라(TutorialOverlay 머리말) 블러를
     * 입힐 수가 없습니다 — 테두리는 블러 위에 그려집니다. 폭이 6~26pt 짜리 초승달이라
     * 눈에 안 띄지만, 블러가 tint 로 살짝 어둡게 만드는 만큼만 더 진하게 둡니다.
     */
    cornerFill: 'rgba(15, 18, 25, 0.34)',
  },

  /** 스포트라이트 테두리 — 시안 원문 값입니다(요청서에는 없음) */
  spotlight: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    glowColor: '#ffffff',
    glowOpacity: 0.25,
    glowRadius: 15,
  },

  /**
   * 카드 그림자 — 흰 카드가 밝은 막 위에 떠 보이게 합니다.
   * 시안 최최종 `boxShadow: 0 12px 32px rgba(15,23,42,0.22)`.
   */
  cardShadow: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },

  /**
   * 툴팁 카드.
   *
   * 🔴 **2026-08-30 에 흰 카드로 뒤집었습니다** (지시 ⑧: "저희 앱 컬러가 파랑이라
   *    해당 캡쳐본들처럼 설명창 UI 수정이 필요합니다"). 하루 전 요청서는 어두운
   *    유리였는데, 새 시안(`최최종.html`)이 흰 카드 + 파란 버튼으로 바뀌었습니다.
   *    값은 시안 원문 그대로입니다.
   */
  card: {
    /** 시안 최최종 `background: "#ffffff"` */
    bg: '#ffffff',
    /** 흰 카드라 블러는 안 씁니다 — 불투명입니다. */
    blurIntensity: 0,
    tint: 'light' as const,
    /** 시안 최최종 `border: 1px solid rgba(15,23,42,0.08)` */
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    /** 요청서 border-radius: 20px */
    radius: 20,
    /** 요청서 padding: 20px ~ 24px — 상하좌우 균일 */
    padding: 20,
    /** 좌우 화면 여백 */
    margin: 16,
    /** 카드와 구멍 사이 간격 */
    gap: 12,
  },

  /** 타겟을 가리키는 다이아몬드 */
  pointer: {
    /** 정사각형 한 변. 45° 돌리면 대각선이 √2 배가 됩니다. */
    size: 14,
    /** 카드 밖으로 나오는 높이. 이만큼만 보이고 나머지는 잘립니다. */
    height: 9,
    /** 잘라내는 상자의 폭 */
    width: 24,
    /** 카드 가장자리와 1pt 겹칩니다 — 카드 테두리 선이 밑에서 비치지 않게. */
    overlap: 1,
  },

  /** 글자 — 시안 최최종 원문 값 (지시 ⑧: 제목 16px · 설명 13.5px) */
  text: {
    /** 단계 표시 `3/7` */
    count: '#94a3b8',
    /** 건너뛰기 */
    sub: '#64748b',
    /** 제목 */
    title: '#0f172a',
    /** 본문 */
    body: '#475569',
    /** 본문 줄간격(요청서 "줄간격 확보") */
    bodyLineHeight: 22,
    titleLineHeight: 22,
  },

  /** 아래 액션 버튼 */
  button: {
    height: 44,
    radius: 12,
    gap: 8,
    /** 시안 비율 1 : 1.4 — "다음" 이 더 넓습니다(요청서에는 없어 시안을 따릅니다) */
    primaryFlex: 1.4,
    secondaryFlex: 1,
    /** 이전 — 옅은 회색 판 (시안 최최종) */
    secondaryBg: '#F1F5F9',
    secondaryBorder: 'rgba(15, 23, 42, 0.06)',
    secondaryText: '#334155',
    secondaryTextDim: '#cbd5e1',
    /** 다음·완료 — **브랜드 파랑** (지시 ⑧: "저희 앱 컬러가 파랑이라") */
    primaryBg: '#2563eb',
    primaryText: '#ffffff',
  },

  /** 움직임 — 시안 transition .28s cubic-bezier(.22,1,.36,1) */
  motion: {
    moveMs: 280,
    popMs: 260,
    /** 이동이 끝난 뒤 블러를 다시 켜며 걸치는 시간 */
    blurFadeMs: 160,
    bezier: [0.22, 1, 0.36, 1] as const,
  },
} as const;

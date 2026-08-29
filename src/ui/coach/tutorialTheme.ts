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
export const TUTORIAL = {
  /** 전체 배경 — 딤 + 블러 */
  backdrop: {
    /** 요청서 rgba(0,0,0,0.45~0.55). 가운데 값으로 둡니다. */
    dim: 'rgba(0, 0, 0, 0.5)',
    /** 요청서 blur(14px) */
    blurIntensity: 40,
    tint: 'dark' as const,
    /**
     * 구멍 모서리를 메우는 조각에 쓰는 색.
     *
     * 모서리 조각은 **두꺼운 테두리로 만든 고리**라(TutorialOverlay 머리말) 블러를
     * 입힐 수가 없습니다 — 테두리는 블러 위에 그려집니다. 폭이 6~26pt 짜리 초승달이라
     * 눈에 안 띄지만, 블러가 tint 로 살짝 어둡게 만드는 만큼만 더 진하게 둡니다.
     */
    cornerFill: 'rgba(0, 0, 0, 0.56)',
  },

  /** 스포트라이트 테두리 — 시안 원문 값입니다(요청서에는 없음) */
  spotlight: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    glowColor: '#ffffff',
    glowOpacity: 0.25,
    glowRadius: 15,
  },

  /** 툴팁 카드 */
  card: {
    /** 요청서 rgba(40, 44, 52, 0.72) */
    bg: 'rgba(40, 44, 52, 0.72)',
    /** 요청서 blur(20px) */
    blurIntensity: 55,
    tint: 'dark' as const,
    /** 요청서 1px solid rgba(255, 255, 255, 0.12) */
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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

  /** 글자 */
  text: {
    /** 단계 표시 `3/7` · 건너뛰기 */
    sub: 'rgba(255, 255, 255, 0.7)',
    /** 제목 */
    title: 'rgba(255, 255, 255, 0.95)',
    /** 본문 — 요청서 "텍스트 대비 확보" */
    body: 'rgba(255, 255, 255, 0.78)',
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
    /** 이전 — 반투명 다크 + 미세 보더 */
    secondaryBg: 'rgba(255, 255, 255, 0.08)',
    secondaryBorder: 'rgba(255, 255, 255, 0.08)',
    secondaryText: 'rgba(255, 255, 255, 0.85)',
    secondaryTextDim: 'rgba(255, 255, 255, 0.35)',
    /** 다음·완료 — 솔리드 화이트 + 다크 텍스트 */
    primaryBg: '#ffffff',
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

/**
 * ⏳ **녹화용 임시 값** (2026-08-31).
 *
 * 화면 녹화를 찍는 동안만 쓰는 값입니다. **끝나면 이 파일과 이 파일을 부르는
 * 자리를 지우세요.**
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 **계정 하나에만 적용됩니다** (2026-08-31 지시: "특정 계정의 마이페이지만
 *    저렇게 고치는 건 프론트에서 불가한 작업인 거지?")
 * ─────────────────────────────────────────────────────────────
 * 불가하지 않습니다. 앱은 **누가 로그인했는지** 압니다(1.5 `email`). 그 값이
 * 아래 `DEMO_ACCOUNT` 와 같을 때만 녹화용 숫자로 바꿉니다. 다른 사장님 화면은
 * 하나도 달라지지 않습니다.
 *
 * **mock 을 켜지 않습니다.** 예전 판에서는 이 값들을 `api/mock` 에 넣었는데,
 * 그러면 실서버로 붙는 폰에서는 아예 안 보이고(mockDomains 가 비어 있음),
 * mock 을 켜면 **모든 사용자**가 가짜 데이터를 보게 됩니다. 그래서 데이터가 아니라
 * **화면에서** 이 계정일 때만 갈아 끼웁니다.
 *
 * 되돌리는 법
 *   ① `DEMO_ACCOUNT` 를 `null` 로 — 즉시 전원 원래대로
 *   ② 이 파일과 부르는 자리(아래 목록)를 지우기
 *
 * 부르는 자리
 *   `domains/my/screens/MyPageScreen.tsx`  — 인스타 계정 이름 · Views · 인사이트 카드 조회수
 *   `domains/my/screens/InsightScreen.tsx` — 주간 지표 · 추천 영상 · 증감 배지
 */
import { useMe } from '../api/queries/auth';
import type { PlatformWeek } from '../api/queries/insightMetrics';

/** 녹화에 쓰는 계정. `null` 이면 아무에게도 적용되지 않습니다. */
export const DEMO_ACCOUNT: string | null = '99@naver.com';

/**
 * 지금 로그인한 사람이 **녹화 계정인가.**
 *
 * 1.5 는 이미 다른 곳에서도 부르므로 캐시를 그대로 씁니다 — 요청이 늘지 않습니다.
 * 대소문자는 무시합니다(로그인 화면에서 대문자로 칠 수 있습니다).
 */
export function useDemoAccount(): boolean {
  const me = useMe();
  if (!DEMO_ACCOUNT) return false;
  return (me.data?.email ?? '').trim().toLowerCase() === DEMO_ACCOUNT.toLowerCase();
}

/** 마이페이지 인스타 줄에 찍을 계정 이름. */
export const DEMO_INSTAGRAM_NAME = 'oni_onigiri2021';

/**
 * 마이페이지 프로필의 `Views`.
 *
 * 계정 단위 누적 조회수 API 가 **없습니다**(17.1 은 게시물 단위). 그래서 평소에는
 * `—` 로 둡니다 — 0 으로 채우면 "실제로 0" 이라는 거짓말이 됩니다.
 */
export const DEMO_ACCOUNT_VIEWS = '1,726';

/**
 * 마이페이지 Professional Insight 카드의 **"최근 1주일 동안 N번 조회되었어요"**.
 *
 * 평소에는 17.3 이 준 플랫폼별 주간 조회수를 **전부 더한 값**입니다. 녹화 계정은
 * 아직 게시한 영상이 없어 0 으로 옵니다 — 같은 화면의 Views 1,726 과 어긋나므로
 * 같은 값으로 맞춥니다 (2026-08-31 지시).
 */
export const DEMO_WEEK_TOTAL = 1726;

/**
 * "다음 숏폼 추천" 카드에 깔 영상.
 *
 * 3.5 insights 는 제목·본문만 주고 **영상은 주지 않습니다.** 평소에는 회색 판입니다.
 * ⚠️ 녹화에서 **직접 찍는 숏폼과 겹치지 않는 것**으로 고릅니다 (2026-08-31 지시).
 *    주술회전 트랜지션(`Aa-CGr9-c8E`)은 그래서 뺐습니다.
 */
export const DEMO_REC_VIDEO_URL = 'https://www.youtube.com/shorts/rUIEHnyoPrU';

/**
 * 증감 배지를 감춥니다 — 주간 조회수 추이 오른쪽 위 · 총 조회수 · 좋아요 수 셋 다
 * (2026-08-31 지시). 숫자만 크게 남는 편이 녹화에서 읽기 좋습니다.
 */
export const DEMO_HIDE_DELTA = true;

/**
 * 인스타 주간 지표.
 *
 * 합이 정확히 **1,726** 이 되도록 나눴습니다. 곡선은 `그래프예시.png` 의 앞쪽
 * 굴곡(봉우리·골)을 그대로 두고 **끝을 올린** 모양입니다.
 *   월 낮게 → 화 봉우리 → 수 골 → 목 상승 → 금 더 → 토 더 → **일 꼭대기**
 *   58 + 186 + 102 + 238 + 320 + 386 + 436 = 1726
 *
 * 증감은 배지를 감추므로 넣지 않습니다(넣어 두면 감춤을 풀었을 때 튀어나옵니다).
 */
export const DEMO_INSTAGRAM_WEEK: PlatformWeek = {
  platform: 'INSTAGRAM',
  name: '인스타',
  views: '1,726회',
  likes: '18개',
  week: [
    { day: '월', value: 58 },
    { day: '화', value: 186 },
    { day: '수', value: 102 },
    { day: '목', value: 238 },
    { day: '금', value: 320 },
    { day: '토', value: 386 },
    { day: '일', value: 436 },
  ],
};

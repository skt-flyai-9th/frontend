/**
 * insightMetrics.ts — 매장 인사이트 지표 (플랫폼별 주간 조회수·좋아요·추이).
 *
 * 🔴 **2026-08-28: 실서버로 옮겼습니다.**
 *
 * 여기 있던 예전 주석은 "계정 단위 집계 API 가 없어서 mock 에서만 온다" 였습니다.
 * 그 사이 **명세 17.3 `GET /sns-posts/weekly-summary`** 가 생겼고, 매장 단위로
 * 플랫폼별 주간 합계와 7일치 일별 조회수를 그대로 줍니다. 시안 `매장인사이트.html`
 * 의 상단(플랫폼 토글 · 조회수 · 좋아요 · 주간 추이)이 이 응답 하나로 채워집니다.
 *
 * 실측(2026-08-28, store 67):
 * ```
 * { week_start: "2026-08-23T15:00:00Z",
 *   platforms: [
 *     { platform: "INSTAGRAM", weekly_views: 0, weekly_likes: 0,
 *       views_change_rate: null,
 *       daily_views: [ { date: "2026-08-24", views: 0 }, … 7일 ] },
 *     { platform: "YOUTUBE", … } ] }
 * ```
 *
 * ⚠️ **좋아요 증감률은 없습니다.** 시안에는 `+9%` 가 붙어 있지만 서버가 주는 증감률은
 *    `views_change_rate` 하나뿐입니다. 조회수에만 붙이고 좋아요는 숫자만 둡니다 —
 *    없는 값을 지어내지 않습니다 (CLAUDE.md §2).
 */
import { useQuery } from '@tanstack/react-query';
import { request } from '../http';
import { API } from '../endpoints';
import { qk } from './keys';
import type { SnsPlatform, WeeklySummaryResponse } from '../schema/types';

/** 화면이 쓰기 좋게 다듬은 한 플랫폼의 주간 지표. */
export interface PlatformWeek {
  platform: SnsPlatform;
  /** 화면에 그대로 찍는 이름 — 시안 탭 라벨. */
  name: string;
  /** `2,480` 처럼 천 단위 쉼표까지 넣은 값. */
  views: string;
  likes: string;
  /** `+14%`. 비교할 지난주가 없으면 `undefined` — 그때는 화면에서 뺍니다. */
  viewsDelta?: string;
  /**
   * 좋아요 증감. **서버가 줄 때만 있습니다.**
   * 실서버 17.3 은 아직 `views_change_rate` 하나만 줍니다(BE 문의 중).
   * 값이 없으면 `undefined` 라 화면에서 빠집니다 — 지어내지 않습니다.
   */
  likesDelta?: string;
  /** 꺾은선용. `day` 는 요일 한 글자입니다. */
  week: { day: string; value: number }[];
}

const LABEL: Record<SnsPlatform, string> = {
  YOUTUBE: '유튜브',
  INSTAGRAM: '인스타',
};

/** 시안 탭 순서 — 유튜브가 먼저입니다. */
const ORDER: SnsPlatform[] = ['YOUTUBE', 'INSTAGRAM'];

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/** `2026-08-24` → `월`. 시간대 때문에 하루 밀리지 않도록 정오로 읽습니다. */
function dayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '' : WEEKDAY[d.getDay()];
}

/**
 * 증감률을 `+14%` / `-8%` 로. 0 은 `0%` 입니다.
 * 서버가 0.14 처럼 비율로 줄지 14 처럼 퍼센트로 줄지 몰라 **둘 다 견딥니다** —
 * 절대값이 1 이하면 비율로 보고 100 을 곱합니다.
 */
function deltaText(rate?: number | null): string | undefined {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) return undefined;
  const pct = Math.abs(rate) <= 1 ? rate * 100 : rate;
  const rounded = Math.round(pct);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

export function useInsightMetrics(storeId?: number) {
  return useQuery({
    queryKey: qk.weeklySummary(storeId ?? 0),
    queryFn: () => request<WeeklySummaryResponse>(API.weeklySummary(storeId!)),
    enabled: !!storeId,
    select: (d): PlatformWeek[] => {
      const rows = d.platforms ?? [];
      return ORDER.filter((p) => rows.some((r) => r.platform === p)).map((p) => {
        const r = rows.find((x) => x.platform === p)!;
        return {
          platform: p,
          name: LABEL[p],
          views: `${(r.weeklyViews ?? 0).toLocaleString()}회`,
          likes: `${(r.weeklyLikes ?? 0).toLocaleString()}개`,
          viewsDelta: deltaText(r.viewsChangeRate),
          likesDelta: deltaText(r.likesChangeRate),
          week: (r.dailyViews ?? []).map((pt) => ({
            day: dayLabel(pt.date),
            value: pt.views ?? 0,
          })),
        };
      });
    },
    staleTime: 1000 * 60,
  });
}

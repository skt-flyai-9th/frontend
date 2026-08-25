/**
 * insightMetrics.ts — 매장 인사이트 지표(KPI · 주간 추이 · 지역 상권).
 *
 * ⚠️ **계정 단위 집계 API 가 없습니다.**
 *    17.1 metrics 는 게시물(postId) 단위라 주간 합산을 만들 수 없고,
 *    3.5 insights 는 문장형이라 수치 필드가 없습니다.
 *
 *    그래서 이 값들은 mock 에서만 옵니다. 실서버 모드에서는 전부 비고
 *    화면이 "집계 준비 중" 으로 말합니다 — 사장님에게 지어낸 숫자를
 *    보여주지 않기 위한 구분입니다(알림 notifications.ts 와 같은 방식).
 *
 * BE 가 집계 API 를 만들면 queryFn 만 request(...) 로 바꾸면 됩니다.
 * 화면(InsightScreen)은 손댈 필요가 없습니다.
 */
import { useQuery } from '@tanstack/react-query';
import { isMocked } from '../http';
import * as fx from '../mock/fixtures';

export interface InsightKpi {
  label: string;
  /** 없으면 화면이 "—" 로 표시합니다. */
  value?: string;
  delta?: string;
  icon: string;
}

export interface WeekView {
  day: string;
  value: number;
}

export interface LocalShare {
  label: string;
  /** 0~100 */
  value: number;
  color: string;
}

export interface InsightMetrics {
  kpis: InsightKpi[];
  weekViews: WeekView[];
  weekViewsDelta?: string;
  local: LocalShare[];
}

/** 지표가 없을 때의 모양. 라벨(자리)은 남기고 값만 비웁니다. */
const EMPTY: InsightMetrics = {
  kpis: [
    { label: '이번 주 총 조회수', icon: 'trending-up' },
    { label: '플레이스 유입 전환', icon: 'map-pin' },
    { label: '저장 및 공유', icon: 'bookmark' },
    { label: '주 타깃', icon: 'users' },
  ],
  weekViews: [],
  local: [],
};

export function useInsightMetrics() {
  return useQuery<InsightMetrics>({
    queryKey: ['insightMetrics'],
    queryFn: async () => {
      // 대응하는 경로가 없으므로 도메인 스위치가 아니라 mock 여부로 직접 가릅니다.
      if (!isMocked('/insight-metrics')) return EMPTY;
      return {
        kpis: fx.insightKpis as InsightKpi[],
        weekViews: fx.weekViews as WeekView[],
        weekViewsDelta: fx.weekViewsDelta,
        local: fx.localAnalysis as LocalShare[],
      };
    },
    staleTime: 1000 * 60,
  });
}

/** R06 대화형 숏폼 Agent — 프론트는 AI 서버를 직접 호출하지 않고 백엔드만 호출합니다. */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../endpoints';
import { request } from '../http';
import type {
  ShortformAcceptResponse,
  ShortformRecommendation,
  ShortformSessionResponse,
  ShortformTurnInput,
  ShortformTurnResponse,
} from '../schema/types';

export function useCreateShortformSession(storeId?: number) {
  return useMutation({
    mutationFn: () => {
      if (!storeId) throw new Error('가게를 먼저 선택해 주세요.');
      return request<ShortformSessionResponse>(API.createShortformSession(storeId), {
        method: 'POST',
      });
    },
  });
}

export function useSubmitShortformTurn(sessionId?: number) {
  return useMutation({
    mutationFn: (input: ShortformTurnInput) => {
      if (!sessionId) throw new Error('대화 세션이 준비되지 않았습니다.');
      return request<ShortformTurnResponse>(API.shortformTurn(sessionId), {
        method: 'POST',
        body: { input },
      });
    },
  });
}

export function useNextShortformRecommendation(sessionId?: number) {
  return useMutation({
    mutationFn: async (): Promise<ShortformTurnResponse> => {
      if (!sessionId) throw new Error('대화 세션이 준비되지 않았습니다.');
      const data = await request<{
        id: number;
        // 서버는 배열로 줍니다. 예전 단수 필드도 혹시 몰라 함께 받습니다.
        recommendations?: ShortformRecommendation[];
        recommendation?: ShortformRecommendation;
        shownTemplateIds: string[];
        hasMoreRecommendations?: boolean;
      }>(API.nextShortformRecommendation(sessionId), { method: 'POST' });
      return {
        id: data.id,
        action: 'RECOMMEND',
        assistantMessage: undefined,
        options: [],
        projectState: {},
        recommendations:
          data.recommendations ?? (data.recommendation ? [data.recommendation] : []),
        hasMoreRecommendations: data.hasMoreRecommendations,
      };
    },
  });
}

/**
 * 고른 추천으로 프로젝트를 만듭니다.
 *
 * ⚠️ 추천이 **여러 개** 오므로 어느 것을 고른 건지 알려야 합니다. 그래서
 *    `recommendation_id` 를 함께 보냅니다. 서버가 이 값을 아직 안 볼 수도 있는데,
 *    그러면 세션의 마지막 추천이 선택됩니다 — 사장님이 첫 번째 카드를 눌렀는데
 *    세 번째가 만들어지는 상황이라 BE 확인이 필요합니다 (BE_전달사항).
 */
export function useAcceptShortformRecommendation(sessionId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recommendationId?: string) => {
      if (!sessionId) throw new Error('대화 세션이 준비되지 않았습니다.');
      return request<ShortformAcceptResponse>(API.acceptShortformRecommendation(sessionId), {
        method: 'POST',
        body: recommendationId ? { recommendationId } : undefined,
      });
    },
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['projects', project.storeId] });
      qc.invalidateQueries({ queryKey: ['tasks', project.id] });
    },
  });
}

export function discardShortformSession(sessionId: number): Promise<unknown> {
  return request(API.discardShortformSession(sessionId), { method: 'DELETE' });
}

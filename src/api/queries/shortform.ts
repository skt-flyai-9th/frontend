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
        recommendation: ShortformRecommendation;
        shownTemplateIds: string[];
      }>(API.nextShortformRecommendation(sessionId), { method: 'POST' });
      return {
        id: data.id,
        action: 'RECOMMEND',
        assistantMessage: undefined,
        options: [],
        projectState: {},
        recommendation: data.recommendation,
      };
    },
  });
}

export function useAcceptShortformRecommendation(sessionId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!sessionId) throw new Error('대화 세션이 준비되지 않았습니다.');
      return request<ShortformAcceptResponse>(API.acceptShortformRecommendation(sessionId), {
        method: 'POST',
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

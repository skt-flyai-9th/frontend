/** R08~R13 촬영과 평가 */
import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '../http';
import { API } from '../endpoints';
import { qk } from './keys';
import { uploadFootage, type UploadHandle } from '../upload';
import type {
  EvaluateResponse,
  Evaluation,
  TaskBoard,
  TaskGuide,
  TaskStatus,
} from '../schema/types';

export function useTasks(projectId?: number) {
  return useQuery({
    queryKey: qk.tasks(projectId ?? 0),
    queryFn: () => request<TaskBoard>(API.tasks(projectId!)),
    enabled: !!projectId,
    /**
     * 명세 8.1 의 display_order 로 정렬합니다.
     *
     * 서버가 배열 순서를 보장한다는 보장이 없습니다.
     * 촬영은 순서가 핵심이라 뒤죽박죽이면 사장님이 엉뚱한 걸 먼저 찍습니다.
     * 화면에서 한 번 더 정렬해 두는 편이 안전합니다.
     */
    select: (d) => ({
      ...d,
      tasks: [...d.tasks].sort((a, b) => a.displayOrder - b.displayOrder),
    }),
  });
}

export function useTaskGuide(taskId?: number) {
  return useQuery({
    queryKey: qk.guide(taskId ?? 0),
    queryFn: () => request<TaskGuide>(API.taskGuide(taskId!)),
    enabled: !!taskId,
  });
}

/**
 * 태스크 상태 변경 (명세 8.2, 2026-08-21 개정)
 *
 * body 에서 action 필드가 제거되고 task_status 만 보냅니다.
 * ENUM: NOT_STARTED / IN_PROGRESS / DONE / RETAKE_NEEDED
 *
 * ⚠️ SKIPPED 는 없습니다.
 *    건너뛰기·교체가 MVP 스코프에서 제외되면서 ENUM 에서도 삭제되었습니다.
 *
 * 앱이 이 API 를 쓰는 경우는 하나입니다: **업로드 시작 시 IN_PROGRESS 표시**
 *
 *   DONE 은 촬영본 업로드(9.2)가 끝나면 서버가 붙입니다.
 *   RETAKE_NEEDED 는 AI 평가(13.1) 결과로 서버가 붙입니다.
 *   IN_PROGRESS 는 **앱만 아는 상태**입니다 — 파일이 다 올라가기 전까지
 *   서버는 그 태스크가 시작됐는지 알 수 없기 때문입니다.
 *
 *   신호가 약한 가게에서 30초 영상은 1분 넘게 걸립니다.
 *   그 사이 앱을 끄고 다시 들어오면 "아직 안 함"으로 보이는데,
 *   IN_PROGRESS 로 표시해 두면 "보내는 중"이라고 알려줄 수 있습니다.
 */
export function useUpdateTask(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, taskStatus }: { taskId: number; taskStatus: TaskStatus }) =>
      request<{ id: number; taskStatus: TaskStatus; updatedAt: string }>(API.task(taskId), {
        method: 'PATCH',
        body: { taskStatus },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks(projectId) }),
  });
}

/**
 * 촬영본 업로드 (명세 9.2)
 *
 * 진행률은 실제 전송 바이트 기준입니다.
 * 취소 핸들을 함께 돌려주므로 화면에서 "그만두기"를 붙일 수 있습니다.
 */
export function useUploadFootage(projectId: number) {
  const qc = useQueryClient();
  const handleRef = useRef<UploadHandle | null>(null);

  const mutation = useMutation({
    mutationFn: (vars: {
      taskId: number;
      uri: string;
      durationSec: number;
      onProgress?: (ratio: number) => void;
    }) => {
      const handle = uploadFootage(vars);
      handleRef.current = handle;
      return handle.promise;
    },
    onSettled: () => {
      handleRef.current = null;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks(projectId) }),
  });

  return {
    ...mutation,
    /** 업로드 중단. 화면을 벗어날 때도 호출해야 합니다. */
    cancel: () => handleRef.current?.cancel(),
  };
}

/**
 * 촬영본 AI 평가 실행 (명세 13.1).
 *
 * 응답은 요약입니다: ai_eval_score, ai_is_usable, ai_eval_issues(문자열 하나)
 * 상세는 13.2 로 따로 받습니다: must_retake_issues, fixable_by_editing, ok_reasons
 *
 * ⚠️ 실행하면 13.2 캐시를 반드시 지웁니다.
 *    안 지우면 다시 찍은 뒤에도 이전 촬영의 평가가 그대로 보입니다.
 */
export function useEvaluate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) =>
      request<EvaluateResponse>(API.evaluate(taskId), { method: 'POST' }),
    onMutate: (taskId) => {
      qc.removeQueries({ queryKey: qk.evaluation(taskId) });
    },
    onSuccess: (_, taskId) => {
      qc.invalidateQueries({ queryKey: qk.evaluation(taskId) });
    },
  });
}

export function useEvaluation(taskId?: number, enabled = true) {
  return useQuery({
    queryKey: qk.evaluation(taskId ?? 0),
    queryFn: () => request<Evaluation>(API.evaluation(taskId!)),
    enabled: !!taskId && enabled,
  });
}

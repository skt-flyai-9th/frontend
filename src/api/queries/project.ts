/** R04 캠페인 설정 + R05 포맷 + R06 질문형 + R07 기획 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '../http';
import { API } from '../endpoints';
import { qk } from './keys';
import type {
  Draft,
  PlanResponse,
  ProjectListItem,
  PromotionPurpose,
  QuizAlternative,
  QuizAnswer,
  QuizQuestion,
  RecommendedFormat,
  ShortsProject,
  StoryboardScene,
  VideoFormat,
} from '../schema/types';

// ── R04 ────────────────────────────────────────────────
export function useProjects(storeId?: number, status?: string) {
  return useQuery({
    // status 를 키에 넣지 않으면 'DRAFT' 조회와 전체 조회가 같은 캐시를 봅니다.
    queryKey: qk.projects(storeId ?? 0, status),
    queryFn: () => request<{ projects: ProjectListItem[] }>(API.projectList(storeId!, status)),
    enabled: !!storeId,
    select: (d) => d.projects,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { storeId: number; promotionPurpose: PromotionPurpose }) =>
      request<ShortsProject>(API.projects(), { method: 'POST', body }),
    // 홈의 "만들던 영상" 목록을 갱신합니다.
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['projects', vars.storeId] }),
  });
}

export function useProject(projectId?: number) {
  return useQuery({
    queryKey: qk.project(projectId ?? 0),
    queryFn: () => request<ShortsProject>(API.project(projectId!)),
    enabled: !!projectId,
  });
}

export function useUpdateProject(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ShortsProject>) =>
      request<ShortsProject>(API.project(projectId), { method: 'PATCH', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.project(projectId) });
      // 목록의 promotion_purpose·updated_at 도 바뀌므로 함께 갱신합니다.
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/** 자동저장. 명세 9.3 */
export function useSaveDraft(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { currentStep: string; clientState?: Record<string, unknown> }) =>
      request<{ message: string; lastSavedAt: string }>(API.draft(projectId), {
        method: 'PUT',
        body,
      }),
    onSuccess: (res, vars) => {
      // 저장 결과를 캐시에 바로 반영합니다.
      // 안 하면 홈의 "이어하기"가 옛 단계를 계속 보여줍니다.
      qc.setQueryData(qk.draft(projectId), {
        projectId,
        lastSavedAt: res?.lastSavedAt ?? new Date().toISOString(),
        currentStep: vars.currentStep,
        clientState: vars.clientState,
      });
    },
  });
}

export function useDraft(projectId?: number) {
  return useQuery({
    queryKey: qk.draft(projectId ?? 0),
    queryFn: () => request<Draft>(API.draft(projectId!)),
    enabled: !!projectId,
  });
}

// ── R05 포맷 ───────────────────────────────────────────
export interface FormatFilters {
  [key: string]: string | number | boolean | undefined;
  projectId?: number;
  formatType?: string;
  sort?: string;
  period?: string;
  requiresFace?: boolean;
  keyword?: string;
}

export function useVideoFormats(filters: FormatFilters) {
  return useQuery({
    queryKey: qk.formats(filters),
    queryFn: () =>
      request<{ formats: VideoFormat[] }>(
        API.videoFormats({
          project_id: filters.projectId,
          format_type: filters.formatType,
          sort: filters.sort,
          period: filters.period,
          requires_face: filters.requiresFace,
          keyword: filters.keyword,
        })
      ),
    select: (d) => d.formats,
  });
}

export function useVideoFormat(formatId?: number) {
  return useQuery({
    queryKey: qk.format(formatId ?? 0),
    queryFn: () => request<VideoFormat>(API.videoFormat(formatId!)),
    enabled: !!formatId,
  });
}

// ── 5.3 찜 (2026-08-23 신설) ───────────────────────────
/** 찜 목록. 응답이 5.1 과 동일해 홈 피드 카드를 그대로 재사용합니다. */
export function useFavorites() {
  return useQuery({
    queryKey: qk.favorites,
    queryFn: () => request<{ formats: VideoFormat[] }>(API.favorites()),
    select: (d) => d.formats,
  });
}

/**
 * 찜 토글 — 낙관적 업데이트.
 *
 * 두 API 가 멱등이라(BE 확정: 중복 요청도 200) 낙관적으로 먼저 칠해도
 * 서버와 어긋날 위험이 없습니다. 실패하면 무효화로 서버 상태를 다시 받습니다.
 * 목록 캐시(formats/favorites)에 있는 같은 포맷의 isFavorite 도 함께 뒤집어
 * 홈 피드와 관심목록의 하트가 즉시 일치하게 합니다.
 */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formatId, next }: { formatId: number; next: boolean }) =>
      request(API.favorite(formatId), { method: next ? 'POST' : 'DELETE' }),
    onMutate: async ({ formatId, next }) => {
      await qc.cancelQueries({ queryKey: qk.favorites });
      const flip = (f: VideoFormat) => (f.id === formatId ? { ...f, isFavorite: next } : f);
      // 5.1 목록 캐시들 (필터 조합별로 여러 개일 수 있음)
      qc.setQueriesData<{ formats: VideoFormat[] }>({ queryKey: ['formats'] }, (old) =>
        old ? { formats: old.formats.map(flip) } : old
      );
      // 5.2 상세 캐시
      qc.setQueriesData<VideoFormat>({ queryKey: ['format'] }, (old) =>
        old && old.id === formatId ? { ...old, isFavorite: next } : old
      );
      // 찜 목록: 해제면 즉시 제거, 찜이면 무효화가 채웁니다
      qc.setQueryData<{ formats: VideoFormat[] }>(qk.favorites, (old) =>
        old ? { formats: next ? old.formats.map(flip) : old.formats.filter((f) => f.id !== formatId) } : old
      );
    },
    onError: () => {
      // 실패는 조용히 넘어가지 않습니다 — 서버 상태로 되돌립니다.
      qc.invalidateQueries({ queryKey: qk.favorites });
      qc.invalidateQueries({ queryKey: ['formats'] });
      qc.invalidateQueries({ queryKey: ['format'] });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.favorites }),
  });
}

// ── R06 질문형 ─────────────────────────────────────────
export function useQuizQuestions(projectId?: number) {
  return useQuery({
    queryKey: qk.quizQuestions(projectId ?? 0),
    queryFn: () => request<{ questions: QuizQuestion[] }>(API.quizQuestions(projectId!)),
    enabled: !!projectId,
    select: (d) => d.questions,
  });
}

/**
 * 질문 답변 제출.
 *
 * ⚠️ mutation 의 data 는 그 훅 인스턴스에만 남습니다.
 *    다른 화면에서 결과를 읽으려면 캐시에 넣어야 합니다.
 *    (QuizScreen 에서 제출 → QuizResultScreen 에서 표시)
 */
export function useSubmitQuiz(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { answers: QuizAnswer[]; freeText?: string }) =>
      request<{ recommendedFormat: RecommendedFormat }>(API.quizAnswers(projectId), {
        method: 'POST',
        body,
      }),
    onSuccess: (data) => {
      // 결과 화면이 읽을 수 있도록 캐시에 저장합니다.
      qc.setQueryData(qk.quizResult(projectId), data);
    },
  });
}

/** 제출된 추천 결과. 화면이 바뀌어도 남습니다. */
export function useQuizResult(projectId?: number) {
  return useQuery<{ recommendedFormat: RecommendedFormat }>({
    queryKey: qk.quizResult(projectId ?? 0),
    // 이 쿼리는 절대 스스로 요청하지 않습니다. useSubmitQuiz 가 넣어준 값만 읽습니다.
    queryFn: () => Promise.reject(new Error('제출 전')),
    enabled: false,
    retry: false,
  });
}

export function useQuizAlternatives(projectId: number) {
  return useMutation({
    mutationFn: (condition: string) =>
      request<{ alternatives: QuizAlternative[] }>(API.quizAlternatives(projectId), {
        method: 'POST',
        body: { condition },
      }),
  });
}

// ── R07 기획·콘티 ──────────────────────────────────────
export function useCreatePlan(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoFormatId: number) =>
      request<PlanResponse>(API.plan(projectId), { method: 'POST', body: { videoFormatId } }),
    onSuccess: (data) => {
      // 뒤로 갔다 와도 다시 생성하지 않도록 캐시에 남깁니다.
      qc.setQueryData(qk.plan(projectId), data);
      qc.invalidateQueries({ queryKey: qk.scenes(projectId) });
      qc.invalidateQueries({ queryKey: qk.tasks(projectId) });
    },
  });
}

/** 생성된 기획. 화면 재진입 시 재생성 없이 이걸 읽습니다. */
export function usePlan(projectId?: number) {
  return useQuery<PlanResponse>({
    queryKey: qk.plan(projectId ?? 0),
    queryFn: () => Promise.reject(new Error('생성 전')),
    enabled: false,
    retry: false,
  });
}

export function useScenes(projectId?: number) {
  return useQuery({
    queryKey: qk.scenes(projectId ?? 0),
    queryFn: () => request<{ scenes: StoryboardScene[] }>(API.scenes(projectId!)),
    enabled: !!projectId,
    select: (d) => d.scenes,
  });
}

/**
 * 콘티 수정 (명세 7.2 PATCH).
 *
 * body 는 바뀐 필드만 보냅니다: { scenes: [{ id, scene_dialogue }] }
 * 응답의 updated_count 로 실제 저장 건수를 확인할 수 있습니다.
 */
export function useUpdateScenes(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scenes: Partial<StoryboardScene>[]) =>
      request<{ message: string; updatedCount: number }>(API.scenes(projectId), {
        method: 'PATCH',
        body: { scenes },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.scenes(projectId) });
      // 기획 캐시도 낡았으므로 지웁니다. 안 지우면 옛 대사가 다시 보입니다.
      qc.removeQueries({ queryKey: qk.plan(projectId) });
    },
  });
}

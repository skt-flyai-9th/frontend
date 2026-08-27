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
  ShortsProject,
  ShootingSummary,
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

/*
  R06 질문형 훅 넷(useQuizQuestions·useSubmitQuiz·useQuizResult·useQuizAlternatives)은
  지웠습니다 (2026-08-26). 경로가 서버에서 폐기됐고 BE 가 확인해 줬습니다.
  화면 어디에서도 쓰지 않고 있었습니다 — 추천은 대화형 세션이 담당합니다.
*/

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
 * 촬영 요약만 따로 (명세 7.2 응답의 `shooting_summary`).
 *
 * 7.1 도 같은 값을 주지만 그건 **한 번 부르고 끝나는 mutation** 이라, 화면을 다시
 * 열면 사라집니다. 7.2 는 조회라 언제 열어도 남아 있습니다 — 그래서 표시는 이쪽을
 * 기본으로 씁니다 (`useScenes` 는 select 로 scenes 만 꺼내 이 값을 버립니다).
 *
 * ⚠️ `expectedDurationSec` 는 **찍는 데 걸리는 시간**입니다. 완성 영상 길이가 아닙니다.
 */
export function useShootingSummary(projectId?: number) {
  return useQuery({
    queryKey: [...qk.scenes(projectId ?? 0), 'summary'] as const,
    queryFn: () =>
      request<{ scenes: StoryboardScene[]; shootingSummary?: ShootingSummary }>(
        API.scenes(projectId!)
      ),
    enabled: !!projectId,
    select: (d) => d.shootingSummary ?? null,
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

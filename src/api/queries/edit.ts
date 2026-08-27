/** R14 편집 + R15 출력 + R16 게시 + R17 성과 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '../http';
import { API } from '../endpoints';
import { qk } from './keys';
import type {
  ComparisonItem,
  EditResult,
  EditStartResponse,
  Metric,
  OutputsResponse,
  PublishMode,
  ReviseBody,
  ReviseResponse,
  SnsConnection,
  SnsPlatform,
  PublishResponse,
  SnsPost,
  TargetPlatform,
} from '../schema/types';

export function useStartEdit(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetPlatform: TargetPlatform) =>
      request<EditStartResponse>(API.edit(projectId), {
        method: 'POST',
        body: { targetPlatform },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.editResult(projectId) }),
  });
}

/** 렌더 진행률. 완료되면 폴링이 자동으로 멈춥니다. */
export function useEditResult(projectId?: number, enabled = true) {
  return useQuery({
    queryKey: qk.editResult(projectId ?? 0),
    queryFn: () => request<EditResult>(API.editResult(projectId!)),
    enabled: !!projectId && enabled,
    /**
     * 진행 중일 때만 물어봅니다.
     *
     * 🔴 2026-08-27: 1초 고정이었습니다. 렌더가 **5~6분** 걸린다는 걸 실측하고 나니
     *    (실서버 345초) 1초 폴링은 한 번 편집에 **300~900번**을 묻는 셈입니다.
     *    가게에서 데이터로 쓰시는 분께 부담이고 서버에도 부담입니다.
     *
     * 그래서 **처음 15초만 1초**(막 걸었을 때 화면이 바로 반응해야 합니다),
     * 그 뒤로는 **5초**로 늦춥니다. 5~6분이면 70여 번입니다.
     *
     * 화면 밖(백그라운드)에서는 react-query 가 알아서 멈춥니다. 돌아오면
     * RenderScreen 이 즉시 다시 받아옵니다(AppState 'active').
     */
    refetchInterval: (q) => {
      const s = q.state.data?.renderStatus;
      if (s !== 'PENDING' && s !== 'PROCESSING') return false;
      // 받아온 횟수로 셉니다 — 처음 15번(≈15초)은 1초, 그 뒤는 5초
      return q.state.dataUpdateCount < 15 ? 1000 : 5000;
    },
  });
}

export function useRevise(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ outputId, ...body }: ReviseBody & { outputId: number }) =>
      request<ReviseResponse>(API.revise(outputId), { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.editResult(projectId) }),
  });
}

/**
 * 출력 파일 조회 (명세 15.1 GET).
 *
 * 명세 (2026-08-21 확정): GET 도 POST 와 동일한 필드 구성입니다.
 * publish_kit·resolution·cover_image_url 이 GET 에도 내려옵니다.
 *
 * 아래 병합은 그대로 둡니다 — 서버가 필드를 빠뜨려도 이미 받은 값을
 * 잃지 않기 위한 방어입니다. GET 이 온전하면 병합은 아무 일도 안 합니다.
 * (구 명세 시절엔 GET 에 publish_kit 이 없어 이 병합이 필수였습니다.)
 */
export function useOutputs(projectId?: number) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.outputs(projectId ?? 0),
    queryFn: async () => {
      const fresh = await request<OutputsResponse>(API.outputs(projectId!));
      const prev = qc.getQueryData<OutputsResponse>(qk.outputs(projectId ?? 0));
      return {
        ...fresh,
        // GET 이 안 주는 값은 이전 것을 유지합니다.
        publishKit: fresh.publishKit ?? prev?.publishKit,
        outputs: fresh.outputs.map((o) => {
          // GET 응답은 필드가 적습니다(resolution, cover_image_url 등이 없음).
          const before = prev?.outputs.find((x) => x.id === o.id);
          return { ...before, ...o };
        }),
      };
    },
    enabled: !!projectId,
  });
}

/**
 * 출력 파일 생성 (명세 15.1 POST).
 *
 * 이 응답에만 publish_kit 과 cover_image_url 이 있으므로
 * 반드시 캐시에 넣어 둡니다. 게시 화면이 이걸 읽습니다.
 */
export function useCreateOutputs(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetPlatforms: TargetPlatform[]) =>
      request<OutputsResponse>(API.outputs(projectId), {
        method: 'POST',
        body: { targetPlatforms },
      }),
    onSuccess: (data) => {
      // invalidate 하면 GET 이 덮어써서 publish_kit 이 날아갑니다.
      qc.setQueryData(qk.outputs(projectId), data);
    },
  });
}

/**
 * 명세 16.1 GET (2026-08-21 신설) — 연동 계정 목록.
 * 앱을 껐다 켜도 어떤 계정이 연결돼 있는지 서버에서 다시 받아옵니다.
 * 이전에는 화면 메모리에만 들고 있어 재시작하면 사라졌습니다.
 */
export function useSnsConnections() {
  return useQuery({
    queryKey: qk.snsConnections,
    queryFn: () => request<{ connections: SnsConnection[] }>(API.snsConnections()),
    select: (d) => d.connections,
  });
}

/**
 * 16.1 OAuth 시작 — A 방식 (2026-08-23 명세 개정).
 *
 * 🔴 종전 POST /sns-connections(앱이 oauth_code 를 넘기는 방식)는 **제거**됐습니다.
 *    앱에 App Secret 이 들어가지 않도록 서버가 OAuth 전 과정을 처리합니다.
 *
 * 앱이 하는 일은 두 가지뿐입니다.
 *   1) 이 훅으로 authorize_url 을 받아 브라우저로 엽니다.
 *   2) 브라우저에서 돌아오면 GET /sns-connections 를 다시 조회해 결과를 확인합니다.
 *      (토큰 교환·저장은 서버 몫이라 앱은 관여하지 않습니다)
 */
export function useSnsAuthorize() {
  return useMutation({
    mutationFn: (platform: SnsPlatform) =>
      request<{ authorizeUrl: string }>(API.snsAuthorize(platform)),
  });
}

export function usePublish() {
  return useMutation({
    mutationFn: ({
      outputId,
      ...body
    }: {
      outputId: number;
      platform: SnsPlatform;
      publishMode: PublishMode;
      snsConnectionId?: number;
      postCaption?: string;
      postHashtags?: string;
    }) => request<PublishResponse>(API.publish(outputId), { method: 'POST', body }),
  });
}

/** 명세 16.3 GET — 게시 상태 조회. PENDING_LINK 인지 확인합니다. */
export function useSnsPost(postId?: number) {
  return useQuery({
    queryKey: qk.snsPost(postId ?? 0),
    queryFn: () => request<SnsPost>(API.snsPost(postId!)),
    enabled: !!postId,
  });
}

/** 명세 16.1 DELETE — 연동 해제 */
export function useDisconnectSns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: number) =>
      request(API.snsConnection(connectionId), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.snsConnections }),
  });
}

/** 명세 16.3 — 사장님이 직접 올린 게시물을 연결합니다. */
export function useLinkPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, externalPostId }: { postId: number; externalPostId: string }) =>
      request<SnsPost>(API.snsPost(postId), {
        method: 'PATCH',
        body: { externalPostId, postedAt: new Date().toISOString() },
      }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: qk.snsPost(vars.postId) }),
  });
}

/**
 * 붙여넣은 주소에서 게시물 ID 를 뽑습니다.
 *
 * 명세 16.3 의 external_post_id 예시는 "17998877665544332" 로,
 * 전체 URL 이 아니라 게시물 식별자입니다.
 * 사장님은 공유 버튼으로 URL 을 복사하므로 여기서 변환해야 합니다.
 *
 *   https://www.instagram.com/reel/ABC123/       → ABC123
 *   https://youtube.com/shorts/xyz789            → xyz789
 *   https://youtu.be/xyz789                      → xyz789
 *
 * 형태를 모르면 입력값을 그대로 넘깁니다. 서버가 판단하게 둡니다.
 */
export function extractPostId(input: string): string {
  const v = input.trim();
  if (!v.startsWith('http')) return v;

  const m =
    v.match(/instagram\.com\/(?:p|reel|tv)\/([\w-]+)/) ||
    v.match(/youtube\.com\/shorts\/([\w-]+)/) ||
    v.match(/youtu\.be\/([\w-]+)/) ||
    v.match(/youtube\.com\/watch\?v=([\w-]+)/);

  return m ? m[1] : v;
}

/**
 * 성과 지표 조회 (명세 17.1).
 *
 * from·to 로 기간을 좁힐 수 있습니다.
 * 안 보내면 서버 기본값이라 "언제부터 언제까지" 인지 화면이 알 수 없습니다.
 * 사장님에게 "며칠간 몇 명이 봤다" 를 말하려면 기간이 명확해야 합니다.
 */
export function useMetrics(postId?: number, from?: string, to?: string) {
  return useQuery({
    queryKey: qk.metrics(postId ?? 0, from, to),
    queryFn: () => request<{ metrics: Metric[] }>(API.metrics(postId!, from, to)),
    enabled: !!postId,
    select: (d) => d.metrics,
  });
}

/** 오늘부터 N일 전까지의 기간을 명세 형식(YYYY-MM-DD)으로 만듭니다. */
export function periodRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export function useComparison(storeId?: number, platform?: string, goal?: string) {
  return useQuery({
    // 필터를 키에 넣지 않으면 인스타 결과와 유튜브 결과가 같은 캐시를 봅니다.
    queryKey: qk.compare(storeId ?? 0, platform, goal),
    queryFn: () => request<{ comparison: ComparisonItem[] }>(API.compare(storeId!, platform, goal)),
    enabled: !!storeId,
    select: (d) => d.comparison,
  });
}

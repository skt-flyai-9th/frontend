/** R02·R03 가게 탐색과 인텔리전스 */
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '../http';
import { API } from '../endpoints';
import { uploadImageFile } from '../upload';
import { qk } from './keys';
import type {
  CreateStoreBody,
  CreateStoreResponse,
  ImportStatusResponse,
  Insight,
  Menu,
  PlaceResult,
  Store,
  StorePhoto,
  StoreShort,
  TargetCustomer,
} from '../schema/types';

export function useStoreSearch(keyword: string) {
  return useQuery({
    queryKey: qk.storeSearch(keyword),
    queryFn: () => request<{ results: PlaceResult[] }>(API.storeSearch(keyword)),
    // 두 글자 미만이면 검색하지 않습니다. 서버와 사용자 모두에게 낭비입니다.
    enabled: keyword.trim().length >= 2,
    select: (d) => d.results,
  });
}

export function useCreateStore() {
  return useMutation({
    mutationFn: (body: CreateStoreBody) =>
      request<CreateStoreResponse>(API.createStore(), { method: 'POST', body }),
  });
}

/**
 * 가져오기 진행률 (명세 2.3).
 *
 * 두 가지를 함께 처리합니다.
 *
 * 1. 완료되면 가게·메뉴·사진·타깃을 다시 불러옵니다.
 *    가져오기가 끝났는데 화면이 옛날 값을 보여주면
 *    "완료"라고 떠 있는데 메뉴가 비어 있는 상황이 됩니다.
 *
 * 2. 폴링 상한을 둡니다.
 *    서버가 계속 IN_PROGRESS 만 주면 폴링이 영원히 돕니다.
 *    2분이 지나면 멈추고 화면이 다음으로 넘어갈 수 있게 합니다.
 */
export function useImportStatus(storeId?: number) {
  const qc = useQueryClient();
  const startedAt = useRef<number>(Date.now());
  const refreshed = useRef(false);

  useEffect(() => {
    startedAt.current = Date.now();
    refreshed.current = false;
  }, [storeId]);

  const query = useQuery({
    queryKey: qk.importStatus(storeId ?? 0),
    queryFn: () => request<ImportStatusResponse>(API.importStatus(storeId!)),
    enabled: !!storeId,
    refetchInterval: (q) => {
      const s = q.state.data?.overallStatus;
      const running = s === 'IN_PROGRESS' || s === 'PENDING';
      if (!running) return false;
      // 2분 상한
      if (Date.now() - startedAt.current > 120000) return false;
      return 1200;
    },
  });

  // 완료 시 한 번만 갱신합니다.
  useEffect(() => {
    const s = query.data?.overallStatus;
    if (!storeId || refreshed.current) return;
    if (s === 'SUCCESS' || s === 'FAILED') {
      refreshed.current = true;
      qc.invalidateQueries({ queryKey: qk.store(storeId) });
      qc.invalidateQueries({ queryKey: qk.menus(storeId) });
      qc.invalidateQueries({ queryKey: ['store', storeId, 'photos'] });
      qc.invalidateQueries({ queryKey: qk.targets(storeId) });
    }
  }, [query.data?.overallStatus, storeId, qc]);

  /** 상한을 넘겨 폴링이 멈췄는지. 화면에서 안내에 씁니다. */
  const timedOut =
    Date.now() - startedAt.current > 120000 &&
    (query.data?.overallStatus === 'IN_PROGRESS' || query.data?.overallStatus === 'PENDING');

  return { ...query, timedOut };
}

export function useStore(storeId?: number) {
  return useQuery({
    queryKey: qk.store(storeId ?? 0),
    queryFn: () => request<Store>(API.store(storeId!)),
    enabled: !!storeId,
  });
}

export function useUpdateStore(storeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Store>) =>
      request<Store>(API.store(storeId), { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.store(storeId) }),
  });
}

export function useMenus(storeId?: number) {
  return useQuery({
    queryKey: qk.menus(storeId ?? 0),
    queryFn: () => request<{ menus: Menu[] }>(API.menus(storeId!)),
    enabled: !!storeId,
    select: (d) => d.menus,
  });
}

export function useAddMenu(storeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Menu>) =>
      request<Menu>(API.menus(storeId), { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.menus(storeId) }),
  });
}

export function useUpdateMenu(storeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ menuId, ...body }: Partial<Menu> & { menuId: number }) =>
      request<Menu>(API.menu(storeId, menuId), { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.menus(storeId) }),
  });
}

export function useDeleteMenu(storeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (menuId: number) => request(API.menu(storeId, menuId), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.menus(storeId) }),
  });
}

/**
 * 메뉴 사진 올리기 — **두 걸음입니다.**
 *
 * 메뉴에는 사진을 직접 올리는 경로가 없습니다. `MenuUpdateRequest.image_url` 은
 * **문자열**이라 어딘가에 올린 뒤 그 주소를 넣어야 합니다. 그래서
 *
 *   ① `POST /stores/{id}/photos` (multipart, category "메뉴") → `file_url` 을 받고
 *   ② `PATCH /stores/{id}/menus/{menuId}` 의 `image_url` 에 그 주소를 넣습니다
 *
 * 두 번째가 실패하면 사진은 매장 사진첩에 남고 메뉴에는 안 붙습니다. 그때는
 * 화면이 실패를 말해야 합니다 — 조용히 넘어가면 올라간 줄 압니다.
 */
export function useUploadMenuPhoto(storeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ menuId, uri }: { menuId: number; uri: string }) => {
      // 전송 방법을 촬영본과 통일했습니다 — `api/upload.ts` 의 uploadImageFile 머리말
      const photo = await uploadImageFile<{ id: number; fileUrl: string }>({
        path: API.photos(storeId),
        uri,
        parameters: { category: '메뉴' },
      });
      return request<Menu>(API.menu(storeId, menuId), {
        method: 'PATCH',
        body: { imageUrl: photo.fileUrl },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.menus(storeId) }),
  });
}

export function usePhotos(storeId?: number, category?: string) {
  return useQuery({
    queryKey: qk.photos(storeId ?? 0, category),
    queryFn: () => request<{ photos: StorePhoto[] }>(API.photos(storeId!, category)),
    enabled: !!storeId,
    select: (d) => d.photos,
  });
}

/**
 * 가게 사진 업로드 (명세 3.3 POST multipart/form-data)
 *
 * 사진은 영상 소재로 쓰입니다. 간판·내부·음식 사진이 없으면
 * AI 가 만들 수 있는 장면이 크게 줄어듭니다.
 */
export function useAddPhoto(storeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, category }: { uri: string; category: string }) =>
      // 전송 방법을 촬영본과 통일했습니다 — `api/upload.ts` 의 uploadImageFile 머리말
      uploadImageFile<StorePhoto>({
        path: API.photos(storeId),
        uri,
        parameters: { category },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store', storeId, 'photos'] }),
  });
}

/**
 * 3.6 가게 로고 업로드 (2026-08-23 신설).
 *
 * 가게당 1장이라 다시 올리면 서버가 이전 파일을 교체·삭제합니다.
 * 성공 응답의 logo_url 을 3.1 캐시에 바로 반영해, 사장님이 저장 직후
 * 바뀐 사진을 보게 합니다. (CDN 지연 여부는 BE 확인 중)
 */
export function useUploadLogo(storeId: number) {
  const qc = useQueryClient();
  return useMutation({
    /*
      🔴 2026-08-27 — `fetch` + `FormData` 에서 **네이티브 업로드**로 바꿨습니다.

      실기기에서 프로필 사진이 계속 "연결이 끊겼습니다" 로 실패했습니다. 서버는 정상이고
      (직접 올리면 200 + logo_url), 30초짜리 촬영본은 같은 서버에 잘 올라갑니다 —
      **다른 건 전송 방법뿐이었습니다.** 영상이 쓰는 그 길(expo-file-system UploadTask)로
      통일합니다. 자세한 근거는 `api/upload.ts` 의 `uploadImageFile` 머리말.
    */
    mutationFn: (uri: string) =>
      uploadImageFile<{ storeId: number; logoUrl: string; updatedAt: string }>({
        path: API.storeLogo(storeId),
        uri,
      }),
    onSuccess: (res) => {
      qc.setQueryData<Store>(qk.store(storeId), (old) =>
        old ? { ...old, logoUrl: res.logoUrl } : old
      );
      qc.invalidateQueries({ queryKey: qk.store(storeId) });
    },
  });
}

/**
 * 15.2 완성 숏폼 목록 (2026-08-23 신설) — 마이페이지 3열 그리드.
 *
 * 렌더가 끝난 것만 옵니다. 제작 중인 프로젝트는 4.1 이 담당합니다.
 */
export function useStoreShorts(storeId?: number) {
  return useQuery({
    queryKey: qk.storeShorts(storeId ?? 0),
    queryFn: () =>
      request<{ items: StoreShort[]; page: number; size: number; total: number }>(
        API.storeShorts(storeId!, { page: 1, size: 30 })
      ),
    enabled: !!storeId,
  });
}

export function useDeletePhoto(storeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) => request(API.photo(storeId, photoId), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store', storeId, 'photos'] }),
  });
}

export function useTargetCustomers(storeId?: number) {
  return useQuery({
    queryKey: qk.targets(storeId ?? 0),
    queryFn: () => request<{ targetCustomers: TargetCustomer[] }>(API.targetCustomers(storeId!)),
    enabled: !!storeId,
    select: (d) => d.targetCustomers,
  });
}

/**
 * 명세 3.4 (2026-08-23): 목록 조회는 HIDDEN 타깃도 포함해 내려옵니다.
 * 화면에서 걸러내는 건 프론트 몫입니다.
 *
 * 타깃을 **보여주기만 하는** 화면(가게 정보, 타깃 선택 등)은 이 함수로 거릅니다.
 * 관리 화면(TargetManage)만 숨긴 항목을 따로 보여주고 되살릴 수 있습니다.
 * 술어를 여기 한 곳에 둔 이유: 화면마다 제각각 거르면 하나는 반드시 빠뜨립니다.
 */
export function visibleTargets(targets?: TargetCustomer[]): TargetCustomer[] | undefined {
  // undefined 를 그대로 돌려줍니다. 빈 배열로 바꾸면
  // 화면의 `isLoading && !targets` 로딩 판정이 조용히 죽습니다.
  return targets?.filter((t) => t.status !== 'HIDDEN');
}

export function useConfirmTarget(storeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ targetId, ...body }: { targetId: number } & Partial<TargetCustomer>) =>
      request(API.targetCustomer(storeId, targetId), { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.targets(storeId) }),
  });
}

export function useInsights(storeId?: number, type?: string) {
  return useQuery({
    queryKey: qk.insights(storeId ?? 0, type),
    queryFn: () => request<{ insights: Insight[] }>(API.insights(storeId!, type)),
    enabled: !!storeId,
    select: (d) => d.insights,
  });
}

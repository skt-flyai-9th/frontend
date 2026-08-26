/**
 * keys.ts — react-query 캐시 키.
 *
 * 키를 한 곳에 모으는 이유:
 *   무효화(invalidate)할 때 문자열을 손으로 적으면 오타가 나도 조용히 실패합니다.
 *   메뉴를 추가한 뒤 목록을 새로고침하려면 정확히 같은 키를 써야 합니다.
 */
export const qk = {
  onboarding: ['onboarding'] as const,

  store: (storeId: number) => ['store', storeId] as const,
  storeSearch: (keyword: string) => ['store', 'search', keyword] as const,
  importStatus: (storeId: number) => ['store', storeId, 'import'] as const,
  menus: (storeId: number) => ['store', storeId, 'menus'] as const,
  photos: (storeId: number, category?: string) =>
    ['store', storeId, 'photos', category ?? 'all'] as const,
  targets: (storeId: number) => ['store', storeId, 'targets'] as const,
  insights: (storeId: number, type?: string) =>
    ['store', storeId, 'insights', type ?? 'all'] as const,

  projects: (storeId: number, status?: string) =>
    ['projects', storeId, status ?? 'all'] as const,
  project: (projectId: number) => ['project', projectId] as const,
  draft: (projectId: number) => ['project', projectId, 'draft'] as const,

  formats: (filters: Record<string, unknown>) => ['formats', filters] as const,
  format: (formatId: number) => ['format', formatId] as const,

  plan: (projectId: number) => ['plan', projectId] as const,
  scenes: (projectId: number) => ['scenes', projectId] as const,

  tasks: (projectId: number) => ['tasks', projectId] as const,
  guide: (taskId: number) => ['guide', taskId] as const,
  evaluation: (taskId: number) => ['evaluation', taskId] as const,

  editResult: (projectId: number) => ['edit', projectId] as const,
  outputs: (projectId: number) => ['outputs', projectId] as const,

  snsPost: (postId: number) => ['snsPost', postId] as const,
  snsConnections: ['snsConnections'] as const,
  favorites: ['favorites'] as const,
  me: ['me'] as const,
  storeShorts: (storeId: number) => ['storeShorts', storeId] as const,
  metrics: (postId: number, from?: string, to?: string) =>
    ['metrics', postId, from ?? 'all', to ?? 'all'] as const,
  compare: (storeId: number, platform?: string, goal?: string) =>
    ['compare', storeId, platform ?? 'all', goal ?? 'all'] as const,
};

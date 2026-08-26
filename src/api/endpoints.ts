/**
 * endpoints.ts — `최종API명세서.md` 를 코드로 옮긴 단일 출처.
 *
 * 규칙
 *  - 화면 코드에 URL 문자열을 직접 쓰지 않습니다. 반드시 여기를 통합니다.
 *  - 명세의 항목 번호를 주석으로 남겨 문서와 상호 추적됩니다.
 *  - Base URL 은 여기 넣지 않습니다. http.ts 가 붙입니다.
 */

export const API = {
  // ── R01 계정·초기설정 ──────────────────────────────────
  onboarding: () => `/onboarding`,                                   // 1.1
  signup: () => `/auth/signup`,                                      // 1.2
  login: () => `/auth/login`,                                        // 1.3
  logout: () => `/auth/logout`,                                      // 1.4
  refresh: () => `/auth/refresh`,                                    // 1.4
  withdraw: () => `/users/me`,                                       // 1.4 DELETE
  /** 1.5 회원정보 조회/수정 (2026-08-23 신설). 수정 가능 필드는 name·phone·marketing_agreed 뿐입니다. */
  me: () => `/users/me`,                                             // 1.5 GET/PATCH

  // ── R02 가게 탐색·외부데이터 ────────────────────────────
  storeSearch: (keyword: string) =>
    `/stores/search?keyword=${encodeURIComponent(keyword)}`,         // 2.1
  createStore: () => `/stores`,                                      // 2.2
  importStatus: (storeId: number) => `/stores/${storeId}/import-status`, // 2.3

  // ── R03 가게 인텔리전스 ─────────────────────────────────
  store: (storeId: number) => `/stores/${storeId}`,                  // 3.1 GET/PATCH
  /** 3.6 가게 로고 업로드 (2026-08-23 신설). multipart. 가게당 1장이라 다시 올리면 교체됩니다. */
  storeLogo: (storeId: number) => `/stores/${storeId}/logo`,         // 3.6 POST
  /**
   * 15.2 완성 숏폼 목록 (2026-08-23 신설) — 마이페이지 그리드용.
   * 4.1 GET /shorts-projects 와 다릅니다: 4.1 은 제작 중 포함 "이어하기 목록",
   * 이건 렌더 끝난 것만 나오는 "결과물 갤러리" 입니다.
   */
  storeShorts: (storeId: number, query?: Record<string, string | number | undefined>) => {
    const q = query
      ? Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return `/stores/${storeId}/shorts${q ? `?${q}` : ''}`;          // 15.2 GET
  },
  menus: (storeId: number) => `/stores/${storeId}/menus`,            // 3.2 GET/POST
  menu: (storeId: number, menuId: number) =>
    `/stores/${storeId}/menus/${menuId}`,                            // 3.2 PATCH/DELETE
  photos: (storeId: number, category?: string) =>
    `/stores/${storeId}/photos${category ? `?category=${encodeURIComponent(category)}` : ''}`, // 3.3
  photo: (storeId: number, photoId: number) =>
    `/stores/${storeId}/photos/${photoId}`,                          // 3.3 DELETE
  targetCustomers: (storeId: number) =>
    `/stores/${storeId}/target-customers`,                           // 3.4 GET/POST
  targetCustomer: (storeId: number, targetId: number) =>
    `/stores/${storeId}/target-customers/${targetId}`,               // 3.4 PATCH
  insights: (storeId: number, type?: string) =>
    `/stores/${storeId}/insights${type ? `?type=${encodeURIComponent(type)}` : ''}`, // 3.5

  // ── R06 대화형 숏폼 Agent ──────────────────────────────
  createShortformSession: (storeId: number) =>
    `/stores/${storeId}/shortform-sessions`,
  shortformTurn: (sessionId: number) =>
    `/shortform-sessions/${sessionId}/turns`,
  nextShortformRecommendation: (sessionId: number) =>
    `/shortform-sessions/${sessionId}/recommendations/next`,
  acceptShortformRecommendation: (sessionId: number) =>
    `/shortform-sessions/${sessionId}/accept`,
  discardShortformSession: (sessionId: number) =>
    `/shortform-sessions/${sessionId}`,

  // ── R04 캠페인 설정 ─────────────────────────────────────
  projects: () => `/shorts-projects`,                                // 4.1 GET/POST
  projectList: (storeId: number, status?: string) =>
    `/shorts-projects?store_id=${storeId}${status ? `&status=${status}` : ''}`, // 4.1
  project: (projectId: number) => `/shorts-projects/${projectId}`,   // 4.2 PATCH / 4.3 GET

  // ── R05 숏폼 포맷 탐색 ──────────────────────────────────
  videoFormats: (query?: Record<string, string | number | boolean | undefined>) => {
    const q = Object.entries(query ?? {})
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    return `/video-formats${q ? `?${q}` : ''}`;                      // 5.1
  },
  videoFormat: (formatId: number) => `/video-formats/${formatId}`,   // 5.2
  /**
   * 5.3 찜 (2026-08-23 신설). 응답은 5.1 과 동일 구조입니다.
   * POST/DELETE 는 멱등 — 이미 찜한 걸 또 눌러도 200 입니다.
   * 찜은 가게가 아니라 **계정 단위**입니다.
   */
  favorites: () => `/video-formats/favorites`,
  favorite: (formatId: number) => `/video-formats/${formatId}/favorite`,

  /*
    R06 6.1·6.2·6.3(quiz-questions·quiz-answers·quiz-alternatives)은 **없앴습니다**
    (2026-08-26). R06 이 대화형 에이전트(`/shortform-sessions/…`)로 다시 설계되면서
    서버에서 사라졌고, BE 가 폐기를 확인해 명세에서도 지우기로 했습니다.
    추천은 아래 R06 대화형 경로로 받습니다.
  */

  // ── R07 포맷 분석·가게 맞춤화 ───────────────────────────
  plan: (projectId: number) => `/shorts-projects/${projectId}/plan`, // 7.1
  scenes: (projectId: number) => `/shorts-projects/${projectId}/scenes`, // 7.2 GET/PATCH

  // ── R08 촬영 태스크 엔진 ────────────────────────────────
  tasks: (projectId: number) => `/shorts-projects/${projectId}/tasks`, // 8.1
  task: (taskId: number) => `/tasks/${taskId}`,                      // 8.2 PATCH

  // ── R09~R12 촬영 ────────────────────────────────────────
  taskGuide: (taskId: number) => `/tasks/${taskId}/guide`,           // 9.1
  /**
   * 9.2 촬영본 업로드.
   * 명세 (2026-08-21 확정): MVP 는 단일 요청 업로드입니다.
   * `chunk_index`/`total_chunks` 는 명세에서 제거되었습니다 —
   * 현장에서 업로드 실패율이 높게 나오면 그때 청크 프로토콜을 설계합니다.
   */
  taskFootage: (taskId: number) => `/tasks/${taskId}/footage`,
  draft: (projectId: number) => `/shorts-projects/${projectId}/draft`, // 9.3 GET/PUT

  // ── R13 AI 촬영 평가 ────────────────────────────────────
  evaluate: (taskId: number) => `/tasks/${taskId}/evaluate`,         // 13.1
  evaluation: (taskId: number) => `/tasks/${taskId}/evaluation`,     // 13.2

  // ── R14 AI 자동편집 ─────────────────────────────────────
  edit: (projectId: number) => `/shorts-projects/${projectId}/edit`, // 14.1
  editResult: (projectId: number) =>
    `/shorts-projects/${projectId}/edit/result`,                     // 14.2
  revise: (outputId: number) => `/video-outputs/${outputId}/revise`, // 14.3

  // ── R15 최종 체크·출력 ──────────────────────────────────
  outputs: (projectId: number) => `/shorts-projects/${projectId}/outputs`, // 15.1

  // ── R16 SNS 연동·게시 ───────────────────────────────────
  snsConnections: () => `/sns-connections`,                          // 16.1 GET
  /**
   * 16.1 OAuth 시작 (2026-08-23 신설).
   * 🔴 POST /sns-connections 는 명세에서 제거됐습니다 — 앱에 App Secret 이
   *    들어가지 않도록 서버가 OAuth 전 과정을 처리하는 A 방식으로 바뀌었습니다.
   */
  snsAuthorize: (platform: string) =>
    `/sns-connections/authorize?platform=${encodeURIComponent(platform)}`,
  snsConnection: (connectionId: number) =>
    `/sns-connections/${connectionId}`,                              // 16.1 DELETE
  publish: (outputId: number) => `/video-outputs/${outputId}/publish`, // 16.2
  snsPost: (postId: number) => `/sns-posts/${postId}`,               // 16.3 GET/PATCH

  // ── R17 성과분석·학습 ───────────────────────────────────
  metrics: (postId: number, from?: string, to?: string) => {
    const q = from && to ? `?from=${from}&to=${to}` : '';
    return `/sns-posts/${postId}/metrics${q}`;                       // 17.1
  },
  compare: (storeId: number, platform?: string, goal?: string) => {
    const parts = [`store_id=${storeId}`];
    if (platform) parts.push(`platform=${platform}`);
    if (goal) parts.push(`goal=${encodeURIComponent(goal)}`);
    return `/sns-posts/compare?${parts.join('&')}`;                  // 17.2
  },
} as const;

/**
 * 명세 "공통 에러 응답 형식" 의 error_code → 사장님이 읽을 문구.
 *
 * 서버 message 를 그대로 보여주지 않는 이유:
 *   서버 문구는 개발자 기준이라 사장님에게 어려울 수 있습니다.
 *   화면에는 이 표의 문구를 쓰고, 서버 message 는 로그로만 남깁니다.
 */
export const ERROR_TEXT: Record<string, string> = {
  // 계정
  INVALID_CREDENTIALS: '아이디 또는 비밀번호가 맞지 않습니다.',
  EMAIL_ALREADY_EXISTS: '이미 가입된 이메일입니다.',
  TOKEN_EXPIRED: '로그인이 만료됐습니다. 다시 로그인해 주세요.',
  UNAUTHORIZED: '로그인이 필요합니다.',
  // 2026-08-26 실서버 확인: 토큰 없이 보호 자원을 부르면 이 코드가 옵니다.
  AUTHENTICATION_REQUIRED: '로그인이 필요합니다.',
  TERMS_NOT_AGREED: '필수 항목에 동의해야 계속할 수 있습니다.',

  // 가게
  STORE_NOT_FOUND: '가게 정보를 찾을 수 없습니다.',
  DUPLICATE_STORE: '이미 등록된 가게입니다.',
  SEARCH_PROVIDER_ERROR: '검색 서버에서 응답이 없습니다. 직접 입력으로 등록할 수 있습니다.',
  IMPORT_FAILED: '가게 정보를 일부 가져오지 못했습니다.',
  MENU_REQUIRED: '대표 메뉴를 최소 1개 등록해 주세요.',

  // 프로젝트·촬영
  PROJECT_NOT_FOUND: '만들던 영상을 찾을 수 없습니다.',
  TASK_NOT_FOUND: '촬영 항목을 찾을 수 없습니다.',
  FILE_TOO_LARGE: '영상이 너무 큽니다. 더 짧게 찍어 주세요.',
  UNSUPPORTED_MEDIA: '지원하지 않는 파일 형식입니다.',
  UPLOAD_FAILED: '업로드에 실패했습니다. 신호가 좋을 때 다시 시도해 주세요.',
  MATERIAL_INCOMPLETE: '아직 안 찍은 촬영이 있습니다.',
  TASKS_INCOMPLETE: '아직 안 찍은 장면이 있습니다.',

  // 편집·출력
  RENDER_ALREADY_RUNNING: '이미 영상을 만들고 있습니다.',
  RENDER_FAILED: '영상을 만들지 못했습니다. 촬영본은 그대로 있습니다.',
  OUTPUT_NOT_READY: '영상이 아직 준비되지 않았습니다.',

  // 게시·성과
  SNS_NOT_CONNECTED: 'SNS 계정을 먼저 연결해 주세요.',
  // 명세 16.2 (2026-08-26): DIRECT 게시는 플랫폼 검수 전이라 아직 닫혀 있습니다.
  // 화면에서 DIRECT 를 노출하지 않으므로 정상 흐름에서는 나오지 않아야 합니다.
  DIRECT_PUBLISH_UNAVAILABLE: '지금은 앱이 대신 올릴 수 없습니다. 직접 올리기로 진행해 주세요.',
  REAUTH_REQUIRED: '계정 연결이 만료됐습니다. 다시 연결해 주세요.',
  INVALID_POST_URL: '게시물 주소를 다시 확인해 주세요.',
  INSUFFICIENT_DATA: '아직 판단할 만한 자료가 모이지 않았습니다.',

  // 공통
  VALIDATION_ERROR: '입력값을 확인해 주세요.',
  // 2026-08-26 실서버 확인: 없는 경로·없는 자원 모두 이 코드로 옵니다.
  NOT_FOUND: '요청하신 정보를 찾을 수 없습니다.',
  RATE_LIMITED: '요청이 많습니다. 잠시 후 다시 시도해 주세요.',
  NETWORK_ERROR: '연결이 끊겼습니다. 신호를 확인해 주세요.',
  UNKNOWN: '잠시 후 다시 시도해 주세요.',
};

export function errorText(code?: string): string {
  return (code && ERROR_TEXT[code]) || ERROR_TEXT.UNKNOWN;
}

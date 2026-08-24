/**
 * http.ts — 서버 통신 단일 창구.
 *
 * 담당하는 것
 *   1. Base URL 붙이기
 *   2. Authorization 헤더 (명세 공통사항)
 *   3. snake_case ↔ camelCase 변환 (schema/convert)
 *   4. error_code → 사장님용 문구
 *   5. accessToken 만료 시 자동 refresh 후 1회 재시도
 *   6. 도메인별 Mock 스위치
 *
 * 화면 코드는 이 파일만 통해서 서버와 이야기합니다.
 */
import Constants from 'expo-constants';
import { API, errorText } from './endpoints';
import { toCamel, toSnake } from './schema/convert';
import { mockRequest } from './mock/server';
import { getTokens, saveTokens, clearTokens } from '../lib/session';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  mockDomains?: string[];
};

/**
 * 서버 주소.
 *
 * 🔴 2026-08-26 — 빌드한 앱에서 로그인이 안 되던 원인
 *   예전에는 app.json 의 extra.apiBaseUrl 하나만 봤습니다. 그런데 그 값은
 *   **번들에 박히지 않고** 실행 시 expo-constants 가 매니페스트에서 읽어옵니다.
 *   릴리스 빌드에서 Constants.expoConfig 가 비면 조용히 localhost 로 떨어져
 *   모든 요청이 실패합니다 — 화면에는 그냥 "로그인이 안 된다" 로만 보입니다.
 *   (실측: expo export 한 번들에 'sarils.p-e.kr' 문자열이 없습니다)
 *
 *   그래서 EXPO_PUBLIC_ 환경변수를 **먼저** 봅니다. 이 값은 Metro 가 번들에
 *   그대로 박아 넣으므로 런타임 매니페스트와 무관하게 항상 살아 있습니다.
 *   값은 eas.json 의 각 빌드 프로필 env 에 있습니다.
 *
 *   app.json 은 로컬 개발(expo start)용 폴백으로 남깁니다.
 */
const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export const BASE_URL = ENV_BASE_URL || extra.apiBaseUrl || 'http://localhost:8080';

/** 어느 경로로 주소를 얻었는지. 진단용입니다. */
export const BASE_URL_SOURCE = ENV_BASE_URL
  ? 'env(EXPO_PUBLIC_API_BASE_URL)'
  : extra.apiBaseUrl
    ? 'app.json(extra.apiBaseUrl)'
    : 'fallback(localhost)';

if (BASE_URL_SOURCE === 'fallback(localhost)') {
  // 조용히 넘어가면 "로그인이 안 된다" 로만 보입니다. 로그에는 반드시 남깁니다.
  console.warn(
    '[api] 서버 주소를 찾지 못해 localhost 로 떨어졌습니다. ' +
      'eas.json 의 env.EXPO_PUBLIC_API_BASE_URL 또는 app.json 의 extra.apiBaseUrl 을 확인하세요.'
  );
}

/**
 * 전부 Mock 으로 돌리는 스위치 (디자인 QA 캡처용).
 *
 * 시안과 실제 화면을 나란히 비교하려면 화면에 **내용이 채워져 있어야** 합니다.
 * 실서버는 지금 포맷·메뉴·타깃이 전부 0건이라, 그대로 캡처하면 빈 화면만 남아
 * 레이아웃을 비교할 수 없습니다.
 *
 * ⚠️ 기본값은 꺼짐입니다. app.json 은 건드리지 않고 환경변수로만 켭니다.
 *    EXPO_PUBLIC_FORCE_MOCK=1 expo export --platform web
 */
const FORCE_MOCK = process.env.EXPO_PUBLIC_FORCE_MOCK === '1';

/**
 * 어떤 도메인을 Mock 으로 돌릴지.
 *
 * BE 가 한 번에 완성되지 않으므로 전부/전무가 아니라 도메인 단위로 끕니다.
 * "가게 API 됐어요" 하면 app.json 에서 'store' 만 빼면 됩니다.
 */
export type Domain =
  | 'auth'
  | 'store'
  | 'project'
  | 'format'
  | 'quiz'
  | 'plan'
  | 'shoot'
  | 'edit'
  | 'publish'
  | 'analytics';

const ALL_DOMAINS: Domain[] = [
  'auth', 'store', 'project', 'format', 'quiz',
  'plan', 'shoot', 'edit', 'publish', 'analytics',
];

const mockDomains = new Set<Domain>(
  (extra.mockDomains as Domain[] | undefined) ?? ALL_DOMAINS
);

/** 경로를 보고 어느 도메인인지 판별합니다. */
export function domainOf(path: string): Domain {
  if (path.startsWith('/auth') || path.startsWith('/users') || path.startsWith('/onboarding')) return 'auth';
  if (path.startsWith('/stores')) return 'store';
  if (path.includes('/quiz-')) return 'quiz';
  if (path.includes('/plan') || path.includes('/scenes')) return 'plan';
  if (path.startsWith('/video-formats')) return 'format';
  if (path.startsWith('/tasks') || path.includes('/tasks') || path.includes('/draft')) return 'shoot';
  // publish 를 edit 보다 먼저 봅니다.
  // /video-outputs/{id}/publish 는 video-outputs 로 시작하지만 게시 도메인입니다.
  if (path.startsWith('/sns-connections') || path.includes('/publish')) return 'publish';
  if (path.includes('/edit') || path.startsWith('/video-outputs')) return 'edit';
  if (path.startsWith('/sns-posts')) return 'analytics';
  if (path.startsWith('/shorts-projects')) return 'project';
  return 'project';
}

/**
 * 실서버에 **아직 구현되지 않은** 엔드포인트.
 *
 * 2026-08-26 https://sarils.p-e.kr/openapi.json 실측 결과, 명세에는 있지만
 * 서버에는 없는 경로가 다섯 개입니다. 그대로 부르면 404 라서 화면이 죽습니다.
 *
 *   R06 질문형 : /quiz-questions · /quiz-answers · /quiz-alternatives
 *   R13 AI평가 : /tasks/{id}/evaluate · /tasks/{id}/evaluation
 *
 * 도메인 스위치(mockDomains)로는 이걸 정확히 못 가릅니다 — 평가는 'shoot' 도메인인데
 * 같은 도메인의 태스크·촬영본 업로드는 서버에 **있기 때문**입니다. 도메인째 mock 으로
 * 돌리면 실제 업로드까지 가짜가 됩니다. 그래서 경로 단위로 따로 둡니다.
 *
 * ⚠️ 서버에 생기면 여기서 그 줄만 지우면 됩니다. 다른 곳은 손댈 필요가 없습니다.
 */
const SERVER_MISSING_SUFFIXES = [
  '/quiz-questions',
  '/quiz-answers',
  '/quiz-alternatives',
  '/evaluate',
  '/evaluation',
];

/** 서버에 없는 경로인지. 쿼리스트링을 떼고 끝부분으로 판별합니다. */
export function isServerMissing(path: string): boolean {
  const clean = path.split('?')[0];
  return SERVER_MISSING_SUFFIXES.some((suffix) => clean.endsWith(suffix));
}

export function isMocked(path: string): boolean {
  if (FORCE_MOCK) return true;
  return mockDomains.has(domainOf(path)) || isServerMissing(path);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    /** 서버가 준 원문. 로그용이며 화면에 그대로 쓰지 않습니다. */
    public serverMessage?: string,
    /**
     * error_code·message 외에 서버가 함께 준 값.
     *
     * 예: 명세 14.1 의 TASKS_INCOMPLETE 는 어떤 태스크가 비어 있는지
     *     incomplete_tasks 로 알려줍니다. 이걸 버리면 화면이
     *     "뭔가 안 됐다" 밖에 말할 수 없습니다.
     *
     * camelCase 로 변환된 상태입니다.
     */
    public detail?: Record<string, unknown>
  ) {
    super(errorText(code));
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** multipart 업로드용. 지정하면 body 를 그대로 보냅니다. */
  formData?: FormData;
  signal?: AbortSignal;
  /** 인증 헤더를 붙이지 않습니다(로그인·회원가입) */
  anonymous?: boolean;
}

/** refresh 가 동시에 여러 번 돌지 않게 하나로 묶습니다. */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const tokens = await getTokens();
    if (!tokens?.refreshToken) return null;

    try {
      const res = await fetch(`${BASE_URL}${API.refresh()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSnake({ refreshToken: tokens.refreshToken })),
      });
      if (!res.ok) return null;

      const json = toCamel<{ accessToken: string; expiresIn: number }>(await res.json());
      await saveTokens({ ...tokens, accessToken: json.accessToken });
      return json.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function rawRequest<T>(
  path: string,
  options: RequestOptions,
  accessToken: string | null
): Promise<T> {
  const { method = 'GET', body, formData, signal, anonymous } = options;

  const headers: Record<string, string> = {};
  if (!formData) headers['Content-Type'] = 'application/json';
  if (!anonymous && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: formData ?? (body ? JSON.stringify(toSnake(body)) : undefined),
      signal,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR');
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 명세 공통 에러 형식: { error_code, message }
    // 그 외 필드는 detail 로 넘겨 화면이 쓸 수 있게 합니다.
    const { error_code, message, ...rest } = json ?? {};

    /**
     * FastAPI 검증 오류(422)만 형식이 다릅니다: { detail: [ {loc, msg, type}, ... ] }
     * error_code 가 없어 그대로 두면 전부 '잠시 후 다시 시도해 주세요' 로 뭉개집니다.
     * 사장님 화면 문구는 VALIDATION_ERROR 로 통일하되, **어느 필드가 틀렸는지는
     * 로그에 남깁니다** — 이게 없으면 enum 하나 어긋났을 때 원인을 못 찾습니다.
     * (2026-08-26 실서버 확인: 업무 오류는 error_code 로 오고, 422 만 이 모양입니다)
     */
    if (!error_code && Array.isArray((json as { detail?: unknown })?.detail)) {
      const where = JSON.stringify((json as { detail: unknown }).detail).slice(0, 300);
      console.warn(`[api] 422 ${method} ${path} — ${where}`);
      throw new ApiError(res.status, 'VALIDATION_ERROR', where);
    }
    throw new ApiError(
      res.status,
      error_code ?? 'UNKNOWN',
      message,
      Object.keys(rest).length > 0 ? toCamel<Record<string, unknown>>(rest) : undefined
    );
  }

  return toCamel<T>(json);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (isMocked(path)) {
    // ⚠️ Mock 응답도 반드시 toCamel 을 거쳐야 합니다.
    //    fixtures 는 명세 그대로 snake_case 라서, 변환을 빼먹으면
    //    화면이 찾는 onboardingSteps 가 undefined 가 되어 로딩이 끝나지 않습니다.
    //    실서버 경로(rawRequest)와 똑같은 모양이 나와야 Mock 검증이 의미를 가집니다.
    const raw = await mockRequest<unknown>(path, options.method ?? 'GET', options.body);
    return toCamel<T>(raw);
  }

  const tokens = await getTokens();
  try {
    return await rawRequest<T>(path, options, tokens?.accessToken ?? null);
  } catch (e) {
    // 토큰 만료면 한 번만 갱신 후 재시도합니다.
    const expired =
      e instanceof ApiError &&
      (e.code === 'TOKEN_EXPIRED' || e.status === 401) &&
      !options.anonymous;

    if (!expired) throw e;

    const fresh = await refreshAccessToken();
    if (!fresh) {
      await clearTokens();
      throw new ApiError(401, 'UNAUTHORIZED');
    }
    return rawRequest<T>(path, options, fresh);
  }
}

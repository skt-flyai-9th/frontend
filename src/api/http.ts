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

export const BASE_URL = extra.apiBaseUrl ?? 'http://localhost:8080';

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

export function isMocked(path: string): boolean {
  return mockDomains.has(domainOf(path));
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

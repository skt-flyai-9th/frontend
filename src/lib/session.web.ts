/**
 * session.web.ts — **디자인 QA 전용 웹 대체본**
 *
 * expo-secure-store 는 웹 지원이 없습니다. 원본 session.ts 를 그대로 두면
 * 브라우저에서 앱이 뜨지 않아 화면 캡처를 할 수 없습니다.
 *
 * ⚠️ Metro 는 웹 번들에서만 이 파일을 고릅니다. 네이티브는 원본을 씁니다.
 *
 * ⚠️ 여기서는 토큰을 localStorage 에 둡니다. 평문이라 **실제 배포에 쓰면 안 되는**
 *    방식이고, 그래서 웹 전용으로만 존재합니다. 웹 빌드는 QA 캡처용이지
 *    사장님에게 배포하는 물건이 아닙니다.
 */

const KEY = 'reals.session';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

let cache: Tokens | null | undefined;

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export async function getTokens(): Promise<Tokens | null> {
  if (cache !== undefined) return cache;
  try {
    const raw = store()?.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    cache = null;
  }
  return cache;
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  cache = tokens;
  try {
    store()?.setItem(KEY, JSON.stringify(tokens));
  } catch (e) {
    console.warn('[session:web] 토큰 저장 실패', e);
  }
}

export async function clearTokens(): Promise<void> {
  cache = null;
  try {
    store()?.removeItem(KEY);
  } catch {
    // 이미 없으면 무시
  }
}

export function hasTokensSync(): boolean {
  return Boolean(cache?.accessToken);
}

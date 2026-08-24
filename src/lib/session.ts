/**
 * session.ts — 토큰 보관.
 *
 * accessToken / refreshToken 은 expo-secure-store 에 넣습니다.
 * AsyncStorage 는 평문이라 기기를 뜯으면 읽힙니다.
 */
import * as SecureStore from 'expo-secure-store';

const KEY = 'reals.session';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

/** 매 요청마다 SecureStore 를 읽으면 느려서 메모리에 캐시합니다. */
let cache: Tokens | null | undefined;

export async function getTokens(): Promise<Tokens | null> {
  if (cache !== undefined) return cache;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    cache = raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    cache = null;
  }
  return cache;
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  cache = tokens;
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
  } catch (e) {
    console.warn('[session] 토큰 저장 실패', e);
  }
}

export async function clearTokens(): Promise<void> {
  cache = null;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // 이미 없으면 무시
  }
}

export function hasTokensSync(): boolean {
  return Boolean(cache?.accessToken);
}

/** R01 계정·초기설정 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '../http';
import { API } from '../endpoints';
import { qk } from './keys';
import { saveTokens, clearTokens } from '../../lib/session';
import type { LoginResponse, Me, OnboardingResponse, SignupBody, User } from '../schema/types';

export function useOnboarding() {
  return useQuery({
    queryKey: qk.onboarding,
    queryFn: () => request<OnboardingResponse>(API.onboarding(), { anonymous: true }),
    // 온보딩 문구는 자주 안 바뀝니다.
    staleTime: 1000 * 60 * 60,
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: (body: SignupBody) =>
      request<User>(API.signup(), { method: 'POST', body, anonymous: true }),
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const res = await request<LoginResponse>(API.login(), {
        method: 'POST',
        body,
        anonymous: true,
      });
      await saveTokens({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        expiresIn: res.expiresIn,
      });
      return res;
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      // 서버 호출이 실패해도 로컬 토큰은 반드시 지웁니다.
      //
      // 명세 1.4 (2026-08-21): `all_devices` 는 제거되었습니다.
      // 서버는 무상태(stateless)라 토큰을 폐기하지 못하므로,
      // 실제 로그아웃은 아래 clearTokens() 가 완료합니다. 서버 호출은 통보용입니다.
      try {
        await request(API.logout(), { method: 'POST' });
      } finally {
        await clearTokens();
      }
    },
  });
}

/**
 * 1.5 회원정보 조회 (2026-08-23 신설).
 * 프로필 수정 화면에서 사장님 이름·전화번호를 채우는 데 씁니다.
 */
export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => request<Me>(API.me()),
  });
}

/**
 * 1.5 회원정보 수정.
 *
 * ⚠️ 수정 가능한 필드는 name·phone·marketing_agreed 셋뿐입니다(명세).
 *    email 은 로그인 식별자라 바꿀 수 없고, 비밀번호 변경은 현재 범위 밖입니다.
 *    PATCH 라 보낸 필드만 반영되고, 응답에도 바꾼 필드만 옵니다.
 *
 * 가게 정보(상호·카테고리)를 고치는 건 3.1 PATCH /stores 입니다. 다른 API 입니다.
 */
export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; phone?: string; marketingAgreed?: boolean }) =>
      request<Partial<Me>>(API.me(), { method: 'PATCH', body }),
    onSuccess: (res) => {
      // 응답에는 바꾼 필드만 오므로 기존 값 위에 덮어씁니다.
      qc.setQueryData<Me>(qk.me, (old) => (old ? { ...old, ...res } : old));
      qc.invalidateQueries({ queryKey: qk.me });
    },
  });
}

export function useWithdraw() {
  return useMutation({
    mutationFn: async (reason: string) => {
      await request(API.withdraw(), { method: 'DELETE', body: { reason } });
      await clearTokens();
    },
  });
}

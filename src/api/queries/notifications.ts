/**
 * notifications.ts — 알림 목록.
 *
 * ⚠️ **명세에 알림 API 가 없습니다** (1.x~17.x 어디에도 없음).
 *    그래서 실서버에 붙는 경로가 아니라 mock 픽스처에서만 값이 옵니다.
 *    실서버 모드에서는 빈 목록이 되고 화면은 시안의 빈 상태 분기를 그대로 씁니다.
 *
 * 지어낸 숫자를 사장님에게 보여주지 않기 위한 구분입니다 —
 * 데모·디자인 대조에서는 시안과 같은 3건이 보이고, 실제 사용에서는 아무것도
 * 없다고 정직하게 말합니다.
 *
 * BE 가 알림 API 를 만들면 이 파일의 queryFn 만 request(...) 로 바꾸면 됩니다.
 * 화면(NotificationsScreen)은 손댈 필요가 없습니다.
 */
import { useQuery } from '@tanstack/react-query';
import { isMocked } from '../http';
import * as fx from '../mock/fixtures';

/** 시안 NOTICES 항목 구조 그대로입니다. */
export interface Notice {
  id: string;
  /** 시안 icon 문자열. 화면에서 lucide 컴포넌트로 바꿉니다. */
  icon: 'trending-up' | 'sparkles' | 'circle-check';
  tone: 'brand' | 'verified';
  title: string;
  body: string;
  /** "2시간 전" 같은 상대 시각. 서버가 생기면 ISO 를 받아 변환합니다. */
  time: string;
  unread?: boolean;
}

export function useNotifications() {
  return useQuery<Notice[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      // 경로가 없으므로 도메인 스위치가 아니라 mock 여부로 직접 가릅니다.
      if (!isMocked('/notifications')) return [];
      return fx.notices as Notice[];
    },
    staleTime: 1000 * 60,
  });
}

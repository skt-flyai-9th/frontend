/**
 * navRef.ts — 화면 밖에서 내비게이션을 잡기 위한 참조.
 *
 * 쓰임은 하나입니다: **디자인 QA 캡처**.
 * 시안과 실제 화면을 나란히 비교하려면 50개 화면을 하나씩 열어 찍어야 하는데,
 * 사람이 눌러서 들어가려면 로그인·가게등록·촬영을 매번 다시 해야 합니다.
 * 시안 프로토타입도 같은 이유로 `window.__realsNav` 를 열어 뒀습니다
 * ("리뷰용: 콘솔에서 __realsNav('export') 로 어느 화면이든 바로 열기").
 *
 * ⚠️ 전역에 노출하는 건 **EXPO_PUBLIC_QA_NAV=1 일 때뿐**입니다.
 *    기본값은 꺼짐이라 배포 빌드에는 아무것도 실리지 않습니다.
 */
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navRef = createNavigationContainerRef<RootStackParamList>();

/** 캡처 스크립트가 부르는 함수. 라우트 이름과 params 를 그대로 넘깁니다. */
export function exposeQaNav(): void {
  if (process.env.EXPO_PUBLIC_QA_NAV !== '1') return;
  const g = globalThis as unknown as Record<string, unknown>;
  g.__realsNav = (name: string, params?: object) => {
    if (!navRef.isReady()) return false;
    // 런타임에 이름을 받아 넘기므로 리터럴 유니온 검사를 통과시킬 수 없습니다.
    (navRef.navigate as (n: string, p?: object) => void)(name, params);
    return true;
  };
  g.__realsReset = (name: string, params?: object) => {
    if (!navRef.isReady()) return false;
    navRef.reset({ index: 0, routes: [{ name: name as never, params: params as never }] });
    return true;
  };
}

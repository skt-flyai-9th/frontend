/**
 * fonts.ts — Pretendard 로딩.
 *
 * Pretendard 는 OFL 라이선스라 상업적 사용이 가능합니다
 * (기능명세 S07.2.2 / S14.4.1 "상업 이용 가능한 폰트만 사용한다" 규칙 충족).
 *
 * ⚠️ 반드시 알아야 할 것
 *   Metro 번들러는 require() 경로를 정적으로 스캔합니다.
 *   assets/fonts/ 에 파일이 하나라도 없으면 **빌드 자체가 실패**합니다. try/catch 로 못 막습니다.
 *   그래서 현재 저장소에는 자리표시용 빈 파일이 들어 있습니다.
 *
 * 실제 폰트를 넣는 법:
 *   1. https://github.com/orioncactus/pretendard 에서 otf 를 받습니다
 *   2. assets/fonts/ 의 같은 이름 파일을 덮어씁니다
 *   3. 아래 USE_CUSTOM_FONTS 를 true 로 바꿉니다
 *
 * false 인 동안에는 시스템 폰트(안드로이드 Roboto / iOS SF)로 동작합니다.
 * 한글은 두 OS 모두 기본 폰트가 충분히 읽히므로 개발과 데모에는 문제없습니다.
 */
import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

/**
 * ✅ 2026-08-24 디자인 1차수정: 실제 Pretendard OTF 4종을 assets/fonts 에
 *    넣었습니다 (디자인 패키지에서 이식, OFL 라이선스 파일 동봉).
 *    이제 전 화면이 Pretendard 로 렌더링됩니다.
 */
export const USE_CUSTOM_FONTS = true;

const FONT_MAP = {
  'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
  'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
  'Pretendard-SemiBold': require('../../assets/fonts/Pretendard-SemiBold.otf'),
  'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
  'Pretendard-Black': require('../../assets/fonts/Pretendard-Black.otf'),
};

export function useAppFonts() {
  const [ready, setReady] = useState(!USE_CUSTOM_FONTS);

  useEffect(() => {
    if (!USE_CUSTOM_FONTS) return;

    let cancelled = false;
    (async () => {
      try {
        await Font.loadAsync(FONT_MAP);
      } catch (e) {
        console.warn('[fonts] Pretendard 로드 실패, 시스템 폰트로 진행합니다.', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

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

/**
 * 실제로 등록하는 4종.
 *
 * 🔴 Pretendard-Black 은 **일부러 뺐습니다** (2026-08-25).
 *    assets/fonts/Pretendard-Black.otf 는 진짜 폰트가 아니라 "OTTO" 매직바이트만 든
 *    72바이트 자리표시 파일입니다. 이걸 목록에 두면 loadAsync 가 거부되고,
 *    Promise.all 로 묶여 있어 **정상인 4종까지 함께 실패**합니다. 즉 지금까지
 *    Black 하나 때문에 Pretendard 전체가 시스템 폰트로 떨어질 수 있었습니다.
 *    시안 타이포는 900 굵기를 쓰지 않으므로(전체 26화면에서 font-black 1회, 그것도
 *    글리프 흉내) 목록에서 빼는 것이 맞습니다. 진짜 Black OTF 를 넣게 되면
 *    파일을 덮어쓰고 이 목록에 한 줄만 되살리면 됩니다.
 */
const FONT_MAP = {
  'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
  'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
  'Pretendard-SemiBold': require('../../assets/fonts/Pretendard-SemiBold.otf'),
  'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
};

export function useAppFonts() {
  const [ready, setReady] = useState(!USE_CUSTOM_FONTS);

  useEffect(() => {
    if (!USE_CUSTOM_FONTS) return;

    let cancelled = false;
    (async () => {
      /**
       * 한 벌씩 따로 등록합니다.
       *
       * Font.loadAsync(map) 은 내부적으로 Promise.all 이라 한 벌이라도 실패하면
       * 전부 실패합니다. 굵기 하나가 깨졌다고 앱 전체 글꼴이 무너지면 안 됩니다.
       * 개별 등록이면 나머지는 정상으로 남고, 실패한 굵기만 시스템 폰트로 떨어집니다.
       */
      await Promise.all(
        Object.entries(FONT_MAP).map(([name, src]) =>
          Font.loadAsync({ [name]: src }).catch((e) => {
            console.warn(`[fonts] ${name} 로드 실패 — 이 굵기만 시스템 폰트로 대체됩니다.`, e);
          })
        )
      );
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

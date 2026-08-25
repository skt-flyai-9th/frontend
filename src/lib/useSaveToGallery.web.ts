/**
 * useSaveToGallery.web.ts — **디자인 QA 전용 웹 대체본**
 *
 * 왜 있나
 *   시안과 실제 화면을 나란히 놓고 비교하려면 앱을 브라우저에 띄워 캡처해야 합니다.
 *   그런데 expo-media-library 는 웹 지원이 없어서, 불러오는 순간
 *   "Cannot find native module 'ExpoMediaLibraryNext'" 로 앱 전체가 멈춥니다.
 *
 * ⚠️ Metro 는 웹 번들에서만 `.web.ts` 를 고릅니다.
 *    안드로이드·iOS 는 원본 useSaveToGallery.ts 를 그대로 씁니다 — 영향 없습니다.
 *
 * 사진첩 저장은 브라우저에 없는 개념이라 동작을 흉내 내지 않습니다.
 * 화면 레이아웃만 원본과 똑같이 나오면 목적을 다합니다.
 */
import { useCallback, useState } from 'react';

type State = { saving: boolean; saved: boolean };

export function useSaveToGallery(): State & {
  save: (videoUrl?: string | null, fileKey?: string | number) => Promise<void>;
} {
  const [saving] = useState(false);
  const [saved] = useState(false);

  const save = useCallback(async () => {
    console.warn('[saveToGallery] 웹에서는 사진첩 저장을 지원하지 않습니다 (QA 캡처용 대체본)');
  }, []);

  return { saving, saved, save };
}

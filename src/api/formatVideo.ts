/**
 * 포맷의 영상 주소를 **쓰임새대로** 골라 줍니다.
 *
 * 포맷 하나에 영상 주소가 두 개입니다 (2026-08-26 AI팀 확인).
 *   대표 영상 `referenceUrl`   — 이 유행이 어떤 건지 보여주는 영상. **홈·관심 목록 카드**
 *   가이드 영상 `guideVideoUrl` — 따라 찍을 때 보는 영상. **촬영 준비·촬영 중 PiP**
 *
 * 출처는 AI 서버의 트렌드 클러스터입니다 — 챌린지마다
 * `representative_youtube_url` / `guide_youtube_url` 두 값을 갖고 있고,
 * 백엔드가 그대로 `reference_url` / `guide_video_url` 로 내려줍니다.
 *
 * ⚠️ **둘을 섞어 쓰면 화면에서 티가 안 납니다.** 지금 트렌드 클러스터 3건은 두 주소가
 *    같아서, 잘못 써도 당장은 똑같이 보입니다. 나중에 가이드 영상만 따로 촬영해서
 *    올리는 순간 홈에 가이드가 뜨거나 촬영 중에 대표 영상이 뜹니다. 그때 원인을
 *    찾기 어려우므로 지금부터 이 함수로만 고릅니다.
 */
import type { VideoFormat } from './schema/types';

/** 홈 피드·관심 목록 카드에 보여줄 **대표 영상**. */
export function representativeVideoUrl(format?: VideoFormat | null): string | undefined {
  return format?.referenceUrl;
}

/**
 * 촬영 준비·촬영 중에 따라 볼 **가이드 영상**.
 *
 * 가이드 주소가 없으면 대표 영상으로 떨어집니다 — 트렌드 연동 전에 들어온 포맷과
 * R06 추천으로 적재된 포맷에는 아직 이 값이 없습니다. 아무것도 안 보여주는 것보다
 * 대표 영상이라도 보여주는 쪽이 낫습니다(둘 다 "이 유행이 어떤 건지" 는 알려줍니다).
 */
export function guideVideoUrl(format?: VideoFormat | null): string | undefined {
  return format?.guideVideoUrl ?? format?.referenceUrl;
}

/** 화면 표시용 포매터 모음. */

/**
 * 프로젝트를 화면에 뭐라고 부를지 (명세 4.1·4.3·15.2, 2026-08-26).
 *
 * project_title 은 AI 가 7.1 기획 때 지어줍니다. 그 전에는 null 이므로
 * promotion_purpose 로 대신합니다 — BE 공지가 지시한 폴백입니다.
 *
 * 폴백을 화면마다 각자 쓰면 한 곳은 반드시 빠뜨립니다. 그래서 여기 한 곳에 둡니다.
 */
export function projectLabel(p?: {
  projectTitle?: string | null;
  promotionPurpose?: string | null;
}): string {
  const t = p?.projectTitle?.trim();
  if (t) return t;
  return p?.promotionPurpose ?? '만들던 영상';
}

export function won(value?: number | null): string {
  if (value === null || value === undefined) return '';
  return `${value.toLocaleString('ko-KR')}원`;
}

export function count(value?: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만`;
  return value.toLocaleString('ko-KR');
}

export function seconds(value?: number | null): string {
  if (!value) return '';
  return `${Math.round(value)}초`;
}

export function minutes(value?: number | null): string {
  if (!value) return '';
  // 0.4분 → "약 0분" 이 되는 걸 막습니다. 1분 미만은 "1분 안" 으로 말합니다.
  if (value < 1) return '1분 안';
  return `약 ${Math.round(value)}분`;
}

/** 초 → 0:05 형태. 영상 재생 시간 표시용 */
export function clock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

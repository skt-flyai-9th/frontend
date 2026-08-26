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

/**
 * 촬영에 걸리는 시간을 사람이 읽는 말로 (2026-08-26).
 *
 * 명세 5.1·7.1 의 `expected_duration_sec` 는 **완성 영상 길이가 아니라
 * 찍는 데 걸리는 시간**입니다 (BE 확인, 2026-08-26). 값의 폭이 커서
 * (13초짜리도 있고 1800초=30분짜리도 옵니다) 초로만 쓰면 읽기 어렵습니다.
 *
 *   13   → "13초"
 *   90   → "1분 30초"
 *   300  → "5분"
 *   1800 → "30분"
 */
export function shootTime(totalSec?: number | null): string | null {
  if (typeof totalSec !== 'number' || !Number.isFinite(totalSec) || totalSec <= 0) return null;
  const s = Math.round(totalSec);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest === 0 ? `${m}분` : `${m}분 ${rest}초`;
}

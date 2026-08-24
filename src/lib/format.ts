/** 화면 표시용 포매터 모음. */

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

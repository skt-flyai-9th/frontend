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

/**
 * 전화번호 표시 — **저장은 숫자만, 보여줄 때만 하이픈.**
 *
 * 시안 `formatPhone` 과 같은 규칙입니다. 서버 2.1 은 `phone` 을 `null` 로 주는
 * 경우가 많아(스타벅스 한국프레스센터점 실측) **빈 값이면 null 을 돌려줍니다** —
 * 부르는 쪽에서 줄 자체를 그리지 않게 하려는 것입니다. 없는 번호를 `-` 로
 * 채워 두면 번호가 있는데 비어 있는 것처럼 보입니다.
 */
export function phoneText(raw?: string | null): string | null {
  const d = (raw ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length < 4) return d;
  // 02 는 지역번호가 두 자리입니다. 나머지는 세 자리로 끊습니다.
  if (d.startsWith('02')) {
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

/**
 * 업종 표시 — 서버는 `"카페,디저트>카페"` 처럼 분류 경로를 통째로 줍니다(2.1 실측).
 * 시안 칩은 `카페` 한 마디라 **가장 좁은 분류만** 남깁니다.
 */
export function shortCategory(raw?: string | null): string | null {
  const last = (raw ?? '').split('>').pop()?.split(',').pop()?.trim();
  return last ? last : null;
}

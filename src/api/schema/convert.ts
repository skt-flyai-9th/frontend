/**
 * convert.ts — 명세(snake_case) ↔ 앱 코드(camelCase) 경계.
 *
 * 왜 이 층이 필요한가
 *   API 명세는 `video_format_id`, `shorts_status` 처럼 snake_case 입니다.
 *   그걸 화면 코드까지 끌고 가면 `project.video_format_id` 와 `theme.brandColor` 가
 *   한 파일에 섞여서 지저분해지고, 명세가 바뀔 때 화면을 전부 뒤져야 합니다.
 *
 *   그래서 변환을 이 파일 하나에 가둡니다.
 *   경계가 한 곳이므로 명세가 바뀌어도 schema/ 안에서만 고치면 됩니다.
 *
 * 규칙
 *   - 서버로 나가는 것: toSnake
 *   - 서버에서 들어오는 것: toCamel
 *   - 화면 코드는 camelCase 만 봅니다. snake_case 를 절대 쓰지 않습니다.
 */

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/**
 * 안쪽 키를 변환하지 않고 그대로 둘 대상.
 *
 * 서버가 **값을 키로 쓰는 맵**일 때만 여기 넣습니다.
 * 예: { "metrics_by_platform": { "INSTAGRAM": 100 } } 처럼
 *     안쪽 키가 데이터라서 건드리면 값이 망가지는 경우.
 *
 * ⚠️ client_state 는 여기 넣으면 안 됩니다.
 *    우리가 { lastTaskId: 702 } 로 넣고 { last_task_id: 702 } 로 받는데,
 *    보존해 버리면 화면이 lastTaskId 를 못 찾습니다. 실제로 그 버그가 있었습니다.
 */
const PRESERVE_KEYS = new Set<string>(['metrics_by_platform']);

function mapKeys(value: Json, mapper: (k: string) => string, preserveDepth = false): Json {
  if (Array.isArray(value)) {
    return value.map((v) => mapKeys(v, mapper, preserveDepth));
  }
  if (value !== null && typeof value === 'object') {
    const out: { [k: string]: Json } = {};
    for (const [k, v] of Object.entries(value)) {
      const preserve = preserveDepth || PRESERVE_KEYS.has(k);
      // 보존 대상이면 그 아래 키는 변환하지 않습니다.
      out[preserve && preserveDepth ? k : mapper(k)] = mapKeys(v as Json, mapper, preserve);
    }
    return out;
  }
  return value;
}

/** 서버 응답 → 앱 */
export function toCamel<T>(input: unknown): T {
  return mapKeys(input as Json, snakeToCamel) as T;
}

/** 앱 → 서버 요청 */
export function toSnake<T>(input: unknown): T {
  return mapKeys(input as Json, camelToSnake) as T;
}

/**
 * 명세의 ISO 8601(UTC) 문자열을 화면용 한국어로.
 * 사장님 화면에 `2026-08-19T08:00:00Z` 가 그대로 나가면 안 됩니다.
 */
export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function formatDateShort(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/** "3일 전" 같은 상대 표기. 최근 게시물 목록에 씁니다. */
export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;

  const day = Math.floor(hour / 24);
  if (day < 30) return `${day}일 전`;

  return formatDate(iso);
}

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
 * ⚠️ **이름과 달리 지금 넣는 값은 참고 영상 길이입니다.** 5.1·5.2 의
 *    `expected_duration_sec` 가 촬영 시간이 아니라는 게 2026-08-29 에 드러났습니다
 *    (아래 `formatHashtags` 머리말). 초를 사람 말로 바꾸는 일만 하므로 두 값 어디에나
 *    쓸 수 있고, 5.1 이 촬영 시간을 주기 시작하면 그대로 다시 쓰면 됩니다.
 *
 * 값의 폭이 큽니다 — 13초짜리도 있고 1800초=30분짜리도 옵니다. 초로만 쓰면
 * 읽기 어렵습니다.
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
 * 포맷 해시태그 — **홈 피드 · 관심 목록 · AI 추천 카드가 같은 것을 씁니다.**
 *
 * 시안은 `#촬영시간5분 #1인촬영 #얼굴미노출` 세 개인데, 가운데 **인원은 API 에 없어**
 * 난이도로 대신합니다(FormatCard 머리말, BE 미확정).
 *
 * 같은 것들을 화면마다 각자 조립하고 있었습니다(FeedPage · FormatCard). 세 번째로
 * 베끼는 대신 여기로 모읍니다 — 문구가 갈리면 같은 포맷이 화면마다 달라 보입니다.
 *
 * 값이 없는 항목은 **줄에서 빠집니다.** `#난이도null` 같은 걸 쓰지 않습니다.
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 시간 태그는 **영상 길이**입니다 — `#촬영…` 이 아닙니다 (2026-08-29)
 * ─────────────────────────────────────────────────────────────
 * `#촬영13초` 로 쓰던 값(`expected_duration_sec`)은 **찍는 데 걸리는 시간이 아니라
 * 참고 영상의 길이**입니다. 2026-08-26 에 BE 가 "촬영 시간" 이라고 확인해 줘서 그
 * 말을 그대로 믿고 라벨만 고쳤는데, 실제 값과 유튜브 영상 길이를 맞춰 보니
 * 영상 길이였습니다.
 *
 *   OWnLiuJU8Ks   서버 13  ·  실제 영상 13초
 *   6duJ3WOzeuQ   서버 45  ·  실제 영상 44초
 *   02afQgwCDSc   서버 13  ·  실제 영상 10초
 *
 * 결정적인 건 **같은 영상을 쓰는 포맷 두 개(챌린지·가게 홍보)가 똑같이 45** 라는
 * 점입니다. 춤 챌린지와 가게 홍보의 촬영 시간이 같을 수 없습니다.
 *
 * 진짜 촬영 시간은 **정상으로 내려오고 있습니다** — 다만 7.1·7.2 에만 있습니다.
 * 실제로 태워 보니 목록 값과 완전히 다릅니다.
 *
 *   포맷 50 주술회전 트랜지션   목록 13  ·  7.1 촬영 시간 **90초**
 *   포맷 55 동그리오(챌린지)    목록 45  ·  7.1 촬영 시간 **430초**
 *
 * 그런데 7.1·7.2 는 **프로젝트가 있어야** 부릅니다(스키마 140 개를 훑어
 * `ShootingSummary` 를 참조하는 경로가 이 둘뿐인 것을 확인). 홈 피드에서 카드마다
 * 프로젝트를 만들 수는 없습니다 — 고르지도 않은 포맷으로 빈 프로젝트가 쌓입니다.
 *
 * 카드에서 촬영 시간을 미리 알 방법이 없으므로, **값은 그대로 쓰되 라벨을 사실대로**
 * 답니다 — `#영상13초`. 사장님 지시입니다(2026-08-29): 촬영 시간이 목록에 들어오면
 * 그때 `#촬영…` 으로 바꾼다.
 *
 * ⚠️ **`#촬영…` 으로 되돌리지 마세요.** 영상 길이를 "촬영" 이라고 적으면 사장님이
 *    13초짜리 촬영으로 알고 준비합니다 — 실제로는 90초입니다. 라벨을 바꾸는 건
 *    5.1 이 촬영 시간을 주기 시작한 뒤입니다. BE_전달사항.md §2-8 참고.
 */
export function formatHashtags(format?: {
  expectedDurationSec?: number | null;
  shootingDifficulty?: string | null;
  requiresFace?: boolean | null;
}): string[] {
  if (!format) return [];
  // 참고 영상의 길이입니다. 촬영 시간이 아닙니다 — 위 머리말 참고.
  const len = shootTime(format.expectedDurationSec);
  return [
    len ? `#영상${len}` : null,
    format.shootingDifficulty ? `#난이도${format.shootingDifficulty}` : null,
    typeof format.requiresFace === 'boolean'
      ? format.requiresFace
        ? '#얼굴노출있음'
        : '#얼굴노출없음'
      : null,
  ].filter((tag): tag is string => tag !== null);
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
 * 지번 주소 — 도로명과 **겹치는 앞부분을 덜어냅니다** (2026-08-26, BE 배포 반영).
 *
 * 2.1 이 주는 두 주소는 시·군·구가 똑같습니다.
 *
 *   도로명  서울특별시 중구 세종대로 124 (태평로1가)
 *   지번    서울특별시 중구 태평로1가 25
 *
 * 시트는 두 줄을 위아래로 붙여 놓기 때문에 그대로 그리면 "서울특별시 중구" 가
 * 두 번 읽힙니다. 시안(`매장조회지도.jpg`)도 도로명 "서울 동작구 보라매로 87" 아래
 * 지번을 **"신대방동 395-69"** 로만 적습니다.
 *
 * 그래서 **앞에서부터 같은 낱말만** 떼어냅니다. 값을 고쳐 쓰거나 지어내지 않고,
 * 바로 위 줄에 이미 있는 글자만 덜어내는 것입니다.
 *
 * ⚠️ 앞이 다르면(다른 시·도로 잡히는 경우) 통째로 그대로 보여 줍니다 — 그때는
 *    "서울" 이 정말 필요한 정보입니다.
 */
export function jibunText(road?: string | null, jibun?: string | null): string | null {
  const j = (jibun ?? '').trim();
  if (!j) return null;
  const r = (road ?? '').trim().split(/\s+/);
  const parts = j.split(/\s+/);
  let i = 0;
  while (i < parts.length - 1 && i < r.length && parts[i] === r[i]) i += 1;
  return parts.slice(i).join(' ');
}

/**
 * 업종 분류 — 네이버 분류 경로를 **우리 칩 하나**로 보냅니다.
 *
 * ─────────────────────────────────────────────────────────────
 * ⚠️ 처음엔 "맨 뒤 조각만 떼기" 로 만들었다가 갈아엎었습니다 (2026-08-26)
 * ─────────────────────────────────────────────────────────────
 * 실서버에서 서로 다른 카테고리 원문 **59종**을 뽑아 돌려 보니 두 가지로 깨졌습니다.
 *
 * ① **맨 뒤가 업종이 아니라 브랜드명입니다.**
 *      가정,생활 > 미용 > 미용실 > 준오헤어   → "준오헤어"  (미용실이어야 함)
 *      ... > 드럭스토어 > 올리브영            → "올리브영"
 *      ... > 헬스클럽 > 스포애니              → "스포애니"
 *
 * ② **쉼표 뒤를 자르면 뜻이 뒤집힙니다.**
 *      음식점>카페,디저트   → "디저트"   ← 카페인데 디저트로 저장됩니다
 *      음식점>치킨,닭강정   → "닭강정"   ← 치킨집인데
 *      생활,편의>꽃집,꽃배달 → "꽃배달"
 *
 * 쉼표가 **목록**일 때도(`가정,생활`) **한 덩어리 이름**일 때도(`카페,디저트`)
 * 있어서 기계적으로 자를 수 없습니다.
 *
 * 그래서 방향을 바꿨습니다 — 예쁜 라벨을 만들려 하지 말고, 경로 **전체**를
 * 키워드로 훑어 **우리 칩 중 하나**로 보냅니다. 저장되는 값이 곧 칩이라
 * 중간 라벨이 필요 없습니다.
 *
 * 같은 59종에 돌린 결과 **47종 중 38종(81%)** 이 자동 분류됩니다.
 * 남는 것(약국·편의점·세탁소·드럭스토어·기업)은 규칙이 틀린 게 아니라
 * **우리 칩에 없는 업종**이라 `null` 로 두고 화면이 "직접입력" 으로 보냅니다.
 *
 * ⚠️ **순서가 규칙입니다.** 위에서부터 먼저 걸리는 것을 씁니다 —
 *    `음식점>카페,디저트` 는 '음식점'(식당)과 '카페' 둘 다 걸리는데, 카페를
 *    먼저 두어야 카페로 갑니다. 큰 분류보다 **좁은 분류를 위에** 둡니다.
 */
const CATEGORY_RULES: [string, RegExp][] = [
  ['카페', /카페|커피|베이커리|제과|와플|디저트|빵|브런치/],
  [
    '식당',
    /음식점|한식|중식|일식|양식|분식|피자|치킨|닭|국밥|고기|횟집|술집|호프|맥주|주점|뷔페|이탈리아|족발|보쌈|초밥|김밥|음식|식당|찌개|국수|면요리/,
  ],
  ['미용', /미용|헤어|네일|이용원|바버|피부|왁싱|속눈썹|에스테틱|메이크업|뷰티/],
  ['운동', /스포츠|헬스|피트니스|요가|필라테스|골프|수영|체육|클라이밍|무술|태권/],
  ['의류', /패션|의류|신발|가방|잡화|안경|렌즈|주얼리|악세|옷가게/],
  ['꽃집', /꽃집|꽃배달|화원|플라워|화훼/],
  ['반려동물', /반려동물|애견|애묘|펫|동물병원/],
  ['공방', /공방|공예|화방|도자기|자수|수예|미술|화랑|목공|가죽/],
  ['학원', /학원|교육|어학|아카데미|피아노|과외/],
];

/**
 * 분류 경로에서 우리 칩을 찾습니다. 못 찾으면 `null` — 화면이 "직접입력" 으로 보냅니다.
 * 서버는 `"카페,디저트>카페"` 처럼 경로를 통째로 줍니다(2.1 실측).
 */
export function matchCategory(raw?: string | null): string | null {
  const path = (raw ?? '').replace(/\s+/g, '');
  if (!path) return null;
  for (const [chip, re] of CATEGORY_RULES) if (re.test(path)) return chip;
  return null;
}

/**
 * 칩에 못 넣을 때 **직접입력 칸에 미리 채워 둘 말**.
 *
 * 경로에서 가장 좁은 조각을 씁니다. 위에서 본 것처럼 브랜드명이 섞이지만,
 * 여기서는 **사장님이 보고 고칠 값**이라 괜찮습니다 — 빈 칸을 주는 것보다
 * "약국" 이 적혀 있는 편이 낫습니다. 저장되는 값으로 쓰지는 마세요.
 */
export function categoryHint(raw?: string | null): string {
  const last = (raw ?? '').split('>').pop()?.split(',').pop()?.trim();
  return last ?? '';
}

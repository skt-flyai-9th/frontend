/**
 * fixtures.ts — Mock 응답 데이터.
 *
 * ⚠️ 여기 값은 API 명세서의 Response 예시를 그대로 옮긴 것입니다.
 *    필드 이름·구조를 임의로 바꾸지 않습니다.
 *    그래야 Mock 으로 검증한 화면이 실서버에서도 그대로 동작합니다.
 *
 * 단, 내용(가게 이름·메뉴)은 팀 현장조사 대상인 관악구 골목상권 맥락으로 채웠습니다.
 * 40~60대 · 1~3인 운영 · 프랜차이즈 아닌 음식점.
 */

export const onboarding = {
  // 명세 1.1 (2026-08-21 개정): 5단계 → 4단계로 축소
  onboarding_steps: [
    { order: 1, title: '숏폼 탐색', description: '우리 가게에 맞는 숏폼 포맷을 탐색해요' },
    { order: 2, title: '태스크 촬영', description: '가이드를 보며 하나씩 촬영해요' },
    { order: 3, title: '편집 결과', description: 'AI가 자동으로 편집한 결과를 확인해요' },
    { order: 4, title: '데이터 분석', description: '게시 후 성과를 확인해요' },
  ],
  terms: {
    version: '2026.03',
    required: ['이용약관', '개인정보 처리방침'],
    optional: ['마케팅 수신 동의'],
  },
};

export const loginResponse = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  user: { id: 1, email: 'boss01@example.com', name: '김사장' },
};

/**
 * 2.1 검색 후보.
 *
 * ⚠️ kakao_place_id 는 **카카오 후보에만** 값이 있고 네이버는 null 입니다
 *    (명세 2026-08-25). 세 후보 중 하나만 값이 있는 이 구성이 곧 표본입니다 —
 *    전부 채워두면 "네이버일 때 null" 경로를 한 번도 안 타게 됩니다.
 *
 * ⚠️ jibun_address 는 반대로 **셋 다 채웁니다** (2026-08-26 배포 후 실측 98/98).
 *    소스를 가리지 않고 옵니다. 도로명과 시·군·구가 같은 것도 실제와 같습니다 —
 *    시트가 겹치는 앞부분을 덜어내는 경로(`jibunText`)를 타야 하기 때문입니다.
 */
const PLACES = [
  {
    source: 'NAVER',
    name: '난곡신사 손칼국수',
    address: '서울 관악구 난곡로 42',
    jibun_address: '서울 관악구 신림동 1544-3',
    phone: '02-123-4567',
    latitude: 37.4712,
    longitude: 126.9199,
    category: '한식',
    distance_m: 120,
    external_channel_url: 'https://map.naver.com/p/entry/place/11111',
    kakao_place_id: null,
  },
  {
    source: 'KAKAO',
    name: '난곡신사 손칼국수 본점',
    address: '서울 관악구 난곡로 42-1',
    jibun_address: '서울 관악구 신림동 1544-5',
    phone: '02-123-4568',
    latitude: 37.4713,
    longitude: 126.9201,
    category: '분식',
    distance_m: 140,
    external_channel_url: 'https://place.map.kakao.com/22222',
    // 명세 예시처럼 external_channel_url 끝자리와 같은 값을 씁니다(문자열입니다).
    kakao_place_id: '22222',
  },
  {
    source: 'NAVER',
    name: '서림 옛날통닭',
    address: '서울 관악구 신림로 233',
    jibun_address: '서울 관악구 신림동 1432-9',
    phone: '02-234-5678',
    latitude: 37.4842,
    longitude: 126.9291,
    category: '한식',
    distance_m: 480,
    external_channel_url: 'https://map.naver.com/p/entry/place/33333',
    kakao_place_id: null,
  },
];

export function searchPlaces(keyword: string) {
  if (!keyword.trim()) return [];
  return PLACES.filter(
    (p) => p.name.includes(keyword) || p.address.includes(keyword) || p.category.includes(keyword)
  );
}

export const store = {
  id: 10,
  name: '난곡신사 손칼국수',
  category: '한식',
  sub_category: '칼국수/만두',
  address: '서울 관악구 난곡로 42',
  latitude: 37.4712,
  longitude: 126.9199,
  phone: '02-123-4567',
  business_hours: '평일 10:00-20:30 (일요일 휴무, 브레이크 15:00-16:30)',
  brand_tone: '30년 손맛, 정직하고 푸근한 동네 국숫집',
  brand_color: '#D93E12',
  /**
   * 프로필 사진. 시안 V4 의 store/profile-default.svg 원본을 그대로 PNG 로 구워 넣습니다.
   * (RN <Image> 는 SVG 를 못 읽습니다 — 안드로이드 미지원 + 웹에서도 빈 원)
   * 회색 팔레트: track(#CBD5E1) 배경 + surface(#F8FAFC) 75% 실루엣.
   */
  logo_url: 'data:image/png;base64,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',
  info_source: 'NAVER',
  external_channel_url: 'https://map.naver.com/p/entry/place/12345',
  updated_at: '2026-08-18T08:10:00Z',
};

export const menus = [
  {
    id: 101,
    name: '바지락 손칼국수',
    price: 9000,
    description: '매일 아침 미는 생면과 바지락 육수',
    image_url: 'https://picsum.photos/seed/reals-kal/200/200',
    is_new_menu: false,
    is_event_menu: false,
    is_sold_out: false,
  },
  {
    id: 102,
    name: '들깨 칼국수',
    price: 10000,
    description: '고소한 들깨를 듬뿍',
    image_url: null,
    is_new_menu: true,
    is_event_menu: false,
    is_sold_out: false,
  },
  {
    id: 103,
    name: '손만두 6개',
    price: 6000,
    description: '직접 빚어 매일 쪄냅니다',
    image_url: 'https://picsum.photos/seed/reals-mandu/200/200',
    is_new_menu: false,
    is_event_menu: true,
    is_sold_out: false,
  },
];

export const photos = [
  {
    id: 201,
    file_url: 'https://picsum.photos/seed/reals-sign/800/600',
    category: '간판',
    has_sensitive_info: false,
    created_at: '2026-08-18T08:00:00Z',
  },
  {
    id: 202,
    file_url: 'https://picsum.photos/seed/reals-inside/800/600',
    category: '내부',
    has_sensitive_info: true,
    created_at: '2026-08-18T09:00:00Z',
  },
  {
    id: 203,
    file_url: 'https://picsum.photos/seed/reals-menu/800/600',
    category: '음식',
    has_sensitive_info: false,
    created_at: '2026-08-18T09:10:00Z',
  },
];

export const targetCustomers = [
  {
    id: 401,
    target_type: '주',
    target_description: '근처 사는 40-60대, 평일 점심에 혼자 또는 둘이 방문',
    ai_confidence: '보통',
    status: 'CONFIRMED',
  },
  {
    id: 402,
    target_type: '성장',
    target_description: '신림 쪽 20-30대 직장인, 점심시간에 15분 거리까지 이동',
    ai_confidence: '낮음',
    status: 'SUGGESTED',
  },
  {
    id: 403,
    target_type: '보조',
    target_description: '저녁 장 보러 나온 주민, 집밥 대신 간단히',
    ai_confidence: '낮음',
    status: 'SUGGESTED',
  },
  {
    // 명세 3.4 (2026-08-23): 목록 조회는 HIDDEN 도 포함해 내려줍니다.
    // 실서버와 같은 모양을 재현하기 위해 숨김 표본을 하나 둡니다 —
    // 이게 없으면 "화면에서 거르는" 코드가 Mock 에서 한 번도 검증되지 않습니다.
    id: 404,
    target_type: '보조',
    target_description: '심야 배달 주문 위주 1인 가구',
    ai_confidence: '낮음',
    status: 'HIDDEN',
  },
];

export const insights = [
  {
    id: 501,
    insight_type: '상권분석',
    insight_title: '주거 밀집 생활형 골목상권, 점심 시간대 집중',
    insight_content:
      '난곡로 일대 주거 밀집 지역으로, 평일 11:30-13:00 유동인구가 가장 많습니다. 반경 300m 안에 국수집이 2곳 있습니다.',
    insight_source: '외부데이터',
    generated_at: '2026-08-11T00:00:00Z',
    /**
     * ✅ **실서버가 주는 모양 그대로입니다** (2026-08-30 실측).
     *
     * 새 매장을 등록해 3.5 를 받아 보고 확인했습니다 — 그전에는 빈 배열이라
     * 형태를 못 봐서 저희가 짐작한 배열(`age_mix`)을 넣어 두었고, 실제와 달랐습니다.
     *
     * 값은 시안 `매장인사이트배열수정.png` 의 비율을 씁니다(10대 8 · 20대 40 ·
     * 30대 28 · 40대 16 · 50+ 8 / 여 56 · 남 44) — 디자인 QA 에서 시안과 나란히
     * 놓고 보기 위해서입니다.
     */
    insight_data: {
      age_distribution: { '10s': 8, '20s': 40, '30s': 28, '40s': 16, '50s_plus': 8 },
      gender_distribution: { female: 56, male: 44 },
    },
  },
  {
    id: 502,
    insight_type: '카드뉴스',
    insight_title: '손님이 가장 많이 말한 것은 국물과 양',
    insight_content:
      '리뷰 62건에서 바지락 손칼국수가 38회 언급됐고, 국물·양·빠른 서빙이 자주 칭찬됩니다. 점심 대기 시간은 7건에서 아쉬움으로 나왔습니다.',
    insight_source: '리뷰분석',
    generated_at: '2026-08-18T00:00:00Z',
  },
  {
    id: 503,
    insight_type: '다음숏폼추천',
    insight_title: '들깨 칼국수를 아직 아무도 모릅니다',
    insight_content:
      '신메뉴로 등록됐지만 리뷰 언급이 0건입니다. 만드는 과정을 보여주는 영상이 첫 인지에 효과적입니다.',
    insight_source: 'AI추론',
    generated_at: '2026-08-18T00:00:00Z',
  },
];

export const project = {
  id: 1001,
  // 명세 4.3 (2026-08-26): 7.1 기획 전에는 null 입니다. POST /plan 이 채웁니다.
  project_title: null,
  store_id: 10,
  video_format_id: null,
  store_target_customer_id: null,
  // 명세 4.3 (2026-08-21): promotion_sub_goal 삭제 → menu_id + promotion_detail
  menu_id: null,
  promotion_purpose: '메뉴소개',
  promotion_detail: null,
  face_exposure_mode: null,
  shooting_condition: null,
  shorts_status: 'DRAFT',
  created_at: '2026-08-20T09:00:00Z',
  updated_at: '2026-08-20T09:00:00Z',
};

export const projectList = [
  {
    id: 1000,
    // 촬영 단계라 기획(7.1)을 이미 지났습니다 → 제목이 있습니다.
    project_title: '신메뉴 로제떡볶이 가격 맞히기',
    promotion_purpose: '메뉴소개',
    shorts_status: 'SHOOTING',
    updated_at: '2026-08-19T14:20:00Z',
  },
];

/*
  ⚠️ 2026-08-30 BE PR #126 로 필드가 갈라졌습니다.
       reference_duration_sec  완성 영상 길이 (옛 expected_duration_sec)
       estimated_shooting_sec  촬영 시간 (신규 · 화면의 #촬영 태그가 읽는 값)
  73 번은 **일부러 촬영 시간을 비워 뒀습니다** — 서버가 아직 못 채운 포맷이 그렇게
  옵니다(배포 직후 다섯 개 전부 null 이었습니다). 그때 카드가 어떻게 보이는지를
  QA 캡처에서 같이 보려는 것입니다. 값이 없으면 시간 태그가 줄에서 빠집니다.
*/
export const videoFormats = [
  {
    id: 71,
    format_title: '만드는 과정만 보여주기',
    format_type: '정보형',
    reference_duration_sec: 24,
    estimated_shooting_sec: 300,
    shooting_difficulty: '하',
    requires_face: false,
    recommend_reasons: [
      '얼굴을 비추지 않아도 됩니다',
      '한 장면이 4~5초라 손님 없을 때 짬짬이 찍을 수 있습니다',
      '점심 손님에게 가장 잘 통하는 구성입니다',
    ],
    reference_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    // 지금 트렌드 클러스터 3건은 대표·가이드가 같은 주소입니다. 달라질 수 있습니다.
    guide_video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    source_platform: 'YOUTUBE',
  },
  {
    id: 72,
    format_title: '문 열고 들어오는 시점 소개',
    format_type: '잔잔한 소개',
    reference_duration_sec: 30,
    estimated_shooting_sec: 240,
    shooting_difficulty: '하',
    requires_face: false,
    recommend_reasons: ['처음 오는 손님의 부담을 줄입니다', '혼자서도 촬영할 수 있습니다'],
    reference_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    // 지금 트렌드 클러스터 3건은 대표·가이드가 같은 주소입니다. 달라질 수 있습니다.
    guide_video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    source_platform: 'YOUTUBE',
  },
  {
    id: 73,
    format_title: '가격 공개 반전 챌린지',
    format_type: '밈',
    reference_duration_sec: 15,
    estimated_shooting_sec: null,
    shooting_difficulty: '중',
    requires_face: true,
    recommend_reasons: ['가장 빨리 끝납니다', '공유가 잘 일어납니다'],
    reference_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    // 지금 트렌드 클러스터 3건은 대표·가이드가 같은 주소입니다. 달라질 수 있습니다.
    guide_video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    source_platform: 'YOUTUBE',
  },
];

/*
  6.1·6.2·6.3 목업(quizQuestions·quizResult·quizAlternatives)은 지웠습니다
  (2026-08-26). 서버에서 폐기된 경로라 흉내 낼 이유가 없습니다.
*/

export const plan = {
  shooting_summary: {
    expected_duration_sec: 480,
    required_people: 1,
    props: ['삼각대 또는 세울 곳', '완성된 칼국수 한 그릇'],
    difficulty: '하',
  },
  // 명세 7.1: id 와 scene_dialogue 포함. scene_subtitle 은 7.2 에만 있습니다.
  scenes_preview: [
    { id: 601, scene_order: 1, scene_description: '가게 간판', scene_dialogue: '난곡에서 30년 한 칼국수집입니다', target_duration_sec: 4 },
    { id: 602, scene_order: 2, scene_description: '면 미는 손', scene_dialogue: '면은 매일 아침 직접 밉니다', target_duration_sec: 5 },
    { id: 603, scene_order: 3, scene_description: '국물 붓기', scene_dialogue: '바지락만 넣고 두 시간 끓입니다', target_duration_sec: 5 },
    { id: 604, scene_order: 4, scene_description: '완성 그릇', scene_dialogue: '한 그릇 9,000원입니다', target_duration_sec: 5 },
    { id: 605, scene_order: 5, scene_description: '가게 위치 안내', scene_dialogue: '관악구 난곡로 42, 일요일은 쉽니다', target_duration_sec: 5 },
  ],
};

export const scenes = [
  {
    id: 601,
    scene_order: 1,
    scene_description: '가게 앞에서 간판이 보이게',
    scene_dialogue: '난곡에서 30년 한 칼국수집입니다',
    scene_subtitle: '난곡 30년 손칼국수',
    shot_type: '풀샷',
    target_duration_sec: 4,
  },
  {
    id: 602,
    scene_order: 2,
    scene_description: '면을 미는 손을 위에서',
    scene_dialogue: '면은 매일 아침 직접 밉니다',
    scene_subtitle: '면은 매일 아침 직접',
    shot_type: '클로즈업',
    target_duration_sec: 5,
  },
  {
    id: 603,
    scene_order: 3,
    scene_description: '국물이 그릇에 들어가는 순간',
    scene_dialogue: '바지락만 넣고 두 시간 끓입니다',
    scene_subtitle: '바지락만 두 시간',
    shot_type: '클로즈업',
    target_duration_sec: 5,
  },
  {
    id: 604,
    scene_order: 4,
    scene_description: '한 입 먹고 나오는 표정',
    scene_dialogue: '한 그릇 9,000원입니다',
    scene_subtitle: '한 그릇 9,000원',
    shot_type: '미디엄샷',
    target_duration_sec: 5,
  },
];

/**
 * 촬영 컷. **시안 V4 CAMERA_TAKES 원문 4개** 를 그대로 씁니다.
 * 화면(촬영 준비·카메라)이 8.1 로 읽는 값이라, 여기가 시안과 다르면
 * 화면도 시안과 달라집니다.
 */
export const tasks = [
  { id: 701, scene_id: 601, task_type: '영상촬영', task_title: '간판 클로즈업', task_status: 'NOT_STARTED', display_order: 1 },
  { id: 702, scene_id: 602, task_type: 'B-roll', task_title: '손으로 집기', task_status: 'NOT_STARTED', display_order: 2 },
  { id: 703, scene_id: 603, task_type: 'B-roll', task_title: '절단면', task_status: 'NOT_STARTED', display_order: 3 },
  { id: 704, scene_id: 604, task_type: '영상촬영', task_title: '리액션', task_status: 'NOT_STARTED', display_order: 4 },
];

/**
 * 태스크별 촬영 가이드 (명세 9.1). taskId 로 찾습니다.
 *
 * guide_type: OVERLAY / DANCE / BROLL
 * reference_video 는 { reference_url, source_platform } 두 필드뿐입니다.
 * ⚠️ 이름은 reference 지만 **가이드 영상**을 담는 자리입니다 — 촬영 중에 따라 보는
 *    영상이라서입니다. 서버가 대표 영상을 보내면 사장님이 따라 출 안무가 아니라
 *    유행 소개 영상을 보게 됩니다 (BE_전달사항.md 참고).
 * (start_sec / end_sec 없음 — 구간은 사장님이 직접 잡습니다)
 */
/**
 * 컷별 참고 영상 구간 — 실서버가 주는 모양 그대로입니다.
 *
 * 2026-08-28 실측(챌린지 프로젝트 181): 한 영상을 컷 수만큼 **빈틈없이 쪼개서**
 * 주고, 구간 길이가 7.2 `target_duration_sec` 과 일치합니다. 촬영 준비 화면이
 * 컷을 넘길 때마다 이 구간만 되풀이합니다(`TaskPager`).
 */
const REF = (start: number, end: number) => ({
  reference_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  source_platform: 'YOUTUBE',
  start_ms: start,
  end_ms: end,
});

export const guides: Record<number, unknown> = {
  701: {
    guide_type: 'OVERLAY',
    overlay: { instructions: ['간판 전체가 화면 안에 들어오게 서세요', '얼굴은 화면 밖으로 두세요'] },
    reference_video: REF(0, 4000),
    broll_shot: null,
  },
  702: {
    guide_type: 'BROLL',
    overlay: { instructions: ['손이 위쪽에 오게, 위에서 아래로 찍으세요'] },
    reference_video: REF(4000, 9000),
    broll_shot: { shot_type: '클로즈업', distance: '근접', angle: '위에서' },
  },
  703: {
    // R10 안무 가이드형
    guide_type: 'DANCE',
    overlay: null,
    reference_video: REF(9000, 13000),
    broll_shot: null,
  },
  704: {
    // 컷 4 "리액션" — 얼굴이 나오므로 구도 지시문형입니다.
    guide_type: 'OVERLAY',
    overlay: { instructions: ['얼굴이 화면 가운데 오게 서세요', '한 입 먹고 바로 표정을 지으세요'] },
    reference_video: REF(13000, 18000),
    broll_shot: null,
  },
};

export const evaluation = {
  task_id: 701,
  total_score: 82.5,
  is_usable: true,
  must_retake_issues: [],
  fixable_by_editing: ['약간의 흔들림 → 안정화 처리로 보정 가능', '앞뒤 빈 시간 2초 → 자동으로 잘립니다'],
  ok_reasons: ['간판이 화면 중앙에 선명하게 잡힘'],
};

export const outputs = [
  {
    id: 801,
    target_platform: 'INSTAGRAM',
    resolution: '1080x1920',
    has_licensed_audio: false,
    render_status: 'COMPLETED',
    // ⚠️ Mock 전용 샘플. 실서버는 실제 렌더 결과 URL 을 줍니다.
    //    존재하지 않는 주소를 쓰면 재생·저장·게시가 전부 막혀
    //    앱을 실기기에서 확인할 수 없습니다.
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    cover_image_url: 'https://picsum.photos/seed/reals-cover/540/960',
  },
  {
    id: 802,
    target_platform: 'YOUTUBE',
    resolution: '1080x1920',
    has_licensed_audio: false,
    render_status: 'COMPLETED',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    cover_image_url: 'https://picsum.photos/seed/reals-cover2/540/960',
  },
];

export const publishKit = {
  title: '난곡에서 만나는 손칼국수 한 그릇',
  caption:
    '면은 매일 아침 직접 밉니다.\n바지락만 넣고 두 시간 끓인 국물을 만나보세요.',
  hashtags: ['#난곡맛집', '#칼국수', '#관악구맛집', '#손칼국수', '#동네맛집'],
  post_note: "Instagram 음악 탭에서 '주술회전'을 검색해 직접 추가해주세요.",
  /**
   * 정확한 곡명과 시작 위치를 검증하기 전에는 검색 키워드만 제공합니다.
   */
  track: {
    mode: 'SUGGESTED',
    title: null,
    artist: null,
    start_sec: null,
    end_sec: null,
    mood: null,
    search_keyword: '주술회전',
  },
};

/**
 * 명세 17.1 (2026-08-24): 같은 지표가 스냅샷으로 여러 번 쌓이고
 * collected_at **오름차순**으로 옵니다. 화면은 지표별 마지막 값(최신)을 씁니다.
 * 플랫폼이 안 주는 지표는 행 자체가 없습니다(0 아님).
 */
export const metrics = [
  { metric_name: 'views', metric_value: 1840, collected_at: '2026-08-20T00:00:00Z' },
  { metric_name: 'likes', metric_value: 96, collected_at: '2026-08-20T00:00:00Z' },
  { metric_name: 'saves', metric_value: 27, collected_at: '2026-08-20T00:00:00Z' },
  { metric_name: 'shares', metric_value: 11, collected_at: '2026-08-20T00:00:00Z' },
  // 이틀 뒤 스냅샷 — 최신값 집계가 이 값을 골라야 합니다.
  { metric_name: 'views', metric_value: 2412, collected_at: '2026-08-22T00:00:00Z' },
  { metric_name: 'likes', metric_value: 133, collected_at: '2026-08-22T00:00:00Z' },
  { metric_name: 'saves', metric_value: 41, collected_at: '2026-08-22T00:00:00Z' },
  { metric_name: 'shares', metric_value: 18, collected_at: '2026-08-22T00:00:00Z' },
  { metric_name: 'reach', metric_value: 5320, collected_at: '2026-08-22T00:00:00Z' },
];

/**
 * 명세 17.2 (2026-08-24): YouTube 는 reach·saves 가 없어
 * view_rate·save_rate 가 **항상 null** 입니다. '—' 로 표시해야 합니다.
 */
export const comparisonYoutube = [
  { sns_post_id: 902, view_rate: null, save_rate: null, days_since_posted: 40, confidence: '높음' },
  { sns_post_id: 860, view_rate: null, save_rate: null, days_since_posted: 10, confidence: '보통' },
];

export const comparison = [
  { sns_post_id: 901, view_rate: 0.42, save_rate: 0.008, days_since_posted: 3, confidence: '낮음' },
  { sns_post_id: 850, view_rate: 0.31, save_rate: 0.005, days_since_posted: 14, confidence: '보통' },
];

/**
 * 1.5 회원정보 (2026-08-23 신설).
 * 명세 그대로 snake_case 로 둡니다 — 변환 경로(toCamel)도 함께 검증됩니다.
 */
export const me = {
  id: 1,
  email: 'boss01@example.com',
  name: '김사장',
  phone: '01012345678',
  marketing_agreed: false,
  created_at: '2026-08-19T08:00:00Z',
  /*
    🔴 **이미 등록한 가게** (2026-08-31, 백엔드 PR #133). 없으면 `null` 입니다.
       다시 로그인했을 때 매장 등록을 건너뛰는 근거가 이 값입니다.
       가게 없는 사장님을 흉내 내려면 `null` 로 바꾸면 됩니다.
  */
  store_id: 1,
};

/**
 * 15.2 완성 숏폼 (2026-08-23 신설) — 마이페이지 3열 그리드용.
 *
 * 제목 컬럼이 없어 카드 라벨은 promotion_purpose 입니다(명세 명시).
 * is_posted 는 R16 게시 기능이 붙기 전까지 항상 false 입니다.
 */
/**
 * ⚠️ 표본 URL 은 실재하는 공개 리소스입니다 (구글 샘플 영상 · picsum).
 * 가짜 도메인을 쓰면 실기기에서 "0초 재생·저장 실패" 로 터진다는 걸
 * 2026-08-24 실기기 테스트에서 확인했습니다. BE 연동 전까지 유지하세요.
 */
export const storeShorts = [
  {
    video_output_id: 501,
    shorts_project_id: 300,
    // 명세 15.2 (2026-08-26)
    project_title: "이 국물 진짜 30년이래요",
    promotion_purpose: '메뉴소개',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    cover_image_url: 'https://picsum.photos/seed/reals501/720/1280',
    duration_sec: 24,
    is_posted: false,
    created_at: '2026-08-22T11:20:00Z',
  },
  {
    video_output_id: 502,
    shorts_project_id: 301,
    // 명세 15.2 (2026-08-26)
    project_title: "손만두 빚는 아침 5시",
    promotion_purpose: '이벤트알리기',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    cover_image_url: 'https://picsum.photos/seed/reals502/720/1280',
    duration_sec: 30,
    is_posted: false,
    created_at: '2026-08-21T09:05:00Z',
  },
  {
    video_output_id: 503,
    shorts_project_id: 302,
    // 명세 15.2 (2026-08-26)
   // 기획 전이라 null — 화면이 목적으로 대체하는 경로를 검증합니다.
    project_title: null,
    promotion_purpose: '가게소개',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    cover_image_url: 'https://picsum.photos/seed/reals503/720/1280',
    // 포맷을 안 골랐으면 null 이라는 명세 규칙을 표본으로 남깁니다.
    duration_sec: null,
    is_posted: false,
    created_at: '2026-08-20T18:40:00Z',
  },
  /*
   * 아래 셋은 마이페이지 그리드가 시안처럼 3열 두 줄로 차는지 보려고 둡니다.
   * 시안 OWNER_VIDEOS 도 6개입니다.
   */
  {
    video_output_id: 504,
    shorts_project_id: 303,
    project_title: '아침마다 미는 면',
    promotion_purpose: '가게소개',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    cover_image_url: 'https://picsum.photos/seed/reals504/720/1280',
    duration_sec: 21,
    is_posted: true,
    created_at: '2026-08-18T09:10:00Z',
  },
  {
    video_output_id: 505,
    shorts_project_id: 304,
    project_title: '바지락 두 시간',
    promotion_purpose: '메뉴소개',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    cover_image_url: 'https://picsum.photos/seed/reals505/720/1280',
    duration_sec: 27,
    is_posted: true,
    created_at: '2026-08-16T13:05:00Z',
  },
  {
    video_output_id: 506,
    shorts_project_id: 305,
    project_title: '점심 줄 서는 이유',
    promotion_purpose: '이벤트',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    cover_image_url: 'https://picsum.photos/seed/reals506/720/1280',
    duration_sec: 19,
    is_posted: false,
    created_at: '2026-08-14T17:30:00Z',
  },
];

/**
 * 알림 3건 — 시안 v3 `NOTICES` 원문 그대로입니다.
 *
 * ⚠️ 명세에 알림 API 가 없어 **mock 에만** 존재합니다.
 *    실서버 모드에서는 이 값이 쓰이지 않고 화면이 빈 상태가 됩니다
 *    (없는 숫자를 사장님에게 보여주지 않기 위해).
 */
export const notices = [
  {
    id: 'n1',
    icon: 'trending-up',
    tone: 'brand',
    title: '지난주 조회수가 32% 늘었어요',
    body: '크로플 단면 숏폼이 가장 많이 재생됐어요.',
    time: '2시간 전',
    unread: true,
  },
  {
    id: 'n2',
    icon: 'sparkles',
    tone: 'brand',
    title: '새 추천 숏폼 3개가 도착했어요',
    body: '여름 신메뉴에 맞는 레퍼런스를 골라봤어요.',
    time: '어제',
    unread: true,
  },
  {
    id: 'n3',
    icon: 'circle-check',
    tone: 'verified',
    title: '영상 내보내기가 완료됐어요',
    body: '인스타그램 릴스로 공유되었습니다.',
    time: '3일 전',
  },
];

/**
 * 매장 인사이트 지표 — 시안 v3 `INSIGHT_KPIS` · `WEEK_VIEWS` · `LOCAL_ANALYSIS` 원문.
 *
 * ⚠️ 계정 단위 집계 API 가 없습니다(17.1 은 게시물 단위라 주간 합산을 못 만듭니다).
 *    그래서 **mock 에만** 존재합니다. 실서버 모드에서는 KPI 가 "—", 차트는
 *    빈 상태가 됩니다 — 사장님에게 가짜 숫자가 가지 않게 하려는 구분입니다.
 *    알림(notices)과 같은 방식입니다.
 */
/**
 * 명세 17.3 주간 요약 — **실서버와 같은 snake_case 모양** 그대로 둡니다.
 * mock 응답도 `toCamel` 을 거치므로 여기서 미리 camel 로 바꾸면 안 됩니다.
 *
 * 값은 시안 `매장인사이트.html` 의 PLATFORMS 표본과 같은 크기로 맞췄습니다 —
 * 디자인 QA 캡처에서 시안과 나란히 놓고 볼 수 있어야 합니다.
 */
export const weeklySummary = {
  week_start: '2026-08-23T15:00:00Z',
  platforms: [
    {
      platform: 'YOUTUBE',
      weekly_views: 2480,
      weekly_likes: 312,
      views_change_rate: 14,
      daily_views: [
        { date: '2026-08-24', views: 190 },
        { date: '2026-08-25', views: 300 },
        { date: '2026-08-26', views: 260 },
        { date: '2026-08-27', views: 420 },
        { date: '2026-08-28', views: 380 },
        { date: '2026-08-29', views: 520 },
        { date: '2026-08-30', views: 410 },
      ],
    },
    {
      /*
        ⏳ **녹화용 값입니다** (2026-08-31). 합이 정확히 1,726 이 되도록 나눴습니다.

        곡선은 `그래프예시.png` 의 앞쪽 굴곡을 그대로 쓰되 **끝을 올렸습니다**
        (2026-08-31 지시: "다시 한번 그래프를 상승세로 바꿔줘").
          월 낮게 → 화 봉우리 → 수 골 → 목 상승 → 금 더 → 토 더 → **일 꼭대기**
          월 58 · 화 186 · 수 102 · 목 238 · 금 320 · 토 386 · 일 436 = 1726

        예시는 일요일에 떨어져서 전날 대비가 −27% 가 됐습니다. 낮게 시작해
        봉우리·골을 지나 **끝까지 오르는** 모양으로 바꾸면 그 값이 살아납니다.
          조회수 증감  일 436 ÷ 토 386 = +12.95% → +13%
          좋아요 증감  18 ÷ 17 = +5.88% → +6%
      */
      platform: 'INSTAGRAM',
      weekly_views: 1726,
      weekly_likes: 18,
      views_change_rate: 13,
      likes_change_rate: 6,
      daily_views: [
        { date: '2026-08-24', views: 58 },
        { date: '2026-08-25', views: 186 },
        { date: '2026-08-26', views: 102 },
        { date: '2026-08-27', views: 238 },
        { date: '2026-08-28', views: 320 },
        { date: '2026-08-29', views: 386 },
        { date: '2026-08-30', views: 436 },
      ],
    },
  ],
};



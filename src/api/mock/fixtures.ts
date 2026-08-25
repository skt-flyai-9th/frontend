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
 */
const PLACES = [
  {
    source: 'NAVER',
    name: '난곡신사 손칼국수',
    address: '서울 관악구 난곡로 42',
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
  logo_url: null,
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

export const videoFormats = [
  {
    id: 71,
    format_title: '만드는 과정만 보여주기',
    format_type: '정보형',
    expected_duration_sec: 24,
    shooting_difficulty: '하',
    face_exposure_level: '낮음',
    recommend_reasons: [
      '얼굴을 비추지 않아도 됩니다',
      '한 장면이 4~5초라 손님 없을 때 짬짬이 찍을 수 있습니다',
      '점심 손님에게 가장 잘 통하는 구성입니다',
    ],
    reference_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    source_platform: 'YOUTUBE',
  },
  {
    id: 72,
    format_title: '문 열고 들어오는 시점 소개',
    format_type: '잔잔한 소개',
    expected_duration_sec: 30,
    shooting_difficulty: '하',
    face_exposure_level: '낮음',
    recommend_reasons: ['처음 오는 손님의 부담을 줄입니다', '혼자서도 촬영할 수 있습니다'],
    reference_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    source_platform: 'YOUTUBE',
  },
  {
    id: 73,
    format_title: '가격 공개 반전 챌린지',
    format_type: '밈',
    expected_duration_sec: 15,
    shooting_difficulty: '중',
    face_exposure_level: '보통',
    recommend_reasons: ['가장 빨리 끝납니다', '공유가 잘 일어납니다'],
    reference_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    source_platform: 'YOUTUBE',
  },
];

export const quizQuestions = [
  {
    id: 'q1',
    type: 'single_choice',
    question: '이번엔 무엇을 알리고 싶으세요?',
    options: ['메뉴 하나', '이번에 하는 행사', '가게 자체'],
  },
  {
    id: 'q2',
    type: 'single_choice',
    question: '어떤 느낌이면 좋을까요?',
    options: ['푸근하고 정 있게', '깔끔하고 정확하게', '재미있고 가볍게'],
  },
  {
    id: 'q3',
    type: 'single_choice',
    question: '얼굴이 나와도 괜찮으세요?',
    options: ['전체노출', '일부노출', '비노출'],
  },
  {
    id: 'q4',
    type: 'single_choice',
    question: '찍어줄 사람이 있으세요?',
    options: ['혼자예요', '도와줄 사람이 있어요'],
  },
  {
    // 명세 6.1 의 type 에 multi_choice 가 올 수 있습니다.
    id: 'q4b',
    type: 'multi_choice',
    question: '보여줄 수 있는 게 뭐가 있으세요?',
    options: ['조리 과정', '완성된 음식', '가게 안', '간판', '재료'],
  },
  {
    id: 'q5',
    type: 'single_choice',
    question: '오늘 몇 분 정도 쓸 수 있으세요?',
    options: ['5분', '10분', '20분'],
  },
  {
    id: 'q6',
    type: 'free_text',
    question: '꼭 넣고 싶은 말이 있으세요?',
  },
];

export const quizResult = {
  recommended_format: {
    video_format_id: 71,
    format_type: '정보형',
    reason: '얼굴 비노출 조건에 맞고, 메뉴 소개에 적합한 포맷이에요',
    expected_duration_sec: 24,
  },
};

// 명세 6.3 (2026-08-21): 길이·난이도·얼굴노출이 응답에 추가됐습니다 (5.1 과 동일 필드).
export const quizAlternatives = [
  {
    video_format_id: 72,
    format_type: '잔잔한 소개',
    expected_duration_sec: 30,
    shooting_difficulty: '중',
    face_exposure_level: '낮음',
    reason: '공간 위주로 촬영해 얼굴 노출이 필요 없음',
  },
  {
    video_format_id: 73,
    format_type: '밈',
    expected_duration_sec: 20,
    shooting_difficulty: '하',
    face_exposure_level: '보통',
    reason: '가장 짧게 끝나지만 얼굴이 한 컷 필요함',
  },
];

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
    scene_description: '테이블 위 완성컷, 김이 보이게',
    scene_dialogue: '한 그릇 9,000원입니다',
    scene_subtitle: '한 그릇 9,000원',
    shot_type: '미디엄샷',
    target_duration_sec: 5,
  },
  {
    id: 605,
    scene_order: 5,
    scene_description: '가게 외관과 주변 길',
    scene_dialogue: '관악구 난곡로 42, 일요일은 쉽니다',
    scene_subtitle: '관악구 난곡로 42 · 일요일 휴무',
    shot_type: '풀샷',
    target_duration_sec: 5,
  },
];

export const tasks = [
  { id: 701, scene_id: 601, task_type: '영상촬영', task_title: '가게 간판 촬영', task_status: 'NOT_STARTED', display_order: 1 },
  { id: 702, scene_id: 602, task_type: 'B-roll', task_title: '면 미는 손', task_status: 'NOT_STARTED', display_order: 2 },
  { id: 703, scene_id: 603, task_type: 'B-roll', task_title: '국물 붓는 장면', task_status: 'NOT_STARTED', display_order: 3 },
  { id: 704, scene_id: 604, task_type: 'B-roll', task_title: '완성 그릇', task_status: 'NOT_STARTED', display_order: 4 },
  { id: 705, scene_id: 605, task_type: '영상촬영', task_title: '가게 외관과 위치', task_status: 'NOT_STARTED', display_order: 5 },
];

/**
 * 태스크별 촬영 가이드 (명세 9.1). taskId 로 찾습니다.
 *
 * guide_type: OVERLAY / DANCE / BROLL
 * reference_video 는 { reference_url, source_platform } 두 필드뿐입니다.
 * (start_sec / end_sec 없음 — 구간은 사장님이 직접 잡습니다)
 */
export const guides: Record<number, unknown> = {
  701: {
    guide_type: 'OVERLAY',
    overlay: { instructions: ['간판 전체가 화면 안에 들어오게 서세요', '얼굴은 화면 밖으로 두세요'] },
    reference_video: null,
    broll_shot: null,
  },
  702: {
    guide_type: 'BROLL',
    overlay: { instructions: ['손이 위쪽에 오게, 위에서 아래로 찍으세요'] },
    reference_video: null,
    broll_shot: { shot_type: '클로즈업', distance: '근접', angle: '위에서' },
  },
  703: {
    // R10 안무 가이드형
    guide_type: 'DANCE',
    overlay: null,
    reference_video: {
      reference_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      source_platform: 'YOUTUBE',
    },
    broll_shot: null,
  },
  704: {
    guide_type: 'BROLL',
    overlay: { instructions: ['김이 보이도록 옆에서 낮게 찍으세요'] },
    reference_video: null,
    broll_shot: { shot_type: '클로즈업', distance: '근접', angle: '측면' },
  },
  705: {
    guide_type: 'OVERLAY',
    overlay: { instructions: ['가게 앞 길이 함께 보이게 찍으세요'] },
    reference_video: null,
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
  caption:
    '면은 매일 아침 직접 밉니다.\n바지락만 넣고 두 시간 끓인 국물, 한 그릇 9,000원.\n관악구 난곡로 42 · 일요일 휴무',
  hashtags: ['#난곡맛집', '#칼국수', '#관악구맛집', '#손칼국수'],
  post_note: "Instagram 음악 탭에서 'BAD - 최산'을 검색해 1:12 지점부터 붙여주세요.",
  /**
   * 명세 15.1 track (2026-08-24 확정, 챌린지형 FIXED 표본).
   * start_sec 은 **원곡에서의 위치**입니다. 실서버는 당분간 null 을 주지만
   * (곡명 식별 주체 확정 대기) Mock 은 값을 채워 화면을 검증합니다.
   * SUGGESTED·null 케이스는 화면 가드로 처리됩니다.
   */
  track: {
    mode: 'FIXED',
    title: 'BAD',
    artist: '최산',
    start_sec: 72,
    end_sec: 87,
    mood: null,
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

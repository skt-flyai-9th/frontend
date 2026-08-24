/**
 * types.ts — API 명세서의 응답 스키마.
 *
 * ⚠️ 여기 타입은 이미 camelCase 로 변환된 뒤의 모양입니다.
 *    서버는 snake_case 로 주고 convert.ts 가 바꿉니다.
 *    (명세: store_id → 여기: storeId)
 *
 * 명세에 없는 필드는 추측해서 넣지 않습니다.
 * 필요해지면 BE 와 합의하고 명세를 먼저 고칩니다.
 */

/** 명세: ID 는 모두 숫자입니다. */
export type Id = number;

// ══════════════════════════════════════════════════
// R01 계정·초기설정
// ══════════════════════════════════════════════════

export interface OnboardingStep {
  order: number;
  title: string;
  description: string;
}

export interface Terms {
  version: string;
  required: string[];
  optional: string[];
}

export interface OnboardingResponse {
  onboardingSteps: OnboardingStep[];
  terms: Terms;
}

export interface SignupBody {
  email: string;
  phone: string;
  password: string;
  name: string;
  termsAgreed: boolean;
  marketingAgreed: boolean;
}

export interface User {
  id: Id;
  email: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

// ══════════════════════════════════════════════════
// R02 가게 탐색·외부데이터
// ══════════════════════════════════════════════════

export type PlaceSource = 'NAVER' | 'KAKAO';

export interface PlaceResult {
  source: PlaceSource;
  name: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
  category: string;
  distanceM?: number;
  /**
   * 명세 2.1 추가 (2026-08-21 합의).
   * 검색 결과를 골라 등록할 때 2.2 body 의 external_channel_url 로 그대로 넘깁니다.
   * 이게 없으면 BE 가 외부 데이터를 다시 찾아야 합니다.
   */
  externalChannelUrl?: string;
}

export type ImportStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';

export interface ImportItem {
  field: string;
  status: ImportStatus;
}

export interface ImportStatusResponse {
  storeId: Id;
  overallStatus: ImportStatus;
  items: ImportItem[];
}

export interface CreateStoreBody {
  name: string;
  category: string;
  address: string;
  phone?: string;
  infoSource: PlaceSource | 'MANUAL';
  externalChannelUrl?: string;
}

export interface CreateStoreResponse {
  id: Id;
  name: string;
  category: string;
  address: string;
  infoSource: string;
  importStatus: ImportStatus;
  createdAt: string;
}

// ══════════════════════════════════════════════════
// R03 가게 인텔리전스
// ══════════════════════════════════════════════════

/** 명세 1.5 회원정보 (2026-08-23 신설). email 은 로그인 식별자라 수정 불가입니다. */
export interface Me {
  id: Id;
  email: string;
  name: string;
  phone?: string;
  marketingAgreed: boolean;
  createdAt?: string;
}

/**
 * 명세 15.2 완성 숏폼 (2026-08-23 신설) — 마이페이지 그리드.
 *
 * ⚠️ 제목 컬럼이 없습니다. BE 명세에도 "프로젝트에는 제목 개념이 없다" 고
 *    적혀 있어, 카드 라벨은 promotion_purpose 를 씁니다 (BE 문의 중).
 */
export interface StoreShort {
  videoOutputId: Id;
  shortsProjectId: Id;
  promotionPurpose: string;
  videoUrl: string;
  coverImageUrl?: string;
  /** 포맷을 아직 안 골랐으면 null 입니다. */
  durationSec?: number | null;
  /** 프로젝트 기준. R16 게시 기능 붙기 전까지는 항상 false 입니다. */
  isPosted: boolean;
  createdAt: string;
}

export interface Store {
  id: Id;
  name: string;
  category: string;
  subCategory?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  businessHours?: string;
  brandTone?: string;
  brandColor?: string;
  logoUrl?: string;
  infoSource: string;
  externalChannelUrl?: string;
  updatedAt: string;
}

export interface Menu {
  id: Id;
  name: string;
  price?: number;
  description?: string;
  imageUrl?: string;
  isNewMenu?: boolean;
  isEventMenu?: boolean;
  isSoldOut?: boolean;
}

export interface StorePhoto {
  id: Id;
  fileUrl: string;
  category: string;
  hasSensitiveInfo: boolean;
  createdAt: string;
}

/** 명세: 주 / 보조 / 성장 */
export type TargetType = '주' | '보조' | '성장';
/**
 * 명세 3.4 (2026-08-23 확정):
 * SUGGESTED = AI 제안 / CONFIRMED = 사장님 확정 / HIDDEN = 사장님 숨김.
 *
 * ⚠️ 목록 조회는 숨김 타깃도 그대로 포함해 내려줍니다.
 *    화면에서 걸러내는 것은 프론트 몫입니다 — 타깃을 보여주는
 *    모든 화면은 HIDDEN 을 직접 필터해야 합니다.
 */
export type TargetStatus = 'SUGGESTED' | 'CONFIRMED' | 'HIDDEN';
/** 명세: 높음 / 보통 / 낮음 */
export type Confidence = '높음' | '보통' | '낮음';

export interface TargetCustomer {
  id: Id;
  targetType: TargetType;
  targetDescription: string;
  aiConfidence?: Confidence;
  status: TargetStatus;
}

/** 명세: 상권분석 / 카드뉴스 / 성과분석 / 다음숏폼추천 */
export type InsightType = '상권분석' | '카드뉴스' | '성과분석' | '다음숏폼추천';

export interface Insight {
  id: Id;
  insightType: InsightType;
  insightTitle: string;
  insightContent: string;
  /** 명세: 외부데이터 / AI추론 등. 사실과 추측을 구분해 표시하기 위한 값 */
  insightSource: string;
  generatedAt: string;
}

// ══════════════════════════════════════════════════
// R04 캠페인 설정
// ══════════════════════════════════════════════════

/** 명세: DRAFT → ... → 게시 완료까지의 프로젝트 상태 */
export type ShortsStatus =
  | 'DRAFT'
  | 'PLANNING'
  | 'SHOOTING'
  | 'EDITING'
  | 'READY'
  | 'PUBLISHED';

/**
 * 명세 4.1 body.
 * ⚠️ 2026-08-21 변경: '이벤트' → '이벤트알리기', '고객유치' → '고객늘리기'
 */
export type PromotionPurpose = '메뉴소개' | '이벤트알리기' | '가게소개' | '고객늘리기';

// ── 명세 4.2 (2026-08-21 개정) ──────────────────────
// promotion_sub_goal 이 삭제되고 menu_id + promotion_detail 로 바뀌었습니다.
// promotion_detail 의 구조는 promotion_purpose 에 따라 달라집니다.

/** 메뉴소개 */
export type MenuDetailTag = '대표메뉴' | '신메뉴' | '비교' | '제조과정' | '숨은메뉴';
export interface MenuPromotionDetail {
  detailTag: MenuDetailTag;
}

/** 이벤트알리기 */
export interface EventPromotionDetail {
  eventName?: string;
  benefit?: string;
  period?: string;
  condition?: string;
  limit?: string;
  cta?: string;
}

/** 가게소개 — 복수 선택 */
export type StoreElement = '공간' | '위치' | '서비스경험' | '사장님/직원' | '하루브이로그';
export interface StorePromotionDetail {
  elements: StoreElement[];
}

/** 고객늘리기 */
export type CustomerGoal = '신규고객' | '재방문' | '특정시간' | '예약공석' | '신뢰형성';
export interface CustomerPromotionDetail {
  goal: CustomerGoal;
  successMetric?: string;
}

export type PromotionDetail =
  | MenuPromotionDetail
  | EventPromotionDetail
  | StorePromotionDetail
  | CustomerPromotionDetail;

/** 명세 4.2: 전체노출 / 일부노출 / 비노출 */
export type FaceExposureMode = '전체노출' | '일부노출' | '비노출';

export interface ShortsProject {
  id: Id;
  storeId: Id;
  videoFormatId?: Id | null;
  storeTargetCustomerId?: Id | null;
  promotionPurpose: PromotionPurpose;
  /** 메뉴소개일 때만 값이 있습니다. 나머지 목적은 null 입니다. */
  menuId?: Id | null;
  /** 목적별로 구조가 다릅니다. 위 PromotionDetail 참고. */
  promotionDetail?: PromotionDetail | null;
  faceExposureMode?: FaceExposureMode;
  shootingCondition?: string;
  shortsStatus: ShortsStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListItem {
  id: Id;
  promotionPurpose: PromotionPurpose;
  shortsStatus: ShortsStatus;
  updatedAt: string;
}

// ══════════════════════════════════════════════════
// R05 숏폼 포맷 탐색
// ══════════════════════════════════════════════════

/** 명세: 밈 / 잔잔한 소개 등 */
export type FormatType = '밈' | '잔잔한 소개' | '정보형' | '챌린지';
/** 명세: 상 / 중 / 하 */
export type Difficulty = '상' | '중' | '하';
/** 명세: 높음 / 보통 / 낮음 */
export type FaceExposureLevel = '높음' | '보통' | '낮음';

/**
 * 명세 5.1 목록 / 5.2 상세 공통.
 *
 * 5.1 목록과 5.2 상세 모두 reference_url·source_platform 을 포함합니다
 * (2026-08-21 BE 합의로 5.1 에 추가됨).
 * 다만 서버가 값을 못 채울 수 있으므로 화면에서는 없을 때도 처리합니다.
 *
 * ⚠️ 반대로 recommend_reasons 는 5.1 에만 있고 5.2 에는 없습니다.
 */
export interface VideoFormat {
  id: Id;
  formatTitle: string;
  formatType: FormatType;
  expectedDurationSec: number;
  shootingDifficulty: Difficulty;
  faceExposureLevel: FaceExposureLevel;
  /** 5.1 전용. 왜 추천했는지. 점수가 아니라 이유를 보여줍니다. */
  recommendReasons?: string[];
  /** 참고 영상 주소. 목록·상세 모두 제공됩니다. */
  referenceUrl?: string;
  /** 썸네일 추출 방식이 플랫폼마다 달라 함께 받습니다. */
  sourcePlatform?: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
  /** 5.3 (2026-08-23): 이 계정이 찜했는지. 5.1·5.2 응답에 포함됩니다. */
  isFavorite?: boolean;
}

// ══════════════════════════════════════════════════
// R06 돋보기 질문형 생성
// ══════════════════════════════════════════════════

export interface QuizQuestion {
  id: string;
  type: 'single_choice' | 'multi_choice' | 'free_text';
  question: string;
  options?: string[];
}

export interface QuizAnswer {
  questionId: string;
  answer: string;
}

export interface RecommendedFormat {
  videoFormatId: Id;
  formatType: FormatType;
  reason: string;
  expectedDurationSec: number;
}

export interface QuizAlternative {
  videoFormatId: Id;
  formatType: FormatType;
  reason: string;
  /**
   * 명세 6.3 (2026-08-21 추가) — 5.1 과 동일 필드.
   * 대안이 조건(예: "얼굴 없이")을 실제로 만족하는지 카드에서 바로
   * 확인할 수 있게 합니다. 5.2 단건 조회로 들어가지 않아도 됩니다.
   * BE 배포 전 응답에는 없을 수 있어 optional 로 둡니다.
   */
  expectedDurationSec?: number;
  shootingDifficulty?: Difficulty;
  faceExposureLevel?: FaceExposureLevel;
}

// ══════════════════════════════════════════════════
// R07 포맷 분석·가게 맞춤화
// ══════════════════════════════════════════════════

export interface ShootingSummary {
  expectedDurationSec: number;
  requiredPeople: number;
  props: string[];
  difficulty: Difficulty;
}

/**
 * 명세 7.1 (2026-08-21 개정)
 *
 * 기획 화면에서 대사를 바로 확인·수정할 수 있도록 id 와 scene_dialogue 가 포함됩니다.
 * scene_subtitle 은 여기 없습니다 — 자막은 콘티 화면(7.2)의 몫입니다.
 */
export interface ScenePreview {
  /** 수정 시 PATCH /scenes 에 그대로 넘길 id */
  id: Id;
  sceneOrder: number;
  sceneDescription: string;
  /** 이 장면에서 할 말. 수정은 7.2 PATCH 를 재사용합니다. */
  sceneDialogue: string;
  targetDurationSec: number;
}

export interface PlanResponse {
  shootingSummary: ShootingSummary;
  scenesPreview: ScenePreview[];
}

/** 명세 7.2: 콘티 한 장면. scene_dialogue 가 자막 원문이 됩니다. */
export interface StoryboardScene {
  id: Id;
  sceneOrder: number;
  sceneDescription: string;
  /** 화면에 들어갈 말. TTS 를 쓰지 않으므로 자막 원문으로 씁니다. */
  sceneDialogue: string;
  /** 실제로 화면에 찍히는 자막 문구 */
  sceneSubtitle: string;
  shotType: string;
  targetDurationSec: number;
}

// ══════════════════════════════════════════════════
// R08~R12 촬영
// ══════════════════════════════════════════════════

/** 명세 8.1: 영상촬영 / B-roll 등 */
export type TaskType = '영상촬영' | 'B-roll' | '사진촬영' | '음성녹음';
/**
 * 명세 8.2 (2026-08-20): shooting_tasks.task_status ENUM
 *
 * ⚠️ SKIPPED 는 없습니다. 건너뛰기·교체가 MVP 스코프에서 제외되었습니다.
 *
 * RETAKE_NEEDED
 *   AI 촬영 평가(13.x)에서 "다시 찍는 게 좋다" 판정이 났을 때 붙습니다.
 *   찍긴 찍은 상태라 편집은 진행할 수 있습니다.
 *   재촬영하면 DONE 으로 바뀝니다.
 */
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'RETAKE_NEEDED';

export interface ShootTask {
  id: Id;
  sceneId: Id;
  taskType: TaskType;
  taskTitle: string;
  taskStatus: TaskStatus;
  displayOrder: number;
}

export interface TaskBoard {
  progressRate: number;
  estimatedRemainingMin: number;
  tasks: ShootTask[];
}

/**
 * 명세 9.1 (2026-08-20 개정)
 *
 * ⚠️ 값이 바뀌었습니다: EMBED → DANCE, SHOTLIST → BROLL
 *
 *   OVERLAY → 구도 지시문이 주역
 *   DANCE   → 참고 영상이 주역 (R10 안무 가이드)
 *   BROLL   → 샷 정보가 주역
 */
export type GuideType = 'OVERLAY' | 'DANCE' | 'BROLL';

/**
 * 안무 가이드 참고 영상 (명세 9.1).
 *
 * 명세: "프로젝트가 선택한 video_formats.reference_url·source_platform 을
 *        그대로 재사용합니다. 배속·구간반복 등 재생 제어는 프론트에서
 *        YouTube IFrame Player API 로 처리하고 서버는 영상 링크·출처만 내려줍니다."
 *
 * ⚠️ start_sec / end_sec 는 없습니다.
 *    구간반복 범위는 사장님이 화면에서 직접 잡습니다.
 */
export interface GuideReferenceVideo {
  referenceUrl: string;
  sourcePlatform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
}

export interface TaskGuide {
  guideType: GuideType;
  overlay?: { instructions: string[] } | null;
  referenceVideo?: GuideReferenceVideo | null;
  brollShot?: {
    shotType: string;
    distance: string;
    angle: string;
  } | null;
}

export type FootageType = 'VIDEO' | 'PHOTO' | 'AUDIO';

export interface FootageResponse {
  taskId: Id;
  footageUrl: string;
  footageType: FootageType;
  footageDurationSec: number;
  taskStatus: TaskStatus;
}

/** 명세 9.3: 자동저장·이어하기 */
export type CurrentStep =
  | 'SETUP'
  | 'FORMAT'
  | 'PLANNING'
  | 'SHOOTING'
  | 'EDITING'
  | 'PUBLISH';

export interface Draft {
  projectId: Id;
  lastSavedAt: string;
  currentStep: CurrentStep;
  clientState?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════
// R13 AI 촬영 평가
// ══════════════════════════════════════════════════

export interface EvaluateResponse {
  taskId: Id;
  aiEvalScore: number;
  aiIsUsable: boolean;
  aiEvalIssues: string;
  aiEvaluatedAt: string;
}

/**
 * 명세 13.2
 * 기능명세 규칙: "점수보다 수정사항 1개를 우선한다"
 * → 화면에서는 총점을 크게 띄우지 않고 mustRetakeIssues 를 먼저 보여줍니다.
 */
export interface Evaluation {
  taskId: Id;
  totalScore: number;
  isUsable: boolean;
  mustRetakeIssues: string[];
  fixableByEditing: string[];
  okReasons: string[];
}

// ══════════════════════════════════════════════════
// R14 AI 자동편집
// ══════════════════════════════════════════════════

export type RenderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type TargetPlatform = 'INSTAGRAM' | 'YOUTUBE' | 'NAVER';

/**
 * 명세 14.1 편집 시작 실패 (400 TASKS_INCOMPLETE)
 *
 * 프로젝트의 모든 태스크가 footage_url 을 가져야 편집이 시작됩니다.
 * "필수/선택 구분 없이 전부" 입니다 — 건너뛰기가 없어졌기 때문입니다.
 */
export interface IncompleteTask {
  id: Id;
  taskTitle: string;
}

export interface EditStartResponse {
  videoOutputId: Id;
  renderStatus: RenderStatus;
}

export interface TimelineItem {
  sceneOrder: number;
  durationSec: number;
  effect: string;
}

export interface EditResult {
  videoOutputId: Id;
  renderStatus: RenderStatus;
  progressPercent: number;
  previewVideoUrl?: string;
  timelineSummary?: TimelineItem[];
}

export interface ReviseBody {
  requestType: 'quick_button' | 'free_text';
  action: string;
}

export interface ReviseResponse {
  videoOutputId: Id;
  renderStatus: RenderStatus;
  revisionId: Id;
}

// ══════════════════════════════════════════════════
// R15 최종 체크·출력
// ══════════════════════════════════════════════════

export interface VideoOutput {
  id: Id;
  targetPlatform: TargetPlatform;
  resolution: string;
  hasLicensedAudio: boolean;
  renderStatus: RenderStatus;
  videoUrl: string;
  coverImageUrl?: string;
}

/**
 * 명세 15.1 track (2026-08-24 확정).
 *
 * 저작권 때문에 배경음악은 영상에 입히지 않습니다 — 플랫폼 음원 라이선스는
 * 그 플랫폼 안에서만 유효합니다. 사장님이 올릴 때 직접 붙이고, 우리는
 * "무슨 곡을, 원곡의 몇 초부터" 를 알려드립니다.
 *
 * ⚠️ startSec 은 **원곡에서의 위치**입니다(완성 영상 기준 아님). 인스타에서
 *    음원을 붙이면 0:00 부터가 기본이라, 슬라이더를 이 지점으로 밀어야
 *    챌린지에서 들리던 그 부분이 나옵니다.
 * ⚠️ 값은 당분간 null 로 옵니다(곡명 식별 주체 확정 대기). 구조는 확정.
 */
export interface Track {
  /** FIXED = 곡이 정해진 챌린지 포맷 / SUGGESTED = 분위기만 추천 */
  mode: 'FIXED' | 'SUGGESTED';
  title: string | null;
  artist: string | null;
  startSec: number | null;
  endSec: number | null;
  mood: string | null;
}

export interface PublishKit {
  caption: string;
  hashtags: string[];
  /** 명세 15.1: 음원을 붙이는 절차 안내 */
  postNote?: string;
  /** null 이면 음원 카드를 숨깁니다 (명세 지시) */
  track?: Track | null;
}

export interface OutputsResponse {
  outputs: VideoOutput[];
  publishKit?: PublishKit;
}

// ══════════════════════════════════════════════════
// R16 SNS 연동·게시
// ══════════════════════════════════════════════════

export type SnsPlatform = 'INSTAGRAM' | 'YOUTUBE' | 'NAVER';
/** 명세 16.2: HANDOFF = 앱을 열어주고 사장님이 직접 올림 */
export type PublishMode = 'HANDOFF' | 'DIRECT';
export type PostStatus = 'PENDING_LINK' | 'LINKED' | 'FAILED';

export interface SnsConnection {
  id: Id;
  snsPlatform: SnsPlatform;
  snsAccountName: string;
  tokenExpiresAt: string;
}

/**
 * 명세 16.2 게시하기 응답.
 * ⚠️ 16.3 조회(SnsPost)와 키가 다릅니다. 여기는 sns_post_id, 저기는 id 입니다.
 */
export interface PublishResponse {
  snsPostId: Id;
  postPlatform: SnsPlatform;
  postStatus: PostStatus;
  createdAt: string;
}

export interface SnsPost {
  id: Id;
  postPlatform: SnsPlatform;
  postStatus: PostStatus;
  externalPostId?: string;
  postedAt?: string;
  createdAt: string;
}

// ══════════════════════════════════════════════════
// R17 성과분석·학습
// ══════════════════════════════════════════════════

export interface Metric {
  metricName: string;
  metricValue: number;
  collectedAt: string;
}

export interface ComparisonItem {
  snsPostId: Id;
  /**
   * 명세 17.2 (2026-08-24): 분모 지표가 없으면 null 입니다. 0 이 아닙니다 —
   * "계산할 수 없음"과 "비율이 0"은 다른 사실입니다. 화면은 '—' 로 표시.
   * YouTube 는 reach·saves 가 없어 두 값이 항상 null 입니다.
   */
  viewRate: number | null;
  saveRate: number | null;
  daysSincePosted: number;
  /** 표본이 적으면 '낮음'. 화면에서 반드시 함께 표시합니다. */
  confidence: Confidence;
}

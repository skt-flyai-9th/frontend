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
  /** 기준 좌표(2.1 Param lat·lng)를 안 보내면 null 로 옵니다. 0 이 아닙니다. */
  distanceM?: number | null;
  /**
   * 명세 2.1 추가 (2026-08-21 합의).
   * 검색 결과를 골라 등록할 때 2.2 body 의 external_channel_url 로 그대로 넘깁니다.
   * 이게 없으면 BE 가 외부 데이터를 다시 찾아야 합니다.
   */
  externalChannelUrl?: string;
  /**
   * 명세 2.1 추가 (2026-08-25). **카카오 후보에만** 값이 있고 네이버는 null 입니다.
   *
   * ⚠️ 화면에 보여줄 값이 아닙니다. 2.2 등록 때 그대로 돌려보내면 BE 가
   *    가게 대표메뉴 자동 수집을 트리거하는 데만 씁니다. 저장되지 않고,
   *    3.2 메뉴 조회 응답에도 나타나지 않습니다.
   *
   * external_channel_url 과 따로 둔 이유(명세):
   *   그 필드는 NAVER·KAKAO 어느 쪽이든 채울 수 있어 병합 때 카카오 링크가
   *   밀려 사라질 수 있습니다. 이 필드는 카카오만 채우므로 그 충돌이 없습니다.
   *
   * 숫자처럼 보이지만 **문자열**입니다("98765").
   */
  kakaoPlaceId?: string | null;
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
  /**
   * 명세 2.2 추가 (2026-08-23). 선택입니다.
   * 2.1 검색 결과의 좌표를 그대로 넘기면 stores 에 저장됩니다.
   * 직접입력 경로(StoreManual)는 좌표를 모르므로 생략합니다.
   */
  latitude?: number;
  longitude?: number;
  /**
   * 명세 2.2 추가 (2026-08-25). 선택입니다.
   * 2.1 응답의 같은 필드를 **그대로 돌려보냅니다** — 프론트가 값을 계산하거나
   * 다시 조회하지 않습니다. 사장님이 고른 후보 객체를 되돌려주는 것뿐입니다.
   *
   * 없어도 등록에는 지장이 없습니다(그 경우 대표메뉴는 3.2 에서 직접 입력).
   * 저장되지 않고 대표메뉴 자동 수집 트리거에만 쓰이고 버려지므로,
   * Store 타입에는 넣지 않습니다.
   */
  kakaoPlaceId?: string | null;
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
 * ✅ 2026-08-26: project_title 이 4.1·4.3·15.2 에 모두 추가됐습니다.
 *    (문의해 두었던 "제목 컬럼 없음" 건의 답입니다 — 이제 있습니다.)
 */
export interface StoreShort {
  videoOutputId: Id;
  shortsProjectId: Id;
  /** 명세 15.2 (2026-08-26). 렌더까지 끝난 항목이라 보통 값이 있습니다. */
  projectTitle?: string | null;
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

/**
 * 명세 3.3 사진 분류. 실서버 PhotoCategory enum 그대로입니다 (2026-08-26 대조).
 * ⚠️ '음식' 이 아니라 '메뉴' 입니다. 예전 값으로 올리면 422 입니다.
 */
export const PHOTO_CATEGORIES = ['간판', '외관', '내부', '메뉴', '제조·시술', '인물', '기타'] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export interface StorePhoto {
  id: Id;
  fileUrl: string;
  category: PhotoCategory | string;
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

/**
 * 프로젝트 상태.
 *
 * ⚠️ 2026-08-26 실서버(OpenAPI) 대조로 **3개로 정정**했습니다.
 *    이전에는 DRAFT/PLANNING/SHOOTING/EDITING/READY/PUBLISHED 6개로 적어 뒀는데
 *    서버 ShortsStatus enum 은 아래 셋뿐입니다. 없는 값을 비교하던 코드는
 *    영원히 거짓이 되므로(조용한 실패) 타입을 서버에 맞춥니다.
 *    세부 단계는 9.3 draft 의 current_step 이 따로 들고 있습니다.
 */
export type ShortsStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';

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
  /**
   * 명세 4.3 추가 (2026-08-26). AI 가 7.1 기획 때 지어주는 제목입니다.
   *
   * ⚠️ **7.1 이전에는 null 입니다.** 사장님이 직접 입력하는 값이 아닙니다.
   *    화면에서는 {@link projectLabel} 로 promotionPurpose 폴백을 거쳐 쓰세요.
   */
  projectTitle?: string | null;
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
  /** 명세 4.1·4.3·15.2 (2026-08-26). {@link projectLabel} 로 표시하세요. */
  projectTitle?: string | null;
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
  /** 얼굴 촬영이 포맷 재현에 필수인지 여부. */
  requiresFace?: boolean;
  /** 5.1 전용. 왜 추천했는지. 점수가 아니라 이유를 보여줍니다. */
  recommendReasons?: string[];
  /**
   * **대표 영상** 주소 — 이 유행이 어떤 건지 보여주는 영상입니다. 홈·관심 목록 카드가 씁니다.
   * 목록·상세 모두 제공됩니다.
   */
  referenceUrl?: string;
  /**
   * **가이드 영상** 주소 — 따라 찍을 때 보는 영상입니다. 촬영 준비·촬영 중 PiP 가 씁니다.
   *
   * 대표 영상과 다를 수 있습니다(AI 트렌드 클러스터가 두 주소를 따로 갖습니다).
   * 트렌드 연동 전에 들어온 포맷에는 없습니다 — 고를 때는 `api/formatVideo.ts` 를 쓰세요.
   */
  guideVideoUrl?: string;
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
  requiresFace?: boolean;
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
 * 명세: "프로젝트가 선택한 video_formats 의 영상 주소·source_platform 을
 *        그대로 재사용합니다. 재생 제어는 프론트에서 처리하고 서버는 영상 링크·출처만
 *        내려줍니다."
 *
 * 2026-08-26: 그 "프론트 처리" 를 **유튜브 자체 컨트롤에 위임**하는 것으로 바꿨습니다.
 *             배속은 유튜브 설정 메뉴가, 탐색은 진행바가 담당합니다.
 *
 * ⚠️ start_sec / end_sec 는 없습니다.
 *    구간반복 기능도 없습니다 — 유튜브 임베드가 제공하지 않는 기능이라
 *    우리가 흉내 내던 것을 걷어냈습니다(2026-08-26). 되감기는 진행바로 합니다.
 */
export interface GuideReferenceVideo {
  /**
   * ⚠️ 이름은 reference 지만 **가이드 영상**이 와야 하는 자리입니다 — 촬영 중에 트는
   *    영상이라서입니다. 서버가 아직 대표 영상을 보낼 수 있어, 화면에서는 이 값이
   *    없을 때 `formatVideo.guideVideoUrl(format)` 으로 떨어집니다.
   */
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

/** ⚠️ 서버 enum 은 PHOTO 가 아니라 IMAGE 입니다 (2026-08-26 실서버 대조). */
export type FootageType = 'VIDEO' | 'IMAGE' | 'AUDIO';

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
// R06 대화형 숏폼 Agent
// ══════════════════════════════════════════════════

export type ShortformAction =
  | 'ASK'
  | 'SAVE_AND_ASK'
  | 'CLARIFY'
  | 'SUGGEST_SWITCH'
  | 'RESOLVE_CONFLICT'
  | 'CONFIRM'
  | 'RECOMMEND';

export interface ShortformOption {
  id: string;
  label: string;
}

export interface ShortformRecommendation {
  recommendationId: string;
  projectTitle: string;
  title: string;
  concept: string;
  editingTemplateId: string;
  editingTemplateVersion: number;
}

export interface ShortformSessionResponse {
  id: Id;
  status: 'ACTIVE' | 'ACCEPTED' | 'DISCARDED';
  assistantMessage?: string;
  options: ShortformOption[];
  projectState: Record<string, unknown>;
}

export interface ShortformTurnResponse {
  id: Id;
  action: ShortformAction;
  assistantMessage?: string;
  options: ShortformOption[];
  projectState: Record<string, unknown>;
  /**
   * 추천은 **배열**입니다 (2026-08-26 실서버 대조로 정정).
   *
   * 서버 응답 키가 `recommendations` 이고, 추천이 아직 없는 턴에서도 `[]` 로 옵니다.
   * 단수 `recommendation` 으로 읽으면 **항상 undefined** 라 추천이 영영 안 뜹니다.
   * 시안(`image (1).png`)이 카드 세 장인 것도 이 배열을 전제로 한 그림입니다.
   */
  recommendations?: ShortformRecommendation[];
}

export type ShortformTurnInput =
  | { type: 'TEXT'; text: string }
  | { type: 'OPTION'; optionId: string }
  | { type: 'CONFIRM'; value: boolean };

export interface ShortformAcceptResponse {
  id: Id;
  storeId: Id;
  projectTitle?: string;
  videoFormatId: Id;
  promotionPurpose: PromotionPurpose;
  menuId?: Id;
  shortsStatus: ShortsStatus;
  createdAt: string;
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
  /**
   * ⚠️ 자연어 요청의 값은 'free_text' 가 **아니라** 'natural_language' 입니다
   *    (2026-08-26 실서버 ReviseRequestType enum 대조). 예전 값으로 보내면 422 입니다.
   */
  requestType: 'quick_button' | 'natural_language';
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

/**
 * 게시·연동 플랫폼.
 *
 * ⚠️ 서버 SnsPlatform enum 은 **INSTAGRAM·YOUTUBE 둘뿐**입니다 (2026-08-26 실서버 대조).
 *    BE 공지에는 NAVER Clip·TikTok 도 게시 가능하다고 적혀 있지만 아직 배포 전이라,
 *    타입은 실제로 받아주는 값에 맞춥니다. 열리면 여기에 추가하면 됩니다.
 */
export type SnsPlatform = 'INSTAGRAM' | 'YOUTUBE';
/** 명세 16.2: HANDOFF = 앱을 열어주고 사장님이 직접 올림 */
export type PublishMode = 'HANDOFF' | 'DIRECT';
/** ⚠️ 서버 enum 에 FAILED 는 없습니다 (2026-08-26 실서버 대조). */
export type PostStatus = 'PENDING_LINK' | 'LINKED';

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

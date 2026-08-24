/**
 * types.ts — 네비게이션 파라미터 타입.
 *
 * 스택을 도메인별로 나눈 이유:
 *   화면이 40개가 넘으면 하나의 스택에 전부 나열할 수 없습니다.
 *   Root 는 5개 흐름만 알고, 세부 화면은 각 스택이 관리합니다.
 *
 * 화면 간 데이터는 파라미터로 id 만 넘깁니다.
 * 객체를 통째로 넘기면 뒤로가기 후 값이 낡습니다. id 로 다시 조회하는 게 안전합니다.
 */
import type { NavigatorScreenParams } from '@react-navigation/native';

/** 앱 최상위 — 5개 흐름 */
export type RootStackParamList = {
  /**
   * 내 숏폼 전체화면 뷰어 (15.2).
   *
   * ⚠️ 탭 안(MyStack)에 두면 안 됩니다 — 탭 내부 스택의 fullScreenModal 은
   *    **탭바를 가리지 못해서**, 영상 하단 정보가 탭바에 깔립니다
   *    (2026-08-24 실기기 확인). 그래서 Root 에 둡니다.
   */
  MyVideo: { videoOutputId?: number } | undefined;
  /**
   * 알림 (시안 HomeHeader 의 벨).
   *
   * 탭 안이 아니라 Root 에 둡니다 — 홈 탭에서 열리는데 마이 탭 스택에 넣으면
   * 여는 순간 탭이 바뀌어 버립니다. 뒤로가기로 홈에 그대로 돌아와야 합니다.
   */
  Notifications: undefined;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  StoreSetup: NavigatorScreenParams<StoreSetupStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Create: NavigatorScreenParams<CreateStackParamList>;
};

/** 최초 실행 안내 */
export type OnboardingStackParamList = {
  Intro: undefined;
  /**
   * mode 가 없으면 최초 가입 흐름(동의를 받고 로그인으로 넘어감).
   * 'read' 면 설정에서 다시 보는 읽기 전용입니다 — 동의를 다시 받지 않습니다.
   */
  Terms: { mode?: 'read'; focus?: 'terms' | 'privacy' } | undefined;
};

/** 계정 */
export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

/** 가게 등록 (최초 1회) */
export type StoreSetupStackParamList = {
  StoreSearch: undefined;
  StoreManual: undefined;
  StoreConfirm: { storeId: number };
};

/**
 * 평상시 홈 — 탭 4개 (2026-08-23 프로토타입 확정: 홈·관심목록·AI추천·마이).
 * BE 문서 한 곳의 "탭 5개" 언급은 프로토타입 코드(4개)와 어긋나
 * 프로토타입을 따랐습니다 (신규화면_인수인계 §1).
 * 탭바는 이 4개 화면에서만 보이고, 나머지는 전체화면 + 뒤로가기입니다.
 */
export type MainTabParamList = {
  HomeFeed: undefined;
  Favorites: undefined;
  AiChat: undefined;
  My: NavigatorScreenParams<MyStackParamList>;
};

/**
 * 마이 탭 하위 스택.
 * 기존 "우리 가게" 탭의 6개 화면과 "반응 보기"·"설정" 이 여기로 이사했습니다.
 * 화면 자체는 그대로고 진입 경로만 바뀌었습니다 (인수인계 §2).
 */
export type MyStackParamList = {
  MyPage: undefined;
  // ── 기존 StoreStack 6개 (지우지 않고 옮김) ──
  StoreOverview: undefined;
  StoreEdit: undefined;
  MenuManage: undefined;
  PhotoManage: undefined;
  TargetManage: undefined;
  SnsConnect: undefined;
  // ── 기존 탭에서 옮겨온 것 ──
  Performance: undefined;
  Settings: undefined;
  // ── 신규 ──
  Insight: undefined;
  Faq: undefined;
  PermissionsInfo: undefined;
  /** 약관·정책 목록 (시안 legal) */
  Legal: undefined;
  /** 프로필 수정 — 3.1(가게) + 3.6(로고) + 16.1(SNS) + 1.5(계정) 을 한 화면에 */
  EditProfile: undefined;
  /** 플랜 안내 — 정적 화면 (플랜 API 없음) */
  Plans: undefined;
};

/** 숏폼 만들기 — 목적부터 게시까지 하나의 긴 흐름 */
export type CreateStackParamList = {
  // R04 설정
  /**
   * formatId 가 있으면 홈 피드에서 포맷을 먼저 고른 흐름입니다 (BE 확정:
   * 포맷 선택 → 목적 선택 → 4.1 생성 → 7.1 기획). 설정 화면들을 지나
   * PathChoice 를 건너뛰고 곧장 PlanSummary 로 갑니다.
   */
  PurposeSelect: { formatId?: number } | undefined;
  /** 명세 4.2 (2026-08-21) — 목적별 상세 정보 */
  PromotionDetail: { projectId: number; formatId?: number };
  TargetSelect: { projectId: number; formatId?: number };
  ShootCondition: { projectId: number; formatId?: number };

  // 갈림길
  PathChoice: { projectId: number };

  // R06 질문형
  Quiz: { projectId: number };
  QuizResult: { projectId: number };

  // R05 직접 고르기
  FormatFeed: { projectId: number };
  /** projectId 가 없으면 '둘러보기' 모드입니다. 홈에서 바로 들어옵니다. */
  FormatDetail: { projectId?: number; formatId: number };

  // R07 기획
  PlanSummary: { projectId: number; formatId: number };
  Storyboard: { projectId: number };
  SubtitleEdit: { projectId: number };

  // R08~R13 촬영
  TaskBoard: { projectId: number };
  TaskGuide: { projectId: number; taskId: number };
  Camera: { projectId: number; taskId: number };
  /** 안무 태스크 전용 — 참고 영상(위) + 카메라(아래). YouTube 참고 영상일 때만. */
  DanceCamera: { projectId: number; taskId: number };
  TakeReview: { projectId: number; taskId: number; uri: string; durationSec: number };
  Evaluation: { projectId: number; taskId: number };

  // R14~R15 편집·출력
  /** 명세 14.1 target_platform. 안 주면 화면에서 고르게 합니다. */
  Render: { projectId: number; platform?: 'INSTAGRAM' | 'YOUTUBE' | 'NAVER' };
  EditResult: { projectId: number };
  Outputs: { projectId: number };

  // R16 게시
  Publish: { projectId: number; outputId: number };
  PostLink: { postId: number; platform: 'INSTAGRAM' | 'YOUTUBE' | 'NAVER' };
};

/** 가게 정보 관리 — 탭 안에서 쌓입니다 */
export type StoreStackParamList = {
  StoreOverview: undefined;
  StoreEdit: undefined;
  MenuManage: undefined;
  PhotoManage: undefined;
  TargetManage: undefined;
  SnsConnect: undefined;
};

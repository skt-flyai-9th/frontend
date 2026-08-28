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
  /** 매장 인사이트 분석 — 시안에 탭바가 없어 탭 밖입니다. */
  Insight: undefined;
  /**
   * 프로필 수정 — 3.1(가게) + 3.6(로고) + 16.1(SNS) + 1.5(계정) 을 한 화면에.
   * 시안에 하단 탭바가 없고 저장하기 버튼이 화면 맨 아래에 옵니다.
   * 탭 안에 두면 탭바가 그 자리를 먹어 저장하기가 화면 밖으로 밀립니다.
   */
  /**
   * `connect` 를 주면 그 플랫폼의 **연동 시트를 바로 엽니다** (2026-08-28 사장님 지시).
   * 마이페이지 SNS 줄에서 아직 연동 안 된 쪽을 누르면, 화면만 띄우고 끝내지 않고
   * 사장님이 다음에 할 일(동의 시트)까지 한 번에 열어 줍니다.
   */
  EditProfile: { connect?: 'INSTAGRAM' | 'YOUTUBE' } | undefined;
  /** 플랜 안내 — 정적 화면(플랜 API 없음). 시안에 탭바가 없어 탭 밖입니다. */
  Plans: undefined;
  /**
   * 약관 및 접근 권한 동의 — 가입 직후 단계라 탭 밖입니다.
   * 시안에도 탭바가 없고 헤더에 제목조차 없습니다.
   */
  PermissionsInfo: undefined;
  /** 설정 — 시안에 탭바가 없어 탭 밖입니다. */
  Settings: undefined;
  /**
   * 자주 묻는 질문 — 탭 **밖**입니다.
   * 시안에는 이 화면에 하단 탭바가 없습니다. 탭 안 스택에 두면 탭바가 계속 보여
   * 시안과 어긋납니다(알림 화면과 같은 이유).
   */
  Faq: undefined;
  /**
   * 개인정보 처리방침 본문 — 시안 `LegalScreen(variant="privacy")`.
   * 이용약관(Onboarding/Terms)과 **같은 화면**을 focus 만 바꿔 씁니다.
   * 시안에 탭바가 없어 탭 밖입니다.
   */
  Legal: { focus?: 'privacy' } | undefined;
  /**
   * 최초 실행 튜토리얼 — 앱을 처음 켰을 때 **딱 한 번**만 보입니다.
   *
   * 스택 안이 아니라 Root 에 둡니다. 이 화면은 어느 흐름에도 속하지 않고
   * 그 앞에 한 번 서는 것이라, 어디에 넣어도 뒤로가기로 돌아올 수 있게 됩니다.
   * 다시 뜨지 않게 하는 값은 `lib/appState.ts` 의 `tutorialSeen` 입니다.
   */
  Tutorial: undefined;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  StoreSetup: NavigatorScreenParams<StoreSetupStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Create: NavigatorScreenParams<CreateStackParamList>;
};

/** 최초 실행 안내 */
export type OnboardingStackParamList = {
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

  /** projectId 가 없으면 '둘러보기' 모드입니다. 홈에서 바로 들어옵니다. */
  FormatDetail: { projectId?: number; formatId: number };
  /**
   * taskId 를 안 주면 카메라가 아직 안 찍은 첫 컷부터 시작합니다 (시안 V4).
   *
   * `formatId` 는 **사장님이 방금 고른 포맷**입니다 (2026-08-26 추가).
   * 원래는 프로젝트(4.3)의 `video_format_id` 로 되짚어 참고 영상을 찾았는데,
   * 그 값은 7.1 기획 생성이 성공해야 붙습니다. 실서버 7.1 이 500 을 내는 동안
   * 값이 영영 null 이라 **좌상단 참고 영상 창이 아예 안 떴습니다.**
   * 고른 포맷을 그대로 들고 오면 서버가 어떻든 볼 수 있습니다 —
   * 지어낸 값이 아니라 사장님이 직접 고른 그 포맷입니다.
   */
  Camera: { projectId: number; taskId?: number; formatId?: number };
  /** 안무 태스크 전용 — 참고 영상(위) + 카메라(아래). YouTube 참고 영상일 때만. */
  DanceCamera: { projectId: number; taskId: number; formatId?: number };

  // R14~R15 편집·출력
  /** 명세 14.1 target_platform. 안 주면 화면에서 고르게 합니다. */
  Render: { projectId: number; platform?: 'INSTAGRAM' | 'YOUTUBE' | 'NAVER' };
  EditResult: { projectId: number };
};

/** 가게 정보 관리 — 탭 안에서 쌓입니다 */
export type StoreStackParamList = {
};

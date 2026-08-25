/**
 * RootNavigator.tsx — 앱 전체 흐름.
 *
 * 40개가 넘는 화면을 한 스택에 나열하지 않고 5개 흐름으로 나눴습니다.
 * 여기서는 "어떤 흐름이 있는지"만 보이고, 세부 화면은 각 스택 파일이 관리합니다.
 *
 *   Onboarding → Auth → StoreSetup → Main ⇄ Create
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createSwipeTabNavigator } from './SwipeTabs';
import { navRef, exposeQaNav } from './navRef';

import { useAppState } from '../lib/appState';
import type {
  AuthStackParamList,
  CreateStackParamList,
  MainTabParamList,
  MyStackParamList,
  OnboardingStackParamList,
  RootStackParamList,
  StoreSetupStackParamList,
} from './types';

// 온보딩·계정
import IntroScreen from '../domains/auth/screens/IntroScreen';
import TermsScreen from '../domains/auth/screens/TermsScreen';
import SignInScreen from '../domains/auth/screens/SignInScreen';
import SignUpScreen from '../domains/auth/screens/SignUpScreen';

// 가게
import StoreSearchScreen from '../domains/store/screens/StoreSearchScreen';
import StoreManualScreen from '../domains/store/screens/StoreManualScreen';
import StoreConfirmScreen from '../domains/store/screens/StoreConfirmScreen';
import StoreInfoScreen from '../domains/store/screens/StoreInfoScreen';
import StoreEditScreen from '../domains/store/screens/StoreEditScreen';
import MenuManageScreen from '../domains/store/screens/MenuManageScreen';
import PhotoManageScreen from '../domains/store/screens/PhotoManageScreen';
import TargetManageScreen from '../domains/store/screens/TargetManageScreen';
import SnsConnectScreen from '../domains/store/screens/SnsConnectScreen';

// 탭 4개 (2026-08-23 프로토타입 확정) — 홈피드·관심목록·AI추천·마이
import HomeFeedScreen from '../domains/feed/screens/HomeFeedScreen';
import FavoritesScreen from '../domains/feed/screens/FavoritesScreen';
import AiChatScreen from '../domains/feed/screens/AiChatScreen';
import MyPageScreen from '../domains/my/screens/MyPageScreen';
import InsightScreen from '../domains/my/screens/InsightScreen';
import FaqScreen from '../domains/my/screens/FaqScreen';
import PermissionsInfoScreen from '../domains/my/screens/PermissionsInfoScreen';
import EditProfileScreen from '../domains/my/screens/EditProfileScreen';
import MyVideoScreen from '../domains/my/screens/MyVideoScreen';
import NotificationsScreen from '../domains/my/screens/NotificationsScreen';
import PlansScreen from '../domains/my/screens/PlansScreen';
import LegalScreen from '../domains/my/screens/LegalScreen';
import PerformanceScreen from '../domains/analytics/screens/PerformanceScreen';
import SettingsScreen from '../domains/settings/screens/SettingsScreen';
// 구 홈(가게 분석 + 만들기 CTA)은 파일을 지우지 않고 진입만 끊었습니다.
// 카드뉴스는 인사이트로, 이어하기는 마이로 이사했습니다 (인수인계 §2).

// 만들기 흐름
import PurposeSelectScreen from '../domains/project/screens/PurposeSelectScreen';
import PromotionDetailScreen from '../domains/project/screens/PromotionDetailScreen';
import TargetSelectScreen from '../domains/project/screens/TargetSelectScreen';
import ShootConditionScreen from '../domains/project/screens/ShootConditionScreen';
import PathChoiceScreen from '../domains/project/screens/PathChoiceScreen';
import QuizScreen from '../domains/quiz/screens/QuizScreen';
import QuizResultScreen from '../domains/quiz/screens/QuizResultScreen';
import FormatFeedScreen from '../domains/format/screens/FormatFeedScreen';
import FormatDetailScreen from '../domains/format/screens/FormatDetailScreen';
import PlanSummaryScreen from '../domains/plan/screens/PlanSummaryScreen';
import StoryboardScreen from '../domains/plan/screens/StoryboardScreen';
import SubtitleEditScreen from '../domains/plan/screens/SubtitleEditScreen';
import TaskBoardScreen from '../domains/shoot/screens/TaskBoardScreen';
import TaskGuideScreen from '../domains/shoot/screens/TaskGuideScreen';
import CameraScreen from '../domains/shoot/screens/CameraScreen';
import DanceCameraScreen from '../domains/shoot/screens/DanceCameraScreen';
import TakeReviewScreen from '../domains/shoot/screens/TakeReviewScreen';
import EvaluationScreen from '../domains/shoot/screens/EvaluationScreen';
import RenderScreen from '../domains/edit/screens/RenderScreen';
import EditResultScreen from '../domains/edit/screens/EditResultScreen';
import OutputsScreen from '../domains/publish/screens/OutputsScreen';
import PublishScreen from '../domains/publish/screens/PublishScreen';
import PostLinkScreen from '../domains/publish/screens/PostLinkScreen';

const Root = createNativeStackNavigator<RootStackParamList>();
const Onboard = createNativeStackNavigator<OnboardingStackParamList>();
const Auth = createNativeStackNavigator<AuthStackParamList>();
const StoreSetup = createNativeStackNavigator<StoreSetupStackParamList>();
const Create = createNativeStackNavigator<CreateStackParamList>();
const Tab = createSwipeTabNavigator<MainTabParamList>();
const My = createNativeStackNavigator<MyStackParamList>();

/**
 * 마이 탭 하위 스택.
 * 기존 "우리 가게" 탭의 6개 화면(StoreOverview~SnsConnect)이 그대로 이사했고,
 * 반응 보기·설정·인사이트·FAQ·권한 안내가 합류했습니다. 탭바는 유지됩니다.
 */
function MyStack() {
  return (
    <My.Navigator screenOptions={noHeader}>
      <My.Screen name="MyPage" component={MyPageScreen} />
      <My.Screen name="StoreOverview" component={StoreInfoScreen} />
      <My.Screen name="StoreEdit" component={StoreEditScreen} />
      <My.Screen name="MenuManage" component={MenuManageScreen} />
      <My.Screen name="PhotoManage" component={PhotoManageScreen} />
      <My.Screen name="TargetManage" component={TargetManageScreen} />
      <My.Screen name="SnsConnect" component={SnsConnectScreen} />
      <My.Screen name="Performance" component={PerformanceScreen} />
      <My.Screen name="Settings" component={SettingsScreen} />
      <My.Screen name="PermissionsInfo" component={PermissionsInfoScreen} />
      <My.Screen name="Legal" component={LegalScreen} />
    </My.Navigator>
  );
}

const noHeader = { headerShown: false } as const;

function OnboardingStack() {
  return (
    <Onboard.Navigator screenOptions={noHeader}>
      <Onboard.Screen name="Intro" component={IntroScreen} />
      <Onboard.Screen name="Terms" component={TermsScreen} />
    </Onboard.Navigator>
  );
}

function AuthStack() {
  return (
    <Auth.Navigator screenOptions={noHeader}>
      <Auth.Screen name="SignIn" component={SignInScreen} />
      <Auth.Screen name="SignUp" component={SignUpScreen} />
    </Auth.Navigator>
  );
}

function StoreSetupStack() {
  return (
    <StoreSetup.Navigator screenOptions={noHeader}>
      <StoreSetup.Screen name="StoreSearch" component={StoreSearchScreen} />
      <StoreSetup.Screen name="StoreManual" component={StoreManualScreen} />
      <StoreSetup.Screen name="StoreConfirm" component={StoreConfirmScreen} />
    </StoreSetup.Navigator>
  );
}

/**
 * 평상시 홈 — 탭 4개.
 *
 * 탭바는 시안 사양(라벨 없이 아이콘만 + 스프링 캡슐)이라 기본 탭바를 쓰지 않고
 * ui/TabBar 의 RealsTabBar 로 통째로 갈아 끼웁니다. 화면 구성·라우트 이름은 그대로입니다.
 */
function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="HomeFeed" component={HomeFeedScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="AiChat" component={AiChatScreen} />
      <Tab.Screen name="My" component={MyStack} />
    </Tab.Navigator>
  );
}

function CreateStack() {
  return (
    <Create.Navigator screenOptions={noHeader}>
      {/* R04 설정 */}
      <Create.Screen name="PurposeSelect" component={PurposeSelectScreen} />
      <Create.Screen name="PromotionDetail" component={PromotionDetailScreen} />
      <Create.Screen name="TargetSelect" component={TargetSelectScreen} />
      <Create.Screen name="ShootCondition" component={ShootConditionScreen} />
      <Create.Screen name="PathChoice" component={PathChoiceScreen} />

      {/* R06 질문형 */}
      <Create.Screen name="Quiz" component={QuizScreen} />
      <Create.Screen name="QuizResult" component={QuizResultScreen} />

      {/* R05 직접 고르기 */}
      <Create.Screen name="FormatFeed" component={FormatFeedScreen} />
      <Create.Screen name="FormatDetail" component={FormatDetailScreen} />

      {/* R07 기획 */}
      <Create.Screen name="PlanSummary" component={PlanSummaryScreen} />
      <Create.Screen name="Storyboard" component={StoryboardScreen} />
      <Create.Screen name="SubtitleEdit" component={SubtitleEditScreen} />

      {/* R08~R13 촬영 */}
      <Create.Screen name="TaskBoard" component={TaskBoardScreen} />
      <Create.Screen name="TaskGuide" component={TaskGuideScreen} />
      {/* 녹화 중 제스처로 빠져나가는 사고를 막습니다 */}
      <Create.Screen
        name="Camera"
        component={CameraScreen}
        options={{ gestureEnabled: false, animation: 'fade' }}
      />
      <Create.Screen
        name="DanceCamera"
        component={DanceCameraScreen}
        options={{ gestureEnabled: false, animation: 'fade' }}
      />
      <Create.Screen name="TakeReview" component={TakeReviewScreen} options={{ animation: 'fade' }} />
      <Create.Screen name="Evaluation" component={EvaluationScreen} />

      {/* R14~R15 편집·출력 */}
      <Create.Screen name="Render" component={RenderScreen} options={{ gestureEnabled: false }} />
      <Create.Screen name="EditResult" component={EditResultScreen} />
      <Create.Screen name="Outputs" component={OutputsScreen} />

      {/* R16 게시 */}
      <Create.Screen name="Publish" component={PublishScreen} />
      <Create.Screen name="PostLink" component={PostLinkScreen} />
    </Create.Navigator>
  );
}

export default function RootNavigator() {
  const signedIn = useAppState((s) => s.signedIn);
  const storeId = useAppState((s) => s.storeId);

  // 명세 S01.1.1: 최초 실행 시에만 전체 온보딩을 노출합니다.
  const initial: keyof RootStackParamList = !signedIn
    ? 'Onboarding'
    : !storeId
      ? 'StoreSetup'
      : 'Main';

  return (
    // ref 는 항상 붙입니다(비용 없음). 전역 노출만 EXPO_PUBLIC_QA_NAV=1 에서 일어납니다.
    <NavigationContainer ref={navRef} onReady={exposeQaNav}>
      <Root.Navigator initialRouteName={initial} screenOptions={noHeader}>
        <Root.Screen name="Onboarding" component={OnboardingStack} />
        <Root.Screen name="Auth" component={AuthStack} />
        <Root.Screen name="StoreSetup" component={StoreSetupStack} />
        <Root.Screen name="Main" component={MainTabs} />
        <Root.Screen name="Create" component={CreateStack} />
      {/* 내 숏폼 뷰어 — 탭바 위를 완전히 덮어야 해서 Root 에 있습니다 (types.ts 참고) */}
      {/* 알림 — 홈 탭의 벨에서 열립니다. 뒤로가면 홈 그대로 (types.ts 참고) */}
      <Root.Screen name="Notifications" component={NotificationsScreen} />
      {/* 시안: 이 화면들에는 하단 탭바가 없습니다 */}
      <Root.Screen name="Faq" component={FaqScreen} />
      <Root.Screen name="Insight" component={InsightScreen} />
      <Root.Screen name="EditProfile" component={EditProfileScreen} />
      <Root.Screen name="Plans" component={PlansScreen} />
      <Root.Screen
        name="MyVideo"
        component={MyVideoScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
      </Root.Navigator>
    </NavigationContainer>
  );
}

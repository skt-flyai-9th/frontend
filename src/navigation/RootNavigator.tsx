/**
 * RootNavigator.tsx — 앱 전체 흐름.
 *
 * 40개가 넘는 화면을 한 스택에 나열하지 않고 5개 흐름으로 나눴습니다.
 * 여기서는 "어떤 흐름이 있는지"만 보이고, 세부 화면은 각 스택 파일이 관리합니다.
 *
 *   Onboarding → Auth → StoreSetup → Main ⇄ Create
 */
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Heart, Sparkles, Store } from 'lucide-react-native';

import theme, { color, radius, space } from '../design/theme';
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
import PlansScreen from '../domains/my/screens/PlansScreen';
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
const Tab = createBottomTabNavigator<MainTabParamList>();
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
      <My.Screen name="Insight" component={InsightScreen} />
      <My.Screen name="Faq" component={FaqScreen} />
      <My.Screen name="PermissionsInfo" component={PermissionsInfoScreen} />
      <My.Screen name="EditProfile" component={EditProfileScreen} />
      <My.Screen name="Plans" component={PlansScreen} />
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
 * 탭 아이콘 — 가이드라인 §4·§5.8.
 *
 * 이모지 글리프는 쓰지 않습니다(기기마다 모양이 달라 브랜드가 안 잡힘).
 * 크기 26 / 비활성 stroke 1.75·slate / 활성 stroke 2 + 옅은 채움.
 * 활성색은 브랜드 파랑이지만 **관심목록 탭만 하트 빨강**입니다.
 */
function TabIcon({
  Icon,
  focused,
  activeColor,
  fillWhenActive = 0.12,
}: {
  Icon: typeof Home;
  focused: boolean;
  activeColor: string;
  fillWhenActive?: number;
}) {
  return (
    <Icon
      size={26}
      strokeWidth={focused ? 2 : 1.75}
      color={focused ? activeColor : color.ink[500]}
      fill={focused ? activeColor : 'transparent'}
      fillOpacity={focused ? fillWhenActive : 0}
    />
  );
}

/** 활성 탭 위에 뜨는 인디케이터 바 (폭 32 · 높이 4 · pill) */
function TabIndicator({ focused, tint }: { focused: boolean; tint: string }) {
  if (!focused) return null;
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        width: 32,
        height: 4,
        borderRadius: radius.pill,
        backgroundColor: tint,
      }}
    />
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();

  /**
   * 탭바가 기기 제스처 바(홈 인디케이터) 위에 겹치면 터치가 씹힙니다.
   * 높이를 64 로 고정하면 안 되고, 기기가 알려주는 하단 안전영역만큼
   * 실제 높이를 늘리고 그만큼 아래 여백을 줘야 합니다.
   *
   *   전체 높이 = 콘텐츠 58 + 안전영역
   *   → 버튼은 안전영역 위쪽에만 그려지고, 아래는 제스처 바가 씁니다.
   *
   * insets.bottom 은 제스처 내비게이션 기기에서 20~34, 버튼 방식이면 0 입니다.
   * 0 일 때도 손가락이 화면 끝에 닿지 않도록 최소 8 은 확보합니다.
   */
  const bottomInset = Math.max(insets.bottom, space[2]);
  const TAB_CONTENT_HEIGHT = 58;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.brand[600],
        tabBarInactiveTintColor: color.ink[500],
        tabBarLabelStyle: { ...theme.text.micro },
        tabBarItemStyle: { paddingTop: space[2] },
        tabBarStyle: {
          height: TAB_CONTENT_HEIGHT + bottomInset,
          paddingBottom: bottomInset,
          borderTopColor: color.ink[200],
          backgroundColor: color.paper,
        },
      }}
    >
      <Tab.Screen
        name="HomeFeed"
        component={HomeFeedScreen}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ focused }) => (
            <>
              <TabIndicator focused={focused} tint={color.brand[600]} />
              <TabIcon Icon={Home} focused={focused} activeColor={color.brand[600]} />
            </>
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarLabel: '관심목록',
          // 가이드라인 §5.8: 관심목록만 활성색이 하트 빨강이고, 채움도 100% 입니다.
          tabBarActiveTintColor: color.danger[500],
          tabBarIcon: ({ focused }) => (
            <>
              <TabIndicator focused={focused} tint={color.danger[500]} />
              <TabIcon
                Icon={Heart}
                focused={focused}
                activeColor={color.danger[500]}
                fillWhenActive={1}
              />
            </>
          ),
        }}
      />
      <Tab.Screen
        name="AiChat"
        component={AiChatScreen}
        options={{
          tabBarLabel: 'AI 추천',
          tabBarIcon: ({ focused }) => (
            <>
              <TabIndicator focused={focused} tint={color.brand[600]} />
              <TabIcon Icon={Sparkles} focused={focused} activeColor={color.brand[600]} />
            </>
          ),
        }}
      />
      <Tab.Screen
        name="My"
        component={MyStack}
        options={{
          tabBarLabel: '마이',
          tabBarIcon: ({ focused }) => (
            <>
              <TabIndicator focused={focused} tint={color.brand[600]} />
              <TabIcon Icon={Store} focused={focused} activeColor={color.brand[600]} />
            </>
          ),
        }}
      />
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
    <NavigationContainer>
      <Root.Navigator initialRouteName={initial} screenOptions={noHeader}>
        <Root.Screen name="Onboarding" component={OnboardingStack} />
        <Root.Screen name="Auth" component={AuthStack} />
        <Root.Screen name="StoreSetup" component={StoreSetupStack} />
        <Root.Screen name="Main" component={MainTabs} />
        <Root.Screen name="Create" component={CreateStack} />
      {/* 내 숏폼 뷰어 — 탭바 위를 완전히 덮어야 해서 Root 에 있습니다 (types.ts 참고) */}
      <Root.Screen
        name="MyVideo"
        component={MyVideoScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
      </Root.Navigator>
    </NavigationContainer>
  );
}

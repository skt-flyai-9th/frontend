/**
 * SettingsScreen — **시안 V4 `settings` 대조 이식** (2026-08-26).
 *
 * 시안 구조 (위에서부터 그대로)
 *   ① 뒤로가기 + "설정" (좌측 정렬 · 18·bold) — 이 화면도 공용 TopHeader 를 쓰지 않습니다
 *   ② Free 플랜 카드 — brand-tint 배경 + brand-border, 흰 타일(44) 안에 왕관
 *   ③ 목록 카드 — 자주 묻는 질문 / 알림 / 서비스 이용약관 / 개인정보 처리방침
 *   ④ 로그아웃 — 흰 카드 · 하트색 글자 · 아이콘 동반
 *   ⑤ 회원탈퇴(밑줄) · "Reals. 버전 {app.json 의 version}"
 *   ⑥ 로그아웃 확인 다이얼로그 · 회원탈퇴 바텀시트(동의 체크박스)
 *
 * 시안 캡처 실측(22_settings.png · pt 기준)
 *   헤더 바닥 110 · 플랜카드 110~188(높이 77.5) · 목록 204~462.5(행 50.5씩)
 *   로그아웃 479.5~529.5 · 목록/로그아웃 위 여백 각각 16
 *
 * ⚠️ 시안 5번째 항목 "상태·오류 화면 (리뷰용)" 은 26_states 로, 대응표에서 **구현 대상이
 *    아닙니다**. 그 자리를 다른 항목으로 메우지 않고 비웠습니다(항목 4개).
 *    예전에는 여기에 "앱 권한 안내" 를 넣어 두었는데, 그 화면이 시안 V4 의
 *    *가입 직후 동의를 받는* 화면으로 바뀌어 이미 가입한 사장님에게는 맞지 않습니다.
 *
 * ⚠️ "이번 달 3/3 사용 중" 은 사용량 API 가 없어 숫자를 지어낼 수 없습니다.
 *    영역은 시안대로 두되 값이 없으면 문구로 대신합니다.
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Crown,
  FileText,
  LogOut,
  Shield,
  TriangleAlert,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../../ui/Screen';
import { pressTap } from '../../../ui/press';
import theme, { color, radius, space, text } from '../../../design/theme';
import { useLogout, useWithdraw } from '../../../api/queries/auth';

/** app.json 의 version. OTA 로 나간 번들에도 그때의 값이 그대로 들어 있습니다. */
const APP_VERSION = Constants.expoConfig?.version ?? '—';

/*
  🔴 **지금 폰에 올라와 있는 업데이트 번호** (2026-08-31).

  무선 업데이트(OTA)는 **껐다 켜기를 두 번** 해야 적용됩니다. 그 사이에 화면을
  보면 고친 것이 안 보이는데, 그게 "안 고쳤다" 인지 "아직 안 받았다" 인지
  화면만 봐서는 가릴 수가 없습니다 — 실제로 그것 때문에 한참 헤맸습니다.

  이제 여기 여덟 자리를 보고 EAS 에 올린 번호와 맞춰 보면 바로 압니다.
  APK 에 들어 있는 그대로면(아직 아무 업데이트도 안 받았으면) '기본' 입니다.
*/
const OTA_TAG = Updates.updateId ? Updates.updateId.slice(0, 8) : '기본';
import { useAppState } from '../../../lib/appState';
import type { RootStackParamList, MyStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList & MyStackParamList>;

/** 시안 탈퇴 시트가 나열하는 삭제 항목 — 원문 그대로 3개입니다. */
const WITHDRAW_LOSES = [
  '매장 정보 및 연동 계정',
  '직접 만든 숏폼과 관심 목록',
  '인사이트 분석 기록',
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const logout = useLogout();
  const withdraw = useWithdraw();
  const reset = useAppState((s) => s.reset);
  const replayCoach = useAppState((s) => s.replayCoach);
  /* ⏳ 임시 — 아래 '온보딩 다시 보기' 를 뺄 때 같이 지웁니다 */
  const replayTutorial = useAppState((s) => s.replayTutorial);

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const closeWithdraw = () => {
    setWithdrawOpen(false);
    setAgreed(false);
  };

  /** 로그아웃·탈퇴 모두 계정이 사라지므로 로그인 화면으로 되돌립니다. */
  const toSignIn = () => {
    reset();
    nav.reset({ index: 0, routes: [{ name: 'Auth', params: { screen: 'SignIn' } }] });
  };

  /**
   * 시안 SETTINGS_ITEMS 순서·아이콘 그대로.
   * 시안은 이용약관과 처리방침을 같은 컴포넌트의 다른 variant 로 보냅니다(LegalScreen).
   * 우리도 TermsScreen 하나가 둘 다 그립니다 —
   * 27_terms = Onboarding/Terms(focus:'terms'), 28_privacy = Root/Legal(focus:'privacy').
   */
  const items: { icon: typeof Bell; label: string; go: () => void }[] = [
    { icon: CircleHelp, label: '자주 묻는 질문', go: () => nav.navigate('Faq') },
    /*
     * '앱 사용법 다시 보기' — 시안에 없는 항목입니다 (2026-08-30 사장님 지시).
     *
     * 튜토리얼은 한 번 보면 다시 안 뜹니다. 그동안은 다시 보시려면 저희가 판 번호를
     * 올려 OTA 를 올려야 했는데("맨날 판번호 올리기 귀찮네"), 사장님이 직접 여시게
     * 했습니다. 본 표시를 지우고 홈으로 보내면 홈에서 저절로 뜹니다.
     *
     * ⚠️ 홈으로 **보내야** 합니다. 튜토리얼 1단계가 홈 탭을 짚기 때문에, 설정 화면에
     *    남아 있으면 짚을 곳이 화면에 없습니다.
     */
    {
      icon: Compass,
      label: '앱 사용법 다시 보기',
      go: () => {
        replayCoach();
        nav.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'HomeFeed' } }] });
      },
    },
    /*
     * ⏳ **임시 항목 — 확인이 끝나면 뺍니다** (2026-08-31 사장님 지시:
     *    "일단 넣었다가 확인 후 빼는 쪽으로").
     *
     * 온보딩(최초 실행 다섯 장)은 **로그인한 기기에서는 안 뜹니다** — 마지막 버튼이
     * 회원가입으로 가기 때문입니다(`navigation/RootNavigator.tsx`). 그래서 판 번호를
     * 올려도 사장님 폰에서는 확인이 안 됩니다. 그걸 열어 주는 줄입니다.
     *
     * 뺄 때는 이 블록만 지우면 됩니다. `replayTutorial()` 은 남겨 두세요 —
     * 판 번호 장치의 일부입니다(`lib/appState.ts`).
     *
     * 다시 보기로 들어가면 마지막 버튼이 "닫기" 로 바뀝니다(가입한 분이니까요).
     */
    {
      icon: Compass,
      label: '온보딩 다시 보기',
      go: () => {
        replayTutorial();
        nav.navigate('Tutorial');
      },
    },
    /*
     * '알림' 은 **길을 닫아 뒀습니다** (2026-08-26, 사장님 지시).
     * 시안 6차에서 notifications 화면이 빠졌습니다. 화면과 라우트는 남겨 두고
     * 들어가는 줄만 뺍니다 — 되살리려면 이 줄의 주석을 풀면 됩니다.
     *   { icon: Bell, label: '알림', go: () => nav.navigate('Notifications') },
     */
    {
      icon: FileText,
      label: '서비스 이용약관',
      go: () =>
        nav.navigate('Onboarding', {
          screen: 'Terms',
          params: { mode: 'read', focus: 'terms' },
        }),
    },
    { icon: Shield, label: '개인정보 처리방침', go: () => nav.navigate('Legal') },
  ];

  return (
    <Screen scroll={false} padded={false} edges={['top']} background={color.surface}>
      {/* ① 시안: px-4 pb-3 pt-[62px] — 62 중 54 는 상태바(SafeAreaView)가 먹습니다 */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={6}
          onPress={() => nav.goBack()}
          style={({ pressed }) => [styles.backBtn, pressTap(pressed, 'icon')]}
        >
          <ChevronLeft size={24} strokeWidth={2} color={color.ink[900]} />
        </Pressable>
        {/*
          🔴 **제목을 가운데로** (2026-08-31 지시 ⑤).
             뒤로가기(36) 옆에 붙어 있던 것을 화면 한가운데로 옮깁니다. 오른쪽에
             같은 폭(36)의 빈 자리를 둬서 **글자의 중심이 화면 중심과 맞습니다** —
             `textAlign: 'center'` 만으로는 왼쪽 버튼만큼 오른쪽으로 밀립니다.
        */}
        <Text style={[text.heading, styles.headerTitle]}>설정</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 시안 스크롤 영역: px-4 pb-10. 카드가 헤더 바로 아래 붙습니다(pt 없음) */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          // 시안 pb-10(40). 안전영역이 더 크면 그쪽을 씁니다 — Screen 이 먹으면 40 위에 34 가 더 붙습니다.
          { paddingBottom: Math.max(insets.bottom, space[10]) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ② Free 플랜 카드 */}
        <View style={styles.planCard}>
          <View style={styles.planLeft}>
            <View style={styles.planTile}>
              <Crown size={22} strokeWidth={2} color={color.brand[600]} />
            </View>
            <View style={styles.planText}>
              <Text style={text.bodyStrong}>Free 플랜</Text>
              {/* 사용량 API 가 없어 시안의 "이번 달 3/3" 을 지어내지 않습니다. */}
              {/* 2026-08-31 지시 — "월 3편까지 만들 수 있어요" 에서 줄였습니다 */}
              <Text style={styles.planSub}>월 3편까지 제작</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => nav.navigate('Plans')}
            style={({ pressed }) => [styles.upgradeBtn, pressTap(pressed, 'button')]}
          >
            <Text style={styles.upgradeText}>Pro 업그레이드</Text>
          </Pressable>
        </View>

        {/* ③ 목록 카드 — 시안 py-3.5, 구분선 #F1F5F9 */}
        <View style={styles.list}>
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={item.go}
                style={({ pressed }) => [
                  styles.row,
                  i !== items.length - 1 && styles.rowDivider,
                  pressed && { backgroundColor: color.surface },
                ]}
              >
                <View style={styles.rowLeft}>
                  <Icon size={20} strokeWidth={2} color={color.ink[500]} />
                  <Text style={styles.rowLabel}>{item.label}</Text>
                </View>
                <ChevronRight size={18} strokeWidth={2} color={color.ink[300]} />
              </Pressable>
            );
          })}
        </View>

        {/* ④ 로그아웃 */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setLogoutOpen(true)}
          style={({ pressed }) => [styles.logout, pressTap(pressed, 'card')]}
        >
          <LogOut size={18} strokeWidth={2} color={color.danger[500]} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>

        {/* ⑤ 회원탈퇴 · 버전 */}
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" onPress={() => setWithdrawOpen(true)} hitSlop={8}>
            <Text style={styles.withdraw}>회원탈퇴</Text>
          </Pressable>
          {/*
            버전은 **app.json 에서 읽습니다** — 예전에는 "1.0.0" 이 글자로 박혀 있었습니다
            (2026-08-27 에 1.0.1 로 올리면서 드러났습니다). 화면이 실제와 다른 번호를
            말하면 사장님이 "업데이트가 안 됐다" 를 판단할 근거가 사라집니다.
          */}
          <Text style={styles.version}>
            Reals. 버전 {APP_VERSION} · 업데이트 {OTA_TAG}
          </Text>
        </View>
      </ScrollView>

      {/*
        ⑥-1 로그아웃 확인 — 시안: 화면 중앙 · w-80% · rounded-3xl · p-6 · 가운데 정렬.
        Alert 로 대신하고 있었는데, 시안이 아이콘·문구·버튼 배치를 정해 두고 있어 옮깁니다.
      */}
      <Modal
        visible={logoutOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutOpen(false)}
      >
        <View style={styles.dialogScrim}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            style={StyleSheet.absoluteFill}
            onPress={() => setLogoutOpen(false)}
          />
          <View style={styles.dialog}>
            <View style={styles.alertCircle}>
              <LogOut size={22} strokeWidth={2} color={color.danger[500]} />
            </View>
            <Text style={styles.dialogTitle}>로그아웃 하시겠어요?</Text>
            <Text style={styles.dialogBody}>다시 로그인하면 언제든 이어서 작업할 수 있어요.</Text>
            <View style={styles.dialogRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setLogoutOpen(false)}
                style={({ pressed }) => [styles.ghostBtn, pressTap(pressed, 'button')]}
              >
                <Text style={styles.ghostText}>취소</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: logout.isPending }}
                disabled={logout.isPending}
                onPress={() => {
                  setLogoutOpen(false);
                  logout.mutate(undefined, { onSettled: toSignIn });
                }}
                style={({ pressed }) => [
                  styles.dangerBtn,
                  logout.isPending && styles.btnBusy,
                  !logout.isPending && pressTap(pressed, 'button'),
                ]}
              >
                <Text style={styles.dangerText}>로그아웃</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ⑥-2 회원탈퇴 — 시안: 바텀시트 · 삭제 항목 3개 · 동의 체크박스로만 버튼이 열립니다 */}
      <Modal
        visible={withdrawOpen}
        transparent
        animationType="fade"
        onRequestClose={closeWithdraw}
      >
        <View style={styles.sheetScrim}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            style={styles.scrimTouch}
            onPress={closeWithdraw}
          />
          {/* 시안: rounded-t-[28px] px-6 pb-8 pt-5 */}
          <View style={styles.sheet}>
            {/* 시안: mx-auto mb-4 h-1 w-10 */}
            <View style={styles.grip} />
            <View style={styles.alertCircle}>
              <TriangleAlert size={22} strokeWidth={2} color={color.danger[500]} />
            </View>
            <Text style={styles.sheetTitle}>정말 탈퇴하시겠어요?</Text>
            <Text style={styles.dialogBody}>
              탈퇴하면 아래 정보가 모두 삭제되며 복구할 수 없어요.
            </Text>

            {/* 시안: mt-4 gap-2 rounded-2xl bg-surface p-4 */}
            <View style={styles.loseBox}>
              {WITHDRAW_LOSES.map((t) => (
                <View key={t} style={styles.loseRow}>
                  <View style={styles.dot} />
                  <Text style={styles.loseText}>{t}</Text>
                </View>
              ))}
            </View>

            {/* 시안: mt-4 gap-2.5 · 20 체크박스 */}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              onPress={() => setAgreed((v) => !v)}
              style={styles.agreeRow}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                {agreed && <Check size={13} strokeWidth={3} color={color.paper} />}
              </View>
              <Text style={styles.agreeText}>안내 사항을 확인했으며 탈퇴에 동의합니다.</Text>
            </Pressable>

            {/* 시안: mt-5 gap-2 · height 52 */}
            <View style={styles.dialogRow}>
              <Pressable
                accessibilityRole="button"
                onPress={closeWithdraw}
                style={({ pressed }) => [
                  styles.ghostBtn,
                  styles.tallBtn,
                  pressTap(pressed, 'button'),
                ]}
              >
                <Text style={styles.ghostText}>취소</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !agreed, busy: withdraw.isPending }}
                disabled={!agreed || withdraw.isPending}
                onPress={() => {
                  closeWithdraw();
                  withdraw.mutate('사용자 요청', { onSettled: toSignIn });
                }}
                style={({ pressed }) => [
                  styles.dangerBtn,
                  styles.tallBtn,
                  // 시안: disabled:opacity-40
                  (!agreed || withdraw.isPending) && styles.btnBusy,
                  agreed && !withdraw.isPending && pressTap(pressed, 'button'),
                ]}
              >
                <Text style={styles.dangerText}>탈퇴하기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // 시안: px-4 pb-3 pt-[62px] · gap-2 · 뒤로가기 36(-ml-1.5)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingTop: space[2],
    paddingBottom: space[3],
  },
  headerTitle: { flex: 1, textAlign: 'center' },
  /* 뒤로가기와 같은 폭. 이게 있어야 제목이 진짜 가운데에 옵니다. */
  headerSpacer: { width: 36 },
  backBtn: {
    width: 36,
    height: 36,
    // 시안에 음수 여백 없음 — 제목이 뒤로가기 옆에 붙는 헤더입니다 (FaqScreen 헤더 규칙 주석 참고)
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 시안: px-4 pb-10 (카드가 헤더 바로 아래 110pt 에서 시작)
  // 시안: px-4 pb-10 (하단은 화면에서 안전영역과 함께 계산)
  scroll: { paddingHorizontal: space[4] },

  // 시안: rounded-2xl border-brand-border bg-brand-tint p-4 (실측 높이 77.5pt)
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.brand[300],
    backgroundColor: color.brand[50],
  },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1, minWidth: 0 },
  planTile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /*
    🔴 **좁은 폰에서 글자가 버튼을 밀고 들어갔습니다** (2026-08-31 지시 ⑥).

    `planText` 에 `flex` 가 없어 글자가 제 폭을 그대로 요구했고, 360 같은 좁은
    화면에서 "월 3편까지 만들 수 있어요" 가 **Pro 업그레이드 버튼과 겹쳤습니다.**
    `flex: 1` + `minWidth: 0` 을 주면 자리가 모자랄 때 **두 줄로 감깁니다**
    (카드가 그만큼 높아집니다). 버튼은 `flexShrink: 0` 이라 찌그러지지 않습니다.
  */
  // 시안: mt-0.5
  planText: { gap: space[0.5], flex: 1, minWidth: 0 },
  planSub: { ...text.caption, color: color.ink[500] },
  // 시안: h-9 rounded-xl px-3.5 · 13 semibold
  upgradeBtn: {
    flexShrink: 0,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: space[3.5],
    borderRadius: radius.md,
    backgroundColor: color.brand[600],
  },
  upgradeText: { ...text.chipLabel, color: color.paper },

  // 시안: mt-4 rounded-2xl border-hairline/80 bg-white shadow-card
  list: {
    marginTop: space[4],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
    overflow: 'hidden',
    ...theme.elevation('card'),
  },
  // 시안: px-4 py-3.5 (실측 행 높이 50.5pt)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingVertical: space[3.5],
  },
  // 시안 구분선 #F1F5F9. 토큰에 없어 가장 가까운 surface 를 씁니다.
  rowDivider: { borderBottomWidth: theme.border.hairline, borderBottomColor: color.surface },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  rowLabel: { ...text.body, color: color.ink[800] },

  // 시안: mt-4 rounded-2xl border bg-white py-3.5 · 하트색 15 semibold
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    marginTop: space[4],
    paddingVertical: space[3.5],
    borderRadius: radius.lg,
    borderWidth: theme.border.hairline,
    borderColor: color.cardBorder,
    backgroundColor: color.paper,
  },
  logoutText: { ...text.bodyStrong, color: color.danger[500] },

  // 시안: mt-6 gap-3 가운데 정렬
  footer: { marginTop: space[6], alignItems: 'center', gap: space[3] },
  withdraw: { ...text.caption, color: color.ink[400], textDecorationLine: 'underline' },
  version: { ...text.label, color: color.ink[500] },

  // ── 로그아웃 다이얼로그 (시안: scrim .45 · w-80% · rounded-3xl · p-6)
  dialogScrim: {
    flex: 1,
    backgroundColor: color.overlay.cameraChrome,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: '80%',
    borderRadius: radius.dialog,
    backgroundColor: color.paper,
    padding: space[6],
    alignItems: 'center',
  },
  // 시안: mb-3 h-12 w-12 rounded-full bg-heart/10
  alertCircle: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    marginBottom: space[3],
    borderRadius: radius.pill,
    backgroundColor: color.danger[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: { ...text.subheading, textAlign: 'center' },
  // 시안: mt-1.5 · 13 · leading-1.5
  dialogBody: {
    ...text.caption,
    color: color.ink[500],
    marginTop: space[1.5],
    textAlign: 'center',
  },
  // 시안: mt-5 gap-2
  dialogRow: { flexDirection: 'row', gap: space[2], marginTop: space[5], alignSelf: 'stretch' },
  // 시안 버튼: h-12 flex-1 rounded-xl · 15 semibold
  ghostBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: theme.border.hairline,
    borderColor: color.ink[200],
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { ...text.button, color: color.ink[700] },
  dangerBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: color.danger[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: { ...text.button, color: color.paper },
  // 시안: disabled:opacity-40
  btnBusy: { opacity: 0.4 },
  // 시안 탈퇴 시트 버튼만 52
  tallBtn: { height: 52 },

  // ── 회원탈퇴 바텀시트
  sheetScrim: { flex: 1, backgroundColor: color.overlay.scrim, justifyContent: 'flex-end' },
  scrimTouch: { flex: 1 },
  sheet: {
    paddingHorizontal: space[6],
    paddingTop: space[5],
    paddingBottom: space[8],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.paper,
  },
  // 시안: mb-4 h-1 w-10
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginBottom: space[4],
    borderRadius: radius.pill,
    backgroundColor: color.ink[200],
  },
  sheetTitle: { ...text.heading, textAlign: 'center' },
  // 시안: mt-4 gap-2 rounded-2xl bg-surface p-4
  loseBox: {
    marginTop: space[4],
    gap: space[2],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  loseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  // 시안: mt-1.5 h-1 w-1 rounded-full bg-[#94A3B8]
  dot: {
    width: 4,
    height: 4,
    marginTop: space[1.5],
    borderRadius: radius.pill,
    backgroundColor: color.ink[400],
  },
  // 시안: 13 leading-snug text-[#475569]
  loseText: { ...text.caption, flex: 1, color: color.ink[700] },

  // 시안: mt-4 gap-2.5 (10)
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: space[4] },
  // 시안: h-5 w-5 rounded-md border-track
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: theme.border.hairline,
    borderColor: color.track,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: color.danger[500], backgroundColor: color.danger[500] },
  agreeText: { ...text.caption, flex: 1, color: color.ink[700] },
});
